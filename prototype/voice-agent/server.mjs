import { createServer as createHttpServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { timingSafeEqual } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const publicFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/pcm-processor.js', ['pcm-processor.js', 'text/javascript; charset=utf-8']],
]);

function sameSecret(actual, expected) {
  const a = Buffer.from(actual || '');
  const b = Buffer.from(expected || '');
  return b.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

function sendJson(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 32_768) {
      const error = new Error('Request body is too large');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('Invalid JSON');
    error.status = 400;
    throw error;
  }
}

// A deterministic case fixture deliberately substitutes for a real model. It
// tests AssemblyAI's custom-LLM protocol without deciding our LLM provider.
export function fixtureReply(model, messages) {
  const lastUser = [...messages].reverse().find((message) => message?.role === 'user');
  const content = typeof lastUser?.content === 'string' ? lastUser.content.toLowerCase() : '';
  if (model === 'mystery-poc-witness') {
    if (/door|entrance|key/.test(content)) return 'I heard the west door close at nine ten, but I did not see who used it.';
    if (/who|culprit|killer|murder/.test(content)) return 'I did not see who caused the death. I cannot name a culprit.';
    return 'I was in the hall. I heard a door close, but I saw no one enter.';
  }
  if (model === 'mystery-poc-detective') {
    if (/door|entrance|key/.test(content)) return 'The record says the west door was locked at nine. We should find out who had a key.';
    if (/who|culprit|killer|murder/.test(content)) return 'We do not have enough evidence to name anyone yet. Let us check the door and the timeline.';
    return 'Let us compare what the witness heard with the door record before drawing a conclusion.';
  }
  return null;
}

function completionChunk(model, delta, finishReason = null) {
  return {
    id: 'chatcmpl-mystery-poc',
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  };
}

export function createPrototypeServer(config = process.env) {
  const tokenTimes = new Map();
  const key = config.ASSEMBLYAI_API_KEY || '';
  const pin = config.VOICE_POC_PIN || '';
  const sharedSecret = config.VOICE_POC_SHARED_SECRET || '';
  const agents = {
    witness: config.VOICE_POC_WITNESS_AGENT_ID || '',
    detective: config.VOICE_POC_DETECTIVE_AGENT_ID || '',
  };
  const configured = Boolean(key && pin && sharedSecret &&
    /^[A-Za-z0-9_-]{12,}$/.test(agents.witness) &&
    /^[A-Za-z0-9_-]{12,}$/.test(agents.detective) &&
    agents.witness !== agents.detective);

  return createHttpServer(async (request, response) => {
    const url = new URL(request.url || '/', 'http://localhost');
    try {
      if (request.method === 'GET' && publicFiles.has(url.pathname)) {
        const [filename, contentType] = publicFiles.get(url.pathname);
        const body = await readFile(join(here, 'public', filename));
        response.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        response.end(body);
        return;
      }
      if (request.method === 'GET' && url.pathname === '/api/config') {
        sendJson(response, 200, { ready: configured, agents });
        return;
      }
      if (request.method === 'POST' && url.pathname === '/api/voice-token') {
        if (!configured) {
          sendJson(response, 503, { error: 'Prototype credentials and agent IDs are not configured' });
          return;
        }
        if (!sameSecret(request.headers['x-demo-pin'], pin)) {
          sendJson(response, 403, { error: 'Invalid demo PIN' });
          return;
        }
        const ip = request.socket.remoteAddress || 'unknown';
        const now = Date.now();
        const times = (tokenTimes.get(ip) || []).filter((time) => now - time < 5 * 60_000);
        if (times.length >= 8) {
          sendJson(response, 429, { error: 'Demo token limit reached; retry in five minutes' });
          return;
        }
        times.push(now);
        tokenTimes.set(ip, times);
        const tokenUrl = new URL('https://agents.assemblyai.com/v1/token');
        tokenUrl.searchParams.set('expires_in_seconds', '60');
        tokenUrl.searchParams.set('max_session_duration_seconds', '300');
        const upstream = await fetch(tokenUrl, { headers: { Authorization: `Bearer ${key}` } });
        if (!upstream.ok) {
          sendJson(response, 502, { error: `AssemblyAI token request failed (${upstream.status})` });
          return;
        }
        const data = await upstream.json();
        sendJson(response, 200, { token: data.token });
        return;
      }
      if (request.method === 'POST' && url.pathname === '/v1/chat/completions') {
        const bearer = /^Bearer\s+(.+)$/i.exec(request.headers.authorization || '')?.[1];
        if (!sharedSecret || !sameSecret(bearer, sharedSecret)) {
          sendJson(response, 401, { error: { message: 'Unauthorized', type: 'authentication_error' } });
          return;
        }
        const body = await readJson(request);
        const model = body?.model;
        const reply = fixtureReply(model, Array.isArray(body?.messages) ? body.messages : []);
        if (!reply) {
          sendJson(response, 400, { error: { message: 'Unknown test character', type: 'invalid_request_error' } });
          return;
        }
        if (body.stream !== true) {
          sendJson(response, 200, {
            id: 'chatcmpl-mystery-poc', object: 'chat.completion', created: Math.floor(Date.now() / 1000), model,
            choices: [{ index: 0, message: { role: 'assistant', content: reply }, finish_reason: 'stop' }],
          });
          return;
        }
        response.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        });
        response.write(`data: ${JSON.stringify(completionChunk(model, { role: 'assistant' }))}\n\n`);
        response.write(`data: ${JSON.stringify(completionChunk(model, { content: reply }))}\n\n`);
        response.write(`data: ${JSON.stringify(completionChunk(model, {}, 'stop'))}\n\n`);
        response.end('data: [DONE]\n\n');
        return;
      }
      sendJson(response, 404, { error: 'Not found' });
    } catch (error) {
      sendJson(response, error.status || 500, { error: error.status ? error.message : 'Internal server error' });
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const port = Number(process.env.PORT || 4173);
  createPrototypeServer().listen(port, '127.0.0.1', () => {
    console.log(`Voice prototype: http://localhost:${port}`);
    console.log('This is a local protocol test, not the public game.');
  });
}
