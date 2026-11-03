/* Browser half of the Usage Center bundle. */
window.__ModuleLoader__.load({
  id: '@local/usage-center',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'usage.center';
    const PANEL_ID = 'usage-center';
    const PERIODS = ['today', '7d', '30d', '1y', 'all'];
    const PERIOD_KEY = 'usage-center.period';
    const REFRESH_MS = 45_000;

    const zh = {
      panel: '用量与额度',
      title: '用量与额度',
      subtitle: '账户余额、消费与 Token 消耗，一处掌握。',
      eyebrow: 'DEEPSEEK 开放平台',
      live: '自动刷新',
      refresh: '刷新',
      refreshing: '刷新中',
      updated: '更新于 {time}',
      'period.today': '今日',
      'period.7d': '近 7 天',
      'period.30d': '近 30 天',
      'period.1y': '年记',
      'period.all': '总计',
      'balance.title': '账户余额',
      'balance.subtitle': 'DeepSeek 账户实时余额',
      'balance.recharge': '充值余额',
      'balance.bonus': '赠送余额',
      'balance.account': 'DeepSeek 账户',
      'balance.apiKey': 'API Key',
      'balance.signedIn': '已登录',
      'balance.signedOut': '未登录',
      'balance.unavailable': '暂时无法读取余额',
      'balance.unavailableHint': '登录 DeepSeek 账户，或在设置中配置 API Key 后重试。',
      'balance.usage': '查看用量',
      'balance.topUp': '去充值',
      'balance.failed': '余额读取失败，可稍后重试',
      'balance.estimated': '预估',
      'balance.actual': '实际',
      'hero.spend': '累计消费',
      'hero.spendHint': '按模型价目表估算',
      'hero.spendActualHint': '平台实际扣费记录',
      'hero.tokens': '累计 Token',
      'hero.requestsValue': '{count} 次请求',
      'usage.title': '本期消耗',
      'usage.spend': '本期消费',
      'usage.spendActual': '本期实际消费',
      'usage.spendHint': '累计 {cost}',
      'usage.actualCost': '实际金额',
      'usage.estimatedCost': '预估金额',
      'usage.total': '总 Token',
      'usage.totalLabel': '合计',
      'usage.input': '输入 Token',
      'usage.output': '输出 Token',
      'usage.cacheRead': '缓存读取',
      'usage.cacheWrite': '缓存写入',
      'usage.cacheHit': '缓存命中',
      'usage.requests': '{count} 次请求',
      'usage.sessions': '{count} 个会话',
      'usage.trend': '消耗趋势',
      'usage.composition': 'Token 构成',
      'usage.cacheNote': '缓存读取占比',
      'usage.byModel': '模型明细',
      'usage.noModels': '暂无模型数据',
      'usage.tasks': '任务消耗排行',
      'usage.rankBy': '排名方式',
      'usage.byTokens': '按 Token',
      'usage.byCost': '按金额',
      'usage.taskNoteAllocated': '单任务金额按本地 Token 分布分摊平台实际消费。',
      'usage.taskNoteLocal': '单任务金额为本地价目表估算。',
      'usage.taskAllocated': '平台金额分摊',
      'usage.taskLocal': '本地估算',
      'usage.untitledTask': '未命名任务',
      'usage.noTasks': '暂无任务数据',
      'usage.taskCount': '{count} 个任务',
      'usage.taskShare': '占比',
      'usage.empty': '这段时间还没有本地用量记录',
      'usage.emptyHint': '发起一次对话后，这里会显示 Token 消耗。',
      'usage.partial': '部分会话读取失败，统计可能不完整。',
      'usage.note': '统计来自本地会话日志，消费金额按公开价目表预估，实际扣费以 DeepSeek 开放平台为准。',
      'usage.notePlatform': 'Token 与消费金额来自 DeepSeek 开放平台的实际用量记录，与平台账单口径一致。',
      'source.platform': '平台实际数据',
      'source.local': '本地估算',
      'usage.unknownModel': '未知模型',
      'chart.noData': '暂无数据',
      'model.requests': '{count} 次请求',
      'model.name': '模型',
      'model.count': '{count} 个模型',
      'model.tokens': 'Token',
      'model.cost': '消费',
      'model.share': '占比',
      'error.title': '加载失败',
      'error.hint': '请检查网络或稍后重试。',
      'error.refresh': '刷新失败，当前显示上次数据。',
      retry: '重试',
      'footer.usage': '开放平台用量明细',
      'footer.topUp': '充值余额',
      loading: '正在加载…',
      noBalance: '—',
    };

    const en = {
      panel: 'Usage & balance',
      title: 'Usage & balance',
      subtitle: 'Balance, spend and token usage in one clear view.',
      eyebrow: 'DEEPSEEK PLATFORM',
      live: 'Auto refresh',
      refresh: 'Refresh',
      refreshing: 'Refreshing',
      updated: 'Updated {time}',
      'period.today': 'Today',
      'period.7d': '7 days',
      'period.30d': '30 days',
      'period.1y': '1 year',
      'period.all': 'Total',
      'balance.title': 'Account balance',
      'balance.subtitle': 'Live balance for your DeepSeek account',
      'balance.recharge': 'Top-up balance',
      'balance.bonus': 'Bonus credit',
      'balance.account': 'DeepSeek account',
      'balance.apiKey': 'API Key',
      'balance.signedIn': 'Signed in',
      'balance.signedOut': 'Signed out',
      'balance.unavailable': 'Balance is temporarily unavailable',
      'balance.unavailableHint': 'Sign in to DeepSeek, or configure an API Key in Settings, then retry.',
      'balance.usage': 'View usage',
      'balance.topUp': 'Top up',
      'balance.failed': 'Balance read failed. Try again later.',
      'balance.estimated': 'Est.',
      'balance.actual': 'Actual',
      'hero.spend': 'Total spend',
      'hero.spendHint': 'Estimated from the model price table',
      'hero.spendActualHint': 'Actual Platform charges',
      'hero.tokens': 'Total tokens',
      'hero.requestsValue': '{count} requests',
      'usage.title': 'Usage in this period',
      'usage.spend': 'Period spend',
      'usage.spendActual': 'Actual spend',
      'usage.spendHint': '{cost} all time',
      'usage.actualCost': 'Actual amount',
      'usage.estimatedCost': 'Estimated amount',
      'usage.total': 'Total tokens',
      'usage.totalLabel': 'Total',
      'usage.input': 'Input tokens',
      'usage.output': 'Output tokens',
      'usage.cacheRead': 'Cache read',
      'usage.cacheWrite': 'Cache write',
      'usage.cacheHit': 'Cache hit',
      'usage.requests': '{count} requests',
      'usage.sessions': '{count} sessions',
      'usage.trend': 'Token trend',
      'usage.composition': 'Token mix',
      'usage.cacheNote': 'Cache read share',
      'usage.byModel': 'Model breakdown',
      'usage.noModels': 'No model data',
      'usage.tasks': 'Task ranking',
      'usage.rankBy': 'Rank by',
      'usage.byTokens': 'Tokens',
      'usage.byCost': 'Spend',
      'usage.taskNoteAllocated': 'Per-task spend is allocated from actual Platform spend by local token share.',
      'usage.taskNoteLocal': 'Per-task spend is a local price-table estimate.',
      'usage.taskAllocated': 'Allocated Platform spend',
      'usage.taskLocal': 'Local estimate',
      'usage.untitledTask': 'Untitled task',
      'usage.noTasks': 'No task data',
      'usage.taskCount': '{count} tasks',
      'usage.taskShare': 'Share',
      'usage.empty': 'No local usage in this period',
      'usage.emptyHint': 'Start a conversation and token usage will appear here.',
      'usage.partial': 'Some sessions could not be read, so these totals may be incomplete.',
      'usage.note': 'Local session-log statistics. Spend is estimated from public prices; actual charges are defined by the DeepSeek Platform.',
      'usage.notePlatform': 'Tokens and spend come from actual DeepSeek Platform usage records and match the Platform bill.',
      'source.platform': 'Platform actual',
      'source.local': 'Local estimate',
      'usage.unknownModel': 'Unknown model',
      'chart.noData': 'No data',
      'model.requests': '{count} requests',
      'model.name': 'Model',
      'model.count': '{count} models',
      'model.tokens': 'Tokens',
      'model.cost': 'Spend',
      'model.share': 'Share',
      'error.title': 'Could not load',
      'error.hint': 'Check the network and try again.',
      'error.refresh': 'Refresh failed. Showing the previous data.',
      retry: 'Retry',
      'footer.usage': 'Platform usage details',
      'footer.topUp': 'Top up balance',
      loading: 'Loading…',
      noBalance: '—',
    };

    function tr(t, key, params) {
      let text = String(t(key));
      if (!params) return text;
      for (const name of Object.keys(params)) {
        text = text.split('{' + name + '}').join(String(params[name]));
      }
      return text;
    }

    function compact(value) {
      const n = Number(value);
      if (!Number.isFinite(n)) return '—';
      if (n < 1000) return String(Math.round(n));
      const units = [
        [1e9, 'B'],
        [1e6, 'M'],
        [1e3, 'K'],
      ];
      for (const [divisor, suffix] of units) {
        if (n >= divisor) {
          const scaled = n / divisor;
          return (scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(1)).replace(/\.0$/, '') + suffix;
        }
      }
      return String(Math.round(n));
    }

    function readStoredPeriod() {
      try {
        const value = localStorage.getItem(PERIOD_KEY);
        if (PERIODS.includes(value)) return value;
      } catch {
        // Browser storage can be unavailable in hardened environments.
      }
      return '7d';
    }

    function saveStoredPeriod(value) {
      try {
        localStorage.setItem(PERIOD_KEY, value);
      } catch {
        // Non-essential preference.
      }
    }

    function IconRefresh() {
      return h('svg', { viewBox: '0 0 16 16', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('path', { d: 'M13.2 6.4A5.4 5.4 0 1 0 13.4 9' }),
        h('path', { d: 'M13.4 2.8v3.6H9.8' }));
    }

    function IconInfo() {
      return h('svg', { viewBox: '0 0 16 16', width: 13, height: 13, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('circle', { cx: 8, cy: 8, r: 5.8 }),
        h('path', { d: 'M8 7.2v4' }),
        h('path', { d: 'M8 4.9h.01' }));
    }

    function UsageIcon(props) {
      const size = props && Number.isFinite(props.size) ? props.size : 20;
      return h('svg', {
        viewBox: '0 0 24 24',
        width: size,
        height: size,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.7,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        style: { color: '#a63a2e' },
        'aria-hidden': true,
      },
      h('path', { d: 'M5 7.2c0-1.2 3.1-2.2 7-2.2s7 1 7 2.2-3.1 2.2-7 2.2-7-1-7-2.2Z' }),
      h('path', { d: 'M5 7.2v4.4c0 1.2 3.1 2.2 7 2.2s7-1 7-2.2V7.2' }),
      h('path', { d: 'M5 11.6V16c0 1.2 3.1 2.2 7 2.2.7 0 1.4-.05 2-.13' }),
      h('path', { d: 'm18.6 14.4.7 1.5 1.6.2-1.2 1.2.3 1.6-1.4-.8-1.4.8.3-1.6-1.2-1.2 1.6-.2.7-1.5Z' }));
    }

    const CSS = `
      .uc-page {
        --uc-paper: #0d0c0b;
        --uc-paper-2: #141210;
        --uc-bone: #ece6d9;
        --uc-bone-2: #c9c2b3;
        --uc-mute: #7d776c;
        --uc-mute-2: #4c4842;
        --uc-cinnabar: #a63a2e;
        --uc-cinnabar-soft: rgba(166, 58, 46, .16);
        --uc-hair: rgba(236, 230, 217, .14);
        --uc-hair-2: rgba(236, 230, 217, .07);
        --uc-red: var(--uc-cinnabar);
        --uc-red-soft: var(--uc-cinnabar-soft);
        --uc-ink: var(--uc-bone);
        --uc-ink-soft: var(--uc-bone-2);
        --uc-gray: var(--uc-mute);
        --uc-line: var(--uc-hair);
        --uc-ink-wash: var(--uc-hair-2);
        --uc-display: "Songti SC", "Noto Serif SC", "Source Han Serif SC", "STSong", "SimSun", "NSimSun", serif;
        --uc-serif: var(--uc-display);
        --uc-mono: "SFMono-Regular", "Cascadia Mono", "JetBrains Mono", "IBM Plex Mono", Consolas, "Courier New", monospace;
        position: relative;
        height: 100%;
        overflow: auto;
        scrollbar-gutter: stable;
        background-color: var(--uc-paper);
        background-image:
          radial-gradient(54% 48% at 30% 48%, var(--uc-paper-2) 0%, transparent 72%),
          radial-gradient(color-mix(in srgb, var(--uc-bone) 9%, transparent) .45px, transparent .45px);
        background-size: auto, 3px 3px;
        box-shadow: inset 0 0 180px color-mix(in srgb, var(--uc-paper-2) 65%, transparent);
        color: var(--uc-bone);
        color-scheme: dark;
        font-family: var(--uc-display);
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
      }
      .uc-page ::selection {
        background: var(--uc-cinnabar-soft);
        color: var(--uc-bone);
      }
      .uc-page[data-uc-theme="light"] {
        color-scheme: light;
        --uc-paper: #f2eee4;
        --uc-paper-2: #e9e4d8;
        --uc-bone: #171512;
        --uc-bone-2: #3b3833;
        --uc-mute: #6f6a60;
        --uc-mute-2: #a29b8d;
        --uc-cinnabar: #8f2f25;
        --uc-cinnabar-soft: rgba(143, 47, 37, .12);
        --uc-hair: rgba(23, 21, 18, .16);
        --uc-hair-2: rgba(23, 21, 18, .08);
      }
      .uc-shell {
        max-width: 1240px;
        margin: 0 auto;
        padding: 42px 52px 64px;
        box-sizing: border-box;
      }
      .uc-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 28px;
        margin-bottom: 30px;
        padding-bottom: 22px;
        border-bottom: 1px solid var(--uc-hair);
      }
      .uc-heading { min-width: 0; }
      .uc-heading-top { display: flex; align-items: center; gap: 11px; }
      .uc-seal {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        flex: none;
        border: 1.5px solid var(--uc-cinnabar);
        border-radius: 0;
        background: transparent;
        color: var(--uc-cinnabar);
        font-family: var(--uc-display);
        font-size: 19px;
        font-weight: 400;
        line-height: 1;
        transform: rotate(-2deg);
      }
      .uc-seal::after {
        content: "";
        position: absolute;
        inset: 3px;
        border: 1px solid var(--uc-cinnabar);
        opacity: .55;
        pointer-events: none;
      }
      .uc-eyebrow {
        display: flex;
        align-items: center;
        gap: 9px;
        color: var(--uc-mute);
        font-family: var(--uc-mono);
        font-size: 12px;
        font-weight: 400;
        letter-spacing: .24em;
        text-transform: uppercase;
      }
      .uc-eyebrow-dot {
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: var(--uc-cinnabar);
        box-shadow: none;
      }
      .uc-title {
        margin: 12px 0 7px;
        font-family: var(--uc-display);
        font-size: 40px;
        line-height: 1.08;
        font-weight: 300;
        letter-spacing: .08em;
      }
      .uc-section-title,
      .uc-card-head h2 {
        font-family: var(--uc-display);
        letter-spacing: .1em;
      }
      .uc-heading::after {
        content: "";
        display: block;
        width: 34px;
        height: 1px;
        margin-top: 14px;
        background: var(--uc-cinnabar);
      }
      .uc-subtitle {
        margin: 0;
        color: var(--uc-bone-2);
        font-family: var(--uc-display);
        font-size: 15px;
        line-height: 1.7;
        letter-spacing: .06em;
      }
      .uc-header-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 16px;
        flex-wrap: wrap;
        padding-top: 4px;
      }
      .uc-live {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 0;
        border: 0;
        border-radius: 0;
        background: transparent;
        color: var(--uc-mute);
        font-family: var(--uc-display);
        font-size: 12px;
        letter-spacing: .08em;
        white-space: nowrap;
      }
      .uc-live-dot {
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: var(--uc-cinnabar);
        animation: uc-pulse 2.4s ease-in-out infinite;
      }
      @keyframes uc-pulse {
        0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--uc-red) 45%, transparent); }
        50% { box-shadow: 0 0 0 4px transparent; }
      }
      .uc-updated {
        color: var(--uc-mute);
        font-family: var(--uc-display);
        font-size: 12px;
        letter-spacing: .04em;
        white-space: nowrap;
      }
      .uc-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        height: 32px;
        padding: 0 12px;
        border: 1px solid var(--uc-hair);
        border-radius: 0;
        background: transparent;
        color: var(--uc-bone-2);
        font-family: var(--uc-display);
        font-size: 13px;
        font-weight: 400;
        letter-spacing: .08em;
        line-height: 1;
        text-decoration: none;
        white-space: nowrap;
        cursor: pointer;
        transition: background .16s ease, border-color .16s ease, color .16s ease;
      }
      .uc-btn:hover {
        background: var(--uc-hair-2);
        border-color: var(--uc-bone-2);
        color: var(--uc-bone);
      }
      .uc-btn:active { transform: translateY(1px); }
      .uc-btn:disabled { opacity: .55; cursor: default; transform: none; }
      .uc-btn-primary {
        border-color: var(--uc-cinnabar);
        background: transparent;
        color: var(--uc-cinnabar);
        box-shadow: none;
      }
      .uc-btn-primary:hover {
        background: var(--uc-cinnabar-soft);
        border-color: var(--uc-cinnabar);
        color: var(--uc-cinnabar);
        filter: none;
      }
      .uc-btn-ghost { background: transparent; }
      .uc-btn:focus-visible,
      .uc-segment:focus-visible,
      .uc-link:focus-visible {
        outline: 2px solid var(--uc-red);
        outline-offset: 2px;
      }
      .uc-spin { display: inline-flex; animation: uc-spin .9s linear infinite; }
      @keyframes uc-spin { to { transform: rotate(360deg); } }

      .uc-hero {
        position: relative;
        display: grid;
        grid-template-columns: minmax(0, 1.12fr) minmax(300px, .88fr);
        gap: 44px;
        margin: 0;
        padding: 30px 0 32px 26px;
        border-top: 1px solid var(--uc-hair);
        border-bottom: 1px solid var(--uc-hair);
        border-left: 1px solid var(--uc-cinnabar);
        border-radius: 0;
        background: transparent;
        box-shadow: none;
        animation: uc-rise .38s ease both;
      }

      .uc-hero-main, .uc-hero-side { position: relative; z-index: 1; min-width: 0; }
      .uc-hero-side { display: flex; flex-direction: column; gap: 18px; justify-content: space-between; }
      .uc-hero-top {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .uc-kicker {
        color: var(--uc-mute);
        font-family: var(--uc-display);
        font-size: 13px;
        font-weight: 400;
        letter-spacing: .12em;
      }
      .uc-status {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        color: var(--uc-bone-2);
        font-family: var(--uc-display);
        font-size: 12px;
        letter-spacing: .08em;
      }
      .uc-status-dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: var(--uc-mute-2);
      }
      .uc-status-dot.ok { background: var(--uc-ink); }
      .uc-status-dot.warn { background: var(--uc-red); }
      .uc-balance {
        margin: 15px 0 8px;
        font-family: var(--uc-display);
        font-size: 62px;
        line-height: 1;
        font-weight: 300;
        letter-spacing: .015em;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .uc-balance-meta {
        color: var(--uc-bone-2);
        font-size: 14px;
        line-height: 1.6;
        letter-spacing: .06em;
      }
      .uc-wallet-row {
        display: flex;
        flex-wrap: wrap;
        gap: 24px;
        margin-top: 20px;
      }
      .uc-wallet-item { display: flex; flex-direction: column; gap: 3px; }
      .uc-wallet-label {
        color: var(--uc-mute);
        font-family: var(--uc-display);
        font-size: 12px;
        letter-spacing: .1em;
      }
      .uc-wallet-value {
        font-family: var(--uc-mono);
        font-size: 16px;
        font-weight: 400;
        letter-spacing: .02em;
        font-variant-numeric: tabular-nums;
      }
      .uc-extra-wallets { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
      .uc-extra-wallet {
        padding: 3px 7px;
        border: 1px solid var(--uc-hair);
        border-radius: 0;
        color: var(--uc-mute);
        font-family: var(--uc-mono);
        font-size: 12px;
        letter-spacing: .04em;
        font-variant-numeric: tabular-nums;
      }
      .uc-mini-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 0;
      }
      .uc-mini {
        position: relative;
        min-width: 0;
        padding: 0;
        border: 0;
        border-radius: 0;
        background: transparent;
        overflow: visible;
      }
      .uc-mini-spend {
        padding-left: 20px;
        border-left: 1px solid var(--uc-cinnabar);
      }
      .uc-mini-spend::before { display: none; }
      .uc-mini-label {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
        color: var(--uc-mute);
        font-family: var(--uc-display);
        font-size: 12px;
        font-weight: 400;
        letter-spacing: .08em;
        white-space: nowrap;
      }
      .uc-estimated {
        padding: 1px 5px;
        border: 1px solid var(--uc-cinnabar);
        border-radius: 0;
        color: var(--uc-cinnabar);
        font-family: var(--uc-display);
        font-size: 12px;
        letter-spacing: .06em;
      }
      .uc-estimated.is-actual {
        border-color: var(--uc-cinnabar);
        background: transparent;
        color: var(--uc-cinnabar);
      }
      .uc-estimated.is-estimated {
        border-color: var(--uc-hair);
        background: transparent;
        color: var(--uc-mute);
      }
      .uc-mini-value {
        margin-top: 10px;
        font-family: var(--uc-display);
        font-size: 34px;
        line-height: 1.05;
        font-weight: 300;
        letter-spacing: .02em;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .uc-mini-hint {
        margin-top: 6px;
        color: var(--uc-mute);
        font-family: var(--uc-display);
        font-size: 12px;
        line-height: 1.4;
        letter-spacing: .04em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .uc-hero-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
      .uc-hero-note {
        color: var(--uc-cinnabar);
        font-family: var(--uc-mono);
        font-size: 12px;
        line-height: 1.5;
        letter-spacing: .04em;
        text-align: right;
      }

      .uc-balance-period { margin: 22px 0 12px; }
      .uc-section-row {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
      }
      .uc-section-title {
        margin: 0;
        color: var(--uc-bone);
        font-size: 21px;
        font-weight: 400;
        letter-spacing: .12em;
      }
      .uc-section-sub {
        margin-top: 5px;
        color: var(--uc-mute);
        font-family: var(--uc-display);
        font-size: 12px;
        letter-spacing: .08em;
      }
      .uc-segmented {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px 22px;
        padding: 0;
        border: 0;
        border-bottom: 1px solid var(--uc-hair);
        border-radius: 0;
        background: transparent;
        box-shadow: none;
      }
      .uc-segment {
        height: 30px;
        padding: 0 0 8px;
        border: 0;
        border-bottom: 1px solid transparent;
        border-radius: 0;
        background: transparent;
        color: var(--uc-mute);
        font-family: var(--uc-display);
        font-size: 13px;
        font-weight: 400;
        letter-spacing: .08em;
        cursor: pointer;
        white-space: nowrap;
      }
      .uc-segment:hover { color: var(--uc-bone); }
      .uc-segment[aria-pressed="true"] {
        background: transparent;
        color: var(--uc-cinnabar);
        border-bottom-color: var(--uc-cinnabar);
        box-shadow: none;
      }

      .uc-metrics {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0;
        margin: 18px 0 0;
        padding: 20px 0;
        border-top: 1px solid var(--uc-hair);
        border-bottom: 1px solid var(--uc-hair);
      }
      .uc-metric {
        min-width: 0;
        padding: 0 22px;
        border-left: 1px solid var(--uc-hair);
      }
      .uc-metric:first-child { padding-left: 0; border-left: 0; }
      .uc-metric:last-child { padding-right: 0; }
      .uc-metric-head {
        display: flex;
        align-items: baseline;
        gap: 10px;
        color: var(--uc-bone-2);
        font-size: 14px;
      }
      .uc-metric-index {
        flex: none;
        color: var(--uc-cinnabar);
        font-family: var(--uc-mono);
        font-size: 12px;
        letter-spacing: .16em;
      }
      .uc-metric-label {
        font-family: var(--uc-display);
        letter-spacing: .06em;
        line-height: 1.4;
      }
      .uc-metric-value {
        margin-top: 15px;
        color: var(--uc-bone);
        font-family: var(--uc-mono);
        font-size: 26px;
        line-height: 1.05;
        font-weight: 400;
        letter-spacing: -.04em;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .uc-metric-hint {
        margin-top: 7px;
        color: var(--uc-mute);
        font-family: var(--uc-display);
        font-size: 12px;
        line-height: 1.5;
        letter-spacing: .02em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .uc-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.55fr) minmax(280px, .9fr);
        gap: 42px;
      }
      .uc-card {
        position: relative;
        min-width: 0;
        padding: 26px 0 0;
        border: 0;
        border-top: 1px solid var(--uc-hair);
        border-radius: 0;
        background: transparent;
        box-shadow: none;
        animation: uc-rise .4s ease both;
      }
      .uc-comp-card {
        border-left: 1px solid var(--uc-hair);
        padding-left: 34px;
      }
      .uc-card-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
      }
      .uc-card-head h2 {
        margin: 0;
        color: var(--uc-bone);
        font-size: 19px;
        font-weight: 400;
        letter-spacing: .12em;
      }
      .uc-card-sub {
        margin-top: 4px;
        color: var(--uc-mute);
        font-family: var(--uc-display);
        font-size: 12px;
        letter-spacing: .08em;
      }
      .uc-card-value {
        color: var(--uc-bone-2);
        font-family: var(--uc-mono);
        font-size: 12px;
        font-weight: 400;
        letter-spacing: .04em;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .uc-trend-card { position: relative; }
      .uc-card-head-right { display: flex; align-items: center; gap: 8px; flex: none; }
      .uc-source-badge {
        padding: 2px 6px;
        border: 1px solid var(--uc-hair);
        border-radius: 0;
        background: transparent;
        color: var(--uc-mute);
        font-family: var(--uc-display);
        font-size: 12px;
        letter-spacing: .06em;
        white-space: nowrap;
      }
      .uc-source-badge.is-platform {
        border-color: var(--uc-cinnabar);
        background: transparent;
        color: var(--uc-cinnabar);
      }
      .uc-source-badge.is-local {
        border-color: var(--uc-hair);
        background: transparent;
        color: var(--uc-mute);
      }
      .uc-chart { position: relative; margin-top: 18px; }
      .uc-bars {
        display: flex;
        align-items: stretch;
        gap: 3px;
        height: 210px;
      }
      .uc-bar-col {
        position: relative;
        flex: 1;
        min-width: 0;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        align-items: center;
        gap: 6px;
        border-radius: 0;
        outline: none;
      }
      .uc-bar-col:hover,
      .uc-bar-col.is-active { background: var(--uc-hair-2); }
      .uc-bar-col:focus-visible { outline: 1px solid var(--uc-cinnabar); outline-offset: 1px; }
      .uc-bar-track {
        flex: 1;
        width: 100%;
        max-width: 10px;
        display: flex;
        align-items: flex-end;
      }
      .uc-bar-fill {
        width: 100%;
        min-height: 1px;
        border-radius: 0;
        background: var(--uc-cinnabar);
        opacity: .72;
        transition: height .25s ease, opacity .15s ease;
      }
      .uc-bar-col:hover .uc-bar-fill,
      .uc-bar-col.is-active .uc-bar-fill {
        opacity: 1;
        box-shadow: none;
      }
      .uc-bar-axis-label {
        height: 10px;
        color: var(--uc-mute);
        font-family: var(--uc-mono);
        font-size: 12px;
        line-height: 1;
        letter-spacing: .02em;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }
      .uc-bar-tip {
        position: absolute;
        top: 6px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 20;
        min-width: 158px;
        padding: 10px 12px;
        border: 1px solid var(--uc-cinnabar);
        border-radius: 0;
        background: var(--uc-paper);
        box-shadow: none;
        pointer-events: none;
      }
      .uc-bar-col:first-child .uc-bar-tip { left: 0; transform: none; }
      .uc-bar-col:last-child .uc-bar-tip { left: auto; right: 0; transform: none; }
      .uc-bar-tip-date {
        margin-bottom: 7px;
        color: var(--uc-cinnabar);
        font-family: var(--uc-display);
        font-size: 15px;
        font-weight: 400;
        letter-spacing: .08em;
      }
      .uc-bar-tip-row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 16px;
        color: var(--uc-mute);
        font-family: var(--uc-display);
        font-size: 12px;
        line-height: 1.7;
      }
      .uc-bar-tip-row strong {
        color: var(--uc-bone);
        font-family: var(--uc-mono);
        font-size: 12px;
        font-weight: 400;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .uc-bar-tip-row strong.uc-bar-tip-cost { color: var(--uc-cinnabar); }
      .uc-bar-tip-meta {
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px solid var(--uc-hair);
        color: var(--uc-mute);
        font-family: var(--uc-display);
        font-size: 12px;
        letter-spacing: .04em;
      }

      .uc-comp-card { display: flex; flex-direction: column; }
      .uc-comp-top {
        display: flex;
        align-items: center;
        gap: 18px;
        margin: 18px 0 16px;
      }
      .uc-ring {
        position: relative;
        width: 100px;
        height: 100px;
        flex: none;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: var(--uc-cinnabar);
        box-shadow: none;
      }
      .uc-ring-inner {
        width: 96px;
        height: 96px;
        border-radius: 50%;
        background: var(--uc-paper);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        box-shadow: none;
      }
      .uc-ring-inner strong {
        font-family: var(--uc-display);
        font-size: 23px;
        line-height: 1;
        font-weight: 400;
        letter-spacing: .02em;
        font-variant-numeric: tabular-nums;
      }
      .uc-ring-inner span {
        color: var(--uc-mute);
        font-family: var(--uc-mono);
        font-size: 12px;
        letter-spacing: .08em;
        text-align: center;
        max-width: 62px;
        line-height: 1.3;
      }
      .uc-comp-stats { min-width: 0; }
      .uc-comp-total {
        font-family: var(--uc-display);
        font-size: 28px;
        line-height: 1.05;
        font-weight: 300;
        letter-spacing: .02em;
        font-variant-numeric: tabular-nums;
      }
      .uc-comp-label {
        margin-top: 4px;
        color: var(--uc-mute);
        font-family: var(--uc-display);
        font-size: 12px;
        letter-spacing: .08em;
      }
      .uc-comp-sub {
        margin-top: 11px;
        color: var(--uc-mute);
        font-family: var(--uc-display);
        font-size: 12px;
        line-height: 1.6;
        letter-spacing: .02em;
      }
      .uc-comp-bar {
        display: flex;
        height: 2px;
        border-radius: 0;
        overflow: hidden;
        background: var(--uc-hair);
        gap: 1px;
      }
      .uc-comp-bar span {
        height: 100%;
        min-width: 1px;
      }
      .uc-comp-legend {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px 16px;
        margin-top: 16px;
      }
      .uc-legend-item {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
        color: var(--uc-mute);
        font-family: var(--uc-display);
        font-size: 12px;
        letter-spacing: .02em;
      }
      .uc-dot {
        width: 5px;
        height: 5px;
        border-radius: 0;
        flex: none;
      }
      .uc-legend-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .uc-legend-value {
        margin-left: auto;
        color: var(--uc-bone);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }

      .uc-model-card { margin-top: 30px; }
      .uc-model-table { margin-top: 18px; }
      .uc-model-head,
      .uc-model-row,
      .uc-model-total {
        display: grid;
        grid-template-columns: minmax(0, 1.7fr) 90px 90px minmax(100px, .7fr);
        align-items: center;
        gap: 14px;
      }
      .uc-model-head {
        padding: 0 0 9px;
        border-bottom: 1px solid var(--uc-hair);
        color: var(--uc-mute);
        font-family: var(--uc-display);
        font-size: 12px;
        font-weight: 400;
        letter-spacing: .1em;
      }
      .uc-model-row {
        padding: 12px 0;
        border-bottom: 1px solid var(--uc-hair-2);
        border-radius: 0;
        transition: background .14s ease;
      }
      .uc-model-row:hover { background: var(--uc-hair-2); }
      .uc-model-identity { display: flex; align-items: center; gap: 12px; min-width: 0; }
      .uc-model-index {
        width: 22px;
        flex: none;
        color: var(--uc-cinnabar);
        font-family: var(--uc-mono);
        font-size: 12px;
        letter-spacing: .08em;
      }
      .uc-model-copy { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
      .uc-model-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--uc-bone);
        font-family: var(--uc-display);
        font-size: 17px;
        font-weight: 400;
        letter-spacing: .06em;
      }
      .uc-model-requests {
        color: var(--uc-mute);
        font-family: var(--uc-display);
        font-size: 12px;
        letter-spacing: .04em;
      }
      .uc-model-tokens,
      .uc-model-cost {
        color: var(--uc-bone);
        font-family: var(--uc-mono);
        font-size: 13px;
        font-weight: 400;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .uc-model-cost { color: var(--uc-cinnabar); }
      .uc-model-share { display: flex; align-items: center; gap: 9px; min-width: 0; }
      .uc-model-track {
        flex: 1;
        height: 1px;
        border-radius: 0;
        background: var(--uc-hair);
        overflow: hidden;
      }
      .uc-model-fill {
        height: 100%;
        min-width: 1px;
        border-radius: 0;
        background: var(--uc-cinnabar);
      }
      .uc-model-share span {
        width: 44px;
        text-align: right;
        color: var(--uc-mute);
        font-family: var(--uc-mono);
        font-size: 12px;
        font-variant-numeric: tabular-nums;
      }
      .uc-model-total {
        margin-top: 14px;
        padding: 12px 0 0;
        border-top: 1px solid var(--uc-hair);
        border-radius: 0;
        background: transparent;
        color: var(--uc-mute);
        font-family: var(--uc-display);
        font-size: 12px;
        letter-spacing: .04em;
      }
      .uc-model-total strong {
        color: var(--uc-bone);
        font-family: var(--uc-mono);
        font-size: 12px;
        font-weight: 400;
        font-variant-numeric: tabular-nums;
      }
      .uc-model-total span:last-child { text-align: right; }

      .uc-task-card { margin-top: 30px; }
      .uc-task-controls {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 18px;
        flex-wrap: wrap;
      }
      .uc-task-basis {
        color: var(--uc-mute);
        font-family: var(--uc-display);
        font-size: 12px;
        letter-spacing: .06em;
      }
      .uc-task-switch {
        display: flex;
        align-items: center;
        gap: 14px;
        border-bottom: 1px solid var(--uc-hair);
      }
      .uc-task-switch-btn {
        padding: 0 0 7px;
        border: 0;
        border-bottom: 1px solid transparent;
        border-radius: 0;
        background: transparent;
        color: var(--uc-mute);
        font-family: var(--uc-display);
        font-size: 12px;
        letter-spacing: .06em;
        cursor: pointer;
      }
      .uc-task-switch-btn[aria-pressed="true"] {
        color: var(--uc-cinnabar);
        border-bottom-color: var(--uc-cinnabar);
      }
      .uc-task-table {
        max-height: 520px;
        margin-top: 18px;
        overflow: auto;
      }
      .uc-task-head,
      .uc-task-row {
        display: grid;
        grid-template-columns: 32px minmax(0, 1.7fr) 88px 88px minmax(96px, .7fr);
        align-items: center;
        gap: 14px;
      }
      .uc-task-head {
        position: sticky;
        top: 0;
        z-index: 1;
        padding-bottom: 9px;
        border-bottom: 1px solid var(--uc-hair);
        background: var(--uc-paper);
        color: var(--uc-mute);
        font-family: var(--uc-display);
        font-size: 12px;
        letter-spacing: .08em;
      }
      .uc-task-row {
        padding: 12px 0;
        border-bottom: 1px solid var(--uc-hair-2);
      }
      .uc-task-rank {
        color: var(--uc-cinnabar);
        font-family: var(--uc-mono);
        font-size: 12px;
        letter-spacing: .06em;
      }
      .uc-task-copy { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
      .uc-task-title {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--uc-bone);
        font-family: var(--uc-display);
        font-size: 17px;
        font-weight: 400;
        letter-spacing: .04em;
      }
      .uc-task-meta {
        color: var(--uc-mute);
        font-family: var(--uc-display);
        font-size: 12px;
        letter-spacing: .03em;
      }
      .uc-task-tokens,
      .uc-task-cost {
        color: var(--uc-bone);
        font-family: var(--uc-mono);
        font-size: 13px;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .uc-task-cost { color: var(--uc-cinnabar); }
      .uc-task-share { display: flex; align-items: center; gap: 9px; min-width: 0; }
      .uc-task-track {
        flex: 1;
        height: 1px;
        background: var(--uc-hair);
        overflow: hidden;
      }
      .uc-task-fill { height: 100%; min-width: 1px; background: var(--uc-cinnabar); }
      .uc-task-share span {
        width: 46px;
        text-align: right;
        color: var(--uc-mute);
        font-family: var(--uc-mono);
        font-size: 12px;
        font-variant-numeric: tabular-nums;
      }
      .uc-task-foot {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 18px;
        flex-wrap: wrap;
        margin-top: 14px;
        padding-top: 12px;
        border-top: 1px solid var(--uc-hair);
        color: var(--uc-mute);
        font-family: var(--uc-display);
        font-size: 12px;
        line-height: 1.5;
        letter-spacing: .02em;
      }

      .uc-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 160px;
        padding: 20px;
        border: 1px dashed var(--uc-hair);
        border-radius: 0;
        color: var(--uc-mute);
        text-align: center;
        font-family: var(--uc-display);
        font-size: 13px;
        line-height: 1.6;
        letter-spacing: .04em;
      }
      .uc-empty strong {
        color: var(--uc-bone-2);
        font-family: var(--uc-display);
        font-size: 17px;
        font-weight: 400;
        letter-spacing: .08em;
      }
      .uc-empty.small { min-height: 190px; margin-top: 18px; }

      .uc-banner {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 14px;
        padding: 9px 12px;
        border: 1px solid var(--uc-cinnabar);
        border-radius: 0;
        background: var(--uc-cinnabar-soft);
        color: var(--uc-cinnabar);
        font-family: var(--uc-display);
        font-size: 12px;
        line-height: 1.5;
        letter-spacing: .02em;
      }
      .uc-banner button {
        margin-left: auto;
        flex: none;
        border: 0;
        background: transparent;
        color: inherit;
        font-family: var(--uc-mono);
        font-size: 12px;
        font-weight: 400;
        cursor: pointer;
        text-decoration: underline;
        text-underline-offset: 2px;
      }
      .uc-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        flex-wrap: wrap;
        margin-top: 26px;
        padding-top: 18px;
        border-top: 1px solid var(--uc-hair);
      }
      .uc-note {
        display: flex;
        align-items: flex-start;
        gap: 7px;
        max-width: 720px;
        margin: 0;
        color: var(--uc-mute);
        font-family: var(--uc-display);
        font-size: 12px;
        line-height: 1.65;
        letter-spacing: .02em;
      }
      .uc-note svg { margin-top: 1px; flex: none; }
      .uc-footer-links { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
      .uc-link {
        color: var(--uc-cinnabar);
        font-family: var(--uc-display);
        font-size: 12px;
        font-weight: 400;
        letter-spacing: .08em;
        text-decoration: none;
        white-space: nowrap;
      }
      .uc-link:hover { text-decoration: underline; text-underline-offset: 3px; }

      .uc-error-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        min-height: 300px;
        padding: 32px;
        border: 1px solid var(--uc-hair);
        border-radius: 0;
        background: transparent;
        text-align: center;
      }
      .uc-error-card strong {
        font-family: var(--uc-display);
        font-size: 21px;
        font-weight: 400;
        letter-spacing: .1em;
      }
      .uc-error-card span { color: var(--uc-mute); font-family: var(--uc-mono); font-size: 12px; }
      .uc-skeleton-wrap { display: flex; flex-direction: column; gap: 16px; }
      .uc-skeleton {
        position: relative;
        border: 1px solid var(--uc-hair);
        border-radius: 0;
        background: var(--uc-paper-2);
        overflow: hidden;
      }
      .uc-skeleton::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--uc-bone) 7%, transparent), transparent);
        transform: translateX(-100%);
        animation: uc-shimmer 1.6s infinite;
      }
      .uc-skeleton.hero { height: 220px; }
      .uc-skeleton.metrics { height: 116px; }
      .uc-skeleton.chart { height: 280px; }
      @keyframes uc-shimmer { to { transform: translateX(100%); } }
      @keyframes uc-rise {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @media (max-width: 980px) {
        .uc-shell { padding: 30px 22px 46px; }
        .uc-header { flex-direction: column; gap: 16px; }
        .uc-header-actions { justify-content: flex-start; }
        .uc-hero {
          grid-template-columns: minmax(0, 1fr);
          gap: 28px;
          padding: 26px 0 28px 20px;
        }
        .uc-hero-actions { justify-content: flex-start; }
        .uc-hero-note { text-align: left; }
        .uc-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .uc-metric:nth-child(3) {
          margin-top: 18px;
          padding-top: 18px;
          padding-left: 0;
          border-top: 1px solid var(--uc-hair);
          border-left: 0;
        }
        .uc-metric:nth-child(4) {
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid var(--uc-hair);
        }
        .uc-grid { grid-template-columns: minmax(0, 1fr); gap: 30px; }
        .uc-comp-card {
          border-left: 0;
          border-top: 1px solid var(--uc-hair);
          padding-left: 0;
          padding-top: 26px;
        }
        .uc-model-head { display: none; }
        .uc-model-row {
          grid-template-columns: minmax(0, 1fr) auto auto;
          row-gap: 8px;
        }
        .uc-model-share { grid-column: 1 / -1; }
        .uc-model-total { grid-template-columns: minmax(0, 1fr) auto auto; }
        .uc-model-total span:last-child { display: none; }
        .uc-task-controls { justify-content: flex-start; }
        .uc-task-head,
        .uc-task-row { grid-template-columns: 28px minmax(0, 1fr) 80px 80px; }
        .uc-task-share,
        .uc-task-head span:last-child { display: none; }
      }
      @media (max-width: 620px) {
        .uc-title { font-size: 30px; }
        .uc-balance { font-size: 44px; }
        .uc-mini-grid { grid-template-columns: minmax(0, 1fr); }
        .uc-metrics { grid-template-columns: minmax(0, 1fr); }
        .uc-metric {
          padding: 16px 0 0;
          border-top: 1px solid var(--uc-hair);
          border-left: 0;
        }
        .uc-metric:first-child { padding-top: 0; border-top: 0; }
        .uc-metric:nth-child(3),
        .uc-metric:nth-child(4) { margin-top: 0; }
        .uc-card { padding-top: 22px; }
        .uc-hero { padding: 24px 0 26px 18px; }
        .uc-comp-legend { grid-template-columns: minmax(0, 1fr); }
        .uc-model-row { grid-template-columns: minmax(0, 1fr) auto; }
        .uc-model-cost { display: none; }
        .uc-model-total { grid-template-columns: minmax(0, 1fr) auto; }
        .uc-model-total strong:nth-child(3) { display: none; }
        .uc-task-head,
        .uc-task-row { grid-template-columns: 24px minmax(0, 1fr) auto; }
        .uc-task-cost,
        .uc-task-head span:nth-child(4),
        .uc-task-head span:nth-child(5) { display: none; }
        .uc-task-foot { flex-direction: column; gap: 4px; }
      }
      @media (prefers-reduced-motion: reduce) {
        .uc-page *, .uc-page *::before, .uc-page *::after {
          animation-duration: .001ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: .001ms !important;
        }
      }
    `;

    function apply(ctx) {
      ctx.effect(() => {
        const tag = document.createElement('style');
        tag.setAttribute('data-plugin-css', 'usage-center');
        tag.textContent = CSS;
        document.head.appendChild(tag);
        return () => tag.remove();
      }, 'usage-center: styles');

      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'usage-center: dictionaries');
      const t = ctx.locale.bind(NS);

      function localeTag() {
        try {
          return String(ctx.locale.getLocale().id || 'zh-CN').replace('_', '-');
        } catch {
          return 'zh-CN';
        }
      }

      function accountLocale() {
        return localeTag().toLowerCase().startsWith('zh') ? 'zh' : 'en';
      }

      function money(value, currency) {
        const amount = Number(value);
        if (!Number.isFinite(amount)) return '—';
        try {
          return new Intl.NumberFormat(localeTag(), {
            style: 'currency',
            currency: currency || 'CNY',
            currencyDisplay: 'narrowSymbol',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(amount);
        } catch {
          return String(amount.toFixed(2)) + ' ' + (currency || 'CNY');
        }
      }

      function costMoney(value) {
        const amount = Number(value);
        if (!Number.isFinite(amount)) return '—';
        const digits = Math.abs(amount) > 0 && Math.abs(amount) < 1 ? 4 : 2;
        try {
          return new Intl.NumberFormat(localeTag(), {
            style: 'currency',
            currency: 'CNY',
            currencyDisplay: 'narrowSymbol',
            minimumFractionDigits: digits,
            maximumFractionDigits: digits,
          }).format(amount);
        } catch {
          return String(amount.toFixed(digits)) + ' CNY';
        }
      }

      function summaryUrl(period) {
        const offset = -new Date().getTimezoneOffset();
        return '/api/usage-center/summary?period=' + encodeURIComponent(period)
          + '&tzOffset=' + encodeURIComponent(String(offset))
          + '&locale=' + encodeURIComponent(accountLocale());
      }

      function openExternal(url) {
        if (!url || typeof url !== 'string') return;
        window.open(url, '_blank', 'noopener,noreferrer');
      }

      function ExternalButton({ url, children, primary }) {
        if (!url) {
          return h('button', { className: 'uc-btn' + (primary ? ' uc-btn-primary' : ''), type: 'button', disabled: true }, children);
        }
        return h('a', {
          className: 'uc-btn' + (primary ? ' uc-btn-primary' : ''),
          href: url,
          target: '_blank',
          rel: 'noopener noreferrer',
          onClick: (event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return;
            event.preventDefault();
            openExternal(url);
          },
        }, children);
      }

      function statusText(balance) {
        if (!balance) return t('balance.loading');
        if (balance.signedIn) return t('balance.signedIn');
        if (balance.source === 'api-key') return t('balance.apiKey');
        return t('balance.signedOut');
      }

      function renderHeader(data, loading, refresh) {
        return h('header', { className: 'uc-header' },
          h('div', { className: 'uc-heading' },
            h('div', { className: 'uc-heading-top' },
              h('span', { className: 'uc-seal' }, '量'),
              h('div', { className: 'uc-eyebrow' },
                h('span', { className: 'uc-eyebrow-dot' }),
                t('eyebrow'))),
            h('h1', { className: 'uc-title' }, t('title')),
            h('p', { className: 'uc-subtitle' }, t('subtitle'))),
          h('div', { className: 'uc-header-actions' },
            h('span', { className: 'uc-live' }, h('i', { className: 'uc-live-dot' }), t('live')),
            data ? h('span', { className: 'uc-updated' },
              tr(t, 'updated', {
                time: new Date(data.generatedAt || Date.now()).toLocaleTimeString(localeTag(), { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              })) : null,
            h('button', {
              className: 'uc-btn uc-btn-ghost',
              type: 'button',
              onClick: refresh,
              disabled: loading,
              title: loading ? t('refreshing') : t('refresh'),
            },
            h('span', { className: loading ? 'uc-spin' : '' }, h(IconRefresh)),
            loading ? t('refreshing') : t('refresh'))));
      }

      function renderSkeleton() {
        return h('div', { className: 'uc-skeleton-wrap' },
          h('div', { className: 'uc-skeleton hero' }),
          h('div', { className: 'uc-skeleton metrics' }),
          h('div', { className: 'uc-skeleton chart' }));
      }

      function renderHero(balance, allTime) {
        const totals = allTime || { cost: 0, tokens: 0, requests: 0 };
        const wallets = balance && Array.isArray(balance.wallets) ? balance.wallets : [];
        const primary = wallets.find((wallet) => wallet.currency === 'CNY') || wallets[0] || null;
        const extras = wallets.filter((wallet) => wallet !== primary);
        const available = Boolean(balance && balance.ok && primary);
        const source = statusText(balance);
        const sourceLabel = balance && balance.source === 'api-key'
          ? t('balance.apiKey')
          : balance && (balance.source === 'account' || balance.signedIn)
            ? t('balance.account')
            : t('balance.signedOut');
        const dotClass = available ? 'ok' : balance && balance.signedIn ? 'warn' : '';
        const costChip = totals.costSource === 'platform' ? t('balance.actual') : t('balance.estimated');

        return h('section', { className: 'uc-hero' },
          h('div', { className: 'uc-hero-main' },
            h('div', { className: 'uc-hero-top' },
              h('span', { className: 'uc-kicker' }, t('balance.title')),
              h('span', { className: 'uc-status' },
                h('span', { className: 'uc-status-dot ' + dotClass }),
                source)),
            h('div', { className: 'uc-balance' },
              available ? money(primary.total, primary.currency) : t('noBalance')),
            h('div', { className: 'uc-balance-meta' },
              available
                ? t('balance.subtitle')
                : balance && balance.signedIn
                  ? t('balance.unavailable')
                  : t('balance.unavailableHint')),
            available ? h('div', { className: 'uc-wallet-row' },
              h('div', { className: 'uc-wallet-item' },
                h('span', { className: 'uc-wallet-label' }, t('balance.recharge')),
                h('span', { className: 'uc-wallet-value' }, money(primary.recharge, primary.currency))),
              h('div', { className: 'uc-wallet-item' },
                h('span', { className: 'uc-wallet-label' }, t('balance.bonus')),
                h('span', { className: 'uc-wallet-value' }, money(primary.bonus, primary.currency)))) : null,
            extras.length > 0 ? h('div', { className: 'uc-extra-wallets' },
              extras.map((wallet) => h('span', { className: 'uc-extra-wallet', key: wallet.currency },
                wallet.currency + ' ' + money(wallet.total, wallet.currency)))) : null),
          h('div', { className: 'uc-hero-side' },
            h('div', { className: 'uc-mini-grid' },
              h('div', { className: 'uc-mini uc-mini-spend' },
                h('div', { className: 'uc-mini-label' },
                  t('hero.spend'),
                  h('span', {
                    className: 'uc-estimated ' + (totals.costSource === 'platform' ? 'is-actual' : 'is-estimated'),
                  }, costChip)),
                h('div', { className: 'uc-mini-value' }, costMoney(totals.cost)),
                h('div', { className: 'uc-mini-hint' }, t(totals.costSource === 'platform' ? 'hero.spendActualHint' : 'hero.spendHint')))),
            h('div', { className: 'uc-hero-actions' },
              h(ExternalButton, { url: balance && balance.links && balance.links.usageUrl }, t('balance.usage')),
              h(ExternalButton, { url: balance && balance.links && balance.links.topUpUrl, primary: true }, t('balance.topUp'))),
            balance && balance.error ? h('div', { className: 'uc-hero-note' }, t('balance.failed')) : null));
      }

      function renderMetrics(usage, allTime) {
        const totals = allTime || { cost: 0 };
        const metrics = [
          {
            key: 'spend',
            index: '01',
            label: t(usage.source === 'platform' ? 'usage.spendActual' : 'usage.spend'),
            value: costMoney(usage.cost),
            hint: tr(t, 'usage.spendHint', { cost: costMoney(totals.cost) }),
          },
          {
            key: 'tokens',
            index: '02',
            label: t('usage.total'),
            value: compact(usage.totalTokens),
            hint: tr(t, 'usage.requests', { count: usage.requests })
              + (usage.source === 'platform' ? '' : ' · ' + tr(t, 'usage.sessions', { count: usage.sessions })),
          },
          {
            key: 'cache',
            index: '03',
            label: t('usage.cacheHit'),
            value: String(usage.cacheHitRate) + '%',
            hint: t('usage.cacheRead') + ' ' + compact(usage.cacheReadTokens),
          },
          {
            key: 'output',
            index: '04',
            label: t('usage.output'),
            value: compact(usage.outputTokens),
            hint: t('usage.input') + ' ' + compact(usage.inputTokens),
          },
        ];

        return h('section', { className: 'uc-metrics' },
          metrics.map((metric) => h('div', { className: 'uc-metric', key: metric.key },
            h('div', { className: 'uc-metric-head' },
              h('span', { className: 'uc-metric-index' }, metric.index),
              h('span', { className: 'uc-metric-label' }, metric.label)),
            h('div', { className: 'uc-metric-value' }, metric.value),
            h('div', { className: 'uc-metric-hint', title: metric.hint }, metric.hint))));
      }

      function TrendCard({ usage, period }) {
        const [hover, setHover] = React.useState(null);
        const series = Array.isArray(usage.series) ? usage.series : [];
        const max = series.reduce((value, point) => Math.max(value, Number(point.totalTokens) || 0), 0);
        const hasData = series.length > 0 && (usage.totalTokens > 0 || Number(usage.cost) > 0);
        const labelEvery = Math.max(1, Math.ceil(series.length / (series.length > 14 ? 6 : 7)));

        return h('section', { className: 'uc-card uc-trend-card' },
          h('div', { className: 'uc-card-head' },
            h('div', null,
              h('h2', null, t('usage.trend')),
              h('div', { className: 'uc-card-sub' }, t('period.' + period))),
            h('div', { className: 'uc-card-head-right' },
              h('span', { className: 'uc-source-badge ' + (usage.source === 'platform' ? 'is-platform' : 'is-local') }, t(usage.source === 'platform' ? 'source.platform' : 'source.local')),
              h('span', { className: 'uc-card-value' }, compact(usage.totalTokens) + ' tokens'))),
          hasData
            ? h('div', { className: 'uc-chart' },
              h('div', { className: 'uc-bars' },
                series.map((point, index) => {
                  const tokens = Number(point.totalTokens) || 0;
                  const cost = Number(point.cost) || 0;
                  const requests = Number(point.requests) || 0;
                  const height = max > 0 ? Math.max(tokens > 0 ? 4 : 0, Math.round((tokens / max) * 100)) : 0;
                  const showLabel = index % labelEvery === 0;
                  const active = hover && hover.key === point.key;
                  return h('div', {
                    className: 'uc-bar-col' + (active ? ' is-active' : ''),
                    key: point.key,
                    tabIndex: 0,
                    role: 'img',
                    'aria-label': point.label + ': ' + tokens.toLocaleString(localeTag()) + ' tokens, ' + costMoney(cost),
                    onMouseEnter: () => setHover(point),
                    onMouseLeave: () => setHover(null),
                    onFocus: () => setHover(point),
                    onBlur: () => setHover(null),
                  },
                  active ? h('div', { className: 'uc-bar-tip' },
                    h('div', { className: 'uc-bar-tip-date' }, point.label),
                    h('div', { className: 'uc-bar-tip-row' },
                      h('span', null, t('usage.total')),
                      h('strong', null, tokens.toLocaleString(localeTag()))),
                    h('div', { className: 'uc-bar-tip-row' },
                      h('span', null, t(usage.source === 'platform' ? 'usage.actualCost' : 'usage.estimatedCost')),
                      h('strong', { className: 'uc-bar-tip-cost' }, costMoney(cost))),
                    h('div', { className: 'uc-bar-tip-meta' }, tr(t, 'usage.requests', { count: requests }))) : null,
                  h('div', { className: 'uc-bar-track' },
                    h('div', { className: 'uc-bar-fill', style: { height: height + '%' } })),
                  showLabel ? h('span', { className: 'uc-bar-axis-label' }, point.label) : h('span', { className: 'uc-bar-axis-label is-empty' }));
                })))
            : h('div', { className: 'uc-empty small' },
              h('strong', null, t('chart.noData')),
              h('span', null, t('usage.emptyHint'))));
      }

      function renderComposition(usage, period) {
        const parts = [
          { key: 'input', label: t('usage.input'), value: usage.inputTokens, color: 'var(--uc-red)' },
          { key: 'output', label: t('usage.output'), value: usage.outputTokens, color: 'var(--uc-gray)' },
          { key: 'cacheRead', label: t('usage.cacheRead'), value: usage.cacheReadTokens, color: 'var(--uc-ink)' },
          { key: 'cacheWrite', label: t('usage.cacheWrite'), value: usage.cacheWriteTokens, color: 'var(--uc-ink-soft)' },
        ];
        const total = parts.reduce((value, part) => value + (Number(part.value) || 0), 0);
        const rate = Number(usage.cacheHitRate) || 0;

        return h('section', { className: 'uc-card uc-comp-card' },
          h('div', { className: 'uc-card-head' },
            h('div', null,
              h('h2', null, t('usage.composition')),
              h('div', { className: 'uc-card-sub' }, t('period.' + period))),
            h('div', { className: 'uc-card-value' }, compact(usage.totalTokens))),
          h('div', { className: 'uc-comp-top' },
            h('div', {
              className: 'uc-ring',
              style: { background: 'conic-gradient(from -90deg, var(--uc-red) 0deg, var(--uc-ink) ' + (rate * 3.6) + 'deg, color-mix(in srgb, var(--uc-bone) 10%, transparent) 0)' },
            },
            h('div', { className: 'uc-ring-inner' },
              h('strong', null, rate + '%'),
              h('span', null, t('usage.cacheHit')))),
            h('div', { className: 'uc-comp-stats' },
              h('div', { className: 'uc-comp-total' }, compact(usage.totalTokens)),
              h('div', { className: 'uc-comp-label' }, t('usage.total')),
              h('div', { className: 'uc-comp-sub' }, t('usage.cacheNote')))),
          h('div', { className: 'uc-comp-bar' },
            parts.map((part) => {
              const value = Number(part.value) || 0;
              return value > 0
                ? h('span', {
                  key: part.key,
                  style: { width: (total > 0 ? (value / total) * 100 : 0) + '%', background: part.color },
                  title: part.label + ' · ' + value.toLocaleString(localeTag()),
                })
                : null;
            })),
          h('div', { className: 'uc-comp-legend' },
            parts.map((part) => h('div', { className: 'uc-legend-item', key: part.key },
              h('span', { className: 'uc-dot', style: { background: part.color } }),
              h('span', { className: 'uc-legend-label' }, part.label),
              h('span', { className: 'uc-legend-value' }, compact(part.value))))));
      }

      function renderModels(usage, period) {
        const models = Array.isArray(usage.models) ? usage.models : [];
        const max = models.reduce((value, model) => Math.max(value, Number(model.tokens) || 0), 0);

        return h('section', { className: 'uc-card uc-model-card' },
          h('div', { className: 'uc-card-head' },
            h('div', null,
              h('h2', null, t('usage.byModel')),
              h('div', { className: 'uc-card-sub' }, t('period.' + period))),
            h('div', { className: 'uc-card-value' }, tr(t, 'model.count', { count: models.length }))),
          models.length > 0
            ? h('div', { className: 'uc-model-table' },
              h('div', { className: 'uc-model-head' },
                h('span', null, t('model.name')),
                h('span', null, t('model.tokens')),
                h('span', null, t('model.cost')),
                h('span', null, t('model.share'))),
              models.map((model, index) => {
                const share = max > 0 ? Math.round((model.tokens / max) * 100) : 0;
                const label = !model.model || model.model === 'unknown' ? t('usage.unknownModel') : model.model;
                return h('div', { className: 'uc-model-row', key: model.model },
                  h('div', { className: 'uc-model-identity' },
                    h('span', { className: 'uc-model-index' }, String(index + 1).padStart(2, '0')),
                    h('div', { className: 'uc-model-copy' },
                      h('span', { className: 'uc-model-name', title: label }, label),
                      h('span', { className: 'uc-model-requests' }, tr(t, 'model.requests', { count: model.requests })))),
                  h('span', { className: 'uc-model-tokens' }, compact(model.tokens)),
                  h('span', { className: 'uc-model-cost' }, costMoney(model.cost)),
                  h('div', { className: 'uc-model-share' },
                    h('div', { className: 'uc-model-track' },
                      h('div', { className: 'uc-model-fill', style: { width: Math.max(3, share) + '%' } })),
                    h('span', null, share + '%')));
              }),
              h('div', { className: 'uc-model-total' },
                h('span', null, t('usage.totalLabel')),
                h('strong', null, compact(usage.totalTokens)),
                h('strong', null, costMoney(usage.cost)),
                h('span', null, '100%')))
            : h('div', { className: 'uc-empty small' },
              h('strong', null, t('usage.noModels')),
              h('span', null, t('usage.emptyHint'))));
      }

      function TaskCard({ usage, period }) {
        const [rankBy, setRankBy] = React.useState('tokens');
        const tasks = Array.isArray(usage.tasks) ? usage.tasks : [];
        const totalTokens = tasks.reduce((sum, task) => sum + (Number(task.tokens) || 0), 0);
        const totalCost = tasks.reduce((sum, task) => sum + (Number(task.cost) || 0), 0);
        const sorted = [...tasks].sort((a, b) => (
          rankBy === 'cost'
            ? (Number(b.cost) || 0) - (Number(a.cost) || 0)
            : (Number(b.tokens) || 0) - (Number(a.tokens) || 0)
        ));
        const shown = sorted;
        const maxValue = sorted.reduce((max, task) => Math.max(
          max,
          rankBy === 'cost' ? (Number(task.cost) || 0) : (Number(task.tokens) || 0),
        ), 0);
        const allocated = usage.taskBasis === 'allocated';

        return h('section', { className: 'uc-card uc-task-card' },
          h('div', { className: 'uc-card-head' },
            h('div', null,
              h('h2', null, t('usage.tasks')),
              h('div', { className: 'uc-card-sub' },
                tr(t, 'usage.taskCount', { count: tasks.length }) + ' · ' + t('period.' + period))),
            h('div', { className: 'uc-task-controls' },
              h('span', { className: 'uc-task-basis' }, t(allocated ? 'usage.taskAllocated' : 'usage.taskLocal')),
              h('div', { className: 'uc-task-switch', role: 'group', 'aria-label': t('usage.rankBy') },
                h('button', {
                  type: 'button',
                  className: 'uc-task-switch-btn',
                  'aria-pressed': rankBy === 'tokens',
                  onClick: () => setRankBy('tokens'),
                }, t('usage.byTokens')),
                h('button', {
                  type: 'button',
                  className: 'uc-task-switch-btn',
                  'aria-pressed': rankBy === 'cost',
                  onClick: () => setRankBy('cost'),
                }, t('usage.byCost'))))),
          tasks.length > 0
            ? h('div', { className: 'uc-task-table' },
              h('div', { className: 'uc-task-head' },
                h('span', null, '#'),
                h('span', null, t('usage.tasks')),
                h('span', null, t('model.tokens')),
                h('span', null, t('model.cost')),
                h('span', null, t('usage.taskShare'))),
              shown.map((task, index) => {
                const value = rankBy === 'cost' ? (Number(task.cost) || 0) : (Number(task.tokens) || 0);
                const total = rankBy === 'cost' ? totalCost : totalTokens;
                const percent = total > 0 ? (value / total) * 100 : 0;
                const bar = maxValue > 0 ? (value / maxValue) * 100 : 0;
                const title = task.title || (t('usage.untitledTask') + ' · ' + String(task.id).slice(0, 8));
                return h('div', { className: 'uc-task-row', key: task.id },
                  h('span', { className: 'uc-task-rank' }, String(index + 1).padStart(2, '0')),
                  h('div', { className: 'uc-task-copy' },
                    h('span', { className: 'uc-task-title', title }, title),
                    h('span', { className: 'uc-task-meta' }, tr(t, 'model.requests', { count: task.requests }))),
                  h('span', { className: 'uc-task-tokens' }, compact(task.tokens)),
                  h('span', { className: 'uc-task-cost' }, costMoney(task.cost)),
                  h('div', { className: 'uc-task-share' },
                    h('div', { className: 'uc-task-track' },
                      h('div', { className: 'uc-task-fill', style: { width: Math.max(2, bar) + '%' } })),
                    h('span', null, percent.toFixed(1) + '%')));
              }),
              h('div', { className: 'uc-task-foot' },
                h('span', null, t(allocated ? 'usage.taskNoteAllocated' : 'usage.taskNoteLocal')),
                h('span', null, tr(t, 'usage.taskCount', { count: tasks.length }))))
            : h('div', { className: 'uc-empty small' },
              h('strong', null, t('usage.noTasks')),
              h('span', null, t('usage.emptyHint'))));
      }

      function UsagePage() {
        const [period, setPeriod] = React.useState(readStoredPeriod);
        const [nonce, setNonce] = React.useState(0);
        const [data, setData] = React.useState(null);
        const [error, setError] = React.useState(null);
        const [loading, setLoading] = React.useState(true);
        const [themeMode, setThemeMode] = React.useState(() => {
          try {
            const theme = ctx.theme.getTheme();
            return theme && theme.active && theme.active.colorScheme === 'light' ? 'light' : 'dark';
          } catch {
            return 'dark';
          }
        });

        React.useEffect(() => {
          const timer = setInterval(() => setNonce((value) => value + 1), REFRESH_MS);
          return () => clearInterval(timer);
        }, []);

        React.useEffect(() => {
          const off = ctx.on('theme/change', (snapshot) => {
            try {
              setThemeMode(snapshot && snapshot.active && snapshot.active.colorScheme === 'light' ? 'light' : 'dark');
            } catch {
              // Keep the current mode if a theme plugin publishes an unexpected snapshot.
            }
          });
          return off;
        }, []);

        React.useEffect(() => {
          let alive = true;
          const controller = new AbortController();
          setLoading(true);
          setError(null);

          fetch(summaryUrl(period), {
            cache: 'no-store',
            credentials: 'same-origin',
            signal: controller.signal,
          })
            .then((response) => {
              if (!response.ok) throw new Error('HTTP ' + response.status);
              return response.json();
            })
            .then((payload) => {
              if (!alive) return;
              if (!payload || payload.ok !== true) throw new Error('summary unavailable');
              setData(payload);
            })
            .catch((caught) => {
              if (!alive || (caught && caught.name === 'AbortError')) return;
              setError(caught instanceof Error ? caught : new Error('summary unavailable'));
            })
            .finally(() => {
              if (alive) setLoading(false);
            });

          return () => {
            alive = false;
            controller.abort();
          };
        }, [period, nonce]);

        function changePeriod(next) {
          setPeriod(next);
          saveStoredPeriod(next);
        }

        function refresh() {
          setNonce((value) => value + 1);
        }

        const body = [];
        body.push(renderHeader(data, loading, refresh));

        if (error && data) {
          body.push(h('div', { className: 'uc-banner' },
            h(IconInfo),
            t('error.refresh'),
            h('button', { type: 'button', onClick: refresh }, t('retry'))));
        }
        if (data && data.coverage && data.coverage.partial) {
          body.push(h('div', { className: 'uc-banner' }, h(IconInfo), t('usage.partial')));
        }

        if (!data && loading) {
          body.push(renderSkeleton());
        } else if (!data && error) {
          body.push(h('div', { className: 'uc-error-card' },
            h('strong', null, t('error.title')),
            h('span', null, t('error.hint')),
            h('button', { className: 'uc-btn', type: 'button', onClick: refresh }, t('retry'))));
        } else if (data) {
          const usage = data.usage || {};
          const balance = data.balance || null;
          const allTime = usage.allTime || { cost: 0, tokens: 0, requests: 0 };
          body.push(renderHero(balance, allTime));
          body.push(h('div', { className: 'uc-balance-period' },
            h('div', { className: 'uc-section-row' },
              h('div', null,
                h('h2', { className: 'uc-section-title' }, t('usage.title')),
                h('div', { className: 'uc-section-sub' }, t('period.' + period))),
              h('div', { className: 'uc-segmented', role: 'group', 'aria-label': t('usage.title') },
                PERIODS.map((id) => h('button', {
                  key: id,
                  type: 'button',
                  className: 'uc-segment',
                  'aria-pressed': period === id,
                  onClick: () => changePeriod(id),
                }, t('period.' + id)))))));
          body.push(renderMetrics(usage, allTime));
          body.push(h('div', { className: 'uc-grid' },
            h(TrendCard, { usage, period }),
            renderComposition(usage, period)));
          body.push(renderModels(usage, period));
          body.push(h(TaskCard, { usage, period }));
          body.push(h('footer', { className: 'uc-footer' },
            h('p', { className: 'uc-note' }, h(IconInfo), t(usage.source === 'platform' ? 'usage.notePlatform' : 'usage.note')),
            h('div', { className: 'uc-footer-links' },
              balance && balance.links && balance.links.usageUrl
                ? h('a', {
                  className: 'uc-link',
                  href: balance.links.usageUrl,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  onClick: (event) => {
                    event.preventDefault();
                    openExternal(balance.links.usageUrl);
                  },
                }, t('footer.usage'))
                : null,
              balance && balance.links && balance.links.topUpUrl
                ? h('a', {
                  className: 'uc-link',
                  href: balance.links.topUpUrl,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  onClick: (event) => {
                    event.preventDefault();
                    openExternal(balance.links.topUpUrl);
                  },
                }, t('footer.topUp'))
                : null)));
        }

        return h('div', { className: 'uc-page', 'data-uc-theme': themeMode }, h('div', { className: 'uc-shell' }, ...body));
      }

      ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main',
        key: PANEL_ID,
        locale: NS,
      }, UsagePage));

      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 20,
        locale: NS,
        label: () => t('panel'),
      }, UsageIcon));
    }

    return {
      inject: ['slots', 'locale', 'theme'],
      apply,
    };
  },
});
