import test from 'node:test';
import assert from 'node:assert/strict';
import { VoiceClient } from '../src/lib/voice-client.js';

function makeClient() {
  const states = [],
    errors = [],
    heard = [],
    sources = [];
  const client = new VoiceClient({
    onState: (s) => states.push(s.status),
    onError: (e) => errors.push(e),
    onHeard: (h) => heard.push(h),
    onClose() {},
  });
  client.credentials = { leaseId: 'test-lease' };
  client.context = {
    currentTime: 0,
    destination: {},
    close: async () => {},
    createBuffer: (_channels, length, rate) => ({
      duration: length / rate,
      getChannelData: () => new Float32Array(length),
    }),
    createBufferSource: () => {
      const source = { connect() {}, disconnect() {}, start() {}, stop() {} };
      sources.push(source);
      return source;
    },
  };
  return { client, states, errors, heard, sources };
}

test('a reply without any audio times out visibly instead of staying in thinking forever', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { client, errors, heard } = makeClient();
  client.event({ type: 'reply.started', reply_id: 'slow' });
  t.mock.timers.tick(29999);
  assert.equal(errors.length, 0);
  t.mock.timers.tick(1);
  assert.match(errors[0], /30 seconds/);
  assert.equal(heard.length, 0, 'Timeout is not evidence of delivery.');
  client.stop();
});

test('documented reply.done without reply_id finishes only after local audio drains', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { client, states, errors, heard, sources } = makeClient();
  client.event({ type: 'reply.started', reply_id: 'spoken' });
  client.event({ type: 'reply.audio', data: 'AAAAAA==' });
  client.event({ type: 'transcript.agent', reply_id: 'spoken', text: 'I was in the hall.' });
  client.event({ type: 'reply.done' });
  assert.equal(heard.length, 0, 'Server completion is not local playback completion.');
  sources[0].onended();
  assert.equal(states.at(-1), 'listening');
  assert.deepEqual(heard, [
    { text: 'I was in the hall.', interrupted: false, leaseId: 'test-lease' },
  ]);
  assert.equal(client.replies.size, 0);
  t.mock.timers.tick(30000);
  assert.deepEqual(errors, []);
  client.stop();
});

test('text-only completion does not acknowledge a spoken reply that never played', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { client, errors, heard } = makeClient();
  client.event({ type: 'reply.started', reply_id: 'no-audio' });
  client.event({ type: 'transcript.agent', reply_id: 'no-audio', text: 'An unheard clue.' });
  client.event({ type: 'reply.done' });
  assert.match(errors[0], /no playable audio/);
  assert.equal(heard.length, 0);
  client.stop();
});

test('barge-in and ending a call cancel the missing-audio watchdog', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { client, states, errors } = makeClient();
  client.event({ type: 'reply.started', reply_id: 'interrupted' });
  client.event({ type: 'input.speech.started' });
  client.event({ type: 'transcript.agent.delta', reply_id: 'interrupted', delta: 'Late text' });
  assert.equal(states.at(-1), 'listening', 'Late text must not revive interrupted speech.');
  t.mock.timers.tick(30000);
  assert.deepEqual(errors, []);
  client.event({ type: 'reply.started', reply_id: 'closed' });
  client.stop();
  t.mock.timers.tick(30000);
  assert.deepEqual(errors, []);
});
