import { Handle, Position } from '@xyflow/react';
import { ArrowUpRight, Check, FileSearch, Phone } from 'lucide-react';

function Anchors() {
  return (
    <>
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
    </>
  );
}

export function CharacterPin({ data }) {
  const { character } = data;
  return (
    <div
      className={`pin-item character-pin ${data.selected ? 'current-person' : ''}`}
      style={{ '--tilt': `${data.tilt}deg` }}
    >
      <span className="push-pin" />
      <Anchors />
      <button
        className="polaroid nodrag"
        disabled={data.disabled}
        onClick={() => data.onSelect(character.id)}
        aria-label={`Open voice interview with ${character.name}`}
      >
        <div className="portrait-frame">
          {character.avatar ? (
            <img
              src={character.avatar}
              alt={`Fictional portrait of ${character.name}`}
              draggable={false}
            />
          ) : (
            <span className="portrait-placeholder">{character.initials || '?'}</span>
          )}
          <span className="portrait-code">CASE CONTACT</span>
        </div>
        <strong>{character.name}</strong>
        <small>{character.role}</small>
        <span className="photo-action">
          <Phone size={13} /> Open voice interview
        </span>
      </button>
    </div>
  );
}

export function EvidencePin({ data }) {
  const { clue } = data;
  return (
    <div className="pin-item evidence-pin" style={{ '--tilt': `${data.tilt}deg` }}>
      <span className="push-pin" />
      <Anchors />
      <button
        className="paper-note nodrag"
        onClick={() => data.onOpen(clue)}
        aria-label={`Read evidence: ${clue.title}`}
      >
        <span className="note-category">
          {clue.kind || 'EVIDENCE'} · {clue.id}
        </span>
        <strong>{clue.title}</strong>
        <span className="note-preview">
          {clue.body.length > 125 ? `${clue.body.slice(0, 122)}…` : clue.body}
        </span>
        <span className="note-source">{clue.source}</span>
        <span className="photo-action">
          Examine note <ArrowUpRight size={12} />
        </span>
      </button>
    </div>
  );
}

export function DossierPin({ data }) {
  return (
    <div className="pin-item dossier-pin">
      <span className="tape-strip" />
      <div className="dossier-stamp">OPEN CASE</div>
      <p className="note-category">CONFIDENTIAL · INVESTIGATION FILE</p>
      <h2>{data.case.title}</h2>
      <p className="dossier-subtitle">{data.case.subtitle}</p>
      <div className="file-divider" />
      <p className="dossier-objective">
        Find the person responsible.
        <br />
        Build your case with evidence.
      </p>
      <button className="dossier-open nodrag" onClick={data.onOpen}>
        <FileSearch size={14} /> Read initial case file <ArrowUpRight size={13} />
      </button>
      <p className="dossier-footnote">Witness statements are accounts—not established facts.</p>
    </div>
  );
}

export function ExhibitPin({ data }) {
  return (
    <div className="pin-item exhibit-pin" style={{ '--tilt': `${data.tilt}deg` }}>
      <span className="push-pin amber" />
      <button
        className="exhibit-envelope nodrag"
        disabled={data.disabled}
        onClick={() => data.onInspect(data.exhibit.id)}
        aria-label={`Inspect ${data.exhibit.title}`}
      >
        <span className="note-category">UNEXAMINED EXHIBIT</span>
        <FileSearch size={29} strokeWidth={1} />
        <strong>{data.exhibit.title}</strong>
        <small>{data.exhibit.source}</small>
        <span className="photo-action">
          Open evidence <ArrowUpRight size={12} />
        </span>
      </button>
    </div>
  );
}

export function LeadPin({ data }) {
  const { lead } = data;
  return (
    <div className="pin-item lead-pin" style={{ '--tilt': `${data.tilt}deg` }}>
      <span className="push-pin amber" />
      <button
        className="lead-note nodrag"
        disabled={data.disabled || !lead.available || lead.completed}
        onClick={() => data.onInvestigate(lead.id)}
        aria-label={`Follow lead: ${lead.title}`}
      >
        <span className="note-category">PARTNER’S TO-DO</span>
        <strong>{lead.title}</strong>
        <small>
          {lead.completed
            ? 'Checked · result on the board'
            : lead.available
              ? lead.description
              : 'Follow the scene evidence first'}
        </small>
        <span className="photo-action">
          {lead.completed ? (
            <>
              <Check size={12} /> Checked
            </>
          ) : (
            <>
              Follow this lead <ArrowUpRight size={12} />
            </>
          )}
        </span>
      </button>
    </div>
  );
}
