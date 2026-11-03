/* Browser half of the Sudoku bundle: local generator + draggable game window. */
window.__ModuleLoader__.load({
  id: '@local/sudoku',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useEffect, useMemo, useRef, useState, useReducer } = React;

    const UI_KEY = 'sudoku.ui.v2';
    const GAME_KEY = 'sudoku.game.v1';
    const BEST_KEY = 'sudoku.best.v1';
    const FULL = 0x1ff;

    const DIFFICULTIES = [
      { id: 'hard', label: 'Hard', clues: 32, level: 3, effort: 3, note: 'Standard hard' },
      { id: 'expert', label: 'Expert', clues: 28, level: 4, effort: 8, note: 'Multi-step' },
      { id: 'master', label: 'Master', clues: 24, level: 6, effort: 16, note: 'Brutal' },
    ];
    const DIFF_BY_ID = Object.fromEntries(DIFFICULTIES.map((d) => [d.id, d]));

    /* ------------------------------------------------------------------ engine */

    const rowOf = (i) => (i / 9) | 0;
    const colOf = (i) => i % 9;
    const boxOf = (i) => (((i / 27) | 0) * 3) + (((i % 9) / 3) | 0);

    function shuffle(list) {
      const out = list.slice();
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = out[i];
        out[i] = out[j];
        out[j] = tmp;
      }
      return out;
    }

    function bitsOf(mask) {
      const out = [];
      for (let d = 1; d <= 9; d += 1) if (mask & (1 << (d - 1))) out.push(d);
      return out;
    }

    function popcount(mask) {
      let n = 0;
      let m = mask;
      while (m) { m &= m - 1; n += 1; }
      return n;
    }

    function usedMask(grid, row, col) {
      let used = 0;
      for (let k = 0; k < 9; k += 1) {
        const a = grid[row * 9 + k];
        if (a) used |= 1 << (a - 1);
        const b = grid[k * 9 + col];
        if (b) used |= 1 << (b - 1);
      }
      const br = ((row / 3) | 0) * 3;
      const bc = ((col / 3) | 0) * 3;
      for (let dr = 0; dr < 3; dr += 1) {
        for (let dc = 0; dc < 3; dc += 1) {
          const v = grid[(br + dr) * 9 + bc + dc];
          if (v) used |= 1 << (v - 1);
        }
      }
      return used;
    }

    function solveGrid(input, randomize) {
      const grid = input.slice();
      function walk() {
        let best = -1;
        let bestMask = 0;
        let bestCount = 10;
        for (let i = 0; i < 81; i += 1) {
          if (grid[i]) continue;
          const mask = FULL & ~usedMask(grid, rowOf(i), colOf(i));
          const count = popcount(mask);
          if (count === 0) return false;
          if (count < bestCount) {
            bestCount = count;
            best = i;
            bestMask = mask;
            if (count === 1) break;
          }
        }
        if (best < 0) return true;
        const digits = randomize ? shuffle(bitsOf(bestMask)) : bitsOf(bestMask);
        for (const digit of digits) {
          grid[best] = digit;
          if (walk()) return true;
          grid[best] = 0;
        }
        return false;
      }
      return walk() ? grid : null;
    }

    function countSolutions(input, limit) {
      const grid = input.slice();
      let found = 0;
      function walk() {
        let best = -1;
        let bestMask = 0;
        let bestCount = 10;
        for (let i = 0; i < 81; i += 1) {
          if (grid[i]) continue;
          const mask = FULL & ~usedMask(grid, rowOf(i), colOf(i));
          const count = popcount(mask);
          if (count === 0) return;
          if (count < bestCount) {
            bestCount = count;
            best = i;
            bestMask = mask;
            if (count === 1) break;
          }
        }
        if (best < 0) { found += 1; return; }
        for (const digit of bitsOf(bestMask)) {
          grid[best] = digit;
          walk();
          grid[best] = 0;
          if (found >= limit) return;
        }
      }
      walk();
      return found;
    }

    /** Dig holes while keeping the solution unique (180°-symmetric first). */
    function digHoles(solution, targetClues) {
      const puzzle = solution.slice();
      let clues = 81;
      const pairs = [];
      for (let i = 0; i < 41; i += 1) pairs.push(i);
      for (const i of shuffle(pairs)) {
        const j = 80 - i;
        if (!puzzle[i] && !puzzle[j]) continue;
        const a = puzzle[i];
        const b = puzzle[j];
        puzzle[i] = 0;
        puzzle[j] = 0;
        if (countSolutions(puzzle, 2) !== 1) {
          puzzle[i] = a;
          puzzle[j] = b;
        } else {
          clues -= (a ? 1 : 0) + (b ? 1 : 0);
        }
        if (clues <= targetClues) break;
      }
      if (clues > targetClues) {
        for (const i of shuffle([...Array(81).keys()])) {
          if (clues <= targetClues) break;
          if (!puzzle[i]) continue;
          const a = puzzle[i];
          puzzle[i] = 0;
          if (countSolutions(puzzle, 2) !== 1) puzzle[i] = a;
          else clues -= 1;
        }
      }
      return { puzzle, clues };
    }

    function candidatesOf(grid) {
      const cands = new Array(81).fill(0);
      for (let i = 0; i < 81; i += 1) {
        if (!grid[i]) cands[i] = FULL & ~usedMask(grid, rowOf(i), colOf(i));
      }
      return cands;
    }

    const UNITS = (() => {
      const units = [];
      for (let r = 0; r < 9; r += 1) units.push([...Array(9).keys()].map((c) => r * 9 + c));
      for (let c = 0; c < 9; c += 1) units.push([...Array(9).keys()].map((r) => r * 9 + c));
      for (let br = 0; br < 3; br += 1) {
        for (let bc = 0; bc < 3; bc += 1) {
          const unit = [];
          for (let dr = 0; dr < 3; dr += 1) for (let dc = 0; dc < 3; dc += 1) unit.push((br * 3 + dr) * 9 + bc * 3 + dc);
          units.push(unit);
        }
      }
      return units;
    })();

    const PEERS = (() => {
      const peers = [];
      for (let i = 0; i < 81; i += 1) {
        const set = new Set();
        for (const unit of UNITS) {
          if (unit.includes(i)) unit.forEach((cell) => { if (cell !== i) set.add(cell); });
        }
        peers.push([...set]);
      }
      return peers;
    })();

    /**
     * Human-technique rating: 1 singles, 2 hidden singles, 3 pairs/pointing,
     * 4 X-Wing, 6 requires guessing. Higher is harder.
     */
    function ratePuzzle(puzzle) {
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

    /**
     * Search effort: how many times a singles-only solver has to branch before
     * the puzzle falls. This is what separates the tiers far better than clue
     * count alone.
     */
    function guessEffort(puzzle) {
      let branches = 0;
      let nodes = 0;
      const BRANCH_CAP = 64;
      const NODE_CAP = 20000;
      const solveSingles = (grid) => {
        for (let guard = 0; guard < 400; guard += 1) {
          let cands = candidatesOf(grid);
          let placed = false;
          for (let i = 0; i < 81; i += 1) {
            if (grid[i]) continue;
            if (popcount(cands[i]) === 0) return false;
            if (popcount(cands[i]) === 1) {
              grid[i] = bitsOf(cands[i])[0];
              placed = true;
              break;
            }
          }
          if (placed) continue;
          outer: for (const unit of UNITS) {
            for (let d = 1; d <= 9; d += 1) {
              const bit = 1 << (d - 1);
              if (unit.some((i) => grid[i] === d)) continue;
              const spots = unit.filter((i) => !grid[i] && (cands[i] & bit));
              if (spots.length === 1) {
                grid[spots[0]] = d;
                placed = true;
                break outer;
              }
            }
          }
          if (!placed) {
            cands = candidatesOf(grid);
            for (let i = 0; i < 81; i += 1) if (!grid[i] && popcount(cands[i]) === 0) return false;
            return grid.every((value) => value !== 0) ? true : null;
          }
        }
        return null;
      };

      const walk = (grid) => {
        nodes += 1;
        if (nodes > NODE_CAP || branches >= BRANCH_CAP) return true;
        const state = solveSingles(grid);
        if (state === true) return true;
        if (state === false) return false;
        const cands = candidatesOf(grid);
        let best = -1;
        let bestMask = 0;
        let bestCount = 10;
        for (let i = 0; i < 81; i += 1) {
          if (grid[i]) continue;
          const count = popcount(cands[i]);
          if (count < bestCount) { bestCount = count; best = i; bestMask = cands[i]; }
        }
        if (best < 0) return true;
        branches += 1;
        for (const digit of bitsOf(bestMask)) {
          const copy = grid.slice();
          copy[best] = digit;
          if (walk(copy)) return true;
          if (nodes > NODE_CAP || branches >= BRANCH_CAP) return true;
        }
        return false;
      };

      return walk(puzzle.slice()) ? branches : 999;
    }

    async function generatePuzzle(kind, deadlineMs) {
      const cfg = DIFF_BY_ID[kind] || DIFF_BY_ID.hard;
      const deadline = performance.now() + (deadlineMs || (cfg.id === 'master' ? 5000 : 4500));
      let best = null;
      let attempts = 0;
      let lastYield = performance.now();
      while (performance.now() < deadline) {
        const solution = solveGrid(new Array(81).fill(0), true);
        if (!solution) continue;
        const dug = digHoles(solution, cfg.clues);
        const level = ratePuzzle(dug.puzzle);
        const effort = guessEffort(dug.puzzle);
        attempts += 1;
        const candidate = { puzzle: dug.puzzle, solution, clues: dug.clues, level, effort, attempts };
        const accepted = dug.clues <= cfg.clues && effort >= cfg.effort;
        if (accepted) return candidate;
        if (!best || candidate.effort > best.effort || (candidate.effort === best.effort && candidate.clues < best.clues)) best = candidate;
        if (performance.now() - lastYield > 30) {
          lastYield = performance.now();
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
      return best;
    }

    /* ------------------------------------------------------------- UI store */

    const uiState = {
      open: false,
      x: null,
      y: null,
      w: 392,
      h: 568,
      minimized: false,
    };
    const uiListeners = new Set();
    try {
      const saved = JSON.parse(window.localStorage.getItem(UI_KEY) || 'null');
      if (saved && typeof saved === 'object') Object.assign(uiState, saved);
    } catch { /* ignore */ }

    let uiSaveTimer = null;
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
    }

    function useUi() {
      const [, force] = useReducer((value) => value + 1, 0);
      useEffect(() => {
        uiListeners.add(force);
        return () => { uiListeners.delete(force); };
      }, []);
      return uiState;
    }

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    /* ------------------------------------------------------------ game state */

    function emptyGame(difficulty) {
      return {
        difficulty,
        puzzle: new Array(81).fill(0),
        solution: new Array(81).fill(0),
        values: new Array(81).fill(0),
        notes: new Array(81).fill(0),
        elapsed: 0,
        hints: 0,
        mistakes: 0,
        done: false,
        clueCount: 0,
        level: 0,
        effort: 0,
        startedAt: Date.now(),
      };
    }

    function loadSavedGame() {
      try {
        const saved = JSON.parse(window.localStorage.getItem(GAME_KEY) || 'null');
        if (!saved || !Array.isArray(saved.puzzle) || saved.puzzle.length !== 81) return null;
        return saved;
      } catch {
        return null;
      }
    }

    function fmtTime(seconds) {
      const s = Math.max(0, Math.floor(seconds));
      const m = Math.floor(s / 60);
      return String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    }

    function readBest() {
      try { return JSON.parse(window.localStorage.getItem(BEST_KEY) || '{}') || {}; } catch { return {}; }
    }

    function writeBest(best) {
      try { window.localStorage.setItem(BEST_KEY, JSON.stringify(best)); } catch { /* ignore */ }
    }

    /* --------------------------------------------------------------- styles */

    const CSS = `
.sdk-launcher { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 30px; padding: 0 9px; border: 0; border-radius: 8px; background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; cursor: pointer; }
.sdk-launcher:hover { background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2)); color: var(--dsw-alias-label-primary); }
.sdk-launcher[aria-pressed="true"] { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, transparent); color: var(--dsw-alias-brand-primary); }
.sdk-launcher-icon { display: inline-flex; width: 18px; height: 18px; }
.sdk-launcher-icon svg { width: 18px; height: 18px; }

.sdk-layer { position: fixed; inset: 0; z-index: 60; pointer-events: none; }
.sdk-win, .sdk-win * { box-sizing: border-box; }
.sdk-win {
  --sdk-serif: var(--dsh-font-family-brand, "Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", "SimSun", Georgia, serif);
  --sdk-paper: #f7f1e4;
  --sdk-paper-2: #fffdf6;
  --sdk-paper-3: #efe6d4;
  --sdk-ink: #241e18;
  --sdk-ink-2: #5d4f3f;
  --sdk-ink-3: #8b7b66;
  --sdk-line: #b9a98f;
  --sdk-line-strong: #2a211a;
  --sdk-red: #b23a2c;
  --sdk-red-2: #8e2a1e;
  --sdk-red-soft: #f1d8cf;
  --sdk-red-wash: #f7e7e0;
  --sdk-seal-text: #fff7ef;
  --sdk-shadow: 0 26px 64px rgba(46, 34, 22, .26), 0 2px 6px rgba(46, 34, 22, .08);
  position: fixed;
  display: flex;
  flex-direction: column;
  min-width: 348px;
  max-width: calc(100vw - 24px);
  border: 1px solid var(--sdk-line);
  border-radius: 16px;
  background:
    radial-gradient(120% 70% at 10% 0%, color-mix(in srgb, var(--sdk-red) 7%, transparent), transparent 58%),
    repeating-linear-gradient(0deg, color-mix(in srgb, var(--sdk-ink) 2.2%, transparent) 0 1px, transparent 1px 4px),
    var(--sdk-paper);
  color: var(--sdk-ink);
  box-shadow: var(--sdk-shadow);
  overflow: hidden;
  pointer-events: auto;
  font-family: var(--dsh-font-family-text-default, "Segoe UI", system-ui, sans-serif);
  -webkit-font-smoothing: antialiased;
}
.sdk-win[data-theme="dark"] {
  --sdk-paper: #171210;
  --sdk-paper-2: #221a15;
  --sdk-paper-3: #2b211a;
  --sdk-ink: #f4e9d8;
  --sdk-ink-2: #cbb89f;
  --sdk-ink-3: #9a8871;
  --sdk-line: #7d6a54;
  --sdk-line-strong: #e8d8bf;
  --sdk-red: #e05743;
  --sdk-red-2: #f0785f;
  --sdk-red-soft: #4a241d;
  --sdk-red-wash: #3a1d17;
  --sdk-shadow: 0 30px 72px rgba(0, 0, 0, .6), 0 2px 6px rgba(0, 0, 0, .35);
}
.sdk-win::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: linear-gradient(180deg, var(--sdk-red), var(--sdk-red-2)); }

.sdk-head { display: flex; align-items: center; gap: 10px; padding: 12px 13px 9px 16px; border-bottom: 1px solid color-mix(in srgb, var(--sdk-line) 55%, transparent); cursor: move; user-select: none; touch-action: none; }
.sdk-seal { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 5px; background: var(--sdk-red); color: var(--sdk-seal-text); font-family: var(--sdk-serif); font-size: 15px; font-weight: 700; transform: rotate(-2deg); box-shadow: 0 2px 0 var(--sdk-red-2); }
.sdk-title { display: flex; flex-direction: column; min-width: 0; }
.sdk-title b { color: var(--sdk-ink); font-family: var(--sdk-serif); font-size: 15px; font-weight: 700; letter-spacing: .16em; }
.sdk-title span { margin-top: 1px; color: var(--sdk-ink-3); font-size: 10px; letter-spacing: .03em; }
.sdk-spacer { flex: 1; }
.sdk-iconbtn { display: inline-flex; align-items: center; justify-content: center; width: 25px; height: 25px; padding: 0; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--sdk-ink-3); font: inherit; font-size: 12px; line-height: 1; cursor: pointer; }
.sdk-iconbtn:hover { border-color: var(--sdk-line); color: var(--sdk-red); }

.sdk-body { display: flex; flex-direction: column; gap: 10px; flex: 1; min-height: 0; padding: 13px 13px 15px 16px; overflow: auto; }
.sdk-body-walk { gap: 7px; padding: 9px 13px 11px 16px; }
.sdk-row { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.sdk-seg { display: inline-flex; gap: 2px; padding: 2px; border: 1px solid var(--sdk-line); border-radius: 8px; background: var(--sdk-paper-3); }
.sdk-seg button { height: 24px; padding: 0 11px; border: 0; border-radius: 6px; background: transparent; color: var(--sdk-ink-2); font: inherit; font-family: var(--sdk-serif); font-size: 11.5px; letter-spacing: .08em; cursor: pointer; }
.sdk-seg button:hover { color: var(--sdk-ink); }
.sdk-seg button.on { background: var(--sdk-red); color: var(--sdk-seal-text); font-weight: 600; }
.sdk-btn { height: 26px; padding: 0 11px; border: 1px solid var(--sdk-line); border-radius: 7px; background: var(--sdk-paper-2); color: var(--sdk-ink); font: inherit; font-size: 11.5px; cursor: pointer; }
.sdk-btn:hover { border-color: var(--sdk-red); color: var(--sdk-red); }
.sdk-btn.accent { border-color: transparent; background: var(--sdk-red); color: var(--sdk-seal-text); box-shadow: 0 2px 0 var(--sdk-red-2); }
.sdk-btn.accent:hover { background: var(--sdk-red-2); color: var(--sdk-seal-text); }
.sdk-meta { display: flex; align-items: center; gap: 12px; color: var(--sdk-ink-3); font-size: 10.5px; font-variant-numeric: tabular-nums; }
.sdk-meta b { color: var(--sdk-ink); font-weight: 600; }

.sdk-board-wrap { position: relative; align-self: center; margin: 2px 0 1px; }
.sdk-board-wrap::before, .sdk-board-wrap::after { content: ''; position: absolute; width: 9px; height: 9px; border: 0 solid var(--sdk-red); pointer-events: none; }
.sdk-board-wrap::before { top: -5px; left: -5px; border-top-width: 2px; border-left-width: 2px; }
.sdk-board-wrap::after { right: -5px; bottom: -5px; border-right-width: 2px; border-bottom-width: 2px; }
.sdk-board { position: relative; display: grid; grid-template-columns: repeat(9, 1fr); grid-template-rows: repeat(9, 1fr); gap: 1px; aspect-ratio: 1; padding: 1px; border: 2px solid var(--sdk-line-strong); border-radius: 2px; background: var(--sdk-line); box-shadow: 0 10px 24px rgba(0, 0, 0, .13); overflow: hidden; }
.sdk-cell { position: relative; display: flex; align-items: center; justify-content: center; min-width: 0; min-height: 0; padding: 0; border: 0; background: var(--sdk-paper-2); color: var(--sdk-ink); font-family: var(--sdk-serif); font-size: calc(var(--sdk-cell-size, 40px) * 0.56); font-weight: 600; cursor: pointer; transition: background .12s ease; }
.sdk-cell:hover { background: var(--sdk-paper-3); }
.sdk-cell.given { color: var(--sdk-ink); font-weight: 700; }
.sdk-cell.entered { color: var(--sdk-red); font-weight: 600; }
.sdk-cell.peer { background: color-mix(in srgb, var(--sdk-red) 5%, var(--sdk-paper-2)); }
.sdk-cell.same { background: var(--sdk-red-wash); }
.sdk-cell.sel { background: var(--sdk-red-soft); box-shadow: inset 0 0 0 2px var(--sdk-red); }
.sdk-cell.conflict { background: color-mix(in srgb, var(--sdk-red) 20%, var(--sdk-paper-2)); }
.sdk-cell.wrong { color: var(--sdk-red-2); }
.sdk-cell.hinted { color: var(--sdk-red); }
.sdk-cell:disabled { opacity: 1; cursor: default; }
.sdk-cell.review { cursor: default; }
.sdk-cell.review-hit { background: var(--sdk-red-soft); box-shadow: inset 0 0 0 2px var(--sdk-red); }
.sdk-notes { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); width: 100%; height: 100%; padding: 3px; color: var(--sdk-ink-3); font-family: var(--dsh-font-family-text-default, sans-serif); font-size: 8.5px; font-weight: 400; line-height: 1; }
.sdk-notes span { display: flex; align-items: center; justify-content: center; }
.sdk-gridlines { position: absolute; inset: 1px; pointer-events: none; }
.sdk-gridlines i { position: absolute; background: var(--sdk-line-strong); opacity: 1; border-radius: 0; }
.sdk-gridlines .v1 { top: 0; bottom: 0; left: calc(100% / 3); width: 2px; transform: translateX(-1px); }
.sdk-gridlines .v2 { top: 0; bottom: 0; left: calc(200% / 3); width: 2px; transform: translateX(-1px); }
.sdk-gridlines .h1 { left: 0; right: 0; top: calc(100% / 3); height: 2px; transform: translateY(-1px); }
.sdk-gridlines .h2 { left: 0; right: 0; top: calc(200% / 3); height: 2px; transform: translateY(-1px); }

.sdk-pad { display: grid; grid-template-columns: repeat(9, 1fr); gap: 4px; }
.sdk-num { position: relative; height: 31px; border: 1px solid var(--sdk-line); border-radius: 7px; background: var(--sdk-paper-2); color: var(--sdk-ink); font-family: var(--sdk-serif); font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; cursor: pointer; transition: background .12s ease, border-color .12s ease, color .12s ease; }
.sdk-num:hover { border-color: var(--sdk-red); background: var(--sdk-red-wash); color: var(--sdk-red); }
.sdk-num.done { color: var(--sdk-ink-3); opacity: .4; }
.sdk-num small { position: absolute; right: 3px; bottom: 0; color: var(--sdk-ink-3); font-family: var(--dsh-font-family-text-default, sans-serif); font-size: 8px; font-weight: 400; }

.sdk-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; }
.sdk-sep { width: 1px; height: 20px; margin: 0 2px; background: color-mix(in srgb, var(--sdk-line) 70%, transparent); }
.sdk-tool { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; min-width: 32px; height: auto; padding: 4px 3px 3px; border: 1px solid transparent; border-radius: 7px; background: transparent; color: var(--sdk-ink-2); font: inherit; font-size: 10.5px; line-height: 1.2; cursor: pointer; }
.sdk-tool:hover { background: var(--sdk-paper-3); color: var(--sdk-ink); }
.sdk-tool.on { background: var(--sdk-red-wash); color: var(--sdk-red); }
.sdk-tool[disabled] { opacity: .35; cursor: default; background: transparent; }
.sdk-tool small { color: var(--sdk-ink-3); font-family: var(--dsh-font-family-text-default, sans-serif); font-size: 9px; font-weight: 400; letter-spacing: .06em; opacity: .9; }
.sdk-tool.on small { color: color-mix(in srgb, var(--sdk-red) 70%, transparent); }

.sdk-walk { display: flex; flex-direction: column; gap: 7px; }
.sdk-walk-head { display: flex; align-items: baseline; gap: 8px; }
.sdk-walk-head b { color: var(--sdk-red); font-family: var(--sdk-serif); font-size: 12.5px; letter-spacing: .06em; }
.sdk-walk-head span { color: var(--sdk-ink-3); font-size: 10px; font-variant-numeric: tabular-nums; }
.sdk-walk-text { min-height: 42px; margin: 0; padding: 7px 9px; border: 1px solid var(--sdk-line); border-left: 3px solid var(--sdk-red); border-radius: 4px; background: var(--sdk-paper-2); color: var(--sdk-ink); font-size: 11.5px; line-height: 1.6; }
.sdk-walk-nav { display: flex; gap: 4px; }
.sdk-walk-nav button { flex: 1; height: 26px; border: 1px solid var(--sdk-line); border-radius: 6px; background: var(--sdk-paper-2); color: var(--sdk-ink); font: inherit; font-size: 11px; cursor: pointer; }
.sdk-walk-nav button:hover { border-color: var(--sdk-red); color: var(--sdk-red); }
.sdk-walk-nav button[disabled] { opacity: .4; cursor: default; }
.sdk-walk-nav button.exit { color: var(--sdk-ink-3); }

.sdk-win-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: color-mix(in srgb, var(--sdk-paper) 90%, transparent); backdrop-filter: blur(3px); text-align: center; }
.sdk-win-overlay strong { color: var(--sdk-red); font-family: var(--sdk-serif); font-size: 19px; letter-spacing: .12em; }
.sdk-win-overlay span { color: var(--sdk-ink-2); font-size: 11.5px; }
.sdk-generating { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px; background: color-mix(in srgb, var(--sdk-paper) 88%, transparent); color: var(--sdk-ink-2); font-size: 11.5px; }
.sdk-spin { width: 22px; height: 22px; border: 2px solid var(--sdk-red-soft); border-top-color: var(--sdk-red); border-radius: 50%; animation: sdk-spin .8s linear infinite; }
@keyframes sdk-spin { to { transform: rotate(360deg); } }

.sdk-resize { position: absolute; right: 2px; bottom: 2px; width: 15px; height: 15px; cursor: nwse-resize; touch-action: none; background: linear-gradient(135deg, transparent 48%, var(--sdk-red) 49%, var(--sdk-red) 51%, transparent 52%, transparent 60%, var(--sdk-red) 61%, var(--sdk-red) 63%, transparent 64%); opacity: .6; }
.sdk-resize:hover { opacity: 1; }
.sdk-mini .sdk-body, .sdk-mini .sdk-tools, .sdk-mini .sdk-pad { display: none; }
`;

    function IconGrid() {
      return h('svg', { viewBox: '0 0 20 20', width: 18, height: 18, 'aria-hidden': true, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4 },
        h('rect', { x: 3, y: 3, width: 14, height: 14, rx: 2 }),
        h('path', { d: 'M8.7 3v14M13.7 3v14M3 8.7h14M3 13.7h14' }),
        h('rect', { x: 3.8, y: 3.8, width: 4.4, height: 4.4, rx: .8, fill: 'currentColor', stroke: 'none', opacity: .8 }));
    }

    /* Follow the app theme: probe the base background token once and on every
       theme mutation, then drive the paper/ink palette from it. */
    function luminanceOf(color) {
      const parts = String(color).match(/[\d.]+/g);
      if (!parts || parts.length < 3) return null;
      const [r, g, b] = parts.map(Number);
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    }

    function detectThemeMode() {
      try {
        const anchor = document.querySelector('.sdk-win') || document.body;
        if (!anchor) return 'light';
        const probe = document.createElement('div');
        probe.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:1px;background-color:var(--dsw-alias-bg-base,transparent)';
        anchor.appendChild(probe);
        const value = getComputedStyle(probe).backgroundColor;
        probe.remove();
        const luminance = luminanceOf(value);
        if (luminance !== null && !/rgba?\(.*,\s*0\)$/.test(value)) return luminance < 0.5 ? 'dark' : 'light';

        const bodyBackground = document.body ? getComputedStyle(document.body).backgroundColor : '';
        const bodyLuminance = luminanceOf(bodyBackground);
        if (bodyLuminance !== null && !/rgba?\(.*,\s*0\)$/.test(bodyBackground)) return bodyLuminance < 0.5 ? 'dark' : 'light';
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } catch {
        return 'light';
      }
    }

    function useThemeMode() {
      const [mode, setMode] = useState(detectThemeMode);
      useEffect(() => {
        const update = () => setMode(detectThemeMode());
        const observer = new MutationObserver(update);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
        if (document.body) observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
        const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
        if (media && media.addEventListener) media.addEventListener('change', update);
        update();
        return () => {
          observer.disconnect();
          if (media && media.removeEventListener) media.removeEventListener('change', update);
        };
      }, []);
      return mode;
    }

    function FooterButton({ wide }) {
      const ui = useUi();
      return h('button', {
        type: 'button',
        className: 'sdk-launcher',
        title: 'Sudoku · generated locally',
        'aria-label': 'Open Sudoku',
        'aria-pressed': ui.open ? 'true' : 'false',
        onClick: () => setUi({ open: !ui.open, minimized: false }),
      },
      h('span', { className: 'sdk-launcher-icon' }, h(IconGrid)),
      wide ? h('span', null, 'Sudoku') : null);
    }

    /* ------------------------------------------------------------ walkthrough */

    const RATIO = 0.69;

    function unitName(unit) {
      const row = rowOf(unit[0]);
      const col = colOf(unit[0]);
      if (unit.every((i) => rowOf(i) === row)) return 'row ' + (row + 1);
      if (unit.every((i) => colOf(i) === col)) return 'column ' + (col + 1);
      return 'box ' + (boxOf(unit[0]) + 1);
    }

    function cellName(index) {
      return 'R' + (rowOf(index) + 1) + 'C' + (colOf(index) + 1);
    }

    /**
     * Full solution walkthrough: one step per human technique, and an explicit
     * trial step when the standard techniques stall (which is what master puzzles
     * are selected for).
     */
    function buildWalkthrough(puzzle, solution) {
      const grid = puzzle.slice();
      let cands = candidatesOf(grid);
      const steps = [];

      const record = (technique, title, detail, cells, digit) => {
        steps.push({ technique, title, detail, cells: cells.slice(), digit, grid: grid.slice() });
      };

      record('Initial', 'Initial grid', 'Given ' + puzzle.filter((value) => value !== 0).length + ' digits. Start with naked/hidden singles, then pairs, pointing and X-Wing.', [], 0);

      const tryPairs = () => {
        for (const unit of UNITS) {
          const empties = unit.filter((i) => !grid[i]);
          for (let a = 0; a < empties.length; a += 1) {
            const ca = cands[empties[a]];
            if (popcount(ca) !== 2) continue;
            for (let b = a + 1; b < empties.length; b += 1) {
              if (cands[empties[b]] !== ca) continue;
              const cells = [empties[a], empties[b]];
              let removed = 0;
              for (const cell of unit) {
                if (cell === cells[0] || cell === cells[1] || grid[cell]) continue;
                if (cands[cell] & ca) { cands[cell] &= ~ca; removed += 1; }
              }
              if (removed > 0) {
                record('Naked pair', 'Naked pair: ' + unitName(unit), 'In ' + unitName(unit) + ', ' + cellName(cells[0]) + ' and ' + cellName(cells[1]) + ' have exactly ' + bitsOf(ca).join(' and ') + ' as candidates. Those two digits must occupy these two cells, so they can be removed from the rest of the unit (' + removed + ' cells).', cells, 0);
                return true;
              }
            }
          }
        }
        return false;
      };

      const tryPointing = () => {
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
              const row = [...rows][0];
              let removed = 0;
              for (let c = 0; c < 9; c += 1) {
                const cell = row * 9 + c;
                if (boxOf(cell) === box || grid[cell]) continue;
                if (cands[cell] & bit) { cands[cell] &= ~bit; removed += 1; }
              }
              if (removed > 0) {
                record('Pointing', 'Pointing: row ' + (row + 1), 'In box ' + (box + 1) + ', ' + d + ' can only appear in row ' + (row + 1) + ' (' + spots.map(cellName).join(', ') + '). So the ' + d + ' in that row must lie inside this box, and can be removed from the rest of the row (' + removed + ' cells).', spots, 0);
                return true;
              }
            }
            if (cols.size === 1) {
              const col = [...cols][0];
              let removed = 0;
              for (let r = 0; r < 9; r += 1) {
                const cell = r * 9 + col;
                if (boxOf(cell) === box || grid[cell]) continue;
                if (cands[cell] & bit) { cands[cell] &= ~bit; removed += 1; }
              }
              if (removed > 0) {
                record('Pointing', 'Pointing: column ' + (col + 1), 'In box ' + (box + 1) + ', ' + d + ' can only appear in column ' + (col + 1) + ' (' + spots.map(cellName).join(', ') + '). So the ' + d + ' in that column must lie inside this box, and can be removed from the rest of the column (' + removed + ' cells).', spots, 0);
                return true;
              }
            }
          }
        }
        return false;
      };

      const tryBoxLine = () => {
        for (const unit of UNITS.slice(0, 18)) {
          for (let d = 1; d <= 9; d += 1) {
            const bit = 1 << (d - 1);
            if (unit.some((i) => grid[i] === d)) continue;
            const spots = unit.filter((i) => !grid[i] && (cands[i] & bit));
            if (spots.length < 2) continue;
            const boxes = new Set(spots.map(boxOf));
            if (boxes.size !== 1) continue;
            const box = [...boxes][0];
            let removed = 0;
            for (const cell of UNITS[18 + box]) {
              if (unit.includes(cell) || grid[cell]) continue;
              if (cands[cell] & bit) { cands[cell] &= ~bit; removed += 1; }
            }
            if (removed > 0) {
              record('Box/line', 'Box/line: ' + unitName(unit), 'In ' + unitName(unit) + ', ' + d + ' can only fall inside box ' + (box + 1) + ' (' + spots.map(cellName).join(', ') + '). The ' + d + ' in that box is therefore locked to this ' + (rowOf(unit[0]) === rowOf(unit[1]) ? 'row' : 'column') + ', so other cells in the box can lose ' + d + ' (' + removed + ' cells).', spots, 0);
              return true;
            }
          }
        }
        return false;
      };

      const tryWing = () => {
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
              const cells = [first.r * 9 + first.cols[0], first.r * 9 + first.cols[1], second.r * 9 + second.cols[0], second.r * 9 + second.cols[1]];
              let removed = 0;
              for (let r = 0; r < 9; r += 1) {
                if (r === first.r || r === second.r) continue;
                for (const c of first.cols) {
                  const cell = r * 9 + c;
                  if (!grid[cell] && (cands[cell] & bit)) { cands[cell] &= ~bit; removed += 1; }
                }
              }
              if (removed > 0) {
                record('X-Wing', 'X-Wing: ' + d, 'Digit ' + d + ' has only two positions in row ' + (first.r + 1) + ' and row ' + (second.r + 1) + ', and they share the same columns (' + (first.cols[0] + 1) + ', ' + (first.cols[1] + 1) + '). These four cells form a rectangle with two ' + d + 's, so ' + d + ' can be removed from the other rows in those columns (' + removed + ' cells).', cells, 0);
                return true;
              }
            }
          }
        }
        return false;
      };

      for (let guard = 0; guard < 1000; guard += 1) {
        if (grid.every((value) => value !== 0)) break;
        let placed = false;

        for (let i = 0; i < 81; i += 1) {
          if (!grid[i] && popcount(cands[i]) === 1) {
            const digit = bitsOf(cands[i])[0];
            grid[i] = digit;
            cands = candidatesOf(grid);
            record('Naked single', 'Naked single: ' + cellName(i), cellName(i) + ' has only ' + digit + ' left once its row, column and box are considered.', [i], digit);
            placed = true;
            break;
          }
        }
        if (placed) continue;

        outer: for (const unit of UNITS) {
          for (let d = 1; d <= 9; d += 1) {
            const bit = 1 << (d - 1);
            if (unit.some((i) => grid[i] === d)) continue;
            const spots = unit.filter((i) => !grid[i] && (cands[i] & bit));
            if (spots.length === 1) {
              const index = spots[0];
              grid[index] = d;
              cands = candidatesOf(grid);
              record('Hidden single', 'Hidden single: ' + cellName(index) + ' = ' + d, 'In ' + unitName(unit) + ', ' + d + ' fits only in ' + cellName(index) + '; every other empty cell is excluded, so ' + d + ' must go there.', [index], d);
              placed = true;
              break outer;
            }
          }
        }
        if (placed) continue;

        if (tryPairs() || tryPointing() || tryBoxLine() || tryWing()) continue;

        let best = -1;
        let bestMask = 0;
        let bestCount = 10;
        for (let i = 0; i < 81; i += 1) {
          if (grid[i]) continue;
          const count = popcount(cands[i]);
          if (count < bestCount) { bestCount = count; best = i; bestMask = cands[i]; }
        }
        if (best < 0) break;
        const digit = solution[best];
        if (!(bestMask & (1 << (digit - 1)))) continue;
        grid[best] = digit;
        cands = candidatesOf(grid);
        record('Trial', 'Trial: ' + cellName(best) + ' = ' + digit, 'Naked/hidden singles, pairs, pointing and X-Wing cannot advance. Take the cell with the fewest candidates, ' + cellName(best) + ' (' + bestCount + ' candidates), and try ' + digit + '; this branch is solvable, so it stands. Backtrack and try another candidate if it later contradicts.', [best], digit);
      }

      return { steps, solved: grid.every((value) => value !== 0) };
    }

    /* ---------------------------------------------------------------- window */

    function SudokuWindow({ ui }) {
      const [game, setGame] = useState(() => loadSavedGame() || emptyGame('hard'));
      const [selected, setSelected] = useState(-1);
      const [notesMode, setNotesMode] = useState(false);
      const [autoNotes, setAutoNotes] = useState(false);
      const [paused, setPaused] = useState(false);
      const [generating, setGenerating] = useState(false);
      const [checking, setChecking] = useState(false);
      const [showWin, setShowWin] = useState(false);
      const [best, setBest] = useState(readBest);
      const [, setViewportTick] = useState(0);
      const theme = useThemeMode();
      const [walk, setWalk] = useState(null);
      const undoRef = useRef([]);
      const redoRef = useRef([]);
      const winRef = useRef(null);
      const timerRef = useRef(null);
      const gameRef = useRef(game);
      gameRef.current = game;
      const generationRef = useRef(0);

      const bootedRef = useRef(false);
      useEffect(() => {
        if (bootedRef.current) return;
        bootedRef.current = true;
        if (!game.puzzle.some((value) => value !== 0)) newGame(game.difficulty || 'hard');
      }, []);

      useEffect(() => {
        const onResize = () => setViewportTick((value) => value + 1);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      }, []);

      useEffect(() => {
        try { window.localStorage.setItem(GAME_KEY, JSON.stringify(game)); } catch { /* ignore */ }
      }, [game]);

      useEffect(() => {
        if (paused || walk || game.done || generating) {
          if (timerRef.current) clearInterval(timerRef.current);
          return undefined;
        }
        timerRef.current = setInterval(() => {
          setGame((current) => (current.done ? current : { ...current, elapsed: current.elapsed + 1 }));
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
      }, [paused, walk, game.done, generating]);

      const newGame = async (difficulty) => {
        const token = generationRef.current + 1;
        generationRef.current = token;
        setGenerating(true);
        setShowWin(false);
        setWalk(null);
        await new Promise((resolve) => setTimeout(resolve, 20));
        const created = await generatePuzzle(difficulty);
        if (token !== generationRef.current) return;
        setGenerating(false);
        if (!created) return;
        const next = emptyGame(difficulty);
        next.puzzle = created.puzzle;
        next.solution = created.solution;
        next.clueCount = created.clues;
        next.level = created.level;
        next.effort = created.effort;
        next.values = created.puzzle.slice();
        undoRef.current = [];
        redoRef.current = [];
        setSelected(-1);
        setPaused(false);
        setChecking(false);
        setGame(next);
      };

      const applyValue = (index, digit) => {
        const current = gameRef.current;
        if (current.done || walk || generating || paused || current.puzzle[index]) return;
        const prevValue = current.values[index];
        const prevNotes = current.notes[index];
        if (notesMode && !digit) {
          if (!prevNotes) return;
          undoRef.current.push({ index, value: prevValue, notes: prevNotes });
          redoRef.current = [];
          setGame({ ...current, notes: current.notes.map((mask, i) => (i === index ? 0 : mask)) });
          return;
        }
        if (notesMode) {
          const bit = 1 << (digit - 1);
          const nextNotes = prevNotes ^ bit;
          undoRef.current.push({ index, value: prevValue, notes: prevNotes });
          redoRef.current = [];
          setGame({ ...current, notes: current.notes.map((mask, i) => (i === index ? nextNotes : mask)) });
          return;
        }
        const valueAt = prevValue === digit ? 0 : digit;
        const wrong = valueAt !== 0 && valueAt !== current.solution[index];
        undoRef.current.push({ index, value: prevValue, notes: prevNotes });
        redoRef.current = [];
        const values = current.values.slice();
        values[index] = valueAt;
        const notes = current.notes.slice();
        notes[index] = 0;
        const next = { ...current, values, notes, mistakes: current.mistakes + (wrong ? 1 : 0), lastWrong: wrong ? index : -1 };
        if (values.every((value, i) => value === next.solution[i])) {
          next.done = true;
          const times = { ...best };
          if (!times[next.difficulty] || next.elapsed < times[next.difficulty]) {
            times[next.difficulty] = next.elapsed;
            writeBest(times);
            setBest(times);
          }
          setShowWin(true);
        }
        setGame(next);
      };

      const undo = () => {
        if (walk) return;
        const step = undoRef.current.pop();
        if (!step) return;
        const current = gameRef.current;
        redoRef.current.push({ index: step.index, value: current.values[step.index], notes: current.notes[step.index] });
        const values = current.values.slice();
        const notes = current.notes.slice();
        values[step.index] = step.value;
        notes[step.index] = step.notes;
        setGame({ ...current, values, notes, done: false });
        setShowWin(false);
      };

      const redo = () => {
        if (walk) return;
        const step = redoRef.current.pop();
        if (!step) return;
        const current = gameRef.current;
        undoRef.current.push({ index: step.index, value: current.values[step.index], notes: current.notes[step.index] });
        const values = current.values.slice();
        const notes = current.notes.slice();
        values[step.index] = step.value;
        notes[step.index] = step.notes;
        setGame({ ...current, values, notes });
      };

      const hint = () => {
        if (walk) return;
        const current = gameRef.current;
        if (current.done) return;
        const empties = current.values.map((value, i) => (value === 0 ? i : -1)).filter((i) => i >= 0);
        if (empties.length === 0) return;
        const index = selected >= 0 && current.values[selected] === 0 ? selected : empties[Math.floor(Math.random() * empties.length)];
        const value = current.solution[index];
        undoRef.current.push({ index, value: current.values[index], notes: current.notes[index] });
        redoRef.current = [];
        const values = current.values.slice();
        values[index] = value;
        const notes = current.notes.slice();
        notes[index] = 0;
        setGame({ ...current, values, notes, hints: current.hints + 1, lastWrong: -1 });
      };

      const check = () => {
        if (walk) return;
        setChecking(true);
        setTimeout(() => setChecking(false), 2400);
      };

      const restart = () => {
        const current = gameRef.current;
        undoRef.current = [];
        redoRef.current = [];
        setWalk(null);
        setGame({ ...current, values: current.puzzle.slice(), notes: new Array(81).fill(0), elapsed: 0, hints: 0, mistakes: 0, done: false });
        setShowWin(false);
        setSelected(-1);
      };

      const startWalk = () => {
        if (generating || walk) return;
        if (!game.solution.some((value) => value !== 0)) return;
        const result = buildWalkthrough(game.puzzle, game.solution);
        setWalk({ steps: result.steps, index: 0, solved: result.solved });
        setSelected(-1);
      };

      const stepWalk = (delta) => setWalk((current) => {
        if (!current) return current;
        return { ...current, index: Math.max(0, Math.min(current.steps.length - 1, current.index + delta)) };
      });

      useEffect(() => {
        const onKey = (event) => {
          const target = event.target;
          if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
          if (walk) {
            if (event.key === 'Escape') { setWalk(null); return; }
            if (event.key === 'ArrowLeft') { stepWalk(-1); event.preventDefault(); return; }
            if (event.key === 'ArrowRight') { stepWalk(1); event.preventDefault(); return; }
            return;
          }
          if (event.key === 'Escape') { setUi({ open: false }); return; }
          if (event.key === 'e' || event.key === 'E') { startWalk(); return; }
          if (event.key === 'n' || event.key === 'N') { setNotesMode((value) => !value); return; }
          if (event.key === 'h' || event.key === 'H') { hint(); return; }
          if (event.key === 'u' || event.key === 'U') { undo(); return; }
          if (event.key === 'y' || event.key === 'Y') { redo(); return; }
          if (event.key === 'r' || event.key === 'R') { restart(); return; }
          if (event.key === 'c' || event.key === 'C') { setAutoNotes((value) => !value); return; }
          if (event.key === 'k' || event.key === 'K') { check(); return; }
          if (/^[1-9]$/.test(event.key)) {
            if (selected >= 0) { applyValue(selected, Number(event.key)); event.preventDefault(); }
            return;
          }
          if (event.key === 'Backspace' || event.key === 'Delete') {
            if (selected >= 0) { applyValue(selected, 0); event.preventDefault(); }
            return;
          }
          const moves = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
          const move = moves[event.key];
          if (!move) return;
          event.preventDefault();
          const row = selected < 0 ? 0 : rowOf(selected);
          const col = selected < 0 ? 0 : colOf(selected);
          setSelected(Math.max(0, Math.min(8, row + move[0])) * 9 + Math.max(0, Math.min(8, col + move[1])));
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      });

      const onHeaderDown = (event) => {
        if (event.button !== 0) return;
        if (event.target.closest('button')) return;
        const rect = winRef.current ? winRef.current.getBoundingClientRect() : null;
        if (!rect) return;
        const start = { px: event.clientX, py: event.clientY, x: rect.left, y: rect.top };
        const onMove = (moveEvent) => {
          setUi({
            x: clamp(start.x + moveEvent.clientX - start.px, 8, window.innerWidth - 160),
            y: clamp(start.y + moveEvent.clientY - start.py, 8, window.innerHeight - 48),
          });
        };
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      };

      const maxWidth = Math.max(348, Math.min(440, window.innerWidth - 24, Math.round((window.innerHeight - 24) * RATIO)));
      const winW = clamp(Math.round(ui.w || 392), 348, maxWidth);
      const winH = Math.round(winW / RATIO);
      const sideMargin = Math.max(16, Math.round(winW * 0.082));
      const boardSize = Math.max(240, Math.min(winW - sideMargin * 2, winH - (walk ? 264 : 244)));

      const onResizeDown = (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        const startX = event.clientX;
        const startW = winW;
        const onMove = (moveEvent) => {
          const nextW = clamp(Math.round(startW + (moveEvent.clientX - startX)), 348, maxWidth);
          setUi({ w: nextW, h: Math.round(nextW / RATIO) });
        };
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      };

      const selectedValue = selected >= 0 ? game.values[selected] : 0;
      const cands = useMemo(() => (autoNotes ? candidatesOf(game.values) : null), [autoNotes, game.values]);
      const conflicts = useMemo(() => {
        const marks = new Set();
        for (const unit of UNITS) {
          const seen = new Map();
          for (const cell of unit) {
            const value = game.values[cell];
            if (!value) continue;
            if (seen.has(value)) { marks.add(cell); marks.add(seen.get(value)); }
            else seen.set(value, cell);
          }
        }
        return marks;
      }, [game.values]);
      const row = selected >= 0 ? rowOf(selected) : -1;
      const col = selected >= 0 ? colOf(selected) : -1;
      const box = selected >= 0 ? boxOf(selected) : -1;
      const digitsLeft = useMemo(() => {
        const counts = new Array(10).fill(0);
        for (const value of game.values) if (value) counts[value] += 1;
        return counts;
      }, [game.values]);

      const walkStep = walk ? walk.steps[walk.index] : null;
      const values = walkStep ? walkStep.grid : game.values;
      const highlighted = walkStep ? new Set(walkStep.cells) : null;
      const difficulty = DIFF_BY_ID[game.difficulty] || DIFF_BY_ID.hard;

      const style = {
        width: winW + 'px',
        height: winH + 'px',
        left: ui.x == null ? '50%' : clamp(ui.x, 8, window.innerWidth - 160) + 'px',
        top: ui.y == null ? '4%' : clamp(ui.y, 8, window.innerHeight - 48) + 'px',
        transform: ui.x == null ? 'translateX(-50%)' : 'none',
      };

      return h('div', { className: 'sdk-layer' },
        h('div', { ref: winRef, className: 'sdk-win' + (ui.minimized ? ' sdk-mini' : ''), style, role: 'dialog', 'aria-label': 'Sudoku', 'data-theme': theme },
          h('div', { className: 'sdk-head', onPointerDown: onHeaderDown },
            h('span', { className: 'sdk-seal' }, '9'),
            h('div', { className: 'sdk-title' },
              h('b', null, 'Sudoku'),
              h('span', null, difficulty.label + ' · ' + (walk ? 'Replay' : 'Trials ' + (game.effort || 0)) + ' · Best ' + (best[game.difficulty] ? fmtTime(best[game.difficulty]) : '—'))),
            h('span', { className: 'sdk-spacer' }),
            walk ? null : h('button', { type: 'button', className: 'sdk-iconbtn', title: paused ? 'Resume' : 'Pause', 'aria-label': paused ? 'Resume' : 'Pause', onClick: () => setPaused(!paused) }, paused ? '▶' : '❚❚'),
            h('button', { type: 'button', className: 'sdk-iconbtn', title: ui.minimized ? 'Expand' : 'Collapse', 'aria-label': ui.minimized ? 'Expand' : 'Collapse', onClick: () => setUi({ minimized: !ui.minimized }) }, ui.minimized ? '▢' : '—'),
            h('button', { type: 'button', className: 'sdk-iconbtn', title: 'Close', 'aria-label': 'Close Sudoku', onClick: () => setUi({ open: false }) }, '×')),
          h('div', { className: 'sdk-body' + (walk ? ' sdk-body-walk' : '') },
            h('div', { className: 'sdk-row' },
              h('div', { className: 'sdk-seg', role: 'group', 'aria-label': 'Difficulty' },
                DIFFICULTIES.map((item) => h('button', {
                  key: item.id,
                  type: 'button',
                  className: !walk && game.difficulty === item.id ? 'on' : '',
                  disabled: Boolean(walk) || generating,
                  onClick: () => newGame(item.id),
                }, item.label))),
              h('span', { className: 'sdk-spacer' }),
              h('button', { type: 'button', className: 'sdk-btn accent', disabled: Boolean(walk) || generating, onClick: () => newGame(game.difficulty) }, 'New game'),
              h('button', { type: 'button', className: 'sdk-btn', disabled: Boolean(walk) || generating, onClick: restart }, 'Restart')),
            h('div', { className: 'sdk-meta' },
              h('span', null, 'Time ', h('b', null, fmtTime(game.elapsed))),
              h('span', null, 'Clues ', h('b', null, String(game.clueCount || '—'))),
              h('span', null, 'Errors ', h('b', null, String(game.mistakes))),
              h('span', null, 'Hints ', h('b', null, String(game.hints)))),
            h('div', { className: 'sdk-board-wrap', style: { width: boardSize + 'px' } },
              h('div', { className: 'sdk-board', role: 'grid', 'aria-label': walk ? 'Solution board' : 'Sudoku board', style: { '--sdk-cell-size': Math.floor(boardSize / 9) + 'px' } },
                values.map((value, index) => {
                  const cellRow = rowOf(index);
                  const cellCol = colOf(index);
                  const isGiven = game.puzzle[index] !== 0;
                  const isPeer = !walk && selected >= 0 && index !== selected && (cellRow === row || cellCol === col || boxOf(index) === box);
                  const isSame = !walk && selectedValue !== 0 && value === selectedValue && index !== selected;
                  const isWrong = !walk && (checking || game.lastWrong === index) && value !== 0 && value !== game.solution[index];
                  const classes = ['sdk-cell'];
                  if (walk) classes.push('review');
                  if (isGiven) classes.push('given');
                  else if (value) classes.push('entered');
                  if (isPeer) classes.push('peer');
                  if (isSame) classes.push('same');
                  if (!walk && index === selected) classes.push('sel');
                  if (!walk && conflicts.has(index)) classes.push('conflict');
                  if (isWrong) classes.push('wrong');
                  if (walk && highlighted && highlighted.has(index)) classes.push('review-hit');
                  const notes = game.notes[index];
                  return h('button', {
                    key: index,
                    type: 'button',
                    className: classes.join(' '),
                    disabled: Boolean(walk),
                    style: paused && !walk ? { filter: 'blur(3px)' } : undefined,
                    onClick: () => { if (!walk) setSelected(index); },
                    'aria-label': 'Row ' + (cellRow + 1) + ', column ' + (cellCol + 1) + (value ? ', ' + value : ', empty'),
                  },
                  value ? String(value) : (!walk && autoNotes && !paused && cands && cands[index]
                    ? h('span', { className: 'sdk-notes' }, [...Array(9).keys()].map((d) => h('span', { key: d }, (cands[index] & (1 << d)) ? String(d + 1) : '')))
                    : (!walk && notes
                      ? h('span', { className: 'sdk-notes' }, [...Array(9).keys()].map((d) => h('span', { key: d }, (notes & (1 << d)) ? String(d + 1) : '')))
                      : null)));
                }),
                h('div', { className: 'sdk-gridlines', 'aria-hidden': true },
                  h('i', { className: 'v1' }), h('i', { className: 'v2' }), h('i', { className: 'h1' }), h('i', { className: 'h2' }))),
              generating ? h('div', { className: 'sdk-generating' }, h('div', { className: 'sdk-spin' }), 'Generating puzzle…') : null,
              showWin && !walk && !generating ? h('div', { className: 'sdk-win-overlay' },
                h('strong', null, 'Solved'),
                h('span', null, 'Time ' + fmtTime(game.elapsed) + ' · Hints ' + game.hints),
                h('div', { className: 'sdk-row' },
                  h('button', { type: 'button', className: 'sdk-btn accent', onClick: () => newGame(game.difficulty) }, 'New game'),
                  h('button', { type: 'button', className: 'sdk-btn', onClick: () => setShowWin(false) }, 'View board'))) : null),
            walk
              ? h('div', { className: 'sdk-walk' },
                h('div', { className: 'sdk-walk-head' },
                  h('b', null, walkStep.technique),
                  h('span', null, '· Step ' + (walk.index + 1) + ' / ' + walk.steps.length + (walkStep.digit ? ' · place ' + walkStep.digit : '') + (walk.solved ? '' : ' · incomplete'))),
                h('p', { className: 'sdk-walk-text' }, walkStep.detail),
                h('div', { className: 'sdk-walk-nav' },
                  h('button', { type: 'button', disabled: walk.index === 0, onClick: () => setWalk((c) => ({ ...c, index: 0 })) }, 'First'),
                  h('button', { type: 'button', disabled: walk.index === 0, onClick: () => stepWalk(-1) }, 'Prev'),
                  h('button', { type: 'button', disabled: walk.index >= walk.steps.length - 1, onClick: () => stepWalk(1) }, 'Next'),
                  h('button', { type: 'button', disabled: walk.index >= walk.steps.length - 1, onClick: () => setWalk((c) => ({ ...c, index: c.steps.length - 1 })) }, 'Last'),
                  h('button', { type: 'button', className: 'exit', onClick: () => setWalk(null) }, 'Exit')))
              : h(React.Fragment, null,
                h('div', { className: 'sdk-pad' },
                  [...Array(9).keys()].map((d) => h('button', {
                    key: d,
                    type: 'button',
                    className: 'sdk-num' + (digitsLeft[d + 1] >= 9 ? ' done' : ''),
                    disabled: generating,
                    onClick: () => { if (selected >= 0) applyValue(selected, d + 1); },
                  }, String(d + 1), h('small', null, digitsLeft[d + 1] >= 9 ? '' : String(9 - digitsLeft[d + 1]))))),
                h('div', { className: 'sdk-tools' },
                  h('button', { type: 'button', className: 'sdk-tool', onClick: () => applyValue(selected, 0), disabled: selected < 0 || generating || paused }, 'Erase', h('small', null, '⌫')),
                  h('button', { type: 'button', className: 'sdk-tool' + (notesMode ? ' on' : ''), onClick: () => setNotesMode(!notesMode), disabled: generating }, 'Notes', h('small', null, 'N')),
                  h('button', { type: 'button', className: 'sdk-tool' + (autoNotes ? ' on' : ''), onClick: () => setAutoNotes(!autoNotes), disabled: generating }, 'Cands', h('small', null, 'C')),
                  h('span', { className: 'sdk-sep' }),
                  h('button', { type: 'button', className: 'sdk-tool', onClick: undo, disabled: generating || undoRef.current.length === 0 }, 'Undo', h('small', null, 'U')),
                  h('button', { type: 'button', className: 'sdk-tool', onClick: redo, disabled: generating || redoRef.current.length === 0 }, 'Redo', h('small', null, 'Y')),
                  h('span', { className: 'sdk-sep' }),
                  h('button', { type: 'button', className: 'sdk-tool', onClick: hint, disabled: generating || game.done }, 'Hint', h('small', null, 'H')),
                  h('button', { type: 'button', className: 'sdk-tool', onClick: check, disabled: generating || game.done }, 'Check', h('small', null, 'K')),
                  h('button', { type: 'button', className: 'sdk-tool', onClick: startWalk, disabled: generating || game.done }, 'Solve', h('small', null, 'E'))))),
          h('div', { className: 'sdk-resize', title: 'Resize (keeps ratio)', onPointerDown: onResizeDown })));
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => {
          const tag = document.createElement('style');
          tag.setAttribute('data-plugin-css', 'sudoku');
          tag.textContent = CSS;
          document.head.appendChild(tag);
          return () => tag.remove();
        }, 'sudoku: styles');

        ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
          name: 'sidebar.footer.action',
          id: 'sudoku',
          order: 20,
          label: () => 'Sudoku',
        }, FooterButton));

        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'sudoku.window',
          order: 500,
        }, function SudokuOverlay() {
          const ui = useUi();
          if (!ui.open) return null;
          return h(SudokuWindow, { ui });
        }));
      },
    };
  },
});
