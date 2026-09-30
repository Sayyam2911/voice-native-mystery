# Environment and deployment checkpoint

## Local environment

The app runs at `http://localhost:4173` using `npm run dev`. Secrets are read from ignored `.env`; neither the frontend bundle nor architecture documents contain them.

- `MONGODB_URI`: authenticated Atlas URI for `casework-demo`.
- `MONGODB_DB`: `voice_native_mystery`.
- `APP_SECRET`: stable, cryptographically random 32+ character signing secret; keep the same value across instances/restarts. Generated locally during Atlas integration.
- `ALLOW_OFFLINE_DEMO=false`: live persistence and provider configuration, no silent fixture fallback.
- `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`: server-only dialogue credentials/configuration.
- `ASSEMBLYAI_API_KEY`, `PUBLIC_BASE_URL`: server-only voice access and publicly reachable HTTPS callback origin.

The Windows Node runtime failed SRV/TXT lookup with `ECONNREFUSED` against its local resolver, although Windows resolved the records. The owner switched only the local URI to Atlas's standard `mongodb://` TLS replica-set format, keeping Atlas's TLS, authentication database, and replica-set parameters. No system DNS override or insecure certificate setting was introduced. The reusable driver still accepts SRV URIs; an SRV URI can be used on Vercel if its environment resolves Atlas records correctly. See [MongoDB troubleshooting](https://www.mongodb.com/docs/atlas/troubleshoot-connection/).

## Repeatable verification

```powershell
npm test
npm run test:mongodb
npm run check:services
npm run build
```

`test:mongodb` is explicit opt-in. It writes two synthetic visitors into the configured database, checks initialization/index definitions, transaction rollback, isolated progress, persisted approved/heard turns, request/ack idempotency, and signed-cookie recovery via a fresh client/API instance. A model fixture prevents provider spending. Cleanup deletes only its generated visitor IDs and their associated turns/events; published case packs and real visitors are untouched. The two starts remain counted toward the daily admission cap.

`check:services` checks database initialization, provider authentication, and signing-secret presence; it does not prove live voice or all model behavior. Health/catalog endpoints return HTTP 200 locally with offline mode disabled. The latest browser reload was blocked by browser policy, so visual confirmation of this persistence switch is left to the owner.

## Public deployment still pending

Vercel configuration exists in `vercel.json`, but no public deployment is verified. Before release:

1. Source publication complete: local `main` is pushed to GitHub and tracks `origin/main`; the original remote MIT license/history is preserved by a merge. No force-push or tokens in repository URLs were used.
2. Set server-side secrets on Vercel, including the same stable `APP_SECRET`; do not use a frontend `VITE_` prefix for any secret.
3. Configure final `PUBLIC_BASE_URL` and intentionally scoped Atlas network access for deployment. The current allowlist contains only the owner's single client IP, not Vercel egress. Do not silently permit every address.
4. Tighten `casework_app` from its current cluster-restricted `readWriteAnyDatabase` role to database-specific `readWrite` on `voice_native_mystery`.
5. Verify public visitor isolation, real browser refresh recovery, callback authentication and streaming voice, microphone permissions, interruption, character switching, and cost/capacity handling.

The cached MongoClient and small zero-minimum pool are intended for a low-concurrency serverless demo, not a measured production sizing result. Watch Atlas connection counts and driver checkout failures during public testing; increase capacity only with evidence of pressure. HTTP/provider checks and the integration test do not constitute a load test.
