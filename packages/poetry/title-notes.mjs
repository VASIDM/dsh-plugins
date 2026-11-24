import { readFileSync, writeFileSync } from 'node:fs';

let t = readFileSync('template.js', 'utf8');
const before = t;

const start = t.indexOf('    /** Underline note terms inside the poem and attach the matching number. */');
const end = t.indexOf('    /* ---------------------------------------------------------------- window */');
if (start < 0 || end < 0) throw new Error('renderer block not found');

const renderer = `    /** Underline note terms in the title and body; each note is marked once. */
    function renderPoemMarked(poem, onNote) {
      const used = new Set();
      const mark = (text, prefix) => {
        const matches = [];
        poem.notes.forEach(([term], noteIndex) => {
          if (used.has(noteIndex)) return;
          const at = text.indexOf(term);
          if (at >= 0) matches.push({ at, end: at + term.length, noteIndex });
        });
        matches.sort((a, b) => a.at - b.at || (b.end - b.at) - (a.end - a.at));
        const chosen = [];
        let cursor = 0;
        for (const match of matches) {
          if (match.at < cursor) continue;
          chosen.push(match);
          cursor = match.end;
          used.add(match.noteIndex);
        }
        if (!chosen.length) return [text];
        const parts = [];
        let pos = 0;
        for (const match of chosen) {
          if (match.at > pos) parts.push(text.slice(pos, match.at));
          parts.push(h('span', {
            key: prefix + '-' + match.noteIndex,
            className: 'pt-term',
            title: poem.notes[match.noteIndex][1],
            onClick: (event) => { event.stopPropagation(); onNote(match.noteIndex); },
          }, text.slice(match.at, match.end), h('sup', null, String(match.noteIndex + 1))));
          pos = match.end;
        }
        if (pos < text.length) parts.push(text.slice(pos));
        return parts;
      };
      return {
        title: mark(poem.title, 'title'),
        lines: poem.text.map((line, index) => h('div', { key: index }, mark(line, 'line-' + index))),
      };
    }

`;
t = t.slice(0, start) + renderer + t.slice(end);

t = t.replace(
  `      const section = (() => {`,
  `      const marked = renderPoemMarked(poem, focusNote);
      const section = (() => {`,
);
t = t.replace(
  `              h('h1', { className: 'pt-h1' }, poem.title),`,
  `              h('h1', { className: 'pt-h1' }, marked.title),`,
);
t = t.replace(
  `              h('div', { className: 'pt-poem', style: { fontSize: 'calc(17.5px * ' + scale + ')' } },
                renderPoemLines(poem, focusNote)),`,
  `              h('div', { className: 'pt-poem', style: { fontSize: 'calc(17.5px * ' + scale + ')' } },
                marked.lines),`,
);

writeFileSync('template.js', t, 'utf8');
console.log('changed:', before !== t);
