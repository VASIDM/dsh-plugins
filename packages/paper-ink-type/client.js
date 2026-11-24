/**
 * 纸墨 · 字体 — 只改默认字族，不动字号。
 *
 * 改的是 --dsh-font-family-*-default（内置栈），因此用户在
 * 设置 → 通用 → 正文字体里填的自定义字体仍然优先。
 */
window.__ModuleLoader__.load({
  id: '@local/paper-ink-type',
  factory() {
    const SERIF = "\"Songti SC\", \"Noto Serif SC\", \"Source Han Serif SC\", \"STSong\", \"SimSun\", \"Iowan Old Style\", \"Palatino Linotype\", Palatino, Georgia, serif";
    const SERIF_BRAND = "\"Songti SC\", \"Noto Serif SC\", \"Source Han Serif SC\", \"STSong\", SimSun, \"Palatino Linotype\", Georgia, serif";
    const MONO = "\"Cascadia Mono\", \"SFMono-Regular\", \"JetBrains Mono\", \"IBM Plex Mono\", \"Fira Code\", Consolas, \"Courier New\", monospace";
    const TOKENS = {
      '--dsh-font-family-text-default': { light: SERIF, dark: SERIF },
      '--dsh-font-family-code-default': { light: MONO, dark: MONO },
      '--dsw-font-family-brand': { light: SERIF_BRAND, dark: SERIF_BRAND },
    };
    return {
      inject: ['theme'],
      apply(ctx) {
        ctx.effect(
          () => ctx.theme.overrideTokens('@local/paper-ink-type', TOKENS),
          'paper-ink: type layer',
        );
      },
    };
  },
});
