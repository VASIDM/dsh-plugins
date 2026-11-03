/**
 * 纸墨 · 布局 — 版心与行距。
 *
 * --dsh-chat-user-width 是宿主自己读取的"用户列宽"；没有拖动过时它为空，
 * 这里给 720px。--dsh-chat-flow-gap 控制对话行间距。
 */
window.__ModuleLoader__.load({
  id: '@local/paper-ink-layout',
  factory() {
    const TOKENS = {
      '--dsh-chat-user-width': { light: '720px', dark: '720px' },
      '--dsh-chat-flow-gap': { light: '10px', dark: '10px' },
    };
    return {
      inject: ['theme'],
      apply(ctx) {
        ctx.effect(
          () => ctx.theme.overrideTokens('@local/paper-ink-layout', TOKENS),
          'paper-ink: layout layer',
        );
      },
    };
  },
});
