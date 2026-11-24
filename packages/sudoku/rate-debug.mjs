import { readFileSync } from 'node:fs';

const src = readFileSync('client.js', 'utf8');
const start = src.indexOf('    const FULL = 0x1ff;');
const end = src.indexOf('    /* ------------------------------------------------------------- UI store */');
const engine = src.slice(start, end);
const api = new Function(`${engine}\nreturn { ratePuzzle, solveGrid, countSolutions, candidatesOf, popcount, bitsOf, usedMask, rowOf, colOf };`)();

const solution = api.solveGrid(new Array(81).fill(0), true);
const easy = solution.slice();
for (let i = 0; i < 20; i += 1) easy[i * 3 % 81] = 0;
console.log('easy clues', easy.filter(Boolean).length, 'unique', api.countSolutions(easy, 2), 'rate', api.ratePuzzle(easy));

// manual single-technique check
const mid = solution.slice();
for (let i = 0; i < 40; i += 1) mid[i * 2 % 81] = 0;
console.log('mid clues', mid.filter(Boolean).length, 'unique', api.countSolutions(mid, 2), 'rate', api.ratePuzzle(mid));

// is there any naked single on the easy grid?
const cands = api.candidatesOf(easy);
let singles = 0;
for (let i = 0; i < 81; i += 1) if (!easy[i] && api.popcount(cands[i]) === 1) singles += 1;
console.log('naked singles in easy', singles);
