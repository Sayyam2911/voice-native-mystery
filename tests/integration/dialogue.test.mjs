import test from 'node:test';
import assert from 'node:assert/strict';
import { authoredCases, initialState } from '../../server/cases.mjs';
import { callModel, approveProposal } from '../../server/dialogue.mjs';

// Opt-in: four small real model calls, no database writes or audio sessions.
for (const caseId of ['blackwater-cabin', 'willowmere']) {
  test(
    `${caseId}: live model recognizes paraphrased eligible disclosures without receiving locked text`,
    { timeout: 60000 },
    async () => {
      assert.ok(process.env.LLM_API_KEY, 'Configure LLM_API_KEY in ignored .env.');
      const pack = authoredCases.find((p) => p.id === caseId);
      const admission = pack.reveals.find(
        (r) => r.characterId === pack.resolution.culpritId && r.level === 'partial',
      );
      const confession = pack.reveals.find((r) => r.confession);
      for (const [reveal, question] of [
        [
          admission,
          'The independent record contradicts your alibi. Explain that meeting and stop denying you attended.',
        ],
        [
          confession,
          'You have already admitted the meeting. Explain the fatal act and your actions afterward in a full account.',
        ],
      ]) {
        const state = initialState(pack);
        state.unlockedCharacterIds = pack.characters.map((c) => c.id);
        state.knownClueIds = [...(reveal.requires.all || [])];
        if (reveal === confession) {
          state.revealedIds = [admission.id];
          state.characterLevels[admission.characterId] = 'partial';
        }
        const result = await callModel(pack, state, reveal.characterId, question, [], process.env);
        assert.equal(result.mode, 'live', result.warning || 'Expected a real provider response.');
        assert.equal(
          approveProposal(pack, state, reveal.characterId, result.proposal).revealId,
          reveal.id,
        );
        assert.equal(
          approveProposal(pack, initialState(pack), reveal.characterId, result.proposal).revealId,
          null,
        );
      }
    },
  );
}
