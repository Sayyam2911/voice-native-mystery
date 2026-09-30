# Environment and deployment checkpoint

## Local environment

The app runs at `http://localhost:4173` using `npm run dev`. Secrets are read from ignored `.env`; neither the frontend bundle nor architecture documents contain them.

- `MONGODB_URI`: authenticated Atlas URI for `casework-demo`.
- `MONGODB_DB`: `voice_native_mystery`.
- `APP_SECRET`: stable, cryptographically random 32+ character signing secret; keep the same value across instances/restarts. Generated locally during Atlas integration.
- `ALLOW_OFFLINE_DEMO=false`: live persistence and provider configuration, no silent fixture fallback.
- `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`: server-only dialogue credentials/configuration.
- `ASSEMBLYAI_API_KEY`, `PUBLIC_BASE_URL`: server-only voice access and publicly reachable HTTPS callback origin.

### Local voice callback

`PUBLIC_BASE_URL` is the **running application's HTTPS origin**, never its GitHub repository URL and never a path ending in `/api`. For a local voice test, the owner approved a temporary ngrok tunnel to port 4173. Use the current binary bundled at `prototype/voice-agent/tools/ngrok.exe`; the system-installed 3.4.0 binary was rejected by ngrok's minimum-version policy. Request inspection is disabled so the tunnel's local inspector does not archive callback headers or conversations.

```powershell
& .\prototype\voice-agent\tools\ngrok.exe http 4173 --inspect=false
```

Keep it running, copy its HTTPS origin into the ignored `.env`, then restart `npm run dev`. End the old call, refresh the browser, and start a new call so a newly created agent receives the new callback. The app does not silently rewrite configuration or start a public tunnel. Stop the tunnel when local testing ends; it exposes the application publicly and is not the submission deployment.

The September 30 stall had no voice turns reaching the backend: the configured callback pointed at a GitHub repository and returned 404. After the approved tunnel/configuration correction, public health returned 200 and unauthenticated callbacks returned 401; subsequent visitor turns have live-model and delivery metadata. This does not establish subjective voice quality. Before creating an agent, the server now checks that the callback URL is an HTTPS origin returning Casework health, with a five-second timeout and no credentials or visitor data in that probe. It refuses redirects and path-bearing URLs. This catches configuration errors; it is not a cryptographic proof of endpoint ownership.

The Windows Node runtime failed SRV/TXT lookup with `ECONNREFUSED` against its local resolver, although Windows resolved the records. The owner switched only the local URI to Atlas's standard `mongodb://` TLS replica-set format, keeping Atlas's TLS, authentication database, and replica-set parameters. No system DNS override or insecure certificate setting was introduced. The reusable driver still accepts SRV URIs; an SRV URI can be used on Vercel if its environment resolves Atlas records correctly. See [MongoDB troubleshooting](https://www.mongodb.com/docs/atlas/troubleshoot-connection/).

## Repeatable verification

```powershell
npm test
npm run test:mongodb
npm run check:services
npm run build
```

`test:mongodb` is explicit opt-in. It writes two synthetic visitors into the configured database, checks initialization/index definitions, transaction rollback, isolated progress, persisted approved/heard turns, request/ack idempotency, and signed-cookie recovery via a fresh client/API instance. A model fixture prevents provider spending. Cleanup deletes only its generated visitor IDs and their associated turns/events; published case packs and real visitors are untouched. The two starts remain counted toward the daily admission cap.

`check:services` checks database initialization, provider authentication, signing-secret presence, and callback health; it does not prove live voice or all model behavior. Health/catalog endpoints return HTTP 200 locally with offline mode disabled. The latest browser reload was blocked by browser policy, so visual confirmation is left to the owner.

## Public deployment still pending

Vercel configuration exists in `vercel.json`, but no public deployment is verified. Before release:

1. Source publication complete: local `main` is pushed to GitHub and tracks `origin/main`; the original remote MIT license/history is preserved by a merge. No force-push or tokens in repository URLs were used.
2. Set server-side secrets on Vercel, including the same stable `APP_SECRET`; do not use a frontend `VITE_` prefix for any secret.
3. Configure final `PUBLIC_BASE_URL` and intentionally scoped Atlas network access for deployment. The current allowlist contains only the owner's single client IP, not Vercel egress. Do not silently permit every address.
4. Tighten `casework_app` from its current cluster-restricted `readWriteAnyDatabase` role to database-specific `readWrite` on `voice_native_mystery`.
5. Verify public visitor isolation, real browser refresh recovery, callback authentication and streaming voice, microphone permissions, interruption, character switching, and cost/capacity handling.

The cached MongoClient and small zero-minimum pool are intended for a low-concurrency serverless demo, not a measured production sizing result. Watch Atlas connection counts and driver checkout failures during public testing; increase capacity only with evidence of pressure. HTTP/provider checks and the integration test do not constitute a load test.
