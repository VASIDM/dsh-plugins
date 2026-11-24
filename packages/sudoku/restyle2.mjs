import { readFileSync, writeFileSync } from 'node:fs';

let t = readFileSync('client.js', 'utf8');
const before = t;

/* Uniform cells: no per-cell thick borders (the gap + overlay draws 3×3 lines),
   so every one of the 81 cells keeps exactly the same box. */
t = t.replace(
  `                if ((cellCol + 1) % 3 === 0 && cellCol !== 8) classes.push('b3');
                if ((cellRow + 1) % 3 === 0 && cellRow !== 8) classes.push('rowb');
`,
  '',
);

/* Draw the 3×3 lines above the cells, aligned to the 1/3 and 2/3 gaps. */
t = t.replace(
  `                    : null));
              })),`,
  `                    : null));
              }),
              h('div', { className: 'sdk-gridlines', 'aria-hidden': true },
                h('i', { className: 'v1' }),
                h('i', { className: 'v2' }),
                h('i', { className: 'h1' }),
                h('i', { className: 'h2' }))),`,
);

writeFileSync('client.js', t, 'utf8');
console.log('changed:', before !== t);
