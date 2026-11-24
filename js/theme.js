// Personal look: accent colour, background depth and text size. Applied as CSS variables.
import * as S from './store.js';

export const ACCENTS = [
  { id: 'ember', label: 'Ember', c1: '#ffb547', c2: '#ff6b6b', ink: '#1a1206', glow: 'rgba(255,140,80,0.25)' },
  { id: 'ocean', label: 'Ocean', c1: '#38bdf8', c2: '#6366f1', ink: '#04121f', glow: 'rgba(56,189,248,0.25)' },
  { id: 'jade', label: 'Jade', c1: '#34d399', c2: '#0ea5e9', ink: '#03150e', glow: 'rgba(52,211,153,0.25)' },
  { id: 'violet', label: 'Violet', c1: '#c084fc', c2: '#f472b6', ink: '#1a0820', glow: 'rgba(192,132,252,0.25)' },
  { id: 'gold', label: 'Gold', c1: '#fde047', c2: '#f59e0b', ink: '#1a1404', glow: 'rgba(250,204,21,0.25)' },
];
export const BACKGROUNDS = [
  { id: 'midnight', label: 'Midnight', vars: {} },
  { id: 'oled', label: 'OLED black', vars: { '--bg': '#000000', '--bg2': '#050505', '--surface': '#0e0e12', '--surface2': '#16161c', '--surface3': '#202028' } },
  { id: 'slate', label: 'Slate', vars: { '--bg': '#121417', '--bg2': '#16191d', '--surface': '#1d2126', '--surface2': '#252a31', '--surface3': '#30363f' } },
];
export const SIZES = [
  { id: 'normal', label: 'Normal', zoom: 1 },
  { id: 'large', label: 'Large', zoom: 1.1 },
  { id: 'xl', label: 'Extra large', zoom: 1.22 },
];
const BG_KEYS = ['--bg', '--bg2', '--surface', '--surface2', '--surface3'];

export function current() {
  const t = S.get()?.settings?.theme || {};
  return {
    accent: ACCENTS.some((a) => a.id === t.accent) ? t.accent : 'ember',
    bg: BACKGROUNDS.some((b) => b.id === t.bg) ? t.bg : 'midnight',
    size: SIZES.some((z) => z.id === t.size) ? t.size : 'normal',
  };
}

export function apply() {
  const c = current(); const root = document.documentElement.style;
  const a = ACCENTS.find((x) => x.id === c.accent);
  root.setProperty('--a1', a.c1); root.setProperty('--a2', a.c2); root.setProperty('--a-ink', a.ink); root.setProperty('--a-glow', a.glow);
  root.setProperty('--grad-warm', `linear-gradient(135deg, ${a.c1} 0%, ${a.c2} 100%)`);
  root.setProperty('--accent', a.c1);
  const bg = BACKGROUNDS.find((x) => x.id === c.bg);
  BG_KEYS.forEach((k) => (bg.vars[k] ? root.setProperty(k, bg.vars[k]) : root.removeProperty(k)));
  root.setProperty('--zoom', String(SIZES.find((z) => z.id === c.size).zoom));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg.vars['--bg'] || '#0b0f1a');
}

export function set(patch) {
  const st = S.get(); st.settings.theme = { ...current(), ...patch }; S.save(); apply();
}
