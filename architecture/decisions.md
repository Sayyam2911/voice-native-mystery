# Architecture decisions

Record only decisions made with the project owner. Proposals remain open until discussed.

September 30 content implementation: the owner delegated adding two investigations under the existing rules. The previously shortlisted Black Peter and Boscombe Valley sources were adapted as **Blackwater Cabin** and **The Willowmere Affair**, bringing the published catalog to three. Their concrete contemporary evidence, gate and proof choices are delegated implementation details documented in the case bibles, not new platform architecture decisions. No case-specific engine/UI logic was added.

## Accepted scope

September 30 refinement: the owner requested a darker, game-first photo/pin investigation wall rather than a dashboard. Physical clues should state observations, with interpretive hints on request. The engine and UI remain case-independent; portrait and exhibit labels are case metadata. See the [checkpoint](implementation-status.md) for implemented behavior and remaining gaps.

September 30 voice-first refinement: the owner requested removing the detective from case-subject pins, improving unhovered portrait-label clarity, and removing typed chat. A separate partner contact and a call-first interview drawer now serve that presentation; server-side identity, rules, and persistence are unchanged.

| Decision | Reason | Status |
| --- | --- | --- |
| Build a reusable multi-story application, with no fixed catalog-size requirement | Returning players should have different cases to solve; a few good cases are sufficient initially | Accepted |
| Freeze each case's canonical facts before a player starts it | The solution, evidence, and character knowledge must stay consistent during play | Accepted |
| Prepare and validate the initial case packs before release, rather than generating case structure when a player selects a story | Keeps clues and character knowledge consistent and avoids a slow, unpredictable session start; AI may assist during authoring | Accepted |
| Use a hybrid runtime: fixed case facts and constraints, flexible generated conversation | Lets suspects respond naturally without changing the mystery | Accepted |
| Target approximately 15–30 minutes for a normal playthrough | A player should have enough time to investigate, interview, and reason through a case | Accepted |
| Use fictional detective stories with known solutions as candidate source material | The project owner prefers an authored mystery over generating a large story from scratch | Accepted |
| Set playable cases in a plausible contemporary context | Supports the intended end-user experience | Accepted |
| Modernize older published mysteries when their plot fits | The project owner accepts a historical authored story as source material for a present-day playable case | Accepted |
| Use “The Adventure of the Abbey Grange” as the first case source, preserving its central deception and solution | Provides a concrete case from which to derive the reusable format | Accepted |
| Resolve the first case by establishing who caused the death and how the scene was staged, without requiring a murder verdict | Preserves the source's confrontation and keeps the player's objective factual | Accepted |
| Aim to prepare 3–4 distinct stories initially | Provides a multi-case experience without making a large catalog a prerequisite | Accepted |
| Present cases as standalone present-day mysteries with literary source credit | Keeps the player and AI detective partner at the center of the investigation while acknowledging the authored source | Accepted |
| Let the AI detective respond to requested investigations and volunteer findings or occasional stuck-player hints | Makes it an active partner while leaving the player responsible for the deduction | Accepted |
| Limit partner interruptions and withhold the canonical solution by default | Preserves the investigation and avoids unearned spoilers | Accepted |
| Require the player to identify the culprit and present supporting evidence for the standard successful resolution | Makes investigation and the evidence board consequential | Accepted |
| Accept a persuasive reconstruction from a clear chain of independent clues, without demanding courtroom-level certainty or one decisive forensic clue | Fits a 15–30 minute detective game while keeping accusation evidence-based | Accepted |
| Use Tessa's corrected testimony as the first case's witness bridge to the fatal blow | Her account of finding Jack holding the fireplace tool, corroborated by scene and arrival evidence, supports deduction through interrogation rather than instant forensics | Accepted |
| Allow an earned, verified confession by the actual culprit as an alternative successful resolution for suitable cases | Offers a natural payoff when the player confronts a suspect without making direct confession requests a shortcut | Accepted |
| Start with single-player play and one active case per visitor | Keeps gameplay focused; saved sessions may follow | Accepted |
| Support several visitors playing independently through the public link | Per-visitor session isolation is a small addition when designed in from the start and avoids shared game progress | Accepted |
| Use only free tiers and already-granted credits for the first release | The project owner does not want out-of-pocket spending on hosting, speech, or model services | Accepted |
| Recover an active case after browser refresh or a brief disconnect | Prevents accidental loss during a 15–30 minute playthrough without adding long-term saved games | Accepted |
| Persist per-visitor dialogue history and game progress under a session ID | Later AI turns need prior interaction context, and recovery must reconstruct the visitor's current case | Accepted; storage product and retention open |
| Use MongoDB Atlas for first-release persistence | The owner selected it for case/session data after comparing document databases; it supports the intended server-owned, session-aware model without an admin UI | Accepted; collection boundaries and hosting details under discussion |
| Do not retain raw voice recordings in the first release | Text transcripts, approved replies, and structured game progress meet the continuity and replay needs without an audio archive | Accepted |
| Deliver the first release as a browser-based web app through a public link, with desktop/laptop as the primary layout | Avoids installation and provides room for voice controls, interviews, and the evidence board | Accepted |
| Give the detective and major suspects distinct, consistent spoken voices in the first release | Improves character recognition and immersion in a voice-native game | Accepted |
| Prefer AssemblyAI named voices over browser/device-provided voices | The project owner wants the named voices as part of the experience and development work; the owner confirms Voice Agent API access | Accepted |
| Use AssemblyAI Voice Agent API named-voice sessions for browser speech, with one active selected character at a time | The live prototype worked for the owner, including player interruption and switching characters; the dashboard attributes $0.08285 of test usage to Voice Agent against a stated $150 allowance | Accepted for the first release; case-control validation remains |
| Use a case board and explicit character selection, not an open-room speaker router | Keeps the current interview and its voice unambiguous; the board shows only discovered facts relevant to the selected character | Accepted |
| Put the AI detective in the character list and let it request the player's attention | Keeps detective collaboration available without taking control of the current interview | Presentation superseded by the separate partner contact; attention requests remain accepted |
| Separate the detective contact from case-related people on the evidence board | Distinguishes the player's collaborator from suspects and witnesses without changing the character/voice model | Accepted |
| Make the player-facing interview voice-only, retaining read-only call transcripts and passive question suggestions | Voice is the primary interaction, not an optional mode alongside typed chat; an explicit call action preserves microphone consent | Accepted; supersedes the implementation default of a typed-text fallback |
| Let the player interrupt a suspect's spoken response | Keeps interrogation conversational and responsive; the app must stop playback and handle the unfinished turn consistently | Accepted |
| Commit a clue-bearing sentence only after its audio finishes playing | Prevents an interrupted, unheard claim from silently appearing on the evidence board; the player can ask again if cut off mid-sentence | Accepted |
| Pair the detective's visual request with a brief spoken alert at the next quiet moment | Makes the partner feel present without speaking over the player or cutting off a suspect mid-sentence | Accepted |
| Use a modular voice pipeline as the baseline: AssemblyAI streaming transcription, game backend/LLM, then per-character speech synthesis | Originally selected for case-aware response control and distinct voices; the named-voice Voice Agent API path passed the interaction smoke test | Superseded as the first-release baseline; retain as a fallback if remaining gates fail |
| Make the backend authoritative for canonical facts, discovered evidence, and case-resolution checks | Keeps spoilers out of browser-delivered data and makes clue and accusation rules enforceable independently of UI state | Accepted |
| Use prompt self-checks for ordinary character dialogue, but backend gates for critical revelations | No second LLM review call is required for every reply. The backend supplies only currently permitted disclosure facts; it controls evidence, culprit, confession, and solution unlocks, with authored wording where needed. Prompt-only self-check is not treated as a guarantee | Accepted |
| Have the LLM propose dialogue or a reveal in structured JSON, with backend approval | A typed response is easier to parse than free prose. The model may propose a reveal ID from its permitted trigger list, but only the backend checks case prerequisites and selects the actual reveal text; raw JSON is never sent to speech synthesis | Accepted; exact schema and fallback behavior are drafts |
| Treat reveal level as disclosure progression | Some facts may be available earlier than others; a character may pass through denial, partial admission, and a full account. The exact numeric scale and JSON representation will be refined through case implementation and testing | Accepted concept; representation deferred |
| Treat the September 30, 2026 submission as the near-term milestone | Establishes the order of implementation and verification | Accepted |

## Under discussion

| Choice | Trade-off to resolve |
| --- | --- |
| Initial case lineup | Three packs now implemented from Abbey Grange, Black Peter, and Boscombe Valley; a fourth is optional, not required |
| Exact partner hint thresholds and tool access | Need tuning against case length, player progress, and spoiler risk |
| Exact per-case proof and confession triggers | Case authoring must specify which clues satisfy proof or unlock a confession, then validation must test those paths |
| Degree of modernization | Period clues, access, communications, and suspect availability must be adapted and revalidated |
| Case preparation workflow | Need a repeatable authoring and validation process for pre-prepared case packs |
| What varies on replay of an already solved case | Dialogue can vary, but replay value may require more than changed phrasing of the same solution |
| Voice-agent integration for named voices | A protocol prototype with two voices and a deterministic custom endpoint exists under `prototype/voice-agent`; local tests pass and the owner reports the live connection, interruption, and character switching work. A real LLM, case-state binding, playback-to-clue acknowledgement, and grant credit use remain unverified |
| Credit accounting and public-demo capacity | The dashboard shows Voice Agent usage and a $150 allowance. Decide session-duration and concurrent-visitor caps, monitor balance, and retain a safe capacity/failure path. External model usage may have separate cost |
| How a spoken challenge triggers a gated clue | Compare natural-language intent detection with an explicit evidence-presentation action, or combine them. The trigger must work with paraphrased questions without allowing accidental early reveals |
| Pre-speech buffering for exceptional turns | Decide whether any high-risk generated line needs a short buffer before speech; ordinary dialogue does not require a second LLM review pass |
| Malformed or unauthorized model output | Choose the safe spoken fallback and whether to retry generation; never speak raw JSON or a rejected reveal |
| Public-demo usage caps and failure mode | Free credits and quotas are finite, so decide how to limit sessions and what players see when capacity is exhausted |
| Voice latency and interruption strategy | Modular stages add delay and require coordinated cancellation; test a thin end-to-end slice before hardening |
| Active-session retention and storage | Choose a short recovery window and backend store after clarifying expected simultaneous players and hosting |
| MongoDB document boundaries and case authoring | Decide whether prepared case packs are loaded into Atlas at deployment or kept in repository files at runtime; separate unbounded dialogue/history from small session state |
| Detective alert triggers and cooldown | Decide which case events or stalls justify an alert and how to avoid spam or spoilers |
| Muse Spark 1.3 Contributor as runtime model | Potential low cost versus unmeasured latency, availability, structured-output quality, and provider terms |

## Superseded handoff assumption

The handoff presents one polished Ashford Hotel case as the MVP product. Ashford may still be a showcase case, but the application architecture must support many independent cases. The earlier 50–100 story estimate is now a possible future scale, not a submission requirement.
