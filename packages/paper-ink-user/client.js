/**
 * 纸墨 · 用户 — Client half。
 *
 * 不新增卡片：直接把侧栏底部「设置」这一行的内容换成头像 + 手机号/用户名。
 * 按钮外壳仍由宿主渲染，点击照旧打开设置；头像上传、名称、手机号在
 * 设置 → 通用 → 「本地账户」里改，不另开浮层。
 */
window.__ModuleLoader__.load({
  id: '@local/paper-ink-user',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const API = '/api/paper-ink-profile';
    const MAX_SIDE = 128;

    const CSS = `
.piu-trigger{display:flex;align-items:center;gap:8px;min-width:0;max-width:100%}
.piu-avatar{flex:none;width:22px;height:22px;border-radius:50%;overflow:hidden;display:grid;place-items:center;
  background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l3);
  color:var(--dsw-alias-label-tertiary);font-size:10px}
.piu-avatar img{width:100%;height:100%;object-fit:cover;display:block}
.piu-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:18px;
  color:var(--dsw-alias-label-primary)}
.piu-gear{flex:none;color:var(--dsw-alias-label-tertiary);display:grid;place-items:center}
.piu-group{box-sizing:border-box;display:flex;flex-direction:column;gap:12px;padding:16px 0;
  border-bottom:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}
.piu-head{display:flex;flex-direction:column;gap:4px}
.piu-title{font-size:14px;line-height:22px}
.piu-desc{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.piu-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.piu-big{width:56px;height:56px;border-radius:50%;overflow:hidden;display:grid;place-items:center;flex:none;
  background:var(--dsw-alias-bg-layer-2);border:.5px dashed var(--dsw-alias-border-l3);color:var(--dsw-alias-label-tertiary)}
.piu-big img{width:100%;height:100%;object-fit:cover;display:block}
.piu-actions{display:flex;flex-direction:column;gap:4px;min-width:0}
.piu-btn{display:inline-flex;align-items:center;justify-content:center;height:28px;padding:0 12px;
  border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);
  background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer}
.piu-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.piu-clear{border:0;background:0 0;padding:0;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:11px;cursor:pointer;text-align:left}
.piu-clear:hover{color:var(--dsw-alias-state-error-primary)}
.piu-fields{display:flex;gap:10px;flex-wrap:wrap;flex:1 1 320px}
.piu-field{display:flex;flex-direction:column;gap:4px;flex:1 1 150px;min-width:0}
.piu-label{font-size:11px;color:var(--dsw-alias-label-tertiary)}
.piu-input{box-sizing:border-box;width:100%;height:30px;padding:0 8px;border:.5px solid var(--dsw-alias-border-l2);
  border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);
  font:inherit;font-size:13px}
.piu-input:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid
  var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}
.piu-note{margin:0;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}
`;

    const store = { value: null, listeners: new Set() };
    const emit = () => {
      for (const listener of store.listeners) listener();
    };
    const load = async () => {
      try {
        const response = await fetch(API, { cache: 'no-store' });
        const data = await response.json();
        if (data && data.ok) {
          store.value = data;
          emit();
        }
      } catch {
        /* 读不到时安静降级 */
      }
    };
    const save = async (patch) => {
      const response = await fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error('保存失败');
      store.value = data;
      emit();
      return data;
    };

    function useProfile() {
      const [, bump] = React.useState(0);
      React.useEffect(() => {
        const listener = () => bump((n) => n + 1);
        store.listeners.add(listener);
        if (store.value === null) load();
        return () => {
          store.listeners.delete(listener);
        };
      }, []);
      return store.value;
    }

    function shrink(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('读取图片失败'));
        reader.onload = () => {
          const image = new Image();
          image.onerror = () => reject(new Error('不是有效的图片'));
          image.onload = () => {
            const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
            const side = Math.max(1, Math.round(MAX_SIDE * scale));
            const canvas = document.createElement('canvas');
            canvas.width = side;
            canvas.height = side;
            canvas.getContext('2d').drawImage(image, 0, 0, side, side);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          };
          image.src = String(reader.result);
        };
        reader.readAsDataURL(file);
      });
    }

    function Avatar({ className }) {
      const profile = useProfile();
      return h('span', { className },
        profile && profile.avatar
          ? h('img', { src: profile.avatar, alt: '' })
          : h('span', { 'aria-hidden': true }, '人'));
    }

    function TriggerContent({ wide }) {
      const profile = useProfile();
      const label = profile
        ? profile.phone || profile.name || profile.defaultName || '本地账户'
        : '设置';
      return h('span', { className: 'piu-trigger' },
        h(Avatar, { className: 'piu-avatar' }),
        wide === false ? null : h('span', { className: 'piu-text' }, label),
        wide === false ? null : h('span', { className: 'piu-gear', 'aria-hidden': true },
          h('svg', { viewBox: '0 0 20 20', width: 13, height: 13, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 },
            h('circle', { cx: 10, cy: 10, r: 2.4 }),
            h('path', { d: 'M10 3.2v1.6M10 15.2v1.6M3.2 10h1.6M15.2 10h1.6M5.2 5.2l1.1 1.1M13.7 13.7l1.1 1.1M14.8 5.2l-1.1 1.1M6.3 13.7l-1.1 1.1', strokeLinecap: 'round' }))));
    }

    function AccountRow() {
      const profile = useProfile();
      const [error, setError] = React.useState('');
      const fileRef = React.useRef(null);
      if (!profile) return null;

      const upload = async (event) => {
        const file = event.target.files && event.target.files[0];
        event.target.value = '';
        if (!file) return;
        if (!/^image\//.test(file.type)) {
          setError('请选择图片文件');
          return;
        }
        try {
          await save({ avatar: await shrink(file) });
          setError('');
        } catch (reason) {
          setError(String(reason && reason.message ? reason.message : reason));
        }
      };

      const commit = async (field, value) => {
        const next = String(value || '').trim();
        if (next === (profile[field] || '')) return;
        try {
          await save({ [field]: next });
          setError('');
        } catch (reason) {
          setError(String(reason && reason.message ? reason.message : reason));
        }
      };

      return h('div', { className: 'piu-group' },
        h('div', { className: 'piu-head' },
          h('div', { className: 'piu-title' }, '本地账户'),
          h('div', { className: 'piu-desc' }, '侧栏底部「设置」那一行显示的头像、手机号与名称。')),
        h('div', { className: 'piu-row' },
          h(Avatar, { className: 'piu-big' }),
          h('div', { className: 'piu-actions' },
            h('button', { type: 'button', className: 'piu-btn', onClick: () => fileRef.current && fileRef.current.click() }, '上传头像'),
            profile.avatar
              ? h('button', { type: 'button', className: 'piu-clear', onClick: () => save({ avatar: '' }) }, '移除头像')
              : h('span', { className: 'piu-note' }, '方形图片会裁成圆形'),
            h('input', { ref: fileRef, type: 'file', accept: 'image/*', style: { display: 'none' }, onChange: upload })),
          h('div', { className: 'piu-fields' },
            h('label', { className: 'piu-field' },
              h('span', { className: 'piu-label' }, '名称'),
              h('input', {
                className: 'piu-input',
                defaultValue: profile.name,
                placeholder: profile.defaultName || '系统用户名',
                maxLength: 40,
                onBlur: (event) => commit('name', event.currentTarget.value),
                onKeyDown: (event) => {
                  if (event.key === 'Enter') event.currentTarget.blur();
                },
              })),
            h('label', { className: 'piu-field' },
              h('span', { className: 'piu-label' }, '手机号'),
              h('input', {
                className: 'piu-input',
                defaultValue: profile.phone,
                placeholder: '留空则显示名称',
                maxLength: 30,
                onBlur: (event) => commit('phone', event.currentTarget.value),
                onKeyDown: (event) => {
                  if (event.key === 'Enter') event.currentTarget.blur();
                },
              })))),
        h('p', { className: 'piu-note' }, '名称留空时自动使用系统用户名；修改后立即生效。'),
        error ? h('p', { className: 'piu-note', style: { color: 'var(--dsw-alias-state-error-primary)' } }, error) : null);
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.effect(() => {
          if (typeof document === 'undefined') return () => {};
          const tag = document.createElement('style');
          tag.dataset.plugin = '@local/paper-ink-user';
          tag.dataset.pluginCss = '@local/paper-ink-user/account';
          tag.textContent = CSS;
          document.head.appendChild(tag);
          return () => tag.remove();
        }, 'paper-ink-user: styles');

        try {
          ctx.slots.inject('settings.trigger', () =>
            ctx.slots.register({ name: 'settings.trigger' }, TriggerContent));
        } catch {
          /* 宿主没有这个座位时只保留设置页的账户行 */
        }
        ctx.slots.inject('settings.general.item', () =>
          ctx.slots.register({ name: 'settings.general.item', id: 'paper-ink-user', order: 14 }, AccountRow));
      },
    };
  },
});
