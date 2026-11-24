import { readFileSync, writeFileSync } from 'node:fs';

let t = readFileSync('client.js', 'utf8');

/* Longer walkthrough panel: shrink the board a little so the panel fits. */
t = t.replace(
  `winH - (walk ? 258 : 224)`,
  `winH - (walk ? 264 : 224)`,
);

/* More robust theme detection: token on :root or body, then body background,
   then the OS preference. */
t = t.replace(
  `    function detectThemeMode() {
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
    }`,
  `    function luminanceOf(color) {
      const parts = String(color).match(/[\\d.]+/g);
      if (!parts || parts.length < 3) return null;
      const [r, g, b] = parts.map(Number);
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    }

    function detectThemeMode() {
      try {
        const rootToken = getComputedStyle(document.documentElement).getPropertyValue('--dsw-alias-bg-base').trim();
        const bodyToken = document.body ? getComputedStyle(document.body).getPropertyValue('--dsw-alias-bg-base').trim() : '';
        const token = rootToken || bodyToken;
        if (token) {
          const probe = document.createElement('div');
          probe.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:1px;background-color:' + token;
          document.body.appendChild(probe);
          const value = getComputedStyle(probe).backgroundColor;
          probe.remove();
          const luminance = luminanceOf(value);
          if (luminance !== null) return luminance < 0.5 ? 'dark' : 'light';
        }
        const bodyBackground = document.body ? getComputedStyle(document.body).backgroundColor : '';
        const bodyLuminance = luminanceOf(bodyBackground);
        if (bodyLuminance !== null && bodyLuminance > 0 && bodyLuminance < 1) return bodyLuminance < 0.5 ? 'dark' : 'light';
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } catch {
        return 'light';
      }
    }`,
);

writeFileSync('client.js', t, 'utf8');
console.log('ok');
