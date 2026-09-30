import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { VoiceClient } from '../lib/voice-client';
import { normalizeSpeech } from '../../shared/speech.mjs';

const idle = { status: 'idle', caption: '' };

export function useVoice({ applyGame, setError }) {
  const [voice, setVoice] = useState(idle);
  const clientRef = useRef(null);
  const generation = useRef(0);
  const claimedTurns = useRef(new Set());
  const stop = useCallback(async () => {
    generation.current++;
    clientRef.current?.stop();
    clientRef.current = null;
    setVoice(idle);
    await api('voice/stop', {}).catch(() => {});
  }, []);

  const start = useCallback(
    async (characterId) => {
      await stop();
      const attempt = ++generation.current;
      setVoice({ status: 'connecting', caption: '' });
      setError('');
      try {
        const credentials = await api('voice/start', { characterId });
        if (attempt !== generation.current) return;
        const client = new VoiceClient({
          onState: (state) => attempt === generation.current && setVoice(state),
          onError: (message) => {
            if (attempt === generation.current) {
              setError(message);
              void stop();
            }
          },
          onClose: () => {
            if (attempt === generation.current) void stop();
          },
          onHeard: async ({ text, interrupted, leaseId }) => {
            const game = await api('game');
            const heard = normalizeSpeech(text);
            const turn = [...game.turns].reverse().find((turn) => {
              const approved = normalizeSpeech(turn.reply?.text);
              return (
                turn.voiceLeaseId === leaseId &&
                !claimedTurns.current.has(turn.id) &&
                turn.reply &&
                (interrupted
                  ? !heard || approved === heard || approved.startsWith(`${heard} `)
                  : approved === heard)
              );
            });
            if (turn) {
              claimedTurns.current.add(turn.id);
              try {
                applyGame(await api('ack', { turnId: turn.id, heardText: text, interrupted }));
              } catch (error) {
                claimedTurns.current.delete(turn.id);
                throw error;
              }
            } else {
              applyGame(game);
              if (!interrupted)
                setError(
                  'The spoken reply could not be matched to approved text. No new clue was unlocked; please ask again.',
                );
            }
          },
        });
        clientRef.current = client;
        await client.connect(credentials);
      } catch (error) {
        if (attempt === generation.current) {
          setError(error.message);
          await stop();
        }
      }
    },
    [applyGame, setError, stop],
  );

  useEffect(() => {
    const end = () => {
      clientRef.current?.stop();
      navigator.sendBeacon('/api/voice/stop', new Blob(['{}'], { type: 'application/json' }));
    };
    window.addEventListener('pagehide', end);
    return () => {
      window.removeEventListener('pagehide', end);
      clientRef.current?.stop();
    };
  }, []);
  return { voice, start, stop };
}
