import { readFileSync, writeFileSync } from 'node:fs';

let t = readFileSync('template.js', 'utf8');
const before = t;

t = t.replace(
  `    const POEMS = __POEMS__;`,
  `    const POEMS = __POEMS__;
    const AUTHOR_BIOS = __AUTHOR_BIOS__;`,
);
t = t.replace(
  `    const GENRES = ['全部', '诗', '词', '曲'];`,
  `    const GENRES = ['全部', '精注', '诗', '词', '曲'];`,
);
t = t.replace(
  `    function poolOf(filter) {
      return POEMS.filter((poem) => filter === '全部' || poem.genre === filter);
    }

    function pickRandom(filter, excludeId) {
      const pool = poolOf(filter);
      const rest = pool.filter((poem) => poem.id !== excludeId);
      const source = rest.length ? rest : pool;
      return source[Math.floor(Math.random() * source.length)];
    }`,
  `    function poolOf(filter) {
      if (filter === '精注') return POEMS.filter((poem) => poem.curated);
      return POEMS.filter((poem) => filter === '全部' || poem.genre === filter);
    }

    function pickRandom(filter, excludeId) {
      let pool = poolOf(filter);
      if (filter === '全部' && Math.random() < 0.55) {
        const curated = POEMS.filter((poem) => poem.curated);
        if (curated.length) pool = curated;
      }
      const rest = pool.filter((poem) => poem.id !== excludeId);
      const source = rest.length ? rest : pool;
      return source[Math.floor(Math.random() * source.length)];
    }`,
);

/* Guard corpus poems without commentary. */
t = t.replace(
  `      const mark = (text, prefix) => {
        const matches = [];
        poem.notes.forEach(([term], noteIndex) => {`,
  `      const notes = poem.notes || [];
      const mark = (text, prefix) => {
        const matches = [];
        notes.forEach(([term], noteIndex) => {`,
);
t = t.replace(
  `            title: poem.notes[match.noteIndex][1],`,
  `            title: notes[match.noteIndex][1],`,
);

/* Section rendering: curated commentary or a graceful empty state. */
t = t.replace(
  `      const marked = renderPoemMarked(poem, focusNote);
      const section = (() => {
        if (tab === 'notes') {`,
  `      const marked = renderPoemMarked(poem, focusNote);
      const readCurated = () => {
        setFilter('精注');
        setPoem(pickRandom('精注', poem.id));
        setTab('notes');
        setActiveNote(null);
      };
      const emptyCurated = (text) => h('div', { className: 'pt-empty' }, text,
        h('button', { type: 'button', className: 'pt-btn', onClick: readCurated }, '读一篇精注'));
      const section = (() => {
        if (!poem.curated) {
          if (tab === 'bio') {
            const bio = AUTHOR_BIOS[poem.author];
            return h('div', { className: 'pt-section' }, h('p', { className: 'pt-para' },
              bio || ('作者 ' + poem.author + '（' + poem.dynasty + '），生平待补。')));
          }
          return emptyCurated('此篇为原典，精注待补。');
        }
        if (tab === 'notes') {`,
);

/* Meta line: 精注/原典 badge, optional form. */
t = t.replace(
  `                h('span', null, poem.author),
                h('span', { className: 'pt-dot' }, '·'),
                h('span', null, poem.form)),`,
  `                h('span', null, poem.author),
                h('span', { className: 'pt-dot' }, '·'),
                h('span', { className: 'pt-badge' + (poem.curated ? ' curated' : '') }, poem.curated ? '精注' : '原典'),
                poem.form ? h(React.Fragment, null,
                  h('span', { className: 'pt-dot' }, '·'),
                  h('span', null, poem.form)) : null),`,
);

/* Subtitle with total and curated counts. */
t = t.replace(
  `              h('span', null, '随机一首 · 共 ' + POEMS.length + ' 篇')),`,
  `              h('span', null, '随机一首 · 共 ' + POEMS.length + ' 篇 · 精注 ' + POEMS.filter((item) => item.curated).length)),`,
);

/* CSS for the badge and empty state button. */
t = t.replace(
  `.pt-meta .pt-dot { color: var(--pt-red); }`,
  `.pt-meta .pt-dot { color: var(--pt-red); }
.pt-badge { padding: 1px 5px; border: 1px solid color-mix(in srgb, var(--pt-line) 60%, transparent); border-radius: 4px; color: var(--pt-ink-3); font-size: 9px; letter-spacing: .08em; }
.pt-badge.curated { border-color: transparent; background: var(--pt-red); color: #fff7ef; }
.pt-empty .pt-btn { display: block; margin: 10px auto 0; }`,
);

writeFileSync('template.js', t, 'utf8');
console.log('changed:', before !== t);
