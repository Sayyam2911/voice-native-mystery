// The partner belongs to the communication controls, never to the case-person graph.
export function casePeople(game) {
  return game.characters.filter((person) => person.id !== game.case.partnerId);
}

export function caseConnections(game) {
  const available = new Set(casePeople(game).map((person) => person.id));
  return game.clues.flatMap((clue) =>
    (clue.characters || [])
      .filter((id) => available.has(id))
      .map((id) => ({
        id: `${clue.id}:${id}`,
        source: `person:${id}`,
        target: `clue:${clue.id}`,
        type: 'straight',
        selectable: false,
        style: {
          stroke: '#9c302b',
          strokeWidth: 2.3,
          opacity: id === game.state.selectedCharacterId ? 0.9 : 0.48,
        },
      })),
  );
}
