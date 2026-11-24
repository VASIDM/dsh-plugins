import { readFileSync } from 'node:fs';

const src = readFileSync('client.js', 'utf8');
const engineStart = src.indexOf('    const FULL = 0x1ff;');
const engineEnd = src.indexOf('    /* ------------------------------------------------------------- UI store */');
const walkStart = src.indexOf('    /* ------------------------------------------------------------ walkthrough */');
const walkEnd = src.indexOf('    /* ---------------------------------------------------------------- window */');
if (engineStart < 0 || engineEnd < 0 || walkStart < 0 || walkEnd < 0) throw new Error('sections not found');
const engine = src.slice(engineStart, engineEnd);
const walk = src.slice(walkStart, walkEnd);
const api = new Function(`${engine}\n${walk}\nreturn { generatePuzzle, buildWalkthrough, DIFF_BY_ID };`)();

for (const diff of ['hard', 'expert', 'master']) {
  const puzzle = await api.generatePuzzle(diff);
  const result = api.buildWalkthrough(puzzle.puzzle, puzzle.solution);
  const last = result.steps[result.steps.length - 1];
  const matches = last.grid.every((value, i) => value === puzzle.solution[i]);
  const techniques = {};
  for (const step of result.steps) techniques[step.technique] = (techniques[step.technique] || 0) + 1;
  console.log(diff, '| steps', result.steps.length, '| solved', result.solved, '| final matches solution', matches, '| techniques', JSON.stringify(techniques));
  if (!matches || !result.solved) {
    console.log('  last grid', last.grid.join(''));
    console.log('  solution ', puzzle.solution.join(''));
  }
}
