import { useEffect, useRef, useState } from 'react';
import {
  AudioLines,
  ChevronDown,
  Headphones,
  LoaderCircle,
  Mic,
  Phone,
  PhoneOff,
} from 'lucide-react';

const callStates = {
  idle: { label: 'Ready when you are', detail: 'Start the call, then ask your question out loud.' },
  connecting: {
    label: 'Connecting the call',
    detail: 'Allow microphone access if your browser asks.',
  },
  listening: { label: 'Your turn', detail: 'The microphone is live. Speak naturally.' },
  thinking: { label: 'Considering your question', detail: 'Your contact is preparing a reply.' },
  speaking: { label: 'Speaking', detail: 'You can interrupt—just start talking.' },
};

export function InterviewPanel({
  character,
  game,
  busy,
  voice,
  voiceAvailable = true,
  onStartVoice,
  onStopVoice,
}) {
  const [elapsed, setElapsed] = useState(0);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const transcriptRef = useRef(null);
  const turns = game.turns.filter(
    (turn) => turn.characterId === character.id && turn.channel === 'voice',
  );
  const live = voice.status !== 'idle';
  const connecting = voice.status === 'connecting';
  const connected = live && !connecting;
  const active = game.state.status === 'active';
  const partner = character.id === game.case.partnerId;
  const state = callStates[voice.status] || callStates.idle;
  const observations = game.clues.filter((clue) => clue.characters?.includes(character.id));

  useEffect(() => {
    if (!connected) {
      setElapsed(0);
      return;
    }
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [connected]);
  useEffect(() => {
    if (transcriptOpen)
      transcriptRef.current?.scrollTo({
        top: transcriptRef.current.scrollHeight,
        behavior: 'smooth',
      });
  }, [game.turns, transcriptOpen]);
  useEffect(() => setTranscriptOpen(false), [character.id]);

  return (
    <section
      className={`interview-panel voice-interview is-${voice.status}`}
      aria-labelledby="interview-title"
    >
      <div className="call-heading">
        <p className="eyebrow">{partner ? 'PRIVATE PARTNER LINE' : 'VOICE INTERVIEW'}</p>
        <span className={`call-connection ${connected ? 'connected' : ''}`}>
          <span aria-hidden="true" />
          {connected ? 'CONNECTED' : connecting ? 'CONNECTING' : 'LINE STANDBY'}
        </span>
      </div>
      <div className="call-stage">
        <div className="call-portrait">
          {character.avatar ? (
            <img src={character.avatar} alt={`Fictional portrait of ${character.name}`} />
          ) : (
            <span>{character.initials || '?'}</span>
          )}
          <span className="call-portrait-badge" aria-hidden="true">
            <Headphones size={19} />
          </span>
        </div>
        <h2 id="interview-title">{character.name}</h2>
        <p className="call-role">{character.role}</p>
        <div className={`call-activity ${voice.status}`} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="call-state" role="status">
          <strong>
            {!active
              ? 'Investigation complete'
              : !voiceAvailable
                ? 'Voice is unavailable'
                : state.label}
          </strong>
          <p>
            {!active
              ? 'Your previous call transcripts are available below.'
              : !voiceAvailable
                ? 'The voice and dialogue services must be connected to make a call.'
                : state.detail}
          </p>
        </div>
        {connected && (
          <span className="call-timer" aria-label="Elapsed call time">
            {String(Math.floor(elapsed / 60)).padStart(2, '0')}:
            {String(elapsed % 60).padStart(2, '0')}
          </span>
        )}
        {active && (
          <button
            className={`call-button ${live ? 'end-call' : 'start-call'}`}
            onClick={live ? onStopVoice : onStartVoice}
            disabled={connecting || (!live && (busy || !voiceAvailable))}
          >
            {connecting ? (
              <LoaderCircle className="call-spinner" size={21} />
            ) : live ? (
              <PhoneOff size={21} />
            ) : (
              <Phone size={21} />
            )}
            {connecting
              ? 'Connecting…'
              : live
                ? 'End call'
                : partner
                  ? 'Call your partner'
                  : 'Start voice interview'}
          </button>
        )}
        <p className="call-privacy">
          <Mic size={12} aria-hidden="true" />
          {connected
            ? 'Microphone connected · headphones recommended'
            : connecting
              ? 'Waiting for the voice connection'
              : 'Your microphone stays off until you start the call.'}
        </p>
        <p className="call-audio-note">The app keeps a transcript, not an audio recording.</p>
      </div>
      {live && voice.caption && (
        <div className="call-caption" aria-live="polite">
          <AudioLines size={14} aria-hidden="true" />
          <p>{voice.caption}</p>
        </div>
      )}
      <div className="call-reference">
        {active && character.topics?.length > 0 && (
          <details className="call-topics">
            <summary>
              Questions to consider <ChevronDown size={14} aria-hidden="true" />
            </summary>
            <p>Ask in your own words during the call.</p>
            <ul>
              {character.topics.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
          </details>
        )}
        {observations.length > 0 && (
          <details className="call-observations">
            <summary>
              Known observations <span>{observations.length}</span>
              <ChevronDown size={14} aria-hidden="true" />
            </summary>
            <ul>
              {observations.map((clue) => (
                <li key={clue.id}>
                  <strong>{clue.title}</strong>
                  <p>{clue.body}</p>
                  <small>{clue.source}</small>
                </li>
              ))}
            </ul>
          </details>
        )}
        <details
          className="call-transcript"
          open={transcriptOpen}
          onToggle={(event) => setTranscriptOpen(event.currentTarget.open)}
        >
          <summary>
            Call transcript <span>{turns.length ? `${turns.length} turns` : 'No calls yet'}</span>
            <ChevronDown size={14} aria-hidden="true" />
          </summary>
          <div
            className="transcript"
            ref={transcriptRef}
            role="log"
            aria-label={`Call transcript with ${character.name}`}
          >
            {!turns.length && (
              <p className="transcript-empty">
                Your spoken questions and the replies you hear will appear here after each turn.
              </p>
            )}
            {turns.map((turn) => (
              <div className="transcript-turn" key={turn.id}>
                <div className="player-line">
                  <span>YOU</span>
                  <p>{turn.playerTranscript}</p>
                </div>
                {turn.reply ? (
                  <div className="character-line">
                    <span>
                      {character.name.toUpperCase()}
                      {turn.status === 'interrupted' && <small> · interrupted</small>}
                    </span>
                    <p>
                      {turn.heardText ||
                        (turn.status === 'approved'
                          ? 'Response prepared; waiting for playback.'
                          : 'No complete sentence heard.')}
                    </p>
                    {turn.warning && <small className="reply-warning">{turn.warning}</small>}
                  </div>
                ) : (
                  <small className="muted">
                    {turn.status === 'failed'
                      ? 'Response unavailable. Please try again.'
                      : 'Preparing a response…'}
                  </small>
                )}
              </div>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}
