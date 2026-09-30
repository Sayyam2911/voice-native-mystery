import { useEffect, useRef, useState } from 'react';
import { ReactFlow, Controls, useNodesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { X, Pin, Move, Fingerprint } from 'lucide-react';
import { CharacterPin, EvidencePin, DossierPin, ExhibitPin, LeadPin } from './board/PinNodes';
import { casePeople, caseConnections } from '../lib/board';

const nodeTypes = {
  character: CharacterPin,
  evidence: EvidencePin,
  dossier: DossierPin,
  exhibit: ExhibitPin,
  lead: LeadPin,
};
const tilts = [-4, 3, -2, 5, 2, -3];

export function InvestigationBoard({ game, busy, onSelect, onInspect, onInvestigate }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [detail, setDetail] = useState(null);
  const dialogRef = useRef(null);
  const positions = useRef({});
  const storageKey = `casework-board:${game.sessionId}`;
  const edges = caseConnections(game);

  useEffect(() => {
    try {
      positions.current = JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch {
      positions.current = {};
    }
  }, [storageKey]);

  useEffect(() => {
    const at = (id, fallback) => positions.current[id] || fallback;
    const next = [
      {
        id: 'dossier',
        type: 'dossier',
        position: at('dossier', { x: 500, y: 90 }),
        data: { case: game.case, onOpen: () => setDetail({ kind: 'briefing' }) },
      },
    ];
    casePeople(game).forEach((character, index) => {
      const id = `person:${character.id}`;
      next.push({
        id,
        type: 'character',
        position: at(id, {
          x: 55 + (index % 2) * 220,
          y: 100 + Math.floor(index / 2) * 275 + (index % 2) * 35,
        }),
        data: {
          character,
          selected: character.id === game.state.selectedCharacterId,
          disabled: busy,
          tilt: tilts[index % tilts.length],
          onSelect,
        },
      });
    });
    game.clues.forEach((clue, index) => {
      const id = `clue:${clue.id}`;
      next.push({
        id,
        type: 'evidence',
        position: at(id, {
          x: 505 + (index % 3) * 270,
          y: 450 + Math.floor(index / 3) * 270 + (index % 2) * 35,
        }),
        data: {
          clue,
          tilt: tilts[(index + 2) % tilts.length],
          onOpen: (clue) => setDetail({ kind: 'clue', clue }),
        },
      });
    });
    game.exhibits.forEach((exhibit, index) => {
      const id = `exhibit:${exhibit.id}`;
      next.push({
        id,
        type: 'exhibit',
        position: at(id, {
          x: 515 + (index % 2) * 280,
          y: 440 + Math.ceil(game.clues.length / 3) * 280 + Math.floor(index / 2) * 240,
        }),
        data: { exhibit, disabled: busy, tilt: tilts[(index + 1) % tilts.length], onInspect },
      });
    });
    game.leads.forEach((lead, index) => {
      const id = `lead:${lead.id}`;
      next.push({
        id,
        type: 'lead',
        position: at(id, { x: 1050, y: 85 + index * 115 }),
        data: {
          lead,
          disabled: busy || game.state.status !== 'active',
          tilt: index % 2 ? 2 : -1,
          onInvestigate,
        },
      });
    });
    setNodes(next);
  }, [game, busy, onSelect, onInspect, onInvestigate, setNodes]);

  useEffect(() => {
    if (detail) dialogRef.current?.showModal();
  }, [detail]);

  function rememberPosition(event, node) {
    positions.current[node.id] = node.position;
    try {
      localStorage.setItem(storageKey, JSON.stringify(positions.current));
    } catch {
      /* Board layout is optional client-only state. */
    }
  }

  return (
    <section className="investigation-wall" aria-label="Interactive investigation pinboard">
      <div className="wall-shadow" />
      <div className="wall-label">
        <Pin size={13} /> INVESTIGATION WALL<span>Only discovered evidence is pinned here</span>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={rememberPosition}
        fitView
        fitViewOptions={{ padding: 0.14, minZoom: 0.7, maxZoom: 1 }}
        minZoom={0.25}
        maxZoom={1.6}
        nodesConnectable={false}
        elementsSelectable={false}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
      >
        <Controls showInteractive={false} />
      </ReactFlow>
      <div className="wall-guide">
        <Move size={13} />
        <span>Drag the board to explore · scroll to zoom · drag pins to rearrange</span>
      </div>
      <div className="wall-seal">
        <Fingerprint size={22} strokeWidth={1} /> CASEWORK · EVIDENCE & ACCOUNTS
      </div>
      {detail && (
        <dialog className="board-detail" ref={dialogRef} onCancel={() => setDetail(null)}>
          <button
            className="icon-button close-detail"
            aria-label="Close case note"
            onClick={() => setDetail(null)}
          >
            <X size={18} />
          </button>
          <p className="note-category">
            {detail.kind === 'briefing'
              ? 'INITIAL INVESTIGATION FILE'
              : `${detail.clue.kind} · ${detail.clue.id}`}
          </p>
          <h2>{detail.kind === 'briefing' ? game.case.title : detail.clue.title}</h2>
          <p>{detail.kind === 'briefing' ? game.case.briefing : detail.clue.body}</p>
          {detail.kind === 'briefing' ? (
            <ul>
              {game.case.openingFacts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          ) : (
            <p className="detail-source">Source: {detail.clue.source}</p>
          )}
          <p className="detail-reminder">
            Connect the observations yourself. Your partner can help if you get stuck.
          </p>
        </dialog>
      )}
    </section>
  );
}
