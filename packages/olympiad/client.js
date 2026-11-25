/* Browser half of Olympiad: a curated offline set plus the full local corpus when
   the Host route is available, with KaTeX-rendered solutions. */
window.__ModuleLoader__.load({
  id: '@local/olympiad',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useEffect, useRef, useState } = React;

    const API = '/api/olympiad';
    const UI_KEY = 'olympiad.ui.v1';
    const CATEGORIES = ['All', 'Number Theory', 'Algebra', 'Geometry', 'Combinatorics', 'Applied', 'Calculus', 'Other'];
    const LEVELS = [
      { key: 'all', label: 'All' },
      { key: 'featured', label: 'Featured' },
      { key: 'hard', label: 'Hard 8+' },
      { key: 'medium', label: '5–7' },
    ];

    /* Curated problems are always present, so the window shows a problem even
       before the corpus request finishes (or if it fails). */
    const FEATURED = [{"id":"imo-1988-p6","source":"IMO 1988 · Problem 6","category":"Number Theory","difficulty":5,"statement":["设 a、b 为正整数，且 ab+1 整除 a²+b²。","证明：商 (a²+b²)/(ab+1) 是一个完全平方数。"],"hint":"设商为 k，固定 k，取 a+b 最小的一组解，然后对 a 用韦达定理。","solution":["反证。设存在正整数 a、b，使 k=(a²+b²)/(ab+1) 为整数但不是完全平方数。在所有这样的 (a,b,k) 中，固定 k，取 a+b 最小的一组解，并不妨设 a≥b。","把定义式改写为关于 a 的二次方程：a² − kba + (b²−k)=0。它的另一个根为 a' = kb − a，且由韦达定理 aa' = b² − k。由于 k、a、b 都是整数，a' 是整数。","若 a'=0，则 b²=k，k 为完全平方数，与假设矛盾。因此 a'≠0。","若 a'>0，则 (a',b) 也满足同一 k 的定义式，且 a'+b < a+b：因为 k>0 给出 b²−k < b² ≤ a²，所以 a'=(b²−k)/a < a。这与 a+b 的最小性矛盾。","若 a'<0，则整数 a'≤−1，由 aa'=b²−k 得 k=b²−aa' ≥ b²+a。另一方面，由 k(ab+1)=a²+b² 可得 (b²+a)(ab+1) ≤ a²+b²；但 (b²+a)(ab+1) − (a²+b²) = a(b³+ab+1−a) = a(b³+a(b−1)+1) > 0（因 a≥b≥1），矛盾。","所以只能 a'=0，从而 k=b² 是完全平方数，与“k 不是平方数”的假设矛盾。故 k 必为完全平方数。"],"featured":true,"level":10,"stars":5,"answer":""},{"id":"imo-1994-p1","source":"IMO 1994 · Problem 1","category":"Number Theory","difficulty":3,"statement":["设 m、n 为正整数。","证明：2^m+1 能被 2^n+1 整除，当且仅当 m 是 n 的奇数倍。"],"hint":"先看 2^n+1 作模数时 2 的阶；再用 x^{2t+1}+1 的因式分解。","solution":["若 m=(2t+1)n，其中 t 为非负整数，则 2^m+1=(2^n)^{2t+1}+1。由 x^{2t+1}+1 可被 x+1 整除（令 x=2^n），知 2^n+1 整除 2^m+1。","反之，设 d=2^n+1 整除 2^m+1。先确定 2 模 d 的阶。由 2^n≡−1 (mod d) 得 2^{2n}≡1 (mod d)，所以阶 e 整除 2n，但 e 不整除 n。","若 0<j<n，则 0<2^j−1<d，故 d 不整除 2^j−1；若 n<j<2n，且 d | 2^j−1，则 2^{j−n}≡−1 (mod d)，即 d | 2^{j−n}+1，但 0<2^{j−n}+1≤2^{n−1}+1<d，矛盾。因此阶恰为 2n。","由 d | 2^m+1 得 2^m≡−1 (mod d)，所以 2^{2m}≡1 (mod d)，从而 2n | 2m，即 n | m。又 2^m≠1 (mod d)，故阶 2n 不整除 m，即 2n ∤ m。","n | m 而 2n ∤ m，说明 m/n 是奇数。证毕。"],"featured":true,"level":6,"stars":3,"answer":""},{"id":"imo-2005-p4","source":"IMO 2005 · Problem 4","category":"Number Theory","difficulty":3,"statement":["考虑数列 a_n = 2^n + 3^n + 6^n − 1（n=1,2,3,…）。","求所有与数列中每一项都互素的正整数。"],"hint":"证明每个素数都能整除某一项；p≥5 时取 n=p−2，用费马小定理。","solution":["答案只有 1。显然 1 与所有项互素。下面证明任何素数 p 都整除某一项 a_n；这样任何大于 1 的正整数都有素因子 p，从而不可能与所有项互素。","p=2 时，a_1=2+3+6−1=10，被 2 整除。","p=3 时，a_2=4+9+36−1=48，被 3 整除。","p≥5 时，由费马小定理，2^{p−1}≡3^{p−1}≡6^{p−1}≡1 (mod p)。取 n=p−2，则 2^{p−2}≡1/2、3^{p−2}≡1/3、6^{p−2}≡1/6 (mod p)。于是 a_{p−2} ≡ 1/2+1/3+1/6−1 = 0 (mod p)。","所以每个素数都整除数列中的某一项，满足条件的正整数只能是 1。"],"featured":true,"level":6,"stars":3,"answer":""},{"id":"imo-2013-p1","source":"IMO 2013 · Problem 1","category":"Number Theory","difficulty":2,"statement":["证明：对任意正整数 n，都存在 n 个连续的正整数，其中没有一个是一个素数的整数次幂。"],"hint":"取 2n 个两两不同的素数，用中国剩余定理让每个数被两个不同素数整除。","solution":["取 2n 个两两不同的素数 p_1,q_1,p_2,q_2,…,p_n,q_n。由中国剩余定理，同余方程组 x+i ≡ 0 (mod p_i)，x+i ≡ 0 (mod q_i)（i=1,2,…,n）有整数解；把解加上若干个模数乘积的倍数，可令 x>0。","于是对每个 i，x+i 同时被两个不同的素数 p_i 和 q_i 整除。若 x+i 是某个素数的幂，则它只能有一个素因子，与它至少有两个不同素因子矛盾。","因此 x+1, x+2, …, x+n 是 n 个连续正整数，且没有一个是一个素数的整数次幂。"],"featured":true,"level":4,"stars":2,"answer":""},{"id":"imo-2014-p1","source":"IMO 2014 · Problem 1","category":"Algebra","difficulty":4,"statement":["设 a_0 < a_1 < a_2 < … 是正整数的无穷序列。","证明：存在唯一的整数 n≥1，使得","a_n < (a_0+a_1+…+a_n)/n ≤ a_{n+1}。"],"hint":"把两个不等式分别改写成 L_n>0 与 L_{n+1}≤0，证明 L_n 严格递减并最终为负。","solution":["记 S_n=a_0+a_1+…+a_n，并对 n≥1 定义 L_n = S_{n−1} − (n−1)a_n。","注意 S_n/n > a_n ⇔ S_n−n a_n>0 ⇔ S_{n−1}−(n−1)a_n>0，即 L_n>0；而 S_n/n ≤ a_{n+1} ⇔ S_n−n a_{n+1}≤0，即 L_{n+1}≤0。所以题目要求的是唯一的 n 满足 L_n>0 且 L_{n+1}≤0。","先看单调性：L_{n+1} − L_n = [S_n−n a_{n+1}] − [S_{n−1}−(n−1)a_n] = a_n − n a_{n+1} + (n−1)a_n = −n(a_{n+1}−a_n) < 0。故 L_1,L_2,… 严格递减。","又 L_1 = a_0 > 0；而由递推 L_n = L_1 − Σ_{k=1}^{n−1} k(a_{k+1}−a_k)，且 a_{k+1}−a_k≥1，得 L_n ≤ a_0 − Σ_{k=1}^{n−1} k = a_0 − n(n−1)/2，故 n 足够大时 L_n<0。","严格递减的整数序列从正变负，恰好穿过一次零，因此存在唯一的 n 使 L_n>0≥L_{n+1}，即题目中的区间条件成立。"],"featured":true,"level":8,"stars":4,"answer":""},{"id":"imo-2000-p2","source":"IMO 2000 · Problem 2","category":"Algebra","difficulty":4,"statement":["设 a,b,c 为正实数，且 abc=1。","证明：(a−1+1/b)(b−1+1/c)(c−1+1/a) ≤ 1。"],"hint":"令 a=x/y，b=y/z，c=z/x，把三个因式化成关于 x,y,z 的线性式。","solution":["由 abc=1，可设 a=x/y，b=y/z，c=z/x，其中 x,y,z>0。于是","a−1+1/b = x/y − 1 + z/y = (x−y+z)/y，","b−1+1/c = (y−z+x)/z，c−1+1/a = (z−x+y)/x。","三式相乘得 P = (x−y+z)(y−z+x)(z−x+y)/(xyz)。","若其中一个因式 ≤0，由于三个因式之和为 x+y+z>0，不可能有两个同时为负，所以 P≤0≤1，不等式成立。","若三个因式都为正，令 p=x−y+z，q=y−z+x，r=z−x+y，则 p,q,r>0，且 x=(q+r)/2，y=(r+p)/2，z=(p+q)/2。于是 P = 8pqr/((q+r)(r+p)(p+q))。","由 AM-GM，q+r≥2√(qr)，r+p≥2√(rp)，p+q≥2√(pq)，三式相乘得 (q+r)(r+p)(p+q) ≥ 8pqr，故 P≤1。等号成立当且仅当 x=y=z，即 a=b=c=1。"],"featured":true,"level":8,"stars":4,"answer":""},{"id":"imo-2001-p2","source":"IMO 2001 · Problem 2","category":"Algebra","difficulty":5,"statement":["设 a,b,c 为正实数。证明：","a/√(a²+8bc) + b/√(b²+8ca) + c/√(c²+8ab) ≥ 1。"],"hint":"先用柯西不等式把和转化为 (Σa)²/Σa√(a²+8bc)，再证明 Σa√(a²+8bc) ≤ (Σa)²。","solution":["记 S=Σ a/√(a²+8bc)。由柯西不等式，S·Σ a√(a²+8bc) ≥ (a+b+c)²，因此只需证明 Σ a√(a²+8bc) ≤ (a+b+c)²。","再次用柯西不等式：(Σ a√(a²+8bc))² ≤ (a+b+c)·Σ a(a²+8bc)。而 Σ a(a²+8bc) = a³+b³+c³+24abc。","于是只需证 (a+b+c)(a³+b³+c³+24abc) ≤ (a+b+c)⁴，等价于 a³+b³+c³+24abc ≤ (a+b+c)³。","展开 (a+b+c)³ = a³+b³+c³ + 3(a²b+a²c+b²a+b²c+c²a+c²b) + 6abc，所以只需 3Σ_sym a²b ≥ 18abc，即 Σ_sym a²b ≥ 6abc。由 AM-GM，六个正项 a²b,a²c,b²a,b²c,c²a,c²b 的乘积为 (abc)⁶，故它们的和不小于 6abc。","从而 Σ a√(a²+8bc) ≤ (a+b+c)²，代回柯西不等式得 S ≥ (a+b+c)²/(a+b+c)² = 1。等号当且仅当 a=b=c。"],"featured":true,"level":10,"stars":5,"answer":""},{"id":"imo-2019-p1","source":"IMO 2019 · Problem 1","category":"Algebra","difficulty":4,"statement":["求所有函数 f: Z→Z，使得对任意整数 a,b，都有","f(2a) + 2f(b) = f(f(a+b))。"],"hint":"先令 a=0、b=0 得到 f(f(x)) 与 f(2x) 的关系，再证明 f(x)−c 是可加函数。","solution":["记 c=f(0)。令 a=0 得 c+2f(b)=f(f(b))；令 b=0 得 f(2a)+2c=f(f(a))。两式在 a=b 时给出 f(2a)+2c=c+2f(a)，即 f(2a)=2f(a)−c。","由第一式又有 f(f(b))=2f(b)+c。把 f(2a)=2f(a)−c 代入原方程：2f(a)−c+2f(b)=f(f(a+b))=2f(a+b)+c，整理得 f(a+b)=f(a)+f(b)−c。","令 g(n)=f(n)−c，则 g(a+b)=g(a)+g(b)，即 g 是 Z 上的可加函数，故 g(n)=kn（k=g(1) 为整数）。于是 f(n)=kn+c。","代回 f(f(b))=2f(b)+c：左边 = k(kb+c)+c = k²b+kc+c，右边 = 2kb+3c。比较系数得 k²=2k，即 k=0 或 k=2；常数项给 c(k−2)=0。","若 k=0，则 c=0，得 f≡0；若 k=2，则 c 任意，得 f(n)=2n+c。两种情形直接代入原方程均成立。","所以全部解为 f(n)≡0 与 f(n)=2n+c（c 为任意整数）。"],"featured":true,"level":8,"stars":4,"answer":""},{"id":"imo-1998-p2","source":"IMO 1998 · Problem 2","category":"Combinatorics","difficulty":3,"statement":["某次竞赛有 a 名选手和 b 名评委，其中 b≥3 是奇数。每位评委对每位选手给出“通过”或“不通过”。已知任意两位评委至多有 k 名选手的评定相同。","证明：k/a ≥ (b−1)/(2b)。"],"hint":"对每个选手数“两位评委都通过”与“两位评委都不通过”的评委对数，再对所有选手求和。","solution":["对第 i 名选手，设 r_i 位评委给通过，则 b−r_i 位给不通过。任取两位评委，他们在这名选手上评定相同的对数等于 C(r_i,2)+C(b−r_i,2)。","对所有选手求和，得到“评委对—选手”的相同评定总数 A = Σ_{i=1}^{a} [C(r_i,2)+C(b−r_i,2)]。由题设，每个评委对至多贡献 k 个相同评定，所以 A ≤ k·C(b,2)。","因为 b 是奇数，写 b=2m+1。对任意整数 r，C(r,2)+C(b−r,2) 在 r=m 或 m+1 时取最小值 C(m,2)+C(m+1,2)=m²=(b−1)²/4。因此 A ≥ a(b−1)²/4。","于是 a(b−1)²/4 ≤ k·b(b−1)/2，两边约去 (b−1)/2（b≥3），得 k/a ≥ (b−1)/(2b)。证毕。"],"featured":true,"level":6,"stars":3,"answer":""}];
    const FALLBACK = {
      meta: { count: FEATURED.length, featured: FEATURED.length, fallback: true },
      problems: FEATURED,
    };

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    let katexPromise = null;
    function loadKatex() {
      if (window.katex) return Promise.resolve(true);
      if (katexPromise) return katexPromise;
      katexPromise = new Promise((resolve) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = API + '/assets/katex.min.css';
        document.head.appendChild(link);
        const script = document.createElement('script');
        script.src = API + '/assets/katex.min.js';
        script.async = true;
        script.onload = () => resolve(Boolean(window.katex));
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
      });
      return katexPromise;
    }

    function escapeHtml(text) {
      return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function cleanExpr(expr) {
      return expr
        .replace(/^\$\$|\$\$$/g, '')
        .replace(/^\$\$?|\$\$?$/g, '')
        .replace(/^\\\[|\\\]$/g, '')
        .replace(/^\\\(|\\\)$/g, '')
        .replace(/\\boxed\{([^{}]*)\}/g, '$1')
        .trim();
    }

    const KATEX_MACROS = {
      '\\equal': '=',
      '\\plus': '+',
      '\\minus': '-',
    };

    /* Omni-MATH carries some AoPS BBCode and Asymptote source. Strip the parts
       KaTeX cannot render, but keep triangle/area notation such as [ABC]. */
    function normalizeMarkup(text) {
      return String(text || '')
        .replace(/\[asy\][\s\S]*?\[\/asy\]/gi, '')
        .replace(/\[list(?:=[^\]]*)?\]([\s\S]*?)\[\/list\]/gi, (_, body) => body.replace(/\[\*\]/g, '\n• '))
        .replace(/\[\*\]/g, '• ')
        .replace(/\[url[^\]]*\]([\s\S]*?)\[\/url\]/gi, '$1')
        .replace(/\[quote[^\]]*\]([\s\S]*?)\[\/quote\]/gi, '$1')
        .replace(/\[color[^\]]*\]|\[\/color\]/gi, '')
        .replace(/\[size[^\]]*\]|\[\/size\]/gi, '')
        .replace(/\[\/?(?:b|i|u|hide|center|left|right|code|font)\]/gi, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    function renderMath(expr, display) {
      const source = cleanExpr(expr);
      if (!source) return '';
      if (!window.katex) return escapeHtml(source);
      try {
        return window.katex.renderToString(source, {
          displayMode: display,
          throwOnError: false,
          strict: false,
          trust: false,
          macros: KATEX_MACROS,
        });
      } catch {
        return escapeHtml(source);
      }
    }

    const MATH_RE = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\begin\{(align\*?|aligned|gather\*?|cases|array|matrix|pmatrix|bmatrix|vmatrix|split)\}[\s\S]*?\\end\{\2\}|\$[^$\n]*?\$|\\\([\s\S]*?\\\))/g;
    const DISPLAY_RE = /(\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|\\begin\{(align\*?|aligned|gather\*?|cases|array|matrix|pmatrix|bmatrix|vmatrix|split)\}[\s\S]*?\\end\{\2\})/g;

    function MathText({ text }) {
      const source = normalizeMarkup(text);
      const parts = [];
      let last = 0;
      let match;
      let key = 0;
      MATH_RE.lastIndex = 0;
      while ((match = MATH_RE.exec(source)) !== null) {
        if (match.index > last) parts.push(escapeHtml(source.slice(last, match.index)));
        const display = match[0].startsWith('$$') || match[0].startsWith('\\[') || match[0].startsWith('\\begin');
        parts.push(h('span', {
          key: 'math-' + key++,
          className: display ? 'om-mathblock' : 'om-math',
          dangerouslySetInnerHTML: { __html: renderMath(match[0], display) },
        }));
        last = match.index + match[0].length;
      }
      if (last < source.length) parts.push(escapeHtml(source.slice(last)));
      return h('span', null, parts);
    }

    function MathLines({ text, className }) {
      /* Display math may span newlines; collapse only inside those blocks so
         the per-line renderer still gets one complete \[...\], $$...$$ or
         LaTeX environment span. */
      const source = normalizeMarkup(text)
        .replace(DISPLAY_RE, (block) => block.replace(/\n+/g, ' '));
      const lines = source.split('\n');
      return h('div', { className: className || 'om-lines' },
        lines.map((line, index) => (line.trim()
          ? h('p', { className: 'om-line', key: index }, h(MathText, { text: line }))
          : h('div', { className: 'om-gap', key: index }))));
    }

    function poolOf(problems, category, level) {
      return problems.filter((problem) => {
        if (category !== 'All' && problem.category !== category) return false;
        if (level === 'featured') return Boolean(problem.featured);
        if (level === 'hard') return problem.level >= 8;
        if (level === 'medium') return problem.level >= 5 && problem.level < 8;
        return true;
      });
    }

    function pickRandom(pool, excludeId) {
      const rest = pool.filter((problem) => problem.id !== excludeId);
      const source = rest.length ? rest : pool;
      if (!source.length) return null;
      return source[Math.floor(Math.random() * source.length)];
    }

    /* ------------------------------------------------------------------ theme */

    function luminanceOf(color) {
      const parts = String(color).match(/[\d.]+/g);
      if (!parts || parts.length < 3) return null;
      const [r, g, b] = parts.map(Number);
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    }

    function detectThemeMode() {
      try {
        const anchor = document.querySelector('.om-win') || document.body;
        if (!anchor) return 'light';
        const probe = document.createElement('div');
        probe.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:1px;background-color:var(--dsw-alias-bg-base,transparent)';
        anchor.appendChild(probe);
        const value = getComputedStyle(probe).backgroundColor;
        probe.remove();
        const luminance = luminanceOf(value);
        if (luminance !== null && !/rgba?\(.*,\s*0\)$/.test(value)) return luminance < 0.5 ? 'dark' : 'light';
        const bodyBackground = document.body ? getComputedStyle(document.body).backgroundColor : '';
        const bodyLuminance = luminanceOf(bodyBackground);
        if (bodyLuminance !== null && !/rgba?\(.*,\s*0\)$/.test(bodyBackground)) return bodyLuminance < 0.5 ? 'dark' : 'light';
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } catch {
        return 'light';
      }
    }

    function useThemeMode() {
      const [mode, setMode] = useState(detectThemeMode);
      useEffect(() => {
        const update = () => setMode(detectThemeMode());
        const observer = new MutationObserver(update);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
        if (document.body) observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
        const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
        if (media && media.addEventListener) media.addEventListener('change', update);
        update();
        return () => {
          observer.disconnect();
          if (media && media.removeEventListener) media.removeEventListener('change', update);
        };
      }, []);
      return mode;
    }

    /* ---------------------------------------------------------------- ui store */

    const uiState = { open: false, x: null, y: null, w: 470, minimized: false };
    const uiListeners = new Set();
    try {
      const saved = JSON.parse(window.localStorage.getItem(UI_KEY) || 'null');
      if (saved && typeof saved === 'object') Object.assign(uiState, saved);
    } catch { /* ignore */ }

    let uiSaveTimer = null;
    function setUi(patch) {
      Object.assign(uiState, patch);
      if (uiSaveTimer) clearTimeout(uiSaveTimer);
      uiSaveTimer = setTimeout(() => {
        try { window.localStorage.setItem(UI_KEY, JSON.stringify({ ...uiState, open: false })); } catch { /* ignore */ }
      }, 250);
      for (const listener of uiListeners) listener();
    }

    function useUi() {
      const [, force] = React.useReducer((value) => value + 1, 0);
      useEffect(() => {
        uiListeners.add(force);
        return () => { uiListeners.delete(force); };
      }, []);
      return uiState;
    }

    /* ----------------------------------------------------------------- styles */

    const CSS = `
.om-launcher { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 30px; padding: 0 9px; border: 0; border-radius: 8px; background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; cursor: pointer; }
.om-launcher:hover { background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2)); color: var(--dsw-alias-label-primary); }
.om-launcher[aria-pressed="true"] { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, transparent); color: var(--dsw-alias-brand-primary); }
.om-launcher-icon { display: inline-flex; width: 18px; height: 18px; }
.om-launcher-icon svg { width: 18px; height: 18px; }

.om-layer { position: fixed; inset: 0; z-index: 60; pointer-events: none; }
.om-win, .om-win * { box-sizing: border-box; }
.om-win {
  --om-serif: var(--dsh-font-family-brand, "Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", "SimSun", Georgia, serif);
  --om-paper: #f7f1e4;
  --om-paper-2: #fffdf6;
  --om-paper-3: #efe6d4;
  --om-ink: #241e18;
  --om-ink-2: #5d4f3f;
  --om-ink-3: #8b7b66;
  --om-line: #b9a98f;
  --om-red: #b23a2c;
  --om-red-2: #8e2a1e;
  --om-red-wash: #f7e7e0;
  position: fixed;
  display: flex;
  flex-direction: column;
  min-width: 420px;
  height: auto;
  max-height: calc(100vh - 24px);
  max-width: calc(100vw - 24px);
  border: 1px solid var(--om-line);
  border-radius: 16px;
  background:
    radial-gradient(120% 70% at 10% 0%, color-mix(in srgb, var(--om-red) 7%, transparent), transparent 58%),
    repeating-linear-gradient(0deg, color-mix(in srgb, var(--om-ink) 2.2%, transparent) 0 1px, transparent 1px 4px),
    var(--om-paper);
  color: var(--om-ink);
  box-shadow: 0 26px 64px rgba(46, 34, 22, .26), 0 2px 6px rgba(46, 34, 22, .08);
  overflow: hidden;
  pointer-events: auto;
  font-family: var(--dsh-font-family-text-default, "Segoe UI", system-ui, sans-serif);
  -webkit-font-smoothing: antialiased;
}
.om-win[data-theme="dark"] {
  --om-paper: #171210;
  --om-paper-2: #221a15;
  --om-paper-3: #2b211a;
  --om-ink: #f4e9d8;
  --om-ink-2: #cbb89f;
  --om-ink-3: #9a8871;
  --om-line: #7d6a54;
  --om-red: #e05743;
  --om-red-2: #f0785f;
  --om-red-wash: #3a1d17;
  box-shadow: 0 30px 72px rgba(0, 0, 0, .6), 0 2px 6px rgba(0, 0, 0, .35);
}
.om-win::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: linear-gradient(180deg, var(--om-red), var(--om-red-2)); }

.om-head { display: flex; align-items: center; gap: 10px; padding: 12px 13px 9px 16px; border-bottom: 1px solid color-mix(in srgb, var(--om-line) 55%, transparent); cursor: move; user-select: none; touch-action: none; }
.om-seal { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 5px; background: var(--om-red); color: #fff7ef; font-family: Georgia, "Times New Roman", serif; font-size: 17px; font-weight: 700; transform: rotate(-2deg); box-shadow: 0 2px 0 var(--om-red-2); }
.om-title { display: flex; flex-direction: column; min-width: 0; }
.om-title b { color: var(--om-ink); font-family: var(--om-serif); font-size: 15px; font-weight: 700; letter-spacing: .14em; }
.om-title span { margin-top: 1px; color: var(--om-ink-3); font-size: 10px; letter-spacing: .03em; }
.om-spacer { flex: 1; }
.om-iconbtn { display: inline-flex; align-items: center; justify-content: center; width: 25px; height: 25px; padding: 0; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--om-ink-3); font: inherit; font-size: 13px; line-height: 1; cursor: pointer; }
.om-iconbtn:hover { border-color: var(--om-line); color: var(--om-red); }

.om-body { display: flex; flex-direction: column; min-height: 0; flex: 1; padding: 10px 14px 0 17px; }
.om-toolbar { display: flex; align-items: center; gap: 6px; padding-bottom: 8px; flex-wrap: wrap; }
.om-chips { display: inline-flex; gap: 2px; padding: 2px; border: 1px solid var(--om-line); border-radius: 8px; background: var(--om-paper-3); }
.om-chips button { height: 23px; padding: 0 8px; border: 0; border-radius: 6px; background: transparent; color: var(--om-ink-2); font: inherit; font-family: var(--om-serif); font-size: 10.5px; letter-spacing: .04em; cursor: pointer; white-space: nowrap; }
.om-chips button:hover { color: var(--om-ink); }
.om-chips button.on { background: var(--om-red); color: #fff7ef; font-weight: 600; }
.om-select { height: 27px; max-width: 150px; padding: 0 6px; border: 1px solid var(--om-line); border-radius: 7px; background: var(--om-paper-2); color: var(--om-ink); font: inherit; font-size: 10.5px; cursor: pointer; }
.om-btn { height: 25px; padding: 0 10px; border: 1px solid var(--om-line); border-radius: 7px; background: var(--om-paper-2); color: var(--om-ink); font: inherit; font-size: 11px; cursor: pointer; }
.om-btn:hover { border-color: var(--om-red); color: var(--om-red); }
.om-btn.accent { border-color: transparent; background: var(--om-red); color: #fff7ef; box-shadow: 0 2px 0 var(--om-red-2); }
.om-btn.accent:hover { background: var(--om-red-2); color: #fff7ef; }

.om-article { flex: 0 1 auto; min-height: 0; max-height: calc(100vh - 220px); overflow-y: auto; padding: 2px 4px 10px 0; scrollbar-width: none; }
.om-article::-webkit-scrollbar { display: none; }
.om-meta { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; color: var(--om-ink-3); font-size: 10.5px; letter-spacing: .03em; }
.om-meta b { color: var(--om-red); font-family: var(--om-serif); font-size: 12.5px; font-weight: 600; letter-spacing: .04em; }
.om-meta .om-dot { color: var(--om-red); }
.om-badge { padding: 1px 5px; border-radius: 4px; background: var(--om-red); color: #fff7ef; font-size: 9px; letter-spacing: .06em; }
.om-stars { display: inline-flex; gap: 2px; margin-left: auto; }
.om-stars i { width: 6px; height: 6px; border-radius: 50%; background: color-mix(in srgb, var(--om-line) 60%, transparent); }
.om-stars i.on { background: var(--om-red); }
.om-statement { margin: 12px 0 4px; color: var(--om-ink); font-family: var(--om-serif); font-size: 15px; line-height: 1.9; letter-spacing: .01em; text-align: justify; text-justify: inter-ideograph; }
.om-line { margin: 0 0 7px; }
.om-gap { height: 6px; }
.om-actions { display: flex; gap: 6px; padding: 10px 0 4px; border-top: 1px solid color-mix(in srgb, var(--om-line) 45%, transparent); margin-top: 10px; flex-wrap: wrap; }
.om-keyidea { display: flex; align-items: flex-start; gap: 8px; margin-top: 10px; padding: 8px 10px; border: 1px dashed color-mix(in srgb, var(--om-line) 70%, transparent); border-radius: 5px; color: var(--om-ink-2); font-size: 11.5px; line-height: 1.75; }
.om-keyidea span { flex: 1; text-align: left; }
.om-keyidea b { flex: none; color: var(--om-red); font-family: var(--om-serif); font-size: 10.5px; font-weight: 600; letter-spacing: .08em; }
.om-box { margin-top: 10px; padding: 10px 12px; border: 1px solid var(--om-line); border-left: 3px solid var(--om-red); border-radius: 5px; background: var(--om-paper-2); }
.om-box h3 { margin: 0 0 7px; color: var(--om-red); font-family: var(--om-serif); font-size: 11px; font-weight: 600; letter-spacing: .1em; }
.om-box .om-line { color: var(--om-ink); font-size: 12.5px; line-height: 1.85; text-align: justify; text-justify: inter-ideograph; }
.om-box.solution h3 { color: var(--om-ink-2); }
.om-box.solution { border-left-color: var(--om-ink-2); }
.om-answer { color: var(--om-ink); font-family: var(--om-serif); font-size: 14px; }
.om-feedback { padding: 26px 10px; text-align: center; color: var(--om-ink-3); font-size: 12px; }
.om-notice { margin: 8px 0 0; padding: 6px 8px; border: 1px dashed color-mix(in srgb, var(--om-line) 70%, transparent); border-radius: 5px; color: var(--om-ink-2); font-size: 10.5px; line-height: 1.55; }
.om-foot { display: flex; align-items: center; gap: 8px; padding: 7px 0 10px; border-top: 1px solid color-mix(in srgb, var(--om-line) 45%, transparent); color: var(--om-ink-3); font-size: 9.5px; letter-spacing: .02em; }
.om-foot b { color: var(--om-ink-2); font-weight: 600; }
.om-resize { position: absolute; right: 2px; bottom: 2px; width: 15px; height: 15px; cursor: ew-resize; touch-action: none; background: linear-gradient(135deg, transparent 48%, var(--om-red) 49%, var(--om-red) 51%, transparent 52%, transparent 60%, var(--om-red) 61%, var(--om-red) 63%, transparent 64%); opacity: .6; }
.om-resize:hover { opacity: 1; }
.om-mini .om-body { display: none; }
.om-math .katex, .om-mathblock .katex { font-size: 1.02em; }
.om-katex-off .om-math { color: var(--om-ink-2); }
`;

    function IconSigma() {
      return h('svg', { viewBox: '0 0 20 20', width: 18, height: 18, 'aria-hidden': true, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' },
        h('path', { d: 'M13.5 4H6.5l4 6-4 6h7' }),
        h('rect', { x: 12.4, y: 12.4, width: 4, height: 4, rx: .6, fill: 'currentColor', stroke: 'none', opacity: .7 }));
    }

    function FooterButton({ wide }) {
      const ui = useUi();
      return h('button', {
        type: 'button',
        className: 'om-launcher',
        title: 'Olympiad · 1000+ problems',
        'aria-label': 'Open Olympiad',
        'aria-pressed': ui.open ? 'true' : 'false',
        onClick: () => setUi({ open: !ui.open, minimized: false }),
      },
      h('span', { className: 'om-launcher-icon' }, h(IconSigma)),
      wide ? h('span', null, 'Olympiad') : null);
    }

    function OlympiadWindow({ ui }) {
      const theme = useThemeMode();
      const [corpus, setCorpus] = useState(FALLBACK);
      const [error, setError] = useState('');
      const [katexReady, setKatexReady] = useState(Boolean(window.katex));
      const [category, setCategory] = useState('All');
      const [level, setLevel] = useState('all');
      const [problem, setProblem] = useState(() => pickRandom(FALLBACK.problems, null));
      const [showHint, setShowHint] = useState(false);
      const [showAnswer, setShowAnswer] = useState(false);
      const [showSolution, setShowSolution] = useState(false);
      const [, setViewportTick] = useState(0);
      const winRef = useRef(null);

      useEffect(() => {
        const onResize = () => setViewportTick((value) => value + 1);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      }, []);

      useEffect(() => {
        let alive = true;
        fetch(API + '/corpus')
          .then((response) => {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
          })
          .then((data) => {
            if (!alive) return;
            if (!data || !Array.isArray(data.problems) || !data.problems.length) throw new Error('empty corpus');
            setCorpus(data);
            setError('');
          })
          .catch((reason) => {
            /* Keep the curated set on screen: a missing corpus degrades to nine
               problems instead of an empty reader. */
            if (alive) setError('完整题库暂不可用，已载入 ' + FEATURED.length + ' 道精选题目。');
            void reason;
          });
        loadKatex().then((ready) => { if (alive) setKatexReady(ready); });
        return () => { alive = false; };
      }, []);

      const reset = (nextProblem) => {
        setProblem(nextProblem);
        setShowHint(false);
        setShowAnswer(false);
        setShowSolution(false);
      };

      const nextProblem = () => {
        if (!corpus) return;
        reset(pickRandom(poolOf(corpus.problems, category, level), problem ? problem.id : null));
      };

      const chooseCategory = (value) => {
        setCategory(value);
        if (!corpus) return;
        reset(pickRandom(poolOf(corpus.problems, value, level), problem ? problem.id : null));
      };

      const chooseLevel = (value) => {
        setLevel(value);
        if (!corpus) return;
        reset(pickRandom(poolOf(corpus.problems, category, value), problem ? problem.id : null));
      };

      useEffect(() => {
        const onKey = (event) => {
          const target = event.target;
          if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return;
          if (event.key === 'Escape') { setUi({ open: false }); return; }
          if (event.key === 'n' || event.key === 'N') { nextProblem(); return; }
          if (event.key === 'a' || event.key === 'A') { setShowAnswer((value) => !value); return; }
          if (event.key === 's' || event.key === 'S') { setShowSolution((value) => !value); return; }
          if (event.key === 'h' || event.key === 'H') { setShowHint((value) => !value); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      });

      const maxWidth = Math.max(420, Math.min(560, window.innerWidth - 24));
      const winW = clamp(Math.round(ui.w || 470), 420, maxWidth);

      const style = {
        width: winW + 'px',
        left: ui.x == null ? '50%' : clamp(ui.x, 8, window.innerWidth - 160) + 'px',
        top: ui.y == null ? '4%' : clamp(ui.y, 8, window.innerHeight - 48) + 'px',
        transform: ui.x == null ? 'translateX(-50%)' : 'none',
      };

      const onHeaderDown = (event) => {
        if (event.button !== 0) return;
        if (event.target.closest('button')) return;
        const rect = winRef.current ? winRef.current.getBoundingClientRect() : null;
        if (!rect) return;
        const start = { px: event.clientX, py: event.clientY, x: rect.left, y: rect.top };
        const onMove = (moveEvent) => {
          setUi({
            x: clamp(start.x + moveEvent.clientX - start.px, 8, window.innerWidth - 160),
            y: clamp(start.y + moveEvent.clientY - start.py, 8, window.innerHeight - 48),
          });
        };
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      };

      const onResizeDown = (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        const startX = event.clientX;
        const startW = winW;
        const onMove = (moveEvent) => {
          setUi({ w: clamp(Math.round(startW + (moveEvent.clientX - startX)), 420, maxWidth) });
        };
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      };

      const total = (corpus.meta && corpus.meta.count) || corpus.problems.length;
      const count = poolOf(corpus.problems, category, level).length;
      const offline = Boolean(corpus.meta && corpus.meta.fallback);

      return h('div', { className: 'om-layer' },
        h('div', { ref: winRef, className: 'om-win' + (ui.minimized ? ' om-mini' : '') + (katexReady ? '' : ' om-katex-off'), 'data-theme': theme, style, role: 'dialog', 'aria-label': 'Olympiad' },
          h('div', { className: 'om-head', onPointerDown: onHeaderDown },
            h('span', { className: 'om-seal' }, 'Σ'),
            h('div', { className: 'om-title' },
              h('b', null, 'Olympiad'),
              h('span', null, offline ? FEATURED.length + ' featured · offline' : total + ' problems · ' + count + ' in view · LaTeX')),
            h('span', { className: 'om-spacer' }),
            h('button', { type: 'button', className: 'om-btn accent', onClick: nextProblem, disabled: !corpus, title: 'Next problem (N)' }, 'Next'),
            h('button', { type: 'button', className: 'om-iconbtn', title: ui.minimized ? 'Expand' : 'Collapse', onClick: () => setUi({ minimized: !ui.minimized }) }, ui.minimized ? '▢' : '—'),
            h('button', { type: 'button', className: 'om-iconbtn', title: 'Close', onClick: () => setUi({ open: false }) }, '×')),
          h('div', { className: 'om-body' },
            h('div', { className: 'om-toolbar' },
              h('div', { className: 'om-chips', role: 'group', 'aria-label': 'Difficulty' },
                LEVELS.map((item) => h('button', {
                  key: item.key,
                  type: 'button',
                  className: level === item.key ? 'on' : '',
                  onClick: () => chooseLevel(item.key),
                }, item.label))),
              h('select', {
                className: 'om-select',
                value: category,
                'aria-label': 'Category',
                onChange: (event) => chooseCategory(event.target.value),
              }, CATEGORIES.map((item) => h('option', { key: item, value: item }, item)))),
            h('div', { className: 'om-article' },
              error ? h('div', { className: 'om-notice' }, error) : null,
              !problem ? h('div', { className: 'om-feedback' }, 'No problem matches this filter.')
                : h(React.Fragment, null,
                  h('div', { className: 'om-meta' },
                    h('b', null, problem.source),
                    h('span', { className: 'om-dot' }, '·'),
                    h('span', null, problem.category),
                    problem.featured ? h('span', { className: 'om-badge' }, 'Featured') : null,
                    h('span', { className: 'om-stars', 'aria-label': 'Difficulty ' + problem.stars + ' of 5' },
                      [...Array(5).keys()].map((index) => h('i', { key: index, className: index < problem.stars ? 'on' : '' })))),
                  h('div', { className: 'om-statement' },
                    problem.statement.map((block, index) => h(MathLines, { key: index, text: block, className: 'om-statement' }))),
                  problem.keyIdea ? h('div', { className: 'om-keyidea' },
                    h('b', null, 'KEY IDEA'),
                    h('span', null, problem.keyIdea)) : null,
                  h('div', { className: 'om-actions' },
                    problem.hint ? h('button', { type: 'button', className: 'om-btn', onClick: () => setShowHint(!showHint) }, showHint ? 'Hide hint' : 'Hint') : null,
                    problem.answer ? h('button', { type: 'button', className: 'om-btn', onClick: () => setShowAnswer(!showAnswer) }, showAnswer ? 'Hide answer' : 'Answer') : null,
                    h('button', { type: 'button', className: 'om-btn accent', onClick: () => setShowSolution(!showSolution) }, showSolution ? 'Hide solution' : 'Detailed solution')),
                  showHint && problem.hint ? h('div', { className: 'om-box' },
                    h('h3', null, 'HINT'),
                    h('p', { className: 'om-line' }, h(MathText, { text: problem.hint }))) : null,
                  showAnswer && problem.answer ? h('div', { className: 'om-box' },
                    h('h3', null, 'ANSWER'),
                    h('div', { className: 'om-answer' }, h(MathText, { text: problem.answer }))) : null,
                  showSolution ? h('div', { className: 'om-box solution' },
                    h('h3', null, 'SOLUTION'),
                    problem.solution.map((block, index) => h(MathLines, { key: index, text: block, className: 'om-lines' }))) : null)),
            h('div', { className: 'om-foot' },
              h('span', null, 'N ', h('b', null, 'Next')),
              h('span', null, 'A ', h('b', null, 'Answer')),
              h('span', null, 'S ', h('b', null, 'Solution')),
              h('span', null, 'H ', h('b', null, 'Hint')),
              h('span', null, 'Esc ', h('b', null, 'Close')))),
          h('div', { className: 'om-resize', title: 'Resize width', onPointerDown: onResizeDown })));
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => {
          const tag = document.createElement('style');
          tag.setAttribute('data-plugin-css', 'olympiad');
          tag.textContent = CSS;
          document.head.appendChild(tag);
          return () => tag.remove();
        }, 'olympiad: styles');

        ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
          name: 'sidebar.footer.action',
          id: 'olympiad',
          order: 40,
          label: () => 'Olympiad',
        }, FooterButton));

        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'olympiad.window',
          order: 520,
        }, function OlympiadOverlay() {
          const ui = useUi();
          if (!ui.open) return null;
          return h(OlympiadWindow, { ui });
        }));
      },
    };
  },
});
