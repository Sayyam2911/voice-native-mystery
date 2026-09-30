import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { createApp } from '../../server/app.mjs';
import { getStore, MongoStore } from '../../server/store.mjs';

// Opt-in live test: uses the configured database, never an implicit memory fallback.
// It does not call voice/model providers and cleans up only its own visitor records.
test(
  'Atlas persists isolated visitors, approved turns, atomic updates, and restart recovery',
  {
    timeout: 120_000,
  },
  async () => {
    assert.ok(process.env.MONGODB_URI, 'Set MONGODB_URI in ignored .env before this test.');
    assert.ok(process.env.APP_SECRET?.length >= 32, 'Configure a stable signing secret.');
    const store = await getStore();
    assert.equal(store.mode, 'mongodb');
    const ownedSessionIds = [];
    const servers = [];
    let restartedClient;
    const config = { ...process.env, ALLOW_OFFLINE_DEMO: 'false' };
    const model = async () => ({
      mode: 'integration-fixture',
      proposal: {
        type: 'dialogue',
        dialogue: { text: 'We should examine the available evidence.' },
        reveal: { id: null, level: null, condition: { id: null, condition_reached: false } },
        investigation: { id: null },
      },
    });
    async function runtime(repository) {
      const server = createApp({ store: repository, config, model }).listen(0, '127.0.0.1');
      servers.push(server);
      await once(server, 'listening');
      return async (path, body, cookie = '') => {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/${path}`, {
          method: body === undefined ? 'GET' : 'POST',
          headers: { 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }) },
          ...(body !== undefined && { body: JSON.stringify(body) }),
        });
        const data = await response.json();
        return { response, data };
      };
    }
    try {
      const packs = await store.listCases();
      assert.ok(packs.length, 'At least one published case is required.');
      await store.init();
      assert.equal((await store.listCases()).length, packs.length, 'Import must be idempotent.');
      for (const name of ['sessions', 'turns', 'session_events', 'limits']) {
        const indexes = await store.db.collection(name).indexes();
        assert.ok(
          indexes.some((index) => index.key.expiresAt === 1 && index.expireAfterSeconds === 0),
        );
      }

      const request = await runtime(store);
      const starts = await Promise.all([
        request('session', { caseId: packs[0].id }),
        request('session', { caseId: packs[0].id }),
      ]);
      for (const result of starts) {
        if (result.response.status === 201) ownedSessionIds.push(result.data.sessionId);
        assert.equal(result.response.status, 201, 'Concurrent visitor admission must succeed.');
      }
      const [a, b] = starts;
      const cookieA = a.response.headers.get('set-cookie').split(';')[0];
      const cookieB = b.response.headers.get('set-cookie').split(';')[0];
      assert.notEqual(a.data.sessionId, b.data.sessionId);
      assert.ok(a.data.exhibits.length, 'The published case needs an initial inspectable exhibit.');
      const clueId = a.data.exhibits[0].id;
      const inspected = await request('inspect', { clueId }, cookieA);
      assert.equal(inspected.response.status, 200);
      assert.ok(inspected.data.state.knownClueIds.includes(clueId));
      assert.ok(
        !(await request('game', undefined, cookieB)).data.state.knownClueIds.includes(clueId),
      );

      const rollbackId = `integration-rollback:${randomUUID()}`;
      const before = await store.getSession(a.data.sessionId);
      await assert.rejects(
        store.transaction(a.data.sessionId, async (session, ops) => {
          session.state.integrationProbe = true;
          await ops.addEvent({
            _id: rollbackId,
            sessionId: session._id,
            expiresAt: session.expiresAt,
          });
          throw new Error('Intentional integration rollback');
        }),
        /Intentional integration rollback/,
      );
      assert.equal((await store.getSession(a.data.sessionId)).revision, before.revision);
      assert.equal((await store.getSession(a.data.sessionId)).state.integrationProbe, undefined);
      assert.equal(await store.db.collection('session_events').findOne({ _id: rollbackId }), null);

      const body = {
        characterId: a.data.state.selectedCharacterId,
        text: 'What should we examine?',
        requestId: `integration-${randomUUID()}`,
      };
      const reply = await request('turn', body, cookieA);
      assert.equal(reply.response.status, 200);
      assert.equal((await store.getTurns(a.data.sessionId))[0].status, 'approved');
      const retry = await request('turn', body, cookieA);
      assert.equal(retry.data.turnId, reply.data.turnId);
      assert.equal((await store.getTurns(a.data.sessionId)).length, 1);
      const acknowledgement = { turnId: reply.data.turnId, heardText: reply.data.text };
      assert.equal((await request('ack', acknowledgement, cookieA)).response.status, 200);
      assert.equal((await request('ack', acknowledgement, cookieA)).response.status, 200);

      // A fresh client and API instance must recover the same signed-cookie identity.
      // Driver defaults suffice for this short, two-visitor verification client; it is closed below.
      restartedClient = new MongoClient(process.env.MONGODB_URI);
      await restartedClient.connect();
      const restartedStore = new MongoStore(
        restartedClient,
        restartedClient.db(store.db.databaseName),
      );
      const restarted = await runtime(restartedStore);
      const recoveredA = await restarted('game', undefined, cookieA);
      const recoveredB = await restarted('game', undefined, cookieB);
      assert.equal(recoveredA.response.status, 200);
      assert.equal(recoveredA.data.sessionId, a.data.sessionId);
      assert.ok(recoveredA.data.state.knownClueIds.includes(clueId));
      assert.equal(recoveredA.data.turnCount, 1);
      assert.equal((await restartedStore.getTurns(a.data.sessionId))[0].status, 'heard');
      assert.ok(!recoveredB.data.state.knownClueIds.includes(clueId));
      assert.equal(
        (await restarted('game', undefined, 'casework_session=forged')).response.status,
        401,
      );
    } finally {
      for (const server of servers) {
        server.closeAllConnections();
        await new Promise((resolve) => server.close(resolve));
      }
      await restartedClient?.close();
      // Exact IDs generated above: never delete other players or case packs.
      if (ownedSessionIds.length) {
        await store.db.collection('turns').deleteMany({ sessionId: { $in: ownedSessionIds } });
        await store.db
          .collection('session_events')
          .deleteMany({ sessionId: { $in: ownedSessionIds } });
        await store.db.collection('sessions').deleteMany({ _id: { $in: ownedSessionIds } });
      }
      // Admission records remain counted: the smoke test uses two normal demo starts.
      await store.client.close();
    }
  },
);
