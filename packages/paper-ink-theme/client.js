/**
 * 纸墨 · 配色 — 全界面语义令牌层。
 *
 * 颜色取自《太初》开机页与「用量与额度」面板共用的那一套：
 *   ink #0d0c0b / #171512   bone #ece6d9 / #f2eee4   cinnabar #a63a2e
 * 浅色与深色各给一套值，跟随 ui-theme 解析后的 colorScheme。
 */
window.__ModuleLoader__.load({
  id: '@local/paper-ink-theme',
  factory() {
    const PALETTE = {
      // 纸面
      '--dsw-alias-bg-base': ['#f2eee4', '#0d0c0b'],
      '--dsw-alias-bg-layer-1': ['#f8f4eb', '#141210'],
      '--dsw-alias-bg-layer-2': ['#e9e4d8', '#1b1815'],
      '--dsw-alias-bg-layer-3': ['#e2dcca', '#221e1a'],
      '--dsw-alias-bg-overlay': ['#f8f4eb', '#1b1815'],
      '--dsw-alias-bg-module-platform': ['#e9e4d8', '#1b1815'],
      '--dsw-alias-bg-multi-select': ['#e2dcca', '#221e1a'],
      '--dsw-alias-bg-document-preview': ['#e9e4d8', '#0d0c0b'],
      '--dsw-alias-bg-document-selection': [
        'color-mix(in srgb, #a63a2e 24%, transparent)',
        'color-mix(in srgb, #c86a58 30%, transparent)',
      ],
      '--dsw-alias-label-document-preview': ['#4c4842', '#c9c2b3'],
      '--dsw-alias-bg-skeleton': ['#1715120d', '#f2eee414'],
      '--dsw-alias-bg-mask-1': ['#0d0c0b42', '#00000080'],
      '--dsw-alias-bg-mask-2': ['#0d0c0b1f', '#00000033'],
      '--dsw-alias-bg-mask-3': ['#0d0c0b7a', '#0000007a'],
      '--dsw-alias-bg-mask-photo': ['#0d0c0be0', '#000000e0'],
      '--dsw-alias-bg-mask-drop': ['#f8f4ebb3', '#27231eb3'],

      // 发丝线
      '--dsw-alias-border-l1': ['#17151214', '#f2eee412'],
      '--dsw-alias-border-l2': ['#17151224', '#f2eee41f'],
      '--dsw-alias-border-l2-darkmode-thin': ['#17151224', '#f2eee412'],
      '--dsw-alias-border-l3': ['#17151233', '#f2eee426'],
      '--dsw-alias-border-l4': ['#17151242', '#f2eee433'],
      '--dsw-alias-border-inverted': ['#0000', '#f2eee40f'],
      '--dsw-alias-border-inverted2': ['#0000', '#f2eee414'],

      // 墨字
      '--dsw-alias-label-primary': ['#171512', '#ece6d9'],
      '--dsw-alias-label-secondary': ['#4c4842', '#a29b8d'],
      '--dsw-alias-label-tertiary': ['#6f6a60', '#8a8377'],
      '--dsw-alias-label-caption': ['#a29b8d', '#6f6a60'],
      '--dsw-alias-label-dimmed': ['#e2dcca', '#2b2723'],
      '--dsw-alias-label-primary-dimmed': ['#141210', '#ddd5c5'],
      '--dsw-alias-label-primary-bluish': ['#3b3833', '#ece6d9'],
      '--dsw-alias-label-primary-foreground': ['#f8f4eb', '#141210'],
      '--dsw-alias-label-primary-inverted': ['#f8f4eb', '#141210'],
      '--dsw-alias-label-shimmer': [
        'color-mix(in srgb, #171512 30%, transparent)',
        'color-mix(in srgb, #f2eee4 45%, transparent)',
      ],
      '--dsw-alias-label-deep-diving': [
        'color-mix(in srgb, #a63a2e 70%, #171512)',
        'color-mix(in srgb, #c86a58 55%, #a29b8d)',
      ],
      '--dsw-alias-label-deep-diving-shimmer': [
        'color-mix(in srgb, #a63a2e 30%, #171512)',
        'color-mix(in srgb, #c86a58 65%, #c9c2b3)',
      ],
      '--dsw-alias-menu-icon': ['#3b3833', '#c9c2b3'],

      // 朱砂（强调、链接、焦点、选中、开关）
      '--dsw-alias-brand-primary': ['#a63a2e', '#c86a58'],
      '--dsw-alias-brand-primary-invert': ['#f8f4eb', '#141210'],
      '--dsw-alias-brand-primary-new-colorprimary-new-color': ['#a63a2e', '#c86a58'],
      '--dsw-alias-brand-text': ['#171512', '#ece6d9'],
      '--dsw-alias-link': ['#a63a2e', '#c86a58'],
      '--dsw-alias-state-business-primary': ['#a63a2e', '#c86a58'],
      '--dsw-alias-state-business-tertiary': ['#e8d9cc', '#3a2a26'],

      // 按钮
      '--dsw-alias-button-primary-fill': ['#171512', '#ece6d9'],
      '--dsw-alias-button-primary-hover': ['#2b2723', '#d8d0c0'],
      '--dsw-alias-button-primary-dimmed': ['#e2dcca', '#2b2723'],
      '--dsw-alias-button-contrast-fill': ['#3b3833', '#ece6d9'],
      '--dsw-alias-button-elevated-fill': ['#f8f4eb', '#221e1a'],
      '--dsw-alias-button-floating-fill': ['#f8f4eb', '#1b1815'],
      '--dsw-alias-button-floating-hover': ['#e9e4d8', '#221e1a'],
      '--dsw-alias-button-ghost-active-border': ['#6f6a60', '#8a8377'],
      '--dsw-alias-button-ghost-active-fill': ['#e9e4d8', '#221e1a'],
      '--dsw-alias-button-ghost-active-hover': ['#e2dcca', '#2b2723'],
      '--dsw-alias-button-info-fill': ['#8f2f25', '#c86a58'],
      '--dsw-alias-button-info-hover': ['#a63a2e', '#a63a2e'],
      '--dsw-alias-button-tool-bar-fill-invisible': ['#0d0c0b5c', '#1f1f1f5c'],
      '--dsw-alias-button-tool-bar-fill': ['#4c484280', '#4c484280'],
      '--dsw-alias-button-tool-bar-hover': ['#4c484299', '#4c484299'],

      // 悬停与选中
      '--dsw-alias-interactive-bg-hover': ['#1715120f', '#f2eee414'],
      '--dsw-alias-interactive-bg-active': ['#1715121a', '#f2eee424'],
      '--dsw-alias-interactive-bg-hover-accent': ['#17151224', '#f2eee43d'],
      '--dsw-alias-interactive-bg-hover-danger': ['#a63a2e12', '#c86a5826'],
      '--dsw-alias-interactive-bg-hover-solid': ['#e9e4d8', '#221e1a'],

      // 菜单、气泡、输入
      '--dsw-menu-surface-fill': ['#f8f4ebd9', '#2a2620b3'],
      '--dsw-alias-menu-group-header-fill': ['#f2eee4f0', '#1b1815f0'],
      '--dsw-specific-menu': ['#f8f4ebd9', '#2a2620b3'],
      '--dsw-specific-selector': ['#e9e4d8', '#221e1a'],
      '--dsw-specific-tip': ['#e9e4d8', '#1b1815'],
      '--dsw-specific-bubble': ['#e9e4d8', '#1b1815'],
      '--dsw-specific-bubble-highlight': ['#ded6c4', '#2b2723'],
      '--dsw-specific-input-major': ['#fbf7ee', '#141210'],
      '--dsw-specific-login-input': ['#f8f4eb', '#0d0c0b'],
      '--dsw-alias-toast-bg': ['#171512', '#2b2723'],
      '--dsw-alias-toast-label': ['#f8f4eb', '#f2eee4'],
      '--dsw-alias-tooltip-bg': ['#171512', '#2b2723'],
      '--dsw-alias-tooltip-key-bg': [
        'color-mix(in srgb, #171512, white 18%)',
        'color-mix(in srgb, #2b2723, white 12%)',
      ],
      '--dsw-alias-turn-trigger-bg': ['#e9e4d8', '#1b1815'],
      '--dsw-alias-turn-trigger-bg-hover': ['#e2dcca', '#f2eee414'],

      // 侧栏
      '--dsw-specific-sidebar-fill': ['#ece6d9', '#0b0a09'],
      '--dsw-specific-sidebar-nav-item-hover': ['#e5dece', '#1b1815'],
      '--dsw-specific-sidebar-nav-item-active': ['#ddd4c1', '#221e1a'],
      '--dsw-specific-sidebar-nav-item-active-accent': ['#e8dcc9', '#3a2a26'],

      // Markdown 与代码
      '--dsw-alias-markdown-code-block': ['#e9e4d8', '#141210'],
      '--dsw-alias-markdown-code-block-banner': ['#e2dcca', '#1b1815'],
      '--dsw-alias-markdown-code-segment-selected': ['#f8f4eb', '#221e1a'],
      '--dsw-alias-markdown-code-segment-unselected': ['#e2dcca', '#141210'],
      '--dsw-alias-markdown-inline-code': ['#ebe5d7', '#1b1815'],
      '--dsw-alias-markdown-citation': ['#e9e4d8', '#1b1815'],
      '--dsw-alias-markdown-placeholder': ['#e2dcca', '#1b1815'],
      '--dsw-alias-markdown-tag': ['#e9e4d8', '#1b1815'],
      '--dsw-alias-code-diff-added': ['#4f6f5214', '#8fae9224'],
      '--dsw-alias-code-diff-deleted': ['#9b2f2314', '#c86a5824'],
      '--dsw-alias-file-diff-added-bg': ['#e6ecdf', '#1f2b20'],
      '--dsw-alias-file-diff-added-gutter': ['#eef1e7', '#162017'],
      '--dsw-alias-file-diff-added-marker': ['#3f7048', '#5fa06a'],
      '--dsw-alias-file-diff-deleted-bg': ['#f3e2dc', '#33201c'],
      '--dsw-alias-file-diff-deleted-gutter': ['#f7eae5', '#251714'],
      '--dsw-alias-file-diff-deleted-marker': ['#a63a2e', '#c86a58'],

      // 状态
      '--dsw-alias-state-error-primary': ['#b3382b', '#d9796b'],
      '--dsw-alias-state-error-secondary': ['#c04a3b', '#e69184'],
      '--dsw-alias-state-success-primary': ['#4f6f52', '#8fae92'],
      '--dsw-alias-state-success-secondary': ['#6b8a6d', '#a3c0a6'],
      '--dsw-alias-state-success-tertiary': ['#dfe8d9', '#2a332b'],
      '--dsw-alias-state-warn-primary': ['#9a6a1f', '#c9a25f'],
      '--dsw-alias-state-warn-secondary': ['#b8842f', '#d8b878'],
      '--dsw-alias-state-warn-label': ['#8a5c1a', '#c9a25f'],
      '--dsw-alias-state-warn-tertiary': ['#f0e2c6', '#33291a'],
      '--dsw-alias-state-idle-primary': ['#c3bbab', '#6f6a60'],

      // 滚动条颜色与开关
      '--dsw-alias-scrollbar-bg-l1': ['#d8cfbc', '#3a352d'],
      '--dsw-alias-scrollbar-bg-l2': ['#d8cfbc', '#4a4438'],
      '--dsw-alias-scrollbar-hover-l1': ['#c5baa5', '#4a4438'],
      '--dsw-alias-scrollbar-hover-l2': ['#c5baa5', '#5a5244'],
      '--dsw-alias-switch-thumb': ['#fbf8f1', '#d8d0c0'],

      // 渐变（把白雾换成纸色）
      '--dsw-linear-gradient-think': [
        'linear-gradient(180deg, #f2eee4 20.19%, #f2eee400 100%)',
        'linear-gradient(180deg, #0d0c0b 20.19%, #0d0c0b00 100%)',
      ],
      '--dsw-linear-think-select': [
        'linear-gradient(180deg, #e9e4d8 20.19%, #e9e4d800 100%)',
        'linear-gradient(180deg, #1b1815 20.19%, #1b181500 100%)',
      ],

      // 首次引导
      '--dsw-alias-onboarding-accent': ['#a63a2e', '#c86a58'],
      '--dsw-alias-onboarding-card-fill': [
        'color-mix(in srgb, #fbf8f1 80%, transparent)',
        'color-mix(in srgb, #1b1815 80%, transparent)',
      ],
      '--dsw-alias-onboarding-secondary-fill': ['#fbf8f1', '#2b2723'],
      '--dsw-alias-onboarding-checkbox-border': [
        'color-mix(in srgb, #171512 20%, transparent)',
        '#f2eee41f',
      ],
      '--dsw-gradient-onboarding-violet-stops': [
        '#6b2f22 33.102%, #a63a2e 50.954%, #d9a08f 85.326%, #6b2f22',
        '#8a3f31 33.102%, #c86a58 50.954%, #e6b7a8 85.326%, #8a3f31',
      ],
      '--dsw-gradient-onboarding-blue-stops': [
        '#8f2f25 18.75%, #b35143 51.78%, #e6b7a8 86.252%, #8f2f25',
        '#a34a3c 18.75%, #d07a68 51.78%, #f0c9bc 86.252%, #a34a3c',
      ],
      '--dsw-gradient-onboarding-cyan-stops': [
        '#6b4a1f 21.154%, #a06b1f 50.954%, #e8cfa4 85.326%, #6b4a1f',
        '#8a6428 21.154%, #c9a25f 50.954%, #f0ddb9 85.326%, #8a6428',
      ],
    };
    const TOKENS = {};
    for (const [name, [light, dark]] of Object.entries(PALETTE)) TOKENS[name] = { light, dark };

    return {
      inject: ['theme'],
      apply(ctx) {
        ctx.effect(
          () => ctx.theme.overrideTokens('@local/paper-ink-theme', TOKENS),
          'paper-ink: palette layer',
        );
      },
    };
  },
});
