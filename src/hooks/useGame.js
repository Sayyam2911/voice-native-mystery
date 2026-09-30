import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

export function useGame() {
  const [game, setGame] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const actionLock = useRef(false);
  const applyGame = useCallback((next) => {
    setGame((current) =>
      current && current.sessionId === next.sessionId && current.revision > next.revision
        ? current
        : next,
    );
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      api('cases'),
      api('health'),
      api('game').catch((e) => {
        if ([401, 404, 410, 503].includes(e.status)) return null;
        throw e;
      }),
    ])
      .then(([catalog, health, recovered]) => {
        if (!active) return;
        setCatalog(catalog.cases);
        setHealth(health);
        if (recovered) applyGame(recovered);
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [applyGame]);

  const refresh = useCallback(async () => {
    const next = await api('game');
    applyGame(next);
    return next;
  }, [applyGame]);

  const action = useCallback(
    async (path, body) => {
      if (actionLock.current) return null;
      actionLock.current = true;
      setBusy(true);
      setError('');
      try {
        const result = await api(path, body);
        if (result.case) applyGame(result);
        return result;
      } catch (e) {
        setError(e.message);
        return null;
      } finally {
        actionLock.current = false;
        setBusy(false);
      }
    },
    [applyGame],
  );

  const ask = useCallback(
    async (characterId, text) => {
      if (actionLock.current) return false;
      actionLock.current = true;
      setBusy(true);
      setError('');
      try {
        const reply = await api('turn', { characterId, text, requestId: crypto.randomUUID() });
        // Text delivery is rendered before acknowledgement; voice uses actual playback completion.
        applyGame(reply.game);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        applyGame(await api('ack', { turnId: reply.turnId, heardText: reply.text }));
        return true;
      } catch (e) {
        setError(e.message);
        return false;
      } finally {
        actionLock.current = false;
        setBusy(false);
      }
    },
    [applyGame],
  );

  return { game, catalog, health, loading, busy, error, action, ask, refresh, applyGame, setError };
}
