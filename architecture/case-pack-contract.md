# Case packs and engine boundary

The application is a reusable investigation engine, not a Grange House implementation. Story-specific data lives only in versioned `cases/*.json`. Server catalog loading discovers these files automatically; adding a compatible case does not require engine, API, database, or UI changes.

## Authored data

- Identity, version, briefing, opening facts, source attribution, and presentation metadata.
- Characters, voices, permitted initial statements, interview topics, and an explicit `partnerId` (no reserved story character).
- Clues, provenance, inspectability, prerequisites, and characters unlocked by discoveries.
- Reveals: character, level, topic, authored speech, clue references, and prerequisite rules.
- Detective investigations: description, prerequisite rules, authored result, and clue references.
- Resolution: culprit, required evidence groups, optional verified-confession clue, and reconstruction.
- Optional partner alert configuration. Offline-test keywords and fallback replies also belong to content, not server logic.

Rules support `all` clue prerequisites, `any` clue prerequisites, and required unlocked `characters`. Evidence proof groups require at least one discovered, selected clue from each group. A pack's core truth is never generated during play.

## Generic application responsibilities

Validate references; pin a session to a case version; isolate visitor state; send only permitted context to the model; authorize proposed reveals; persist approved speech; acknowledge completed delivery; update the board; evaluate the submitted proof chain. The client receives a safe projection, never the full case pack.

The model classifies the player's question into nested JSON. It does not authorize its own condition flag. The explicit offline fixture uses pack keywords; this is a test aid, not the production dialogue system.

## Verification

`tests/fixtures/warehouse-case.json` deliberately uses different character, partner, clue, and action IDs. The integration test completes that synthetic case through the same game service without modifying the engine. This fixture is not a published playable story.

After a case version has been imported into Atlas, change its version when editing its content. Existing sessions retain the version they started with.
