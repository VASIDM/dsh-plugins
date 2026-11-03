/**
 * 太初 — 开机序列，Client half。
 *
 * 名出《列子·天瑞》：「太初者，气之始也。」太易、太初、太始、太素，
 * 是同一段里从无到有的四个阶段；开机正是“气始、形始”的那一步。
 * 视觉方向：古籍刊本的气口——宋体大字、极细界线、一枚朱砂印记。
 *
 * 缩放：所有尺寸以 vmin（窗口短边）为基准，窗口化时整页等比缩小。
 * 动效：进度条由 requestAnimationFrame 连续插值，不使用 CSS 过渡，
 *       因此每一帧都在动，不会出现「跳一下、停一下」的卡顿感。
 * 交互：只有一枚「启」印，点击或按 Enter；Esc 保留为随时退出。
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-scifi-boot',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const SEEN_KEY = 'dsh-scifi-boot.seen';
    const REPLAY_EVENT = 'dsh-scifi-boot:replay';

    const DISPLAY =
      '"Songti SC", "Noto Serif SC", "Source Han Serif SC", "STSong", "SimSun", "NSimSun", serif';
    const SERIF =
      '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, "Cambria", serif';
    const MONO =
      '"SFMono-Regular", "Cascadia Mono", "JetBrains Mono", "IBM Plex Mono", Consolas, "Courier New", monospace';

    const pad = (n) => String(n).padStart(2, '0');
    const clockText = () => {
      const d = new Date();
      return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    /**
     * 全局节拍：一处定义，三处消费。
     *
     *   step —— 每隔多久点亮一句
     *   ease —— 所有过渡共用同一条贝塞尔曲线
     *
     * 关键约定：**过渡时长恒等于 step**。于是「字开始变亮」与「进度开始走」
     * 同时发生、同时结束，并且在下一句到来时刚好走完，中间不留空档。
     * 之前几版把文字设 600ms、进度设 560ms，两条线各走各的，观感就是错位；
     * 这里不再允许出现第二个时长常量。
     */
    const RHYTHM = {
      boot: { step: 620 },
      launch: { step: 470 },
    };
    const EASE = 'cubic-bezier(.33,0,.2,1)';
    const LAUNCH_START = 300;

    /** 当前阶段与帧序号 → 进度目标（0—1）。唯一的进度真相来源。 */
    function progressOf(phase, step, total) {
      const n = Math.max(1, total);
      return Math.min(1, step / n);
    }

    /** 汉字是主视觉；英文与拉丁文是刊本上的小字注，不替代它。 */
    const COPY = {
      zh: { enter: '启' },
      en: { enter: 'Begin' },
    };

    /** 五帧：太易 → 太初 → 太始 → 太素 → 启户。 */
    const BOOT_LINES = [
      ['太易 · 未见气', 'I', 'before breath'],
      ['太初 · 气之始', 'II', 'breath begins'],
      ['太始 · 形之始', 'III', 'form begins'],
      ['太素 · 质之始', 'IV', 'substance begins'],
      ['启户 · 有待', 'V', 'the gate stands open'],
    ];

    const LAUNCH_LINES = [
      ['应声 · 名之', 'I', 'the voice is named'],
      ['破壳 · 气行', 'II', 'the shell gives way'],
      ['渡虚 · 有线', 'III', 'a line across the void'],
      ['元日 · 初动', 'IV', 'the first day moves'],
      ['既济 · 在', 'V', 'it is here'],
    ];

    /** 天头只留书名与时间；阶段名不再显示在右上角。 */

    function isZh(snapshot) {
      const id = String(
        (snapshot && (snapshot.active || snapshot.locale || snapshot.id || snapshot.current)) || 'zh',
      );
      return id.toLowerCase().startsWith('zh');
    }

    const CSS = `
.sb-root{
  --sb-ink:#0d0c0b;
  --sb-ink-2:#141210;
  --sb-bone:#ece6d9;
  --sb-bone-2:#c9c2b3;
  --sb-mute:#7d776c;
  --sb-mute-2:#4c4842;
  --sb-cinnabar:#a63a2e;
  --sb-cinnabar-soft:rgba(166,58,46,.16);
  --sb-hair:rgba(236,230,217,.14);
  --sb-hair-2:rgba(236,230,217,.07);
  position:fixed;z-index:9000;overflow:hidden;
  top:0;left:0;right:0;
  height:100vh;
  height:100dvh;                           /* 移动端/窗口化时取真实可视高度 */
  scrollbar-gutter:stable;                 /* 滚动条出现时不侵占右侧内容 */
  background:var(--sb-ink);color:var(--sb-bone);
  font-family:${DISPLAY};-webkit-font-smoothing:antialiased;
  text-rendering:optimizeLegibility;
  opacity:1;transition:opacity .9s cubic-bezier(.4,0,.2,1)}
.sb-root[data-theme=light]{
  --sb-ink:#f2eee4;--sb-ink-2:#e9e4d8;--sb-bone:#171512;--sb-bone-2:#3b3833;
  --sb-mute:#6f6a60;--sb-mute-2:#a29b8d;--sb-cinnabar:#8f2f25;
  --sb-cinnabar-soft:rgba(143,47,37,.12);--sb-hair:rgba(23,21,18,.16);--sb-hair-2:rgba(23,21,18,.08)}
.sb-root[data-leaving="1"]{opacity:0;pointer-events:none}

/* 纸面：素底、极淡的晕、纸纹。纸纹不用 mix-blend-mode——它会让整层每帧重新合成。 */
.sb-ground{position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(54% 48% at 30% 48%,var(--sb-ink-2) 0%,transparent 72%),var(--sb-ink)}
.sb-grain{position:absolute;inset:0;pointer-events:none;opacity:.10;
  background-image:radial-gradient(var(--sb-bone) .4px,transparent .4px);background-size:3px 3px}
.sb-vignette{position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(closest-side,transparent 56%,rgba(0,0,0,.38) 100%)}
.sb-root[data-theme=light] .sb-vignette{
  background:radial-gradient(closest-side,transparent 58%,rgba(23,21,18,.10) 100%)}

/* 版框：三行网格。天头与地脚永远保留，中间行允许收缩并内部滚动。 */
.sb-frame{position:relative;display:grid;grid-template-rows:auto minmax(0,1fr) auto;
  width:100%;height:100%;margin:0 auto;
  padding:
    max(clamp(20px,4.8vmin,52px), calc(env(safe-area-inset-top, 0px) + 18px))
    clamp(16px,5.5vmin,64px)
    max(clamp(12px,2.8vmin,28px), calc(env(safe-area-inset-bottom, 0px) + 10px))}
@media (min-width:1500px){
  .sb-frame{width:min(100%,1560px);padding-left:clamp(28px,4.6vw,88px);padding-right:clamp(28px,4.6vw,88px)}
}
.sb-head{display:flex;flex-direction:column;gap:clamp(6px,1.1vmin,12px);
  border-bottom:1px solid var(--sb-hair);padding-bottom:clamp(8px,1.4vmin,12px);min-width:0}
.sb-head-main{display:flex;align-items:baseline;justify-content:space-between;gap:8px 18px;
  flex-wrap:wrap;min-width:0;
  font-family:${MONO};font-size:clamp(8px,1.1vmin,10.5px);letter-spacing:.3em;text-transform:uppercase;
  color:var(--sb-mute)}
.sb-head-sub{display:flex;justify-content:flex-start;min-width:0;
  font-family:${MONO};font-size:clamp(7.5px,1vmin,9.5px);letter-spacing:.34em;
  text-transform:uppercase;color:var(--sb-mute-2);font-variant-numeric:tabular-nums}
.sb-head-l{display:flex;align-items:baseline;gap:clamp(8px,1.2vw,14px);color:var(--sb-bone-2);
  min-width:0;flex-wrap:wrap}
.sb-head-l b{font-family:${DISPLAY};font-weight:400;font-size:clamp(12px,1.7vmin,15px);
  letter-spacing:.3em;color:var(--sb-bone);white-space:nowrap}
.sb-head-l span{font-family:${SERIF};font-size:clamp(9.5px,1.3vmin,11px);letter-spacing:.22em;
  color:var(--sb-mute);white-space:nowrap}
.sb-head-r{display:flex;align-items:baseline;gap:clamp(8px,1.8vw,24px);flex-wrap:wrap;
  justify-content:flex-end;min-width:0;font-variant-numeric:tabular-nums;margin-left:auto}
.sb-when{white-space:nowrap}
@media (max-width:820px){
  .sb-head-l span{display:none}                   /* 窄屏先舍拉丁副标 */
}

/* 正文：竖排大字在左，注文在右；两列都能收缩，窗口变窄不会撑破。 */
.sb-stage{display:grid;grid-template-columns:minmax(0,.78fr) minmax(0,1.22fr);
  align-items:center;gap:clamp(16px,5vmin,96px);min-height:0;min-width:0;
  overflow:auto;overscroll-behavior:contain;padding-right:2px}
.sb-lockup{display:flex;flex-direction:column;align-items:center;gap:clamp(8px,2vmin,20px);
  justify-self:end;padding-right:clamp(0px,2vw,24px);min-width:0}
.sb-mandala{width:clamp(48px,9vmin,120px);height:clamp(48px,9vmin,120px);display:block;overflow:visible}
.sb-rot-slow{transform-origin:100px 100px;animation:sb-rot 150s linear infinite}
.sb-rot-rev{transform-origin:100px 100px;animation:sb-rot 80s linear infinite reverse}
@keyframes sb-rot{to{transform:rotate(360deg)}}

.sb-char{margin:0;font-family:${DISPLAY};font-weight:300;
  font-size:clamp(40px,11.5vmin,168px);line-height:1;letter-spacing:.1em;
  color:var(--sb-bone);display:flex;flex-direction:column;gap:0}
.sb-char span{display:block}
.sb-char i{font-style:normal;display:block;font-family:${MONO};font-size:clamp(7.5px,1vw,11px);
  letter-spacing:.5em;text-transform:uppercase;color:var(--sb-mute-2);margin:.6em 0 0 .4em;font-weight:400}
/* 印章：已从版式里撤掉（与小字「初」重复），这里不再保留样式。 */

/* 注文：拉丁小字、英文小字、五帧。 */
.sb-copy{display:flex;flex-direction:column;gap:clamp(6px,1.7vmin,18px);min-width:0;max-width:660px}
.sb-latin{margin:0;font-family:${SERIF};font-style:italic;font-size:clamp(15px,2.2vmin,30px);
  letter-spacing:.2em;color:var(--sb-bone);opacity:.95}
.sb-gloss{margin:0;font-family:${MONO};font-size:clamp(7.5px,1.1vmin,10px);letter-spacing:.32em;
  text-transform:uppercase;color:var(--sb-mute)}
.sb-quote{margin:0;font-family:${DISPLAY};font-size:clamp(10.5px,1.35vmin,15px);line-height:1.85;
  letter-spacing:.14em;color:var(--sb-bone-2);border-left:1px solid var(--sb-cinnabar);
  padding-left:clamp(10px,1.6vmin,18px);max-width:34em}

.sb-log{list-style:none;margin:2px 0 0;padding:0;display:flex;flex-direction:column;gap:clamp(2px,.6vmin,6px);
  font-family:${DISPLAY};font-size:clamp(10px,1.3vmin,13.5px);letter-spacing:.12em;min-width:0}
.sb-log li{display:grid;grid-template-columns:1.9em auto 1fr;gap:clamp(6px,1.2vmin,14px);
  align-items:baseline;color:var(--sb-mute-2);transition:color var(--sb-fade) linear;min-width:0}
.sb-log li[data-on="1"]{color:var(--sb-bone-2)}
.sb-log li i{font-style:normal;font-family:${MONO};font-size:clamp(7px,.9vmin,9px);letter-spacing:.14em;
  color:var(--sb-mute-2);transition:color var(--sb-fade) linear}
.sb-log li[data-on="1"] i{color:var(--sb-cinnabar)}
.sb-log li em{font-style:normal;font-family:${MONO};font-size:clamp(6.5px,.85vmin,8.5px);letter-spacing:.2em;
  text-transform:uppercase;color:var(--sb-mute-2);opacity:0;transition:opacity var(--sb-fade) linear;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sb-log li[data-on="1"] em{opacity:.8}
@media (max-width:760px){
  .sb-log li em{display:none}                     /* 窄屏只留汉字与序号 */
}

/* 进度：两条同心线，一条是底，一条是朱砂；只做 scaleX 过渡，不触发重排。 */
.sb-meter{display:flex;align-items:center;gap:clamp(8px,1.6vmin,16px);font-family:${MONO};
  font-size:clamp(7px,.95vmin,9px);letter-spacing:.28em;text-transform:uppercase;color:var(--sb-mute)}
.sb-bar{flex:1;height:1px;background:var(--sb-hair);position:relative;overflow:hidden;min-width:40px}
.sb-bar i{position:absolute;left:0;top:0;right:0;height:1px;background:var(--sb-cinnabar);
  transform-origin:0 50%;transform:scaleX(0);will-change:transform;
  transition:transform var(--sb-fade,620ms) cubic-bezier(.33,0,.2,1)}
.sb-count{font-variant-numeric:tabular-nums;color:var(--sb-bone-2);white-space:nowrap}

/* 交相：一条横线自两侧收拢，中间是那枚「启」印。 */
.sb-action{display:flex;align-items:center;gap:clamp(10px,2.6vmin,32px);
  margin-top:clamp(4px,1.4vmin,12px);animation:sb-up .8s cubic-bezier(.22,.9,.2,1) both;min-width:0}
.sb-tie{flex:1;height:1px;min-width:0;
  background:linear-gradient(90deg,transparent,var(--sb-hair) 30%,var(--sb-hair));
  transform-origin:right;animation:sb-tie 1.3s cubic-bezier(.22,.9,.2,1) both}
.sb-tie--r{background:linear-gradient(90deg,var(--sb-hair),var(--sb-hair) 70%,transparent);
  transform-origin:left;animation-name:sb-tie-r}
@keyframes sb-tie{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes sb-tie-r{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.sb-sealbtn{position:relative;flex:none;width:clamp(56px,9.5vmin,96px);height:clamp(56px,9.5vmin,96px);
  display:flex;align-items:center;justify-content:center;
  appearance:none;cursor:pointer;background:transparent;border:0;padding:0;color:var(--sb-cinnabar);
  transition:transform .5s cubic-bezier(.22,.9,.2,1),color .3s}
.sb-sealbtn::before,.sb-sealbtn::after{content:'';position:absolute;pointer-events:none;
  transition:inset .5s cubic-bezier(.22,.9,.2,1),border-color .35s,opacity .35s}
.sb-sealbtn::before{inset:14%;border:1.4px solid var(--sb-cinnabar)}
.sb-sealbtn::after{inset:0;border:1px solid var(--sb-hair);opacity:.9}
.sb-sealbtn .sb-ch{position:relative;font-family:${DISPLAY};font-size:clamp(20px,3.3vmin,36px);
  line-height:1;transition:transform .5s cubic-bezier(.22,.9,.2,1)}
.sb-sealbtn:hover,.sb-sealbtn:focus-visible{outline:none;transform:scale(1.05)}
.sb-sealbtn:hover::before,.sb-sealbtn:focus-visible::before{inset:6%;border-color:var(--sb-bone);opacity:.9}
.sb-sealbtn:hover::after,.sb-sealbtn:focus-visible::after{inset:-12%;border-color:var(--sb-cinnabar);opacity:.7}
.sb-sealbtn:hover .sb-ch,.sb-sealbtn:focus-visible .sb-ch{transform:scale(1.08)}
.sb-sealbtn:active{transform:scale(.99)}

/* 点下「启」时：一条朱砂流线沿方框**内侧**绕行一周，走完随即隐去。
   三点约束：
   · inset 取正值——线必须在框内，落在框外就成了「多余的红线」；
   · 用 animation 而非 transition——走完一圈要自己消失，不能停在终态；
   · 关键帧末段同时把 opacity 归零，避免按钮卸载前留下半截线。 */
.sb-ring{position:absolute;inset:2px;width:calc(100% - 4px);height:calc(100% - 4px);
  pointer-events:none;overflow:visible;opacity:0}
.sb-ring rect{fill:none;stroke:var(--sb-cinnabar);stroke-width:1.2;stroke-linecap:round;
  stroke-dasharray:1;stroke-dashoffset:1;vector-effect:non-scaling-stroke}
@keyframes sb-flow{
  0%{stroke-dashoffset:1;opacity:1}
  78%{stroke-dashoffset:0;opacity:1}
  100%{stroke-dashoffset:0;opacity:0}}
.sb-sealbtn[data-firing="1"] .sb-ring{opacity:1}
.sb-sealbtn[data-firing="1"] .sb-ring rect{
  animation:sb-flow .86s cubic-bezier(.35,.05,.25,1) forwards}

.sb-foot{display:flex;align-items:baseline;justify-content:flex-end;min-width:0;
  border-top:1px solid var(--sb-hair);padding-top:clamp(8px,1.6vmin,16px);
  font-family:${MONO};font-size:clamp(7.5px,.95vmin,9px);letter-spacing:.3em;
  text-transform:uppercase;color:var(--sb-mute-2);white-space:nowrap;overflow:hidden}
.sb-source{display:flex;align-items:baseline;gap:clamp(8px,1.2vw,12px);flex-wrap:wrap;min-width:0}
.sb-source b{font-family:${DISPLAY};font-size:clamp(10px,1.3vmin,12.5px);font-weight:400;
  letter-spacing:.24em;color:var(--sb-bone-2);white-space:nowrap}
.sb-source span{font-family:${MONO};font-size:clamp(7.5px,.95vmin,9px);letter-spacing:.3em;
  text-transform:uppercase;color:var(--sb-mute-2);white-space:nowrap}
@media (max-width:760px){
  .sb-source span{display:none}                   /* 窄屏只留中文出处 */
  .sb-source{border-left:0;padding-left:0}
}

/* 开机之后：气已行，字落下。 */
.sb-launch{display:flex;flex-direction:column;gap:clamp(8px,2.2vmin,24px);max-width:660px;min-width:0}
.sb-state{position:relative;display:grid;margin:0;font-family:${DISPLAY};font-weight:300;
  font-size:clamp(26px,5vmin,68px);line-height:1.08;letter-spacing:.14em;color:var(--sb-bone)}
/* 「启户」与「既济」叠在同一格，交叉淡入淡出，不做硬切。 */
.sb-state span{grid-area:1/1;transition:opacity .95s cubic-bezier(.4,0,.2,1),transform .95s cubic-bezier(.4,0,.2,1)}
.sb-state span[data-on="0"]{opacity:0;transform:translateY(10px)}
.sb-state span[data-on="1"]{opacity:1;transform:none}
.sb-state em{font-style:normal;color:var(--sb-cinnabar)}
.sb-begun{margin:0;font-family:${SERIF};font-style:italic;font-size:clamp(11px,1.6vmin,19px);
  letter-spacing:.18em;color:var(--sb-bone-2);animation:sb-up .8s cubic-bezier(.4,0,.2,1) both}
@keyframes sb-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}

@media (prefers-reduced-motion:reduce){
  .sb-rot-slow,.sb-rot-rev{animation:none}
  .sb-rule,.sb-state,.sb-begun,.sb-action,.sb-tie{animation:none}
}
@media (max-width:900px){
  .sb-stage{grid-template-columns:1fr;gap:clamp(12px,3vmin,22px);align-content:center}
  .sb-lockup{justify-self:center;flex-direction:row;align-items:flex-end;gap:clamp(12px,3vmin,24px);
    padding-right:0}
  .sb-mandala{display:none}
}
`;

    function Styles() {
      return h('style', { 'data-scifi-boot': '', dangerouslySetInnerHTML: { __html: CSS } });
    }

    /**
     * 进度原语：同一个 `pct`、同一个 `duration`，两种形态。
     *
     *   shape="arc"  —— SVG 圆环，用 strokeDashoffset 过渡（可动画，且不触发重排）
     *   shape="line" —— 横线，用 scaleX 过渡（合成层内插值）
     *
     * 两者都不在 JS 里逐帧计算、都不读 ref、都不改 state：
     * 只把目标值写成内联样式，插值完全交给 CSS。
     * 因此「圆环和小圈」「横线」「逐句变亮」三条线共享同一个节奏，
     * 不可能再出现某个进度跟不上的情况。
     */
    function usePct(value) {
      return Math.max(0, Math.min(1, value));
    }

    function Arc(props) {
      const pct = usePct(props.value);
      const r = props.r || 64;
      const c = 2 * Math.PI * r;
      // 两个与进度有关的属性都走 style：presentation attribute 的过渡在部分引擎里
      // 不会触发，写成 CSS 属性最稳。
      return h('circle', {
        cx: 100,
        cy: 100,
        r,
        fill: 'none',
        stroke: 'var(--sb-cinnabar)',
        strokeWidth: props.width || 1.4,
        transform: 'rotate(-90 100 100)',
        style: {
          strokeDasharray: `${c}`,
          strokeDashoffset: `${c * (1 - pct)}`,
          transition: `stroke-dashoffset ${props.duration}ms ${EASE}`,
        },
      });
    }

    function Line(props) {
      const pct = usePct(props.value);
      return h(
        'div',
        { className: 'sb-bar' },
        h('i', {
          style: {
            transform: `scaleX(${pct})`,
            transitionDuration: `${props.duration}ms`,
            transitionTimingFunction: EASE,
          },
        }),
      );
    }

    /** 朱印旁的圆环：三圈静态细线 + 一段由 Arc 驱动的朱砂弧。 */
    function Mandala(props) {
      return h(
        'svg',
        { className: 'sb-mandala', viewBox: '0 0 200 200', style: { color: 'var(--sb-mute-2)' }, 'aria-hidden': true },
        h('circle', { cx: 100, cy: 100, r: 94, fill: 'none', stroke: 'currentColor', strokeOpacity: 0.22, strokeWidth: 0.8 }),
        h(
          'g',
          { className: 'sb-rot-slow' },
          h('circle', { cx: 100, cy: 100, r: 86, fill: 'none', stroke: 'currentColor', strokeOpacity: 0.34, strokeWidth: 0.9, strokeDasharray: '1 9' }),
        ),
        h(
          'g',
          { className: 'sb-rot-rev' },
          h('circle', { cx: 100, cy: 100, r: 74, fill: 'none', stroke: 'var(--sb-bone-2)', strokeOpacity: 0.26, strokeWidth: 0.9, strokeDasharray: '62 400' }),
        ),
        h('circle', { cx: 100, cy: 100, r: 50, fill: 'none', stroke: 'currentColor', strokeOpacity: 0.12, strokeWidth: 0.8 }),
        h(Arc, { value: props.value, duration: props.duration, r: 64, width: 1.4 }),
        h('circle', {
          cx: 100,
          cy: 100,
          r: props.pulse ? 3.2 : 2.2,
          fill: 'var(--sb-cinnabar)',
          style: { transition: `r 800ms ${EASE}` },
        }),
      );
    }

    /** 横线进度：数值只写一次内联样式，其余交给 CSS。 */
    function Meter(props) {
      return h(
        'div',
        { className: 'sb-meter' },
        h('span', null, props.label),
        h(Line, { value: props.value, duration: props.duration }),
        h('span', { className: 'sb-count' }, props.text),
      );
    }

    /**
     * 交相：两侧的横线先到，中间的「启」印后到；悬停时两框向内合。
     * 点下之后 `firing` 置真，方框内侧会亮起一条朱砂流线绕行一周。
     */
    function Actions(props) {
      const { verbs, ready, firing, onEnter, goRef } = props;
      return h(
        'div',
        { className: 'sb-action' },
        h('i', { className: 'sb-tie', 'aria-hidden': true }),
        ready
          ? h(
              'button',
              {
                type: 'button',
                className: 'sb-sealbtn',
                ref: goRef,
                onClick: onEnter,
                autoFocus: true,
                title: verbs.enter,
                'aria-label': verbs.enter,
                'data-firing': firing ? '1' : '0',
              },
              h(
                'svg',
                { className: 'sb-ring', viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': true },
                h('rect', { x: 1, y: 1, width: 98, height: 98, pathLength: 1, rx: 1 }),
              ),
              h('span', { className: 'sb-ch', 'aria-hidden': true }, verbs.enter),
            )
          : null,
        h('i', { className: 'sb-tie sb-tie--r', 'aria-hidden': true }),
      );
    }

    function BootSequence(props) {
      const { verbs } = props;
      const [phase, setPhase] = React.useState('boot');
      const [step, setStep] = React.useState(0);
      const [firing, setFiring] = React.useState(false);
      const [leaving, setLeaving] = React.useState(false);
      const [clock, setClock] = React.useState(clockText);
      const timers = React.useRef([]);
      const goRef = React.useRef(null);
      const rootRef = React.useRef(null);

      const later = React.useCallback((ms, fn) => {
        const id = setTimeout(fn, ms);
        timers.current.push(id);
        return id;
      }, []);

      React.useEffect(
        () => () => {
          timers.current.forEach(clearTimeout);
          timers.current = [];
        },
        [],
      );

      React.useEffect(() => {
        const id = setInterval(() => setClock(clockText()), 1000);
        return () => clearInterval(id);
      }, []);

      // 跟随宿主主题：浅色纸面用另一套墨色。
      React.useEffect(() => {
        const root = rootRef.current;
        if (!root) return undefined;
        const id = setTimeout(() => {
          try {
            const bg = getComputedStyle(root).backgroundColor || '';
            const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (!m) return;
            const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
            const light = (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
            root.setAttribute('data-theme', light ? 'light' : 'dark');
          } catch {
            root.setAttribute('data-theme', 'dark');
          }
        }, 0);
        return () => clearTimeout(id);
      }, []);

      // 浮层接管期间锁住滚动。
      React.useEffect(() => {
        const body = document.body;
        if (!body || !body.style) return undefined;
        const prev = body.style.overflow;
        body.style.overflow = 'hidden';
        return () => {
          body.style.overflow = prev;
        };
      }, []);

      const bootLines = props.bootLines;
      React.useEffect(() => {
        if (phase !== 'boot') return undefined;
        if (step >= bootLines.length) {
          const id = later(RHYTHM.boot.step, () => setPhase('ready'));
          return () => clearTimeout(id);
        }
        const id = later(RHYTHM.boot.step, () =>
          setStep((n) => Math.min(n + 1, bootLines.length)),
        );
        return () => clearTimeout(id);
      }, [phase, step, bootLines.length, later]);

      React.useEffect(() => {
        if (phase !== 'ready' || !goRef.current) return undefined;
        const id = setTimeout(() => {
          if (goRef.current) goRef.current.focus({ preventScroll: true });
        }, 140);
        return () => clearTimeout(id);
      }, [phase]);

      const close = React.useCallback(() => {
        try {
          window.sessionStorage.setItem(SEEN_KEY, '1');
        } catch {
          /* storage may be unavailable; closing still works */
        }
        setLeaving(true);
        later(900, () => props.onClose());
      }, [later, props]);

      const start = React.useCallback(() => {
        if (phase === 'launch' || phase === 'fade') return;
        if (phase === 'boot') {
          setStep(bootLines.length);
          setPhase('ready');
          return;
        }
        // 点下之后先让方框内那条流线绕行一周（780ms），再进入第二段。
        // 若立刻切场，按钮会被卸载，流线也就看不见了。
        setFiring(true);
        later(760, () => {
          // 关键：进入 launch 必须把步数归零。
          // 否则 step 还停在开机结束时的帧数，launchCount 一直是满值，
          // 第二段进度条一上屏就是满的、五行全部点亮——这是之前「崩溃」的根因。
          setStep(0);
          setPhase('launch');
          const total = props.launchLines.length;
          for (let i = 0; i < total; i += 1) {
            later(LAUNCH_START + i * RHYTHM.launch.step, () => setStep(i + 1));
          }
          later(LAUNCH_START + total * RHYTHM.launch.step + 1400, close);
        });
      }, [phase, bootLines.length, props.launchLines.length, later, close]);

      const skip = React.useCallback(() => close(), [close]);

      React.useEffect(() => {
        const onKey = (event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            skip();
            return;
          }
          const onControl =
            event.target && event.target.tagName && /^(BUTTON|INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName);
          if (onControl) return;
          if ((event.key === 'Enter' || event.key === ' ') && phase === 'boot') {
            event.preventDefault();
            start();
          }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
      }, [phase, start, skip]);

      // 关闭之后把焦点还给原来的元素。
      React.useEffect(() => {
        const before = document.activeElement;
        return () => {
          if (before && typeof before.focus === 'function') {
            try {
              before.focus({ preventScroll: true });
            } catch {
              /* ignore */
            }
          }
        };
      }, []);

      const inLaunch = phase === 'launch' || phase === 'fade';
      const bootCount = Math.min(step, bootLines.length);
      const launchCount = Math.min(step, props.launchLines.length);
      const finished = inLaunch && launchCount >= props.launchLines.length;

      // 一处求出进度，圆环、横线、百分比三处共用同一个数。
      const pct = inLaunch
        ? progressOf('launch', launchCount, props.launchLines.length)
        : progressOf('boot', bootCount, bootLines.length);
      const duration = inLaunch ? RHYTHM.launch.step : RHYTHM.boot.step;

      const body = inLaunch
        ? h(
            'div',
            { className: 'sb-launch' },
            h('div', { className: 'sb-gloss' }, '氣行 · the breath moves'),
            h(
              'p',
              { className: 'sb-state', 'aria-live': 'polite' },
              // 两个状态叠在同一格交叉淡变：不做硬切。
              h('span', { 'data-on': finished ? '0' : '1' }, '启户'),
              h('span', { 'data-on': finished ? '1' : '0' }, h('em', null, '既济')),
            ),
            h(
              'ul',
              { className: 'sb-log' },
              props.launchLines.map((line, i) =>
                h(
                  'li',
                  { key: line[1], 'data-on': i < launchCount ? '1' : '0' },
                  h('i', null, line[1]),
                  h('span', null, line[0]),
                  h('em', null, line[2]),
                ),
              ),
            ),
            h(Meter, {
              label: 'Formatur',
              value: pct,
              duration,
              text: `${String(launchCount).padStart(2, '0')} / ${String(props.launchLines.length).padStart(2, '0')}`,
            }),
            finished ? h('p', { className: 'sb-begun' }, 'Ex nihilo, primordium.') : null,
          )
        : h(
            'div',
            { className: 'sb-copy' },
            h('p', { className: 'sb-latin' }, 'Primordium'),
            h('p', { className: 'sb-gloss' }, 'the first beginning · 氣之始'),
            h(
              'p',
              { className: 'sb-quote' },
              '太易者，未见气也；太初者，气之始也；太始者，形之始也；太素者，质之始也。',
            ),
            h(
              'ul',
              { className: 'sb-log' },
              bootLines.map((line, i) =>
                h(
                  'li',
                  { key: line[1], 'data-on': i < bootCount ? '1' : '0' },
                  h('i', null, line[1]),
                  h('span', null, line[0]),
                  h('em', null, line[2]),
                ),
              ),
            ),
            h(Meter, {
              label: 'Ordo',
              value: pct,
              duration,
              text: `${Math.round(pct * 100)}%`,
            }),
            h(Actions, { verbs, ready: phase === 'ready', firing, onEnter: start, goRef }),
          );

      return h(
        'div',
        {
          className: 'sb-root',
          'data-phase': phase,
          'data-leaving': leaving ? '1' : '0',
          ref: rootRef,
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': '太初 · Primordium',
          style: { '--sb-fade': `${duration}ms` },
        },
        h(Styles),
        h('div', { className: 'sb-ground' }),
        h('div', { className: 'sb-grain' }),
        h('div', { className: 'sb-vignette' }),
        h(
          'div',
          { className: 'sb-frame' },
          h(
            'header',
            { className: 'sb-head' },
            h(
              'div',
              { className: 'sb-head-main' },
              h(
                'div',
                { className: 'sb-head-l' },
                h('b', null, '太初'),
                h('span', null, 'PRIMORDIUM'),
              ),
            ),
            h('div', { className: 'sb-head-sub' }, h('span', { className: 'sb-when' }, clock)),
          ),
          h(
            'main',
            { className: 'sb-stage' },
            h(
              'div',
              { className: 'sb-lockup' },
              h(Mandala, { value: pct, duration, pulse: phase === 'ready' }),
              h(
                'h1',
                { className: 'sb-char' },
                h('span', null, '太'),
                h('span', null, '初'),
                h('i', null, 'TAI CHU'),
              ),
            ),
            body,
          ),
          h(
            'footer',
            { className: 'sb-foot' },
            h('span', null, '列子 · 天瑞 · LIEZI'),
          ),
        ),
      );
    }

    /** 承载浮层，并记住「这一次浏览已经播过」。 */
    function BootHost(props) {
      const { ctx } = props;
      const [run, setRun] = React.useState(0);
      const [visible, setVisible] = React.useState(() => props.auto !== false);
      const [lang, setLang] = React.useState('zh');

      React.useEffect(() => {
        let alive = true;
        const read = () => {
          if (!alive) return;
          let zh = true;
          try {
            zh = isZh(ctx.locale.getSnapshot());
          } catch {
            zh = true;
          }
          setLang(zh ? 'zh' : 'en');
        };
        read();
        let stop = () => {};
        try {
          stop = ctx.locale.subscribe(read) || stop;
        } catch {
          /* locale is optional; verbs fall back to Chinese */
        }
        return () => {
          alive = false;
          stop();
        };
      }, [ctx]);

      React.useEffect(() => {
        const onReplay = () => {
          setRun((n) => n + 1);
          setVisible(true);
        };
        window.addEventListener(REPLAY_EVENT, onReplay);
        return () => window.removeEventListener(REPLAY_EVENT, onReplay);
      }, []);

      if (!visible) return null;
      return h(BootSequence, {
        key: `boot-${run}`,
        verbs: COPY[lang] || COPY.zh,
        bootLines: BOOT_LINES,
        launchLines: LAUNCH_LINES,
        onClose: () => setVisible(false),
      });
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const markSeen = () => {
          try {
            window.sessionStorage.setItem(SEEN_KEY, '1');
          } catch {
            /* ignore */
          }
        };

        let seen = false;
        try {
          seen = window.sessionStorage.getItem(SEEN_KEY) === '1';
        } catch {
          seen = false;
        }

        // 「初」小印紧挨模型名。字号小，必须加重字重、加深墨色、去掉半透明，
        // 否则宋体细笔画在 11px 下会糊成一片。
        ctx.effect(() => {
          const el = document.createElement('style');
          el.setAttribute('data-scifi-boot-chop', '');
          el.textContent = `
.sb-chop{
  display:inline-flex;align-items:center;justify-content:center;
  width:22px;height:22px;padding:0;margin-left:2px;border-radius:6px;box-sizing:border-box;
  background:transparent;border:1.4px solid #A63A2E;color:#A63A2E;
  font-family:"Songti SC","STSong","SimSun",serif;
  font-size:13px;font-weight:700;line-height:1;
  -webkit-font-smoothing:antialiased;text-rendering:geometricPrecision;
  cursor:pointer;transform:rotate(-4deg);
  transition:transform .3s cubic-bezier(.2,1.6,.35,1),
             background .2s ease,color .2s ease,border-color .2s ease}
.sb-chop:hover,.sb-chop:focus-visible{
  background:#A63A2E;color:#F6F1E7;border-color:#A63A2E;outline:none;
  transform:rotate(0deg) scale(1.1)}
.sb-chop:active{transform:rotate(0deg) scale(.94)}`;
          document.head.appendChild(el);
          return () => el.remove();
        });

        // 全帧浮层：开机这一刻由它独占。
        ctx.slots.register(
          { name: 'shell.overlay', id: 'scifi-boot.overlay', order: -1000 },
          (props) => h(BootHost, { ...props, ctx, auto: !seen }),
        );

        // 模型名右侧的紧凑位：与模型选择器同一行，不占任何操作位。
        ctx.slots.register(
          { name: 'conversation.input.activity' },
          () => {
            let zh = true;
            try {
              zh = isZh(ctx.locale.getSnapshot());
            } catch {
              zh = true;
            }
            return h(
              'button',
              {
                type: 'button',
                className: 'sb-chop',
                onClick: () => {
                  markSeen();
                  window.dispatchEvent(new CustomEvent(REPLAY_EVENT));
                },
                title: zh ? '重播「太初」' : 'Replay Taichu',
                'aria-label': zh ? '重播「太初」' : 'Replay Taichu',
              },
              h('span', { 'aria-hidden': true }, zh ? '初' : 'T'),
            );
          },
        );
      },
    };
  },
});
