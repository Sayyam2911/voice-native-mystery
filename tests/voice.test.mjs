import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStore } from '../server/store.mjs';
import { GameService } from '../server/game.mjs';
import { VoiceService } from '../server/voice.mjs';
import { sign } from '../server/security.mjs';
import { validateVoiceOrigin } from '../server/voice-origin.mjs';

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
  voice.checkCallback = async () => config.PUBLIC_BASE_URL;
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

test('voice callback preflight requires an HTTPS application origin and sends no credentials', async () => {
  const requests = [];
  const fetcher = async (url, options) => {
    requests.push({ url, options });
    return new Response(JSON.stringify({ name: 'Casework' }), { status: 200 });
  };
  for (const value of [
    undefined,
    'http://localhost:4173',
    'https://github.com/owner/repo.git',
    'https://app.example/?key=secret',
    'https://user:password@app.example',
  ])
    await assert.rejects(
      validateVoiceOrigin(value, fetcher),
      (e) => e.code === 'voice_callback_unreachable',
    );
  assert.equal(requests.length, 0);
  assert.equal(await validateVoiceOrigin('https://app.example/', fetcher), 'https://app.example');
  assert.equal(requests[0].url, 'https://app.example/api/health');
  assert.equal(requests[0].options.redirect, 'error');
  assert.equal(requests[0].options.headers.Authorization, undefined);
});

test('a dead tunnel or wrong application fails preflight before agent creation', async () => {
  for (const fetcher of [
    async () => new Response('Not found', { status: 404 }),
    async () => new Response(JSON.stringify({ name: 'Other app' })),
    async () => {
      throw new Error('Tunnel unavailable');
    },
  ])
    await assert.rejects(
      validateVoiceOrigin('https://app.example', fetcher),
      (e) => e.status === 503,
    );
  const { store, game, config } = make();
  const voice = new VoiceService(
    store,
    game,
    { ...config, PUBLIC_BASE_URL: 'https://github.com/owner/repo' },
    secret,
  );
  const session = await game.start('grange-house');
  let requests = 0;
  voice.request = async () => {
    requests++;
  };
  await assert.rejects(
    voice.start(session._id, 'detective'),
    (e) => e.code === 'voice_callback_unreachable',
  );
  assert.equal(requests, 0);
  assert.equal(store.voiceSlots.size, 0);
});
