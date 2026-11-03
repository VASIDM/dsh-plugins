/**
 * 纸墨 · 设计 — 形状与线。
 *
 * 令牌：圆角收方、阴影压平、滚动条变细。
 * 样式：只作用于会话流里的 hr / 标题 / 引用块，不碰其他组件。
 */
window.__ModuleLoader__.load({
  id: '@local/paper-ink-design',
  factory() {
    const TOKENS = {
      '--dsw-radius-xs': { light: '2px', dark: '2px' },
      '--dsw-radius-sm': { light: '3px', dark: '3px' },
      '--dsw-radius-md': { light: '4px', dark: '4px' },
      '--dsw-radius-lg': { light: '6px', dark: '6px' },
      '--dsw-radius-xl': { light: '8px', dark: '8px' },
      '--dsw-radius-panel': { light: '10px', dark: '10px' },
      '--dsh-scrollbar-width': { light: '6px', dark: '6px' },
      '--dsw-shadow-lv1': { light: '0 2px 4px 0 #17151212', dark: '0 2px 4px 0 #00000033' },
      '--dsw-shadow-lv2': {
        light: '0 4px 12px 0 #1715120d, 0 2px 8px 0 #17151214',
        dark: '0 4px 12px 0 #00000026, 0 2px 8px 0 #00000033',
      },
      '--dsw-shadow-lv3': {
        light: '0 0 1px 0 #1715121f, 0 0 4px 0 #1715120d, 0 12px 32px 0 #1715121a',
        dark: '0 0 1px 0 #00000066, 0 0 4px 0 #00000033, 0 12px 32px 0 #00000059',
      },
    };
    const CSS = "\n[data-slot=\"conversation.chat.flow\"] hr{height:1px;border:0;background:var(--dsw-alias-border-l2)}\n[data-slot=\"conversation.chat.flow\"] :is(h1,h2){padding-bottom:.25em;\n  border-bottom:1px solid var(--dsw-alias-border-l2)}\n[data-slot=\"conversation.chat.flow\"] blockquote{margin:1em 0;padding:.1em 0 .1em 12px;\n  border-left:2px solid var(--dsw-alias-state-business-primary);\n  color:var(--dsw-alias-label-secondary)}\n";
    return {
      inject: ['theme'],
      apply(ctx) {
        ctx.effect(() => {
          const disposeTokens = ctx.theme.overrideTokens('@local/paper-ink-design', TOKENS);
          if (typeof document === 'undefined') return disposeTokens;
          const tag = document.createElement('style');
          tag.dataset.plugin = '@local/paper-ink-design';
          tag.dataset.pluginCss = '@local/paper-ink-design/rules';
          tag.textContent = CSS;
          document.head.appendChild(tag);
          return () => {
            disposeTokens();
            tag.remove();
          };
        }, 'paper-ink: design layer');
      },
    };
  },
});
