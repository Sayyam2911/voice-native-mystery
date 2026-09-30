# Multi-case validation

The three published packs are Grange House, Blackwater Cabin, and The Willowmere Affair. The warehouse fixture remains test-only. All packs use the same loader, engine, MongoDB collections, API, voice binding, and board. No additional case-ID branches or schema migration were introduced.

`npm test` includes a content audit and full new-case playthroughs. Checks cover referenced identifiers, reachable clues/actions without circular gates, bundled portraits, distinct per-cast voices, short authored speech, initial projection/prompt holdback exclusion, denied forged/missing-prerequisite revelations, failed early/incorrect/incomplete accusations, both successful resolution routes, provenance, visitor isolation, and interruption/idempotent delivery.

`npm run test:dialogue` is opt-in: four small real-provider calls classify paraphrased eligible partial/full admissions. The same proposals are rejected against initial state. It does not replace adversarial conversation or real-audio playtests.

`npm run seed` imports immutable versions idempotently into Atlas; existing Grange House v1 is not edited. `npm run test:mongodb` checks the real persistence path separately and cleans only its own synthetic visitors. Case duration and difficulty are design hypotheses until human playtesting; named voices are configured, not evidence that every new voice has been heard end-to-end.

Review checklist for another pack: freeze causal truth and timings; distinguish observation from inference and testimony from verified record; make the actual fatal actor discoverable; include an independently corroborated witness bridge; gate full accounts after meaningful challenges; keep a precise confession holdback off the board and model context; exercise all proof groups and both completion routes; preserve attribution; bump published versions for any content change.
