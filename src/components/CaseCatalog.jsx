import { ArrowUpRight, Clock3, Fingerprint, Headphones, Layers3 } from 'lucide-react';

export function CaseCatalog({ cases, busy, onStart, onResume, activeCase, health }) {
  return (
    <main className="catalog page-width">
      <div className="hero-copy">
        <p className="eyebrow">
          <span className="status-dot" /> YOUR INVESTIGATION DESK
        </p>
        <h1>
          The truth is in the details.
          <br />
          <em>Open a case. Follow the thread.</em>
        </h1>
        <p className="hero-description">
          Step into a case. Question the people involved, challenge their accounts, and follow the
          evidence. Your voice leads the investigation.
        </p>
        <div className="hero-details">
          <span>
            <Headphones size={16} /> Distinct character voices
          </span>
          <span>
            <Clock3 size={16} /> 15–30 minute cases
          </span>
          <span>
            <Layers3 size={16} /> Your own case board
          </span>
        </div>
        {activeCase && (
          <button className="primary" onClick={onResume}>
            Resume {activeCase.title} <ArrowUpRight size={17} />
          </button>
        )}
      </div>
      <section className="case-library" aria-labelledby="library-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE CASE FILES</p>
            <h2 id="library-title">Choose your investigation</h2>
          </div>
          <span className="muted">
            {cases.length} available {cases.length === 1 ? 'case' : 'cases'}
          </span>
        </div>
        <div className="case-grid">
          {cases.map((pack, index) => (
            <article className="case-card" key={pack.id}>
              <div className={`case-art ${pack.cover?.src ? 'has-cover' : ''}`} aria-hidden="true">
                {pack.cover?.src ? (
                  <img src={pack.cover.src} alt="" loading="lazy" decoding="async" />
                ) : (
                  <Fingerprint strokeWidth={0.8} size={120} />
                )}
                <span className="file-number">FILE {String(index + 1).padStart(3, '0')}</span>
                <span className="art-caption">A VOICE INVESTIGATION</span>
              </div>
              <div className="case-card-content">
                <p className="eyebrow">{pack.setting}</p>
                <h3>{pack.title}</h3>
                <p>{pack.subtitle}</p>
                <div className="case-meta">
                  <span>
                    <Clock3 size={14} /> {pack.duration}
                  </span>
                  <span>{pack.castSize} people to question</span>
                </div>
                <button className="primary" disabled={busy} onClick={() => onStart(pack.id)}>
                  {busy ? 'Opening case…' : 'Open case file'}
                  <ArrowUpRight size={17} />
                </button>
                <p className="source-credit">
                  Inspired by{' '}
                  <a href={pack.source.url} target="_blank" rel="noreferrer">
                    {pack.source.title}
                  </a>{' '}
                  · {pack.source.author}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <aside className="how-it-works">
        <div>
          <span className="step-number">01</span>
          <h3>Listen carefully</h3>
          <p>
            Choose a person and start a voice interview. Speak naturally and interrupt when needed.
          </p>
        </div>
        <div>
          <span className="step-number">02</span>
          <h3>Connect the evidence</h3>
          <p>Inspect the scene, follow leads with your partner, and challenge contradictions.</p>
        </div>
        <div>
          <span className="step-number">03</span>
          <h3>Make your case</h3>
          <p>Name the person responsible and select evidence that supports your reconstruction.</p>
        </div>
      </aside>
      {health && (
        <p className="privacy-note">
          No account needed. The application stores interview text and case progress, not raw audio.{' '}
          {health.offline
            ? 'Local development mode: persistence is temporary.'
            : 'Your active case is retained for 24 hours.'}
        </p>
      )}
    </main>
  );
}
