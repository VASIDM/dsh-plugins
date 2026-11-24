import { readFileSync, writeFileSync } from 'node:fs';

let t = readFileSync('client.js', 'utf8');
const before = t;

const cssStart = t.indexOf('    const CSS = `');
const cssEnd = t.indexOf('`;', cssStart);
if (cssStart < 0 || cssEnd < 0) throw new Error('css block not found');

const css = String.raw`    const CSS = `
.sdk-launcher { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 30px; padding: 0 9px; border: 0; border-radius: 8px; background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; cursor: pointer; }
.sdk-launcher:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.sdk-launcher[aria-pressed="true"] { background: color-mix(in srgb, #6f8fae 18%, transparent); color: #6f8fae; }
.sdk-launcher-icon { display: inline-flex; width: 18px; height: 18px; }
.sdk-launcher-icon svg { width: 18px; height: 18px; }

/* A calm, paper-like game window: Sudoku Universe's light, airy palette. */
.sdk-layer { position: fixed; inset: 0; z-index: 60; pointer-events: none; }
.sdk-win, .sdk-win * { box-sizing: border-box; }
.sdk-win {
  --sdk-paper: #f8f6f1;
  --sdk-card: #fffdf9;
  --sdk-line: #e4ded2;
  --sdk-line-strong: #c9c2b3;
  --sdk-ink: #2f3a45;
  --sdk-ink-soft: #6f7884;
  --sdk-blue: #5f86a8;
  --sdk-blue-soft: #e8f0f6;
  --sdk-blue-mid: #cddce8;
  --sdk-red: #c25b57;
  position: fixed;
  display: flex;
  flex-direction: column;
  min-width: 336px;
  min-height: 500px;
  max-width: 92vw;
  max-height: calc(100vh - 24px);
  border: 1px solid #e2dccf;
  border-radius: 18px;
  background: var(--sdk-paper);
  color: var(--sdk-ink);
  box-shadow: 0 30px 80px rgba(34, 40, 48, .28), 0 2px 8px rgba(34, 40, 48, .08);
  overflow: hidden;
  pointer-events: auto;
  resize: both;
  font-family: var(--dsw-font-sans, "Segoe UI", system-ui, sans-serif);
  -webkit-font-smoothing: antialiased;
}
.sdk-head { display: flex; align-items: center; gap: 10px; padding: 13px 14px 11px 16px; cursor: move; user-select: none; touch-action: none; }
.sdk-seal { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 8px; background: var(--sdk-blue); color: #fff; font-size: 12px; font-weight: 600; box-shadow: 0 2px 6px rgba(95, 134, 168, .35); }
.sdk-title { display: flex; flex-direction: column; min-width: 0; }
.sdk-title b { font-size: 14px; font-weight: 650; letter-spacing: .02em; color: var(--sdk-ink); }
.sdk-title span { margin-top: 1px; color: var(--sdk-ink-soft); font-size: 10.5px; }
.sdk-spacer { flex: 1; }
.sdk-iconbtn { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; padding: 0; border: 1px solid transparent; border-radius: 8px; background: transparent; color: var(--sdk-ink-soft); font: inherit; font-size: 13px; cursor: pointer; }
.sdk-iconbtn:hover { background: #efece4; color: var(--sdk-ink); }
.sdk-body { display: flex; flex-direction: column; gap: 9px; flex: 1; min-height: 0; padding: 0 16px 12px; overflow: auto; }
.sdk-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sdk-seg { display: inline-flex; gap: 2px; padding: 3px; border-radius: 10px; background: #efece4; }
.sdk-seg button { height: 25px; padding: 0 12px; border: 0; border-radius: 7px; background: transparent; color: var(--sdk-ink-soft); font: inherit; font-size: 11.5px; cursor: pointer; transition: background .15s ease, color .15s ease; }
.sdk-seg button:hover { color: var(--sdk-ink); }
.sdk-seg button.on { background: var(--sdk-card); color: var(--sdk-blue); font-weight: 600; box-shadow: 0 1px 3px rgba(34, 40, 48, .12); }
.sdk-btn { height: 27px; padding: 0 11px; border: 1px solid var(--sdk-line); border-radius: 8px; background: var(--sdk-card); color: var(--sdk-ink); font: inherit; font-size: 11.5px; cursor: pointer; transition: border-color .15s ease, background .15s ease; }
.sdk-btn:hover { border-color: var(--sdk-blue-mid); background: #fdfcf8; }
.sdk-btn.accent { border-color: transparent; background: var(--sdk-blue); color: #fff; box-shadow: 0 2px 6px rgba(95, 134, 168, .28); }
.sdk-btn.accent:hover { background: #547a9c; }
.sdk-meta { display: flex; align-items: center; gap: 14px; color: var(--sdk-ink-soft); font-size: 11px; font-variant-numeric: tabular-nums; }
.sdk-meta b { color: var(--sdk-ink); font-weight: 600; }
.sdk-meta .sdk-tool { margin-left: auto; }
.sdk-board-wrap { position: relative; align-self: center; width: min(100%, calc(100vh - 330px)); max-width: 368px; margin-top: 1px; }
.sdk-board {
  position: relative;
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  grid-template-rows: repeat(9, 1fr);
  gap: 1px;
  aspect-ratio: 1;
  padding: 1px;
  border-radius: 10px;
  background: var(--sdk-line-strong);
  box-shadow: 0 10px 26px rgba(47, 58, 69, .08), 0 1px 2px rgba(47, 58, 69, .06);
  overflow: hidden;
}
.sdk-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  padding: 0;
  border: 0;
  background: var(--sdk-card);
  color: var(--sdk-ink);
  font: inherit;
  font-size: clamp(15px, 3vmin, 21px);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: background .12s ease;
}
.sdk-cell:hover { background: #fbfaf5; }
.sdk-cell.given { color: #33414f; font-weight: 650; }
.sdk-cell.entered { color: var(--sdk-blue); font-weight: 500; }
.sdk-cell.peer { background: #f3f7fa; }
.sdk-cell.same { background: var(--sdk-blue-soft); }
.sdk-cell.sel { background: var(--sdk-blue-soft); box-shadow: inset 0 0 0 2px var(--sdk-blue); }
.sdk-cell.conflict { background: #fbeeed; }
.sdk-cell.wrong { color: var(--sdk-red); }
.sdk-cell.hinted { color: #4f8a74; }
.sdk-notes { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); width: 100%; height: 100%; padding: 3px; color: #9aa3ad; font-size: 8.5px; line-height: 1; }
.sdk-notes span { display: flex; align-items: center; justify-content: center; }
.sdk-gridlines { position: absolute; inset: 1px; pointer-events: none; }
.sdk-gridlines i { position: absolute; background: var(--sdk-ink-soft); opacity: .55; border-radius: 1px; }
.sdk-gridlines .v1 { top: 0; bottom: 0; left: calc(100% / 3); width: 2px; transform: translateX(-1px); }
.sdk-gridlines .v2 { top: 0; bottom: 0; left: calc(200% / 3); width: 2px; transform: translateX(-1px); }
.sdk-gridlines .h1 { left: 0; right: 0; top: calc(100% / 3); height: 2px; transform: translateY(-1px); }
.sdk-gridlines .h2 { left: 0; right: 0; top: calc(200% / 3); height: 2px; transform: translateY(-1px); }
.sdk-pad { display: grid; grid-template-columns: repeat(9, 1fr); gap: 5px; }
.sdk-num { position: relative; height: 33px; border: 1px solid var(--sdk-line); border-radius: 9px; background: var(--sdk-card); color: var(--sdk-blue); font: inherit; font-size: 15px; font-weight: 550; font-variant-numeric: tabular-nums; cursor: pointer; transition: background .12s ease, border-color .12s ease, transform .08s ease; }
.sdk-num:hover { border-color: var(--sdk-blue-mid); background: var(--sdk-blue-soft); }
.sdk-num:active { transform: translateY(1px); }
.sdk-num.done { color: #c3c9cf; background: #f4f2ec; border-color: #eeeae1; }
.sdk-num small { position: absolute; right: 4px; bottom: 1px; color: #a9b1b9; font-size: 8px; font-weight: 400; }
.sdk-tools { display: flex; flex-wrap: wrap; gap: 6px; }
.sdk-tool { height: 26px; padding: 0 10px; border: 1px solid transparent; border-radius: 8px; background: transparent; color: var(--sdk-ink-soft); font: inherit; font-size: 11px; cursor: pointer; transition: background .12s ease, color .12s ease; }
.sdk-tool:hover { background: #efece4; color: var(--sdk-ink); }
.sdk-tool.on { background: var(--sdk-blue-soft); color: var(--sdk-blue); }
.sdk-tool[disabled] { opacity: .35; cursor: default; background: transparent; }
.sdk-foot { margin-top: auto; padding-top: 2px; color: #9aa3ad; font-size: 9.5px; line-height: 1.5; }
.sdk-win-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px; border-radius: 10px; background: color-mix(in srgb, var(--sdk-card) 94%, transparent); backdrop-filter: blur(3px); text-align: center; }
.sdk-win-overlay strong { color: var(--sdk-blue); font-size: 19px; font-weight: 650; }
.sdk-win-overlay span { color: var(--sdk-ink-soft); font-size: 12px; }
.sdk-generating { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; border-radius: 10px; background: color-mix(in srgb, var(--sdk-card) 90%, transparent); color: var(--sdk-ink-soft); font-size: 12px; }
.sdk-spin { width: 24px; height: 24px; border: 2px solid var(--sdk-blue-soft); border-top-color: var(--sdk-blue); border-radius: 50%; animation: sdk-spin .8s linear infinite; }
@keyframes sdk-spin { to { transform: rotate(360deg); } }
.sdk-mini .sdk-body, .sdk-mini .sdk-foot { display: none; }
.sdk-mini { min-height: 0; resize: none; }
@media (max-width: 520px) { .sdk-win { min-width: 306px; } .sdk-num { height: 30px; } }
`;
`;

t = t.slice(0, cssStart) + css + t.slice(cssEnd + 2);
writeFileSync('client.js', t, 'utf8');
console.log('css replaced:', before !== t);
