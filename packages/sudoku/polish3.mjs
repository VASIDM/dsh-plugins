import { readFileSync, writeFileSync } from 'node:fs';
let t = readFileSync('client.js', 'utf8');
const before = t;

t = t.replace(
  `.sdk-tool { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; min-width: 40px; height: auto; padding: 4px 6px 3px; border: 1px solid transparent; border-radius: 8px; background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 10.5px; line-height: 1.2; cursor: pointer; }`,
  `.sdk-tool { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; min-width: 40px; height: auto; padding: 4px 6px 3px; border: 1px solid transparent; border-radius: 8px; background: transparent; color: color-mix(in srgb, var(--dsw-alias-label-primary) 74%, transparent); font: inherit; font-size: 11px; line-height: 1.2; cursor: pointer; }`,
);
t = t.replace(
  `.sdk-tool.on { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent); color: var(--dsw-alias-brand-primary); }`,
  `.sdk-tool.on { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent); color: var(--dsw-alias-brand-primary); }
.sdk-tool:hover { color: var(--dsw-alias-label-primary); }`,
);

writeFileSync('client.js', t, 'utf8');
console.log('changed:', before !== t);
