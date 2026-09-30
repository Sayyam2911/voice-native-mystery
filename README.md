# Casework — Voice Native Mystery

A browser investigation built around prepared, immutable mysteries, flexible character dialogue, and server-authorized discoveries. The player interviews witnesses from a dark investigation pinboard, examines observed evidence, works with a case's detective partner, and reconstructs the event with supporting evidence. Character portraits are fictional generated images bundled with the app.

The catalog contains **Grange House**, **Blackwater Cabin**, and **The Willowmere Affair**, standalone contemporary adaptations of Arthur Conan Doyle mysteries. Each targets 15–30 minutes and has its own cast, observations, gated testimony, detective leads, and evidence-backed/earned-confession resolution. See [case sourcing](architecture/case-sourcing.md) for attribution and [validation](architecture/cases/catalog-validation.md) for checks; pacing still needs human playtesting.

## Structure

- `cases/`: versioned authored case packs; validated and imported into Atlas.
- `server/`: game rules, dialogue adapter, session security, database repository, and HTTP API.
- `src/`: React components, hooks, browser voice client, and styling.
- `tests/`: rule, isolation, playback, security, and API checks.
- `scripts/`: database import and service/deployment diagnostics.
- `architecture/`: scope, decisions, model, flows, and implementation status.
- `prototype/`: preserved earlier protocol experiment; separate from the application.

## Local development

Use Node 22+. Install with `npm install`, configure server-only secrets in `.env` using `.env.example`, then run `npm run dev`. Run `npm test` and `npm run build` before deploying. The AssemblyAI callback needs a publicly reachable HTTPS origin set in `PUBLIC_BASE_URL`; browser microphone capture needs localhost or HTTPS.

With Atlas configured, `npm run test:mongodb` runs an opt-in live persistence test without contacting dialogue/voice providers. It creates two synthetic visitors, verifies transactions, isolation and signed-cookie recovery through a fresh client/API instance, then deletes only its own visitor/turn/event records. Those two starts still count toward the normal daily admission cap. See [deployment and environment notes](architecture/deployment.md) for the local DNS workaround and public-release gates.

The offline fixture is explicitly opt-in through `ALLOW_OFFLINE_DEMO=true` and is labeled in the UI. Production requires Atlas and real provider credentials. Audio is streamed for live processing and is not archived by the application.

`npm run test:dialogue` is a separate opt-in real-model test (four small API calls) for paraphrased new-case disclosure triggers. It reads the ignored `.env`, creates no game sessions, and does not contact the voice provider. The normal test suite remains deterministic and provider-free.

See [architecture/implementation-status.md](architecture/implementation-status.md) for verified features and remaining deployment gates, and [architecture/implementation-plan.md](architecture/implementation-plan.md) for the staged plan. Additional cases use the same schema and rule engine; the catalog must not generate its core truth during play.
