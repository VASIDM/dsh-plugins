import { readFileSync, writeFileSync } from 'node:fs';

let t = readFileSync('client.js', 'utf8');
let css = readFileSync('newcss.txt', 'utf8');
css = css.replace('.sdk-gridlines { position: absolute; inset: 2px;', '.sdk-gridlines { position: absolute; inset: 1px;');

const start = t.indexOf('    const CSS = `');
const end = t.indexOf('    function IconGrid() {');
if (start < 0 || end < 0) throw new Error('css markers missing');
t = t.slice(0, start) + '    const CSS = `\n' + css + '`;\n\n' + t.slice(end);

const themeFns = `    /* Follow the app theme: probe the base background token once and on every
       theme mutation, then drive the paper/ink palette from it. */
    function detectThemeMode() {
      try {
        const probe = document.createElement('div');
        probe.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:1px;background-color:var(--dsw-alias-bg-base,#ffffff)';
        document.body.appendChild(probe);
        const value = getComputedStyle(probe).backgroundColor;
        probe.remove();
        const parts = value.match(/[\\d.]+/g);
        if (!parts || parts.length < 3) return 'light';
        const [r, g, b] = parts.map(Number);
        const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        return luminance < 0.5 ? 'dark' : 'light';
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

    function FooterButton({ wide }) {`;
t = t.replace('    function FooterButton({ wide }) {', themeFns);

t = t.replace(
  `      const [best, setBest] = useState(readBest);
      const [, setViewportTick] = useState(0);`,
  `      const [best, setBest] = useState(readBest);
      const [, setViewportTick] = useState(0);
      const theme = useThemeMode();`,
);
t = t.replace(
  `h('div', { ref: winRef, className: 'sdk-win' + (ui.minimized ? ' sdk-mini' : ''), style, role: 'dialog', 'aria-label': '数独' },`,
  `h('div', { ref: winRef, className: 'sdk-win' + (ui.minimized ? ' sdk-mini' : ''), style, role: 'dialog', 'aria-label': '数独', 'data-theme': theme },`,
);

writeFileSync('client.js', t, 'utf8');
console.log('spliced', t.length);
