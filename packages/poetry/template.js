/* Browser half of 诗笺: a local classical poetry reader in a floating card. */
window.__ModuleLoader__.load({
  id: '@local/poetry',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useEffect, useRef, useState } = React;

    const POEMS = __POEMS__;
    const AUTHOR_BIOS = __AUTHOR_BIOS__;

    const UI_KEY = 'poetry.ui.v1';
    const FAV_KEY = 'poetry.fav.v1';
    const SCALE_KEY = 'poetry.scale.v1';
    const RATIO = 0.66;
    const GENRES = ['全部', '精注', '诗', '词', '曲'];
    const TABS = [
      { id: 'notes', label: '注释' },
      { id: 'translation', label: '白话' },
      { id: 'appreciation', label: '赏析' },
      { id: 'bio', label: '作者' },
      { id: 'background', label: '背景' },
    ];

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    function poolOf(filter) {
      if (filter === '精注') return POEMS.filter((poem) => poem.curated);
      return POEMS.filter((poem) => filter === '全部' || poem.genre === filter);
    }

    function pickRandom(filter, excludeId) {
      let pool = poolOf(filter);
      if (filter === '全部' && Math.random() < 0.55) {
        const curated = POEMS.filter((poem) => poem.curated);
        if (curated.length) pool = curated;
      }
      const rest = pool.filter((poem) => poem.id !== excludeId);
      const source = rest.length ? rest : pool;
      return source[Math.floor(Math.random() * source.length)];
    }

    function readFavorites() {
      try {
        const value = JSON.parse(window.localStorage.getItem(FAV_KEY) || '[]');
        return new Set(Array.isArray(value) ? value : []);
      } catch {
        return new Set();
      }
    }

    function writeFavorites(set) {
      try { window.localStorage.setItem(FAV_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
    }

    function readScale() {
      const value = Number(window.localStorage.getItem(SCALE_KEY) || '1');
      return Number.isFinite(value) && value >= 0.9 && value <= 1.2 ? value : 1;
    }

    /* ------------------------------------------------------------------ theme */

    function luminanceOf(color) {
      const parts = String(color).match(/[\d.]+/g);
      if (!parts || parts.length < 3) return null;
      const [r, g, b] = parts.map(Number);
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    }

    function detectThemeMode() {
      try {
        const anchor = document.querySelector('.pt-win') || document.body;
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

    /* ---------------------------------------------------------------- ui store */

    const uiState = { open: false, x: null, y: null, w: 420, minimized: false };
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

    /* ----------------------------------------------------------------- styles */

    const CSS = `
.pt-launcher { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 30px; padding: 0 9px; border: 0; border-radius: 8px; background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; cursor: pointer; }
.pt-launcher:hover { background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2)); color: var(--dsw-alias-label-primary); }
.pt-launcher[aria-pressed="true"] { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, transparent); color: var(--dsw-alias-brand-primary); }
.pt-launcher-icon { display: inline-flex; width: 18px; height: 18px; }
.pt-launcher-icon svg { width: 18px; height: 18px; }

.pt-layer { position: fixed; inset: 0; z-index: 60; pointer-events: none; }
.pt-win, .pt-win * { box-sizing: border-box; }
.pt-win {
  --pt-serif: var(--dsh-font-family-brand, "Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", "SimSun", Georgia, serif);
  --pt-paper: #f7f1e4;
  --pt-paper-2: #fffdf6;
  --pt-paper-3: #efe6d4;
  --pt-ink: #241e18;
  --pt-ink-2: #5d4f3f;
  --pt-ink-3: #8b7b66;
  --pt-line: #b9a98f;
  --pt-red: #b23a2c;
  --pt-red-2: #8e2a1e;
  --pt-red-soft: #f1d8cf;
  --pt-red-wash: #f7e7e0;
  position: fixed;
  display: flex;
  flex-direction: column;
  min-width: 360px;
  max-width: calc(100vw - 24px);
  border: 1px solid var(--pt-line);
  border-radius: 16px;
  background:
    radial-gradient(120% 70% at 10% 0%, color-mix(in srgb, var(--pt-red) 7%, transparent), transparent 58%),
    repeating-linear-gradient(0deg, color-mix(in srgb, var(--pt-ink) 2.2%, transparent) 0 1px, transparent 1px 4px),
    var(--pt-paper);
  color: var(--pt-ink);
  box-shadow: 0 26px 64px rgba(46, 34, 22, .26), 0 2px 6px rgba(46, 34, 22, .08);
  overflow: hidden;
  pointer-events: auto;
  font-family: var(--dsh-font-family-text-default, "Segoe UI", system-ui, sans-serif);
  -webkit-font-smoothing: antialiased;
}
.pt-win[data-theme="dark"] {
  --pt-paper: #171210;
  --pt-paper-2: #221a15;
  --pt-paper-3: #2b211a;
  --pt-ink: #f4e9d8;
  --pt-ink-2: #cbb89f;
  --pt-ink-3: #9a8871;
  --pt-line: #7d6a54;
  --pt-red: #e05743;
  --pt-red-2: #f0785f;
  --pt-red-soft: #4a241d;
  --pt-red-wash: #3a1d17;
  box-shadow: 0 30px 72px rgba(0, 0, 0, .6), 0 2px 6px rgba(0, 0, 0, .35);
}
.pt-win::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: linear-gradient(180deg, var(--pt-red), var(--pt-red-2)); }

.pt-head { display: flex; align-items: center; gap: 10px; padding: 12px 13px 9px 16px; border-bottom: 1px solid color-mix(in srgb, var(--pt-line) 55%, transparent); cursor: move; user-select: none; touch-action: none; }
.pt-seal { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 5px; background: var(--pt-red); color: #fff7ef; font-family: var(--pt-serif); font-size: 15px; font-weight: 700; transform: rotate(-2deg); box-shadow: 0 2px 0 var(--pt-red-2); }
.pt-title { display: flex; flex-direction: column; min-width: 0; }
.pt-title b { color: var(--pt-ink); font-family: var(--pt-serif); font-size: 15px; font-weight: 700; letter-spacing: .16em; }
.pt-title span { margin-top: 1px; color: var(--pt-ink-3); font-size: 10px; letter-spacing: .03em; }
.pt-spacer { flex: 1; }
.pt-iconbtn { display: inline-flex; align-items: center; justify-content: center; width: 25px; height: 25px; padding: 0; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--pt-ink-3); font: inherit; font-size: 13px; line-height: 1; cursor: pointer; }
.pt-iconbtn:hover { border-color: var(--pt-line); color: var(--pt-red); }
.pt-iconbtn.on { color: var(--pt-red); }

.pt-body { display: flex; flex-direction: column; min-height: 0; flex: 1; padding: 10px 14px 0 17px; }
.pt-toolbar { display: flex; align-items: center; gap: 6px; padding-bottom: 8px; }
.pt-genres { display: inline-flex; gap: 2px; padding: 2px; border: 1px solid var(--pt-line); border-radius: 8px; background: var(--pt-paper-3); }
.pt-genres button { height: 23px; padding: 0 9px; border: 0; border-radius: 6px; background: transparent; color: var(--pt-ink-2); font: inherit; font-family: var(--pt-serif); font-size: 11px; letter-spacing: .06em; cursor: pointer; }
.pt-genres button:hover { color: var(--pt-ink); }
.pt-genres button.on { background: var(--pt-red); color: #fff7ef; font-weight: 600; }
.pt-btn { height: 25px; padding: 0 10px; border: 1px solid var(--pt-line); border-radius: 7px; background: var(--pt-paper-2); color: var(--pt-ink); font: inherit; font-size: 11px; cursor: pointer; }
.pt-btn:hover { border-color: var(--pt-red); color: var(--pt-red); }
.pt-btn.accent { border-color: transparent; background: var(--pt-red); color: #fff7ef; box-shadow: 0 2px 0 var(--pt-red-2); }
.pt-btn.accent:hover { background: var(--pt-red-2); color: #fff7ef; }
.pt-btn[disabled] { opacity: .35; cursor: default; }
.pt-scale { display: inline-flex; gap: 3px; }
.pt-scale button { width: 24px; height: 24px; padding: 0; border: 1px solid var(--pt-line); border-radius: 6px; background: transparent; color: var(--pt-ink-2); font: inherit; font-size: 11px; cursor: pointer; }
.pt-scale button:hover { border-color: var(--pt-red); color: var(--pt-red); }

.pt-article { flex: 1; min-height: 0; overflow-y: auto; padding: 2px 4px 10px 0; scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--pt-line) 70%, transparent) transparent; }
.pt-article::-webkit-scrollbar { width: 6px; }
.pt-article::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--pt-line) 70%, transparent); border-radius: 3px; }
.pt-h1 { margin: 4px 0 2px; color: var(--pt-ink); font-family: var(--pt-serif); font-size: 22px; font-weight: 700; letter-spacing: .08em; line-height: 1.35; }
.pt-meta { display: flex; align-items: center; gap: 8px; color: var(--pt-ink-3); font-size: 10.5px; letter-spacing: .04em; }
.pt-meta .pt-dot { color: var(--pt-red); }
.pt-badge { padding: 1px 5px; border: 1px solid color-mix(in srgb, var(--pt-line) 60%, transparent); border-radius: 4px; color: var(--pt-ink-3); font-size: 9px; letter-spacing: .08em; }
.pt-badge.curated { border-color: transparent; background: var(--pt-red); color: #fff7ef; }
.pt-empty .pt-btn { display: block; margin: 10px auto 0; }
.pt-meta .pt-copy { margin-left: auto; }
.pt-poem { margin: 14px 0 12px; text-align: center; color: var(--pt-ink); font-family: var(--pt-serif); font-size: calc(17px * var(--pt-scale, 1)); line-height: 2.05; letter-spacing: .1em; }
.pt-poem div { white-space: pre-wrap; }
.pt-rule { display: flex; align-items: center; gap: 8px; margin: 2px 0 10px; color: var(--pt-red); }
.pt-rule::before, .pt-rule::after { content: ''; flex: 1; height: 1px; background: color-mix(in srgb, var(--pt-line) 70%, transparent); }
.pt-rule i { width: 5px; height: 5px; background: var(--pt-red); transform: rotate(45deg); }

.pt-tabs { position: sticky; top: 0; z-index: 2; display: flex; gap: 2px; padding: 4px 0 8px; background: var(--pt-paper); }
.pt-tabs button { height: 25px; padding: 0 9px; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--pt-ink-3); font: inherit; font-family: var(--pt-serif); font-size: 11.5px; letter-spacing: .08em; cursor: pointer; }
.pt-tabs button:hover { color: var(--pt-ink); }
.pt-tabs button.on { border-color: color-mix(in srgb, var(--pt-red) 45%, transparent); background: var(--pt-red-wash); color: var(--pt-red); font-weight: 600; }
.pt-section { padding: 2px 0 8px; color: var(--pt-ink-2); font-size: calc(12.5px * var(--pt-scale, 1)); line-height: 1.85; }
.pt-note { display: flex; gap: 6px; padding: 3px 0; border-bottom: 1px dashed color-mix(in srgb, var(--pt-line) 55%, transparent); }
.pt-note:last-child { border-bottom: 0; }
.pt-note b { flex: none; color: var(--pt-red); font-family: var(--pt-serif); font-weight: 600; }
.pt-note span { color: var(--pt-ink-2); }
.pt-para { margin: 0 0 8px; text-indent: 2em; }
.pt-para:last-child { margin-bottom: 0; }
.pt-empty { padding: 18px 0; color: var(--pt-ink-3); font-size: 12px; text-align: center; }

.pt-foot { display: flex; align-items: center; gap: 8px; padding: 7px 0 10px; border-top: 1px solid color-mix(in srgb, var(--pt-line) 45%, transparent); color: var(--pt-ink-3); font-size: 9.5px; letter-spacing: .02em; }
.pt-foot b { color: var(--pt-ink-2); font-weight: 600; }

.pt-resize { position: absolute; right: 2px; bottom: 2px; width: 15px; height: 15px; cursor: nwse-resize; touch-action: none; background: linear-gradient(135deg, transparent 48%, var(--pt-red) 49%, var(--pt-red) 51%, transparent 52%, transparent 60%, var(--pt-red) 61%, var(--pt-red) 63%, transparent 64%); opacity: .6; }
.pt-resize:hover { opacity: 1; }
.pt-mini .pt-body { display: none; }
`;

    /* ---------------------------------------------------------------- icons */

    function IconScroll() {
      return h('svg', { viewBox: '0 0 20 20', width: 18, height: 18, 'aria-hidden': true, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' },
        h('path', { d: 'M5 4.5h10M5 15.5h10' }),
        h('path', { d: 'M6.5 4.5v11M13.5 4.5v11' }),
        h('path', { d: 'M8.5 7.5h3M8.5 10h3M8.5 12.5h2' }),
        h('rect', { x: 12.2, y: 11.6, width: 4.2, height: 4.2, rx: .7, fill: 'currentColor', stroke: 'none', opacity: .75 }));
    }

    function FooterButton({ wide }) {
      const ui = useUi();
      return h('button', {
        type: 'button',
        className: 'pt-launcher',
        title: '诗笺 · 随机一首',
        'aria-label': '打开诗笺',
        'aria-pressed': ui.open ? 'true' : 'false',
        onClick: () => setUi({ open: !ui.open, minimized: false }),
      },
      h('span', { className: 'pt-launcher-icon' }, h(IconScroll)),
      wide ? h('span', null, '诗笺') : null);
    }

    /* ---------------------------------------------------------------- window */

    function PoetryWindow({ ui }) {
      const theme = useThemeMode();
      const [filter, setFilter] = useState('全部');
      const [poem, setPoem] = useState(() => pickRandom('全部', null));
      const [tab, setTab] = useState('notes');
      const [favorites, setFavorites] = useState(readFavorites);
      const [scale, setScale] = useState(readScale);
      const [copied, setCopied] = useState(false);
      const [, setViewportTick] = useState(0);
      const winRef = useRef(null);

      useEffect(() => {
        const onResize = () => setViewportTick((value) => value + 1);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      }, []);

      const nextPoem = () => {
        setPoem((current) => pickRandom(filter, current.id));
        setTab('notes');
        setCopied(false);
      };

      const chooseFilter = (value) => {
        setFilter(value);
        setPoem((current) => (value === '全部' || current.genre === value ? current : pickRandom(value, current.id)));
      };

      const toggleFavorite = () => {
        setFavorites((current) => {
          const next = new Set(current);
          if (next.has(poem.id)) next.delete(poem.id);
          else next.add(poem.id);
          writeFavorites(next);
          return next;
        });
      };

      const changeScale = (delta) => {
        setScale((current) => {
          const next = clamp(Math.round((current + delta) * 100) / 100, 0.9, 1.2);
          try { window.localStorage.setItem(SCALE_KEY, String(next)); } catch { /* ignore */ }
          return next;
        });
      };

      const copyPoem = async () => {
        const text = poem.title + '\n' + poem.dynasty + '·' + poem.author + '\n\n' + poem.text.join('\n');
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch { /* ignore */ }
      };

      useEffect(() => {
        const onKey = (event) => {
          const target = event.target;
          if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
          if (event.key === 'Escape') { setUi({ open: false }); return; }
          if (event.key === 'r' || event.key === 'R') { nextPoem(); return; }
          if (event.key === 'f' || event.key === 'F') { toggleFavorite(); return; }
          if (event.key === '+' || event.key === '=') { changeScale(0.05); return; }
          if (event.key === '-' || event.key === '_') { changeScale(-0.05); return; }
          const index = Number(event.key) - 1;
          if (index >= 0 && index < TABS.length) { setTab(TABS[index].id); return; }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      });

      const maxWidth = Math.max(360, Math.min(460, window.innerWidth - 24, Math.round((window.innerHeight - 24) * RATIO)));
      const winW = clamp(Math.round(ui.w || 420), 360, maxWidth);
      const winH = Math.round(winW / RATIO);
      const isFav = favorites.has(poem.id);

      const style = {
        width: winW + 'px',
        height: winH + 'px',
        left: ui.x == null ? '50%' : clamp(ui.x, 8, window.innerWidth - 160) + 'px',
        top: ui.y == null ? '4%' : clamp(ui.y, 8, window.innerHeight - 48) + 'px',
        transform: ui.x == null ? 'translateX(-50%)' : 'none',
        '--pt-scale': scale,
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
          const nextW = clamp(Math.round(startW + (moveEvent.clientX - startX)), 360, maxWidth);
          setUi({ w: nextW, h: Math.round(nextW / RATIO) });
        };
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      };

      const section = (() => {
        if (tab === 'notes') {
          return h('div', { className: 'pt-section' },
            poem.notes.map(([term, text], index) => h('div', { className: 'pt-note', key: index },
              h('b', null, term),
              h('span', null, text))));
        }
        if (tab === 'translation' || tab === 'appreciation') {
          return h('div', { className: 'pt-section' },
            poem[tab].map((paragraph, index) => h('p', { className: 'pt-para', key: index }, paragraph)));
        }
        if (tab === 'bio') return h('div', { className: 'pt-section' }, h('p', { className: 'pt-para' }, poem.bio));
        return h('div', { className: 'pt-section' }, h('p', { className: 'pt-para' }, poem.background));
      })();

      return h('div', { className: 'pt-layer' },
        h('div', { ref: winRef, className: 'pt-win' + (ui.minimized ? ' pt-mini' : ''), 'data-theme': theme, style, role: 'dialog', 'aria-label': '诗笺' },
          h('div', { className: 'pt-head', onPointerDown: onHeaderDown },
            h('span', { className: 'pt-seal' }, '诗'),
            h('div', { className: 'pt-title' },
              h('b', null, '诗笺'),
              h('span', null, '随机一首 · 共 ' + POEMS.length + ' 篇 · 精注 ' + POEMS.filter((item) => item.curated).length)),
            h('span', { className: 'pt-spacer' }),
            h('button', { type: 'button', className: 'pt-btn accent', onClick: nextPoem, title: '换一首（R）' }, '换一首'),
            h('button', { type: 'button', className: 'pt-iconbtn' + (isFav ? ' on' : ''), onClick: toggleFavorite, title: isFav ? '取消收藏（F）' : '收藏（F）', 'aria-pressed': isFav ? 'true' : 'false' }, isFav ? '★' : '☆'),
            h('button', { type: 'button', className: 'pt-iconbtn', title: ui.minimized ? '展开' : '收起', onClick: () => setUi({ minimized: !ui.minimized }) }, ui.minimized ? '▢' : '—'),
            h('button', { type: 'button', className: 'pt-iconbtn', title: '关闭', onClick: () => setUi({ open: false }) }, '×')),
          h('div', { className: 'pt-body' },
            h('div', { className: 'pt-toolbar' },
              h('div', { className: 'pt-genres', role: 'group', 'aria-label': '体裁' },
                GENRES.map((item) => h('button', {
                  key: item,
                  type: 'button',
                  className: filter === item ? 'on' : '',
                  onClick: () => chooseFilter(item),
                }, item))),
              h('span', { className: 'pt-spacer' }),
              h('div', { className: 'pt-scale' },
                h('button', { type: 'button', title: '缩小字号（-）', onClick: () => changeScale(-0.05) }, 'A−'),
                h('button', { type: 'button', title: '放大字号（+）', onClick: () => changeScale(0.05) }, 'A+'))),
            h('div', { className: 'pt-article' },
              h('h1', { className: 'pt-h1' }, poem.title),
              h('div', { className: 'pt-meta' },
                h('span', null, poem.dynasty),
                h('span', { className: 'pt-dot' }, '·'),
                h('span', null, poem.author),
                h('span', { className: 'pt-dot' }, '·'),
                h('span', null, poem.form),
                h('span', { className: 'pt-spacer' }),
                h('button', { type: 'button', className: 'pt-btn pt-copy', onClick: copyPoem }, copied ? '已复制' : '复制')),
              h('div', { className: 'pt-poem', style: { fontSize: 'calc(17px * ' + scale + ')' } },
                poem.text.map((line, index) => h('div', { key: index }, line))),
              h('div', { className: 'pt-rule' }, h('i')),
              h('div', { className: 'pt-tabs', role: 'tablist' },
                TABS.map((item) => h('button', {
                  key: item.id,
                  type: 'button',
                  role: 'tab',
                  'aria-selected': tab === item.id ? 'true' : 'false',
                  className: tab === item.id ? 'on' : '',
                  onClick: () => setTab(item.id),
                }, item.label))),
              section),
            h('div', { className: 'pt-foot' },
              h('span', null, 'R ', h('b', null, '换一首')),
              h('span', null, 'F ', h('b', null, '收藏')),
              h('span', null, '1–5 ', h('b', null, '切栏')),
              h('span', null, '± ', h('b', null, '字号')),
              h('span', null, 'Esc ', h('b', null, '关闭')))),
          h('div', { className: 'pt-resize', title: '拖动缩放（保持比例）', onPointerDown: onResizeDown })));
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => {
          const tag = document.createElement('style');
          tag.setAttribute('data-plugin-css', 'poetry');
          tag.textContent = CSS;
          document.head.appendChild(tag);
          return () => tag.remove();
        }, 'poetry: styles');

        ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
          name: 'sidebar.footer.action',
          id: 'poetry',
          order: 30,
          label: () => '诗笺',
        }, FooterButton));

        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'poetry.window',
          order: 510,
        }, function PoetryOverlay() {
          const ui = useUi();
          if (!ui.open) return null;
          return h(PoetryWindow, { ui });
        }));
      },
    };
  },
});
