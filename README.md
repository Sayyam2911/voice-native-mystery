# Casework — Voice Native Mystery

A browser investigation built around prepared, immutable mysteries, flexible character dialogue, and server-authorized discoveries. The player interviews witnesses, examines a sourced evidence board, works with Detective Rowan, and reconstructs the event with supporting evidence.

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

The offline fixture is explicitly opt-in through `ALLOW_OFFLINE_DEMO=true` and is labeled in the UI. Production requires Atlas and real provider credentials. Audio is streamed for live processing and is not archived by the application.

See [architecture/implementation-plan.md](architecture/implementation-plan.md) for delivery status. Additional cases use the same schema and rule engine; the catalog must not generate its core truth during play.
