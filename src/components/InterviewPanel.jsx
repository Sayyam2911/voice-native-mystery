import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Send, Volume2 } from 'lucide-react';

export function InterviewPanel({ character, game, busy, onAsk, voice, onStartVoice, onStopVoice }) {
  const [question, setQuestion] = useState('');
  const transcriptRef = useRef(null);
  const turns = game.turns.filter((turn) => turn.characterId === character.id);
  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [game.turns, voice.caption]);
  useEffect(() => setQuestion(''), [character.id]);
  const live = voice.status !== 'idle';
  async function submit(event) {
    event.preventDefault();
    if (!question.trim() || busy || live) return;
    if (await onAsk(character.id, question.trim())) setQuestion('');
  }
  return (
    <section className="interview-panel" aria-labelledby="interview-title">
      <div className="interview-heading">
        <p className="eyebrow">IN THE INTERVIEW</p>
        <div className="interview-person">
          <span className="avatar large">
            {character.avatar ? (
              <img className="interview-avatar" src={character.avatar} alt="" />
            ) : (
              character.initials || '?'
            )}
          </span>
          <div>
            <h2 id="interview-title">{character.name}</h2>
            <p>{character.role}</p>
          </div>
        </div>
        <p className="character-bio">{character.bio}</p>
      </div>
      <div className={`voice-bar ${live ? 'live' : ''}`}>
        <div>
          <Volume2 size={17} />
          <span>
            {voice.status === 'idle'
              ? 'A conversation, not a questionnaire'
              : voice.status === 'connecting'
                ? 'Connecting voice…'
                : voice.status === 'speaking'
                  ? 'Speaking · you can interrupt'
                  : 'Listening to your microphone'}
          </span>
        </div>
        {game.state.status === 'active' && (
          <button
            className={live ? 'voice-stop' : 'voice-start'}
            onClick={live ? onStopVoice : onStartVoice}
            disabled={busy || voice.status === 'connecting'}
          >
            {live ? <MicOff size={16} /> : <Mic size={16} />}
            {live ? 'End voice' : 'Start voice'}
          </button>
        )}
      </div>
      <div className="transcript" ref={transcriptRef} role="log" aria-live="polite">
        {!turns.length && (
          <div className="interview-empty">
            <span className="quote-mark">“</span>
            <p>
              Start with their account.
              <br />
              Then ask what doesn’t add up.
            </p>
            <small>Try a topic below or ask your own question.</small>
          </div>
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
                  {character.name.toUpperCase()}{' '}
                  {turn.status === 'interrupted' && <small>· interrupted</small>}
                </span>
                <p>
                  {turn.channel === 'voice'
                    ? turn.heardText ||
                      (turn.status === 'approved'
                        ? 'Response prepared; waiting for playback.'
                        : 'No complete sentence heard.')
                    : turn.reply.text}
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
        {voice.caption && (
          <div className="live-caption">
            <span>LIVE CAPTION</span>
            <p>{voice.caption}</p>
          </div>
        )}
        {busy && (
          <p className="thinking">
            Reviewing the account<span>…</span>
          </p>
        )}
      </div>
      {game.state.status === 'active' && (
        <div className="interview-composer">
          <div className="topic-chips">
            {character.topics?.map((topic) => (
              <button
                disabled={busy || live}
                key={topic}
                onClick={() => setQuestion(`Tell me about ${topic.toLowerCase()}.`)}
              >
                {topic}
              </button>
            ))}
          </div>
          <form onSubmit={submit}>
            <label className="sr-only" htmlFor="question">
              Question for {character.name}
            </label>
            <textarea
              id="question"
              placeholder={
                live
                  ? 'Voice is active. End voice to type a question.'
                  : `Ask ${character.name.split(' ')[0]} a question…`
              }
              rows={2}
              maxLength={2000}
              value={question}
              disabled={busy || live}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit(e);
                }
              }}
            />
            <button
              className="send-question"
              aria-label="Send question"
              disabled={busy || live || !question.trim()}
            >
              <Send size={18} />
            </button>
          </form>
          <p className="composer-note">
            {live
              ? 'Headphones recommended. Audio is not archived by this app.'
              : 'Enter to send · Shift + Enter for a new line'}
          </p>
        </div>
      )}
    </section>
  );
}
