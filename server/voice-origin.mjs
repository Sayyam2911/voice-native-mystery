import { HttpError } from './errors.mjs';

const message =
  'PUBLIC_BASE_URL must be the reachable HTTPS origin of this running Casework backend, not a GitHub repository. Start the local tunnel or check the deployment, then restart the app.';

// Probe without any credentials or visitor data before giving the voice provider a callback.
export async function validateVoiceOrigin(value, fetcher = fetch) {
  let origin;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      throw new Error('Not an HTTPS origin');
    origin = url.origin;
    const response = await fetcher(`${origin}/api/health`, {
      redirect: 'error',
      headers: { Accept: 'application/json', 'ngrok-skip-browser-warning': 'true' },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok || (await response.json()).name !== 'Casework')
      throw new Error('Casework health check failed');
  } catch {
    throw new HttpError(503, message, 'voice_callback_unreachable');
  }
  return origin;
}
