// Personal look: accent colour, background depth and text size. Applied as CSS variables.
import * as S from './store.js';

export const ACCENTS = [
  { id: 'ember', label: 'Ember', c1: '#ff7a45', c2: '#ff7a45', ink: '#0b0c0e', glow: 'transparent' },
  { id: 'ocean', label: 'Ocean', c1: '#3b9eff', c2: '#3b9eff', ink: '#0b0c0e', glow: 'transparent' },
  { id: 'jade', label: 'Jade', c1: '#2fd08a', c2: '#2fd08a', ink: '#0b0c0e', glow: 'transparent' },
  { id: 'violet', label: 'Violet', c1: '#9d7bff', c2: '#9d7bff', ink: '#0b0c0e', glow: 'transparent' },
  { id: 'gold', label: 'Gold', c1: '#f5b83d', c2: '#f5b83d', ink: '#0b0c0e', glow: 'transparent' },
];
export const BACKGROUNDS = [
  { id: 'midnight', label: 'Graphite', vars: {} },
  { id: 'oled', label: 'OLED black', vars: { '--bg': '#000000', '--bg2': '#050505', '--surface': '#0e0e12', '--surface2': '#16161c', '--surface3': '#202028' } },
  { id: 'slate', label: 'Navy', vars: { '--bg': '#0b0f1a', '--bg2': '#0f1422', '--surface': '#151b2b', '--surface2': '#1c2438', '--surface3': '#252f47' } },
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
  root.setProperty('--grad-warm', a.c1);
  root.setProperty('--accent', a.c1);
  const bg = BACKGROUNDS.find((x) => x.id === c.bg);
  BG_KEYS.forEach((k) => (bg.vars[k] ? root.setProperty(k, bg.vars[k]) : root.removeProperty(k)));
  root.setProperty('--zoom', String(SIZES.find((z) => z.id === c.size).zoom));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg.vars['--bg'] || '#0b0c0e');
}

export function set(patch) {
  const st = S.get(); st.settings.theme = { ...current(), ...patch }; S.save(); apply();
}
