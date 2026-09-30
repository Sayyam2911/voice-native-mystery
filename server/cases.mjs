import grange from '../cases/grange-house.mjs';

export const authoredCases = [grange];

export function validateCase(pack) {
  for (const field of ['id', 'title', 'briefing', 'characters', 'clues', 'reveals', 'leads', 'resolution']) if (!pack[field]) throw new Error(`Case is missing ${field}`);
  const chars = new Set(pack.characters.map(x => x.id));
  const clues = new Set(pack.clues.map(x => x.id));
  if (chars.size !== pack.characters.length || clues.size !== pack.clues.length) throw new Error('Duplicate case identifiers');
  if (!chars.has('detective') || !chars.has(pack.resolution.culpritId)) throw new Error('Missing detective or culprit');
  const ids = new Set();
  for (const item of [...pack.reveals, ...pack.leads]) {
    if (ids.has(item.id)) throw new Error(`Duplicate action ${item.id}`);
    ids.add(item.id);
    if (item.characterId && !chars.has(item.characterId)) throw new Error('Unknown reveal character');
    for (const id of [...(item.clueIds || []), ...(item.requires?.all || []), ...(item.requires?.any || [])]) if (!clues.has(id)) throw new Error(`Unknown clue ${id}`);
  }
  for (const group of pack.resolution.proofGroups) if (!group.length || group.some(id => !clues.has(id))) throw new Error('Invalid proof path');
  if (Buffer.byteLength(JSON.stringify(pack)) > 500_000) throw new Error('Case exceeds the submission size budget');
  return pack;
}
authoredCases.forEach(validateCase);

export function catalogProjection(pack) {
  const { id, version, title, subtitle, setting, duration, difficulty, source } = pack;
  return { id, version, title, subtitle, setting, duration, difficulty, source, castSize: pack.characters.length - 1 };
}

export function ruleSatisfied(requires = {}, state) {
  const known = new Set(state.knownClueIds);
  return (!requires.all || requires.all.every(id => known.has(id))) &&
    (!requires.any || requires.any.some(id => known.has(id))) &&
    (!requires.characters || requires.characters.every(id => state.unlockedCharacterIds.includes(id)));
}

export function initialState(pack) {
  return { knownClueIds: [], revealedIds: [], unlockedCharacterIds: pack.characters.filter(x => x.initial).map(x => x.id), characterLevels: {}, completedLeadIds: [], selectedCharacterId: 'detective', status: 'active', resolution: null, partnerAlert: null, hintLevel: 0 };
}

export function commitClues(pack, state, ids, source, now = new Date()) {
  const events = [];
  for (const id of ids) {
    const clue = pack.clues.find(x => x.id === id);
    if (!clue) throw new Error('Invalid case clue');
    if (state.knownClueIds.includes(id)) continue;
    state.knownClueIds.push(id);
    for (const cid of clue.unlockCharacters || []) if (!state.unlockedCharacterIds.includes(cid)) state.unlockedCharacterIds.push(cid);
    events.push({ type: 'clue.discovered', clueId: id, source, occurredAt: now });
  }
  if (state.knownClueIds.length >= 2 && !state.partnerAlert && state.status === 'active') state.partnerAlert = { id: 'first-lead', message: 'I have a lead worth checking. Come speak with me when you have a moment.', acknowledged: false };
  if (pack.resolution.confessionId && state.knownClueIds.includes(pack.resolution.confessionId)) {
    state.status = 'resolved';
    state.resolution = { route: 'confession', culpritId: pack.resolution.culpritId, text: pack.resolution.reconstruction };
  }
  return events;
}

export function projectGame(pack, session, turns = [], events = []) {
  const state = session.state;
  const known = new Set(state.knownClueIds);
  return {
    case: { ...catalogProjection(pack), briefing: pack.briefing, openingFacts: pack.openingFacts },
    state: structuredClone(state), revision: session.revision, expiresAt: session.expiresAt,
    characters: pack.characters.filter(x => state.unlockedCharacterIds.includes(x.id)).map(({ id, name, role, initials, bio, topics }) => ({ id, name, role, initials, bio, topics, level: state.characterLevels[id] || 'denial' })),
    clues: pack.clues.filter(x => known.has(x.id)).map(({ id, title, kind, source, body, characters }) => ({ id, title, kind, source, body, characters, provenance: events.find(e => e.clueId === id)?.source || null })),
    exhibits: pack.clues.filter(x => x.inspectable && !known.has(x.id) && ruleSatisfied(x.requires, state)).map(({ id, title, source, kind }) => ({ id, title, source, kind })),
    leads: pack.leads.map(({ id, title, description, requires }) => ({ id, title, description, available: ruleSatisfied(requires, state), completed: state.completedLeadIds.includes(id) })),
    turns: turns.map(x => ({ id: x._id, characterId: x.characterId, playerTranscript: x.playerTranscript, reply: x.approvedReply || null, status: x.status, channel: x.channel, heardText: x.heardText || '', modelMode: x.modelMode, warning: x.warning || null, createdAt: x.createdAt })),
    turnCount: session.turnCount
  };
}
