import { readFileSync, writeFileSync } from 'node:fs';

let t = readFileSync('client.js', 'utf8');
const before = t;

/* Cap the branch search: we only need to know whether effort crossed the tier
   threshold, not the exact total (a pathological puzzle could otherwise recurse
   for a very long time). */
t = t.replace(
  `    function guessEffort(puzzle) {
      let branches = 0;`,
  `    function guessEffort(puzzle) {
      let branches = 0;
      let nodes = 0;
      const BRANCH_CAP = 64;
      const NODE_CAP = 20000;`,
);
t = t.replace(
  `      const walk = (grid) => {
        const state = solveSingles(grid);`,
  `      const walk = (grid) => {
        nodes += 1;
        if (nodes > NODE_CAP || branches >= BRANCH_CAP) return true;
        const state = solveSingles(grid);`,
);
t = t.replace(
  `        for (const digit of bitsOf(bestMask)) {
          const copy = grid.slice();
          copy[best] = digit;
          if (walk(copy)) return true;
        }
        return false;`,
  `        for (const digit of bitsOf(bestMask)) {
          const copy = grid.slice();
          copy[best] = digit;
          if (walk(copy)) return true;
          if (nodes > NODE_CAP || branches >= BRANCH_CAP) return true;
        }
        return false;`,
);

/* A newer generation supersedes an older one. */
t = t.replace(
  `      const gameRef = useRef(game);
      gameRef.current = game;`,
  `      const gameRef = useRef(game);
      gameRef.current = game;
      const generationRef = useRef(0);`,
);
t = t.replace(
  `      const newGame = async (difficulty) => {
        setGenerating(true);
        setShowWin(false);
        setWalk(null);
        await new Promise((resolve) => setTimeout(resolve, 20));
        const created = await generatePuzzle(difficulty);
        setGenerating(false);
        if (!created) return;`,
  `      const newGame = async (difficulty) => {
        const token = generationRef.current + 1;
        generationRef.current = token;
        setGenerating(true);
        setShowWin(false);
        setWalk(null);
        await new Promise((resolve) => setTimeout(resolve, 20));
        const created = await generatePuzzle(difficulty);
        if (token !== generationRef.current) return;
        setGenerating(false);
        if (!created) return;`,
);

writeFileSync('client.js', t, 'utf8');
console.log('changed:', before !== t);
