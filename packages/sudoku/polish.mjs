import { readFileSync, writeFileSync } from 'node:fs';

let t = readFileSync('client.js', 'utf8');
const before = t;

t = t.replace(
  `.sdk-tool { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; min-width: 42px; height: auto; padding: 4px 8px 3px; border: 1px solid transparent; border-radius: 8px; background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 11px; line-height: 1.2; cursor: pointer; }`,
  `.sdk-tool { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; min-width: 40px; height: auto; padding: 4px 6px 3px; border: 1px solid transparent; border-radius: 8px; background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 10.5px; line-height: 1.2; cursor: pointer; }`,
);
t = t.replace(
  `.sdk-cell.sel {`,
  `.sdk-cell:disabled { opacity: 1; cursor: default; }
.sdk-cell.sel {`,
);
t = t.replace(
  `  font-size: clamp(14px, 2.9vmin, 20px);`,
  `  font-size: calc(var(--sdk-cell-size, 40px) * 0.56);`,
);
t = t.replace(
  `      const boardSize = Math.max(250, Math.min(winW - 30, winH - 238));`,
  `      const boardSize = Math.max(250, Math.min(winW - 30, winH - 246));`,
);
t = t.replace(
  `              h('div', { className: 'sdk-board', role: 'grid', 'aria-label': walk ? '解答棋盘' : '数独棋盘' },`,
  `              h('div', { className: 'sdk-board', role: 'grid', 'aria-label': walk ? '解答棋盘' : '数独棋盘', style: { '--sdk-cell-size': Math.floor(boardSize / 9) + 'px' } },`,
);

/* viewport changes re-clamp size */
t = t.replace(
  `      const [best, setBest] = useState(readBest);`,
  `      const [best, setBest] = useState(readBest);
      const [, setViewportTick] = useState(0);`,
);
t = t.replace(
  `      useEffect(() => {
        try { window.localStorage.setItem(GAME_KEY, JSON.stringify(game)); } catch { /* ignore */ }
      }, [game]);`,
  `      useEffect(() => {
        const onResize = () => setViewportTick((value) => value + 1);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      }, []);

      useEffect(() => {
        try { window.localStorage.setItem(GAME_KEY, JSON.stringify(game)); } catch { /* ignore */ }
      }, [game]);`,
);

/* redo shortcut */
t = t.replace(
  `          if (event.key === 'u' || event.key === 'U') { undo(); return; }`,
  `          if (event.key === 'u' || event.key === 'U') { undo(); return; }
          if (event.key === 'y' || event.key === 'Y') { redo(); return; }`,
);

writeFileSync('client.js', t, 'utf8');
console.log('changed:', before !== t);
