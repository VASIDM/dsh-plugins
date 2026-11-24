import { readFileSync, writeFileSync } from 'node:fs';

const client = readFileSync('client.js', 'utf8');
const marker = '    /* --------------------------------------------------------------- styles */';
const at = client.indexOf(marker);
if (at < 0) throw new Error('styles marker not found');
const tail = readFileSync('tail.txt', 'utf8');
writeFileSync('client.js', client.slice(0, at) + tail, 'utf8');
console.log('written', (client.slice(0, at) + tail).length, 'bytes');
