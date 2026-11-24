window.__ModuleLoader__.load({
  id: '@local/plugin-hub',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useCallback, useEffect, useRef, useState } = React;

    const NS = 'pluginHub';
    const KIND = 'plugin-hub';
    const TAB_ID = '@local/plugin-hub';
    const API = '/api/plugin-hub';

    const zh = {
      'tab.title': '插件管家',
      'guide.title': '插件管家',
      'guide.description': '一个面板管理所有插件：启停、备份到 GitHub、换机一键恢复，还能直接对话让它动手。',
      'bar.refresh': '刷新',
      'bar.selfcheck': '自检',
      'bar.reveal': '目录',
      'selfcheck.title': '自检结果',
      'stat.plugins': '插件',
      'stat.enabled': '已启用',
      'bar.backup': '备份到 GitHub',
      'bar.restore': '从 GitHub 恢复',
      'token.title': 'GitHub Token',
      'token.placeholder': '粘贴 ghp_ 开头的个人访问令牌',
      'token.save': '保存',
      'token.saved': '已保存',
      'token.hint': '留空表示沿用 github-vault 已保存的令牌。',
      'list.empty': '还没有安装任何插件。',
      'list.enabled': '已启用',
      'list.disabled': '未启用',
      'list.nobundle': '组件包',
      'chat.title': 'AI 管家',
      'chat.placeholder': '说一句要做的事，例如：把 sudoku 关掉，然后备份',
      'chat.send': '发送',
      'chat.thinking': '正在处理…',
      'chat.empty': '在这里直接说要做什么，它会调用工具替你改。',
      'chat.slow': '还在跑，可以继续等，或者去主对话看它的过程。',
      'chat.autoapprove': '本面板会话内的工具调用自动放行，其它会话不受影响。',
      'busy.backup': '正在推送…',
      'busy.restore': '正在拉取并重连…',
      'error.prefix': '出错：',
      'ok.backup': '已推送',
      'ok.restore': '已恢复',
      'ok.needRestart': '，请重启 DSH 生效',
      'restart.hint': '插件启停已即时生效；新增包需要重启 DSH。',
      'restore.warn': '恢复会用仓库里的同名文件覆盖本地 F:\\DSH-Plugins，先备份再恢复。',
    };

    const en = {
      'tab.title': 'Plugin Hub',
      'guide.title': 'Plugin Hub',
      'guide.description': 'One panel for every plugin: toggle, back up to GitHub, restore on a new machine, and just ask.',
      'bar.refresh': 'Refresh',
      'bar.selfcheck': 'Self-check',
      'bar.reveal': 'Folder',
      'selfcheck.title': 'Self-check',
      'stat.plugins': 'Plugins',
      'stat.enabled': 'Enabled',
      'bar.backup': 'Back up to GitHub',
      'bar.restore': 'Restore from GitHub',
      'token.title': 'GitHub token',
      'token.placeholder': 'Paste a personal access token',
      'token.save': 'Save',
      'token.saved': 'Saved',
      'token.hint': 'Leave empty to reuse the token github-vault already stored.',
      'list.empty': 'No plugin installed yet.',
      'list.enabled': 'Enabled',
      'list.disabled': 'Disabled',
      'list.nobundle': 'Component',
      'chat.title': 'AI steward',
      'chat.placeholder': 'Say what to do, e.g. disable sudoku, then back everything up',
      'chat.send': 'Send',
      'chat.thinking': 'Working…',
      'chat.empty': 'Describe the change here and it will do it with tools.',
      'chat.slow': 'Still running. You can keep waiting or watch it in the main conversation.',
      'chat.autoapprove': 'Tool calls in this panel session are auto-approved; other sessions keep their policy.',
      'busy.backup': 'Pushing…',
      'busy.restore': 'Pulling and rewiring…',
      'error.prefix': 'Error: ',
      'ok.backup': 'Pushed',
      'ok.restore': 'Restored',
      'ok.needRestart': ', restart DSH to apply',
      'restart.hint': 'Toggles apply live; newly added packages need a DSH restart.',
      'restore.warn': 'Restoring overwrites same-name files under F:\\DSH-Plugins — back up first.',
    };

    const CSS = `
.ph-root{display:flex;flex-direction:column;height:100%;min-height:0;flex:auto;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);font-size:12px}
.ph-bar{display:flex;align-items:center;gap:6px;flex:none;height:34px;padding:0 8px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-specific-sidebar-fill,var(--dsw-alias-bg-layer-1))}
.ph-seal{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:3px;background:#a8322a;color:#fff;font-weight:600;font-size:10px;user-select:none}
.ph-title{flex:1;min-width:0;font-weight:600;font-size:12px;letter-spacing:.02em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph-btn{display:inline-flex;align-items:center;justify-content:center;height:22px;padding:0 8px;border:1px solid transparent;border-radius:4px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer}
.ph-btn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l1)}
.ph-btn[disabled]{opacity:.45;cursor:default}
.ph-btn.ph-primary{background:#a8322a;border-color:#8f2a23;color:#fff}
.ph-btn.ph-primary:hover{background:#8f2a23;color:#fff}
.ph-icon{width:22px;padding:0}
.ph-body{display:flex;flex-direction:column;min-height:0;flex:auto}
.ph-scroll{min-height:0;overflow:auto;flex:auto}
.ph-section{display:flex;flex-direction:column;gap:6px;padding:8px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.ph-row{display:flex;align-items:center;gap:6px}
.ph-dim{color:var(--dsw-alias-label-tertiary)}
.ph-mono{font-family:var(--dsh-font-family-code-default,monospace);font-size:10px}
.ph-pill{display:inline-flex;align-items:center;height:17px;padding:0 6px;border-radius:9px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-tertiary);font-size:10px}
.ph-pill.on{border-color:rgba(168,50,42,.45);background:rgba(168,50,42,.08);color:#a8322a}
.ph-list{display:flex;flex-direction:column}
.ph-item{display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.ph-item:hover{background:var(--dsw-alias-interactive-bg-hover)}
.ph-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph-switch{position:relative;width:28px;height:16px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);cursor:pointer;flex:none}
.ph-switch[data-on=true]{background:#a8322a;border-color:#8f2a23}
.ph-switch span{position:absolute;top:1px;left:1px;width:12px;height:12px;border-radius:50%;background:#fff;transition:left .15s}
.ph-switch[data-on=true] span{left:13px}
.ph-input{width:100%;box-sizing:border-box;padding:5px 7px;border:1px solid var(--dsw-alias-border-l1);border-radius:5px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:11px}
.ph-input:focus{outline:1px solid var(--dsw-alias-brand-primary);outline-offset:0}
.ph-note{padding:6px 8px;border-radius:5px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1.5;word-break:break-word}
.ph-note.err{border-color:rgba(200,60,50,.45);color:#c83c32}
.ph-chat{display:flex;flex-direction:column;min-height:0;flex:1 1 40%;border-top:1px solid var(--dsw-alias-border-l1)}
.ph-msgs{display:flex;flex-direction:column;gap:6px;padding:8px;min-height:0;overflow:auto;flex:auto}
.ph-msg{max-width:92%;padding:6px 8px;border-radius:6px;line-height:1.55;white-space:pre-wrap;word-break:break-word;font-size:11.5px}
.ph-msg.user{align-self:flex-end;background:rgba(168,50,42,.1);border:1px solid rgba(168,50,42,.3)}
.ph-msg.bot{align-self:flex-start;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1)}
.ph-compose{display:flex;gap:6px;padding:8px;border-top:1px solid var(--dsw-alias-border-l1)}
.ph-compose textarea{flex:1;min-height:30px;max-height:96px;resize:vertical;box-sizing:border-box;padding:5px 7px;border:1px solid var(--dsw-alias-border-l1);border-radius:5px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:11.5px}
.ph-compose textarea:focus{outline:1px solid var(--dsw-alias-brand-primary)}
`;

    let bound = (key) => key;
    function translator(props) {
      return props && typeof props.t === 'function' ? props.t : bound;
    }

    async function api(action, body) {
      const response = await fetch(`${API}/${action}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: body === undefined ? {} : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await response.text();
      let payload = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        payload = null;
      }
      if (!response.ok || (payload && payload.ok === false)) {
        const message = (payload && payload.message) || text.slice(0, 300) || `HTTP ${response.status}`;
        throw new Error(message);
      }
      return payload;
    }

    function HubGlyph({ size = 14 }) {
      return h(
        'svg',
        { viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': true, style: { display: 'block' } },
        h('path', {
          d: 'M4 7h16M4 12h10M4 17h7',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: '1.6',
          strokeLinecap: 'round',
        }),
        h('circle', { cx: 18.5, cy: 12, r: 2.2, fill: 'none', stroke: 'currentColor', strokeWidth: '1.6' }),
        h('circle', { cx: 14.5, cy: 17, r: 2.2, fill: 'none', stroke: 'currentColor', strokeWidth: '1.6' }),
      );
    }

    function Switch({ on, onToggle, title }) {
      return h(
        'button',
        {
          type: 'button',
          className: 'ph-switch',
          'data-on': on ? 'true' : 'false',
          title,
          'aria-pressed': on ? 'true' : 'false',
          'aria-label': title,
          onClick: onToggle,
        },
        h('span', null),
      );
    }

    function PluginHubTitle(props) {
      const t = translator(props);
      return h(
        'span',
        { style: { display: 'inline-flex', alignItems: 'center', gap: '5px', minWidth: 0 } },
        h('span', { className: 'ph-seal' }, '匠'),
        h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, t('tab.title')),
      );
    }

    function PluginHubBody(props) {
      const t = translator(props);
      const [state, setState] = useState(null);
      const [error, setError] = useState('');
      const [note, setNote] = useState('');
      const [busy, setBusy] = useState('');
      const [checks, setChecks] = useState(null);
      const [token, setToken] = useState('');
      const [messages, setMessages] = useState([]);
      const [draft, setDraft] = useState('');
      const mounted = useRef(true);
      const msgsRef = useRef(null);

      useEffect(() => {
        mounted.current = true;
        return () => {
          mounted.current = false;
        };
      }, []);

      const load = useCallback(async () => {
        try {
          const next = await api('state');
          if (!mounted.current) return;
          setState(next);
          setError('');
        } catch (failure) {
          if (!mounted.current) return;
          setError(String(failure.message || failure));
        }
      }, []);

      useEffect(() => {
        load();
      }, [load]);

      useEffect(() => {
        const node = msgsRef.current;
        if (node) node.scrollTop = node.scrollHeight;
      }, [messages, busy]);

      const toggle = useCallback(
        async (item) => {
          setError('');
          setNote('');
          try {
            await api('enable', { dir: item.dir, enabled: !item.enabled });
            await load();
          } catch (failure) {
            setError(String(failure.message || failure));
          }
        },
        [load],
      );

      const saveToken = useCallback(async () => {
        setError('');
        setNote('');
        const value = token.trim();
        if (!value) {
          setNote(t('token.hint'));
          return;
        }
        setBusy('token');
        try {
          const result = await api('token', { token: value });
          setToken('');
          setNote(`${t('token.saved')}: ${result.login || ''}`);
          await load();
        } catch (failure) {
          setError(String(failure.message || failure));
        } finally {
          setBusy('');
        }
      }, [token, load, t]);

      const backup = useCallback(async () => {
        setError('');
        setNote('');
        setBusy(t('busy.backup'));
        try {
          const result = await api('backup', {});
          setNote(`${t('ok.backup')} → ${result.owner}/${result.repo}@${result.branch} · ${result.uploaded}/${result.files} · ${String(result.commit).slice(0, 7)}`);
          await load();
        } catch (failure) {
          setError(String(failure.message || failure));
        } finally {
          setBusy('');
        }
      }, [load, t]);

      const selfcheck = useCallback(async () => {
        setError('');
        setNote('');
        setChecks(null);
        setBusy(t('bar.selfcheck'));
        try {
          const result = await api('selfcheck');
          setChecks(result.checks || []);
          if (result.ok) setNote(`${t('selfcheck.title')}: OK`);
        } catch (failure) {
          setError(String(failure.message || failure));
        } finally {
          setBusy('');
        }
      }, [t]);

      const reveal = useCallback(async () => {
        setError('');
        try {
          await api('reveal', {});
        } catch (failure) {
          setError(String(failure.message || failure));
        }
      }, []);

      const restore = useCallback(async () => {
        setError('');
        setNote('');
        setBusy(t('busy.restore'));
        try {
          const result = await api('restore', {});
          const installNote = result.install?.ok === false ? ` · 依赖安装提示: ${result.install.message || ''}` : '';
          setNote(`${t('ok.restore')} · ${result.packages} 个包 / ${result.files} 个文件${t('ok.needRestart')}${installNote}`);
          await load();
        } catch (failure) {
          setError(String(failure.message || failure));
        } finally {
          setBusy('');
        }
      }, [load, t]);

      const send = useCallback(async () => {
        const text = draft.trim();
        if (!text || busy) return;
        setDraft('');
        setError('');
        setMessages((current) => [...current, { role: 'user', text }]);
        setBusy(t('chat.thinking'));
        try {
          const result = await api('chat', { message: text });
          if (!mounted.current) return;
          setMessages((current) => [
            ...current,
            { role: 'bot', text: result.reply || `(${result.reason}${result.logReason ? `:${result.logReason}` : ''})` },
          ]);
        } catch (failure) {
          setMessages((current) => [...current, { role: 'bot', text: `${t('error.prefix')}${String(failure.message || failure)}` }]);
        } finally {
          setBusy('');
        }
      }, [draft, busy, t]);

      const packages = state?.packages || [];
      const enabled = packages.filter((item) => item.enabled).length;

      return h(
        'div',
        { className: 'ph-root' },
        h(
          'div',
          { className: 'ph-bar' },
          h('span', { className: 'ph-seal' }, '匠'),
          h('span', { className: 'ph-title' }, t('tab.title')),
          state
            ? h('span', { className: 'ph-pill' }, `${enabled}/${packages.length}`)
            : null,
          h(
            'button',
            { type: 'button', className: 'ph-btn ph-icon', title: t('bar.refresh'), onClick: load },
            '⟳',
          ),
        ),
        h(
          'div',
          { className: 'ph-body' },
          h(
            'div',
            { className: 'ph-section' },
            h(
              'div',
              { className: 'ph-row' },
              h(
                'button',
                { type: 'button', className: 'ph-btn ph-primary', disabled: Boolean(busy), onClick: backup },
                t('bar.backup'),
              ),
              h(
                'button',
                { type: 'button', className: 'ph-btn', disabled: Boolean(busy), onClick: restore },
                t('bar.restore'),
              ),
              h(
                'button',
                { type: 'button', className: 'ph-btn', disabled: Boolean(busy), onClick: selfcheck },
                t('bar.selfcheck'),
              ),
              h('button', { type: 'button', className: 'ph-btn', onClick: reveal }, t('bar.reveal')),
            ),
            h(
              'div',
              { className: 'ph-row' },
              h('input', {
                className: 'ph-input',
                type: 'password',
                placeholder: t('token.placeholder'),
                value: token,
                onChange: (event) => setToken(event.target.value),
              }),
              h('button', { type: 'button', className: 'ph-btn', disabled: Boolean(busy), onClick: saveToken }, t('token.save')),
            ),
            state && !state.hasToken ? h('div', { className: 'ph-dim' }, t('token.hint')) : null,
            h('div', { className: 'ph-dim' }, t('restore.warn')),
            state
              ? h(
                  'div',
                  { className: 'ph-dim ph-mono' },
                  `${state.repo.owner}/${state.repo.repo}@${state.repo.branch} · token ${state.hasToken ? 'on' : 'off'} · ${state.packages.length} pkgs`,
                )
              : null,
            busy && busy !== t('chat.thinking') ? h('div', { className: 'ph-note' }, busy) : null,
            note ? h('div', { className: 'ph-note' }, note) : null,
            checks
              ? h(
                  'div',
                  { className: 'ph-note ph-mono' },
                  checks.map((check) =>
                    h('div', { key: check.name }, `${check.ok ? '✓' : '✗'} ${check.name} — ${check.detail}`),
                  ),
                )
              : null,
            error ? h('div', { className: 'ph-note err' }, `${t('error.prefix')}${error}`) : null,
          ),
          h(
            'div',
            { className: 'ph-scroll' },
            h(
              'div',
              { className: 'ph-list', role: 'list' },
              packages.length === 0
                ? h('div', { className: 'ph-note' }, t('list.empty'))
                : packages.map((item) =>
                    h(
                      'div',
                      { className: 'ph-item', role: 'listitem', key: item.dir },
                      h(
                        'span',
                        { className: 'ph-name', title: `${item.name} · ${item.description || ''}` },
                        item.title || item.dir,
                        h('span', { className: 'ph-dim ph-mono' }, ` ${item.version}`),
                      ),
                      item.hasBundle
                        ? h('span', { className: item.enabled ? 'ph-pill on' : 'ph-pill' }, item.enabled ? t('list.enabled') : t('list.disabled'))
                        : h('span', { className: 'ph-pill' }, t('list.nobundle')),
                      item.hasBundle
                        ? h(Switch, {
                            on: item.enabled,
                            title: item.enabled ? t('list.enabled') : t('list.disabled'),
                            onToggle: () => toggle(item),
                          })
                        : null,
                    ),
                  ),
            ),
          ),
          h(
            'div',
            { className: 'ph-chat' },
            h(
              'div',
              { className: 'ph-bar', style: { height: '28px' } },
              h('span', { className: 'ph-title', style: { fontSize: '11px' } }, t('chat.title')),
              busy === t('chat.thinking') ? h('span', { className: 'ph-dim' }, t('chat.thinking')) : null,
            ),
            h(
              'div',
              { className: 'ph-msgs', ref: msgsRef },
              messages.length === 0
                ? h(
                    'div',
                    { className: 'ph-dim' },
                    h('div', null, t('chat.empty')),
                    h('div', { style: { marginTop: '4px', fontSize: '10px' } }, t('chat.autoapprove')),
                  )
                : null,
              messages.map((message, index) =>
                h('div', { className: `ph-msg ${message.role === 'user' ? 'user' : 'bot'}`, key: `${message.role}-${index}` }, message.text),
              ),
            ),
            h(
              'div',
              { className: 'ph-compose' },
              h('textarea', {
                placeholder: t('chat.placeholder'),
                value: draft,
                onChange: (event) => setDraft(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                },
              }),
              h(
                'button',
                { type: 'button', className: 'ph-btn ph-primary', disabled: Boolean(busy) || !draft.trim(), onClick: send },
                t('chat.send'),
              ),
            ),
          ),
        ),
      );
    }

    return {
      inject: ['slots', 'locale', 'sidebarRightTabs'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'plugin-hub: copy');

        const t = ctx.locale.bind(NS);
        bound = t;

        ctx.effect(() => {
          const tag = document.createElement('style');
          tag.setAttribute('data-plugin-css', '@local/plugin-hub');
          tag.textContent = CSS;
          document.head.appendChild(tag);
          return () => tag.remove();
        }, 'plugin-hub: styles');

        ctx.effect(
          () =>
            ctx.sidebarRightTabs.register({
              id: TAB_ID,
              kind: KIND,
              multiple: false,
              keepMounted: true,
              priority: 'extension',
              title: () => t('tab.title'),
              guide: [
                {
                  id: 'open',
                  order: 30,
                  title: () => t('guide.title'),
                  icon: HubGlyph,
                  description: () => t('guide.description'),
                },
              ],
            }),
          'plugin-hub: tab type',
        );

        ctx.slots.inject('sidebar.right.pane.tab', () =>
          ctx.slots.register({ name: 'sidebar.right.pane.tab', key: TAB_ID, locale: NS }, PluginHubBody),
        );

        ctx.slots.inject('sidebar.right.pane.tab.title', () =>
          ctx.slots.register({ name: 'sidebar.right.pane.tab.title', key: TAB_ID, locale: NS }, PluginHubTitle),
        );
      },
    };
  },
});
