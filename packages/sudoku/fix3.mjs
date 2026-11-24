import { readFileSync, writeFileSync } from 'node:fs';

let t = readFileSync('client.js', 'utf8');
const before = t;

t = t.replace(
  `      { id: 'master', label: '大师', clues: 24, level: 6, effort: 20, note: '硬核' },`,
  `      { id: 'master', label: '大师', clues: 24, level: 6, effort: 16, note: '硬核' },`,
);
t = t.replace(
  `      const deadline = performance.now() + (deadlineMs || (cfg.id === 'master' ? 8000 : 5000));
      let best = null;
      let attempts = 0;`,
  `      const deadline = performance.now() + (deadlineMs || (cfg.id === 'master' ? 6000 : 5000));
      let best = null;
      let attempts = 0;
      let lastYield = performance.now();`,
);
t = t.replace(
  `        if (attempts % 2 === 0) await new Promise((resolve) => setTimeout(resolve, 0));`,
  `        if (performance.now() - lastYield > 30) {
          lastYield = performance.now();
          await new Promise((resolve) => setTimeout(resolve, 0));
        }`,
);

writeFileSync('client.js', t, 'utf8');
console.log('changed:', before !== t);
