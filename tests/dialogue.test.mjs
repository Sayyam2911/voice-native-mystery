import test from 'node:test';
import assert from 'node:assert/strict';
import { authoredCases, initialState } from '../server/cases.mjs';
import { callModel, permittedContext } from '../server/dialogue.mjs';

test('natural dialogue uses public character background and existing disclosure state, not hidden truth', () => {
  for (const pack of authoredCases) {
    const state = initialState(pack);
    for (const character of pack.characters.filter((c) => c.initial)) {
      const context = permittedContext(pack, state, character.id);
      assert.equal(context.character.demeanorBackground, character.bio || character.role);
      assert.equal(context.character.disclosureLevel, 'denial');
      assert.equal(context.character.canonicalSolution, undefined);
      for (const reveal of pack.reveals)
        assert.ok(
          !JSON.stringify(context).includes(reveal.speech),
          'Unrevealed authored testimony stays hidden.',
        );
    }
  }
});

test('the runtime prompt asks for conversational performance without relaxing reveal authority', async (t) => {
  const pack = authoredCases[0],
    state = initialState(pack);
  const cid = pack.partnerId;
  const proposal = {
    type: 'dialogue',
    dialogue: { text: "Let's take it one step at a time." },
    reveal: { id: null, level: null, condition: { id: null, condition_reached: false } },
    investigation: { id: null },
  };
  let sent;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    sent = JSON.parse(options.body);
    return new Response(
      JSON.stringify({ choices: [{ message: { content: JSON.stringify(proposal) } }] }),
    );
  });
  const result = await callModel(pack, state, cid, 'Where should I start?', [], {
    LLM_API_KEY: 'test-only',
  });
  assert.equal(result.mode, 'live');
  const prompt = sent.messages[0].content;
  assert.match(prompt, /not a script to repeat verbatim/);
  assert.match(prompt, /Emotion is characterization, never evidence of guilt/);
  assert.match(prompt, /no markdown, stage directions, bracketed emotion tags, SSML/);
  assert.match(prompt, /backend.*never authority|suggestion, never authority/);
  assert.match(prompt, /prerequisitesSatisfied is true/);
  assert.match(prompt, /Preserve exact names, times, and factual meaning/);
  assert.equal(sent.response_format.type, 'json_schema');
});
