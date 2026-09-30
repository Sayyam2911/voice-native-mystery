import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore } from '../server/store.mjs';
import { GameService } from '../server/game.mjs';
import { VoiceService } from '../server/voice.mjs';
import { sign } from '../server/security.mjs';

const secret = 'test-only-voice-secret-with-32-or-more-characters';
function make() {
  const store = new MemoryStore();
  const config = {
    ALLOW_OFFLINE_DEMO: 'true',
    LLM_API_KEY: 'test-key-not-real',
    PUBLIC_BASE_URL: 'https://casework.example',
    MAX_ACTIVE_VOICE_SESSIONS: 1,
  };
  return {
    store,
    game: new GameService(store, config, async () => ({
      mode: 'fixture',
      proposal: {
        type: 'dialogue',
        dialogue: { text: 'I can help you review the evidence.' },
        reveal: { id: null, level: null, condition: { id: null, condition_reached: false } },
        investigation: { id: null },
      },
    })),
    config,
  };
}

test('a voice callback is bound to one visitor, character, active lease, and expiry', async () => {
  const { store, game, config } = make();
  const voice = new VoiceService(store, game, config, secret);
  const session = await game.start('grange-house');
  await store.transaction(session._id, async (s) => {
    s.activeVoice = { id: 'lease-one', expiresAt: new Date(Date.now() + 10000) };
  });
  const body = { messages: [{ role: 'user', content: 'Where should I begin?' }] };
  const binding = sign(
    { sid: session._id, cid: 'detective', lid: 'lease-one', exp: Date.now() + 10000 },
    secret,
  );
  const turn = await voice.completion(binding, body);
  assert.equal(turn.voiceLeaseId, 'lease-one');
  assert.equal((await voice.completion(binding, body))._id, turn._id);
  await assert.rejects(voice.completion(binding + 'tampered', body), (e) => e.status === 403);
  await store.transaction(session._id, async (s) => {
    s.activeVoice = null;
  });
  await assert.rejects(voice.completion(binding, body), (e) => e.status === 403);
  const newBody = {
    messages: [
      ...body.messages,
      { role: 'assistant', content: turn.approvedReply.text },
      { role: 'user', content: 'And next?' },
    ],
  };
  await assert.rejects(voice.completion(binding, newBody), (e) => e.status === 403);
});

test('failed token creation clears the saved voice lease and releases capacity', async () => {
  const { store, game, config } = make();
  const voice = new VoiceService(store, game, config, secret);
  const session = await game.start('grange-house');
  const deleted = [];
  voice.request = async (path, options) => {
    if (options?.method === 'DELETE') {
      deleted.push(path);
      return null;
    }
    if (path === '/agents') return { id: 'test-agent' };
    throw new Error('Token provider unavailable');
  };
  await assert.rejects(voice.start(session._id, 'detective'), /Token provider unavailable/);
  assert.equal((await game.session(session._id)).activeVoice, null);
  assert.equal(store.voiceSlots.size, 0);
  assert.deepEqual(deleted, ['/agents/test-agent']);
});
