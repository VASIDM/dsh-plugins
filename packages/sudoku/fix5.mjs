import { readFileSync, writeFileSync } from 'node:fs';

let t = readFileSync('client.js', 'utf8');
const before = t;

t = t.replace(
  `      w: 420,
      h: 688,`,
  `      w: 396,
      h: 664,`,
);
t = t.replace(
  `.sdk-body { display: flex; flex-direction: column; gap: 10px; flex: 1; min-height: 0; padding: 10px 14px 12px 17px; overflow: auto; }`,
  `.sdk-body { display: flex; flex-direction: column; gap: 8px; flex: 1; min-height: 0; padding: 9px 13px 10px 16px; overflow: auto; }`,
);
t = t.replace(
  `.sdk-board-wrap { position: relative; align-self: center; width: 100%; max-width: 430px; }`,
  `.sdk-board-wrap { position: relative; align-self: center; width: min(100%, calc(100vh - 318px)); max-width: 388px; }`,
);
t = t.replace(
  `.sdk-num { position: relative; height: 34px;`,
  `.sdk-num { position: relative; height: 31px;`,
);
t = t.replace(
  `.sdk-tool { height: 27px;`,
  `.sdk-tool { height: 25px;`,
);
t = t.replace(
  `.sdk-foot { margin-top: auto; color: var(--dsw-alias-label-secondary); font-size: 10px; line-height: 1.5; }`,
  `.sdk-foot { margin-top: 2px; color: var(--dsw-alias-label-secondary); font-size: 9.5px; line-height: 1.45; }`,
);

writeFileSync('client.js', t, 'utf8');
console.log('changed:', before !== t);
