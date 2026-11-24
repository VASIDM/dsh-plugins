import { readFileSync, writeFileSync } from 'node:fs';

let t = readFileSync('client.js', 'utf8');
const before = t;

t = t.replace(
  `      w: 404,
      h: 616,`,
  `      w: 420,
      h: 688,`,
);
t = t.replace(
  `.sdk-win { position: fixed; display: flex; flex-direction: column; min-width: 330px; min-height: 460px; max-width: 92vw; max-height: 92vh;`,
  `.sdk-win { position: fixed; display: flex; flex-direction: column; min-width: 330px; min-height: 480px; max-width: 92vw; max-height: calc(100vh - 24px);`,
);
t = t.replace(
  `        top: ui.y == null ? '7%' : ui.y + 'px',`,
  `        top: ui.y == null ? '3%' : ui.y + 'px',`,
);

writeFileSync('client.js', t, 'utf8');
console.log('changed:', before !== t);
