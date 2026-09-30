import test from 'node:test';
import assert from 'node:assert/strict';
import { VoiceClient } from '../src/lib/voice-client.js';

function mockGlobal(t, name, value) {
  const original = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, name, original);
    else delete globalThis[name];
  });
}

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

test('confirmed barge-in and ending a call cancel the missing-audio watchdog', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { client, states, errors } = makeClient();
  client.event({ type: 'reply.started', reply_id: 'interrupted' });
  client.event({ type: 'input.speech.started' });
  client.event({ type: 'reply.done', status: 'interrupted' });
  client.event({ type: 'transcript.agent.delta', reply_id: 'interrupted', delta: 'Late text' });
  assert.equal(states.at(-1), 'listening', 'Late text must not revive interrupted speech.');
  t.mock.timers.tick(30000);
  assert.deepEqual(errors, []);
  client.event({ type: 'reply.started', reply_id: 'closed' });
  client.stop();
  t.mock.timers.tick(30000);
  assert.deepEqual(errors, []);
});

test('speech detection and a back-channel do not discard reply audio', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { client, states, errors, heard, sources } = makeClient();
  client.event({ type: 'reply.started', reply_id: 'continue' });
  client.event({ type: 'reply.audio', data: 'AAAAAA==' });
  client.event({ type: 'input.speech.started' });
  client.event({ type: 'transcript.user.delta', text: 'Uh-huh' });
  client.event({ type: 'input.speech.stopped' });
  client.event({ type: 'transcript.user', text: 'Uh-huh' });
  assert.equal(client.current.interrupted, false);
  assert.equal(states.at(-1), 'speaking');
  client.event({ type: 'reply.audio', data: 'AAAAAA==' });
  client.event({ type: 'transcript.agent', reply_id: 'continue', text: 'I stayed by the door.' });
  client.event({ type: 'reply.done' });
  for (const source of sources) source.onended();
  assert.equal(heard[0].text, 'I stayed by the door.');
  assert.equal(heard[0].interrupted, false);
  t.mock.timers.tick(30000);
  assert.deepEqual(errors, []);
  client.stop();
});

test('interrupted transcript arriving before reply.done flushes playback, not just text', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { client, states, heard, sources } = makeClient();
  client.event({ type: 'reply.started', reply_id: 'cut-off' });
  client.event({ type: 'reply.audio', data: 'AAAAAA==' });
  let stops = 0;
  sources[0].stop = () => stops++;
  client.event({ type: 'transcript.agent', reply_id: 'cut-off', text: '', interrupted: true });
  assert.equal(stops, 1);
  assert.equal(states.at(-1), 'listening');
  const count = sources.length;
  client.event({ type: 'reply.audio', data: 'AAAAAA==' });
  assert.equal(sources.length, count, 'Late audio stays discarded for a confirmed interruption.');
  client.event({ type: 'reply.done', status: 'interrupted' });
  sources[0].onended();
  assert.equal(heard[0].interrupted, true);
  assert.equal(heard[0].text, '', 'No timestamped playback means no clue-bearing prefix.');
  client.stop();
});

test('detected user speech cannot wait forever before reply.started', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { client, states, errors, heard } = makeClient();
  client.event({ type: 'input.speech.started' });
  client.event({ type: 'input.speech.stopped' });
  client.event({ type: 'transcript.user', text: 'Where were you?' });
  assert.equal(states.at(-1), 'thinking');
  t.mock.timers.tick(30000);
  assert.match(errors[0], /speech was detected/);
  assert.equal(heard.length, 0);
  client.stop();
});

test('reply.started cancels the pre-reply wait and stop cancels all pending work', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { client, errors, heard, sources } = makeClient();
  client.event({ type: 'transcript.user', text: 'Where were you?' });
  t.mock.timers.tick(20000);
  client.event({ type: 'reply.started', reply_id: 'arrived' });
  client.event({ type: 'reply.audio', data: 'AAAAAA==' });
  t.mock.timers.tick(30000);
  assert.deepEqual(errors, []);
  client.stop();
  client.event({ type: 'transcript.agent', reply_id: 'arrived', text: 'An unheard ending.' });
  client.event({ type: 'reply.done' });
  assert.equal(sources[0].onended, null);
  assert.equal(heard.length, 0, 'Teardown cannot acknowledge incomplete playback.');
});

test('input packets stay PCM and meter updates are throttled without changing call state', (t) => {
  const { client } = makeClient();
  const sent = [],
    states = [];
  t.mock.method(Date, 'now', () => 1000);
  mockGlobal(t, 'WebSocket', { OPEN: 1 });
  client.socket = { readyState: 1, send: (message) => sent.push(JSON.parse(message)), close() {} };
  client.onState = (state) => states.push(state);
  client.ready = true;
  client.publish({ status: 'listening' });
  const pcm = new Int16Array(480).fill(8192);
  client.receiveInput(pcm.buffer);
  client.receiveInput(pcm.buffer);
  assert.equal(sent.length, 2);
  assert.equal(sent[0].type, 'input.audio');
  assert.equal(atob(sent[0].audio).length, 960);
  assert.equal(states.length, 2, 'Repeated chunks in the same 200 ms window do not rerender.');
  assert.equal(states.at(-1).status, 'listening');
  assert.deepEqual(states.at(-1).microphone, { receiving: true, level: 100 });
  Date.now.mock.mockImplementation(() => 1200);
  client.receiveInput(new Int16Array(480).buffer);
  assert.equal(states.at(-1).microphone.level, 100, 'Meter holds the peak of the current window.');
  Date.now.mock.mockImplementation(() => 1400);
  client.receiveInput(new Int16Array(480).buffer);
  assert.equal(states.at(-1).microphone.level, 0);
  client.stop();
  client.receiveInput(pcm.buffer);
  assert.equal(sent.length, 5, 'Stopped capture sends only session.end, not another audio packet.');
});

test('a final user transcript arriving before interruption still starts a bounded reply wait', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { client, states, errors } = makeClient();
  client.event({ type: 'reply.started', reply_id: 'old-reply' });
  client.event({ type: 'input.speech.started' });
  client.event({ type: 'transcript.user', text: 'Wait, who else had a key?' });
  client.event({ type: 'reply.done', status: 'interrupted' });
  assert.equal(states.at(-1), 'thinking');
  t.mock.timers.tick(30000);
  assert.match(errors[0], /speech was detected/);
  client.stop();
});

test('lost microphone capture errors visibly but quiet input is not mistaken for a failure', () => {
  const { client, errors } = makeClient();
  client.ready = true;
  client.readyAt = 1000;
  client.checkInput(7001);
  assert.match(errors[0], /Microphone audio stopped/);
  client.lastInputAt = 7000;
  client.checkInput(7001);
  assert.equal(errors.length, 1, 'Recent silence packets still prove capture is running.');
  client.stop();
  client.checkInput(20000);
  assert.equal(errors.length, 1);
});

test('the browser capture graph is retained, streams after readiness, and detaches on stop', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { client, errors } = makeClient();
  const messages = [];
  let worklet,
    socket,
    trackStopped = false;
  const node = () => {
    const value = { connected: false, disconnected: false };
    value.connect = (next) => {
      value.connected = true;
      return next;
    };
    value.disconnect = () => (value.disconnected = true);
    return value;
  };
  const track = { stop: () => (trackStopped = true) };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  mockGlobal(t, 'navigator', {
    mediaDevices: {
      getUserMedia: async (constraints) => {
        assert.equal(constraints.audio.echoCancellation, true);
        assert.equal(constraints.audio.noiseSuppression, false);
        assert.equal(constraints.audio.autoGainControl, true);
        return stream;
      },
    },
  });
  mockGlobal(
    t,
    'AudioContext',
    class {
      sampleRate = 24000;
      state = 'suspended';
      destination = {};
      audioWorklet = { addModule: async () => {} };
      createMediaStreamSource() {
        return node();
      }
      createGain() {
        return Object.assign(node(), { gain: { value: 1 } });
      }
      async resume() {
        this.state = 'running';
      }
      async close() {
        this.state = 'closed';
      }
    },
  );
  mockGlobal(
    t,
    'AudioWorkletNode',
    class {
      constructor() {
        worklet = Object.assign(node(), { port: {} });
        return worklet;
      }
    },
  );
  mockGlobal(
    t,
    'WebSocket',
    class extends EventTarget {
      static OPEN = 1;
      static CONNECTING = 0;
      readyState = 0;
      constructor() {
        super();
        socket = this;
      }
      send(message) {
        messages.push(JSON.parse(message));
      }
      close() {
        this.readyState = 3;
      }
    },
  );
  await client.connect({ agentId: 'test-agent', token: 'temporary-test-token', leaseId: 'lease' });
  assert.equal(client.worklet, worklet);
  socket.readyState = 1;
  socket.dispatchEvent(new Event('open'));
  assert.equal(messages[0].session.agent_id, 'test-agent');
  const packet = () => worklet.port.onmessage({ data: new Int16Array(480).buffer });
  packet();
  assert.equal(messages.length, 1, 'No microphone packets sent before session.ready.');
  client.event({ type: 'session.ready' });
  packet();
  assert.equal(messages[1].type, 'input.audio');
  client.stop();
  assert.equal(worklet.port.onmessage, null);
  assert.equal(track.onended, null);
  assert.equal(trackStopped, true);
  assert.equal(client.context.onstatechange, null);
  assert.equal(client.input.disconnected, true);
  assert.equal(client.worklet.disconnected, true);
  assert.equal(client.mute.disconnected, true);
  t.mock.timers.tick(30000);
  assert.deepEqual(errors, []);
});
