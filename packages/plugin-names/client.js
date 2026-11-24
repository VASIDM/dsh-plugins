/**
 * 插件改名 — Client half。
 *
 * 在 设置 → 插件 → 「插件改名」页里，逐个改本地插件的显示名。
 * 名字写回该插件包的 locale/zh.json 与 locale/en.json，刷新页面后
 * 插件列表与详情会显示新名字。列表只包含 profile 里以 link: 安装的
 * 本地包；DSH 内置插件在 asar 里只读，不出现。
 */
window.__ModuleLoader__.load({
  id: '@local/plugin-names',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const API = '/api/plugin-names';
    const NS = 'plugin.names';

    const zh = {
      title: '插件改名',
      description: '把鼠标移到插件名上，点右侧「⋯」→ 重命名，像重命名任务一样就地改名，回车或失焦保存；写回插件的 locale 文件，刷新页面后生效。内置插件只读，不在列表里。',
      empty: '没有找到以 link: 安装的本地插件。',
      loading: '正在读取…',
      failed: '读取失败：',
      module: '包名',
      zhName: '中文名',
      enName: 'English name',
      save: '保存',
      saved: '已保存，刷新页面后生效',
      readOnlyHint: '只改本地链接包；内置插件在安装目录里只读。',
    };
    const en = {
      title: 'Plugin names',
      description: 'Rename local plugins. The name is written back to the package locale files and appears after a page refresh. Shipped plugins are read-only and not listed.',
      empty: 'No locally linked plugins found.',
      loading: 'Loading…',
      failed: 'Failed to load: ',
      module: 'Package',
      zhName: 'Chinese name',
      enName: 'English name',
      save: 'Save',
      saved: 'Saved. Refresh the page to see it.',
      readOnlyHint: 'Only locally linked packages are writable; shipped plugins are read-only.',
    };

    const CSS = `
.pn-page{box-sizing:border-box;display:flex;flex-direction:column;gap:16px;color:var(--dsw-alias-label-primary);
  max-width:760px;padding:8px 0 24px}
.pn-head{display:flex;flex-direction:column;gap:6px}
.pn-title{margin:0;font-size:18px;line-height:26px;font-weight:500}
.pn-desc,.pn-note{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.pn-list{display:flex;flex-direction:column;border-top:.5px solid var(--dsw-alias-border-l2)}
.pn-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 0;
  border-bottom:.5px solid var(--dsw-alias-border-l2)}
.pn-meta{flex:1 1 220px;min-width:0;display:flex;flex-direction:column;gap:2px}
.pn-pkg{font-family:var(--ds-font-family-code);font-size:12px;color:var(--dsw-alias-label-secondary);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pn-field{display:flex;flex-direction:column;gap:3px;flex:0 1 170px;min-width:120px}
.pn-label{font-size:11px;color:var(--dsw-alias-label-tertiary)}
.pn-input{box-sizing:border-box;width:100%;height:30px;padding:0 8px;
  border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);
  background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px}
.pn-input:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid
  var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}
.pn-name{flex:1 1 240px;min-width:0;padding:4px 6px;font-size:14px;line-height:22px;
  color:var(--dsw-alias-label-primary);border-radius:var(--dsw-radius-xs);cursor:text;outline:none}
.pn-name:hover{background:var(--dsw-alias-interactive-bg-hover)}
.pn-name:focus{background:var(--dsw-alias-bg-layer-1);box-shadow:0 0 0 1px var(--dsw-alias-border-l3)}
.pn-actions{position:relative;flex:none;display:flex;align-items:center}
.pn-more{width:28px;height:28px;border:0;border-radius:var(--dsw-radius-sm);background:0 0;
  color:var(--dsw-alias-label-tertiary);font-size:16px;line-height:1;cursor:pointer;opacity:0;
  transition:opacity .12s,background .12s}
.pn-row:hover .pn-more,.pn-more:focus-visible,.pn-more[aria-expanded=true]{opacity:1}
.pn-more:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.pn-menu{position:absolute;top:32px;right:0;z-index:5;min-width:120px;padding:4px;
  background:var(--dsw-alias-bg-overlay);border:.5px solid var(--dsw-alias-border-l2);
  border-radius:var(--dsw-radius-md);box-shadow:var(--dsw-shadow-lv2)}
.pn-menu-item{display:block;width:100%;padding:6px 10px;border:0;border-radius:var(--dsw-radius-xs);
  background:0 0;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;text-align:left;cursor:pointer}
.pn-menu-item:hover{background:var(--dsw-alias-interactive-bg-hover)}
.pn-edit{box-sizing:border-box;width:100%;height:28px;padding:0 6px;
  border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-xs);
  background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:14px}
.pn-section{display:flex;flex-direction:column;gap:10px;padding:16px 0;border-top:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}
.pn-sectionHead{display:flex;flex-direction:column;gap:4px}
.pn-sectionTitle{margin:0;font-size:14px;line-height:22px;font-weight:500}
.pn-sectionDesc{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.pn-sectionRow{display:flex;align-items:center;gap:10px;max-width:360px}
.pn-save{flex:none;height:30px;padding:0 14px;border:0;border-radius:var(--dsw-radius-sm);
  background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);
  font:inherit;font-size:13px;cursor:pointer}
.pn-save:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}
.pn-save:disabled{opacity:.5;cursor:default}
.pn-status{font-size:12px;color:var(--dsw-alias-label-tertiary)}
.pn-error{color:var(--dsw-alias-state-error-primary);font-size:12px}
`;

    function NamesPage() {
      const [state, setState] = React.useState(null);
      const [error, setError] = React.useState('');
      const [draft, setDraft] = React.useState({});
      const [saved, setSaved] = React.useState('');
      const [menu, setMenu] = React.useState('');
      const [editId, setEditId] = React.useState('');
      const [editText, setEditText] = React.useState('');

      const load = React.useCallback(async () => {
        try {
          const response = await fetch(API, { cache: 'no-store' });
          const data = await response.json();
          setState(data);
          setDraft({});
          setError('');
        } catch (reason) {
          setError(String(reason && reason.message ? reason.message : reason));
        }
      }, []);

      React.useEffect(() => {
        load();
      }, [load]);

      const saveText = async (row, text) => {
        try {
          const response = await fetch(API, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ updates: [{ name: row.name, zh: text }] }),
          });
          const data = await response.json();
          if (!response.ok || !data.ok) throw new Error((data && data.reason) || 'HTTP ' + response.status);
          setState(data);
          setSaved(row.name);
          setError('');
        } catch (reason) {
          setError(String(reason && reason.message ? reason.message : reason));
        }
      };

      const commitEdit = (row) => {
        const next = String(editText || '').replace(/\s+/g, ' ').trim().slice(0, 40);
        setEditId('');
        if (next && next !== row.zh) saveText(row, next);
      };

      const value = (row, key) => {
        const pending = draft[row.name];
        if (pending && typeof pending[key] === 'string') return pending[key];
        return row[key] || '';
      };
      const change = (name, key, text) => {
        setDraft((current) => ({ ...current, [name]: { ...(current[name] || {}), [key]: text } }));
        setSaved('');
      };
      const save = async (row) => {
        const pending = draft[row.name] || {};
        const body = {
          updates: [{
            name: row.name,
            zh: typeof pending.zh === 'string' ? pending.zh : row.zh,
            en: typeof pending.en === 'string' ? pending.en : row.en,
          }],
        };
        try {
          const response = await fetch(API, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          });
          const data = await response.json();
          if (!response.ok || !data.ok) throw new Error((data && data.reason) || 'HTTP ' + response.status);
          setState(data);
          setDraft((current) => {
            const next = { ...current };
            delete next[row.name];
            return next;
          });
          setSaved(row.name);
          setError('');
        } catch (reason) {
          setError(String(reason && reason.message ? reason.message : reason));
        }
      };

      if (!state) {
        return h('div', { className: 'pn-page' },
          error ? h('p', { className: 'pn-error' }, zh.failed + error) : h('p', { className: 'pn-note' }, zh.loading));
      }
      const rows = Array.isArray(state.entries) ? state.entries : [];
      return h('div', { className: 'pn-page' },
        h('div', { className: 'pn-head' },
          h('h2', { className: 'pn-title' }, zh.title),
          h('p', { className: 'pn-desc' }, zh.description),
          h('p', { className: 'pn-note' }, zh.readOnlyHint)),
        error ? h('p', { className: 'pn-error' }, error) : null,
        rows.length === 0
          ? h('p', { className: 'pn-note' }, zh.empty)
          : h('div', { className: 'pn-list' },
            ...rows.map((row) => {
              const dirty = Boolean(draft[row.name])
                && ((draft[row.name].zh ?? row.zh) !== row.zh || (draft[row.name].en ?? row.en) !== row.en);
              const open = menu === row.name;
              const editing = editId === row.name;
              return h('div', { className: 'pn-row', key: row.name },
                h('div', { className: 'pn-meta' },
                  editing
                    ? h('input', {
                      className: 'pn-edit',
                      autoFocus: true,
                      value: editText,
                      maxLength: 40,
                      onChange: (event) => setEditText(event.target.value),
                      onKeyDown: (event) => {
                        if (event.key === 'Enter') commitEdit(row);
                        if (event.key === 'Escape') setEditId('');
                      },
                      onBlur: () => commitEdit(row),
                    })
                    : h('span', { className: 'pn-name' }, row.zh || row.name),
                  h('span', { className: 'pn-pkg', title: row.name }, row.name),
                  saved === row.name ? h('span', { className: 'pn-status' }, zh.saved) : null),
                h('div', { className: 'pn-actions' },
                  h('button', {
                    type: 'button',
                    className: 'pn-more',
                    'aria-label': '更多',
                    'aria-expanded': open,
                    onClick: () => setMenu(open ? '' : row.name),
                  }, '⋯'),
                  open ? h('div', { className: 'pn-menu', role: 'menu' },
                    h('button', {
                      type: 'button',
                      role: 'menuitem',
                      className: 'pn-menu-item',
                      onClick: () => {
                        setMenu('');
                        setEditId(row.name);
                        setEditText(row.zh || '');
                      },
                    }, '重命名')) : null));
            })));
    }

    function NameSection({ subject }) {
      const key = subject && (subject.name || subject.spec);
      const [row, setRow] = React.useState(null);
      const [value, setValue] = React.useState('');
      const [saved, setSaved] = React.useState(false);
      React.useEffect(() => {
        let alive = true;
        fetch(API, { cache: 'no-store' })
          .then((response) => response.json())
          .then((data) => {
            if (!alive) return;
            const found = (data.entries || []).find((entry) => entry.name === key || entry.packageName === key);
            setRow(found || null);
            setValue(found ? found.zh || '' : '');
          })
          .catch(() => {});
        return () => {
          alive = false;
        };
      }, [key]);
      const commit = async () => {
        if (!row) return;
        const next = String(value || '').replace(/\s+/g, ' ').trim().slice(0, 40);
        if (!next || next === row.zh) return;
        try {
          const response = await fetch(API, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ updates: [{ name: row.name, zh: next }] }),
          });
          if (response.ok) setSaved(true);
        } catch {
          /* 保持原值，下一次失焦再试 */
        }
      };
      if (!row) return null;
      return h('section', { className: 'pn-section' },
        h('div', { className: 'pn-sectionHead' },
          h('h3', { className: 'pn-sectionTitle' }, '名称'),
          h('p', { className: 'pn-sectionDesc' }, '直接改名，回车或失焦保存；刷新页面后生效。')),
        h('div', { className: 'pn-sectionRow' },
          h('input', {
            className: 'pn-input',
            value,
            maxLength: 40,
            onChange: (event) => {
              setValue(event.target.value);
              setSaved(false);
            },
            onKeyDown: (event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            },
            onBlur: commit,
          }),
          saved ? h('span', { className: 'pn-status' }, '已保存') : null));
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.effect(() => {
          if (typeof document === 'undefined') return () => {};
          const tag = document.createElement('style');
          tag.dataset.plugin = '@local/plugin-names';
          tag.dataset.pluginCss = '@local/plugin-names/page';
          tag.textContent = CSS;
          document.head.appendChild(tag);
          return () => tag.remove();
        }, 'plugin-names: page styles');
        ctx.slots.inject('plugins.detail.section', () =>
          ctx.slots.register({ name: 'plugins.detail.section', id: 'plugin-names', order: 90 }, NameSection));
        ctx.slots.inject('settings.plugins.tab', () =>
          ctx.slots.register({
            name: 'settings.plugins.tab',
            id: 'plugin-names',
            order: 90,
            label: '插件改名',
          }, NamesPage));
      },
    };
  },
});
