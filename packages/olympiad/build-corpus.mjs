import { readFileSync, writeFileSync } from 'node:fs';

const ELITE = new Set([
  'imo', 'imo_shortlist', 'imo_longlists', 'china_national_olympiad', 'china_team_selection_test',
  'usa_team_selection_test', 'usa_team_selection_test_for_imo', 'usamo', 'usajmo', 'putnam',
  'apmo', 'apmoapmo_sol', 'balkan_mo', 'balkan_mo_shortlist', 'jbmo', 'jbmo_shortlist',
  'imc', 'middle_european_mathematical_olympiad', 'baltic_way', 'tuymaada_olympiad',
  'bmo', 'usomo',
]);

const SOURCE_NAMES = {
  imo: 'IMO',
  imo_shortlist: 'IMO Shortlist',
  imo_longlists: 'IMO Longlist',
  china_national_olympiad: 'CMO',
  china_team_selection_test: 'China TST',
  usa_team_selection_test: 'USA TST',
  usa_team_selection_test_for_imo: 'USA TST',
  usamo: 'USAMO',
  usajmo: 'USAJMO',
  usomo: 'USEMO',
  putnam: 'Putnam',
  apmo: 'APMO',
  apmoapmo_sol: 'APMO',
  balkan_mo: 'Balkan MO',
  balkan_mo_shortlist: 'Balkan MO Shortlist',
  jbmo: 'JBMO',
  jbmo_shortlist: 'JBMO Shortlist',
  imc: 'IMC',
  middle_european_mathematical_olympiad: 'MEMO',
  baltic_way: 'Baltic Way',
  tuymaada_olympiad: 'Tuymaada',
  bmo: 'BMO',
};

const pretty = (slug) => SOURCE_NAMES[slug] || String(slug || 'Olympiad')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (ch) => ch.toUpperCase());

const CATEGORY = {
  'Discrete Mathematics': 'Combinatorics',
  'Applied Mathematics': 'Applied',
  Precalculus: 'Calculus',
  Calculus: 'Calculus',
  'Number Theory': 'Number Theory',
  Algebra: 'Algebra',
  Geometry: 'Geometry',
};

const lines = readFileSync('raw/omni-math.jsonl', 'utf8').split('\n').filter(Boolean);
const problems = [];
let serial = 0;
for (const line of lines) {
  const row = JSON.parse(line);
  const source = String(row.source || '');
  const difficulty = Number(row.difficulty) || 5;
  const solution = String(row.solution || '').trim();
  if (!ELITE.has(source) && difficulty < 8) continue;
  if (solution.length < 40) continue;
  const domain = Array.isArray(row.domain) ? row.domain[0] : '';
  const parts = String(domain).split('->').map((part) => part.trim());
  const category = CATEGORY[parts[1]] || parts[1] || 'Other';
  serial += 1;
  problems.push({
    id: 'omni-' + serial,
    source: pretty(source),
    category,
    level: difficulty,
    stars: Math.max(1, Math.min(5, Math.ceil(difficulty / 2))),
    statement: [String(row.problem || '').trim()],
    solution: [solution],
    answer: String(row.answer || '').trim(),
  });
}

const featured = JSON.parse(readFileSync('problems.json', 'utf8')).map((problem) => ({
  ...problem,
  featured: true,
  level: 10,
  stars: problem.difficulty,
  answer: '',
}));

const all = [...featured, ...problems];
const corpus = {
  meta: { count: all.length, featured: featured.length, generatedAt: new Date().toISOString() },
  problems: all,
};
writeFileSync('corpus.json', JSON.stringify(corpus), 'utf8');

const byCategory = {};
for (const problem of all) byCategory[problem.category] = (byCategory[problem.category] || 0) + 1;
const bySource = {};
for (const problem of all) bySource[problem.source] = (bySource[problem.source] || 0) + 1;
console.log('total', all.length, '| featured', featured.length);
console.log('categories', JSON.stringify(byCategory));
console.log('sources', JSON.stringify(Object.entries(bySource).sort((a, b) => b[1] - a[1]).slice(0, 12)));
