# Design choices

| Decision | Why it fits this project | Trade-off |
| --- | --- | --- |
| Fixed authored truth with flexible dialogue | Keeps a coherent solvable mystery while allowing natural questions | Requires deliberate case authoring and consistency playtests |
| Versioned case packs instead of story-specific code | New casts, clues, rules and proof chains use the same engine | Schema/reference validation is essential |
| One modular Node backend | Keeps a solo-built demo understandable and transactional | A larger deployment may need separate workloads after measuring pressure |
| AssemblyAI Voice Agent plus custom game callback | Integrates named voices, transcription and turn detection while preserving response approval | Needs public HTTPS callbacks and provider-event alignment |
| Backend JSON gates and authored critical speech | Protects revelations and resolution without a second model review on every turn | Ordinary generated conversation still has uncertainty |
| Commit a whole short critical reply after validated playback | Conservatively avoids unlocking an interrupted, unheard revelation | Can require the player to ask again after partial delivery |
| Anonymous signed-cookie sessions in Atlas | Separates visitors and supports temporary recovery without signup | Current case recovery is browser-bound and expires after 24 hours |
| Discovered-only pinboard and a separate partner contact | Preserves player deduction and distinguishes the helper from case subjects | A source reader can still inspect the public answers |
| No application audio archive | Limits stored data to text, provenance and progress | Raw-audio replay/debugging is unavailable |
| Explicit budget caps and failure states | Makes public-demo provider usage bounded | Players may encounter capacity limits |

The implementation intentionally excludes a story admin panel, generated mysteries during play, multiplayer, and long-term user accounts. These are expansion paths, not required infrastructure for a three-case submission.
