# Components and responsibilities (working draft)

This lists logical responsibilities already implied by the agreed design; process boundaries, frameworks, providers, and storage products remain open.

| Component | Responsibility |
| --- | --- |
| Browser game UI | Show the case board, character list, current interview, visible detective alerts, and player-visible progress; capture microphone audio and play character speech. Retain a temporary session identity for active-case recovery. |
| Game backend | Load the selected pre-validated case pack, isolate each visitor's session, route turns to the selected character, supply only currently permitted disclosure context, gate critical revelations and evidence rules, determine detective alerts and case resolution, and return only player-visible state. |
| Case packs | Hold read-only canonical truth, character knowledge boundaries, authored clues, proof/confession rules, and player-facing case material. Prepared and validated before release. |
| Session progress store | Hold each visitor's active case, completed spoken segments, known facts, interview claims, and resolution state long enough to recover from refresh or brief disconnect. Product and retention period remain open. |
| AssemblyAI Voice Agent API | Provide streaming recognition, turn-taking, interruption handling, and per-character named speech through one active selected-character session. A character switch ends the old session and starts another with the appropriate voice. |
| LLM provider | Generate ordinary character and detective dialogue from permitted context, using prompt self-checks and uncertainty when facts are unavailable; it does not authorize evidence unlocks, confessions, or wins. Provider remains open. |
| Custom LLM-compatible backend endpoint | Receive AssemblyAI's streamed chat-completion request, bind it to the correct game session and character, ask the selected model for structured JSON, validate any proposed reveal with the case engine, and return only approved speech text. Binding, authentication, and fallback behavior need design before production use. |

The backend can enforce structured state transitions but cannot guarantee the truth of arbitrary generated prose without additional controls and testing. See the [spoken-clue sequence](flows.md#spoken-clue-and-player-barge-in).
