/* Browser half of the habit-memory + Azur Lane Live2D bundle. */
window.__ModuleLoader__.load({
  id: '@local/azl-habits',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useEffect, useMemo, useRef, useState, useCallback } = React;

    const HABIT_PANEL = 'azl-habits';
    const L2D_PANEL = 'azl-l2d';
    const API = '/api/azl-habits';
    const L2D_API = '/api/azl-l2d';

    /* ------------------------------------------------------------- styles */

    const CSS = `
.azl-panel { position: relative; display: flex; flex-direction: column; height: 100%; min-height: 0; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-base); font-size: 13px; line-height: 1.5; }
.azl-panel * { box-sizing: border-box; }
.azl-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 18px 22px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.azl-title { margin: 0; font-size: 17px; font-weight: 650; letter-spacing: .01em; }
.azl-sub { margin: 3px 0 0; color: var(--dsw-alias-label-secondary); font-size: 12px; }
.azl-eyebrow { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 6px; color: var(--dsw-alias-label-secondary); font-size: 10px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; }
.azl-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-state-success-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-success-primary) 22%, transparent); }
.azl-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.azl-btn { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 11px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 7px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; cursor: pointer; transition: background .15s ease, border-color .15s ease; }
.azl-btn:hover { background: var(--dsw-alias-bg-layer-2); }
.azl-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.azl-btn[disabled] { opacity: .5; cursor: default; }
.azl-btn.primary { border-color: transparent; background: var(--dsw-alias-brand-primary); color: #fff; }
.azl-btn.ghost { border-color: transparent; background: transparent; }
.azl-btn.small { height: 24px; padding: 0 8px; font-size: 11px; }
.azl-body { flex: 1; min-height: 0; overflow: auto; padding: 16px 22px 28px; }
.azl-hero { display: grid; grid-template-columns: repeat(auto-fit, minmax(132px, 1fr)); gap: 10px; margin-bottom: 18px; }
.azl-metric { padding: 11px 13px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-layer-1); }
.azl-metric b { display: block; font-size: 20px; font-weight: 650; font-variant-numeric: tabular-nums; }
.azl-metric span { color: var(--dsw-alias-label-secondary); font-size: 11px; }
.azl-switchrow { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 12px 14px; margin-bottom: 10px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-layer-1); }
.azl-switchrow b { font-weight: 600; font-size: 12.5px; }
.azl-switchrow p { margin: 2px 0 0; color: var(--dsw-alias-label-secondary); font-size: 11.5px; }
.azl-switch { position: relative; flex: none; width: 38px; height: 21px; padding: 0; border: 1px solid var(--dsw-alias-border-l2); border-radius: 999px; background: var(--dsw-alias-bg-layer-2); cursor: pointer; transition: background .18s ease, border-color .18s ease; }
.azl-switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 15px; height: 15px; border-radius: 50%; background: var(--dsw-alias-label-secondary); transition: transform .18s ease, background .18s ease; }
.azl-switch[aria-checked="true"] { border-color: transparent; background: var(--dsw-alias-brand-primary); }
.azl-switch[aria-checked="true"]::after { transform: translateX(17px); background: #fff; }
.azl-habits { display: flex; flex-direction: column; gap: 8px; margin: 14px 0 0; }
.azl-habit { display: flex; gap: 10px; align-items: flex-start; padding: 11px 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 9px; background: var(--dsw-alias-bg-layer-1); }
.azl-habit.off { opacity: .55; }
.azl-habit-main { flex: 1; min-width: 0; }
.azl-habit-text { margin: 0; font-size: 12.5px; overflow-wrap: anywhere; }
.azl-habit-text[contenteditable="true"] { outline: 1px dashed var(--dsw-alias-border-l2); border-radius: 4px; padding: 2px 4px; }
.azl-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }
.azl-tag { display: inline-flex; align-items: center; gap: 4px; padding: 1px 6px; border-radius: 5px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); font-size: 10.5px; }
.azl-tag.kind { color: var(--dsw-alias-brand-primary); }
.azl-habit-tools { display: flex; flex: none; gap: 4px; }
.azl-iconbtn { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; padding: 0; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.azl-iconbtn:hover { border-color: var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.azl-add { display: flex; gap: 8px; margin-top: 12px; }
.azl-input, .azl-select { height: 30px; min-width: 0; padding: 0 10px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 7px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; }
.azl-input:focus, .azl-select:focus { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.azl-input.grow { flex: 1; }
.azl-empty { padding: 26px 18px; border: 1px dashed var(--dsw-alias-border-l2); border-radius: 10px; color: var(--dsw-alias-label-secondary); text-align: center; font-size: 12px; }
.azl-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-top: 22px; padding-top: 14px; border-top: 1px solid var(--dsw-alias-border-l1); color: var(--dsw-alias-label-secondary); font-size: 11px; }
.azl-note { display: flex; align-items: center; gap: 6px; }
.azl-error { margin-bottom: 12px; padding: 9px 12px; border: 1px solid var(--dsw-alias-state-error-primary); border-radius: 8px; color: var(--dsw-alias-state-error-primary); font-size: 12px; }
.azl-loading { padding: 40px 0; color: var(--dsw-alias-label-secondary); text-align: center; font-size: 12px; }

/* ---- L2D viewer ---- */
.azl2d { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) 268px; height: 100%; min-height: 480px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); }
.azl2d-nav { grid-column: 2; grid-row: 1; display: flex; flex-direction: column; min-height: 0; border-left: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); }
.azl2d-navhead { padding: 14px 14px 10px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.azl2d-brand { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
.azl2d-brand h2 { margin: 0; font-size: 13px; font-weight: 650; letter-spacing: .02em; }
.azl2d-count { color: var(--dsw-alias-label-secondary); font-size: 10.5px; font-variant-numeric: tabular-nums; }
.azl2d-search { width: 100%; height: 29px; padding: 0 9px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 7px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; }
.azl2d-search:focus { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.azl2d-list { flex: 1; min-height: 0; overflow: auto; padding: 8px; }
.azl2d-group { margin: 2px 0 10px; }
.azl2d-grouplabel { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; justify-content: space-between; padding: 5px 7px; background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 92%, transparent); backdrop-filter: blur(6px); color: var(--dsw-alias-label-secondary); font-size: 10px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
.azl2d-card { display: flex; gap: 9px; align-items: center; width: 100%; padding: 7px; border: 1px solid transparent; border-radius: 8px; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.azl2d-card:hover { background: var(--dsw-alias-bg-layer-2); }
.azl2d-card[aria-current="true"] { border-color: var(--dsw-alias-brand-primary); background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent); }
.azl2d-thumb { position: relative; flex: none; width: 42px; height: 54px; overflow: hidden; border-radius: 6px; background: linear-gradient(150deg, #1d2a44, #3c5b86 55%, #8fb4d9); box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); }
.azl2d-thumb img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: 50% 6%; }
.azl2d-thumb b { position: absolute; inset: auto 0 5px; color: #fff; font-size: 15px; font-weight: 650; text-align: center; text-shadow: 0 1px 4px rgba(0,0,0,.5); }
.azl2d-thumb.ready b { display: none; }
.azl2d-thumb::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 55%, rgba(6,10,20,.35)); opacity: 0; }
.azl2d-thumb.ready::after { opacity: 1; }
.azl2d-meta { min-width: 0; }
.azl2d-meta strong { display: block; overflow: hidden; font-size: 12.5px; font-weight: 600; white-space: nowrap; text-overflow: ellipsis; }
.azl2d-meta span { display: block; overflow: hidden; color: var(--dsw-alias-label-secondary); font-size: 10.5px; white-space: nowrap; text-overflow: ellipsis; }
.azl2d-stagewrap { grid-column: 1; grid-row: 1; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.azl2d-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.azl2d-toolbar .spacer { flex: 1; }
.azl2d-stage { position: relative; flex: 1 1 auto; min-height: 380px; overflow: hidden; background: radial-gradient(120% 90% at 50% 8%, #2b4a72 0%, #14203a 52%, #0a1020 100%); }
.azl2d-stage canvas { display: block; width: 100%; height: 100%; }
.azl2d-canvas { position: absolute; inset: 0; }
.azl2d-canvas canvas { display: block; width: 100%; height: 100%; }
.azl2d-stage.green { background: #00b140; }
.azl2d-stage.grid { background-color: #101724; background-image: linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px); background-size: 24px 24px; }
.azl2d-overlay { position: absolute; inset: auto 14px 14px auto; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; pointer-events: none; }
.azl2d-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px; border: 1px solid rgba(255,255,255,.16); border-radius: 999px; background: rgba(10,16,32,.55); color: rgba(255,255,255,.82); font-size: 10.5px; backdrop-filter: blur(8px); }
.azl2d-hint { position: absolute; left: 50%; bottom: 16px; transform: translateX(-50%); padding: 6px 12px; border-radius: 999px; background: rgba(10,16,32,.6); color: rgba(255,255,255,.75); font-size: 11px; pointer-events: none; backdrop-filter: blur(8px); white-space: nowrap; }
.azl2d-status { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 24px; color: rgba(255,255,255,.8); text-align: center; font-size: 12px; }
.azl2d-status strong { color: #ffb4ab; }
.azl2d-spinner { width: 26px; height: 26px; border: 2px solid rgba(255,255,255,.2); border-top-color: rgba(255,255,255,.85); border-radius: 50%; animation: azl2d-spin .8s linear infinite; }
@keyframes azl2d-spin { to { transform: rotate(360deg); } }
.azl2d-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 9px 14px; border-top: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); }
.azl2d-controls label { display: inline-flex; align-items: center; gap: 6px; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.azl2d-motions { display: flex; flex-wrap: wrap; gap: 5px; max-height: 56px; overflow: auto; }
.azl2d-chip { height: 24px; padding: 0 9px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 6px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; font-size: 11px; cursor: pointer; }
.azl2d-chip:hover { background: var(--dsw-alias-bg-layer-2); }
.azl2d-chip.on { border-color: transparent; background: var(--dsw-alias-brand-primary); color: #fff; }
.azl2d-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; height: 100%; padding: 30px; color: var(--dsw-alias-label-secondary); text-align: center; }
.azl2d-empty h3 { margin: 0; color: var(--dsw-alias-label-primary); font-size: 15px; }
.azl2d-empty p { max-width: 430px; margin: 0; font-size: 12px; line-height: 1.6; }
@media (max-width: 860px) { .azl2d { grid-template-columns: minmax(0, 1fr) 216px; } }
@media (max-height: 620px) { .azl2d-controls { display: none; } }
`;

    const ICONS = {
      habits: h('svg', { viewBox: '0 0 20 20', width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true },
        h('path', { d: 'M10 2.5 12 7.4l5.3.5-4 3.5 1.2 5.2L10 13.9l-4.5 2.7 1.2-5.2-4-3.5 5.3-.5z', strokeLinejoin: 'round' })),
      l2d: h('svg', { viewBox: '0 0 20 20', width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true },
        h('rect', { x: 2.5, y: 3.5, width: 15, height: 13, rx: 2.5 }),
        h('path', { d: 'M6.5 12.5c1-2.4 2.2-3.6 3.5-3.6s2.5 1.2 3.5 3.6', strokeLinecap: 'round' }),
        h('circle', { cx: 10, cy: 7.4, r: 1.2 })),
      edit: h('svg', { viewBox: '0 0 20 20', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true },
        h('path', { d: 'M4.2 14.6V16h1.4l8.1-8.1-1.4-1.4zM13.3 5.2l1.4 1.4 1.1-1.1a1 1 0 0 0 0-1.4l-.1-.1a1 1 0 0 0-1.4 0z', strokeLinecap: 'round', strokeLinejoin: 'round' })),
      refresh: h('svg', { viewBox: '0 0 20 20', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, 'aria-hidden': true },
        h('path', { d: 'M15.5 8a5.6 5.6 0 1 0 .3 3.4M15.5 4.2V8h-3.8', strokeLinecap: 'round', strokeLinejoin: 'round' })),
      trash: h('svg', { viewBox: '0 0 20 20', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true },
        h('path', { d: 'M4 6h12M8 6V4.5h4V6m-6.5 0 .7 9.5h7.6L14.5 6', strokeLinecap: 'round', strokeLinejoin: 'round' })),
      power: h('svg', { viewBox: '0 0 20 20', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, 'aria-hidden': true },
        h('path', { d: 'M10 3v7m4.5-4.2a6 6 0 1 1-9 0', strokeLinecap: 'round' })),
    };

    async function api(path, body) {
      const response = body
        ? await fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch(API + path, { cache: 'no-store' });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error((data && data.error) || 'HTTP ' + response.status);
      return data;
    }

    function Switch({ checked, onChange, label }) {
      return h('button', {
        type: 'button',
        className: 'azl-switch',
        role: 'switch',
        'aria-checked': checked ? 'true' : 'false',
        'aria-label': label,
        onClick: () => onChange(!checked),
      });
    }

    const KIND_LABEL = {
      language: '语言',
      style: '语气',
      workflow: '流程',
      tooling: '工具',
      format: '格式',
      content: '内容',
      safety: '安全',
      other: '其他',
    };

    function HabitRow({ habit, onToggle, onDelete, onEdit }) {
      const [editing, setEditing] = useState(false);
      const [draft, setDraft] = useState(habit.text);
      useEffect(() => setDraft(habit.text), [habit.text]);
      const commit = () => {
        setEditing(false);
        const next = draft.trim();
        if (next && next !== habit.text) onEdit(habit.id, next);
        else setDraft(habit.text);
      };
      return h('div', { className: 'azl-habit' + (habit.enabled ? '' : ' off') },
        h('div', { className: 'azl-habit-main' },
          editing
            ? h('input', {
              className: 'azl-input',
              style: { width: '100%' },
              value: draft,
              autoFocus: true,
              onChange: (event) => setDraft(event.target.value),
              onBlur: commit,
              onKeyDown: (event) => {
                if (event.key === 'Enter') commit();
                if (event.key === 'Escape') { setDraft(habit.text); setEditing(false); }
              },
            })
            : h('p', {
              className: 'azl-habit-text',
              onDoubleClick: () => setEditing(true),
              title: '双击编辑',
            }, habit.text),
          h('div', { className: 'azl-tags' },
            h('span', { className: 'azl-tag kind' }, KIND_LABEL[habit.kind] || habit.kind),
            h('span', { className: 'azl-tag' }, '强度 ' + habit.strength),
            h('span', { className: 'azl-tag' }, habit.source === 'model' ? '模型记录' : habit.source === 'user' ? '手动添加' : '自动学习'),
            habit.hits > 1 ? h('span', { className: 'azl-tag' }, '出现 ' + habit.hits + ' 次') : null)),
        h('div', { className: 'azl-habit-tools' },
          h('button', {
            type: 'button',
            className: 'azl-iconbtn',
            title: '编辑内容',
            'aria-label': '编辑内容',
            onClick: () => setEditing(true),
          }, ICONS.edit),
          h('button', {
            type: 'button',
            className: 'azl-iconbtn',
            title: habit.enabled ? '停用这条习惯' : '重新启用',
            'aria-label': habit.enabled ? '停用' : '启用',
            onClick: () => onToggle(habit.id, !habit.enabled),
          }, ICONS.power),
          h('button', {
            type: 'button',
            className: 'azl-iconbtn',
            title: '删除',
            'aria-label': '删除',
            onClick: () => onDelete(habit.id),
          }, ICONS.trash)));
    }

    function HabitPanel() {
      const [state, setState] = useState(null);
      const [error, setError] = useState('');
      const [busy, setBusy] = useState(false);
      const [draft, setDraft] = useState('');
      const [kind, setKind] = useState('other');

      const load = useCallback(async () => {
        try {
          const data = await api('/state');
          setState(data);
          setError('');
        } catch (reason) {
          setError('无法读取习惯档案：' + reason.message);
        }
      }, []);

      useEffect(() => { load(); }, [load]);

      const mutate = useCallback(async (path, body) => {
        setBusy(true);
        try {
          const data = await api(path, body);
          setState(data);
          setError('');
        } catch (reason) {
          setError('操作失败：' + reason.message);
        } finally {
          setBusy(false);
        }
      }, []);

      const add = () => {
        const text = draft.trim();
        if (!text) return;
        mutate('/add', { text, kind, strength: 5 });
        setDraft('');
      };

      const habits = state ? state.habits : [];
      const active = habits.filter((habit) => habit.enabled);

      return h('div', { className: 'azl-panel' },
        h('header', { className: 'azl-head' },
          h('div', null,
            h('div', { className: 'azl-eyebrow' }, h('span', { className: 'azl-dot' }), 'CROSS-SESSION MEMORY'),
            h('h1', { className: 'azl-title' }, '我的习惯档案'),
            h('p', { className: 'azl-sub' }, '从所有对话里学到的长期偏好，默认注入每一个任务的系统提示。')),
          h('div', { className: 'azl-actions' },
            h('button', { type: 'button', className: 'azl-btn', disabled: busy, onClick: () => mutate('/relearn', {}) }, ICONS.refresh, '重新学习'),
            h('button', { type: 'button', className: 'azl-btn primary', disabled: busy, onClick: () => load() }, '刷新'))),
        h('div', { className: 'azl-body' },
          error ? h('div', { className: 'azl-error' }, error) : null,
          !state
            ? h('div', { className: 'azl-loading' }, '正在读取…')
            : h(React.Fragment, null,
              h('div', { className: 'azl-hero' },
                h('div', { className: 'azl-metric' }, h('b', null, String(active.length)), h('span', null, '生效中的习惯')),
                h('div', { className: 'azl-metric' }, h('b', null, String(state.stats.sessions || 0)), h('span', null, '已学习的会话')),
                h('div', { className: 'azl-metric' }, h('b', null, String(state.stats.messages || 0)), h('span', null, '分析过的消息')),
                h('div', { className: 'azl-metric' }, h('b', null, String(state.stats.modelWrites || 0)), h('span', null, '模型主动记录'))),
              h('div', { className: 'azl-switchrow' },
                h('div', null,
                  h('b', null, '从对话自动学习'),
                  h('p', null, '监听每个会话的用户消息，识别「以后都…」「不要用…」这类长期偏好。')),
                h(Switch, {
                  checked: state.autoLearn,
                  label: '从对话自动学习',
                  onChange: (value) => mutate('/toggle', { autoLearn: value }),
                })),
              h('div', { className: 'azl-switchrow' },
                h('div', null,
                  h('b', null, '注入每个任务的系统提示'),
                  h('p', null, '关闭后习惯仍会保留，但不再影响模型的默认行为。')),
                h(Switch, {
                  checked: state.profileInject,
                  label: '注入系统提示',
                  onChange: (value) => mutate('/toggle', { inject: value }),
                })),
              h('div', { className: 'azl-add' },
                h('input', {
                  className: 'azl-input grow',
                  placeholder: '手动添加一条习惯，例如：回答保持简洁，先给结论',
                  value: draft,
                  onChange: (event) => setDraft(event.target.value),
                  onKeyDown: (event) => { if (event.key === 'Enter') add(); },
                }),
                h('select', { className: 'azl-select', value: kind, onChange: (event) => setKind(event.target.value), 'aria-label': '习惯类别' },
                  Object.keys(KIND_LABEL).map((key) => h('option', { key, value: key }, KIND_LABEL[key]))),
                h('button', { type: 'button', className: 'azl-btn primary', disabled: busy || !draft.trim(), onClick: add }, '添加')),
              habits.length === 0
                ? h('div', { className: 'azl-empty', style: { marginTop: 16 } },
                  '还没有学到习惯。随便聊几句，或者在上面手动添加一条。')
                : h('div', { className: 'azl-habits' },
                  habits.map((habit) => h(HabitRow, {
                    key: habit.id,
                    habit,
                    onToggle: (id, enabled) => mutate('/update', { id, enabled }),
                    onDelete: (id) => mutate('/delete', { id }),
                    onEdit: (id, text) => mutate('/update', { id, text }),
                  }))),
              h('footer', { className: 'azl-foot' },
                h('span', { className: 'azl-note' }, '共 ' + habits.length + ' 条 · 更新于 ' + (state.updatedAt ? new Date(state.updatedAt).toLocaleString() : '—')),
                h('span', { className: 'azl-note' }, '存储于 ~/.dsh/cache/azl-habits/habits.json')))));
    }

    /* --------------------------------------------------------- L2D runtime */

    let runtimePromise = null;

    function loadScript(src) {
      return new Promise((resolve, reject) => {
        const element = document.createElement('script');
        element.src = src;
        element.async = false;
        element.onload = () => resolve();
        element.onerror = () => reject(new Error('无法加载脚本：' + src));
        document.head.appendChild(element);
      });
    }

    async function ensureRuntime() {
      if (runtimePromise) return runtimePromise;
      runtimePromise = (async () => {
        if (!window.PIXI) {
          await loadScript(L2D_API + '/runtime?name=pixi');
        }
        // Cubism Core must exist BEFORE the Live2D binding initialises: the
        // binding reads the core global while it loads, and a late core leaves
        // model construction broken even though both scripts "load".
        if (!window.Live2DCubismCore) {
          await loadScript(L2D_API + '/runtime?name=cubismcore');
        }
        if (!window.PIXI || !window.PIXI.live2d || !window.PIXI.live2d.Live2DModel) {
          await loadScript(L2D_API + '/runtime?name=live2d');
        }
        if (!window.PIXI || !window.PIXI.live2d || !window.PIXI.live2d.Live2DModel) {
          throw new Error('Live2D 运行时未能初始化');
        }
        if (!window.Live2DCubismCore) {
          throw new Error('Cubism Core 未能初始化');
        }
        return window.PIXI;
      })().catch((error) => {
        runtimePromise = null;
        throw error;
      });
      return runtimePromise;
    }

    const STAGE_BACKGROUNDS = [
      { id: 'deep', label: '深海', className: '' },
      { id: 'grid', label: '网格', className: 'grid' },
      { id: 'green', label: '绿幕', className: 'green' },
    ];

    /* ------------------------------------------------------------ thumbnails */

    const THUMB_KEY = 'azl2d.thumbs.v1';
    const THUMB_LIMIT = 80;
    const THUMB_WIDTH = 96;
    const THUMB_HEIGHT = 124;
    const thumbMemory = new Map();
    const thumbFailed = new Set();
    const thumbQueued = new Set();
    const thumbQueue = [];
    let thumbApp = null;
    let thumbPumping = false;
    let thumbHold = false;
    let thumbStore = null;
    let thumbSaveTimer = null;

    function readThumbStore() {
      if (thumbStore) return thumbStore;
      thumbStore = {};
      try {
        const raw = window.localStorage.getItem(THUMB_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') thumbStore = parsed;
        }
      } catch { /* storage may be unavailable */ }
      for (const [id, url] of Object.entries(thumbStore)) {
        if (typeof url === 'string' && url.startsWith('data:image/')) thumbMemory.set(id, url);
      }
      return thumbStore;
    }

    function persistThumb(id, url) {
      const store = readThumbStore();
      store[id] = url;
      const ids = Object.keys(store);
      if (ids.length > THUMB_LIMIT) {
        for (const stale of ids.slice(0, ids.length - THUMB_LIMIT)) delete store[stale];
      }
      if (thumbSaveTimer) clearTimeout(thumbSaveTimer);
      thumbSaveTimer = setTimeout(() => {
        thumbSaveTimer = null;
        try {
          window.localStorage.setItem(THUMB_KEY, JSON.stringify(store));
        } catch { /* quota or privacy mode: memory cache still works */ }
      }, 600);
    }

    async function renderThumb(model) {
      const PIXI = await ensureRuntime();
      if (!thumbApp) {
        thumbApp = new PIXI.Application({
          width: THUMB_WIDTH,
          height: THUMB_HEIGHT,
          backgroundAlpha: 0,
          antialias: true,
          resolution: 2,
          autoDensity: true,
          preserveDrawingBuffer: true,
        });
      }
      const params = new URLSearchParams({
        folder: model.folder,
        file: model.file,
        source: model.source || 'ddddbug/Live2d-model',
      });
      const instance = await window.PIXI.live2d.Live2DModel.from(L2D_API + '/descriptor?' + params.toString(), {
        autoInteract: false,
        autoUpdate: false,
      });
      try {
        // Same constant-scale placement as the stage: never read live bounds,
        // which are NaN before the first update.
        const size = canvasSizeOf(instance);
        const scale = (Math.min(THUMB_WIDTH, THUMB_HEIGHT) / size) * 0.98;
        instance.scale.set(scale);
        instance.x = (THUMB_WIDTH - size * scale) / 2;
        instance.y = (THUMB_HEIGHT - size * scale) / 2;
        thumbApp.stage.removeChildren();
        thumbApp.stage.addChild(instance);
        thumbApp.render();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        thumbApp.render();
        return thumbApp.view.toDataURL('image/jpeg', 0.84);
      } finally {
        try {
          thumbApp.stage.removeChildren();
          instance.destroy();
        } catch { /* ignore */ }
      }
    }

    async function pumpThumbs() {
      if (thumbPumping) return;
      // Never compete with the main stage for bandwidth: previews wait until the
      // selected model has finished loading (or failed).
      if (thumbHold) return;
      thumbPumping = true;
      try {
        while (thumbQueue.length > 0) {
          const job = thumbQueue.shift();
          try {
            const url = await renderThumb(job.model);
            thumbMemory.set(job.model.id, url);
            persistThumb(job.model.id, url);
            job.notify(url);
          } catch (error) {
            console.warn('[azl-l2d] thumbnail failed for ' + job.model.id, error);
            thumbFailed.add(job.model.id);
            job.notify(null);
          }
        }
      } finally {
        thumbPumping = false;
      }
    }

    function enqueueThumb(model, notify) {
      readThumbStore();
      if (thumbMemory.has(model.id)) {
        notify(thumbMemory.get(model.id));
        return;
      }
      if (thumbFailed.has(model.id) || thumbQueued.has(model.id)) return;
      if (thumbQueued.size >= 60) return;
      thumbQueued.add(model.id);
      thumbQueue.push({ model, notify });
      pumpThumbs();
    }

    function Thumb({ model }) {
      const [url, setUrl] = useState(() => thumbMemory.get(model.id) || null);
      const holder = useRef(null);
      useEffect(() => {
        if (url) return undefined;
        readThumbStore();
        const cached = thumbMemory.get(model.id);
        if (cached) {
          setUrl(cached);
          return undefined;
        }
        let disposed = false;
        const start = () => {
          if (!disposed) enqueueThumb(model, (value) => { if (!disposed) setUrl(value); });
        };
        if (typeof IntersectionObserver === 'undefined') {
          start();
          return () => { disposed = true; };
        }
        const observer = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              observer.disconnect();
              start();
              break;
            }
          }
        }, { rootMargin: '200px' });
        if (holder.current) observer.observe(holder.current);
        return () => {
          disposed = true;
          observer.disconnect();
        };
      }, [model.id, url]);
      const initial = (model.nameCn || model.nameEn || model.id).slice(0, 1);
      return h('span', { className: 'azl2d-thumb' + (url ? ' ready' : ''), ref: holder, 'aria-hidden': true },
        url ? h('img', { src: url, alt: '', loading: 'lazy', draggable: false }) : null,
        h('b', null, initial));
    }

    /**
     * A Live2D model's own report of its canvas size is stable from the moment it
     * loads, unlike its bounds (NaN on the first frames) or its measured pixels.
     * Scaling from this constant is what the established community viewers do,
     * and it removes the resize/refit loop that made the model jump.
     */
    function canvasSizeOf(liveModel) {
      const internal = liveModel && liveModel.internalModel ? liveModel.internalModel : null;
      const size = Number(internal && (internal.originalWidth || internal.width));
      return Number.isFinite(size) && size > 1 ? size : 2048;
    }

    function placeModel(liveModel, width, height, zoom, offsetX, offsetY) {
      const size = canvasSizeOf(liveModel);
      const scale = (Math.min(width, height) / size) * 0.94 * (Number.isFinite(zoom) && zoom > 0 ? zoom : 1);
      liveModel.scale.set(scale);
      liveModel.x = width / 2 + (Number.isFinite(offsetX) ? offsetX : 0) - (size * scale) / 2;
      liveModel.y = height / 2 + (Number.isFinite(offsetY) ? offsetY : 0) - (size * scale) / 2;
    }

    function canvasSizeOf(liveModel) {
      const internal = liveModel && liveModel.internalModel ? liveModel.internalModel : null;
      const size = Number(internal && (internal.originalWidth || internal.width));
      return Number.isFinite(size) && size > 1 ? size : 2048;
    }

    function placeModel(liveModel, width, height, zoom, offsetX, offsetY) {
      const size = canvasSizeOf(liveModel);
      const scale = (Math.min(width, height) / size) * 0.94 * (Number.isFinite(zoom) && zoom > 0 ? zoom : 1);
      liveModel.scale.set(scale);
      liveModel.x = width / 2 + (Number.isFinite(offsetX) ? offsetX : 0) - (size * scale) / 2;
      liveModel.y = height / 2 + (Number.isFinite(offsetY) ? offsetY : 0) - (size * scale) / 2;
    }

    const ACTION_SECTIONS = [
      { title: '互动', names: ['touch_head', 'touch_body', 'touch_special', 'touch_drag'] },
      { title: '待机', names: ['idle'] },
      { title: '主界面', names: ['main_1', 'main_2', 'main_3'] },
      { title: '特殊', names: ['login', 'wedding', 'mission', 'mission_complete', 'complete', 'home', 'mail', 'effect', 'start'] },
    ];

    const ACTION_LABELS = {
      idle: '待机',
      touch_head: '摸头',
      touch_body: '触碰',
      touch_special: '特触',
      touch_drag: '拖拽',
      main_1: '主界面 1',
      main_2: '主界面 2',
      main_3: '主界面 3',
      login: '登录',
      wedding: '誓约',
      mission: '任务',
      mission_complete: '任务完成',
      complete: '完成',
      home: '返回',
      mail: '邮件',
      effect: '特效',
      start: '开始',
    };

    function Stage({ model, state, onState, zoom, offset, mirror, command, onInteract }) {
      const hostRef = useRef(null);
      const appRef = useRef(null);
      const modelRef = useRef(null);
      const layoutRef = useRef(null);
      const viewRef = useRef({ zoom: 1, x: 0, y: 0, mirror: false });

      useEffect(() => {
        let cancelled = false;
        let app = null;
        let liveModel = null;
        let observer = null;

        async function boot() {
          onState({ status: 'loading' });
          const PIXI = await ensureRuntime();
          if (cancelled || !hostRef.current) return;

          const width = hostRef.current.clientWidth || 720;
          const height = hostRef.current.clientHeight || 560;
          app = new PIXI.Application({ backgroundAlpha: 0, antialias: true, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2), width, height });
          appRef.current = app;
          hostRef.current.replaceChildren(app.view);
          app.view.style.width = '100%';
          app.view.style.height = '100%';

          const params = new URLSearchParams({ folder: model.folder, source: model.source || '' });
          liveModel = await Promise.race([
            window.PIXI.live2d.Live2DModel.from(L2D_API + '/descriptor?' + params.toString(), {
              autoInteract: true,
              autoUpdate: true,
              motionPreload: 'none',
              idleMotionGroup: 'idle',
            }),
            new Promise((_, reject) => setTimeout(
              () => reject(new Error('模型加载超时（60 秒）。贴图较大，首次加载会慢一些；也可以换一套皮肤或稍后重试。')),
              60000,
            )),
          ]);
          if (cancelled) {
            try { liveModel.destroy(); } catch { /* ignore */ }
            return;
          }
          modelRef.current = liveModel;
          app.stage.addChild(liveModel);

          const layout = () => {
            if (!app || !liveModel) return;
            const w = hostRef.current ? hostRef.current.clientWidth : width;
            const h = hostRef.current ? hostRef.current.clientHeight : height;
            if (!w || !h) return;
            if (app.renderer.width !== w || app.renderer.height !== h) app.renderer.resize(w, h);
            placeModel(liveModel, w, h, viewRef.current.zoom, viewRef.current.x, viewRef.current.y);
            liveModel.rotation = viewRef.current.mirror ? Math.PI : 0;
          };
          layoutRef.current = layout;
          layout();
          observer = new ResizeObserver(layout);
          observer.observe(hostRef.current);

          const info = await fetch(L2D_API + '/model?' + params.toString(), { cache: 'no-store' })
            .then((response) => (response.ok ? response.json() : null))
            .catch(() => null);
          if (cancelled) return;
          const motions = ((info && info.summary && info.summary.motions) || []).map((entry) => entry.name);
          onState({ status: 'ready', motions });
          try { liveModel.motion('idle'); } catch { /* some models have no idle */ }
        }

        boot().catch((error) => {
          if (cancelled) return;
          console.error('[azl-l2d] stage failed', error);
          onState({ status: 'error', message: String(error && error.message ? error.message : error) });
        });

        return () => {
          cancelled = true;
          layoutRef.current = null;
          if (observer) observer.disconnect();
          if (liveModel) { try { liveModel.destroy(); } catch { /* ignore */ } }
          if (app) { try { app.destroy(true, { children: true, texture: true, baseTexture: true }); } catch { /* ignore */ } }
          modelRef.current = null;
          appRef.current = null;
          if (hostRef.current) hostRef.current.replaceChildren();
        };
      }, [model.id, model.source]);

      useEffect(() => {
        viewRef.current = {
          zoom: Number.isFinite(zoom) && zoom > 0 ? zoom : 1,
          x: Number.isFinite(offset.x) ? offset.x : 0,
          y: Number.isFinite(offset.y) ? offset.y : 0,
          mirror: Boolean(mirror),
        };
        if (layoutRef.current) layoutRef.current();
      }, [zoom, offset.x, offset.y, mirror, state.status]);

      // Play whatever the panel asks for: an action button or a click on the model.
      useEffect(() => {
        const liveModel = modelRef.current;
        if (!liveModel || !command || !command.name) return;
        try { liveModel.motion(command.name); } catch { /* motion may be absent */ }
      }, [command && command.tick]);

      const pickRegion = (event) => {
        const liveModel = modelRef.current;
        const host = hostRef.current;
        if (!liveModel || !host) return 'body';
        const rect = host.getBoundingClientRect();
        let bounds = null;
        try { bounds = liveModel.getBounds(); } catch { bounds = null; }
        if (!bounds || !(bounds.width > 1) || !(bounds.height > 1)) return 'body';
        const x = (event.clientX - bounds.x) / bounds.width;
        const y = (event.clientY - bounds.y) / bounds.height;
        if (x < 0 || x > 1 || y < 0 || y > 1) return 'body';
        const motions = (state.motions || []);
        if (motions.includes('touch_special') && y > 0.42 && y < 0.72 && x > 0.28 && x < 0.72) return 'special';
        if (y < 0.34) return 'head';
        return 'body';
      };

      return h(React.Fragment, null,
        h('div', {
          className: 'azl2d-canvas',
          ref: hostRef,
          onPointerUp: (event) => { if (event.button === 0) onInteract(pickRegion(event)); },
        }),
        state.status === 'loading'
          ? h('div', { className: 'azl2d-status' }, h('div', { className: 'azl2d-spinner' }), '正在加载模型与贴图…')
          : null,
        state.status === 'error'
          ? h('div', { className: 'azl2d-status' }, h('strong', null, '模型加载失败'), h('span', null, state.message || ''))
          : null,
        h('div', { className: 'azl2d-overlay' },
          h('span', { className: 'azl2d-badge' }, 'LIVE2D · ' + (model.nameCn || model.community || model.id)),
          model.skin && model.skin !== (model.nameCn || model.community) ? h('span', { className: 'azl2d-badge' }, model.skin) : null));
    }

    function ActionPanel({ model, stage, onPlay, dialogue }) {
      const motions = stage.motions || (model.animations || []);
      const available = new Set(motions);
      const wanted = new Set(model.animations && model.animations.length ? model.animations : motions);
      const sections = ACTION_SECTIONS
        .map((section) => ({
          title: section.title,
          items: section.names.filter((name) => wanted.has(name) && available.has(name)),
        }))
        .filter((section) => section.items.length > 0);
      const known = new Set(ACTION_SECTIONS.flatMap((section) => section.names));
      const others = [...wanted].filter((name) => !known.has(name) && available.has(name));
      if (others.length > 0) sections.push({ title: '其他', items: others });

      if (sections.length === 0) {
        return h('p', { className: 'azl2d-note' }, stage.status === 'ready' ? '这套皮肤没有可用动作。' : '动作列表加载中…');
      }
      return h(React.Fragment, null,
        sections.map((section) => h('div', { key: section.title },
          h('div', { className: 'azl2d-sec' }, section.title),
          h('div', { className: 'azl2d-grid' },
            section.items.map((name) => h('button', {
              key: name,
              type: 'button',
              className: 'azl2d-act' + (stage.lastAction === name ? ' hot' : ''),
              onClick: () => onPlay(name),
            }, ACTION_LABELS[name] || name))))),
        h('p', { className: 'azl2d-note' }, '点击模型：头部 / 身体 / 特触按区域触发对应动作。'));
    }

    function LinesPanel({ dialogue, onSay, voiceConfigured }) {
      if (!dialogue) return h('p', { className: 'azl2d-note' }, '台词加载中…');
      if (!dialogue.groups || dialogue.groups.length === 0) {
        return h('p', { className: 'azl2d-note' }, '公开数据里没有这套皮肤的台词。');
      }
      return h(React.Fragment, null,
        dialogue.groups.map((group) => h('div', { key: group.type },
          h('div', { className: 'azl2d-sec' }, group.label),
          h('div', { className: 'azl2d-lines' },
            group.lines.map((line, index) => h('button', {
              key: group.type + index,
              type: 'button',
              className: 'azl2d-line',
              onClick: () => onSay(group.type, line),
            },
            h('b', null, voiceConfigured && line.voiceId ? '▶' : '·'),
            h('span', null, line.text)))))),
        h('p', { className: 'azl2d-note' }, voiceConfigured
          ? '点台词会在画面里显示并播放语音。'
          : '台词来自公开数据；语音需要你在插件配置 voiceBaseUrl 指向自己的语音目录（<id>.mp3）后才会播放。'));
    }

    function L2DPanel() {
      const [catalog, setCatalog] = useState(null);
      const [error, setError] = useState('');
      const [query, setQuery] = useState('');
      const [selected, setSelected] = useState(null);
      const [tab, setTab] = useState('skins');
      const [dialogue, setDialogue] = useState(null);
      const [bubble, setBubble] = useState(null);
      const [command, setCommand] = useState(null);
      const [background, setBackground] = useState('deep');
      const [mirror, setMirror] = useState(false);
      const [zoom, setZoom] = useState(1);
      const [offset, setOffset] = useState({ x: 0, y: 0 });
      const [stage, setStage] = useState({ status: 'idle', motions: [] });

      useEffect(() => {
        let cancelled = false;
        fetch(L2D_API + '/catalog', { cache: 'no-store' })
          .then((response) => response.json())
          .then((data) => {
            if (cancelled) return;
            if (!data.ok) throw new Error(data.message || data.error || '目录读取失败');
            setCatalog(data);
          })
          .catch((reason) => { if (!cancelled) setError('无法载入皮肤目录：' + reason.message); });
        return () => { cancelled = true; };
      }, []);

      useEffect(() => {
        if (!selected) { setDialogue(null); return undefined; }
        let cancelled = false;
        setDialogue(null);
        const params = new URLSearchParams({ folder: selected.folder, lang: 'cn' });
        fetch(L2D_API + '/dialogue?' + params.toString(), { cache: 'no-store' })
          .then((response) => (response.ok ? response.json() : null))
          .then((data) => { if (!cancelled && data && data.ok) setDialogue(data); })
          .catch(() => { /* dialogue is optional */ });
        return () => { cancelled = true; };
      }, [selected && selected.id]);

      const models = catalog && Array.isArray(catalog.models) ? catalog.models : [];
      const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return models;
        return models.filter((model) => [model.nameCn, model.nameEn, model.skin, model.community, model.id, model.folder, model.stem]
          .filter(Boolean).join(' ').toLowerCase().includes(needle));
      }, [models, query]);

      const groups = useMemo(() => {
        const map = new Map();
        for (const model of filtered) {
          const key = model.nameCn || model.community || model.nameEn || model.stem;
          if (!map.has(key)) map.set(key, []);
          map.get(key).push(model);
        }
        return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh-Hans-CN'));
      }, [filtered]);

      const choose = useCallback((model) => {
        setSelected(model);
        setStage({ status: 'loading', motions: [] });
        setTab('actions');
        setBubble(null);
        setOffset({ x: 0, y: 0 });
        setZoom(1);
      }, []);

      const handleStage = useCallback((next) => setStage((current) => ({ ...current, ...next })), []);

      const warm = useCallback((model) => {
        if (!model) return;
        const params = new URLSearchParams({ folder: model.folder, source: model.source || '' });
        fetch(L2D_API + '/warm?' + params.toString()).catch(() => {});
      }, []);

      const play = useCallback((name, line) => {
        setCommand({ name, tick: Date.now() });
        setStage((current) => ({ ...current, lastAction: name }));
        if (line) setBubble({ label: line.label || '', text: line.text });
      }, []);

      const say = useCallback((type, line) => {
        const motionMap = { idle: 'idle', main: 'main_1', touch: 'touch_body', touch2: 'touch_special', headtouch: 'touch_head', home: 'main_1', login: 'login', wedding: 'wedding' };
        const motion = motionMap[type] || (stage.motions || []).find((name) => name.startsWith('main')) || 'idle';
        setBubble({ label: line.label || '', text: line.text });
        if ((stage.motions || []).includes(motion)) {
          setCommand({ name: motion, tick: Date.now() });
          setStage((current) => ({ ...current, lastAction: motion }));
        }
        if (dialogue && dialogue.voiceConfigured && line.voiceId) {
          const audio = new Audio(L2D_API + '/voice?id=' + encodeURIComponent(line.voiceId));
          audio.play().catch(() => { /* autoplay policy or missing file */ });
        }
      }, [dialogue, stage.motions]);

      const interact = useCallback((region) => {
        const motions = stage.motions || [];
        let name = 'touch_body';
        let group = 'touch';
        if (region === 'head') { name = 'touch_head'; group = 'headtouch'; }
        if (region === 'special') { name = 'touch_special'; group = 'touch2'; }
        if (region === 'body' && !motions.includes('touch_body')) {
          name = motions.find((candidate) => candidate.startsWith('main')) || 'idle';
          group = 'main';
        }
        const pool = dialogue && dialogue.groups ? dialogue.groups.find((entry) => entry.type === group) : null;
        const line = pool && pool.lines.length > 0 ? pool.lines[Math.floor(Math.random() * pool.lines.length)] : null;
        if (motions.includes(name)) {
          setCommand({ name, tick: Date.now() });
          setStage((current) => ({ ...current, lastAction: name }));
        }
        if (line) setBubble({ label: line.label || '', text: line.text });
        else setBubble({ label: '互动', text: ACTION_LABELS[name] || name });
        if (line && dialogue.voiceConfigured && line.voiceId) {
          new Audio(L2D_API + '/voice?id=' + encodeURIComponent(line.voiceId)).play().catch(() => {});
        }
      }, [dialogue, stage.motions]);

      const bg = STAGE_BACKGROUNDS.find((item) => item.id === background) || STAGE_BACKGROUNDS[0];
      const voiceConfigured = Boolean(dialogue && dialogue.voiceConfigured);

      const navBody = tab === 'skins'
        ? h('div', { className: 'azl2d-list' },
          !catalog && !error ? h('div', { className: 'azl-loading' }, '正在整理皮肤目录…') : null,
          error ? h('div', { className: 'azl-error' }, error) : null,
          groups.map(([label, entries]) => h('div', { className: 'azl2d-group', key: label },
            h('div', { className: 'azl2d-grouplabel' }, h('span', null, label), h('span', null, String(entries.length))),
            entries.map((model) => h('button', {
              key: model.id + '@' + model.source,
              type: 'button',
              className: 'azl2d-card',
              'aria-current': selected && selected.id === model.id ? 'true' : 'false',
              onClick: () => choose(model),
              onMouseEnter: () => warm(model),
              onFocus: () => warm(model),
              title: model.id,
            },
            h(Thumb, { key: model.id + ':thumb', model }),
            h('span', { className: 'azl2d-meta' },
              h('strong', null, model.nameCn || model.community || model.nameEn || model.id),
              h('span', null, model.skin || model.community || model.nameEn || model.id),
              h('span', null, [model.nameEn, model.id].filter(Boolean).join(' · ')))))),
          catalog && filtered.length === 0 ? h('div', { className: 'azl2d-empty' }, '没有匹配的皮肤') : null))
        : h('div', { className: 'azl2d-list' },
          selected
            ? (tab === 'actions'
              ? h(ActionPanel, { model: selected, stage, onPlay: (name) => play(name), dialogue })
              : h(LinesPanel, { dialogue, onSay: say, voiceConfigured }))
            : h('div', { className: 'azl2d-empty' }, '先从「皮肤」里选一套。'));

      return h('div', { className: 'azl2d' },
        h('section', { className: 'azl2d-stagewrap' },
          h('div', { className: 'azl2d-toolbar' },
            h('strong', { style: { fontSize: 13 } }, selected ? (selected.nameCn || selected.community || selected.nameEn || selected.id) : '选择一套皮肤'),
            selected && selected.skin ? h('span', { className: 'azl2d-count' }, selected.skin) : null,
            h('span', { className: 'spacer' }),
            STAGE_BACKGROUNDS.map((item) => h('button', {
              key: item.id,
              type: 'button',
              className: 'azl2d-chip' + (background === item.id ? ' on' : ''),
              onClick: () => setBackground(item.id),
            }, item.label)),
            h('button', { type: 'button', className: 'azl2d-chip' + (mirror ? ' on' : ''), onClick: () => setMirror(!mirror) }, '镜像')),
          selected
            ? h('div', { className: 'azl2d-stage' + (bg.className ? ' ' + bg.className : '') },
              h(Stage, { model: selected, state: stage, onState: handleStage, zoom, offset, mirror, command, onInteract: interact }),
              bubble ? h('div', { className: 'azl2d-bubble' }, bubble.label ? h('em', null, bubble.label) : null, bubble.text) : null)
            : h('div', { className: 'azl2d-stage' },
              h('div', { className: 'azl2d-empty' },
                h('h3', null, '从舰船开始'),
                h('p', null, catalog
                  ? '右侧挑一套 Live2D 皮肤：舞台会加载模型，动作、台词与点击互动都在右边的面板里。'
                  : '正在从公开镜像整理皮肤清单…'))),
          h('div', { className: 'azl2d-controls' },
            h('label', null, '缩放',
              h('input', { type: 'range', min: 0.4, max: 2.6, step: 0.02, value: zoom, onChange: (event) => setZoom(Number(event.target.value)), 'aria-label': '缩放' })),
            h('button', { type: 'button', className: 'azl-btn small', onClick: () => { setZoom(1); setOffset({ x: 0, y: 0 }); } }, '复位'),
            h('label', null, '水平',
              h('input', { type: 'range', min: -320, max: 320, step: 2, value: offset.x, onChange: (event) => setOffset({ x: Number(event.target.value), y: offset.y }), 'aria-label': '水平位置' })),
            h('label', null, '垂直',
              h('input', { type: 'range', min: -240, max: 240, step: 2, value: offset.y, onChange: (event) => setOffset({ x: offset.x, y: Number(event.target.value) }), 'aria-label': '垂直位置' })))),
        h('aside', { className: 'azl2d-nav' },
          h('div', { className: 'azl2d-navhead' },
            h('div', { className: 'azl2d-brand' },
              h('h2', null, '碧蓝航线 L2D'),
              h('span', { className: 'azl2d-count' }, models.length ? models.length + ' 套' : '—')),
            h('div', { className: 'azl2d-tabs' },
              ['skins', 'actions', 'lines'].map((key) => h('button', {
                key,
                type: 'button',
                className: 'azl2d-tab' + (tab === key ? ' on' : ''),
                onClick: () => setTab(key),
              }, key === 'skins' ? '皮肤' : key === 'actions' ? '动作' : '台词'))),
            tab === 'skins'
              ? h('input', {
                className: 'azl2d-search',
                placeholder: '搜索舰船 / 皮肤 / 代码…',
                value: query,
                onChange: (event) => setQuery(event.target.value),
                'aria-label': '搜索皮肤',
              })
              : null),
          navBody));
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => {
          const tag = document.createElement('style');
          tag.setAttribute('data-plugin-css', 'azl-habits');
          tag.textContent = CSS;
          document.head.appendChild(tag);
          return () => tag.remove();
        }, 'azl-habits: styles');

        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: L2D_PANEL }, L2DPanel));
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register({ name: 'sidebar.panellist', id: L2D_PANEL, order: 31, label: () => '碧蓝 L2D' }, function L2DIcon() {
            return h('span', { style: { display: 'inline-flex' } }, ICONS.l2d);
          }));
        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: HABIT_PANEL }, HabitPanel));
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register({ name: 'sidebar.panellist', id: HABIT_PANEL, order: 30, label: () => '习惯档案' }, function HabitIcon() {
            return h('span', { style: { display: 'inline-flex' } }, ICONS.habits);
          }));
      },
    };
  },
});
