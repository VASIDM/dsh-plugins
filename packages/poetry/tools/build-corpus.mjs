import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import * as OpenCC from 'opencc-js';

const convert = OpenCC.Converter({ from: 't', to: 'cn' });
const clean = (value) => convert(String(value || '')).replace(/\s+/g, ' ').trim();
const normalizeKey = (text) => text.replace(/[^\u4e00-\u9fa5]/g, '');

const curated = ['data-shi.json', 'data-ci.json', 'data-qu.json', 'data-extra.json']
  .flatMap((file) => JSON.parse(readFileSync('../' + file, 'utf8')))
  .map((poem) => ({ ...poem, curated: true }));

const seen = new Set();
const corpus = [];
const stats = {};
let serial = 0;

function push(poem, source) {
  const title = clean(poem.title);
  const author = clean(poem.author);
  const dynasty = clean(poem.dynasty);
  const genre = poem.genre;
  const text = (poem.text || []).map(clean).filter(Boolean);
  const chars = text.join('').replace(/[^\u4e00-\u9fa5]/g, '').length;
  if (!title || !author || !dynasty || !genre) return false;
  if (title.length > 40 || chars < 12 || chars > 600) return false;
  if (text.length < 2 || text.length > 40) return false;
  if (!/[\u4e00-\u9fa5]/.test(title)) return false;
  const key = normalizeKey(text.join(''));
  if (!key || seen.has(key)) return false;
  seen.add(key);
  serial += 1;
  corpus.push({ id: 'c' + serial, title, author, dynasty, genre, text });
  stats[source] = (stats[source] || 0) + 1;
  return true;
}

/* --- curated first: commentary entries win over corpus duplicates --- */
for (const poem of curated) {
  const text = poem.text.map(clean).filter(Boolean);
  const key = normalizeKey(text.join(''));
  if (!key || seen.has(key)) continue;
  seen.add(key);
  serial += 1;
  corpus.push({ ...poem, text, id: 'k' + serial, curated: true });
  stats['精注'] = (stats['精注'] || 0) + 1;
}

function fromParagraphs(records, meta, source, limit) {
  let added = 0;
  for (const record of records) {
    if (limit && added >= limit) break;
    if (push({
      title: record.title || record.rhythmic || record.chapter,
      author: record.author,
      dynasty: meta.dynasty,
      genre: meta.genre,
      text: record.paragraphs || record.para || record.content,
    }, source)) added += 1;
  }
  return added;
}

/* --- anthologies --- */
const tang300 = JSON.parse(readFileSync('../raw/全唐诗_唐诗三百首.json', 'utf8'));
fromParagraphs(tang300, { dynasty: '唐', genre: '诗' }, '唐诗三百首');

const song300 = JSON.parse(readFileSync('../raw/宋词_宋词三百首.json', 'utf8'));
for (const record of song300) {
  push({ title: record.rhythmic, author: record.author, dynasty: '宋', genre: '词', text: record.paragraphs }, '宋词三百首');
}

const shijing = JSON.parse(readFileSync('../raw/诗经_shijing.json', 'utf8'));
for (const record of shijing) {
  push({ title: record.title, author: '佚名', dynasty: '先秦', genre: '诗', text: record.content }, '诗经');
}

const chuci = JSON.parse(readFileSync('../raw/楚辞_chuci.json', 'utf8'));
for (const record of chuci) {
  push({ title: record.title, author: record.author || '佚名', dynasty: '先秦', genre: '诗', text: record.content }, '楚辞');
}

const shuimo = JSON.parse(readFileSync('../raw/水墨唐诗_shuimotangshi.json', 'utf8'));
fromParagraphs(shuimo, { dynasty: '唐', genre: '诗' }, '水墨唐诗');

const nalan = JSON.parse(readFileSync('../raw/纳兰性德_纳兰性德诗集.json', 'utf8'));
for (const record of nalan) {
  push({ title: record.title, author: '纳兰性德', dynasty: '清', genre: '词', text: record.para }, '纳兰词');
}

const huajian = readdirSync('../raw').filter((file) => file.startsWith('五代诗词_huajianji'));
for (const file of huajian) {
  const data = JSON.parse(readFileSync('../raw/' + file, 'utf8'));
  const records = Array.isArray(data) ? data : (data.content || []);
  for (const record of records) {
    push({ title: record.title || record.rhythmic, author: record.author, dynasty: '五代', genre: '词', text: record.paragraphs }, '花间集');
  }
}

/* --- Yuan qu: known dramatists, short pieces --- */
const yuanAuthors = new Set(['关汉卿', '马致远', '白朴', '郑光祖', '张养浩', '张可久', '乔吉', '睢景臣', '徐再思', '贯云石', '卢挚', '王实甫', '曾瑞', '薛昂夫', '刘时中', '杨果', '杜仁杰', '商挺', '胡祗遹', '王和卿', '陈草庵', '查德卿', '周文质', '汤式', '兰楚芳', '赵禹圭', '吴弘道', '刘秉忠']);
const yuanqu = JSON.parse(readFileSync('../raw/元曲_yuanqu.json', 'utf8'));
let yuanCount = 0;
for (const record of yuanqu) {
  if (yuanCount >= 520) break;
  if (!yuanAuthors.has(clean(record.author))) continue;
  if (push({ title: record.title, author: record.author, dynasty: '元', genre: '曲', text: record.paragraphs }, '元曲')) yuanCount += 1;
}

/* --- Tang extras by major poets --- */
const tangAuthors = ['李白', '杜甫', '白居易', '王维', '李商隐', '杜牧', '孟浩然', '刘禹锡', '柳宗元', '韩愈', '李贺', '岑参', '高适', '王昌龄', '韦应物', '刘长卿', '元稹', '张籍', '王建', '温庭筠', '韦庄', '崔颢', '王之涣', '贺知章', '张若虚', '陈子昂', '王勃', '骆宾王', '杨炯', '卢照邻', '宋之问', '沈佺期', '李颀', '王翰', '杜荀鹤', '许浑', '罗隐', '皮日休', '陆龟蒙', '韩偓', '郑谷', '司空图', '李益', '贾岛', '孟郊', '卢仝', '李绅', '崔护', '张继', '常建', '祖咏', '綦毋潜', '王湾', '刘方平', '顾况', '戴叔伦', '卢纶', '李端', '司空曙', '钱起', '郎士元', '韩翃', '皇甫冉', '秦韬玉', '曹松', '唐彦谦', '鱼玄机', '薛涛', '上官仪', '苏味道', '李峤', '杜审言', '刘希夷', '张九龄', '王绩', '寒山', '拾得', '皎然', '齐己', '贯休'];
const tangRank = new Map(tangAuthors.map((name, index) => [name, index]));
const tangFiles = readdirSync('../raw').filter((file) => file.startsWith('全唐诗_poet.tang.'));
const tangPool = [];
for (const file of tangFiles) {
  const records = JSON.parse(readFileSync('../raw/' + file, 'utf8'));
  for (const record of records) {
    const author = clean(record.author);
    const rank = tangRank.get(author);
    if (rank == null) continue;
    const text = (record.paragraphs || []).map(clean).filter(Boolean);
    const chars = text.join('').replace(/[^\u4e00-\u9fa5]/g, '').length;
    if (chars < 20 || chars > 220 || text.length < 2 || text.length > 20) continue;
    tangPool.push({ record, author, rank, chars, text });
  }
}
tangPool.sort((a, b) => a.rank - b.rank || a.chars - b.chars);
const perAuthor = new Map();
let tangCount = 0;
for (const item of tangPool) {
  if (tangCount >= 900) break;
  const used = perAuthor.get(item.author) || 0;
  if (used >= 18) continue;
  if (push({ title: item.record.title, author: item.author, dynasty: '唐', genre: '诗', text: item.text }, '全唐诗·名家')) {
    perAuthor.set(item.author, used + 1);
    tangCount += 1;
  }
}

/* --- curated first: commentary entries win over corpus duplicates --- */
for (const poem of curated) {
  const text = poem.text.map(clean).filter(Boolean);
  const key = normalizeKey(text.join(''));
  if (!key || seen.has(key)) continue;
  seen.add(key);
  serial += 1;
  corpus.push({ ...poem, text, id: 'k' + serial, curated: true });
  stats['精注'] = (stats['精注'] || 0) + 1;
}

const out = { poems: corpus, stats, total: corpus.length };
writeFileSync('../corpus.json', JSON.stringify(out), 'utf8');
console.log('total', corpus.length);
console.log(JSON.stringify(stats, null, 2));
const byGenre = {};
for (const poem of corpus) byGenre[poem.genre] = (byGenre[poem.genre] || 0) + 1;
console.log('genres', JSON.stringify(byGenre));
