window.__ModuleLoader__.load({
  id: '@local/session-purge',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const primitives = require('@deepseek-ai/dsh-client-ui-primitives');

    const NS = 'sessionPurge';
    const ROUTE_INFO = '/api/session-purge/info';
    const ROUTE_PURGE = '/api/session-purge/purge';

    const zh = {
      'menu.label': '彻底删除对话…',
      'menu.short': '彻底删除',
      'dialog.title': '彻底删除这个对话？',
      'dialog.desc': '“{title}”及其全部本地记录会被永久抹除，无法撤销、没有回收站。',
      'dialog.loading': '正在清点这个对话留下的数据…',
      'dialog.failed': '无法读取这个对话的删除范围：{message}',
      'dialog.scope.logs': '会话日志',
      'dialog.scope.logs.value': '{files} 个文件 · {size}',
      'dialog.scope.children': '子会话',
      'dialog.scope.children.value': '{n} 个，会一并删除',
      'dialog.scope.cache': '投影缓存与工作区记录',
      'dialog.scope.cache.value': '标题、统计、排序、归档与置顶状态',
      'dialog.scope.attachments': '附件与文件缓存',
      'dialog.scope.attachments.value': '仅删除不再被其他对话引用的对象',
      'dialog.scope.workspace': '工作区文件',
      'dialog.scope.workspace.value': '不会删除；只清除 DSH 的对话记录',
      'dialog.live': '这个对话仍在内存中。删除会先停止它正在进行的工作。',
      'dialog.ack': '我已了解：删除后无法恢复，也不会进入回收站。',
      'dialog.cancel': '取消',
      'dialog.confirm': '永久删除',
      'dialog.deleting': '正在抹除…',
      'dialog.done': '已删除，正在刷新界面…',
      'dialog.pending': '部分文件被占用，已移出会话列表；剩余字节会在后台清理。',
      'dialog.error': '删除失败：{message}',
      'dialog.close': '关闭',
      'error.network': '无法连接 Host（{message}）',
      'error.not-found': '这个对话已经不存在了',
    };

    const en = {
      'menu.label': 'Erase conversation permanently…',
      'menu.short': 'Erase permanently',
      'dialog.title': 'Erase this conversation permanently?',
      'dialog.desc': '“{title}” and every local record of it will be destroyed. There is no undo and no trash.',
      'dialog.loading': 'Inspecting what this conversation left behind…',
      'dialog.failed': 'Could not inspect the deletion scope: {message}',
      'dialog.scope.logs': 'Session logs',
      'dialog.scope.logs.value': '{files} files · {size}',
      'dialog.scope.children': 'Subagent sessions',
      'dialog.scope.children.value': '{n}, erased with it',
      'dialog.scope.cache': 'Projection cache and workspace records',
      'dialog.scope.cache.value': 'Titles, statistics, order, archive and pin state',
      'dialog.scope.attachments': 'Attachments and file cache',
      'dialog.scope.attachments.value': 'Only objects no other conversation references',
      'dialog.scope.workspace': 'Workspace files',
      'dialog.scope.workspace.value': 'Untouched; only DSH conversation records are cleared',
      'dialog.live': 'This conversation is still live in memory. Erasing it stops its running work first.',
      'dialog.ack': 'I understand this cannot be undone and does not go to a trash bin.',
      'dialog.cancel': 'Cancel',
      'dialog.confirm': 'Erase permanently',
      'dialog.deleting': 'Erasing…',
      'dialog.done': 'Erased. Reloading the page…',
      'dialog.pending': 'Some files were still open. The conversation is out of the list; the rest is cleaned in the background.',
      'dialog.error': 'Erase failed: {message}',
      'dialog.close': 'Close',
      'error.network': 'Cannot reach the Host ({message})',
      'error.not-found': 'This conversation no longer exists',
    };

    let t = (key) => key;

    const css = [
      '.sp-danger-text{color:var(--dsw-alias-state-error-primary)}',
      '.sp-danger-icon{color:var(--dsw-alias-state-error-primary);display:inline-flex;align-items:center}',
      '.sp-dialog{display:flex;flex-direction:column;gap:14px;font-size:14px;line-height:22px;color:var(--dsw-alias-label-primary)}',
      '.sp-dialog-summary{color:var(--dsw-alias-label-secondary);margin:0;font-size:13px;line-height:20px}',
      '.sp-purge-scope{display:flex;flex-direction:column;gap:0;border-top:1px solid var(--dsw-alias-border-l2)}',
      '.sp-purge-row{display:flex;align-items:baseline;justify-content:space-between;gap:16px;padding:9px 0;border-bottom:1px solid var(--dsw-alias-border-l2)}',
      '.sp-purge-row dt{color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px;flex:none}',
      '.sp-purge-row dd{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;text-align:right}',
      '.sp-purge-live{margin:0;padding:8px 10px;border:1px solid var(--dsw-alias-border-l3);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}',
      '.sp-purge-ack{display:flex;align-items:flex-start;gap:8px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;cursor:pointer}',
      '.sp-purge-ack input{margin:2px 0 0;accent-color:var(--dsw-alias-state-error-primary);flex:none}',
      '.sp-purge-error{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px;overflow-wrap:anywhere}',
      '.sp-purge-status{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}',
      '.sp-purge-danger:not(:disabled){color:var(--dsw-alias-state-error-primary)}',
    ].join('');

    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css="session-purge"]') === null) {
      const tag = document.createElement('style');
      tag.dataset.plugin = '@local/session-purge';
      tag.dataset.pluginCss = 'session-purge';
      tag.textContent = css;
      document.head.appendChild(tag);
    }

    // The request bridge between the row menu (which unmounts when the menu
    // closes) and the overlay dialog (which is mounted for the page lifetime).
    const bridge = (() => {
      let current = null;
      const listeners = new Set();
      return {
        get: () => current,
        set(next) {
          current = next;
          for (const listener of listeners) listener();
        },
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      };
    })();

    function usePurgeRequest() {
      return React.useSyncExternalStore(bridge.subscribe, bridge.get, bridge.get);
    }

    function PurgeMenuItem({ sessionId, displayTitle, useMenuOpenState }) {
      const menu = useMenuOpenState === undefined ? null : useMenuOpenState();
      const closeMenu = () => {
        if (Array.isArray(menu) && typeof menu[1] === 'function') menu[1](false);
      };
      return h(
        primitives.MenuItemButton,
        {
          icon: h(
            'span',
            { className: 'sp-danger-icon' },
            h(primitives.IconTrashOutlineRegular, { size: 14 }),
          ),
          onSelect: () => {
            bridge.set({ sessionId, title: displayTitle || sessionId, nonce: Date.now() });
            closeMenu();
          },
        },
        h('span', { className: 'sp-danger-text' }, t('menu.label')),
      );
    }

    function PurgeOverlay() {
      const request = usePurgeRequest();
      if (request === null) return null;
      return h(PurgeDialog, { key: `${request.sessionId}:${request.nonce}`, request });
    }

    function PurgeDialog({ request }) {
      const [phase, setPhase] = React.useState('loading');
      const [info, setInfo] = React.useState(null);
      const [error, setError] = React.useState(null);
      const [ack, setAck] = React.useState(false);
      const [busy, setBusy] = React.useState(false);
      const [done, setDone] = React.useState(false);
      const [notice, setNotice] = React.useState(null);

      React.useEffect(() => {
        let live = true;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20_000);
        fetchJson(`${ROUTE_INFO}?sessionId=${encodeURIComponent(request.sessionId)}`, {
          method: 'GET',
          signal: controller.signal,
        })
          .then((payload) => {
            if (!live) return;
            if (payload?.ok !== true) {
              setPhase('error');
              setError(payload?.error === 'session-not-found' ? t('error.not-found') : payload?.message || payload?.error || 'unknown');
              return;
            }
            setInfo(payload.info);
            setPhase('ready');
          })
          .catch((reason) => {
            if (!live) return;
            setPhase('error');
            setError(t('error.network', { message: reasonText(reason) }));
          })
          .finally(() => clearTimeout(timer));
        return () => {
          live = false;
          controller.abort();
          clearTimeout(timer);
        };
      }, [request.sessionId]);

      const close = () => {
        if (busy) return;
        bridge.set(null);
      };

      const confirm = () => {
        if (busy || !ack) return;
        setBusy(true);
        setError(null);
        fetchJson(ROUTE_PURGE, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-dsh-session-purge': '1',
          },
          body: JSON.stringify({ sessionId: request.sessionId, confirm: true }),
        })
          .then((payload) => {
            if (payload?.ok !== true) {
              setBusy(false);
              setError(t('dialog.error', { message: payload?.message || payload?.error || 'unknown' }));
              return;
            }
            setDone(true);
            if (Array.isArray(payload.pending) && payload.pending.length > 0) setNotice(t('dialog.pending'));
            setTimeout(() => window.location.reload(), 700);
          })
          .catch((reason) => {
            setBusy(false);
            setError(t('dialog.error', { message: reasonText(reason) }));
          });
      };

      const title = info?.title || request.title || request.sessionId;
      const size = info === null ? '' : formatBytes(info.bytes);
      const rows = [];
      if (info !== null) {
        rows.push(['dialog.scope.logs', 'dialog.scope.logs.value', { files: info.files, size }]);
        if (info.descendants > 0) {
          rows.push(['dialog.scope.children', 'dialog.scope.children.value', { n: info.descendants }]);
        }
        rows.push(['dialog.scope.cache', 'dialog.scope.cache.value', {}]);
        rows.push(['dialog.scope.attachments', 'dialog.scope.attachments.value', {}]);
        rows.push(['dialog.scope.workspace', 'dialog.scope.workspace.value', {}]);
      }

      const body = h(
        'div',
        { className: 'sp-dialog' },
        h('p', { className: 'sp-dialog-summary' }, t('dialog.desc', { title })),
        phase === 'loading' && h('div', { className: 'sp-purge-status', role: 'status' }, t('dialog.loading')),
        info !== null &&
          h(
            'dl',
            { className: 'sp-purge-scope' },
            rows.map(([label, value, vars]) =>
              h(
                'div',
                { className: 'sp-purge-row', key: label },
                h('dt', null, t(label)),
                h('dd', null, t(value, vars)),
              ),
            ),
          ),
        info?.live === true && h('p', { className: 'sp-purge-live' }, t('dialog.live')),
        phase === 'error' && error !== null && h('div', { className: 'sp-purge-error', role: 'alert' }, error),
        phase !== 'error' &&
          info !== null &&
          h(
            'label',
            { className: 'sp-purge-ack' },
            h('input', {
              type: 'checkbox',
              checked: ack,
              disabled: busy || done,
              onChange: (event) => setAck(event.target.checked),
            }),
            h('span', null, t('dialog.ack')),
          ),
        error !== null && phase !== 'error' && h('div', { className: 'sp-purge-error', role: 'alert' }, error),
        notice !== null && h('div', { className: 'sp-purge-status', role: 'status' }, notice),
        done && h('div', { className: 'sp-purge-status', role: 'status' }, t('dialog.done')),
        busy && !done && h('div', { className: 'sp-purge-status', role: 'status' }, t('dialog.deleting')),
      );

      const footer = h(
        React.Fragment,
        null,
        h(
          primitives.Button,
          { variant: 'outline', disabled: busy, onClick: close },
          t('dialog.cancel'),
        ),
        h(
          primitives.Button,
          {
            variant: 'outline',
            className: 'sp-purge-danger',
            disabled: !ack || busy || done || info === null || phase === 'error',
            onClick: confirm,
          },
          busy && !done ? t('dialog.deleting') : t('dialog.confirm'),
        ),
      );

      return h(
        primitives.Modal,
        {
          open: true,
          onClose: close,
          closeLabel: t('dialog.close'),
          title: t('dialog.title'),
          footer,
        },
        body,
      );
    }

    function formatBytes(value) {
      const bytes = Number(value) || 0;
      if (bytes < 1024) return `${bytes} B`;
      const units = ['KB', 'MB', 'GB', 'TB'];
      let size = bytes / 1024;
      let unit = 0;
      while (size >= 1024 && unit < units.length - 1) {
        size /= 1024;
        unit += 1;
      }
      return `${size >= 10 ? size.toFixed(0) : size.toFixed(1)} ${units[unit]}`;
    }

    function reasonText(reason) {
      if (reason instanceof Error) return reason.message;
      return String(reason);
    }

    async function fetchJson(url, options) {
      const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin', ...options });
      const text = await response.text();
      let payload;
      try {
        payload = text === '' ? {} : JSON.parse(text);
      } catch {
        payload = { ok: false, error: 'bad-response' };
      }
      if (!response.ok && payload?.ok !== false) {
        return { ok: false, error: `HTTP ${response.status}`, message: text.slice(0, 200) };
      }
      return payload;
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'session-purge: dictionaries');
      t = ctx.locale.bind(NS);

      ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
        ctx.slots.register(
          {
            name: 'sidebar.workspaces.session.menu.item',
            id: 'session-purge',
            order: 500,
            locale: NS,
          },
          PurgeMenuItem,
        ),
      );
      ctx.slots.inject('shell.overlay', () =>
        ctx.slots.register(
          {
            name: 'shell.overlay',
            id: 'session-purge',
            locale: NS,
          },
          PurgeOverlay,
        ),
      );
    }

    return {
      inject: ['slots', 'locale'],
      apply,
      __test: { bridge, PurgeMenuItem, PurgeDialog },
    };
  },
});
