import { readFileSync, writeFileSync } from 'node:fs';

let t = readFileSync('template.js', 'utf8');
const before = t;
let n = 0;
const swap = (oldText, newText) => {
  if (!t.includes(oldText)) throw new Error('missing: ' + oldText.slice(0, 60));
  t = t.replace(oldText, newText);
  n += 1;
};

swap(
  `    const GENRES = ['All', 'Annotated', 'Shi', 'Ci', 'Qu'];`,
  `    const GENRES = [
      { key: 'all', label: 'All' },
      { key: 'annotated', label: 'Annotated' },
      { key: 'shi', label: 'Shi', genre: '诗' },
      { key: 'ci', label: 'Ci', genre: '词' },
      { key: 'qu', label: 'Qu', genre: '曲' },
    ];
    const GENRE_BY_KEY = Object.fromEntries(GENRES.filter((item) => item.genre).map((item) => [item.key, item.genre]));`,
);
swap(
  `    function poolOf(filter) {
      if (filter === 'Annotated') return POEMS.filter((poem) => poem.curated);
      return POEMS.filter((poem) => filter === 'All' || poem.genre === filter);
    }`,
  `    function poolOf(filter) {
      if (filter === 'annotated') return POEMS.filter((poem) => poem.curated);
      if (filter === 'all') return POEMS;
      const genre = GENRE_BY_KEY[filter];
      return genre ? POEMS.filter((poem) => poem.genre === genre) : POEMS;
    }`,
);
swap(`      if (filter === 'All' && Math.random() < 0.55) {`, `      if (filter === 'all' && Math.random() < 0.55) {`);
swap(
  `      const [filter, setFilter] = useState('All');
      const [poem, setPoem] = useState(() => pickRandom('All', null));`,
  `      const [filter, setFilter] = useState('all');
      const [poem, setPoem] = useState(() => pickRandom('all', null));`,
);
swap(
  `      const chooseFilter = (value) => {
        setFilter(value);
        setActiveNote(null);
        setPoem((current) => (value === 'All' || current.genre === value ? current : pickRandom(value, current.id)));
      };`,
  `      const chooseFilter = (key) => {
        setFilter(key);
        setActiveNote(null);
        setPoem((current) => {
          if (key === 'all') return current;
          if (key === 'annotated') return current.curated ? current : pickRandom('annotated', current.id);
          const genre = GENRE_BY_KEY[key];
          return current.genre === genre ? current : pickRandom(key, current.id);
        });
      };`,
);
swap(
  `        setFilter('Annotated');
        setPoem(pickRandom('Annotated', poem.id));`,
  `        setFilter('annotated');
        setPoem(pickRandom('annotated', poem.id));`,
);
swap(
  `                GENRES.map((item) => h('button', {
                  key: item,
                  type: 'button',
                  className: filter === item ? 'on' : '',
                  onClick: () => chooseFilter(item),
                }, item))),`,
  `                GENRES.map((item) => h('button', {
                  key: item.key,
                  type: 'button',
                  className: filter === item.key ? 'on' : '',
                  onClick: () => chooseFilter(item.key),
                }, item.label))),`,
);

writeFileSync('template.js', t, 'utf8');
console.log('replacements', n, 'changed', before !== t);
