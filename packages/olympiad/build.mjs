import { readFileSync, writeFileSync } from 'node:fs';

const problems = JSON.parse(readFileSync('problems.json', 'utf8'));
for (const problem of problems) {
  if (!problem.id || !problem.source || !problem.category || !Array.isArray(problem.statement) || !problem.statement.length) {
    throw new Error('bad problem ' + problem.id);
  }
  if (!problem.hint || !Array.isArray(problem.solution) || !problem.solution.length) {
    throw new Error('bad hint/solution ' + problem.id);
  }
}
if (new Set(problems.map((problem) => problem.id)).size !== problems.length) throw new Error('duplicate ids');

/* The featured set is embedded in the client so a missing or late corpus can
   never leave the reader empty. Keep the level/stars mapping in sync with
   build-corpus.mjs. */
const featured = problems.map((problem) => ({
  ...problem,
  featured: true,
  level: problem.difficulty * 2,
  stars: problem.difficulty,
  answer: '',
}));

const template = readFileSync('template.js', 'utf8');
if (!template.includes('__FEATURED__')) throw new Error('template marker __FEATURED__ missing');
const client = template.replace('__FEATURED__', JSON.stringify(featured));
writeFileSync('client.js', client, 'utf8');
console.log('problems', problems.length, '| client bytes', client.length);
