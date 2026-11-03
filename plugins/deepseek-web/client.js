window.__ModuleLoader__.load({
  id: '@local/deepseek-web',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useCallback, useEffect, useRef, useState } = React;

    const NS = 'deepseekWeb';
    const KIND = 'deepseek-web';
    const TAB_ID = '@local/deepseek-web';
    const TARGET = 'https://chat.deepseek.com/';
    /** Storage account handed to the desktop guest channel; one login serves every Session. */
    const STORAGE_ACCOUNT = 'deepseek-web';
    /** Persisted skin preference: the guest borrows the Harness palette unless switched off. */
    const SKIN_KEY = 'dsh.deepseek-web.skin';
    /** Token suffixes that would change the page's own metrics; colours and families travel. */
    const SKIN_SKIP = /-(font-size|line-height|letter-spacing|font-weight|font-style)$/;

    /** Locale-bound translator of the mounted plugin, so a body still speaks without a `t` prop. */
    let bound = (key) => key;
    const translator = (props) => (props && typeof props.t === 'function' ? props.t : bound);

    function readSkinPreference() {
      try {
        return window.localStorage.getItem(SKIN_KEY) !== 'off';
      } catch {
        return true;
      }
    }

    function writeSkinPreference(on) {
      try {
        window.localStorage.setItem(SKIN_KEY, on ? 'on' : 'off');
      } catch {
        /* Storage refused; the choice lasts this mount. */
      }
    }

    /**
     * Every design token the Harness resolved for its own frame.
     *
     * chat.deepseek.com is built on the same `--dsw-*` token set, so handing the guest the
     * values this page already computed skins it exactly like the shell, whatever theme is
     * in force, instead of pinning a second palette that drifts.
     */
    function hostTokens() {
      const values = new Map();
      const candidates = [
        document.documentElement,
        document.body,
        document.getElementById('root'),
      ].filter((element) => element !== null && element !== undefined);
      for (const element of candidates) {
        const computed = window.getComputedStyle(element);
        const total = computed.length;
        for (let index = 0; index < total; index += 1) {
          const name = computed[index];
          if (typeof name !== 'string' || name.startsWith('--dsw-') === false) continue;
          if (values.get(name)) continue;
          const value = computed.getPropertyValue(name).trim();
          if (value !== '') values.set(name, value);
        }
      }
      return values;
    }

    /** Whether a colour reads as a dark surface, for the guest's own `color-scheme`. */
    function isDarkSurface(value) {
      const hex = /^#([0-9a-f]{3,8})$/i.exec(value || '');
      if (hex !== null) {
        const digits = hex[1];
        const size = digits.length <= 4 ? 1 : 2;
        const read = (offset) => {
          const part = digits.slice(offset * size, offset * size + size);
          return parseInt(size === 1 ? part + part : part, 16) || 0;
        };
        return (read(0) * 299 + read(1) * 587 + read(2) * 114) / 1000 < 128;
      }
      const rgb = /rgba?\(([^)]+)\)/.exec(value || '');
      if (rgb !== null) {
        const parts = rgb[1].split(',').map((part) => parseFloat(part));
        if (parts.length >= 3) return (parts[0] * 299 + parts[1] * 587 + parts[2] * 114) / 1000 < 128;
      }
      return false;
    }

    /** Which ink mode the Harness currently resolves to; the guest follows it. */
    function hostScheme() {
      for (const element of [document.documentElement, document.body]) {
        if (element === null) continue;
        const value = window.getComputedStyle(element).getPropertyValue('--dsw-alias-bg-base').trim();
        if (value !== '') return isDarkSurface(value) ? 'dark' : 'light';
      }
      return 'light';
    }

    /**
     * The guest palette: a curated ink set, not a copy of the Harness's own values.
     *
     * The Harness's dark tokens sit within a few percent of each other (#0d0c0b / #141210 /
     * #1b1815) because its own layout separates surfaces with rules and spacing. chat.deepseek.com
     * separates surfaces with fills alone, so the same numbers collapse into one black slab.
     * These values keep the paper-and-ink hue but open up the steps, and put cinnabar on the
     * primary action so the page has one deliberate accent instead of none.
     */
    const INK = {
      dark: {
        '--dsw-alias-bg-base': '#0f0d0b',
        '--dsw-alias-bg-layer-1': '#161310',
        '--dsw-alias-bg-layer-2': '#1d1915',
        '--dsw-alias-bg-layer-3': '#25201a',
        '--dsw-alias-bg-overlay': '#1a1613',
        '--dsw-alias-bg-module-platform': '#161310',
        '--dsw-alias-bg-multi-select': '#25201a',
        '--dsw-alias-bg-skeleton': '#f2eee414',
        '--dsw-alias-border-l1': '#f2eee412',
        '--dsw-alias-border-l2': '#f2eee41e',
        '--dsw-alias-border-l3': '#f2eee42c',
        '--dsw-alias-border-l4': '#f2eee43a',
        '--dsw-alias-border-inverted': '#f2eee40f',
        '--dsw-alias-label-primary': '#ece6d9',
        '--dsw-alias-label-secondary': '#b3a895',
        '--dsw-alias-label-tertiary': '#8a8173',
        '--dsw-alias-label-caption': '#6f6a5f',
        '--dsw-alias-label-dimmed': '#25201a',
        '--dsw-alias-label-primary-dimmed': '#e3dbcb',
        '--dsw-alias-label-primary-foreground': '#141110',
        '--dsw-alias-label-primary-inverted': '#fbf7ee',
        '--dsw-alias-label-shimmer': 'color-mix(in srgb, #f2eee4 45%, transparent)',
        '--dsw-alias-label-deep-diving': '#c3b7a1',
        '--dsw-alias-menu-icon': '#c3b9a6',
        '--dsw-alias-brand-primary': '#b9ac96',
        '--dsw-alias-brand-text': '#ece6d9',
        '--dsw-alias-link': '#cfc4ae',
        '--dsw-alias-state-business-primary': '#9a8f7c',
        '--dsw-alias-state-business-tertiary': '#221d18',
        '--dsw-alias-button-primary-fill': '#e9dfcb',
        '--dsw-alias-button-primary-hover': '#d8ccb2',
        '--dsw-alias-button-primary-dimmed': '#3a342c',
        '--dsw-alias-button-contrast-fill': '#ece6d9',
        '--dsw-alias-button-elevated-fill': '#221d18',
        '--dsw-alias-button-floating-fill': '#1d1915',
        '--dsw-alias-button-floating-hover': '#25201a',
        '--dsw-alias-button-ghost-active-border': '#6f6759',
        '--dsw-alias-button-ghost-active-fill': '#3a211d',
        '--dsw-alias-button-ghost-active-hover': '#452722',
        '--dsw-alias-button-info-fill': '#9a8f7c',
        '--dsw-alias-button-info-hover': '#ada18c',
        '--dsw-alias-button-tool-bar-fill': '#4c484280',
        '--dsw-alias-button-tool-bar-hover': '#4c484299',
        '--dsw-alias-button-tool-bar-fill-invisible': '#1f1f1f5c',
        '--dsw-alias-interactive-bg-hover': '#f2eee412',
        '--dsw-alias-interactive-bg-active': '#f2eee41f',
        '--dsw-alias-interactive-bg-hover-accent': '#f2eee42e',
        '--dsw-alias-interactive-bg-hover-danger': '#b4503c26',
        '--dsw-alias-interactive-bg-hover-solid': '#25201a',
        '--dsw-menu-surface-fill': '#221d18e6',
        '--dsw-specific-menu': '#221d18e6',
        '--dsw-specific-selector': '#25201a',
        '--dsw-specific-tip': '#1a1613',
        '--dsw-specific-bubble': '#221c16',
        '--dsw-specific-bubble-highlight': '#2d251d',
        '--dsw-specific-input-major': '#161310',
        '--dsw-specific-login-input': '#141110',
        '--dsw-alias-toast-bg': '#25201a',
        '--dsw-alias-toast-label': '#ece6d9',
        '--dsw-alias-tooltip-bg': '#25201a',
        '--dsw-alias-tooltip-key-bg': '#3a3026',
        '--dsw-alias-markdown-code-block': '#141110',
        '--dsw-alias-markdown-code-block-banner': '#1a1613',
        '--dsw-alias-markdown-code-segment-selected': '#221d18',
        '--dsw-alias-markdown-code-segment-unselected': '#12100e',
        '--dsw-alias-markdown-inline-code': '#1a1613',
        '--dsw-alias-markdown-citation': '#1a1613',
        '--dsw-alias-markdown-tag': '#221d18',
        '--dsw-alias-markdown-placeholder': '#1a1613',
        '--dsw-alias-state-error-primary': '#d9796b',
        '--dsw-alias-state-success-primary': '#8fae92',
        '--dsw-alias-state-warn-primary': '#c9a25f',
        '--dsw-alias-state-idle-primary': '#6f6a5f',
        '--dsw-alias-scrollbar-bg-l1': '#3a332b',
        '--dsw-alias-scrollbar-bg-l2': '#4a4238',
        '--dsw-alias-scrollbar-hover-l1': '#4a4238',
        '--dsw-alias-scrollbar-hover-l2': '#5a5044',
        '--dsw-alias-turn-trigger-bg': '#1a1613',
        '--dsw-alias-turn-trigger-bg-hover': '#25201a',
        '--dsw-alias-menu-group-header-fill': '#1a1613f0',
        '--dsw-alias-switch-thumb': '#e3dbcb',
        '--dsw-linear-gradient-think': 'linear-gradient(180deg,#0f0d0b 20%,#0f0d0b00 100%)',
        '--dsw-linear-think-select': 'linear-gradient(180deg,#161310 20%,#16131000 100%)',
      },
      light: {
        '--dsw-alias-bg-base': '#f2ebdb',
        '--dsw-alias-bg-layer-1': '#faf5e8',
        '--dsw-alias-bg-layer-2': '#eae1cd',
        '--dsw-alias-bg-layer-3': '#ded3b9',
        '--dsw-alias-bg-overlay': '#faf5e8',
        '--dsw-alias-bg-module-platform': '#f7f0e0',
        '--dsw-alias-bg-multi-select': '#ded3b9',
        '--dsw-alias-bg-skeleton': '#1715120d',
        '--dsw-alias-border-l1': '#17151214',
        '--dsw-alias-border-l2': '#17151224',
        '--dsw-alias-border-l3': '#17151233',
        '--dsw-alias-border-l4': '#17151242',
        '--dsw-alias-border-inverted': '#0000',
        '--dsw-alias-label-primary': '#191613',
        '--dsw-alias-label-secondary': '#4c4842',
        '--dsw-alias-label-tertiary': '#6f6a60',
        '--dsw-alias-label-caption': '#a29b8d',
        '--dsw-alias-label-dimmed': '#ded3b9',
        '--dsw-alias-label-primary-dimmed': '#141210',
        '--dsw-alias-label-primary-foreground': '#fbf8ef',
        '--dsw-alias-label-primary-inverted': '#fbf8ef',
        '--dsw-alias-label-shimmer': 'color-mix(in srgb, #171512 30%, transparent)',
        '--dsw-alias-label-deep-diving': '#6f6759',
        '--dsw-alias-menu-icon': '#3b3833',
        '--dsw-alias-brand-primary': '#5a5348',
        '--dsw-alias-brand-text': '#191613',
        '--dsw-alias-link': '#4a443a',
        '--dsw-alias-state-business-primary': '#5c5749',
        '--dsw-alias-state-business-tertiary': '#e6ded0',
        '--dsw-alias-button-primary-fill': '#1c1916',
        '--dsw-alias-button-primary-hover': '#2b2723',
        '--dsw-alias-button-primary-dimmed': '#ded3b9',
        '--dsw-alias-button-contrast-fill': '#3b3833',
        '--dsw-alias-button-elevated-fill': '#faf5e8',
        '--dsw-alias-button-floating-fill': '#faf5e8',
        '--dsw-alias-button-floating-hover': '#eae1cd',
        '--dsw-alias-button-ghost-active-border': '#6f6a60',
        '--dsw-alias-button-ghost-active-fill': '#f2ddd3',
        '--dsw-alias-button-ghost-active-hover': '#ebd0c4',
        '--dsw-alias-button-info-fill': '#5c5749',
        '--dsw-alias-button-info-hover': '#6f6a5e',
        '--dsw-alias-button-tool-bar-fill': '#4c484280',
        '--dsw-alias-button-tool-bar-hover': '#4c484299',
        '--dsw-alias-button-tool-bar-fill-invisible': '#0d0c0b5c',
        '--dsw-alias-interactive-bg-hover': '#1715120f',
        '--dsw-alias-interactive-bg-active': '#1715121a',
        '--dsw-alias-interactive-bg-hover-accent': '#17151224',
        '--dsw-alias-interactive-bg-hover-danger': '#9e3b2f12',
        '--dsw-alias-interactive-bg-hover-solid': '#eae1cd',
        '--dsw-menu-surface-fill': '#faf5e8d9',
        '--dsw-specific-menu': '#faf5e8d9',
        '--dsw-specific-selector': '#eae1cd',
        '--dsw-specific-tip': '#eae1cd',
        '--dsw-specific-bubble': '#efe6d2',
        '--dsw-specific-bubble-highlight': '#e5dac2',
        '--dsw-specific-input-major': '#fdfaf1',
        '--dsw-specific-login-input': '#faf5e8',
        '--dsw-alias-toast-bg': '#191613',
        '--dsw-alias-toast-label': '#faf5e8',
        '--dsw-alias-tooltip-bg': '#191613',
        '--dsw-alias-tooltip-key-bg': '#3b3833',
        '--dsw-alias-markdown-code-block': '#eae1cd',
        '--dsw-alias-markdown-code-block-banner': '#ded3b9',
        '--dsw-alias-markdown-code-segment-selected': '#faf5e8',
        '--dsw-alias-markdown-code-segment-unselected': '#ded3b9',
        '--dsw-alias-markdown-inline-code': '#eae1cd',
        '--dsw-alias-markdown-citation': '#eae1cd',
        '--dsw-alias-markdown-tag': '#eae1cd',
        '--dsw-alias-markdown-placeholder': '#ded3b9',
        '--dsw-alias-state-error-primary': '#b3382b',
        '--dsw-alias-state-success-primary': '#4f6f52',
        '--dsw-alias-state-warn-primary': '#9a6a1f',
        '--dsw-alias-state-idle-primary': '#c3bbab',
        '--dsw-alias-scrollbar-bg-l1': '#d8cfbc',
        '--dsw-alias-scrollbar-bg-l2': '#d8cfbc',
        '--dsw-alias-scrollbar-hover-l1': '#c5baa5',
        '--dsw-alias-scrollbar-hover-l2': '#c5baa5',
        '--dsw-alias-turn-trigger-bg': '#eae1cd',
        '--dsw-alias-turn-trigger-bg-hover': '#ded3b9',
        '--dsw-alias-menu-group-header-fill': '#f2ebdbf0',
        '--dsw-alias-switch-thumb': '#fbf8f1',
        '--dsw-linear-gradient-think': 'linear-gradient(180deg,#f2ebdb 20%,#f2ebdb00 100%)',
        '--dsw-linear-think-select': 'linear-gradient(180deg,#eae1cd 20%,#eae1cd00 100%)',
      },
    };

    /** Prose is set in a Song typeface so the guest reads like the rest of the paper. */
    const GUEST_SERIF =
      '"Songti SC","Noto Serif SC","Source Han Serif SC","STSong",SimSun,"Iowan Old Style","Palatino Linotype",Georgia,serif';

    /** Build the override sheet handed to the guest document, or null when the host has no tokens. */
    function skinStylesheet() {
      const tokens = hostTokens();
      // Without a real palette the guest would be painted by a fallback colour: leave it native.
      if (tokens.size < 20) return null;
      const dark = isDarkSurface(tokens.get('--dsw-alias-bg-base') ?? '#fff');
      const ink = INK[dark ? 'dark' : 'light'];
      // Every structural colour is neutral ink, so nothing the site paints with a token can turn
      // red on its own. These two marks below are the only place cinnabar is allowed.
      const accent = dark ? '#9c4a3a' : '#9e3b2f';
      const keep = /font-family|radius|shadow/;
      const declarations = [];
      // Typography and shape still come from the Harness; the ink palette owns every colour.
      for (const [name, value] of tokens) {
        if (SKIN_SKIP.test(name) || name in ink || keep.test(name) === false) continue;
        declarations.push(`${name}:${value} !important`);
      }
      for (const [name, value] of Object.entries(ink)) declarations.push(`${name}:${value} !important`);
      // No texture and no mount: the guest is just another column of the Harness,
      // and the paper feeling has to come from hue and tonal steps alone.
      // DeepSeek's toggle chip takes its three states from ghost-active tokens, whose gradations
      // are invisible on purpose; restate them so "on" is unmistakable and "off" recedes.
      // An engaged chip is *stamped*: inverted paper on ink (or ink on paper), never a second red.
      const onFill = dark ? '#e9dfcb' : '#1c1916';
      const onInk = dark ? '#12100e' : '#fbf8ef';
      const onFillHover = dark ? '#d6cab0' : '#2b2723';
      return `
html, body, body[data-ds-dark-theme] { ${declarations.join(';')} }
html, body { background-color: ${ink['--dsw-alias-bg-base']} !important }
:root { color-scheme: ${dark ? 'dark' : 'light'} }
::selection { background: ${accent}${dark ? '3d' : '33'} !important }
a { color: var(--dsw-alias-link) !important; text-underline-offset: 2px }
* { scrollbar-width: thin; scrollbar-color: var(--dsw-alias-scrollbar-bg-l1) transparent }
.ds-textarea { border-radius: 3px !important }
.ds-toggle-button {
  color: var(--dsw-alias-label-secondary) !important;
  border-color: var(--dsw-alias-border-l2) !important;
  background-color: transparent !important;
}
.ds-toggle-button:hover:not(.ds-toggle-button--selected) {
  color: var(--dsw-alias-label-primary) !important;
  border-color: var(--dsw-alias-border-l3) !important;
}
.ds-toggle-button.ds-toggle-button--selected {
  color: ${onInk} !important;
  border-color: ${onFill} !important;
  background-color: ${onFill} !important;
  box-shadow: none;
}
.ds-toggle-button.ds-toggle-button--selected:hover {
  background-color: ${onFillHover} !important;
  border-color: ${onFillHover} !important;
}
.ds-toggle-button.ds-toggle-button--selected > .ds-toggle-button__icon {
  color: ${onInk} !important;
}
.ds-markdown {
  font-family: ${GUEST_SERIF} !important;
  line-height: 1.85 !important;
  letter-spacing: .012em;
}
.ds-markdown :is(h1, h2, h3) {
  padding-bottom: .22em;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  letter-spacing: .02em;
  font-weight: 600;
}
.ds-markdown :is(h1, h2, h3)::before {
  content: "";
  display: inline-block;
  width: .42em;
  height: .42em;
  margin-right: .5em;
  vertical-align: .12em;
  background: ${accent};
  border-radius: 1px;
}
.ds-markdown blockquote {
  margin: .95em 0;
  padding: .12em 0 .12em 14px;
  border-left: 2px solid ${accent};
  color: var(--dsw-alias-label-secondary);
}
.ds-markdown hr {
  height: 1px;
  border: 0;
  background: linear-gradient(90deg, transparent, var(--dsw-alias-border-l3) 10%, var(--dsw-alias-border-l3) 90%, transparent);
}
.ds-markdown pre {
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 4px;
  background: var(--dsw-alias-markdown-code-block) !important;
  box-shadow: inset 0 1px 0 ${dark ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.55)'};
}
.ds-markdown code:not(pre code) {
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-markdown-inline-code) !important;
  border-radius: 3px;
  padding: .05em .35em;
}
`;
    }

    const zh = {
      'tab.title': 'DeepSeek 网页版',
      'guide.title': 'DeepSeek 网页版',
      'guide.description': '用你自己的 DeepSeek 账号直接对话，不消耗 Harness token。',
      'bar.address': 'chat.deepseek.com',
      'bar.reload': '刷新',
      'bar.external': '在系统浏览器中打开',
      'bar.skin.on': '皮肤：纸墨（点击切回原生配色）',
      'bar.skin.off': '皮肤：原生配色（点击套上纸墨）',
      'state.loading': '正在连接 DeepSeek 网页版…',
      'state.error.title': '页面没能加载',
      'state.retry': '重试',
      'state.unsupported.title': '需要桌面版应用',
      'state.unsupported.body':
        '内嵌网页用的是桌面版自带的内嵌通道。当前页面开在普通浏览器里，只能把 DeepSeek 网页版放到系统浏览器中打开。',
      'action.external': '在系统浏览器打开',
      'seal.label': '深',
    };

    const en = {
      'tab.title': 'DeepSeek Web',
      'guide.title': 'DeepSeek Web',
      'guide.description': 'Chat with your own DeepSeek account without spending Harness tokens.',
      'bar.address': 'chat.deepseek.com',
      'bar.reload': 'Reload',
      'bar.external': 'Open in system browser',
      'bar.skin.on': 'Skin: Harness palette (click for the native look)',
      'bar.skin.off': 'Skin: native palette (click to follow the Harness)',
      'state.loading': 'Connecting to DeepSeek Web…',
      'state.error.title': 'The page did not load',
      'state.retry': 'Retry',
      'state.unsupported.title': 'Desktop app required',
      'state.unsupported.body': 'Embedding uses the desktop app guest channel. This page runs in a plain browser, so DeepSeek Web can only open outside it.',
      'action.external': 'Open in system browser',
      'seal.label': 'DS',
    };

    const CSS = `
.dsw-root{display:flex;flex-direction:column;height:100%;min-height:0;flex:auto;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base)}
.dsw-bar{position:relative;display:flex;align-items:center;gap:8px;flex:none;height:34px;padding:0 8px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-specific-sidebar-fill,var(--dsw-alias-bg-layer-1))}
.dsw-bar::after{content:"";position:absolute;left:10%;right:10%;bottom:-1px;height:1px;background:linear-gradient(90deg,transparent,rgba(168,50,42,.55),transparent);pointer-events:none}
.dsw-seal{display:inline-flex;align-items:center;justify-content:center;flex:none;border-radius:3px;background:#a8322a;color:#fff;font-weight:600;line-height:1;letter-spacing:-.02em;box-shadow:inset 0 0 0 1px rgba(255,255,255,.16);user-select:none}
.dsw-url{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--dsw-alias-label-tertiary);letter-spacing:.02em}
.dsw-btn{display:inline-flex;align-items:center;justify-content:center;flex:none;width:22px;height:22px;padding:0;border:1px solid transparent;border-radius:var(--dsw-radius-xs,4px);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.dsw-btn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l1)}
.dsw-btn:focus-visible{outline:1px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dsw-btn[data-active=true]{color:#a8322a;border-color:rgba(168,50,42,.42);background:rgba(168,50,42,.08)}
.dsw-btn[data-active=true]:hover{background:rgba(168,50,42,.16);color:#8f2a23}
.dsw-stage{position:relative;flex:auto;min-height:0;display:flex}
.dsw-guest{-webkit-app-region:no-drag;border:0;flex:auto;width:100%;min-width:0;height:100%;min-height:0;display:flex;background:var(--dsw-alias-bg-base)}
.dsw-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.6}
.dsw-overlay[data-tone=error]{color:var(--dsw-alias-label-primary)}
.dsw-ring{width:26px;height:26px;border-radius:50%;border:2px solid var(--dsw-alias-border-l2);border-top-color:#a8322a;animation:dsw-spin 900ms linear infinite}
.dsw-title{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}
.dsw-note{max-width:22em;color:var(--dsw-alias-label-tertiary);font-size:11px}
.dsw-detail{max-width:26em;font-family:var(--dsh-font-family-code-default,monospace);font-size:10px;color:var(--dsw-alias-label-tertiary);word-break:break-word}
.dsw-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.dsw-action{height:26px;padding:0 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm,6px);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:11px;cursor:pointer}
.dsw-action:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dsw-action[data-primary=true]{background:#a8322a;border-color:#8f2a23;color:#fff}
.dsw-action[data-primary=true]:hover{background:#8f2a23}
.dsw-tabtitle{display:inline-flex;align-items:center;gap:5px;min-width:0}
.dsw-tabtitle .dsw-seal{width:13px;height:13px;font-size:8px;border-radius:2px}
.dsw-tabtitle-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@keyframes dsw-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.dsw-ring{animation:none}}
`;

    function Seal({ size = 18 }) {
      return h(
        'span',
        {
          className: 'dsw-seal',
          style: { width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.56) + 'px' },
          'aria-hidden': true,
        },
        h('span', null, '深'),
      );
    }

    /** Compass-ringed whale: the guide card's artwork. */
    function GuideArtwork({ size = 22, className }) {
      return h(
        'svg',
        { viewBox: '0 0 24 24', width: size, height: size, className, 'aria-hidden': true, style: { display: 'block' } },
        h('circle', {
          cx: 12,
          cy: 12,
          r: 10.2,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.1,
          opacity: 0.32,
        }),
        h('path', {
          d: 'M6.1 13.6c1.2-2.6 3.1-4.2 5.6-4.7 1.7-.3 3.2 0 4.5.9.9.6 1.6 1.3 2.1 2.2.3.6.5 1.1.6 1.7-1-.5-1.9-.6-2.7-.3-.9.4-1.3 1.1-1.3 2 0 .7.2 1.3.6 1.8-2.6.6-4.9.2-6.7-1.2-.4-.3-.8-.6-1.2-1.1-.4-.4-.9-.8-1.5-1.3z',
          fill: 'currentColor',
        }),
        h('circle', { cx: 16.4, cy: 11.9, r: 0.75, fill: 'var(--dsw-alias-bg-base)' }),
      );
    }

    function reloadGlyph() {
      return h(
        'svg',
        { viewBox: '0 0 16 16', width: 14, height: 14, 'aria-hidden': true },
        h('path', {
          d: 'M8 2.6a5.4 5.4 0 1 1-5.33 6.2h1.6A3.8 3.8 0 1 0 8 4.2c-.9 0-1.73.31-2.38.83L7.2 6.6H2.9V2.3l1.55 1.55A5.38 5.38 0 0 1 8 2.6z',
          fill: 'currentColor',
        }),
      );
    }

    /** A brush: the skin toggle, ink on paper. */
    function brushGlyph() {
      return h(
        'svg',
        { viewBox: '0 0 16 16', width: 14, height: 14, 'aria-hidden': true },
        h('path', {
          d: 'M11.9 1.9c.5-.5 1.3-.5 1.8 0s.5 1.3 0 1.8L8.6 8.8 6.2 6.4l5.7-4.5z',
          fill: 'currentColor',
        }),
        h('path', {
          d: 'M5.4 7.2 8.8 10.6c-.8 1.9-2.2 3.1-4.3 3.6-1.1.3-2.2.3-3.2.1.6-1 .8-2 .7-3-.1-1.9 1.1-3.4 3.4-4.1z',
          fill: 'currentColor',
          opacity: 0.78,
        }),
      );
    }

    function externalGlyph() {
      return h(
        'svg',
        { viewBox: '0 0 16 16', width: 14, height: 14, 'aria-hidden': true },
        h('path', {
          d: 'M9.2 2.4h4.4v4.4h-1.5V4.86L7.4 9.6 6.4 8.6l4.74-4.7H9.2V2.4zM3.2 3.9h3.1v1.5H4.7v6.4h6.4V9.7h1.5v3.1H3.2V3.9z',
          fill: 'currentColor',
        }),
      );
    }

    /** Open outside the guest; the desktop shell routes http(s) window opens to the system browser. */
    function openOutside(url) {
      try {
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch {
        /* The shell refuses the open; nothing else to do. */
      }
    }

    function Overlay({ tone, children }) {
      return h('div', { className: 'dsw-overlay', 'data-tone': tone }, children);
    }

    function DeepSeekWebBody(props) {
      const t = translator(props);
      const hostRef = useRef(null);
      const guestRef = useRef(null);
      const [phase, setPhase] = useState('loading');
      const [detail, setDetail] = useState('');
      const [attempt, setAttempt] = useState(0);
      const skinOnRef = useRef(readSkinPreference());
      const [skinOn, setSkinOn] = useState(skinOnRef.current);
      const skinKeyRef = useRef(null);

      const applySkin = useCallback(async () => {
        const element = guestRef.current;
        if (element === null || skinOnRef.current === false) return;
        const css = skinStylesheet();
        if (css === null) return;
        try {
          skinKeyRef.current = await element.insertCSS(css);
        } catch {
          /* The guest navigated away or closed before the sheet landed. */
        }
      }, []);

      const dropSkin = useCallback(async () => {
        const element = guestRef.current;
        const key = skinKeyRef.current;
        skinKeyRef.current = null;
        if (element === null || key === null || key === undefined) return;
        try {
          await element.removeInsertedCSS(key);
        } catch {
          /* Already gone with the document. */
        }
      }, []);

      const toggleSkin = useCallback(() => {
        const next = skinOnRef.current === false;
        skinOnRef.current = next;
        setSkinOn(next);
        writeSkinPreference(next);
        if (next) applySkin();
        else dropSkin();
      }, [applySkin, dropSkin]);

      useEffect(() => {
        const host = hostRef.current;
        if (!host) return undefined;

        const dock = globalThis.dshDesktop;
        const bridge = dock && dock.protocolVersion === 1 && dock.browser ? dock.browser : undefined;
        if (!bridge) {
          setPhase('unsupported');
          return undefined;
        }

        let cancelled = false;
        let guest = null;
        let lease = null;
        let unsubscribe = null;
        let watchdog = 0;
        let everReady = false;
        setPhase('loading');
        setDetail('');

        const stopWatchdog = () => {
          if (watchdog === 0) return;
          clearTimeout(watchdog);
          watchdog = 0;
        };

        const fail = (error) => {
          if (cancelled) return;
          stopWatchdog();
          setPhase('error');
          setDetail(error ? String((error && error.message) || error) : '');
        };

        // A guest that never reaches dom-ready would otherwise leave the panel loading forever.
        watchdog = setTimeout(() => {
          watchdog = 0;
          if (!cancelled) setPhase('error');
        }, 20000);

        // In auto mode, follow the Harness when it switches between ink and paper: the guest is
        // a separate document, so nothing repaints it on its own.
        let scheme = hostScheme();
        const themeWatch = window.setInterval(() => {
          if (cancelled || skinOnRef.current === false) return;
          const next = hostScheme();
          if (next === scheme) return;
          scheme = next;
          applySkin();
        }, 1200);

        (async () => {
          try {
            const reservation = await bridge.acquire(STORAGE_ACCOUNT);
            if (cancelled) {
              Promise.resolve(bridge.release(reservation.lease)).catch(() => {});
              return;
            }
            lease = reservation.lease;
            const element = document.createElement('webview');
            element.className = 'dsw-guest';
            element.setAttribute('name', reservation.lease);
            element.setAttribute('partition', reservation.partition);
            element.setAttribute('allowpopups', '');
            element.setAttribute('src', 'about:blank#' + reservation.lease);
            element.addEventListener(
              'dom-ready',
              () => {
                if (cancelled) return;
                element.loadURL(TARGET).catch((error) => {
                  if (error && (error.code === 'ERR_ABORTED' || error.errno === -3)) return;
                  fail(error);
                });
              },
              { once: true },
            );
            element.addEventListener('did-start-loading', () => {
              if (!cancelled && !everReady) setPhase('loading');
            });
            element.addEventListener('did-stop-loading', () => {
              if (cancelled) return;
              everReady = true;
              stopWatchdog();
              setPhase('ready');
            });
            element.addEventListener('did-finish-load', () => {
              if (!cancelled) applySkin();
            });
            element.addEventListener('did-fail-load', (event) => {
              if (cancelled || !event.isMainFrame || event.errorCode === -3) return;
              stopWatchdog();
              setPhase('error');
              setDetail(event.errorDescription || 'error ' + event.errorCode);
            });
            element.addEventListener('render-process-gone', () => {
              if (!cancelled) setPhase('error');
            });
            element.addEventListener('destroyed', () => {
              if (!cancelled && guest === element) setPhase('error');
            });
            guest = element;
            guestRef.current = element;
            host.appendChild(element);
            if (typeof bridge.onOpenRequested === 'function') {
              unsubscribe = bridge.onOpenRequested(reservation.lease, (url) => openOutside(url));
            }
          } catch (error) {
            fail(error);
          }
        })();

        return () => {
          cancelled = true;
          stopWatchdog();
          window.clearInterval(themeWatch);
          if (typeof unsubscribe === 'function') {
            unsubscribe();
            unsubscribe = null;
          }
          if (guest !== null) {
            guest.remove();
            guest = null;
          }
          guestRef.current = null;
          skinKeyRef.current = null;
          const id = lease;
          lease = null;
          if (id !== null) {
            try {
              Promise.resolve(bridge.release(id)).catch(() => {});
            } catch {
              /* The window is going away. */
            }
          }
        };
      }, [attempt]);

      const reload = useCallback(() => {
        const element = guestRef.current;
        if (element && typeof element.reload === 'function') element.reload();
      }, []);

      const retry = useCallback(() => setAttempt((value) => value + 1), []);

      let overlay = null;
      if (phase === 'unsupported') {
        overlay = h(
          Overlay,
          { tone: 'unsupported' },
          h(Seal, { size: 30 }),
          h('p', { className: 'dsw-title' }, t('state.unsupported.title')),
          h('p', { className: 'dsw-note' }, t('state.unsupported.body')),
          h(
            'div',
            { className: 'dsw-actions' },
            h(
              'button',
              { type: 'button', className: 'dsw-action', 'data-primary': 'true', onClick: () => openOutside(TARGET) },
              t('action.external'),
            ),
          ),
        );
      } else if (phase === 'error') {
        overlay = h(
          Overlay,
          { tone: 'error' },
          h('p', { className: 'dsw-title' }, t('state.error.title')),
          detail ? h('p', { className: 'dsw-detail' }, detail) : null,
          h(
            'div',
            { className: 'dsw-actions' },
            h('button', { type: 'button', className: 'dsw-action', 'data-primary': 'true', onClick: retry }, t('state.retry')),
            h('button', { type: 'button', className: 'dsw-action', onClick: () => openOutside(TARGET) }, t('action.external')),
          ),
        );
      } else if (phase === 'loading') {
        overlay = h(
          Overlay,
          { tone: 'loading' },
          h('span', { className: 'dsw-ring', 'aria-hidden': true }),
          h('p', null, t('state.loading')),
        );
      }

      return h(
        'div',
        { className: 'dsw-root' },
        h(
          'div',
          { className: 'dsw-bar' },
          h(Seal, { size: 18 }),
          h('span', { className: 'dsw-url' }, t('bar.address')),
          h(
            'button',
            {
              type: 'button',
              className: 'dsw-btn',
              'data-active': skinOn ? 'true' : 'false',
              'aria-pressed': skinOn ? 'true' : 'false',
              title: t(skinOn ? 'bar.skin.on' : 'bar.skin.off'),
              'aria-label': t(skinOn ? 'bar.skin.on' : 'bar.skin.off'),
              onClick: toggleSkin,
            },
            brushGlyph(),
          ),
          h(
            'button',
            { type: 'button', className: 'dsw-btn', title: t('bar.reload'), 'aria-label': t('bar.reload'), onClick: reload },
            reloadGlyph(),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dsw-btn',
              title: t('bar.external'),
              'aria-label': t('bar.external'),
              onClick: () => openOutside(TARGET),
            },
            externalGlyph(),
          ),
        ),
        h('div', { className: 'dsw-stage', ref: hostRef }, overlay),
      );
    }

    function DeepSeekWebTitle(props) {
      const t = translator(props);
      return h(
        'span',
        { className: 'dsw-tabtitle' },
        h(Seal, { size: 13 }),
        h('span', { className: 'dsw-tabtitle-text' }, t('tab.title')),
      );
    }

    return {
      inject: ['slots', 'locale', 'sidebarRightTabs'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'deepseek-web: copy');

        const t = ctx.locale.bind(NS);
        bound = t;

        ctx.effect(() => {
          const tag = document.createElement('style');
          tag.setAttribute('data-plugin-css', '@local/deepseek-web');
          tag.textContent = CSS;
          document.head.appendChild(tag);
          return () => tag.remove();
        }, 'deepseek-web: styles');

        ctx.effect(
          () =>
            ctx.sidebarRightTabs.register({
              id: TAB_ID,
              kind: KIND,
              multiple: false,
              priority: 'extension',
              keepMounted: true,
              title: () => t('tab.title'),
              guide: [
                {
                  id: 'open',
                  order: 40,
                  title: () => t('guide.title'),
                  description: () => t('guide.description'),
                  icon: GuideArtwork,
                },
              ],
            }),
          'deepseek-web: tab type',
        );

        ctx.slots.inject('sidebar.right.pane.tab', () =>
          ctx.slots.register(
            {
              name: 'sidebar.right.pane.tab',
              key: TAB_ID,
              locale: NS,
            },
            DeepSeekWebBody,
          ),
        );

        ctx.slots.inject('sidebar.right.pane.tab.title', () =>
          ctx.slots.register(
            {
              name: 'sidebar.right.pane.tab.title',
              key: TAB_ID,
              locale: NS,
            },
            DeepSeekWebTitle,
          ),
        );
      },
    };
  },
});
