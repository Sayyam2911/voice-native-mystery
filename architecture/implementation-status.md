# Implementation checkpoint — September 30

## Implemented and verified

- A case-independent engine and automatically discovered `cases/*.json` packs. A synthetic warehouse fixture with unrelated character/clue/partner IDs completes through the same service.
- Anonymous visitor isolation, signed HttpOnly cookies, 24-hour recovery data, MongoDB repository and transactional changes. Atlas plugin administration access is verified; the application database connection and real transactions are **not verified**.
- Nested JSON model proposals; backend prerequisite gates, authored critical speech, delivered-text acknowledgements, accusation proof groups, and verified-confession route. No blanket second-model review.
- Real Groq authentication and structured dialogue tested. A paraphrased eligible confrontation returns the correct reveal proposal. Free-form consistency and case difficulty still need broader playtests.
- Game-first, dark React Flow pinboard: fictional portrait photos, pinned paper notes and exhibits, sourced red-thread relationships, dragging/pan/zoom, a character interview drawer, partner leads, and reconstruction dialog.
- Five portrait assets generated with the built-in image tool and bundled in `public/assets/avatars/`; full prompts are in `public/assets/portrait-manifest.json`. No runtime external avatar requests.
- Browser voice client with microphone worklet, PCM playback, interruption flushing, and conservative delivery acknowledgement. Server authenticates and signs visitor/character/lease-specific callbacks. Agent/token failure cleanup tested.
- 16 backend tests passing; production frontend build passing. Browser checks show the pinboard, case catalog, discovered notes, and character images. The earlier typed interview completed against the live model.

## Agreed UI/gameplay refinement

The owner rejected the initial dashboard-style UI in favor of a large, darker investigation wall with photos and pins. Observations come before deductions: physical clue notes describe findings rather than giving ready-made conclusions. Unexamined exhibits have neutral labels. Detailed notes open on demand; the partner may give interpretive nudges only when asked. Repositioning a pin changes presentation only, never authoritative progress.

## Still required for submission

1. Configure a scoped database user, allowed application/client IPs, and `MONGODB_URI` for the newly created free cluster, then test real transactions and refresh recovery. Atlas plugin access and cluster readiness are verified; application connectivity is not.
2. Configure stable `APP_SECRET` (32+ characters) and the final public HTTPS origin. Revalidate AssemblyAI agent creation, custom callbacks, real audio, barge-in, character switching, delivery alignment, and usage caps end-to-end. Do not call live voice verified yet.
3. Implement the accepted short **spoken** partner alert at a quiet moment. Currently the alert is visual and opens the partner interview.
4. Prepare and playtest additional distinct case packs. Only Grange House is currently published in the catalog; the warehouse fixture is test-only. The 15–30-minute duration is a target, not a measured playtest result.
5. Integrate the existing GitHub `main` history (currently contains the owner's MIT license) without overwriting it; deploy to Vercel and verify public concurrent visitor isolation.
6. Optimize portrait delivery before public release (current source PNGs total approximately 10 MB), perform prompt-injection/consistency playtests, and check provider/free-tier capacity.

## Local preview

`http://localhost:4173` runs with an **explicit temporary in-memory test store** while the Atlas URI is unconfigured, and real dialogue credentials if present. The UI labels this mode. Restarting this local server loses its test progress; production never silently uses memory. Ordinary `npm run dev` reads `.env`; the temporary-store switch is `ALLOW_OFFLINE_DEMO=true` in the launch environment.

## Atlas setup — September 30 update

After the owner enabled organization-level AI client read/write access, the connected plugin successfully listed projects and created the previously requested isolated resources:

- Project: `Casework`, ID `6abcde79ccf0c8ea6f38b89d`.
- Cluster: `casework-demo`, verified `FREE`, `IDLE`, AWS `US_EAST_1`, MongoDB `8.0.34`.
- Database target remains `voice_native_mystery`, matching `.env.example`.

Existing `Cohort_Course_Application` and `Project 0` were not modified. No database users or network access entries exist in Casework yet; no case data has been imported. The owner previously planned to supply the URI locally. Keep credentials in ignored `.env`, never in this documentation or chat. Do not open network access to all addresses silently. Creating the project/cluster verifies administrative write access, not driver connectivity, transactions, or deployed persistence.

Secrets remain in ignored `.env`, not Git. The owner provided `https://github.com/Sayyam2911/voice-native-mystery.git`; the remote is configured and its initial MIT license was inspected. No deployment or push has been performed at this checkpoint.
