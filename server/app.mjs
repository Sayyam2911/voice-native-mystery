import express from 'express';
import { catalogProjection, authoredCases } from './cases.mjs';
import { getStore } from './store.mjs';
import { GameService } from './game.mjs';
import { VoiceService, streamCompletion } from './voice.mjs';
import { appSecret, sameSecret, sessionId, setSessionCookie } from './security.mjs';
import { HttpError, requireThat } from './errors.mjs';

export function createApp({ config = process.env, store: injectedStore, model } = {}) {
  const app = express();
  app.disable('x-powered-by');
  let services;
  async function getServices() {
    if (services) return services;
    const store = injectedStore || (await getStore(config));
    const secret = appSecret(config);
    const game = new GameService(store, config, model);
    return (services = {
      store,
      game,
      voice: new VoiceService(store, game, config, secret),
      secret,
    });
  }
  app.use('/api', (req, res, next) => {
    res.set({
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
    });
    next();
  });
  app.post(
    '/api/voice/:binding/v1/chat/completions',
    async (req, res, next) => {
      try {
        const { voice } = await getServices();
        const bearer = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '')?.[1];
        requireThat(sameSecret(bearer, voice.callbackKey), 401, 'Unauthorized voice callback.');
        next();
      } catch (e) {
        next(e);
      }
    },
    express.json({ limit: '512kb' }),
    async (req, res, next) => {
      try {
        const { voice } = await getServices();
        const turn = await voice.completion(req.params.binding, req.body);
        if (req.body.stream === false)
          return res.json({
            id: `chatcmpl-${turn._id}`,
            object: 'chat.completion',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: turn.approvedReply.text },
                finish_reason: 'stop',
              },
            ],
          });
        streamCompletion(res, turn);
      } catch (e) {
        next(e);
      }
    },
  );
  app.use('/api', express.json({ limit: '32kb' }));
  app.use('/api', (req, res, next) => {
    if (
      req.method === 'POST' &&
      (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))
    )
      return next(new HttpError(400, 'A JSON request body is required.'));
    next();
  });
  app.use('/api', (req, res, next) => {
    if (req.method !== 'GET' && req.headers.origin) {
      const expected = config.PUBLIC_BASE_URL?.replace(/\/$/, '');
      const origin = req.headers.origin;
      const localOrigin = `${req.protocol}://${req.headers.host}`;
      if (origin !== expected && origin !== localOrigin)
        return next(new HttpError(403, 'Request origin is not allowed.'));
    }
    next();
  });
  app.get('/api/health', (req, res) =>
    res.json({
      name: 'Casework',
      databaseConfigured: Boolean(config.MONGODB_URI),
      dialogueConfigured: Boolean(config.LLM_API_KEY),
      voiceConfigured: Boolean(config.ASSEMBLYAI_API_KEY && config.PUBLIC_BASE_URL),
      offline: config.ALLOW_OFFLINE_DEMO === 'true' && !config.VERCEL,
    }),
  );
  app.get('/api/cases', async (req, res, next) => {
    try {
      const cases =
        config.MONGODB_URI || injectedStore
          ? await (await getServices()).store.listCases()
          : authoredCases;
      const latest = new Map();
      for (const c of cases)
        if (!latest.has(c.id) || c.version > latest.get(c.id).version) latest.set(c.id, c);
      res.json({ cases: [...latest.values()].map(catalogProjection) });
    } catch (e) {
      next(e);
    }
  });
  app.post('/api/session', async (req, res, next) => {
    try {
      const { game, secret } = await getServices();
      const s = await game.start(req.body.caseId);
      setSessionCookie(res, s._id, secret, Boolean(config.VERCEL) || req.secure);
      res.status(201).json(await game.projection(s._id));
    } catch (e) {
      next(e);
    }
  });
  const authorized = (fn) => async (req, res, next) => {
    try {
      const s = await getServices();
      const sid = sessionId(req, s.secret);
      await s.game.session(sid);
      const result = await fn(req, s, sid);
      if (!res.headersSent) res.json(result || { ok: true });
    } catch (e) {
      next(e);
    }
  };
  app.get(
    '/api/game',
    authorized((req, { game }, sid) => game.projection(sid)),
  );
  app.post(
    '/api/select',
    authorized((req, { game }, sid) => game.select(sid, req.body.characterId)),
  );
  app.post(
    '/api/inspect',
    authorized((req, { game }, sid) => game.inspect(sid, req.body.clueId)),
  );
  app.post(
    '/api/investigate',
    authorized((req, { game }, sid) => game.investigate(sid, req.body.leadId)),
  );
  app.post(
    '/api/alert-seen',
    authorized((req, { game }, sid) => game.alertSeen(sid)),
  );
  app.post(
    '/api/accuse',
    authorized((req, { game }, sid) => {
      requireThat(
        Array.isArray(req.body.evidenceIds) && req.body.evidenceIds.length <= 30,
        400,
        'Select evidence for the reconstruction.',
      );
      return game.accuse(sid, req.body.culpritId, req.body.evidenceIds);
    }),
  );
  app.post(
    '/api/turn',
    authorized(async (req, { game }, sid) => {
      const turn = await game.generateTurn(sid, req.body.characterId, req.body.text, {
        requestId:
          typeof req.body.requestId === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(req.body.requestId)
            ? req.body.requestId
            : undefined,
      });
      return {
        turnId: turn._id,
        text: turn.approvedReply.text,
        warning: turn.warning,
        game: await game.projection(sid),
      };
    }),
  );
  app.post(
    '/api/ack',
    authorized((req, { game }, sid) =>
      game.acknowledge(sid, req.body.turnId, req.body.heardText, Boolean(req.body.interrupted)),
    ),
  );
  app.post(
    '/api/voice/start',
    authorized((req, { voice }, sid) => voice.start(sid, req.body.characterId)),
  );
  app.post(
    '/api/voice/stop',
    authorized(async (req, { voice }, sid) => {
      await voice.stop(sid);
      return { ok: true };
    }),
  );
  app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.status || 500;
    if (status >= 500) console.error('Request failed:', error.code || error.name || 'unknown');
    res.status(status).json({
      error:
        status < 500 || error instanceof HttpError
          ? error.message
          : 'The service is temporarily unavailable. Please try again.',
      code: error.code || 'request_failed',
    });
  });
  return app;
}
