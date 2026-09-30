# Submission implementation plan — September 30

The owner has approximately seven hours available and authorized implementation with reversible defaults while refining remaining design through tests.

## Implementation defaults

- React + Vite for the browser; a modular Node/Express backend deployed through one Vercel function. Same-origin browser APIs; browser audio connects directly to AssemblyAI.
- MongoDB Atlas for immutable case packs, anonymous 24-hour sessions, text turns, and sourced game events. Case authoring files stay versioned in the repository and are validated/imported into Atlas. No raw audio archive.
- Configurable OpenAI-compatible model adapter. Initial free-tier candidate: Groq `qwen/qwen3.8-27b`, subject to live access/quality checks. Structured JSON is parsed before approved speech is streamed to AssemblyAI.
- Backend gates all clue/claim commits and accusation outcomes. Voice replies remain short. Heard-reply acknowledgements must be validated against approved text; incomplete replies do not reveal hidden board items.
- Anonymous opaque HttpOnly session cookies, server-only secrets, idempotent acknowledgements, fixed demo usage caps, visible failures, and typed-text fallback alongside voice.
- Use per-visitor stored AssemblyAI agents only if necessary to bind callbacks reliably; do not share visitor dialogue state through a global character agent.

## Delivery order

1. Complete and validate the first case pack and rule engine; prove independent sessions, gates, accusations, and refresh recovery.
2. Build the evidence board, character interviews, detective leads, transcript, and resolution screen.
3. Bind AssemblyAI callbacks to visitor/character; integrate the real model and prove interruption does not commit unheard clues.
4. Connect Atlas and deploy a publicly reachable HTTPS callback. Test real credentials without exposing them.
5. Prepare additional distinct, attributed case packs on the same engine, then test their proof paths and the deployed experience.
6. Document submission setup, limitations, and the architecture actually built.

The first case is an implementation priority, not a decision to make the application single-story. Additional content follows the working reusable engine. Deployment, real-model behavior, and playback alignment remain gates until tested.
