import { readFileSync, readdirSync } from 'node:fs';

// Case packs are data, never executable modules or frontend imports.
const caseDirectory = new URL('../../cases/', import.meta.url);

export const authoredCases = readdirSync(caseDirectory)
  .filter((filename) => filename.endsWith('.json'))
  .sort()
  .map((filename) => JSON.parse(readFileSync(new URL(filename, caseDirectory), 'utf8')));
