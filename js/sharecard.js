// Draws a shareable progress image (1080×1350) — streak, level and this week's wins.
// Deliberately contains no health details: only habits and progress.
import * as S from './store.js';
import * as G from './gamify.js';
import { isNative } from './native.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export function weekStats() {
  const st = S.get(); const today = S.dayKey(); let ess = 0, meals = 0, pf = 0, days = 0;
  for (let i = 0; i < 7; i++) {
    const k = S.addDays(today, -i); const d = st.days[k]; if (!d) continue;
    days++; ess += G.essentialsDone(k);
    meals += new Set(d.meals.filter((m) => m.slot !== 'snack').map((m) => m.slot)).size; pf += d.pf || 0;
  }
  return { ess, meals, pf, days };
}

export function render() {
  const W = 1080, H = 1350; const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const font = (w, s) => `${w} ${s}px -apple-system, "Segoe UI", Roboto, "PingFang SC", sans-serif`;
  // background
  const bg = x.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#2a1d4f'); bg.addColorStop(0.55, '#121a2e'); bg.addColorStop(1, '#0b0f1a');
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  const glow = x.createRadialGradient(W * 0.8, 160, 10, W * 0.8, 160, 620); glow.addColorStop(0, 'rgba(255,170,80,0.45)'); glow.addColorStop(1, 'rgba(255,170,80,0)');
  x.fillStyle = glow; x.fillRect(0, 0, W, H);

  const lv = G.levelInfo(); const streak = G.streak(); const wk = weekStats(); const st = S.get();
  x.fillStyle = '#eef1f8'; x.font = font(800, 54); x.fillText('🔥 Revive', 80, 140);
  x.fillStyle = 'rgba(238,241,248,.65)'; x.font = font(600, 34); x.fillText(S.prettyDate(S.dayKey(), { day: 'numeric', month: 'long', year: 'numeric' }), 80, 196);

  // streak hero
  x.font = font(900, 300); x.fillStyle = '#ffb547'; x.textBaseline = 'alphabetic';
  const sw = x.measureText(String(streak)).width; x.fillText(String(streak), 80, 560);
  x.font = font(700, 54); x.fillStyle = '#eef1f8'; x.fillText('day streak', 100 + sw, 540);
  x.font = font(500, 34); x.fillStyle = 'rgba(238,241,248,.7)'; x.fillText(`Best ever: ${st.game.bestStreak} days`, 104 + sw, 590);

  // level bar
  roundRect(x, 80, 660, W - 160, 150, 36); x.fillStyle = 'rgba(255,255,255,.06)'; x.fill();
  x.fillStyle = '#eef1f8'; x.font = font(800, 42); x.fillText(`Level ${lv.level} · ${lv.title}`, 120, 730);
  roundRect(x, 120, 760, W - 240, 22, 11); x.fillStyle = 'rgba(255,255,255,.12)'; x.fill();
  const g = x.createLinearGradient(120, 0, W - 120, 0); g.addColorStop(0, '#ffb547'); g.addColorStop(1, '#ff6b6b');
  roundRect(x, 120, 760, Math.max(22, (W - 240) * lv.pct), 22, 11); x.fillStyle = g; x.fill();

  // week tiles
  const tiles = [['✅', wk.ess, 'essentials done'], ['🍽️', wk.meals, 'main meals'], ['💪', wk.pf, 'training sessions']];
  const tw = (W - 160 - 40) / 3;
  tiles.forEach(([e, v, label], i) => {
    const tx = 80 + i * (tw + 20); roundRect(x, tx, 860, tw, 260, 32); x.fillStyle = 'rgba(255,255,255,.06)'; x.fill();
    x.fillStyle = '#ffffff'; x.font = font(400, 56); x.fillText(e, tx + 32, 950);
    x.fillStyle = '#eef1f8'; x.font = font(900, 84); x.fillText(String(v), tx + 32, 1050);
    x.fillStyle = 'rgba(238,241,248,.65)'; x.font = font(600, 28); x.fillText(label, tx + 32, 1092);
  });

  x.fillStyle = 'rgba(238,241,248,.55)'; x.font = font(600, 32);
  x.fillText('Small wins, every day.', 80, H - 110);
  return c;
}

export async function share() {
  const canvas = render();
  const dataUrl = canvas.toDataURL('image/png');
  if (isNative) {
    const { Filesystem, Share } = window.Capacitor.Plugins;
    const r = await Filesystem.writeFile({ path: 'revive-progress.png', data: dataUrl.split(',')[1], directory: 'CACHE' });
    await Share.share({ title: 'My Revive progress', url: r.uri }).catch(() => {});
    return;
  }
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], 'revive-progress.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'My Revive progress' }).catch(() => {}); return; }
  const a = document.createElement('a'); a.href = dataUrl; a.download = 'revive-progress.png'; document.body.appendChild(a); a.click(); a.remove();
}
