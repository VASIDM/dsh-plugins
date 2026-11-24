/* Browser half of the Sudoku bundle: local generator + draggable game window. */
window.__ModuleLoader__.load({
  id: '@local/sudoku',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useEffect, useMemo, useRef, useState, useReducer } = React;

    const UI_KEY = 'sudoku.ui.v1';
    const GAME_KEY = 'sudoku.game.v1';
    const BEST_KEY = 'sudoku.best.v1';
    const FULL = 0x1ff;

    const DIFFICULTIES = [
      { id: 'hard', label: '困难', clues: 32, level: 3, effort: 3, note: '常规高难' },
      { id: 'expert', label: '专家', clues: 28, level: 4, effort: 8, note: '多步试错' },
      { id: 'master', label: '大师', clues: 24, level: 6, effort: 16, note: '硬核' },
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
        }
        return false;
      };

      return walk(puzzle.slice()) ? branches : 999;
    }

    async function generatePuzzle(kind, deadlineMs) {
      const cfg = DIFF_BY_ID[kind] || DIFF_BY_ID.hard;
      const deadline = performance.now() + (deadlineMs || (cfg.id === 'master' ? 6000 : 5000));
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
      w: 396,
      h: 664,
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

    /* ------------------------------------------------------------- component */

    function IconGrid() {
      return h('svg', { viewBox: '0 0 20 20', width: 18, height: 18, 'aria-hidden': true, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4 },
        h('rect', { x: 3, y: 3, width: 14, height: 14, rx: 2 }),
        h('path', { d: 'M8.7 3v14M13.7 3v14M3 8.7h14M3 13.7h14' }),
        h('rect', { x: 3.7, y: 3.7, width: 4.6, height: 4.6, fill: '#a63a2e', stroke: 'none' }));
    }

    function FooterButton({ wide }) {
      const ui = useUi();
      return h('button', {
        type: 'button',
        className: 'sdk-launcher',
        title: '数独 · 本地生成',
        'aria-label': '打开数独',
        'aria-pressed': ui.open ? 'true' : 'false',
        onClick: () => setUi({ open: !ui.open, minimized: false }),
      },
      h('span', { className: 'sdk-launcher-icon' }, h(IconGrid)),
      wide ? h('span', null, '数独') : null);
    }

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
      const undoRef = useRef([]);
      const redoRef = useRef([]);
      const winRef = useRef(null);
      const timerRef = useRef(null);
      const gameRef = useRef(game);
      gameRef.current = game;

      const bootedRef = useRef(false);
      useEffect(() => {
        if (bootedRef.current) return;
        bootedRef.current = true;
        if (!game.puzzle.some((value) => value !== 0)) newGame(game.difficulty || 'hard');
      }, []);

      /* persistence */
      useEffect(() => {
        try { window.localStorage.setItem(GAME_KEY, JSON.stringify(game)); } catch { /* ignore */ }
      }, [game]);

      /* timer */
      useEffect(() => {
        if (paused || game.done || !game.puzzle.some((value) => value === 0) || generating) {
          if (timerRef.current) clearInterval(timerRef.current);
          return undefined;
        }
        timerRef.current = setInterval(() => {
          setGame((current) => (current.done ? current : { ...current, elapsed: current.elapsed + 1 }));
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
      }, [paused, game.done, generating, game.puzzle]);

      const newGame = async (difficulty) => {
        setGenerating(true);
        setShowWin(false);
        await new Promise((resolve) => setTimeout(resolve, 30));
        const created = await generatePuzzle(difficulty);
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
        if (current.done || current.puzzle[index]) return;
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
        const next = {
          ...current,
          values,
          notes,
          mistakes: current.mistakes + (wrong ? 1 : 0),
          lastWrong: wrong ? index : -1,
        };
        if (values.every((value, i) => value === next.solution[i])) {
          next.done = true;
          next.elapsed = current.elapsed;
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
        const current = gameRef.current;
        const wrong = current.values.some((value, i) => value !== 0 && value !== current.solution[i]);
        setChecking(true);
        setTimeout(() => setChecking(false), 2600);
        if (!wrong) {
          setGame({ ...current, mistakes: current.mistakes });
        }
      };

      const restart = () => {
        const current = gameRef.current;
        undoRef.current = [];
        redoRef.current = [];
        setGame({ ...current, values: current.puzzle.slice(), notes: new Array(81).fill(0), elapsed: 0, hints: 0, mistakes: 0, done: false });
        setShowWin(false);
        setSelected(-1);
      };

      /* keyboard */
      useEffect(() => {
        const onKey = (event) => {
          const target = event.target;
          if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
          if (event.key === 'Escape') { setUi({ open: false }); return; }
          if (event.key === 'n' || event.key === 'N') { setNotesMode((value) => !value); return; }
          if (event.key === 'h' || event.key === 'H') { hint(); return; }
          if (event.key === 'u' || event.key === 'U') { undo(); return; }
          if (event.key === 'r' || event.key === 'R') { restart(); return; }
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

      const saveSize = () => {
        const node = winRef.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const nextW = Math.round(rect.width);
        const nextH = Math.round(rect.height);
        if (Math.abs(nextW - ui.w) > 2 || Math.abs(nextH - ui.h) > 2) {
          setUi({ w: nextW, h: nextH });
        }
      };

      /* drag */
      const onHeaderDown = (event) => {
        if (event.button !== 0) return;
        if (event.target.closest('button')) return;
        const rect = winRef.current ? winRef.current.getBoundingClientRect() : null;
        if (!rect) return;
        const start = { px: event.clientX, py: event.clientY, x: rect.left, y: rect.top };
        const onMove = (moveEvent) => {
          setUi({
            x: clamp(start.x + moveEvent.clientX - start.px, 8, window.innerWidth - 220),
            y: clamp(start.y + moveEvent.clientY - start.py, 8, window.innerHeight - 80),
          });
        };
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      };

      /* derived board state */
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

      const style = {
        width: ui.w + 'px',
        height: ui.h + 'px',
        left: ui.x == null ? '50%' : ui.x + 'px',
        top: ui.y == null ? '3%' : ui.y + 'px',
        transform: ui.x == null ? 'translateX(-50%)' : 'none',
      };

      const difficulty = DIFF_BY_ID[game.difficulty] || DIFF_BY_ID.hard;

      return h('div', { className: 'sdk-layer' },
        h('div', {
          ref: winRef,
          className: 'sdk-win' + (ui.minimized ? ' sdk-mini' : ''),
          style,
          role: 'dialog',
          'aria-label': '数独',
          onPointerUp: saveSize,
        },
        h('div', { className: 'sdk-head', onPointerDown: onHeaderDown },
          h('span', { className: 'sdk-seal' }, '数'),
          h('div', { className: 'sdk-title' },
            h('b', null, '数独'),
            h('span', null, difficulty.label + ' · ' + (game.effort ? '试错 ' + game.effort + ' 步' : '本地生成') + ' · 最佳 ' + (best[game.difficulty] ? fmtTime(best[game.difficulty]) : '—'))),
          h('span', { className: 'sdk-spacer' }),
          h('button', { type: 'button', className: 'sdk-iconbtn', title: ui.minimized ? '展开' : '收起', 'aria-label': ui.minimized ? '展开' : '收起', onClick: () => setUi({ minimized: !ui.minimized }) }, ui.minimized ? '▢' : '—'),
          h('button', { type: 'button', className: 'sdk-iconbtn', title: '关闭', 'aria-label': '关闭数独', onClick: () => setUi({ open: false }) }, '×')),
        h('div', { className: 'sdk-body' },
          h('div', { className: 'sdk-row' },
            h('div', { className: 'sdk-seg', role: 'group', 'aria-label': '难度' },
              DIFFICULTIES.map((item) => h('button', {
                key: item.id,
                type: 'button',
                className: game.difficulty === item.id ? 'on' : '',
                title: item.note,
                onClick: () => newGame(item.id),
              }, item.label))),
            h('span', { className: 'sdk-spacer' }),
            h('button', { type: 'button', className: 'sdk-btn accent', onClick: () => newGame(game.difficulty) }, '换一题'),
            h('button', { type: 'button', className: 'sdk-btn', onClick: restart }, '重来')),
          h('div', { className: 'sdk-meta' },
            h('span', null, '用时 ', h('b', null, fmtTime(game.elapsed))),
            h('span', null, '线索 ', h('b', null, String(game.clueCount || '—'))),
            h('span', null, '错误 ', h('b', null, String(game.mistakes))),
            h('span', null, '提示次数 ', h('b', null, String(game.hints))),
            h('button', { type: 'button', className: 'sdk-tool', onClick: () => setPaused(!paused) }, paused ? '继续' : '暂停')),
          h('div', { className: 'sdk-board-wrap' },
            h('div', { className: 'sdk-board', role: 'grid', 'aria-label': '数独棋盘' },
              game.values.map((value, index) => {
                const cellRow = rowOf(index);
                const cellCol = colOf(index);
                const isGiven = game.puzzle[index] !== 0;
                const isPeer = selected >= 0 && index !== selected && (cellRow === row || cellCol === col || boxOf(index) === box);
                const isSame = selectedValue !== 0 && value === selectedValue && index !== selected;
                const isWrong = (checking || game.lastWrong === index) && value !== 0 && value !== game.solution[index];
                const classes = ['sdk-cell'];
                if (isGiven) classes.push('given');
                else if (value) classes.push('entered');
                if (isPeer) classes.push('peer');
                if (isSame) classes.push('same');
                if (index === selected) classes.push('sel');
                if (conflicts.has(index)) classes.push('conflict');
                if (isWrong) classes.push('wrong');
                const notes = game.notes[index];
                return h('button', {
                  key: index,
                  type: 'button',
                  className: classes.join(' '),
                  style: paused ? { filter: 'blur(3px)' } : undefined,
                  onClick: () => setSelected(index),
                  'aria-label': '第' + (cellRow + 1) + '行第' + (cellCol + 1) + '列' + (value ? '，' + value : '，空'),
                },
                value ? String(value) : (autoNotes && !paused && cands && cands[index]
                  ? h('span', { className: 'sdk-notes' },
                    [...Array(9).keys()].map((d) => h('span', { key: d }, (cands[index] & (1 << d)) ? String(d + 1) : '')))
                  : notes
                    ? h('span', { className: 'sdk-notes' },
                      [...Array(9).keys()].map((d) => h('span', { key: d }, (notes & (1 << d)) ? String(d + 1) : '')))
                    : null));
              }),
              h('div', { className: 'sdk-gridlines', 'aria-hidden': true },
                h('i', { className: 'v1' }),
                h('i', { className: 'v2' }),
                h('i', { className: 'h1' }),
                h('i', { className: 'h2' }))),
            generating ? h('div', { className: 'sdk-generating' }, h('div', { className: 'sdk-spin' }), '正在本地生成题目…') : null,
            showWin && !generating ? h('div', { className: 'sdk-win-overlay' },
              h('strong', null, '完成'),
              h('span', null, '用时 ' + fmtTime(game.elapsed) + ' · 提示 ' + game.hints + ' 次'),
              h('div', { className: 'sdk-row' },
                h('button', { type: 'button', className: 'sdk-btn accent', onClick: () => newGame(game.difficulty) }, '再来一局'),
                h('button', { type: 'button', className: 'sdk-btn', onClick: () => setShowWin(false) }, '看看棋盘'))) : null),
          h('div', { className: 'sdk-pad' },
            [...Array(9).keys()].map((d) => h('button', {
              key: d,
              type: 'button',
              className: 'sdk-num' + (digitsLeft[d + 1] >= 9 ? ' done' : ''),
              onClick: () => { if (selected >= 0) applyValue(selected, d + 1); },
            }, String(d + 1), h('small', null, digitsLeft[d + 1] >= 9 ? '' : String(9 - digitsLeft[d + 1]))))),
          h('div', { className: 'sdk-tools' },
            h('button', { type: 'button', className: 'sdk-tool', onClick: () => applyValue(selected, 0), disabled: selected < 0 }, '擦除'),
            h('button', { type: 'button', className: 'sdk-tool' + (notesMode ? ' on' : ''), onClick: () => setNotesMode(!notesMode) }, notesMode ? '笔记 开' : '笔记'),
            h('button', { type: 'button', className: 'sdk-tool' + (autoNotes ? ' on' : ''), onClick: () => setAutoNotes(!autoNotes) }, autoNotes ? '候选 开' : '候选'),
            h('button', { type: 'button', className: 'sdk-tool', onClick: undo, disabled: undoRef.current.length === 0 }, '撤销'),
            h('button', { type: 'button', className: 'sdk-tool', onClick: redo, disabled: redoRef.current.length === 0 }, '重做'),
            h('button', { type: 'button', className: 'sdk-tool', onClick: hint, disabled: game.done }, '提示'),
            h('button', { type: 'button', className: 'sdk-tool', onClick: check, disabled: game.done }, '检查')),
          h('div', { className: 'sdk-foot' }, '数字键 1–9 填写，方向键移动，N 笔记，H 提示，U 撤销，R 重来，Esc 关闭。题目完全在本地生成。'))));
    }

    /* ------------------------------------------------------------------ apply */

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
          label: () => '数独',
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
