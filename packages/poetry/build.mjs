import { readFileSync, writeFileSync } from 'node:fs';

const files = ['data-shi.json', 'data-ci.json', 'data-qu.json', 'data-extra.json'];
const poems = files.flatMap((file) => JSON.parse(readFileSync(file, 'utf8')));

for (const poem of poems) {
  if (!poem.id || !poem.title || !poem.author || !Array.isArray(poem.text) || !poem.text.length) throw new Error('bad poem ' + poem.id);
  if (!Array.isArray(poem.notes) || !poem.notes.length) throw new Error('bad notes ' + poem.id);
  if (!Array.isArray(poem.translation) || !poem.translation.length) throw new Error('bad translation ' + poem.id);
  if (!Array.isArray(poem.appreciation) || !poem.appreciation.length) throw new Error('bad appreciation ' + poem.id);
  if (!poem.bio || !poem.background) throw new Error('bad bio/background ' + poem.id);
}
if (new Set(poems.map((poem) => poem.id)).size !== poems.length) throw new Error('duplicate ids');

const template = readFileSync('template.js', 'utf8');
const client = template.replace('__POEMS__', JSON.stringify(poems, null, 2));
writeFileSync('client.js', client, 'utf8');
console.log('poems', poems.length, '| client bytes', client.length);
