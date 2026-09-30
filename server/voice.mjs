import { randomUUID, createHmac, createHash } from 'node:crypto';
import { sign, verify } from './security.mjs';
import { HttpError, requireThat } from './errors.mjs';

export class VoiceService {
  constructor(store, game, config, secret) {
    this.store = store;
    this.game = game;
    this.config = config;
    this.secret = secret;
  }
  get callbackKey() {
    return createHmac('sha256', this.secret).update('assemblyai-callback').digest('hex');
  }
  async request(path, options = {}) {
    requireThat(
      this.config.ASSEMBLYAI_API_KEY,
      503,
      'Add ASSEMBLYAI_API_KEY to enable named voices.',
    );
    const res = await fetch(`https://agents.assemblyai.com/v1${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.ASSEMBLYAI_API_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok)
      throw new HttpError(
        502,
        `Voice provider request failed (${res.status}). Please retry the call shortly; the case board remains available.`,
        'voice_provider_error',
      );
    return res.status === 204 ? null : res.json();
  }
  async stop(sid) {
    const s = await this.game.session(sid);
    const lease = s.activeVoice;
    if (!lease) return;
    await this.store.transaction(sid, async (s) => {
      if (s.activeVoice?.id !== lease.id) return;
      s.voiceSeconds +=
        (Math.min(Date.now(), new Date(lease.expiresAt).getTime()) -
          new Date(lease.startedAt).getTime()) /
        1000;
      s.activeVoice = null;
    });
    await this.store.releaseVoiceSlot(lease.id);
    if (lease.agentId)
      try {
        await this.request(`/agents/${encodeURIComponent(lease.agentId)}`, { method: 'DELETE' });
      } catch {
        /* Session has ended client-side; expired agents can be cleaned up separately. */
      }
  }
  async start(sid, cid) {
    const origin = this.config.PUBLIC_BASE_URL?.replace(/\/$/, '');
    requireThat(
      origin && /^https:\/\//.test(origin),
      503,
      'A public HTTPS callback URL is required for live voice. The case board remains available.',
    );
    requireThat(
      this.config.LLM_API_KEY,
      503,
      'Configure the dialogue model before starting live voice.',
    );
    await this.stop(sid);
    const s = await this.game.session(sid),
      pack = await this.store.getCase(s.caseId, s.caseVersion);
    requireThat(
      s.state.status === 'active' && s.state.selectedCharacterId === cid,
      409,
      'Select an available character first.',
    );
    const character = pack.characters.find((x) => x.id === cid);
    const remaining = Math.floor(1800 - (s.voiceSeconds || 0));
    requireThat(
      remaining > 10,
      429,
      'This case has used its 30-minute voice allowance. You can still inspect the board and submit a reconstruction.',
    );
    const duration = Math.min(600, remaining),
      id = randomUUID(),
      expiresAt = new Date(Date.now() + duration * 1000);
    await this.store.reserveVoiceSlot(
      id,
      expiresAt,
      Number(this.config.MAX_ACTIVE_VOICE_SESSIONS || 5),
    );
    let agent;
    try {
      const binding = sign({ sid, cid, lid: id, exp: expiresAt.getTime() }, this.secret);
      agent = await this.request('/agents', {
        method: 'POST',
        body: JSON.stringify({
          name: `Casework ${sid.slice(0, 8)} ${character.name}`,
          system_prompt:
            'Return only the reply provided by the custom game endpoint. The game endpoint controls all facts. Keep turns short.',
          voice: { voice_id: character.voice },
          input: {
            turn_detection: { interrupt_response: true, min_silence: 700, max_silence: 2200 },
          },
          llm: [
            {
              base_url: `${origin}/api/voice/${binding}/v1`,
              model: 'casework',
              api_key: this.callbackKey,
            },
          ],
        }),
      });
      requireThat(agent?.id, 502, 'Voice provider did not return an agent ID.');
      const lease = { id, agentId: agent.id, characterId: cid, startedAt: new Date(), expiresAt };
      await this.store.transaction(sid, async (s) => {
        s.activeVoice = lease;
      });
      const token = await this.request(
        `/token?expires_in_seconds=60&max_session_duration_seconds=${duration}`,
      );
      return {
        token: token.token,
        agentId: agent.id,
        leaseId: id,
        expiresAt,
        durationSeconds: duration,
      };
    } catch (error) {
      await this.store.transaction(sid, async (session) => {
        if (session.activeVoice?.id === id) session.activeVoice = null;
      });
      await this.store.releaseVoiceSlot(id);
      if (agent?.id)
        try {
          await this.request(`/agents/${agent.id}`, { method: 'DELETE' });
        } catch {}
      throw error;
    }
  }
  async completion(binding, body) {
    const identity = verify(binding, this.secret);
    requireThat(identity?.sid && identity?.lid, 403, 'Invalid voice binding.');
    const session = await this.game.session(identity.sid);
    requireThat(
      session.activeVoice?.id === identity.lid &&
        new Date(session.activeVoice.expiresAt) > new Date() &&
        session.state.selectedCharacterId === identity.cid,
      403,
      'Voice session is no longer active.',
    );
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const user = [...messages].reverse().find((x) => x?.role === 'user');
    let text = typeof user?.content === 'string' ? user.content : '';
    if (!text.trim()) text = 'Please briefly introduce your role in this investigation.';
    const requestId = createHash('sha256')
      .update(`${identity.lid}:${messages.length}:${text}`)
      .digest('hex')
      .slice(0, 32);
    return this.game.generateTurn(identity.sid, identity.cid, text, {
      requestId,
      channel: 'voice',
      leaseId: identity.lid,
    });
  }
}

export function streamCompletion(res, turn) {
  const chunk = (delta, finish = null) => ({
    id: `chatcmpl-${turn._id}`,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'casework',
    choices: [{ index: 0, delta, finish_reason: finish }],
  });
  res.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
  });
  res.write(`data: ${JSON.stringify(chunk({ role: 'assistant' }))}\n\n`);
  for (const s of turn.approvedReply.segments)
    res.write(`data: ${JSON.stringify(chunk({ content: s.text + ' ' }))}\n\n`);
  res.write(`data: ${JSON.stringify(chunk({}, 'stop'))}\n\n`);
  res.end('data: [DONE]\n\n');
}
