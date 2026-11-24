import { readFileSync, writeFileSync } from 'node:fs';

let t = readFileSync('client.js', 'utf8');
const before = t;

t = t.replace(
  `.sdk-tools { display: flex; flex-wrap: wrap; gap: 3px; }`,
  `.sdk-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 3px; }
.sdk-sep { width: 1px; height: 20px; margin: 0 3px; background: var(--dsw-alias-border-l1); }`,
);
t = t.replace(
  `                  h('button', { type: 'button', className: 'sdk-tool' + (autoNotes ? ' on' : ''), onClick: () => setAutoNotes(!autoNotes), disabled: generating }, autoNotes ? '候选 开' : '候选', h('small', null, 'C')),`,
  `                  h('button', { type: 'button', className: 'sdk-tool' + (autoNotes ? ' on' : ''), onClick: () => setAutoNotes(!autoNotes), disabled: generating }, autoNotes ? '候选 开' : '候选', h('small', null, 'C')),
                  h('span', { className: 'sdk-sep' }),`,
);
t = t.replace(
  `                  h('button', { type: 'button', className: 'sdk-tool', onClick: redo, disabled: generating || redoRef.current.length === 0 }, '重做', h('small', null, 'Y')),`,
  `                  h('button', { type: 'button', className: 'sdk-tool', onClick: redo, disabled: generating || redoRef.current.length === 0 }, '重做', h('small', null, 'Y')),
                  h('span', { className: 'sdk-sep' }),`,
);

writeFileSync('client.js', t, 'utf8');
console.log('changed:', before !== t);
