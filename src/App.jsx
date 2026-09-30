import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Fingerprint,
  MessageSquare,
  Scale,
  X,
} from 'lucide-react';
import { CaseCatalog } from './components/CaseCatalog';
import { InvestigationBoard } from './components/InvestigationBoard';
import { InterviewPanel } from './components/InterviewPanel';
import { AccusationDialog } from './components/AccusationDialog';
import { useGame } from './hooks/useGame';
import { useVoice } from './hooks/useVoice';

export default function App() {
  const { game, catalog, health, loading, busy, error, action, ask, applyGame, setError } =
    useGame();
  const { voice, start: startVoice, stop: stopVoice } = useVoice({ applyGame, setError });
  const [showLibrary, setShowLibrary] = useState(false);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [accusation, setAccusation] = useState(false);
  const character = game?.characters.find((person) => person.id === game.state.selectedCharacterId);
  const playing = game && !showLibrary;
  useEffect(() => {
    if (game?.state.status === 'resolved') void stopVoice();
  }, [game?.state.status, stopVoice]);

  async function startCase(caseId) {
    if (
      game &&
      !window.confirm(
        'Start a new investigation? This browser will switch away from your current case.',
      )
    )
      return;
    await stopVoice();
    if (await action('session', { caseId })) {
      setShowLibrary(false);
      setInterviewOpen(false);
    }
  }
  async function selectCharacter(characterId) {
    if (busy) return;
    await stopVoice();
    if (characterId !== game.state.selectedCharacterId) await action('select', { characterId });
    setInterviewOpen(true);
  }
  async function callPartner() {
    await selectCharacter(game.case.partnerId);
    await action('alert-seen', {});
  }

  return (
    <div className={playing ? 'app-shell game-mode' : 'app-shell library-mode'}>
      <header className="app-header">
        <div className="brand">
          <Fingerprint size={25} strokeWidth={1.4} />
          <span>
            CASEWORK<small>A VOICE INVESTIGATION</small>
          </span>
        </div>
        <div className="header-right">
          {playing ? (
            <button
              className="text-button"
              onClick={async () => {
                await stopVoice();
                setShowLibrary(true);
              }}
            >
              <ArrowLeft size={14} /> Case files
            </button>
          ) : (
            <span className="edition-tag">THE INVESTIGATION DESK</span>
          )}
          <span className="header-rule" />
          <span className="status-pill">
            <span className="status-dot" /> {playing ? 'Case open' : 'Follow the evidence'}
          </span>
        </div>
      </header>
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button className="icon-button" aria-label="Dismiss error" onClick={() => setError('')}>
            <X size={17} />
          </button>
        </div>
      )}
      {health?.offline && (
        <div className="development-banner">
          LOCAL TEST STORE · TEMPORARY PROGRESS ·{' '}
          {health.dialogueConfigured ? 'LIVE DIALOGUE CONNECTED' : 'FIXTURE DIALOGUE'}
        </div>
      )}
      {!health?.databaseConfigured && !health?.offline && health && (
        <div className="development-banner">
          Configure MongoDB Atlas on the server to open an investigation.
        </div>
      )}
      {loading ? (
        <main className="loading-screen">
          <Fingerprint className="loading-fingerprint" size={50} strokeWidth={1} />
          <p>Opening the case files…</p>
        </main>
      ) : !playing ? (
        <CaseCatalog
          cases={catalog}
          busy={busy}
          onStart={startCase}
          onResume={() => setShowLibrary(false)}
          activeCase={game?.case}
          health={health}
        />
      ) : (
        <main className="game-workspace">
          <div className="game-toolbar">
            <div>
              <span className="case-tag">CASE FILE</span>
              <h1>{game.case.title}</h1>
              <p>{game.case.subtitle}</p>
            </div>
            <div className="game-toolbar-actions">
              <span>
                {game.clues.length} discoveries · {game.turnCount} questions
              </span>
              {game.state.status === 'active' && (
                <button
                  className="primary"
                  disabled={busy || voice.status !== 'idle'}
                  onClick={() => {
                    setInterviewOpen(false);
                    setAccusation(true);
                  }}
                >
                  <Scale size={15} /> Make your case
                </button>
              )}
            </div>
          </div>
          <InvestigationBoard
            game={game}
            busy={busy || voice.status === 'connecting'}
            onSelect={selectCharacter}
            onInspect={(clueId) => action('inspect', { clueId })}
            onInvestigate={(leadId) => action('investigate', { leadId })}
          />
          {game.state.partnerAlert &&
            !game.state.partnerAlert.acknowledged &&
            game.state.status === 'active' && (
              <div className="partner-pager" role="status">
                <MessageSquare size={17} />
                <div>
                  <strong>Your partner has a lead</strong>
                  <p>{game.state.partnerAlert.message}</p>
                </div>
                <button disabled={busy} onClick={callPartner}>
                  Answer <ArrowUpRight size={14} />
                </button>
              </div>
            )}
          {interviewOpen && (
            <aside className="interview-drawer">
              <button
                className="close-interview"
                aria-label="Close interview"
                onClick={async () => {
                  await stopVoice();
                  setInterviewOpen(false);
                }}
              >
                <X size={16} />
              </button>
              <InterviewPanel
                game={game}
                character={character}
                busy={busy}
                onAsk={ask}
                voice={voice}
                onStartVoice={() => startVoice(character.id)}
                onStopVoice={stopVoice}
              />
            </aside>
          )}
          {game.state.status === 'resolved' && (
            <section className="resolution-overlay" aria-labelledby="resolution-title">
              <CheckCircle2 size={32} strokeWidth={1.5} />
              <p className="eyebrow">
                {game.state.resolution.route === 'confession'
                  ? 'VERIFIED ACCOUNT'
                  : 'SUPPORTED RECONSTRUCTION'}
              </p>
              <h2 id="resolution-title">The case comes together.</h2>
              <p>{game.state.resolution.text}</p>
              <button className="primary" onClick={() => setShowLibrary(true)}>
                Return to the case files <ArrowUpRight size={16} />
              </button>
            </section>
          )}
        </main>
      )}
      {!playing && (
        <footer className="app-footer">
          <span>CASEWORK</span>
          <p>Fictional cases. Real curiosity.</p>
          <span>Voice powered by AssemblyAI · Dialogue by Groq</span>
        </footer>
      )}
      {accusation && (
        <AccusationDialog
          game={game}
          busy={busy}
          onClose={() => setAccusation(false)}
          onSubmit={(culpritId, evidenceIds) => action('accuse', { culpritId, evidenceIds })}
        />
      )}
    </div>
  );
}
