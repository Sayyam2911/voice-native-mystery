import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { casePeople, caseConnections } from '../src/lib/board.js';
import { authoredCases, catalogProjection, initialState, projectGame } from '../server/cases.mjs';
import { VoiceClient } from '../src/lib/voice-client.js';

// Render the actual JSX without a browser, microphone, model calls, or real visitor data.
// Vite is already a declared dev dependency; its middleware server opens no network port.
const renderer = await createServer({
  configFile: false,
  root: fileURLToPath(new URL('../', import.meta.url)),
  appType: 'custom',
  server: { middlewareMode: true, watch: null },
  esbuild: { jsx: 'automatic' },
  logLevel: 'silent',
});
after(() => renderer.close());
const { InterviewPanel } = await renderer.ssrLoadModule('/src/components/InterviewPanel.jsx');
const { PartnerContact } = await renderer.ssrLoadModule('/src/components/PartnerContact.jsx');
const { InvestigationBoard } = await renderer.ssrLoadModule(
  '/src/components/InvestigationBoard.jsx',
);
const { CaseCatalog } = await renderer.ssrLoadModule('/src/components/CaseCatalog.jsx');
const contact = {
  id: 'witness',
  name: 'Test Witness',
  role: 'Scene witness',
  initials: 'TW',
  topics: ['What did you see?'],
};
const partner = {
  id: 'liaison',
  name: 'Test Partner',
  role: 'Investigative partner',
  initials: 'TP',
};
const game = {
  case: { partnerId: 'liaison' },
  state: { status: 'active', selectedCharacterId: 'witness' },
  characters: [partner, contact],
  clues: [],
  turns: [],
};
const renderCall = (overrides = {}) =>
  renderToStaticMarkup(
    createElement(InterviewPanel, {
      character: contact,
      game,
      busy: false,
      voice: { status: 'idle', caption: '' },
      onStartVoice() {},
      onStopVoice() {},
      ...overrides,
    }),
  );

test('the partner is excluded from case pins and red-thread edges for every published case', () => {
  for (const pack of authoredCases) {
    const projection = projectGame(pack, {
      _id: 'ui-test',
      state: initialState(pack),
      revision: 0,
    });
    assert.ok(
      projection.characters.some((c) => c.id === pack.partnerId),
      'Partner remains available to call.',
    );
    assert.ok(!casePeople(projection).some((c) => c.id === pack.partnerId));
  }
  const projected = {
    ...game,
    clues: [{ id: 'note', characters: ['liaison', 'witness', 'locked-person'] }],
  };
  assert.deepEqual(
    caseConnections(projected).map((edge) => edge.source),
    ['person:witness'],
  );
  assert.equal(casePeople(game).length, 1, 'A different partner ID needs no UI branch.');
});

test('idle interviews expose a primary voice button, never a form, textarea, or send control', () => {
  const html = renderCall();
  assert.match(html, /Start voice interview/);
  assert.match(html, /Your microphone stays off until you start the call/);
  assert.match(html, /Call transcript/);
  assert.match(html, /Ask in your own words during the call/);
  assert.doesNotMatch(html, /<(?:form|textarea|input)\b|Send question|End voice to type/i);
  assert.match(html, /<details class="call-transcript">/, 'Transcript starts collapsed.');
});

test('call controls reflect connecting, listening, thinking, speaking, and service-unavailable states', () => {
  const connecting = renderCall({ voice: { status: 'connecting', caption: '' } });
  assert.match(connecting, /Connecting the call/);
  assert.match(connecting, /class="call-button end-call" disabled/);
  assert.match(renderCall({ voice: { status: 'listening', caption: '' } }), /Your turn/);
  assert.match(
    renderCall({ voice: { status: 'thinking', caption: '' } }),
    /Considering your question/,
  );
  const speaking = renderCall({
    busy: true,
    voice: { status: 'speaking', caption: 'Approved live caption.' },
  });
  assert.match(speaking, /You can interrupt/);
  assert.match(speaking, /Approved live caption/);
  assert.match(speaking, /End call/);
  assert.doesNotMatch(
    speaking,
    /class="call-button end-call" disabled/,
    'Ending a live call remains possible while game writes are busy.',
  );
  const unavailable = renderCall({ voiceAvailable: false });
  assert.match(unavailable, /Voice is unavailable/);
  assert.match(unavailable, /class="call-button start-call" disabled/);
});

test('call transcripts show only this character’s voice turns and heard reply text', () => {
  const html = renderCall({
    game: {
      ...game,
      turns: [
        {
          id: 'heard',
          characterId: 'witness',
          channel: 'voice',
          playerTranscript: 'My spoken question',
          reply: { text: 'UNHEARD SECRET ENDING' },
          heardText: 'A sentence actually heard.',
          status: 'interrupted',
        },
        {
          id: 'text',
          characterId: 'witness',
          channel: 'text',
          playerTranscript: 'OLD TYPED QUESTION',
          reply: { text: 'OLD TYPED REPLY' },
        },
        {
          id: 'other',
          characterId: 'liaison',
          channel: 'voice',
          playerTranscript: 'OTHER CHARACTER CALL',
        },
      ],
    },
  });
  assert.match(html, /My spoken question/);
  assert.match(html, /A sentence actually heard/);
  assert.match(html, /interrupted/);
  assert.doesNotMatch(html, /UNHEARD SECRET ENDING|OLD TYPED|OTHER CHARACTER CALL/);
});

test('only already-discovered observations about the selected character appear in the call references', () => {
  const html = renderCall({
    game: {
      ...game,
      clues: [
        {
          id: 'known',
          characters: ['witness'],
          title: 'Known observation',
          body: 'Discovered details only.',
          source: 'Scene file',
        },
        {
          id: 'elsewhere',
          characters: ['liaison'],
          title: 'OTHER PERSON NOTE',
          body: 'Not this contact’s note.',
        },
      ],
    },
  });
  assert.match(html, /Known observation/);
  assert.match(html, /Discovered details only/);
  assert.doesNotMatch(html, /OTHER PERSON NOTE/);
});

test('the independent partner control opens the same voice panel and indicates an urgent request', () => {
  const html = renderToStaticMarkup(
    createElement(PartnerContact, { partner, alert: true, selected: true, onOpen() {} }),
  );
  assert.match(html, /YOUR PARTNER/);
  assert.match(html, /Attention requested/);
  assert.match(html, /aria-expanded="true"/);
  assert.match(renderCall({ character: partner }), /PRIVATE PARTNER LINE/);
  assert.match(renderCall({ character: partner }), /Call your partner/);
});

test('resolved investigations retain the call transcript but cannot start another call', () => {
  const html = renderCall({ game: { ...game, state: { ...game.state, status: 'resolved' } } });
  assert.match(html, /Investigation complete/);
  assert.match(html, /Call transcript/);
  assert.doesNotMatch(html, /class="call-button/);
});

test('voice activity switches to thinking for a pending reply and back to listening on player speech', () => {
  const states = [];
  const client = new VoiceClient({
    onState: (s) => states.push(s.status),
    onHeard() {},
    onError() {},
    onClose() {},
  });
  client.context = { currentTime: 0 };
  client.event({ type: 'session.ready' });
  client.event({ type: 'reply.started', reply_id: 'reply' });
  client.event({ type: 'input.speech.started' });
  assert.deepEqual(states, ['listening', 'thinking', 'listening']);
  assert.equal(client.current.interrupted, true);
});

test('the evidence board is a memo boundary, isolated from unrelated voice caption updates', () => {
  assert.equal(InvestigationBoard.$$typeof, Symbol.for('react.memo'));
  assert.equal(typeof InvestigationBoard.type, 'function');
});

test('the investigation chooser renders one local cover per case, with a generic art fallback', () => {
  const cases = authoredCases.map(catalogProjection);
  for (const pack of cases) assert.match(pack.cover.src, /^\/assets\/covers\/[^/]+\.png$/);
  const html = renderToStaticMarkup(createElement(CaseCatalog, { cases, busy: false }));
  assert.equal((html.match(/<img\b/g) || []).length, 3);
  assert.match(html, /loading="lazy"/);
  const future = { ...cases[0], id: 'future-story', cover: null };
  const fallback = renderToStaticMarkup(createElement(CaseCatalog, { cases: [future] }));
  assert.doesNotMatch(fallback, /<img\b/);
  assert.match(fallback, /lucide-fingerprint/);
});
