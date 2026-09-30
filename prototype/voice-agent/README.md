# AssemblyAI named-voice proof of concept

This is a disposable integration slice, **not the game**. It tests two named voices (`anna` and `charles`), character switching, interruption, browser audio, and AssemblyAI's custom-LLM callback. The callback deliberately returns fixed test lines instead of calling a paid LLM. It therefore tests the protocol and speech path, not generative dialogue quality or the first case's proof rules.

## Local checks

Requires Node 20+ and Chrome or Edge. No npm install is needed.

```powershell
cd 'C:\Users\Sayyam Jain\Desktop\voice-native-mystery\prototype\voice-agent'
npm test
npm start
```

Open `http://localhost:4173`. Until credentials and agent IDs are configured, the page correctly reports that it is not ready.

## Live voice check

Do not paste API keys into chat, commit them, or put them in browser code. The backend mints [single-use browser tokens](https://www.assemblyai.com/docs/voice-agents/voice-agent-api/browser-integration). Run this only for a short supervised test; the public tunnel can reach this development server, so use a strong demo PIN and stop the tunnel afterward.

From PowerShell 7, run `./run-smoke-test.ps1` in this directory. It prompts for the AssemblyAI API key and a demo PIN without echoing them, generates a callback secret in memory, starts the local server and an ngrok HTTPS tunnel, and [creates or updates two stored agents](https://www.assemblyai.com/docs/voice-agents/voice-agent-api/manage-agents). The script uses the project-local ngrok 3.39.11 executable because the system-installed 3.4.0 is rejected by the account. It stops the local server and tunnel when you press Enter at the end. Existing agents with the exact prototype names are reused and pointed at the fresh temporary tunnel; any stored agents remain in your account afterward.

Open `http://localhost:4173` in Chrome or Edge, enter the PIN, select the witness, ask about the west door, interrupt a spoken answer, then switch to the detective. Note first-audio timings, whether interrupted audio stops promptly, whether the voices differ, and credit usage in your AssemblyAI dashboard. Press **Stop** in the browser before ending the script. Each session is capped at five minutes, and switching or pressing Stop sends `session.end` to avoid an unnecessary billable resume grace period.

The callback uses a public HTTPS tunnel because AssemblyAI's [custom LLM endpoint must be public HTTPS and stream chat completions](https://www.assemblyai.com/docs/voice-agents/voice-agent-api/connect-your-own-llm). The tunnel exposes this prototype server; keep the PIN private and stop the script promptly afterward.

For the initial test, the UI is limited to Chromium because it forces a 24 kHz `AudioContext`. AssemblyAI's [browser guide](https://www.assemblyai.com/docs/voice-agents/voice-agent-api/browser-integration) requires explicit resampling for Firefox and Safari; broader browser support belongs in the actual app.

## Pass criteria

- Two distinct voices work and switching starts a new selected-character session.
- AssemblyAI calls this server's authenticated `/v1/chat/completions` endpoint and speaks its fixed reply.
- Barge-in stops queued audio, with an interrupted transcript recorded.
- Five-minute testing consumes only the intended grant credits and no payment is required.
- Latency is acceptable for a conversational game; record actual timings rather than assuming.

The prototype does not establish that all generated free-form speech can be validated before playback. That remains an explicit architecture risk.
