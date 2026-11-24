import { readFileSync, writeFileSync } from 'node:fs';

let t = readFileSync('client.js', 'utf8');
const before = t;

/* 1) Border-box everywhere inside the window: the previous observer fed
      getBoundingClientRect() (border-box) back into a content-box width, so the
      window grew by the border size on every observation. */
t = t.replace(
  `.sdk-win { position: fixed;`,
  `.sdk-win, .sdk-win * { box-sizing: border-box; }
.sdk-win { position: fixed;`,
);

/* 2) Never observe our own size changes. Persist the size when the user lets go
      of the resize handle (pointerup on the window) instead of on every frame. */
const start = t.indexOf('      useEffect(() => {\n        const node = winRef.current;');
const end = t.indexOf('      /* drag */');
if (start < 0 || end < 0) throw new Error('resize effect not found');
const replacement = `      const saveSize = () => {
        const node = winRef.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const nextW = Math.round(rect.width);
        const nextH = Math.round(rect.height);
        if (Math.abs(nextW - ui.w) > 2 || Math.abs(nextH - ui.h) > 2) {
          setUi({ w: nextW, h: nextH });
        }
      };

`;
t = t.slice(0, start) + replacement + t.slice(end);

/* 3) Attach the save to the window element. */
t = t.replace(
  `          ref: winRef,
          className: 'sdk-win' + (ui.minimized ? ' sdk-mini' : ''),
          style,
          role: 'dialog',
          'aria-label': '数独',`,
  `          ref: winRef,
          className: 'sdk-win' + (ui.minimized ? ' sdk-mini' : ''),
          style,
          role: 'dialog',
          'aria-label': '数独',
          onPointerUp: saveSize,`,
);

writeFileSync('client.js', t, 'utf8');
console.log('changed:', before !== t);
