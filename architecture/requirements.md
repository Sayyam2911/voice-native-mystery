# Requirements and constraints

## Confirmed by the project owner

- Build a reusable application with multiple murder mystery stories so players can return for a different case. Target 3–4 prepared stories initially; there is no fixed long-term catalog size.
- No stories are currently available. We must source or create the first cases.
- Use fictional detective stories by established authors with known solutions as case source material. Contemporary adaptation of older stories is acceptable; the playable cases should depict plausible present-day crimes.
- Present adapted cases as standalone mysteries, with attribution to their literary sources. The player and an AI detective partner investigate the adapted case together; the partner's guidance is an important part of the experience.
- For the first case, establish who caused the death and how the burglary scene was staged. Do not require the player or game to decide whether the fatal blow legally constitutes murder.
- The AI detective can investigate leads on request, volunteer its own findings, and offer occasional hints when the player stalls. Its interventions should be concise and rate-limited. It should reason from discovered evidence and its own investigation results rather than receive the canonical solution by default.
- A successful case resolution has two permitted routes: the player correctly accuses the culprit with sufficient supporting evidence, or the actual culprit gives an earned, verified confession. A confession route is optional per case. It becomes available only after confrontation with a verified clue and must include a case-specific, nonpublic detail checked against fixed case facts.
- Supporting evidence may form a persuasive reconstruction across multiple independent clues; it need not meet a courtroom standard or include one decisive forensic result. Each case still needs an explicit, testable clue chain connecting the person to the event and explaining the staged scene.
- Target a normal playthrough of approximately 15–30 minutes. The judged demo can show a shorter path through a case.
- Decide and freeze each case's canonical facts, solution, character knowledge, evidence, and proof path before play. The exact case-authoring and validation workflow is open.
- Prepare and validate the initial 3–4 case packs before release, using AI to assist authoring if useful. Selecting a case at runtime must not generate its core facts, clues, or character knowledge from the raw story.
- Keep canonical solutions, character knowledge boundaries, evidence unlocks, and resolution checks on an authoritative backend. The browser receives only player-visible case information and a projection of current progress; session storage technology remains open.
- Use live generation for flexible NPC conversation within those fixed case facts and character boundaries (hybrid approach).
- Prompt characters to check their replies against the allowed context and admit uncertainty rather than inventing facts. Do not rely on that prompt as the sole protection: give the model only facts currently permitted for disclosure, while the backend authorizes evidence, culprit, confession, and solution revelations. No blanket second LLM review call is required for ordinary dialogue.
- Ask the runtime model for a small structured JSON response that either contains ordinary dialogue or proposes a reveal ID. Parse and validate that response on the backend; the model's proposal never grants the reveal by itself. Send only approved natural-language speech, not raw JSON, to AssemblyAI.
- Support solo play with one active case per visitor; several visitors may play independently at the same time. No shared game state or multiplayer interaction is required. Saved sessions and other features are optional later.
- Restore the current case after an accidental browser refresh or brief connection loss, using a temporary session identity. This is active-session recovery, not a promise of long-term saved games. Retention time and storage mechanism remain open.
- Persist each visitor's text conversation history and evolving case progress under a session ID so later dialogue turns can use prior interactions and refresh recovery can reconstruct the current state. Store player transcripts, backend-approved replies, and structured game events; do not retain raw microphone or synthesized audio for the first release. The owner does not require an admin interface for case publishing. The database product remains open.
- Deliver a public-link web application, designed primarily for desktop/laptop browsers in the first release. A native desktop or mobile app is out of scope; responsive mobile web support is not yet committed.
- Make character interaction voice-only in the player interface, with a prominent explicit start/end call action, connection and speaker-turn status, and optional read-only call transcript. Remove typed chat and clickable send-question shortcuts. Selecting a contact must not automatically activate the microphone.
- Keep the AI detective separate from the case-related people on the board. Provide a dedicated partner contact control and retain attention requests; only discovered observations about case subjects belong on their pins. Portrait labels must be readable without hovering.
- Start from scratch; frontend, backend, model, text-to-speech, and deployment choices are open.
- AssemblyAI account and 150 credits are available. Muse Spark 1.3 Contributor is a possible low-cost language model, not a selected dependency.
- Use AssemblyAI Voice Agent API named-voice sessions for browser speech in the first release, with one active selected character at a time. A live two-character prototype passed the owner's interruption and switching checks. The custom LLM-compatible backend endpoint is the intended dialogue path; integration with a real model and case engine remains to be validated. The earlier modular STT/LLM/TTS design is a fallback, not the baseline.
- One developer is building with AI assistance for a September 30, 2026 submission.
- First-release operating cost must remain zero out of pocket: use free tiers and already-granted credits only. Provider eligibility, quotas, and graceful behavior at capacity must be verified before public launch.

## Product intent carried from the handoff

- Speak naturally with distinct suspects, interrupt them, confront claims, inspect evidence, work with an AI detective partner, and make an accusation.
- Show a case board with currently known facts and a character list alongside it. Selecting a suspect opens that person's interview and shows only facts the player has already learned about them; newly established facts appear on the board as play progresses.
- Give the AI detective a separate partner contact control (superseding the earlier shared-character-list presentation). When it requests attention, show a visible message and play a brief alert in the detective's voice at the next quiet moment; do not speak over the player or cut off a suspect mid-sentence. The player chooses whether to switch to the detective.
- Let the player barge in while a suspect is speaking. Stop the suspect's audio promptly and handle the unheard remainder without silently adding it to the evidence board.
- Keep clue-bearing responses short and track playback by sentence-sized segment. A discoverable clue from a segment becomes known only when that segment finishes playing; interrupted, incomplete segments do not update the board and may be elicited again.
- Canonical case facts remain stable during play. NPCs may lie or evade only within their defined knowledge and strategy.
- Claims and discovered evidence should be traceable to their source. The evidence board should reflect session events.
- Voice interaction and a reliable demo path matter more than elaborate visuals.
- The AI detective and major suspects should have recognizably different, consistent spoken voices in the first release. Voice quality should be tested in the deployed browser, not inferred from provider demos.
- Prefer AssemblyAI's named voices for the detective and suspects. The owner confirms Voice Agent API access and reports $0.08285 of Voice Agent usage in an account with a $150 allowance after the live smoke test. Browser/device voices are not the desired primary experience.

## Open questions

1. “The Adventure of the Abbey Grange” is the selected source for the first playable case. Which 2–3 sources should follow it?
2. How should case authoring and validation work, and what may vary between plays of the same case?
3. Can the custom-LLM connection preserve backend case control, including heard-clue acknowledgements, with a real model? How should natural speech or explicit evidence presentation trigger a gated clue?
4. Which hosting target and supported desktop browsers are required for the public submission link? Is responsive mobile web support worthwhile later?

## Tentative quality criteria to refine

- Every published case has a consistent solution and at least one checkable proof path.
- No NPC gains access to private case facts outside its allowed view.
- An interrupted response stops speaking promptly; only completed spoken segments may commit claims as heard testimony.
- A wrong accusation gives bounded feedback without changing the case truth.
