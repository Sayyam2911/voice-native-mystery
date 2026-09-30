import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export function AccusationDialog({ game, busy, onSubmit, onClose }) {
  const dialogRef = useRef(null);
  const [culprit, setCulprit] = useState('');
  const [evidence, setEvidence] = useState([]);
  const [feedback, setFeedback] = useState('');
  useEffect(() => {
    dialogRef.current.showModal();
  }, []);
  function toggle(id) {
    setEvidence((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }
  async function submit(event) {
    event.preventDefault();
    const result = await onSubmit(culprit, evidence);
    if (result?.feedback.success) onClose();
    else if (result?.feedback) setFeedback(result.feedback.message);
  }
  return (
    <dialog ref={dialogRef} className="accusation-dialog" onCancel={onClose}>
      <div className="dialog-heading">
        <div>
          <p className="eyebrow">MAKE THE CONNECTION</p>
          <h2>Your reconstruction</h2>
        </div>
        <button className="icon-button" aria-label="Close reconstruction" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <p className="muted">
        Identify the person responsible and select evidence that supports your account. A name alone
        is not enough.
      </p>
      <form onSubmit={submit}>
        <label className="field-label" htmlFor="culprit">
          Who caused the death?
        </label>
        <select id="culprit" required value={culprit} onChange={(e) => setCulprit(e.target.value)}>
          <option value="">Choose a person…</option>
          {game.characters
            .filter((person) => person.id !== game.case.partnerId)
            .map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
        </select>
        <fieldset>
          <legend>Supporting evidence</legend>
          {game.clues.length ? (
            game.clues.map((clue) => (
              <label key={clue.id} className="evidence-choice">
                <input
                  type="checkbox"
                  checked={evidence.includes(clue.id)}
                  onChange={() => toggle(clue.id)}
                />
                <span>
                  <strong>{clue.title}</strong>
                  <small>{clue.source}</small>
                </span>
              </label>
            ))
          ) : (
            <p className="muted">Discover some evidence before submitting a reconstruction.</p>
          )}
        </fieldset>
        {feedback && (
          <p role="status" className="feedback-message">
            {feedback}
          </p>
        )}
        <button className="primary" disabled={busy || !culprit || !evidence.length}>
          {busy ? 'Checking evidence…' : 'Submit reconstruction'}
        </button>
      </form>
    </dialog>
  );
}
