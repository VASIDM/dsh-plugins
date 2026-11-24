import { readFileSync, writeFileSync } from 'node:fs';

const problems = JSON.parse(readFileSync('problems.json', 'utf8'));
for (const problem of problems) {
  if (!problem.id || !problem.source || !problem.category || !Array.isArray(problem.statement) || !problem.statement.length) {
    throw new Error('bad problem ' + problem.id);
  }
  if (!problem.hint || !Array.isArray(problem.solution) || !problem.solution.length) {
    throw new Error('bad hint/solution ' + problem.id);
  }
  if (!problem.keyIdea) throw new Error('bad key idea ' + problem.id);
}
if (new Set(problems.map((problem) => problem.id)).size !== problems.length) throw new Error('duplicate ids');

const template = readFileSync('template.js', 'utf8');
const client = template.replace('__PROBLEMS__', JSON.stringify(problems));
writeFileSync('client.js', client, 'utf8');
console.log('problems', problems.length, '| client bytes', client.length);
