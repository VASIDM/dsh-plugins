import { readFileSync, writeFileSync } from 'node:fs';

let t = readFileSync('client.js', 'utf8');

const start = t.indexOf('    function detectThemeMode() {');
const end = t.indexOf('    function useThemeMode() {');
if (start < 0 || end < 0) throw new Error('theme function not found');

const fn = `    function detectThemeMode() {
      try {
        const anchor = document.querySelector('.sdk-win') || document.body;
        if (!anchor) return 'light';
        const probe = document.createElement('div');
        probe.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:1px;background-color:var(--dsw-alias-bg-base,transparent)';
        anchor.appendChild(probe);
        const value = getComputedStyle(probe).backgroundColor;
        probe.remove();
        const luminance = luminanceOf(value);
        if (luminance !== null && !/rgba?\\(.*,\\s*0\\)$/.test(value)) return luminance < 0.5 ? 'dark' : 'light';

        const bodyBackground = document.body ? getComputedStyle(document.body).backgroundColor : '';
        const bodyLuminance = luminanceOf(bodyBackground);
        if (bodyLuminance !== null && !/rgba?\\(.*,\\s*0\\)$/.test(bodyBackground)) return bodyLuminance < 0.5 ? 'dark' : 'light';
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } catch {
        return 'light';
      }
    }

`;
t = t.slice(0, start) + fn + t.slice(end);
writeFileSync('client.js', t, 'utf8');
console.log('ok');
