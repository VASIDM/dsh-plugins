import { readFileSync, writeFileSync } from 'node:fs';

let t = readFileSync('template.js', 'utf8');
const before = t;

/* ---- CSS: centered title, refined poem type, numbered notes ---- */
t = t.replace(
  `.pt-h1 { margin: 4px 0 2px; color: var(--pt-ink); font-family: var(--pt-serif); font-size: 22px; font-weight: 700; letter-spacing: .08em; line-height: 1.35; }
.pt-meta { display: flex; align-items: center; gap: 8px; color: var(--pt-ink-3); font-size: 10.5px; letter-spacing: .04em; }
.pt-meta .pt-dot { color: var(--pt-red); }
.pt-meta .pt-copy { margin-left: auto; }
.pt-poem { margin: 12px 0 10px; text-align: center; color: var(--pt-ink); font-family: var(--pt-serif); font-size: calc(17px * var(--pt-scale, 1)); line-height: 1.95; letter-spacing: .08em; }
.pt-poem div { white-space: pre-wrap; }`,
  `.pt-h1 { margin: 6px 0 0; color: var(--pt-ink); font-family: var(--pt-serif); font-size: 24px; font-weight: 700; letter-spacing: .14em; line-height: 1.35; text-align: center; }
.pt-title-rule { position: relative; width: 34px; height: 1px; margin: 9px auto 8px; background: var(--pt-red); }
.pt-title-rule::after { content: ''; position: absolute; left: 50%; top: -2px; width: 5px; height: 5px; background: var(--pt-red); transform: translateX(-50%) rotate(45deg); }
.pt-meta { display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--pt-ink-3); font-size: 10.5px; letter-spacing: .04em; }
.pt-meta .pt-dot { color: var(--pt-red); }
.pt-poem { width: 100%; max-width: 350px; margin: 12px auto 10px; text-align: center; color: var(--pt-ink); font-family: var(--pt-serif); font-size: calc(17.5px * var(--pt-scale, 1)); font-weight: 500; line-height: 2; letter-spacing: .12em; font-feature-settings: "palt"; }
.pt-poem div { white-space: pre-wrap; }
.pt-term { border-bottom: 1px dashed color-mix(in srgb, var(--pt-red) 60%, transparent); font-weight: 700; cursor: pointer; }
.pt-term sup { margin-left: 1px; color: var(--pt-red); font-family: var(--dsh-font-family-text-default, sans-serif); font-size: .52em; font-weight: 700; letter-spacing: 0; vertical-align: super; }
.pt-term:hover { color: var(--pt-red); border-bottom-color: var(--pt-red); }`,
);

t = t.replace(
  `.pt-tabs { position: sticky; top: 0; z-index: 2; display: flex; gap: 2px; padding: 4px 0 8px; background: var(--pt-paper); }`,
  `.pt-tabs { position: sticky; top: 0; z-index: 2; display: flex; justify-content: center; gap: 2px; padding: 4px 0 8px; background: var(--pt-paper); }`,
);
t = t.replace(
  `.pt-section { padding: 2px 0 8px; color: var(--pt-ink-2); font-size: calc(12.5px * var(--pt-scale, 1)); line-height: 1.85; }
.pt-note { display: flex; gap: 6px; padding: 3px 0; border-bottom: 1px dashed color-mix(in srgb, var(--pt-line) 55%, transparent); }
.pt-note:last-child { border-bottom: 0; }
.pt-note b { flex: none; color: var(--pt-red); font-family: var(--pt-serif); font-weight: 600; }
.pt-note span { color: var(--pt-ink-2); }`,
  `.pt-section { max-width: 350px; margin: 0 auto; padding: 2px 0 8px; color: var(--pt-ink-2); font-size: calc(12.5px * var(--pt-scale, 1)); line-height: 1.85; text-align: justify; text-justify: inter-ideograph; }
.pt-note { display: flex; align-items: flex-start; gap: 8px; padding: 6px 6px; margin: 0 -6px; border-bottom: 1px dashed color-mix(in srgb, var(--pt-line) 55%, transparent); border-radius: 5px; }
.pt-note:last-child { border-bottom: 0; }
.pt-note.active { background: var(--pt-red-wash); }
.pt-note-no { flex: none; width: 16px; height: 16px; margin-top: 1px; border-radius: 50%; background: var(--pt-red); color: #fff7ef; font-family: var(--dsh-font-family-text-default, sans-serif); font-size: 9.5px; font-weight: 600; line-height: 16px; text-align: center; }
.pt-note-body { min-width: 0; }
.pt-note-term { color: var(--pt-red); font-family: var(--pt-serif); font-weight: 600; }
.pt-note-body span { color: var(--pt-ink-2); }`,
);

/* ---- module-level renderer for inline note markers ---- */
t = t.replace(
  `    /* ---------------------------------------------------------------- window */`,
  `    /** Underline note terms inside the poem and attach the matching number. */
    function renderPoemLines(poem, onNote) {
      const used = new Set();
      return poem.text.map((line, lineIndex) => {
        const matches = [];
        poem.notes.forEach(([term], noteIndex) => {
          if (used.has(noteIndex)) return;
          const at = line.indexOf(term);
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
        if (!chosen.length) return h('div', { key: lineIndex }, line);
        const parts = [];
        let pos = 0;
        for (const match of chosen) {
          if (match.at > pos) parts.push(line.slice(pos, match.at));
          parts.push(h('span', {
            key: 'note-' + match.noteIndex,
            className: 'pt-term',
            title: poem.notes[match.noteIndex][1],
            onClick: (event) => { event.stopPropagation(); onNote(match.noteIndex); },
          }, line.slice(match.at, match.end), h('sup', null, String(match.noteIndex + 1))));
          pos = match.end;
        }
        if (pos < line.length) parts.push(line.slice(pos));
        return h('div', { key: lineIndex }, parts);
      });
    }

    /* ---------------------------------------------------------------- window */`,
);

/* ---- state + focus effect ---- */
t = t.replace(
  `      const [copied, setCopied] = useState(false);`,
  `      const [copied, setCopied] = useState(false);
      const [activeNote, setActiveNote] = useState(null);`,
);
t = t.replace(
  `      useEffect(() => {
        const onResize = () => setViewportTick((value) => value + 1);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      }, []);`,
  `      useEffect(() => {
        const onResize = () => setViewportTick((value) => value + 1);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      }, []);

      useEffect(() => {
        if (activeNote == null || tab !== 'notes') return;
        const node = document.getElementById('pt-note-' + activeNote);
        if (node) node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, [tab, activeNote]);

      const focusNote = (index) => {
        setTab('notes');
        setActiveNote(index);
      };`,
);
t = t.replace(
  `      const nextPoem = () => {
        setPoem((current) => pickRandom(filter, current.id));
        setTab('notes');
        setCopied(false);
      };`,
  `      const nextPoem = () => {
        setPoem((current) => pickRandom(filter, current.id));
        setTab('notes');
        setActiveNote(null);
        setCopied(false);
      };`,
);
t = t.replace(
  `        setFilter(value);
        setPoem((current) => (value === '全部' || current.genre === value ? current : pickRandom(value, current.id)));`,
  `        setFilter(value);
        setActiveNote(null);
        setPoem((current) => (value === '全部' || current.genre === value ? current : pickRandom(value, current.id)));`,
);

/* ---- notes section with numbers and anchors ---- */
t = t.replace(
  `        if (tab === 'notes') {
          return h('div', { className: 'pt-section' },
            poem.notes.map(([term, text], index) => h('div', { className: 'pt-note', key: index },
              h('b', null, term),
              h('span', null, text))));
        }`,
  `        if (tab === 'notes') {
          return h('div', { className: 'pt-section' },
            poem.notes.map(([term, text], index) => h('div', {
              className: 'pt-note' + (activeNote === index ? ' active' : ''),
              id: 'pt-note-' + index,
              key: index,
            },
            h('b', { className: 'pt-note-no' }, String(index + 1)),
            h('div', { className: 'pt-note-body' },
              h('b', { className: 'pt-note-term' }, term),
              h('span', null, text)))));
        }`,
);

/* ---- toolbar: copy button replaces the one in the meta line ---- */
t = t.replace(
  `                h('button', { type: 'button', title: '放大字号（+）', onClick: () => changeScale(0.05) }, 'A+'))),`,
  `                h('button', { type: 'button', title: '放大字号（+）', onClick: () => changeScale(0.05) }, 'A+')),
              h('button', { type: 'button', className: 'pt-btn', onClick: copyPoem }, copied ? '已复制' : '复制')),`,
);

/* ---- article head: centered title + rule + centered meta; inline notes ---- */
t = t.replace(
  `              h('h1', { className: 'pt-h1' }, poem.title),
              h('div', { className: 'pt-meta' },
                h('span', null, poem.dynasty),
                h('span', { className: 'pt-dot' }, '·'),
                h('span', null, poem.author),
                h('span', { className: 'pt-dot' }, '·'),
                h('span', null, poem.form),
                h('span', { className: 'pt-spacer' }),
                h('button', { type: 'button', className: 'pt-btn pt-copy', onClick: copyPoem }, copied ? '已复制' : '复制')),
              h('div', { className: 'pt-poem', style: { fontSize: 'calc(17px * ' + scale + ')' } },
                poem.text.map((line, index) => h('div', { key: index }, line))),`,
  `              h('h1', { className: 'pt-h1' }, poem.title),
              h('div', { className: 'pt-title-rule' }),
              h('div', { className: 'pt-meta' },
                h('span', null, poem.dynasty),
                h('span', { className: 'pt-dot' }, '·'),
                h('span', null, poem.author),
                h('span', { className: 'pt-dot' }, '·'),
                h('span', null, poem.form)),
              h('div', { className: 'pt-poem', style: { fontSize: 'calc(17.5px * ' + scale + ')' } },
                renderPoemLines(poem, focusNote)),`,
);

writeFileSync('template.js', t, 'utf8');
console.log('changed:', before !== t);
