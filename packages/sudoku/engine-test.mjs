import { readFileSync } from 'node:fs';

const src = readFileSync('client.js', 'utf8');
const start = src.indexOf('    const FULL = 0x1ff;');
const end = src.indexOf('    /* ------------------------------------------------------------- UI store */');
if (start < 0 || end < 0) throw new Error('engine section not found');
const engine = src.slice(start, end);
const factory = new Function(`${engine}\nreturn { generatePuzzle, countSolutions, ratePuzzle, solveGrid, DIFF_BY_ID, DIFFICULTIES };`);
const api = factory();

for (const diff of ['hard', 'expert', 'master']) {
  const t0 = Date.now();
  const puzzle = await api.generatePuzzle(diff);
  const ms = Date.now() - t0;
  if (!puzzle) { console.log(diff, 'NO PUZZLE'); continue; }
  const unique = api.countSolutions(puzzle.puzzle, 2);
  const filled = puzzle.puzzle.filter((v) => v !== 0).length;
  const solved = api.solveGrid(puzzle.puzzle, false);
  const matches = solved && solved.every((v, i) => v === puzzle.solution[i]);
  console.log(diff, '| clues', filled, '(target', api.DIFF_BY_ID[diff].clues + ')', '| level', puzzle.level, '(need', api.DIFF_BY_ID[diff].level + ')', '| unique', unique, '| solvable', Boolean(solved), '| sameSolution', matches, '| attempts', puzzle.attempts, '|', ms + 'ms');
}
