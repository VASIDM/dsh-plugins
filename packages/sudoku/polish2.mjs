import { readFileSync, writeFileSync } from 'node:fs';

let t = readFileSync('client.js', 'utf8');
const before = t;

/* Compact ratio: the content column now fills the window instead of leaving a
   blank strip under the toolbar. */
t = t.replace('const RATIO = 0.62;', 'const RATIO = 0.69;');
t = t.replace(
  `      const boardSize = Math.max(250, Math.min(winW - 30, winH - 246));`,
  `      const boardSize = Math.max(240, Math.min(winW - 30, winH - (walk ? 258 : 224)));`,
);

/* In review mode keep the original clues visually distinct from the values the
   walkthrough derives. */
t = t.replace(
  `                  const isGiven = walk ? false : game.puzzle[index] !== 0;`,
  `                  const isGiven = game.puzzle[index] !== 0;`,
);
t = t.replace(
  `                  if (walk) classes.push('review');
                  if (isGiven) classes.push('given');`,
  `                  if (walk) classes.push('review');
                  if (isGiven) classes.push('given');`,
);

/* CJK-capable fallbacks for the title/seal font. */
t = t.replaceAll(
  `var(--dsh-font-family-brand, var(--dsh-font-family-text-default))`,
  `var(--dsh-font-family-brand, "Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", "SimSun", var(--dsh-font-family-text-default))`,
);

/* Clearer key hints. */
t = t.replace(
  `.sdk-tool small { color: var(--dsw-alias-label-secondary); font-size: 8.5px; font-weight: 400; letter-spacing: .04em; }`,
  `.sdk-tool small { color: var(--dsw-alias-label-secondary); font-size: 9px; font-weight: 400; letter-spacing: .06em; opacity: .85; }`,
);

writeFileSync('client.js', t, 'utf8');
console.log('changed:', before !== t);
