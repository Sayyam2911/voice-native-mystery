import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { authoredCases, validateCase, initialState } from '../server/cases.mjs';
import { MemoryStore } from '../server/store.mjs';
import { GameService } from '../server/game.mjs';
import {
  approveProposal,
  fixtureProposal,
  permittedContext,
  heardSegmentCount,
} from '../server/dialogue.mjs';
import { sign, verify } from '../server/security.mjs';

const make = () =>
  new GameService(new MemoryStore(), { ALLOW_OFFLINE_DEMO: 'true', MAX_DAILY_SESSIONS: 100 });
const grange = authoredCases.find((pack) => pack.id === 'grange-house');
test('every authored pack has valid references and proof groups', () =>
  authoredCases.forEach(validateCase));
test('model flags do not bypass a reveal rule', () => {
  const state = initialState(grange);
  const proposal = fixtureProposal(
    grange,
    { ...state, knownClueIds: ['E2'] },
    'tessa',
    'When did you enter?',
  );
  assert.equal(proposal.type, 'reveal');
  assert.equal(approveProposal(grange, state, 'tessa', proposal).revealId, null);
  assert.equal(
    approveProposal(grange, { ...state, knownClueIds: ['E2'] }, 'mara', proposal).revealId,
    null,
  );
});
test('locked text and the canonical solution are absent from initial LLM context', () => {
  const ctx = JSON.stringify(permittedContext(grange, initialState(grange), 'tessa'));
  assert.ok(!ctx.includes('Jack was holding'));
  assert.ok(!ctx.includes('fatalActorId'));
  assert.ok(!ctx.includes('two half-hitches'));
});
test('interruption cannot silently commit an unheard reveal; complete ack is idempotent', async () => {
  const game = make(),
    s = await game.start('grange-house');
  await game.inspect(s._id, 'E2');
  await game.select(s._id, 'tessa');
  const turn = await game.generateTurn(s._id, 'tessa', 'When did you enter?', {
    requestId: 'turn-one',
  });
  assert.equal(turn.candidate.revealId, 'tessa-timeline');
  const partial = await game.acknowledge(
    s._id,
    turn._id,
    turn.approvedReply.segments[0].text,
    true,
  );
  assert.ok(!partial.state.knownClueIds.includes('E8'));
  const complete = await game.acknowledge(s._id, turn._id, turn.approvedReply.text);
  assert.ok(complete.state.knownClueIds.includes('E8'));
  await game.acknowledge(s._id, turn._id, turn.approvedReply.text);
  assert.equal((await game.store.getEvents(s._id)).filter((e) => e.clueId === 'E8').length, 1);
});
test('visitors have independent progress and private data never enters the board projection', async () => {
  const game = make(),
    a = await game.start('grange-house'),
    b = await game.start('grange-house');
  await game.inspect(a._id, 'E2');
  const pa = await game.projection(a._id),
    pb = await game.projection(b._id);
  assert.deepEqual(pa.state.knownClueIds, ['E2']);
  assert.deepEqual(pb.state.knownClueIds, []);
  assert.ok(!pb.characters.some((c) => c.id === 'jack'));
  assert.ok(!JSON.stringify(pb).includes('two half-hitches'));
  await assert.rejects(game.inspect(b._id, 'E8'), (e) => e.status === 403);
});
test('accusation needs discovered selected evidence across the proof chain', async () => {
  const game = make(),
    s = await game.start('grange-house');
  assert.equal((await game.accuse(s._id, 'jack', ['E2', 'E4', 'E8'])).feedback.success, false);
  await game.inspect(s._id, 'E2');
  await game.investigate(s._id, 'gate');
  await game.select(s._id, 'tessa');
  const t = await game.generateTurn(s._id, 'tessa', 'When did you enter?');
  await game.acknowledge(s._id, t._id, t.approvedReply.text);
  assert.equal((await game.accuse(s._id, 'mara', ['E2', 'E4', 'E8'])).feedback.success, false);
  assert.equal((await game.accuse(s._id, 'jack', ['E2', 'E4', 'E8'])).feedback.success, true);
});
test('repeated request IDs do not create a second turn or spend another model call', async () => {
  const game = make(),
    s = await game.start('grange-house');
  const a = await game.generateTurn(s._id, 'detective', 'What next?', { requestId: 'same' });
  const b = await game.generateTurn(s._id, 'detective', 'What next?', { requestId: 'same' });
  assert.equal(a._id, b._id);
  assert.equal((await game.session(s._id)).turnCount, 1);
});
test('forged and expired temporary credentials fail verification', () => {
  const secret = 'long-test-secret-'.repeat(4),
    t = sign({ sid: 's', exp: Date.now() + 10000 }, secret);
  assert.equal(verify(t, secret).sid, 's');
  assert.equal(verify(t + 'x', secret), null);
  assert.equal(verify(sign({ sid: 's', exp: 1 }, secret), secret), null);
});
test('speech acknowledgement counts only whole approved sentences', () =>
  assert.equal(
    heardSegmentCount(
      [{ text: 'I was there.' }, { text: 'Jack held the tool.' }],
      'I was there Jack held',
    ),
    1,
  ));

test('a different case, partner ID, clues, and actions run without engine changes', async () => {
  const pack = validateCase(
    JSON.parse(readFileSync(new URL('./fixtures/warehouse-case.json', import.meta.url), 'utf8')),
  );
  const store = new MemoryStore();
  store.packs = new Map([[`${pack.id}:${pack.version}`, pack]]);
  const game = new GameService(store, { ALLOW_OFFLINE_DEMO: 'true' });
  const session = await game.start(pack.id);
  assert.equal(session.state.selectedCharacterId, 'liaison');
  const lead = await game.generateTurn(session._id, 'liaison', 'Check the access record');
  await game.acknowledge(session._id, lead._id, lead.approvedReply.text);
  await game.inspect(session._id, 'scene-trace');
  await game.select(session._id, 'supervisor');
  const turn = await game.generateTurn(
    session._id,
    'supervisor',
    'Tell the truth about the platform',
  );
  assert.equal(turn.candidate.revealId, 'correct-account');
  await game.acknowledge(session._id, turn._id, turn.approvedReply.text);
  const result = await game.accuse(session._id, 'supervisor', [
    'scene-trace',
    'access-record',
    'corrected-account',
  ]);
  assert.equal(result.feedback.success, true);
  assert.equal(result.case.id, pack.id);
  assert.equal(result.case.partnerId, 'liaison');
});
