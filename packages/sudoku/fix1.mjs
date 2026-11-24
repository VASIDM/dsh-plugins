import { readFileSync, writeFileSync } from 'node:fs';

let t = readFileSync('client.js', 'utf8');
const before = t;

/* 1) Replace the rating engine with one that keeps eliminations and places one
      digit per technique pass, so the level means something. */
const start = t.indexOf('    function ratePuzzle(puzzle) {');
const end = t.indexOf('    async function generatePuzzle(kind, deadlineMs) {');
if (start < 0 || end < 0) throw new Error('rate block not found');

const engine = String.raw`    function ratePuzzle(puzzle) {
      const grid = puzzle.slice();
      let cands = candidatesOf(grid);
      let level = 0;
      const bump = (value) => { if (value > level) level = value; };
      const place = (index, digit) => { grid[index] = digit; cands = candidatesOf(grid); };

      for (let step = 0; step < 500; step += 1) {
        let placed = false;

        // Naked single.
        for (let i = 0; i < 81; i += 1) {
          if (!grid[i] && popcount(cands[i]) === 1) {
            place(i, bitsOf(cands[i])[0]);
            bump(1);
            placed = true;
            break;
          }
        }
        if (placed) continue;

        // Hidden single: place exactly one, then re-derive candidates.
        outer: for (const unit of UNITS) {
          for (let d = 1; d <= 9; d += 1) {
            const bit = 1 << (d - 1);
            if (unit.some((i) => grid[i] === d)) continue;
            const spots = unit.filter((i) => !grid[i] && (cands[i] & bit));
            if (spots.length === 1) {
              place(spots[0], d);
              bump(2);
              placed = true;
              break outer;
            }
          }
        }
        if (placed) continue;

        // Eliminations (no placement): keep the reduced candidates.
        let removed = false;

        // Naked pairs.
        for (const unit of UNITS) {
          const empties = unit.filter((i) => !grid[i]);
          for (let a = 0; a < empties.length; a += 1) {
            const ca = cands[empties[a]];
            if (popcount(ca) !== 2) continue;
            for (let b = a + 1; b < empties.length; b += 1) {
              if (cands[empties[b]] !== ca) continue;
              for (const cell of unit) {
                if (cell === empties[a] || cell === empties[b] || grid[cell]) continue;
                if (cands[cell] & ca) { cands[cell] &= ~ca; removed = true; }
              }
            }
          }
        }
        if (removed) { bump(3); continue; }

        // Pointing: a box digit confined to one row/column.
        for (let box = 0; box < 9; box += 1) {
          const unit = UNITS[18 + box];
          for (let d = 1; d <= 9; d += 1) {
            const bit = 1 << (d - 1);
            if (unit.some((i) => grid[i] === d)) continue;
            const spots = unit.filter((i) => !grid[i] && (cands[i] & bit));
            if (spots.length < 2 || spots.length > 3) continue;
            const rows = new Set(spots.map(rowOf));
            const cols = new Set(spots.map(colOf));
            if (rows.size === 1) {
              const r = [...rows][0];
              for (let c = 0; c < 9; c += 1) {
                const cell = r * 9 + c;
                if (boxOf(cell) === box || grid[cell]) continue;
                if (cands[cell] & bit) { cands[cell] &= ~bit; removed = true; }
              }
            }
            if (cols.size === 1) {
              const c = [...cols][0];
              for (let r = 0; r < 9; r += 1) {
                const cell = r * 9 + c;
                if (boxOf(cell) === box || grid[cell]) continue;
                if (cands[cell] & bit) { cands[cell] &= ~bit; removed = true; }
              }
            }
          }
        }
        if (removed) { bump(3); continue; }

        // Box/line reduction: a line digit confined to one box.
        for (const unit of UNITS.slice(0, 18)) {
          const isRow = unit[1] - unit[0] === 1;
          for (let d = 1; d <= 9; d += 1) {
            const bit = 1 << (d - 1);
            if (unit.some((i) => grid[i] === d)) continue;
            const spots = unit.filter((i) => !grid[i] && (cands[i] & bit));
            if (spots.length < 2) continue;
            const boxes = new Set(spots.map(boxOf));
            if (boxes.size !== 1) continue;
            const box = [...boxes][0];
            for (const cell of UNITS[18 + box]) {
              if (unit.includes(cell) || grid[cell]) continue;
              if (cands[cell] & bit) { cands[cell] &= ~bit; removed = true; }
            }
          }
          void isRow;
        }
        if (removed) { bump(3); continue; }

        // X-Wing on rows.
        for (let d = 1; d <= 9; d += 1) {
          const bit = 1 << (d - 1);
          const rowSpots = [];
          for (let r = 0; r < 9; r += 1) {
            const cols = [];
            for (let c = 0; c < 9; c += 1) {
              const cell = r * 9 + c;
              if (!grid[cell] && (cands[cell] & bit)) cols.push(c);
            }
            if (cols.length === 2) rowSpots.push({ r, cols });
          }
          for (let a = 0; a < rowSpots.length; a += 1) {
            for (let b = a + 1; b < rowSpots.length; b += 1) {
              const first = rowSpots[a];
              const second = rowSpots[b];
              if (first.cols[0] !== second.cols[0] || first.cols[1] !== second.cols[1]) continue;
              for (const targetRow of [first.r, second.r]) {
                void targetRow;
              }
              for (let r = 0; r < 9; r += 1) {
                if (r === first.r || r === second.r) continue;
                for (const c of first.cols) {
                  const cell = r * 9 + c;
                  if (!grid[cell] && (cands[cell] & bit)) { cands[cell] &= ~bit; removed = true; }
                }
              }
            }
          }
        }
        if (removed) { bump(4); continue; }

        break;
      }

      if (grid.every((value) => value !== 0)) return level;
      return 6;
    }

`;
t = t.slice(0, start) + engine + t.slice(end);

/* 2) Difficulty tuning: all tiers above the usual easy ones. */
t = t.replace(
  `      { id: 'hard', label: '困难', clues: 34, level: 3, note: '常规高难' },
      { id: 'expert', label: '专家', clues: 30, level: 4, note: '进阶技巧' },
      { id: 'master', label: '大师', clues: 26, level: 6, note: '需要试错' },`,
  `      { id: 'hard', label: '困难', clues: 32, level: 3, note: '常规高难' },
      { id: 'expert', label: '专家', clues: 28, level: 4, note: 'X-Wing' },
      { id: 'master', label: '大师', clues: 24, level: 6, note: '需要试错' },`,
);

/* 3) Master gets a longer generation budget. */
t = t.replace(
  `      const deadline = performance.now() + (deadlineMs || 4500);`,
  `      const deadline = performance.now() + (deadlineMs || (cfg.id === 'master' ? 8000 : 5000));`,
);

/* 4) Remove the bogus duplicate "提示" metric. */
t = t.replace(
  `            h('span', null, '提示 ', h('b', null, String(game.cluesLeft == null ? '' : ''))),
`,
  '',
);

/* 5) Persist window size after a resize, and debounce UI persistence. */
t = t.replace(
  `    function setUi(patch) {
      Object.assign(uiState, patch);
      try { window.localStorage.setItem(UI_KEY, JSON.stringify({ ...uiState, open: false })); } catch { /* ignore */ }
      for (const listener of uiListeners) listener();
    }`,
  `    let uiSaveTimer = null;
    function persistUi() {
      if (uiSaveTimer) clearTimeout(uiSaveTimer);
      uiSaveTimer = setTimeout(() => {
        try { window.localStorage.setItem(UI_KEY, JSON.stringify({ ...uiState, open: false })); } catch { /* ignore */ }
      }, 250);
    }
    function setUi(patch) {
      Object.assign(uiState, patch);
      persistUi();
      for (const listener of uiListeners) listener();
    }`,
);

/* 6) Auto-generate the first puzzle when the saved game is empty. */
t = t.replace(
  `      /* persistence */`,
  `      const bootedRef = useRef(false);
      useEffect(() => {
        if (bootedRef.current) return;
        bootedRef.current = true;
        if (!game.puzzle.some((value) => value !== 0)) newGame(game.difficulty || 'hard');
      }, []);

      /* persistence */`,
);

/* 7) Keep the window size in the stored UI state. */
t = t.replace(
  `      /* drag */`,
  `      useEffect(() => {
        const node = winRef.current;
        if (!node || typeof ResizeObserver === 'undefined') return undefined;
        let timer = null;
        const observer = new ResizeObserver(() => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            const rect = node.getBoundingClientRect();
            setUi({ w: Math.round(rect.width), h: Math.round(rect.height) });
          }, 300);
        });
        observer.observe(node);
        return () => { if (timer) clearTimeout(timer); observer.disconnect(); };
      }, []);

      /* drag */`,
);

writeFileSync('client.js', t, 'utf8');
console.log('changed:', before !== t);
