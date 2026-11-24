import { readFileSync, writeFileSync } from 'node:fs';

const restyle = readFileSync('restyle.mjs', 'utf8').split('\n');
const start = restyle.findIndex((line) => line.startsWith('const css = String.raw'));
if (start < 0) throw new Error('css wrapper line not found');
let end = -1;
for (let i = start + 1; i < restyle.length; i += 1) {
  if (restyle[i].trim() === '`;') { end = i; break; }
}
if (end < 0) throw new Error('css close not found');
const rules = restyle.slice(start + 1, end).join('\n').replaceAll('\\`', '`');
if (!rules.trimStart().startsWith('.sdk-launcher')) throw new Error('unexpected css start: ' + rules.slice(0, 60));
writeFileSync('custom.css', rules + '\n', 'utf8');

let client = readFileSync('client.js', 'utf8');
const cssStart = client.indexOf('    const CSS = `');
const marker = '    /* ------------------------------------------------------------- component */';
const markerAt = client.indexOf(marker);
if (cssStart < 0 || markerAt < 0) throw new Error('client markers not found');
client = client.slice(0, cssStart) + '    const CSS = `\n' + rules + '\n`;\n\n' + client.slice(markerAt);
writeFileSync('client.js', client, 'utf8');
console.log('rules lines:', rules.split('\n').length);
