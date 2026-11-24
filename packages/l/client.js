/* Browser half of the L bundle: the long-term preference archive. */
window.__ModuleLoader__.load({
  id: '@local/l',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useCallback, useEffect, useMemo, useState } = React;

    const PANEL_ID = 'l';
    const API = '/api/l';

    const KIND_META = {
      safety: { label: '安全边界', code: 'SAFE', tone: 'red' },
      workflow: { label: '工作方式', code: 'FLOW', tone: 'ink' },
      style: { label: '审美与语气', code: 'STYLE', tone: 'red' },
      format: { label: '输出格式', code: 'FORM', tone: 'ink' },
      tooling: { label: '环境与工具', code: 'TOOL', tone: 'ink' },
      content: { label: '内容约定', code: 'TEXT', tone: 'ink' },
      other: { label: '其他偏好', code: 'MISC', tone: 'ink' },
    };
    const KIND_ORDER = ['safety', 'workflow', 'style', 'format', 'tooling', 'content', 'other'];

    const CSS = `
.azl-panel{
  --l-accent:#A63A2E;
  --l-accent-ink:#7E2A22;
  --l-ink:var(--dsw-alias-label-primary);
  --l-muted:var(--dsw-alias-label-secondary);
  --l-faint:var(--dsw-alias-label-tertiary);
  --l-line:color-mix(in srgb,var(--dsw-alias-border-l2) 72%,transparent);
  --l-paper:var(--dsw-alias-bg-base);
  --l-card:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 86%,var(--l-paper));
  position:relative;display:flex;flex-direction:column;height:100%;min-height:0;
  color:var(--l-ink);background:
    radial-gradient(120% 34% at 100% 0%,color-mix(in srgb,var(--l-accent) 7%,transparent),transparent 70%),
    var(--l-paper);
  font-size:13px;line-height:1.55;
}
.azl-panel *{box-sizing:border-box}
.azl-panel button,.azl-panel input,.azl-panel select{font:inherit}
.azl-scroll{flex:1;min-height:0;overflow:auto;padding:0 26px 34px}
.azl-mast{display:flex;align-items:flex-start;gap:14px;padding:22px 0 16px;border-bottom:1px solid var(--l-line)}
.azl-seal{flex:none;display:grid;place-items:center;width:43px;height:43px;margin-top:2px;
  border:1.5px solid var(--l-accent);color:var(--l-accent);transform:rotate(-3deg);
  font-family:"Songti SC","STSong","SimSun",serif;font-size:23px;font-weight:700;line-height:1;
  box-shadow:inset 0 0 0 2px var(--l-paper),inset 0 0 0 3px color-mix(in srgb,var(--l-accent) 42%,transparent)}
.azl-kicker{display:flex;align-items:center;gap:7px;color:var(--l-faint);font-size:9.5px;font-weight:650;letter-spacing:.2em;text-transform:uppercase}
.azl-kicker i{display:block;width:14px;height:1px;background:var(--l-accent);opacity:.75}
.azl-title{margin:4px 0 1px;font-family:"Songti SC","Noto Serif SC","Source Han Serif SC","STSong","SimSun",serif;
  font-size:25px;font-weight:650;letter-spacing:.02em;line-height:1.2}
.azl-sub{margin:2px 0 0;max-width:560px;color:var(--l-muted);font-size:11.5px;line-height:1.65}
.azl-mast-actions{display:flex;gap:6px;margin-left:auto;flex:none}
.azl-btn{display:inline-flex;align-items:center;justify-content:center;gap:5px;height:27px;padding:0 10px;
  border:1px solid var(--l-line);background:transparent;color:var(--l-muted);border-radius:3px;
  font-size:11px;cursor:pointer;transition:border-color .16s,color .16s,background .16s}
.azl-btn:hover:not(:disabled){border-color:color-mix(in srgb,var(--l-accent) 55%,var(--l-line));color:var(--l-ink);background:color-mix(in srgb,var(--l-accent) 4%,transparent)}
.azl-btn:focus-visible{outline:1.5px solid var(--l-accent);outline-offset:2px}
.azl-btn:disabled{opacity:.42;cursor:default}
.azl-btn.accent{border-color:transparent;background:var(--l-accent);color:#F6F1E7}
.azl-btn.accent:hover:not(:disabled){background:var(--l-accent-ink);color:#fff}
.azl-btn.quiet{border-color:transparent;color:var(--l-faint);padding:0 6px}
.azl-btn.quiet:hover:not(:disabled){color:var(--l-accent);background:transparent}
.azl-metrics{display:grid;grid-template-columns:repeat(4,1fr);margin:16px 0 2px;border-top:1px solid var(--l-line);border-bottom:1px solid var(--l-line)}
.azl-metric{position:relative;padding:12px 14px 11px;border-left:1px solid var(--l-line)}
.azl-metric:first-child{border-left:0;padding-left:0}
.azl-metric em{display:block;color:var(--l-accent);font-family:"Songti SC","STSong",serif;font-style:normal;
  font-size:9px;letter-spacing:.16em;opacity:.75;margin-bottom:3px}
.azl-metric b{display:block;font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
  font-size:24px;font-weight:600;line-height:1.05;font-variant-numeric:tabular-nums}
.azl-metric span{display:block;color:var(--l-faint);font-size:10px;letter-spacing:.06em;margin-top:3px}
.azl-section{margin-top:22px}
.azl-section-head{display:flex;align-items:baseline;gap:9px;padding-bottom:7px;border-bottom:1px solid var(--l-line)}
.azl-section-head h2{margin:0;font-family:"Songti SC","STSong",serif;font-size:14px;font-weight:650;letter-spacing:.08em}
.azl-section-head b{color:var(--l-accent);font-size:10px;font-weight:600;letter-spacing:.08em;font-variant-numeric:tabular-nums}
.azl-section-head p{margin:0 0 0 auto;color:var(--l-faint);font-size:10.5px;line-height:1.5;text-align:right}
.azl-section-note{margin:8px 0 10px;color:var(--l-faint);font-size:10.5px;line-height:1.6}
.azl-controls{padding:2px 0 0}
.azl-switchrow{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:11px 0;border-bottom:1px solid var(--l-line)}
.azl-switchrow:last-child{border-bottom:0}
.azl-switchrow b{display:block;font-size:12px;font-weight:600;letter-spacing:.02em}
.azl-switchrow p{margin:2px 0 0;color:var(--l-faint);font-size:10.5px;line-height:1.55;max-width:520px}
.azl-switch{position:relative;flex:none;width:36px;height:20px;margin-top:1px;padding:0;border:1px solid var(--l-line);
  border-radius:999px;background:transparent;cursor:pointer;transition:border-color .16s,background .16s}
.azl-switch::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
  background:var(--l-faint);transition:transform .18s,background .18s}
.azl-switch[aria-checked="true"]{border-color:var(--l-accent);background:color-mix(in srgb,var(--l-accent) 16%,transparent)}
.azl-switch[aria-checked="true"]::after{transform:translateX(16px);background:var(--l-accent)}
.azl-cards{display:flex;flex-direction:column;gap:7px;margin-top:10px}
.azl-card{position:relative;display:flex;align-items:stretch;gap:11px;border:1px solid var(--l-line);
  background:var(--l-card);border-radius:2px;transition:border-color .15s,background .15s}
.azl-card:hover{border-color:color-mix(in srgb,var(--l-accent) 28%,var(--l-line))}
.azl-card::before{content:"";flex:none;width:2px;margin:8px 0 8px 8px;background:color-mix(in srgb,var(--l-accent) 55%,transparent)}
.azl-card.pending::before{background:var(--l-accent)}
.azl-card.off{opacity:.52}
.azl-card-main{flex:1;min-width:0;padding:9px 0 9px 0}
.azl-card-text{margin:0;color:var(--l-ink);font-size:12.5px;line-height:1.62;overflow-wrap:anywhere}
.azl-card-text.editable{cursor:text}
.azl-card-text[contenteditable="true"]{outline:1px dashed var(--l-line);outline-offset:3px;border-radius:2px}
.azl-card-meta{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-top:5px}
.azl-tag{display:inline-flex;align-items:center;height:17px;padding:0 6px;border:1px solid var(--l-line);
  color:var(--l-faint);font-size:9.5px;letter-spacing:.04em;line-height:1;border-radius:2px}
.azl-tag.kind{border-color:color-mix(in srgb,var(--l-accent) 32%,var(--l-line));color:var(--l-accent)}
.azl-tag.model{color:var(--l-muted)}
.azl-dots{display:inline-flex;align-items:center;gap:2px;margin-left:2px}
.azl-dots i{display:block;width:8px;height:3px;background:var(--l-line);border-radius:1px}
.azl-dots i.on{background:var(--l-accent)}
.azl-dots span{margin-left:4px;color:var(--l-faint);font-size:9px}
.azl-card-actions{display:flex;align-items:center;gap:1px;padding:0 7px 0 2px;flex:none}
.azl-iconbtn{display:grid;place-items:center;width:25px;height:25px;border:0;border-radius:3px;
  background:transparent;color:var(--l-faint);cursor:pointer}
.azl-iconbtn:hover{color:var(--l-accent);background:color-mix(in srgb,var(--l-accent) 7%,transparent)}
.azl-iconbtn:focus-visible{outline:1px solid var(--l-accent);outline-offset:1px}
.azl-input{width:100%;height:29px;padding:0 9px;border:1px solid var(--l-line);border-radius:2px;
  background:var(--l-paper);color:var(--l-ink);font-size:12px}
.azl-input:focus{outline:none;border-color:var(--l-accent)}
.azl-select{height:29px;padding:0 8px;border:1px solid var(--l-line);border-radius:2px;background:var(--l-paper);color:var(--l-ink);font-size:11.5px}
.azl-addrow{display:flex;gap:6px;align-items:center;margin-top:9px}
.azl-addrow .azl-input{flex:1}
.azl-pending-reason{margin:3px 0 0;color:var(--l-faint);font-size:10px;line-height:1.5}
.azl-confidence{display:flex;align-items:center;gap:7px;margin-top:6px}
.azl-confidence-bar{height:2px;flex:1;max-width:180px;background:var(--l-line);overflow:hidden}
.azl-confidence-bar i{display:block;height:100%;background:var(--l-accent)}
.azl-confidence span{color:var(--l-faint);font-size:9.5px;font-variant-numeric:tabular-nums}
.azl-empty{padding:22px 0;color:var(--l-faint);font-size:11.5px;line-height:1.7;border-bottom:1px solid var(--l-line)}
.azl-empty b{display:block;color:var(--l-muted);font-family:"Songti SC","STSong",serif;font-size:14px;font-weight:600;margin-bottom:4px}
.azl-group{margin-top:16px}
.azl-group:first-child{margin-top:12px}
.azl-group-head{display:flex;align-items:center;gap:7px;margin:0 0 6px;color:var(--l-muted);font-size:10px;letter-spacing:.1em}
.azl-group-head i{width:3px;height:3px;background:var(--l-accent);display:block;transform:rotate(45deg)}
.azl-group-head span{color:var(--l-faint);letter-spacing:.04em}
.azl-group .azl-cards{margin-top:0}
.azl-details{border-top:1px solid var(--l-line);margin-top:14px;padding-top:2px}
.azl-details summary{display:flex;align-items:center;gap:8px;padding:8px 0;color:var(--l-faint);
  font-size:10.5px;letter-spacing:.08em;cursor:pointer;list-style:none}
.azl-details summary::-webkit-details-marker{display:none}
.azl-details summary::before{content:"＋";color:var(--l-accent);font-size:11px;width:10px}
.azl-details[open] summary::before{content:"－"}
.azl-details .azl-addrow{padding-bottom:6px}
.azl-error{margin:12px 0 0;padding:8px 10px;border:1px solid color-mix(in srgb,var(--l-accent) 55%,transparent);
  color:var(--l-accent);font-size:11px;line-height:1.6;border-radius:2px}
.azl-loading{padding:26px 0;color:var(--l-faint);font-size:11px;letter-spacing:.08em}
.azl-foot{display:flex;flex-wrap:wrap;gap:6px 14px;justify-content:space-between;padding:14px 0 0;border-top:1px solid var(--l-line);
  margin-top:22px;color:var(--l-faint);font-size:9.5px;letter-spacing:.02em}
.azl-foot code{font-family:var(--dsw-font-mono,ui-monospace,monospace);font-size:9px}
.azl-panel ::selection{background:color-mix(in srgb,var(--l-accent) 22%,transparent)}
@media (max-width:620px){
  .azl-scroll{padding:0 15px 28px}
  .azl-mast{flex-wrap:wrap}
  .azl-mast-actions{margin-left:0;width:100%;justify-content:flex-end}
  .azl-metrics{grid-template-columns:repeat(2,1fr)}
  .azl-metric:nth-child(3){border-left:0;padding-left:0;border-top:1px solid var(--l-line)}
  .azl-metric:nth-child(4){border-top:1px solid var(--l-line)}
  .azl-section-head p{display:none}
}
`;

    const ICONS = {
      refresh: h('svg', { viewBox: '0 0 16 16', width: 13, height: 13, fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, 'aria-hidden': true },
        h('path', { d: 'M13 6.5A5 5 0 1 0 13.1 9M13 3v4h-4' })),
      plus: h('svg', { viewBox: '0 0 16 16', width: 13, height: 13, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, 'aria-hidden': true },
        h('path', { d: 'M8 3v10M3 8h10' })),
      edit: h('svg', { viewBox: '0 0 16 16', width: 13, height: 13, fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, 'aria-hidden': true },
        h('path', { d: 'M9.8 3.2l3 3M4 12l.8-3.2 6-6a1.4 1.4 0 0 1 2 2l-6 6L4 12z' })),
      power: h('svg', { viewBox: '0 0 16 16', width: 13, height: 13, fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, 'aria-hidden': true },
        h('path', { d: 'M8 2.5v5M4.1 4.9a5 5 0 1 0 7.8 0' })),
      trash: h('svg', { viewBox: '0 0 16 16', width: 13, height: 13, fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, 'aria-hidden': true },
        h('path', { d: 'M3.5 5h9M6 5V3.7h4V5M5 5l.6 8h4.8l.6-8' })),
      check: h('svg', { viewBox: '0 0 16 16', width: 12, height: 12, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, 'aria-hidden': true },
        h('path', { d: 'M3.5 8.4l3 3 6-6.4' })),
      close: h('svg', { viewBox: '0 0 16 16', width: 12, height: 12, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, 'aria-hidden': true },
        h('path', { d: 'M4 4l8 8M12 4l-8 8' })),
      habits: h('svg', { viewBox: '0 0 20 20', width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true },
        h('path', { d: 'M5 4.5h10M5 10h10M5 15.5h6' }),
        h('path', { d: 'M2.5 4.5h.01M2.5 10h.01M2.5 15.5h.01', strokeWidth: 2 })),
    };

    function api(path, body) {
      return fetch(API + path, body === undefined
        ? { cache: 'no-store' }
        : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
        .then(async (response) => {
          const data = await response.json().catch(() => null);
          if (!response.ok) throw new Error((data && data.error) || 'HTTP ' + response.status);
          return data;
        });
    }

    function Metric({ index, value, label }) {
      return h('div', { className: 'azl-metric' },
        h('em', null, index),
        h('b', null, String(value)),
        h('span', null, label));
    }

    function Switch({ checked, onChange, label }) {
      return h('button', {
        type: 'button',
        className: 'azl-switch',
        role: 'switch',
        'aria-checked': checked,
        'aria-label': label,
        onClick: onChange,
      });
    }

    function StrengthDots({ value }) {
      const filled = Math.max(1, Math.min(5, Math.round((Number(value) || 3) / 2)));
      return h('span', { className: 'azl-dots', title: '强度 ' + (value || 3) + ' / 9' },
        [0, 1, 2, 3, 4].map((i) => h('i', { key: i, className: i < filled ? 'on' : '' })),
        h('span', null, String(value || 3)));
    }

    function sourceLabel(habit) {
      if (habit.source === 'model') return '模型记录';
      if (habit.source === 'user') return '手动添加';
      return '自动学习';
    }

    function HabitCard({ habit, busy, onEdit, onToggle, onDelete }) {
      const [editing, setEditing] = useState(false);
      const [draft, setDraft] = useState(habit.text);
      useEffect(() => setDraft(habit.text), [habit.text]);
      const commit = () => {
        setEditing(false);
        const next = draft.trim();
        if (next && next !== habit.text) onEdit(habit.id, next);
        else setDraft(habit.text);
      };
      return h('article', { className: 'azl-card' + (habit.enabled ? '' : ' off') },
        h('div', { className: 'azl-card-main' },
          editing
            ? h('input', {
              className: 'azl-input',
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
              className: 'azl-card-text editable',
              title: '双击编辑',
              onDoubleClick: () => setEditing(true),
            }, habit.text),
          h('div', { className: 'azl-card-meta' },
            h('span', { className: 'azl-tag kind' }, (KIND_META[habit.kind] || KIND_META.other).label),
            h('span', { className: 'azl-tag' }, sourceLabel(habit)),
            h(StrengthDots, { value: habit.strength }),
            habit.hits > 1 ? h('span', { className: 'azl-tag' }, '出现 ' + habit.hits + ' 次') : null,
            Number.isFinite(habit.confidence) && habit.confidence < 0.8
              ? h('span', { className: 'azl-tag' }, '置信 ' + Math.round(habit.confidence * 100) + '%')
              : null)),
        h('div', { className: 'azl-card-actions' },
          h('button', { type: 'button', className: 'azl-iconbtn', title: '编辑内容', 'aria-label': '编辑内容', disabled: busy, onClick: () => setEditing(true) }, ICONS.edit),
          h('button', {
            type: 'button',
            className: 'azl-iconbtn',
            title: habit.enabled ? '停用这条习惯' : '重新启用',
            'aria-label': habit.enabled ? '停用' : '启用',
            disabled: busy,
            onClick: () => onToggle(habit.id, !habit.enabled),
          }, ICONS.power),
          h('button', { type: 'button', className: 'azl-iconbtn', title: '删除', 'aria-label': '删除', disabled: busy, onClick: () => onDelete(habit.id) }, ICONS.trash)));
    }

    function PendingCard({ item, busy, onAccept, onReject }) {
      const meta = KIND_META[item.kind] || KIND_META.other;
      const percent = Math.round((Number(item.confidence) || 0) * 100);
      return h('article', { className: 'azl-card pending' },
        h('div', { className: 'azl-card-main' },
          h('p', { className: 'azl-card-text' }, item.text),
          h('div', { className: 'azl-card-meta' },
            h('span', { className: 'azl-tag kind' }, meta.label),
            h('span', { className: 'azl-tag' }, item.reason || '待确认'),
            item.createdAt ? h('span', { className: 'azl-tag' }, new Date(item.createdAt).toLocaleDateString()) : null),
          h('div', { className: 'azl-confidence' },
            h('div', { className: 'azl-confidence-bar' }, h('i', { style: { width: percent + '%' } })),
            h('span', null, '置信 ' + percent + '%'))),
        h('div', { className: 'azl-card-actions' },
          h('button', { type: 'button', className: 'azl-btn accent', disabled: busy, onClick: () => onAccept(item.id) }, ICONS.check, '收录'),
          h('button', { type: 'button', className: 'azl-btn quiet', disabled: busy, onClick: () => onReject(item.id) }, ICONS.close, '忽略')));
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

      const habits = state ? state.habits : [];
      const pending = state && Array.isArray(state.pending) ? state.pending : [];
      const active = habits.filter((habit) => habit.enabled);
      const disabled = habits.filter((habit) => !habit.enabled);
      const groups = useMemo(() => KIND_ORDER
        .map((id) => ({
          id,
          meta: KIND_META[id],
          items: active
            .filter((habit) => habit.kind === id)
            .sort((a, b) => (b.strength + b.hits * 0.5) - (a.strength + a.hits * 0.5)),
        }))
        .filter((group) => group.items.length > 0), [active]);

      const add = () => {
        const text = draft.trim();
        if (!text) return;
        mutate('/add', { text, kind, strength: 5 });
        setDraft('');
      };

      return h('div', { className: 'azl-panel' },
        h('div', { className: 'azl-scroll' },
          h('header', { className: 'azl-mast' },
            h('div', { className: 'azl-seal', 'aria-hidden': true }, 'L'),
            h('div', null,
              h('div', { className: 'azl-kicker' }, h('i'), 'Standing Memory · 长期记忆'),
              h('h1', { className: 'azl-title' }, '长期偏好'),
              h('p', { className: 'azl-sub' }, '从对话里辨认跨任务的规则，而不是关键词。明确偏好在左侧直接生效；拿不准的先进“待确认”，你点头才写进档案。')),
            h('div', { className: 'azl-mast-actions' },
              h('button', { type: 'button', className: 'azl-btn', disabled: busy, onClick: () => mutate('/relearn', {}) }, ICONS.refresh, '重新学习'),
              h('button', { type: 'button', className: 'azl-btn', disabled: busy, onClick: load }, '刷新'))),

          error ? h('div', { className: 'azl-error', role: 'alert' }, error) : null,

          state === null
            ? h('div', { className: 'azl-loading' }, '正在读取档案…')
            : h(React.Fragment, null,
              h('div', { className: 'azl-metrics' },
                h(Metric, { index: '壹', value: active.length, label: '生效中的习惯' }),
                h(Metric, { index: '贰', value: pending.length, label: '待你确认' }),
                h(Metric, { index: '叁', value: state.stats.sessions || 0, label: '已学习的会话' }),
                h(Metric, { index: '肆', value: state.stats.messages || 0, label: '分析过的消息' })),

              h('section', { className: 'azl-section' },
                h('div', { className: 'azl-section-head' }, h('h2', null, '采集与注入'), h('b', null, 'ENGINE')),
                h('div', { className: 'azl-controls' },
                  h('div', { className: 'azl-switchrow' },
                    h('div', null,
                      h('b', null, '从对话里自动学习'),
                      h('p', null, '只自动收录明确的长期偏好与“记住”；“这次不要”“改用”这类模糊要求会先进入待确认。')),
                    h(Switch, { checked: state.autoLearn, label: '自动学习', onChange: () => mutate('/toggle', { autoLearn: !state.autoLearn }) })),
                  h('div', { className: 'azl-switchrow' },
                    h('div', null,
                      h('b', null, '注入每个任务的系统提示'),
                      h('p', null, '生效中的习惯会作为 standing requirements 注入；停用的条目保留但不参与。')),
                    h(Switch, { checked: state.profileInject, label: '注入系统提示', onChange: () => mutate('/toggle', { inject: !state.profileInject }) })))),

              pending.length > 0
                ? h('section', { className: 'azl-section' },
                  h('div', { className: 'azl-section-head' },
                    h('h2', null, '待确认'),
                    h('b', null, String(pending.length).padStart(2, '0')),
                    h('p', null, '这些句子像偏好，但带有一次性或任务语境。')),
                  h('p', { className: 'azl-section-note' }, '收录后才会进入系统提示；“忽略”不会留下记录。'),
                  h('div', { className: 'azl-cards' }, pending.map((item) => h(PendingCard, {
                    key: item.id,
                    item,
                    busy,
                    onAccept: (id) => mutate('/pending-accept', { id }),
                    onReject: (id) => mutate('/pending-reject', { id }),
                  }))))
                : h('section', { className: 'azl-section' },
                  h('div', { className: 'azl-section-head' }, h('h2', null, '待确认'), h('b', null, '00')),
                  h('p', { className: 'azl-section-note' }, '没有待确认项。低置信度的句子会被拦在这里，而不是直接写成习惯。')),

              h('section', { className: 'azl-section' },
                h('div', { className: 'azl-section-head' },
                  h('h2', null, '已生效'),
                  h('b', null, String(active.length).padStart(2, '0')),
                  h('p', null, '按类别归档 · 双击正文可直接改')),
                groups.length === 0
                  ? h('div', { className: 'azl-empty' },
                    h('b', null, '档案还是空的'),
                    h('span', null, '在对话里明确说“以后都……”或“我喜欢……”，或者手动登记一条。'))
                  : groups.map((group) => h('div', { className: 'azl-group', key: group.id },
                    h('div', { className: 'azl-group-head' }, h('i'), group.meta.label, h('span', null, group.meta.code + ' · ' + group.items.length)),
                    h('div', { className: 'azl-cards' }, group.items.map((habit) => h(HabitCard, {
                      key: habit.id,
                      habit,
                      busy,
                      onEdit: (id, text) => mutate('/update', { id, text }),
                      onToggle: (id, enabled) => mutate('/update', { id, enabled }),
                      onDelete: (id) => mutate('/delete', { id }),
                    })))))),

              disabled.length > 0
                ? h('details', { className: 'azl-details' },
                  h('summary', null, '已停用 ' + disabled.length + ' 条'),
                  h('div', { className: 'azl-cards' }, disabled.map((habit) => h(HabitCard, {
                    key: habit.id,
                    habit,
                    busy,
                    onEdit: (id, text) => mutate('/update', { id, text }),
                    onToggle: (id, enabled) => mutate('/update', { id, enabled }),
                    onDelete: (id) => mutate('/delete', { id }),
                  }))))
                : null,

              h('details', { className: 'azl-details' },
                h('summary', null, '手动登记一条'),
                h('div', { className: 'azl-addrow' },
                  h('input', {
                    className: 'azl-input',
                    value: draft,
                    placeholder: '例如：以后涉及排版，先给结构再给正文',
                    onChange: (event) => setDraft(event.target.value),
                    onKeyDown: (event) => { if (event.key === 'Enter') add(); },
                  }),
                  h('select', { className: 'azl-select', value: kind, onChange: (event) => setKind(event.target.value), 'aria-label': '习惯类别' },
                    KIND_ORDER.map((id) => h('option', { key: id, value: id }, KIND_META[id].label))),
                  h('button', { type: 'button', className: 'azl-btn accent', disabled: busy || !draft.trim(), onClick: add }, ICONS.plus, '登记'))),

              h('footer', { className: 'azl-foot' },
                h('span', null, '共 ' + habits.length + ' 条 · 更新于 ' + (state.updatedAt ? new Date(state.updatedAt).toLocaleString() : '—')),
                h('span', null, '存储于 ', h('code', null, '~/.dsh/cache/l/habits.json'))))));
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => {
          const tag = document.createElement('style');
          tag.setAttribute('data-plugin-css', 'l');
          tag.textContent = CSS;
          document.head.appendChild(tag);
          return () => tag.remove();
        }, 'l: styles');

        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID }, HabitPanel));
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register({ name: 'sidebar.panellist', id: PANEL_ID, order: 30, label: () => 'L' }, function LIcon() {
            return h('span', { style: { display: 'inline-flex' } }, ICONS.habits);
          }));
      },
    };
  },
});
