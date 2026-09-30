# Components and responsibilities (working draft)

These logical components are implemented as modules within a single browser app and one Node/Express API deployment, not separate microservices. React/Vite, Groq, AssemblyAI, and the MongoDB repository are the current implementation baseline. Local Atlas persistence is verified; integrated voice and public deployment are pending.

| Component | Responsibility |
| --- | --- |
| Browser game UI | Show the dark draggable pinboard, locally bundled fictional portraits, discovered observations, current interview, visible partner alerts, and reconstruction dialog; capture microphone audio and play character speech. Board positions are presentation-only. Session ownership uses the server's signed HttpOnly cookie. |
| Game backend | Load the selected pre-validated case pack, isolate each visitor's session, route turns to the selected character, supply only currently permitted disclosure context, gate critical revelations and evidence rules, determine detective alerts and case resolution, and return only player-visible state. |
| Case packs | Hold read-only canonical truth, character knowledge boundaries, authored clues, proof/confession rules, and player-facing case material. Prepared and validated before release. |
| Session progress store | MongoDB repository for each visitor's case version, known clues, character levels, approved/delivered turns, events, and resolution state. Session, turn, and event data expire after 24 hours. Tests and the explicitly labeled temporary local preview use an injected memory store; production does not. |
| AssemblyAI Voice Agent API | Provide streaming recognition, turn-taking, interruption handling, and per-character named speech through one active selected-character session. A character switch ends the old session and starts another with the appropriate voice. |
| LLM provider | Groq through a configurable adapter generates character and partner dialogue from permitted context, using prompt self-checks and uncertainty when facts are unavailable; it does not authorize evidence unlocks, confessions, or wins. Critical speech comes from authored case data. |
| Custom LLM-compatible backend endpoint | Receive AssemblyAI's chat-completion request, authenticate the callback, verify its signed visitor/character/active-lease binding, ask the model for structured JSON, validate proposed reveals, and stream approved speech only. Failure returns safe authored dialogue rather than speculative evidence. Integrated provider verification remains pending. |

The backend can enforce structured state transitions but cannot guarantee the truth of arbitrary generated prose without additional controls and testing. See the [spoken-clue sequence](flows.md#spoken-clue-and-player-barge-in).
