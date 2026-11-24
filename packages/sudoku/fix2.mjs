import { readFileSync, writeFileSync } from 'node:fs';

let t = readFileSync('client.js', 'utf8');
const before = t;

/* Difficulty ladder by real search effort, not just clue count. */
t = t.replace(
  `      { id: 'hard', label: '困难', clues: 32, level: 3, note: '常规高难' },
      { id: 'expert', label: '专家', clues: 28, level: 4, note: 'X-Wing' },
      { id: 'master', label: '大师', clues: 24, level: 6, note: '需要试错' },`,
  `      { id: 'hard', label: '困难', clues: 32, level: 3, effort: 3, note: '常规高难' },
      { id: 'expert', label: '专家', clues: 28, level: 4, effort: 8, note: '多步试错' },
      { id: 'master', label: '大师', clues: 24, level: 6, effort: 20, note: '硬核' },`,
);

/* Add the effort meter before generatePuzzle. */
t = t.replace(
  '    async function generatePuzzle(kind, deadlineMs) {',
  `    /**
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

    async function generatePuzzle(kind, deadlineMs) {`,
);

t = t.replace(
  `        const dug = digHoles(solution, cfg.clues);
        const level = ratePuzzle(dug.puzzle);
        attempts += 1;
        const candidate = { puzzle: dug.puzzle, solution, clues: dug.clues, level, attempts };
        const accepted = dug.clues <= cfg.clues && level >= cfg.level;
        if (accepted) return candidate;
        if (!best || candidate.level > best.level || (candidate.level === best.level && candidate.clues < best.clues)) best = candidate;`,
  `        const dug = digHoles(solution, cfg.clues);
        const level = ratePuzzle(dug.puzzle);
        const effort = guessEffort(dug.puzzle);
        attempts += 1;
        const candidate = { puzzle: dug.puzzle, solution, clues: dug.clues, level, effort, attempts };
        const accepted = dug.clues <= cfg.clues && effort >= cfg.effort;
        if (accepted) return candidate;
        if (!best || candidate.effort > best.effort || (candidate.effort === best.effort && candidate.clues < best.clues)) best = candidate;`,
);

/* Store effort on the game and show it. */
t = t.replace(
  `        level: 0,
        startedAt: Date.now(),`,
  `        level: 0,
        effort: 0,
        startedAt: Date.now(),`,
);
t = t.replace(
  `        next.level = created.level;`,
  `        next.level = created.level;
        next.effort = created.effort;`,
);
t = t.replace(
  `          h('b', null, '数独'),
            h('span', null, difficulty.label + ' · ' + (game.level >= 6 ? '需试错' : game.level >= 4 ? 'X-Wing' : game.level >= 3 ? '对子/区块' : '单元排除') + ' · 最佳 ' + (best[game.difficulty] ? fmtTime(best[game.difficulty]) : '—'))),`,
  `          h('b', null, '数独'),
            h('span', null, difficulty.label + ' · ' + (game.effort ? '试错 ' + game.effort + ' 步' : '本地生成') + ' · 最佳 ' + (best[game.difficulty] ? fmtTime(best[game.difficulty]) : '—'))),`,
);

writeFileSync('client.js', t, 'utf8');
console.log('changed:', before !== t);
