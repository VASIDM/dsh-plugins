/* Browser half of Olympiad: 1000+ olympiad problems with KaTeX-rendered solutions. */
window.__ModuleLoader__.load({
  id: '@local/olympiad',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useEffect, useRef, useState } = React;

    const API = '/api/olympiad';
    const UI_KEY = 'olympiad.ui.v1';
    const CATEGORIES = ['All', 'Number Theory', 'Algebra', 'Geometry', 'Combinatorics', 'Applied', 'Calculus'];
    const LEVELS = [
      { key: 'all', label: 'All' },
      { key: 'featured', label: 'Featured' },
      { key: 'hard', label: 'Hard 8+' },
      { key: 'medium', label: '5–7' },
    ];

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    let katexPromise = null;
    function loadKatex() {
      if (window.katex) return Promise.resolve(true);
      if (katexPromise) return katexPromise;
      katexPromise = new Promise((resolve) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = API + '/assets/katex.min.css';
        document.head.appendChild(link);
        const script = document.createElement('script');
        script.src = API + '/assets/katex.min.js';
        script.async = true;
        script.onload = () => resolve(Boolean(window.katex));
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
      });
      return katexPromise;
    }

    function escapeHtml(text) {
      return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function cleanExpr(expr) {
      return String(expr)
        .replace(/^\$\$|\$\$$/g, '')
        .replace(/^\$|\$$/g, '')
        .replace(/^\\\[|\\\]$/g, '')
        .replace(/^\\\(|\\\)$/g, '')
        .replace(/\\boxed\{([^{}]*)\}/g, '$1')
        .trim();
    }

    function renderMath(expr, display) {
      const source = cleanExpr(expr);
      if (!source) return '';
      if (!window.katex) return escapeHtml(source);
      try {
        return window.katex.renderToString(source, {
          displayMode: display,
          throwOnError: false,
          strict: false,
          trust: false,
        });
      } catch {
        return escapeHtml(source);
      }
    }

    const MATH_RE = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^$\n]*?\$|\\\([\s\S]*?\\\))/g;

    function MathText({ text }) {
      const parts = [];
      let last = 0;
      let match;
      let key = 0;
      MATH_RE.lastIndex = 0;
      while ((match = MATH_RE.exec(text)) !== null) {
        if (match.index > last) parts.push(escapeHtml(text.slice(last, match.index)));
        const display = match[0].startsWith('$$') || match[0].startsWith('\\[');
        parts.push(h('span', {
          key: 'math-' + key++,
          className: display ? 'om-mathblock' : 'om-math',
          dangerouslySetInnerHTML: { __html: renderMath(match[0], display) },
        }));
        last = match.index + match[0].length;
      }
      if (last < text.length) parts.push(escapeHtml(text.slice(last)));
      return h('span', null, parts);
    }

    function MathLines({ text, className }) {
      const lines = String(text || '').split('\n');
      return h('div', { className: className || 'om-lines' },
        lines.map((line, index) => (line.trim()
          ? h('p', { className: 'om-line', key: index }, h(MathText, { text: line }))
          : h('div', { className: 'om-gap', key: index }))));
    }

    function poolOf(problems, category, level) {
      return problems.filter((problem) => {
        if (category !== 'All' && problem.category !== category) return false;
        if (level === 'featured') return Boolean(problem.featured);
        if (level === 'hard') return problem.level >= 8;
        if (level === 'medium') return problem.level >= 5 && problem.level < 8;
        return true;
      });
    }

    function pickRandom(pool, excludeId) {
      const rest = pool.filter((problem) => problem.id !== excludeId);
      const source = rest.length ? rest : pool;
      if (!source.length) return null;
      return source[Math.floor(Math.random() * source.length)];
    }

    function luminanceOf(color) {
      const parts = String(color).match(/[\d.]+/g);
      if (!parts || parts.length < 3) return null;
      const [r, g, b] = parts.map(Number);
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    }

    function detectThemeMode() {
      try {
        const anchor = document.querySelector('.om-win') || document.body;
        if (!anchor) return 'light';
        const probe = document.createElement('div');
        probe.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:1px;background-color:var(--dsw-alias-bg-base,transparent)';
        anchor.appendChild(probe);
        const value = getComputedStyle(probe).backgroundColor;
        probe.remove();
        const luminance = luminanceOf(value);
        if (luminance !== null && !/rgba?\(.*,\s*0\)$/.test(value)) return luminance < 0.5 ? 'dark' : 'light';
        const bodyBackground = document.body ? getComputedStyle(document.body).backgroundColor : '';
        const bodyLuminance = luminanceOf(bodyBackground);
        if (bodyLuminance !== null && !/rgba?\(.*,\s*0\)$/.test(bodyBackground)) return bodyLuminance < 0.5 ? 'dark' : 'light';
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } catch {
        return 'light';
      }
    }

    function useThemeMode() {
      const [mode, setMode] = useState(detectThemeMode);
      useEffect(() => {
        const update = () => setMode(detectThemeMode());
        const observer = new MutationObserver(update);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
        if (document.body) observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
        const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
        if (media && media.addEventListener) media.addEventListener('change', update);
        update();
        return () => {
          observer.disconnect();
          if (media && media.removeEventListener) media.removeEventListener('change', update);
        };
      }, []);
      return mode;
    }

    const uiState = { open: false, x: null, y: null, w: 470, minimized: false };
    const uiListeners = new Set();
    try {
      const saved = JSON.parse(window.localStorage.getItem(UI_KEY) || 'null');
      if (saved && typeof saved === 'object') Object.assign(uiState, saved);
    } catch { /* ignore */ }

    let uiSaveTimer = null;
    function setUi(patch) {
      Object.assign(uiState, patch);
      if (uiSaveTimer) clearTimeout(uiSaveTimer);
      uiSaveTimer = setTimeout(() => {
        try { window.localStorage.setItem(UI_KEY, JSON.stringify({ ...uiState, open: false })); } catch { /* ignore */ }
      }, 250);
      for (const listener of uiListeners) listener();
    }

    function useUi() {
      const [, force] = React.useReducer((value) => value + 1, 0);
      useEffect(() => {
        uiListeners.add(force);
        return () => { uiListeners.delete(force); };
      }, []);
      return uiState;
    }

    const CSS = `
.om-launcher { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 30px; padding: 0 9px; border: 0; border-radius: 8px; background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; cursor: pointer; }
.om-launcher:hover { background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2)); color: var(--dsw-alias-label-primary); }
.om-launcher[aria-pressed="true"] { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, transparent); color: var(--dsw-alias-brand-primary); }
.om-launcher-icon { display: inline-flex; width: 18px; height: 18px; }
.om-launcher-icon svg { width: 18px; height: 18px; }
.om-layer { position: fixed; inset: 0; z-index: 60; pointer-events: none; }
.om-win, .om-win * { box-sizing: border-box; }
.om-win {
  --om-serif: var(--dsh-font-family-brand, "Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", "SimSun", Georgia, serif);
  --om-paper: #f7f1e4;
  --om-paper-2: #fffdf6;
  --om-paper-3: #efe6d4;
  --om-ink: #241e18;
  --om-ink-2: #5d4f3f;
  --om-ink-3: #8b7b66;
  --om-line: #b9a98f;
  --om-red: #b23a2c;
  --om-red-2: #8e2a1e;
  --om-red-wash: #f7e7e0;
  position: fixed;
  display: flex;
  flex-direction: column;
  min-width: 420px;
  height: auto;
  max-height: calc(100vh - 24px);
  max-width: calc(100vw - 24px);
  border: 1px solid var(--om-line);
  border-radius: 16px;
  background:
    radial-gradient(120% 70% at 10% 0%, color-mix(in srgb, var(--om-red) 7%, transparent), transparent 58%),
    repeating-linear-gradient(0deg, color-mix(in srgb, var(--om-ink) 2.2%, transparent) 0 1px, transparent 1px 4px),
    var(--om-paper);
  color: var(--om-ink);
  box-shadow: 0 26px 64px rgba(46, 34, 22, .26), 0 2px 6px rgba(46, 34, 22, .08);
  overflow: hidden;
  pointer-events: auto;
  font-family: var(--dsh-font-family-text-default, "Segoe UI", system-ui, sans-serif);
  -webkit-font-smoothing: antialiased;
}
.om-win[data-theme="dark"] {
  --om-paper: #171210;
  --om-paper-2: #221a15;
  --om-paper-3: #2b211a;
  --om-ink: #f4e9d8;
  --om-ink-2: #cbb89f;
  --om-ink-3: #9a8871;
  --om-line: #7d6a54;
  --om-red: #e05743;
  --om-red-2: #f0785f;
  --om-red-wash: #3a1d17;
  box-shadow: 0 30px 72px rgba(0, 0, 0, .6), 0 2px 6px rgba(0, 0, 0, .35);
}
.om-win::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: linear-gradient(180deg, var(--om-red), var(--om-red-2)); }
.om-head { display: flex; align-items: center; gap: 10px; padding: 12px 13px 9px 16px; border-bottom: 1px solid color-mix(in srgb, var(--om-line) 55%, transparent); cursor: move; user-select: none; touch-action: none; }
.om-seal { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 5px; background: var(--om-red); color: #fff7ef; font-family: Georgia, "Times New Roman", serif; font-size: 17px; font-weight: 700; transform: rotate(-2deg); box-shadow: 0 2px 0 var(--om-red-2); }
.om-title { display: flex; flex-direction: column; min-width: 0; }
.om-title b { color: var(--om-ink); font-family: var(--om-serif); font-size: 15px; font-weight: 700; letter-spacing: .14em; }
.om-title span { margin-top: 1px; color: var(--om-ink-3); font-size: 10px; letter-spacing: .03em; }
.om-spacer { flex: 1; }
.om-iconbtn { display: inline-flex; align-items: center; justify-content: center; width: 25px; height: 25px; padding: 0; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--om-ink-3); font: inherit; font-size: 13px; line-height: 1; cursor: pointer; }
.om-iconbtn:hover { border-color: var(--om-line); color: var(--om-red); }
.om-body { display: flex; flex-direction: column; min-height: 0; flex: 1; padding: 10px 14px 0 17px; }
.om-toolbar { display: flex; align-items: center; gap: 6px; padding-bottom: 8px; flex-wrap: wrap; }
.om-chips { display: inline-flex; gap: 2px; padding: 2px; border: 1px solid var(--om-line); border-radius: 8px; background: var(--om-paper-3); }
.om-chips button { height: 23px; padding: 0 8px; border: 0; border-radius: 6px; background: transparent; color: var(--om-ink-2); font: inherit; font-family: var(--om-serif); font-size: 10.5px; letter-spacing: .04em; cursor: pointer; white-space: nowrap; }
.om-chips button:hover { color: var(--om-ink); }
.om-chips button.on { background: var(--om-red); color: #fff7ef; font-weight: 600; }
.om-select { height: 27px; max-width: 150px; padding: 0 6px; border: 1px solid var(--om-line); border-radius: 7px; background: var(--om-paper-2); color: var(--om-ink); font: inherit; font-size: 10.5px; cursor: pointer; }
.om-btn { height: 25px; padding: 0 10px; border: 1px solid var(--om-line); border-radius: 7px; background: var(--om-paper-2); color: var(--om-ink); font: inherit; font-size: 11px; cursor: pointer; }
.om-btn:hover { border-color: var(--om-red); color: var(--om-red); }
.om-btn.accent { border-color: transparent; background: var(--om-red); color: #fff7ef; box-shadow: 0 2px 0 var(--om-red-2); }
.om-btn.accent:hover { background: var(--om-red-2); color: #fff7ef; }
.om-btn[disabled] { opacity: .4; cursor: default; }
.om-article { flex: 0 1 auto; min-height: 0; max-height: calc(100vh - 220px); overflow-y: auto; padding: 2px 4px 10px 0; scrollbar-width: none; }
.om-article::-webkit-scrollbar { display: none; }
.om-meta { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; color: var(--om-ink-3); font-size: 10.5px; letter-spacing: .03em; }
.om-meta b { color: var(--om-red); font-family: var(--om-serif); font-size: 12.5px; font-weight: 600; letter-spacing: .04em; }
.om-meta .om-dot { color: var(--om-red); }
.om-badge { padding: 1px 5px; border-radius: 4px; background: var(--om-red); color: #fff7ef; font-size: 9px; letter-spacing: .06em; }
.om-stars { display: inline-flex; gap: 2px; margin-left: auto; }
.om-stars i { width: 6px; height: 6px; border-radius: 50%; background: color-mix(in srgb, var(--om-line) 60%, transparent); }
.om-stars i.on { background: var(--om-red); }
.om-statement { margin: 12px 0 4px; color: var(--om-ink); font-family: var(--om-serif); font-size: 15px; line-height: 1.9; letter-spacing: .01em; text-align: justify; text-justify: inter-ideograph; }
.om-line { margin: 0 0 7px; }
.om-gap { height: 6px; }
.om-actions { display: flex; gap: 6px; padding: 10px 0 4px; border-top: 1px solid color-mix(in srgb, var(--om-line) 45%, transparent); margin-top: 10px; flex-wrap: wrap; }
.om-keyidea { display: flex; align-items: flex-start; gap: 8px; margin-top: 10px; padding: 8px 10px; border: 1px dashed color-mix(in srgb, var(--om-line) 70%, transparent); border-radius: 5px; color: var(--om-ink-2); font-size: 11.5px; line-height: 1.75; }
.om-keyidea span { flex: 1; text-align: left; }
.om-keyidea b { flex: none; color: var(--om-red); font-family: var(--om-serif); font-size: 10.5px; font-weight: 600; letter-spacing: .08em; }
.om-box { margin-top: 10px; padding: 10px 12px; border: 1px solid var(--om-line); border-left: 3px solid var(--om-red); border-radius: 5px; background: var(--om-paper-2); }
.om-box h3 { margin: 0 0 7px; color: var(--om-red); font-family: var(--om-serif); font-size: 11px; font-weight: 600; letter-spacing: .1em; }
.om-box .om-line { color: var(--om-ink); font-size: 12.5px; line-height: 1.85; text-align: justify; text-justify: inter-ideograph; }
.om-box.solution h3 { color: var(--om-ink-2); }
.om-box.solution { border-left-color: var(--om-ink-2); }
.om-answer { color: var(--om-ink); font-family: var(--om-serif); font-size: 14px; }
.om-feedback { padding: 26px 10px; text-align: center; color: var(--om-ink-3); font-size: 12px; }
.om-foot { display: flex; align-items: center; gap: 8px; padding: 7px 0 10px; border-top: 1px solid color-mix(in srgb, var(--om-line) 45%, transparent); color: var(--om-ink-3); font-size: 9.5px; letter-spacing: .02em; }
.om-foot b { color: var(--om-ink-2); font-weight: 600; }
.om-resize { position: absolute; right: 2px; bottom: 2px; width: 15px; height: 15px; cursor: ew-resize; touch-action: none; background: linear-gradient(135deg, transparent 48%, var(--om-red) 49%, var(--om-red) 51%, transparent 52%, transparent 60%, var(--om-red) 61%, var(--om-red) 63%, transparent 64%); opacity: .6; }
.om-resize:hover { opacity: 1; }
.om-mini .om-body { display: none; }
.om-math .katex, .om-mathblock .katex { font-size: 1.02em; }
.om-katex-off .om-math { color: var(--om-ink-2); }
`;

    function IconSigma() {
      return h('svg', { viewBox: '0 0 20 20', width: 18, height: 18, 'aria-hidden': true, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' },
        h('path', { d: 'M13.5 4H6.5l4 6-4 6h7' }),
        h('rect', { x: 12.4, y: 12.4, width: 4, height: 4, rx: .6, fill: 'currentColor', stroke: 'none', opacity: .7 }));
    }

    function FooterButton({ wide }) {
      const ui = useUi();
      return h('button', {
        type: 'button',
        className: 'om-launcher',
        title: 'Olympiad · 1000+ problems',
        'aria-label': 'Open Olympiad',
        'aria-pressed': ui.open ? 'true' : 'false',
        onClick: () => setUi({ open: !ui.open, minimized: false }),
      },
      h('span', { className: 'om-launcher-icon' }, h(IconSigma)),
      wide ? h('span', null, 'Olympiad') : null);
    }

    function OlympiadWindow({ ui }) {
      const theme = useThemeMode();
      const [corpus, setCorpus] = useState(null);
      const [error, setError] = useState('');
      const [katexReady, setKatexReady] = useState(Boolean(window.katex));
      const [category, setCategory] = useState('All');
      const [level, setLevel] = useState('all');
      const [problem, setProblem] = useState(null);
      const [showHint, setShowHint] = useState(false);
      const [showAnswer, setShowAnswer] = useState(false);
      const [showSolution, setShowSolution] = useState(false);
      const [, setViewportTick] = useState(0);
      const winRef = useRef(null);

      useEffect(() => {
        const onResize = () => setViewportTick((value) => value + 1);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      }, []);

      useEffect(() => {
        let alive = true;
        fetch(API + '/corpus')
          .then((response) => {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
          })
          .then((data) => {
            if (!alive) return;
            setCorpus(data);
            setProblem(pickRandom(poolOf(data.problems, 'All', 'all'), null));
          })
          .catch((reason) => { if (alive) setError(String(reason && reason.message || reason)); });
        loadKatex().then((ready) => { if (alive) setKatexReady(ready); });
        return () => { alive = false; };
      }, []);

      const reset = (next) => {
        setProblem(next);
        setShowHint(false);
        setShowAnswer(false);
        setShowSolution(false);
      };

      const nextProblem = () => {
        if (!corpus) return;
        reset(pickRandom(poolOf(corpus.problems, category, level), problem ? problem.id : null));
      };

      const chooseCategory = (value) => {
        setCategory(value);
        if (!corpus) return;
        reset(pickRandom(poolOf(corpus.problems, value, level), problem ? problem.id : null));
      };

      const chooseLevel = (value) => {
        setLevel(value);
        if (!corpus) return;
        reset(pickRandom(poolOf(corpus.problems, category, value), problem ? problem.id : null));
      };

      useEffect(() => {
        const onKey = (event) => {
          const target = event.target;
          if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return;
          if (event.key === 'Escape') { setUi({ open: false }); return; }
          if (event.key === 'n' || event.key === 'N') { nextProblem(); return; }
          if (event.key === 'a' || event.key === 'A') { setShowAnswer((value) => !value); return; }
          if (event.key === 's' || event.key === 'S') { setShowSolution((value) => !value); return; }
          if (event.key === 'h' || event.key === 'H') { setShowHint((value) => !value); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      });

      const maxWidth = Math.max(420, Math.min(560, window.innerWidth - 24));
      const winW = clamp(Math.round(ui.w || 470), 420, maxWidth);

      const style = {
        width: winW + 'px',
        left: ui.x == null ? '50%' : clamp(ui.x, 8, window.innerWidth - 160) + 'px',
        top: ui.y == null ? '4%' : clamp(ui.y, 8, window.innerHeight - 48) + 'px',
        transform: ui.x == null ? 'translateX(-50%)' : 'none',
      };

      const onHeaderDown = (event) => {
        if (event.button !== 0) return;
        if (event.target.closest('button')) return;
        const rect = winRef.current ? winRef.current.getBoundingClientRect() : null;
        if (!rect) return;
        const start = { px: event.clientX, py: event.clientY, x: rect.left, y: rect.top };
        const onMove = (moveEvent) => {
          setUi({
            x: clamp(start.x + moveEvent.clientX - start.px, 8, window.innerWidth - 160),
            y: clamp(start.y + moveEvent.clientY - start.py, 8, window.innerHeight - 48),
          });
        };
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      };

      const onResizeDown = (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        const startX = event.clientX;
        const startW = winW;
        const onMove = (moveEvent) => {
          setUi({ w: clamp(Math.round(startW + (moveEvent.clientX - startX)), 420, maxWidth) });
        };
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      };

      const total = corpus ? corpus.meta.count : 0;
      const count = corpus ? poolOf(corpus.problems, category, level).length : 0;

      return h('div', { className: 'om-layer' },
        h('div', { ref: winRef, className: 'om-win' + (ui.minimized ? ' om-mini' : '') + (katexReady ? '' : ' om-katex-off'), 'data-theme': theme, style, role: 'dialog', 'aria-label': 'Olympiad' },
          h('div', { className: 'om-head', onPointerDown: onHeaderDown },
            h('span', { className: 'om-seal' }, 'Σ'),
            h('div', { className: 'om-title' },
              h('b', null, 'Olympiad'),
              h('span', null, corpus ? total + ' problems · ' + count + ' in view · LaTeX' : 'Loading problems · LaTeX')),
            h('span', { className: 'om-spacer' }),
            h('button', { type: 'button', className: 'om-btn accent', onClick: nextProblem, disabled: !corpus, title: 'Next problem (N)' }, 'Next'),
            h('button', { type: 'button', className: 'om-iconbtn', title: ui.minimized ? 'Expand' : 'Collapse', onClick: () => setUi({ minimized: !ui.minimized }) }, ui.minimized ? '▢' : '—'),
            h('button', { type: 'button', className: 'om-iconbtn', title: 'Close', onClick: () => setUi({ open: false }) }, '×')),
          h('div', { className: 'om-body' },
            h('div', { className: 'om-toolbar' },
              h('div', { className: 'om-chips', role: 'group', 'aria-label': 'Difficulty' },
                LEVELS.map((item) => h('button', {
                  key: item.key,
                  type: 'button',
                  className: level === item.key ? 'on' : '',
                  onClick: () => chooseLevel(item.key),
                }, item.label))),
              h('select', {
                className: 'om-select',
                value: category,
                'aria-label': 'Category',
                onChange: (event) => chooseCategory(event.target.value),
              }, CATEGORIES.map((item) => h('option', { key: item, value: item }, item)))),
            h('div', { className: 'om-article' },
              error ? h('div', { className: 'om-feedback' }, 'Could not load the corpus: ' + error)
                : !corpus ? h('div', { className: 'om-feedback' }, 'Loading 1000+ problems…')
                  : !problem ? h('div', { className: 'om-feedback' }, 'No problem matches this filter.')
                    : h(React.Fragment, null,
                      h('div', { className: 'om-meta' },
                        h('b', null, problem.source),
                        h('span', { className: 'om-dot' }, '·'),
                        h('span', null, problem.category),
                        problem.featured ? h('span', { className: 'om-badge' }, 'Featured') : null,
                        h('span', { className: 'om-stars', 'aria-label': 'Difficulty ' + problem.stars + ' of 5' },
                          [...Array(5).keys()].map((index) => h('i', { key: index, className: index < problem.stars ? 'on' : '' })))),
                      h('div', { className: 'om-statement' },
                        problem.statement.map((block, index) => h(MathLines, { key: index, text: block, className: 'om-statement' }))),
                      problem.keyIdea ? h('div', { className: 'om-keyidea' },
                        h('b', null, 'KEY IDEA'),
                        h('span', null, problem.keyIdea)) : null,
                      h('div', { className: 'om-actions' },
                        problem.hint ? h('button', { type: 'button', className: 'om-btn', onClick: () => setShowHint(!showHint) }, showHint ? 'Hide hint' : 'Hint') : null,
                        problem.answer ? h('button', { type: 'button', className: 'om-btn', onClick: () => setShowAnswer(!showAnswer) }, showAnswer ? 'Hide answer' : 'Answer') : null,
                        h('button', { type: 'button', className: 'om-btn accent', onClick: () => setShowSolution(!showSolution) }, showSolution ? 'Hide solution' : 'Detailed solution')),
                      showHint && problem.hint ? h('div', { className: 'om-box' },
                        h('h3', null, 'HINT'),
                        h('p', { className: 'om-line' }, h(MathText, { text: problem.hint }))) : null,
                      showAnswer && problem.answer ? h('div', { className: 'om-box' },
                        h('h3', null, 'ANSWER'),
                        h('div', { className: 'om-answer' }, h(MathText, { text: problem.answer }))) : null,
                      showSolution ? h('div', { className: 'om-box solution' },
                        h('h3', null, 'SOLUTION'),
                        problem.solution.map((block, index) => h(MathLines, { key: index, text: block, className: 'om-lines' }))) : null)),
            h('div', { className: 'om-foot' },
              h('span', null, 'N ', h('b', null, 'Next')),
              h('span', null, 'A ', h('b', null, 'Answer')),
              h('span', null, 'S ', h('b', null, 'Solution')),
              h('span', null, 'H ', h('b', null, 'Hint')),
              h('span', null, 'Esc ', h('b', null, 'Close')))),
          h('div', { className: 'om-resize', title: 'Resize width', onPointerDown: onResizeDown })));
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => {
          const tag = document.createElement('style');
          tag.setAttribute('data-plugin-css', 'olympiad');
          tag.textContent = CSS;
          document.head.appendChild(tag);
          return () => tag.remove();
        }, 'olympiad: styles');

        ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
          name: 'sidebar.footer.action',
          id: 'olympiad',
          order: 40,
          label: () => 'Olympiad',
        }, FooterButton));

        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'olympiad.window',
          order: 520,
        }, function OlympiadOverlay() {
          const ui = useUi();
          if (!ui.open) return null;
          return h(OlympiadWindow, { ui });
        }));
      },
    };
  },
});
