# Implementation checkpoint — September 30

## Implemented and verified

- A case-independent engine and automatically discovered `cases/*.json` packs. A synthetic warehouse fixture with unrelated character/clue/partner IDs completes through the same service.
- Anonymous visitor isolation, signed HttpOnly cookies, 24-hour recovery data, MongoDB repository and transactional changes. Atlas administration and application-driver connectivity, actual transaction commit/rollback, isolated visitor progress, turn/ack persistence, and fresh-client/API recovery are verified by the opt-in live integration test.
- Nested JSON model proposals; backend prerequisite gates, authored critical speech, delivered-text acknowledgements, accusation proof groups, and verified-confession route. No blanket second-model review.
- Real Groq authentication and structured dialogue tested. A paraphrased eligible confrontation returns the correct reveal proposal. Free-form consistency and case difficulty still need broader playtests.
- Game-first, dark React Flow pinboard: fictional portrait photos, pinned paper notes and exhibits, sourced red-thread relationships, dragging/pan/zoom, a character interview drawer, partner leads, and reconstruction dialog.
- Five portrait assets generated with the built-in image tool and bundled in `public/assets/avatars/`; full prompts are in `public/assets/portrait-manifest.json`. No runtime external avatar requests.
- Browser voice client with microphone worklet, PCM playback, interruption flushing, and conservative delivery acknowledgement. Server authenticates and signs visitor/character/lease-specific callbacks. Agent/token failure cleanup tested.
- 16 regular backend tests and one live Atlas integration test passing; production frontend build passing. Earlier browser checks show the pinboard, case catalog, discovered notes, and character images. The earlier typed interview completed against the live model. The Atlas-backed preview's API is verified, but its latest visual reload was blocked by browser policy.

## Agreed UI/gameplay refinement

The owner rejected the initial dashboard-style UI in favor of a large, darker investigation wall with photos and pins. Observations come before deductions: physical clue notes describe findings rather than giving ready-made conclusions. Unexamined exhibits have neutral labels. Detailed notes open on demand; the partner may give interpretive nudges only when asked. Repositioning a pin changes presentation only, never authoritative progress.

## Still required for submission

1. Configure Vercel's network access and server-side environment, and verify real browser refresh/concurrent visitors on the public deployment. The existing `casework_app` user is cluster-restricted but currently has `readWriteAnyDatabase`; tighten it to `readWrite` on `voice_native_mystery` before public release. Local persistence and fresh-client/API recovery are verified.
2. Copy the stable locally generated `APP_SECRET` securely to Vercel and set the final public HTTPS origin. Revalidate AssemblyAI agent creation, custom callbacks, real audio, barge-in, character switching, delivery alignment, and usage caps end-to-end. Do not call live voice verified yet.
3. Implement the accepted short **spoken** partner alert at a quiet moment. Currently the alert is visual and opens the partner interview.
4. Prepare and playtest additional distinct case packs. Only Grange House is currently published in the catalog; the warehouse fixture is test-only. The 15–30-minute duration is a target, not a measured playtest result.
5. Integrate the existing GitHub `main` history (currently contains the owner's MIT license) without overwriting it; deploy to Vercel and verify public concurrent visitor isolation.
6. Optimize portrait delivery before public release (current source PNGs total approximately 10 MB), perform prompt-injection/consistency playtests, and check provider/free-tier capacity.

## Local preview

`http://localhost:4173` now runs against **MongoDB Atlas**, with `ALLOW_OFFLINE_DEMO=false`, a stable signing secret, and configured dialogue/voice credentials. API health and the one-case catalog return HTTP 200. Earlier temporary-memory progress was not migrated; refresh and start a new case. Ordinary `npm run dev` reads the ignored `.env`. Production never silently uses memory.

## Atlas setup — September 30 update

After the owner enabled organization-level AI client read/write access, the connected plugin successfully listed projects and created the previously requested isolated resources:

- Project: `Casework`, ID `6abcde79ccf0c8ea6f38b89d`.
- Cluster: `casework-demo`, verified `FREE`, `IDLE`, AWS `US_EAST_1`, MongoDB `8.0.34`.
- Database target remains `voice_native_mystery`, matching `.env.example`.

Existing `Cohort_Course_Application` and `Project 0` were not modified. The owner created `casework_app`, allowed one client IP (`/32`, not all addresses), and supplied the URI in ignored `.env`. Node's local resolver returned `querySrv/queryTxt ECONNREFUSED` while Windows resolved the same records. Atlas's standard TLS replica-set URI succeeded; the owner replaced the local SRV URI accordingly. No OS DNS or TLS verification settings were changed.

One immutable case pack and all five collections/indexes are initialized. The integration test verifies concurrent visitor admission, isolation, idempotent import and turn retries/acknowledgements, transaction rollback, TTL index definitions, and recovery through a fresh MongoClient/API instance using the stable cookie secret. It uses an explicit model fixture, not real speech, and removes only the two synthetic visitors and their turn/event records; admission counts remain. Do not equate this with public deployment, a browser refresh playtest, live voice, or an actual TTL-expiry test. Keep credentials in ignored `.env`, never in documentation or chat.

Secrets remain in ignored `.env`, not Git. The owner provided `https://github.com/Sayyam2911/voice-native-mystery.git` and authorized publishing the local commit history; preserve its existing MIT license when integrating `main`. Public deployment remains pending.
