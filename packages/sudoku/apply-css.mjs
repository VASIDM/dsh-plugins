import { readFileSync, writeFileSync } from 'node:fs';

const restyle = readFileSync('restyle.mjs', 'utf8').split('\n');
// CSS rules sit between the outer `String.raw\`    const CSS = \`` line and the
// two closing backtick lines at the end.
const start = restyle.findIndex((line) => line.includes('const CSS ='));
let end = -1;
for (let i = restyle.length - 1; i > start; i -= 1) {
  if (restyle[i].trim() === '`;') { end = i; break; }
}
const rules = restyle.slice(start + 1, end - 1).join('\n').replaceAll('\\`', '`');
writeFileSync('custom.css', rules + '\n', 'utf8');

let client = readFileSync('client.js', 'utf8');
const cssStart = client.indexOf('    const CSS = `');
const cssEnd = client.indexOf('`;', cssStart);
if (cssStart < 0 || cssEnd < 0) throw new Error('client css not found');
client = client.slice(0, cssStart) + '    const CSS = `\n' + rules + '\n`;' + client.slice(cssEnd + 2);
writeFileSync('client.js', client, 'utf8');
console.log('css rules lines:', rules.split('\n').length, '| has gridlines:', rules.includes('sdk-gridlines'), '| has b3:', rules.includes('.b3'));
