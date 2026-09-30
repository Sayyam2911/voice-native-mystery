import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';
import { createPrototypeServer, fixtureReply } from './server.mjs';

test('the fixed response fixture respects character knowledge', () => {
  assert.match(fixtureReply('mystery-poc-witness', [{ role: 'user', content: 'Who had the key?' }]), /did not see who/);
  assert.match(fixtureReply('mystery-poc-detective', [{ role: 'user', content: 'Who is the killer?' }]), /not have enough evidence/);
  assert.equal(fixtureReply('unknown', []), null);
});

test('browser scripts parse', async () => {
  const page = await readFile(new URL('./public/index.html', import.meta.url), 'utf8');
  const script = /<script>([\s\S]*?)<\/script>/.exec(page)?.[1];
  assert.ok(script);
  assert.doesNotThrow(() => new Script(script));
  const worklet = await readFile(new URL('./public/pcm-processor.js', import.meta.url), 'utf8');
  assert.doesNotThrow(() => new Script(worklet));
});

test('custom completion endpoint authenticates and streams OpenAI-shaped chunks', async () => {
  const config = {
    ASSEMBLYAI_API_KEY: 'test-key',
    VOICE_POC_PIN: 'pin',
    VOICE_POC_SHARED_SECRET: 'this-is-only-a-local-test-secret',
    VOICE_POC_WITNESS_AGENT_ID: 'witness-agent-id-123',
    VOICE_POC_DETECTIVE_AGENT_ID: 'detective-agent-id-123',
  };
  const server = createPrototypeServer(config).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const denied = await fetch(`${base}/v1/chat/completions`, { method: 'POST', body: '{}' });
    assert.equal(denied.status, 401);

    const configResponse = await fetch(`${base}/api/config`).then((response) => response.json());
    assert.equal(configResponse.ready, true);

    const response = await fetch(`${base}/v1/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.VOICE_POC_SHARED_SECRET}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'mystery-poc-detective', stream: true, messages: [{ role: 'user', content: 'Tell me about the door.' }] }),
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/event-stream/);
    const text = await response.text();
    assert.match(text, /The record says the west door was locked at nine/);
    assert.match(text, /data: \[DONE\]/);

    const page = await fetch(base).then((result) => result.text());
    assert.match(page, /Named-voice integration test/);
  } finally {
    await new Promise((done) => server.close(done));
  }
});

test('a truncated agent ID cannot enable the voice-token endpoint', async () => {
  const server = createPrototypeServer({
    ASSEMBLYAI_API_KEY: 'test-key',
    VOICE_POC_PIN: 'pin',
    VOICE_POC_SHARED_SECRET: 'this-is-only-a-local-test-secret',
    VOICE_POC_WITNESS_AGENT_ID: 'a',
    VOICE_POC_DETECTIVE_AGENT_ID: 'b',
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const config = await fetch(`${base}/api/config`).then((response) => response.json());
    assert.equal(config.ready, false);
    const token = await fetch(`${base}/api/voice-token`, { method: 'POST', headers: { 'x-demo-pin': 'pin' } });
    assert.equal(token.status, 503);
  } finally {
    await new Promise((done) => server.close(done));
  }
});
