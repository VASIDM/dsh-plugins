import { readFileSync, writeFileSync } from 'node:fs';

let t = readFileSync('template.js', 'utf8');
const before = t;
let n = 0;
const swap = (oldText, newText) => {
  if (!t.includes(oldText)) throw new Error('missing: ' + oldText.slice(0, 60));
  t = t.replace(oldText, newText);
  n += 1;
};

swap(`/* Browser half of 诗笺: a local classical poetry reader in a floating card. */`, `/* Browser half of Poetry: a local classical poetry reader in a floating card. */`);
swap(`const GENRES = ['全部', '精注', '诗', '词', '曲'];`, `const GENRES = ['All', 'Annotated', 'Shi', 'Ci', 'Qu'];`);
swap(`      { id: 'notes', label: '注释' },
      { id: 'translation', label: '白话' },
      { id: 'appreciation', label: '赏析' },
      { id: 'bio', label: '作者' },
      { id: 'background', label: '背景' },`,
  `      { id: 'notes', label: 'Notes' },
      { id: 'translation', label: 'Translation' },
      { id: 'appreciation', label: 'Appreciation' },
      { id: 'bio', label: 'Author' },
      { id: 'background', label: 'Background' },`);
swap(`      if (filter === '精注') return POEMS.filter((poem) => poem.curated);
      return POEMS.filter((poem) => filter === '全部' || poem.genre === filter);`,
  `      if (filter === 'Annotated') return POEMS.filter((poem) => poem.curated);
      return POEMS.filter((poem) => filter === 'All' || poem.genre === filter);`);
swap(`      if (filter === '全部' && Math.random() < 0.55) {`, `      if (filter === 'All' && Math.random() < 0.55) {`);

swap(`        title: '诗笺 · 随机一首',
        'aria-label': '打开诗笺',`, `        title: 'Poetry · random poem',
        'aria-label': 'Open Poetry',`);
swap(`      wide ? h('span', null, '诗笺') : null);`, `      wide ? h('span', null, 'Poetry') : null);`);

swap(`      const [filter, setFilter] = useState('全部');
      const [poem, setPoem] = useState(() => pickRandom('全部', null));`,
  `      const [filter, setFilter] = useState('All');
      const [poem, setPoem] = useState(() => pickRandom('All', null));`);
swap(`        setPoem((current) => (value === '全部' || current.genre === value ? current : pickRandom(value, current.id)));`,
  `        setPoem((current) => (value === 'All' || current.genre === value ? current : pickRandom(value, current.id)));`);
swap(`        setFilter('精注');
        setPoem(pickRandom('精注', poem.id));`, `        setFilter('Annotated');
        setPoem(pickRandom('Annotated', poem.id));`);
swap(`        h('button', { type: 'button', className: 'pt-btn', onClick: readCurated }, '读一篇精注'));`,
  `        h('button', { type: 'button', className: 'pt-btn', onClick: readCurated }, 'Read annotated'));`);
swap(`              bio || ('作者 ' + poem.author + '（' + poem.dynasty + '），生平待补。')));`,
  `              bio || ('Author ' + poem.author + ' (' + poem.dynasty + ') — biography pending.')));`);
swap(`          return emptyCurated('此篇为原典，精注待补。');`, `          return emptyCurated('Source text only — commentary pending.');`);

swap(`'aria-label': '诗笺' },`, `'aria-label': 'Poetry' },`);
swap(`h('span', { className: 'pt-seal' }, '诗'),`, `h('span', { className: 'pt-seal' }, 'P'),`);
swap(`              h('b', null, '诗笺'),
              h('span', null, '随机一首 · 共 ' + POEMS.length + ' 篇 · 精注 ' + POEMS.filter((item) => item.curated).length)),`,
  `              h('b', null, 'Poetry'),
              h('span', null, 'Random · ' + POEMS.length + ' poems · ' + POEMS.filter((item) => item.curated).length + ' annotated')),`);
swap(`onClick: nextPoem, title: '换一首（R）' }, '换一首'),`, `onClick: nextPoem, title: 'Next poem (R)' }, 'Next'),`);
swap(`title: isFav ? '取消收藏（F）' : '收藏（F）'`, `title: isFav ? 'Unfavorite (F)' : 'Favorite (F)'`);
swap(`title: ui.minimized ? '展开' : '收起'`, `title: ui.minimized ? 'Expand' : 'Collapse'`);
swap(`title: '关闭', onClick: () => setUi({ open: false }) }, '×')),`, `title: 'Close', onClick: () => setUi({ open: false }) }, '×')),`);
swap(`'aria-label': '体裁'`, `'aria-label': 'Genre'`);
swap(`title: '缩小字号（-）'`, `title: 'Smaller text (-)'`);
swap(`title: '放大字号（+）'`, `title: 'Larger text (+)'`);
swap(`copied ? '已复制' : '复制'`, `copied ? 'Copied' : 'Copy'`);
swap(`poem.curated ? '精注' : '原典'`, `poem.curated ? 'Annotated' : 'Source'`);
swap(`              h('span', null, 'R ', h('b', null, '换一首')),
              h('span', null, 'F ', h('b', null, '收藏')),
              h('span', null, '1–5 ', h('b', null, '切栏')),
              h('span', null, '± ', h('b', null, '字号')),
              h('span', null, 'Esc ', h('b', null, '关闭')))),`,
  `              h('span', null, 'R ', h('b', null, 'Next')),
              h('span', null, 'F ', h('b', null, 'Favorite')),
              h('span', null, '1–5 ', h('b', null, 'Tabs')),
              h('span', null, '± ', h('b', null, 'Font')),
              h('span', null, 'Esc ', h('b', null, 'Close')))),`);
swap(`title: '拖动缩放（保持比例）'`, `title: 'Resize (keeps ratio)'`);
swap(`          label: () => '诗笺',`, `          label: () => 'Poetry',`);

writeFileSync('template.js', t, 'utf8');
console.log('replacements', n, 'remaining CJK', (t.match(/[\u4e00-\u9fa5]/g) || []).length);
