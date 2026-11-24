#!/usr/bin/env node
/**
 * Make the sidebar browser guest's session partition persistent.
 *
 * The desktop main process hands each webview guest an in-memory partition
 * (`dsh-sidebar-browser-<uuid>`), so a site login dies with the process. This
 * tool rewrites that single expression into a `persist:` partition **in place**:
 * the replacement is padded to the exact byte length of the original, so every
 * offset in the ASAR header stays valid and nothing is repacked.
 *
 * Run it while the app is closed (it only takes effect on the next start).
 *
 *   node tools/patch-persistent-partition.mjs            apply (dry run with --dry-run)
 *   node tools/patch-persistent-partition.mjs --revert   restore from the backup
 */
import { closeSync, copyFileSync, existsSync, openSync, readSync, statSync, writeSync } from 'node:fs';

const ASAR = process.env.DSH_ASAR ?? String.raw`F:\DSH\resources\app.asar`;
const BACKUP = `${ASAR}.before-deepseek-web`;
const MEMBER = '/lib/main.js';
const ORIGINAL = '`dsh-sidebar-browser-${randomUUID()}`';
const PERSISTED = '`persist:deepseek-web`';

const args = new Set(process.argv.slice(2));
const revert = args.has('--revert');
const dryRun = args.has('--dry-run');

function readHeader(fd) {
  const sizeBuffer = Buffer.alloc(8);
  readSync(fd, sizeBuffer, 0, 8, 0);
  const pickleSize = sizeBuffer.readUInt32LE(4);
  const pickle = Buffer.alloc(pickleSize);
  readSync(fd, pickle, 0, pickleSize, 8);
  const jsonLength = pickle.readUInt32LE(4);
  const header = JSON.parse(pickle.toString('utf8', 8, 8 + jsonLength));
  return { header, dataStart: 8 + pickleSize };
}

function findEntry(node, path) {
  const segments = path.split('/').filter(Boolean);
  let cursor = node;
  for (const segment of segments) {
    cursor = cursor?.files?.[segment];
    if (cursor === undefined) return undefined;
  }
  return cursor.files === undefined ? cursor : undefined;
}

if (!existsSync(ASAR)) {
  console.error(`missing archive: ${ASAR}`);
  process.exit(1);
}

if (revert) {
  if (!existsSync(BACKUP)) {
    console.error(`no backup to restore: ${BACKUP}`);
    process.exit(1);
  }
  const before = statSync(ASAR).size;
  copyFileSync(BACKUP, ASAR);
  console.log(`restored ${ASAR} from ${BACKUP}`);
  console.log(`size ${before} -> ${statSync(ASAR).size}`);
  process.exit(0);
}

const fd = openSync(ASAR, 'r+');
const { header, dataStart } = readHeader(fd);
const entry = findEntry(header, MEMBER);
if (entry === undefined) {
  closeSync(fd);
  console.error(`archive member not found: ${MEMBER}`);
  process.exit(1);
}
if (entry.unpacked === true) {
  closeSync(fd);
  console.error(`${MEMBER} is stored unpacked; this tool patches packed members only`);
  process.exit(1);
}

const absolute = dataStart + Number(entry.offset);
const source = Buffer.alloc(entry.size);
readSync(fd, source, 0, source.length, absolute);
const text = source.toString('utf8');

const already = text.includes(PERSISTED);
if (already) {
  closeSync(fd);
  console.log('already patched: the guest partition is already persistent');
  process.exit(0);
}

const occurrences = text.split(ORIGINAL).length - 1;
if (occurrences !== 1) {
  closeSync(fd);
  console.error(`expected exactly one occurrence of ${ORIGINAL}, found ${occurrences}`);
  process.exit(1);
}

const padding = ' '.repeat(ORIGINAL.length - PERSISTED.length);
if (padding.length < 0) {
  closeSync(fd);
  console.error('replacement is longer than the original; refusing to shift offsets');
  process.exit(1);
}
const replacement = PERSISTED + padding;
if (replacement.length !== ORIGINAL.length) {
  closeSync(fd);
  console.error('replacement length mismatch');
  process.exit(1);
}

const target = text.replace(ORIGINAL, replacement);
const patched = Buffer.from(target, 'utf8');
if (patched.length !== source.length) {
  closeSync(fd);
  console.error('patched bytes change the file length; refusing to shift offsets');
  process.exit(1);
}

const at = text.indexOf(ORIGINAL);
console.log(`archive      ${ASAR}`);
console.log(`member       ${MEMBER} (${entry.size} bytes at ${absolute})`);
console.log(`expression   ${ORIGINAL}`);
console.log(`replacement  ${replacement}`);

if (dryRun) {
  closeSync(fd);
  console.log('dry run: nothing written');
  process.exit(0);
}

if (!existsSync(BACKUP)) {
  copyFileSync(ASAR, BACKUP);
  console.log(`backup       ${BACKUP}`);
}

writeSync(fd, patched, 0, patched.length, absolute);

// Read the member back and prove the archive is still parseable and patched.
const check = Buffer.alloc(entry.size);
readSync(fd, check, 0, check.length, absolute);
closeSync(fd);
const { header: recheck } = (() => {
  const handle = openSync(ASAR, 'r');
  const result = readHeader(handle);
  closeSync(handle);
  return result;
})();
if (!recheck.files) {
  console.error('archive header did not re-read');
  process.exit(1);
}
if (!check.toString('utf8').includes(PERSISTED)) {
  console.error('patch did not land');
  process.exit(1);
}
console.log(`patched at byte ${absolute + at}`);
console.log('restart the app to activate the persistent session');
