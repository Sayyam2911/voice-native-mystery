import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../server/app.mjs';
import { MemoryStore } from '../server/store.mjs';

async function withApi(callback, overrides = {}) {
  const app = createApp({
    store: new MemoryStore(),
    config: {
      APP_SECRET: 'test-only-secret-with-at-least-32-characters',
      ALLOW_OFFLINE_DEMO: 'true',
      MAX_DAILY_SESSIONS: 100,
      ...overrides,
    },
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api/`;
  async function request(path, body, cookie = '', headers = {}) {
    return fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie && { Cookie: cookie }),
        ...headers,
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
  }
  try {
    await callback(request);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

test('API catalog excludes locked content; anonymous cookies recover isolated progress', async () =>
  withApi(async (request) => {
    const catalog = await (await request('cases')).json();
    assert.ok(catalog.cases.length > 0);
    assert.equal(catalog.cases[0].resolution, undefined);
    assert.equal(catalog.cases[0].clues, undefined);
    assert.equal((await request('game')).status, 401);
    const startA = await request('session', { caseId: catalog.cases[0].id });
    assert.equal(startA.status, 201);
    assert.match(startA.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/);
    const cookieA = startA.headers.get('set-cookie').split(';')[0];
    const a = await startA.json();
    const startB = await request('session', { caseId: catalog.cases[0].id });
    const cookieB = startB.headers.get('set-cookie').split(';')[0];
    assert.notEqual(a.sessionId, (await startB.json()).sessionId);
    await request('inspect', { clueId: a.exhibits[0].id }, cookieA);
    const recoveredA = await (await request('game', undefined, cookieA)).json();
    const recoveredB = await (await request('game', undefined, cookieB)).json();
    assert.equal(recoveredA.clues.length, 1);
    assert.equal(recoveredB.clues.length, 0);
    assert.equal((await request('game', undefined, 'casework_session=forged')).status, 401);
  }));

test('text API stores approved replies before delivery acknowledgement and de-duplicates retries', async () =>
  withApi(async (request) => {
    const start = await request('session', { caseId: 'grange-house' });
    const cookie = start.headers.get('set-cookie').split(';')[0];
    await request('inspect', { clueId: 'E2' }, cookie);
    await request('select', { characterId: 'tessa' }, cookie);
    const body = { characterId: 'tessa', text: 'When did you enter?', requestId: 'api-one' };
    const reply = await (await request('turn', body, cookie)).json();
    assert.ok(!reply.game.state.knownClueIds.includes('E8'));
    const retry = await (await request('turn', body, cookie)).json();
    assert.equal(reply.turnId, retry.turnId);
    const ack = await (
      await request('ack', { turnId: reply.turnId, heardText: reply.text }, cookie)
    ).json();
    assert.ok(ack.state.knownClueIds.includes('E8'));
    assert.equal(ack.turnCount, 1);
  }));

test('cross-origin writes, unauthenticated voice callbacks, and invalid bodies are rejected', async () =>
  withApi(async (request) => {
    assert.equal(
      (await request('session', { caseId: 'grange-house' }, '', { Origin: 'https://evil.example' }))
        .status,
      403,
    );
    assert.equal((await request('voice/forged/v1/chat/completions', { messages: [] })).status, 401);
    assert.equal((await request('session', [])).status, 400);
  }));

test('production never silently falls back to the in-memory store', async () => {
  const app = createApp({
    config: {
      VERCEL: '1',
      ALLOW_OFFLINE_DEMO: 'true',
      APP_SECRET: 'test-only-secret-with-at-least-32-characters',
    },
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId: 'grange-house' }),
    });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'database_unconfigured');
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
