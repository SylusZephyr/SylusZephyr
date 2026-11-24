// Caffeine on board. One-compartment model: each cup is absorbed over ~45 min,
// then cleared with a half-life of about 5 hours (it varies a lot between people).
import * as S from './store.js';
import * as P from './plan.js';

export const HALF_LIFE_MIN = 300;
const ABSORB_MIN = 45;
export const SLEEP_SAFE_MG = 50;    // rough level under which sleep onset is rarely affected
export const DAILY_LIMIT_MG = 400;  // usual upper limit for healthy adults

export const DRINKS = [
  { id: 'americano', e: '☕', label: 'Americano', mg: 150 },
  { id: 'latte', e: '🥛', label: 'Latte / coconut latte', mg: 150 },
  { id: 'espresso', e: '⚡', label: 'Single espresso', mg: 75 },
  { id: 'tea', e: '🍵', label: 'Black / green tea', mg: 40 },
  { id: 'cola', e: '🥤', label: 'Cola (330 ml)', mg: 35 },
  { id: 'energy', e: '🔋', label: 'Energy drink', mg: 80 },
  { id: 'decaf', e: '🌙', label: 'Decaf', mg: 5 },
];

// Minutes since the 4 AM rollover, so a 1 AM coffee lands after a 9 PM one.
const dayMin = (hhmm) => ((S.minutesOf(hhmm) - S.DAY_ROLLOVER_HOUR * 60) + 1440) % 1440;
export const clockToDayMin = dayMin;

export function cupMg() { return S.get().profile.cupMg || 150; }

// Coffee entries are 'HH:MM' (a standard cup) or 'HH:MM@mg' for a specific drink.
export function parse(entry) {
  const [time, mg] = String(entry).split('@');
  return { time, mg: mg != null && Number.isFinite(+mg) ? +mg : cupMg() };
}
export const timeOf = (entry) => parse(entry).time;

export function doses(k = S.dayKey()) {
  const d = S.get().days[k];
  const out = (d?.coffee || []).map(parse).filter((x) => S.minutesOf(x.time) != null).map((x) => ({ t: dayMin(x.time), mg: x.mg }));
  // What's left over from yesterday still counts this morning.
  const prev = S.get().days[S.addDays(k, -1)];
  (prev?.coffee || []).map(parse).forEach((x) => { if (S.minutesOf(x.time) != null) out.push({ t: dayMin(x.time) - 1440, mg: x.mg }); });
  return out;
}

function contribution(mg, dt) {
  if (dt <= 0) return 0;
  const absorbed = Math.min(1, dt / ABSORB_MIN);
  return mg * absorbed * Math.pow(0.5, Math.max(0, dt - ABSORB_MIN) / HALF_LIFE_MIN);
}

export function levelAt(k, at, extra = []) {
  return [...doses(k), ...extra].reduce((sum, x) => sum + contribution(x.mg, at - x.t), 0);
}

export function nowDayMin(now = new Date()) { return dayMin(S.hm(now)); }

export function summary(k = S.dayKey(), now = new Date()) {
  const bed = dayMin(P.sleepTargets(k).bed);
  const at = nowDayMin(now);
  const total = doses(k).filter((x) => x.t >= 0).reduce((a, x) => a + x.mg, 0);
  const current = levelAt(k, at);
  const atBed = levelAt(k, bed);
  const ifOneMore = levelAt(k, bed, [{ t: at, mg: cupMg() }]);
  // When does the level drop under the sleep-safe line?
  let clearAt = null;
  for (let m = Math.max(at, 0); m <= 1440 + 720; m += 10) if (levelAt(k, m) < SLEEP_SAFE_MG) { clearAt = m; break; }
  return {
    total: Math.round(total), now: Math.round(current), atBed: Math.round(atBed), ifOneMore: Math.round(ifOneMore),
    bedClock: P.sleepTargets(k).bed, clearClock: clearAt == null ? null : S.fmtMin(clearAt + S.DAY_ROLLOVER_HOUR * 60),
    safeAtBed: atBed < SLEEP_SAFE_MG, overLimit: total > DAILY_LIMIT_MG,
  };
}

// Points from 4 AM to the next 4 AM, for the little chart.
export function curve(k = S.dayKey(), step = 30) {
  const pts = [];
  for (let m = 0; m <= 1440; m += step) pts.push({ m, y: Math.round(levelAt(k, m)) });
  return pts;
}

export function curveSvg(k = S.dayKey(), now = new Date()) {
  const pts = curve(k); const W = 340, H = 90, pb = 16, pt = 6;
  const hi = Math.max(SLEEP_SAFE_MG * 2, ...pts.map((p) => p.y));
  const X = (m) => (m / 1440) * W; const Y = (v) => pt + (1 - v / hi) * (H - pt - pb);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.m).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
  const bed = dayMin(P.sleepTargets(k).bed); const at = nowDayMin(now);
  const ticks = [6, 12, 18, 0].map((h) => ({ m: ((h - S.DAY_ROLLOVER_HOUR) * 60 + 1440) % 1440, l: h === 0 ? '12am' : h === 12 ? '12pm' : h > 12 ? `${h - 12}pm` : `${h}am` }));
  return `<svg class="chart caf-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Estimated caffeine through the day">
    <defs><linearGradient id="cafg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f59e0b" stop-opacity=".45"/><stop offset="1" stop-color="#f59e0b" stop-opacity="0"/></linearGradient></defs>
    <line x1="0" x2="${W}" y1="${Y(SLEEP_SAFE_MG)}" y2="${Y(SLEEP_SAFE_MG)}" stroke="rgba(52,211,153,.55)" stroke-dasharray="3 4"/>
    <path d="${line} L${W},${H - pb} L0,${H - pb} Z" fill="url(#cafg)"/>
    <path d="${line}" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linejoin="round"/>
    <line x1="${X(bed)}" x2="${X(bed)}" y1="${pt}" y2="${H - pb}" stroke="#a78bfa" stroke-width="1.5"/>
    <text x="${Math.min(W - 4, X(bed) + 4)}" y="${pt + 9}" text-anchor="${X(bed) > W - 40 ? 'end' : 'start'}" fill="#c4b5fd">bed</text>
    <circle cx="${X(at)}" cy="${Y(levelAt(k, at))}" r="4" fill="#f59e0b" stroke="#0b0f1a" stroke-width="2"/>
    ${ticks.map((t) => `<text x="${X(t.m)}" y="${H - 3}" text-anchor="middle">${t.l}</text>`).join('')}
  </svg>`;
}
