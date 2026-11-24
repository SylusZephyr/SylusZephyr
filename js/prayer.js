// Prayer times and Ramadan fasting windows, computed on the device from the
// sun's position (no network). Based on the standard solar formulas used by
// most prayer-time tables; results are usually within 1–2 minutes of the
// local mosque timetable, which always wins if they differ.
import * as S from './store.js';

export const CITIES = [
  { id: 'beijing', name: 'Beijing 北京', lat: 39.904, lng: 116.407, tz: 8 },
  { id: 'shanghai', name: 'Shanghai 上海', lat: 31.230, lng: 121.474, tz: 8 },
  { id: 'guangzhou', name: 'Guangzhou 广州', lat: 23.129, lng: 113.264, tz: 8 },
  { id: 'shenzhen', name: 'Shenzhen 深圳', lat: 22.543, lng: 114.058, tz: 8 },
  { id: 'hangzhou', name: 'Hangzhou 杭州', lat: 30.274, lng: 120.155, tz: 8 },
  { id: 'nanjing', name: 'Nanjing 南京', lat: 32.060, lng: 118.797, tz: 8 },
  { id: 'wuhan', name: 'Wuhan 武汉', lat: 30.593, lng: 114.305, tz: 8 },
  { id: 'chengdu', name: 'Chengdu 成都', lat: 30.573, lng: 104.066, tz: 8 },
  { id: 'chongqing', name: 'Chongqing 重庆', lat: 29.563, lng: 106.551, tz: 8 },
  { id: 'xian', name: 'Xi’an 西安', lat: 34.341, lng: 108.940, tz: 8 },
  { id: 'lanzhou', name: 'Lanzhou 兰州', lat: 36.061, lng: 103.834, tz: 8 },
  { id: 'xining', name: 'Xining 西宁', lat: 36.617, lng: 101.778, tz: 8 },
  { id: 'yinchuan', name: 'Yinchuan 银川', lat: 38.487, lng: 106.231, tz: 8 },
  { id: 'urumqi', name: 'Ürümqi 乌鲁木齐', lat: 43.825, lng: 87.617, tz: 8 },
  { id: 'kashgar', name: 'Kashgar 喀什', lat: 39.470, lng: 75.990, tz: 8 },
  { id: 'kunming', name: 'Kunming 昆明', lat: 25.039, lng: 102.718, tz: 8 },
  { id: 'tianjin', name: 'Tianjin 天津', lat: 39.343, lng: 117.361, tz: 8 },
  { id: 'harbin', name: 'Harbin 哈尔滨', lat: 45.803, lng: 126.535, tz: 8 },
  { id: 'hongkong', name: 'Hong Kong 香港', lat: 22.319, lng: 114.169, tz: 8 },
  { id: 'lahore', name: 'Lahore', lat: 31.549, lng: 74.344, tz: 5 },
  { id: 'karachi', name: 'Karachi', lat: 24.861, lng: 67.010, tz: 5 },
  { id: 'islamabad', name: 'Islamabad', lat: 33.684, lng: 73.048, tz: 5 },
];

// Twilight angles for Fajr / Isha. Isha may instead be a fixed number of minutes after Maghrib.
export const METHODS = {
  MWL: { name: 'Muslim World League', fajr: 18, isha: 17 },
  Karachi: { name: 'Univ. of Islamic Sciences, Karachi', fajr: 18, isha: 18 },
  Egypt: { name: 'Egyptian General Authority', fajr: 19.5, isha: 17.5 },
  ISNA: { name: 'ISNA (North America)', fajr: 15, isha: 15 },
  Makkah: { name: 'Umm al-Qura, Makkah', fajr: 18.5, ishaMin: 90 },
};

export const PRAYERS = [
  { id: 'fajr', label: 'Fajr' }, { id: 'sunrise', label: 'Sunrise' }, { id: 'dhuhr', label: 'Dhuhr' },
  { id: 'asr', label: 'Asr' }, { id: 'maghrib', label: 'Maghrib' }, { id: 'isha', label: 'Isha' },
];

const rad = (d) => (d * Math.PI) / 180, deg = (r) => (r * 180) / Math.PI;
const fix = (a, b) => { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; };
const dsin = (d) => Math.sin(rad(d)), dcos = (d) => Math.cos(rad(d)), dtan = (d) => Math.tan(rad(d));
const darcsin = (x) => deg(Math.asin(x)), darccos = (x) => deg(Math.acos(x)), darctan2 = (y, x) => deg(Math.atan2(y, x));
const darccot = (x) => deg(Math.atan(1 / x));

function julian(y, m, d) {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100); const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

function sunPosition(jd) {
  const D = jd - 2451545.0;
  const g = fix(357.529 + 0.98560028 * D, 360);
  const q = fix(280.459 + 0.98564736 * D, 360);
  const L = fix(q + 1.915 * dsin(g) + 0.020 * dsin(2 * g), 360);
  const e = 23.439 - 0.00000036 * D;
  const RA = fix(darctan2(dcos(e) * dsin(L), dcos(L)) / 15, 24);
  return { decl: darcsin(dsin(e) * dsin(L)), eqt: q / 15 - RA };
}

// Hours (local solar, before timezone/longitude correction) when the sun is `angle` below the horizon.
function angleTime(jd, lat, angle, t, before) {
  const { decl } = sunPosition(jd + t);
  const noon = midDay(jd, t);
  const c = (-dsin(angle) - dsin(decl) * dsin(lat)) / (dcos(decl) * dcos(lat));
  if (c < -1 || c > 1) return NaN; // sun never gets that low (high-latitude summer)
  const T = darccos(c) / 15;
  return noon + (before ? -T : T);
}
function midDay(jd, t) { return fix(12 - sunPosition(jd + t).eqt, 24); }
function asrTime(jd, lat, factor, t) {
  const { decl } = sunPosition(jd + t);
  return angleTime(jd, lat, -darccot(factor + dtan(Math.abs(lat - decl))), t, false);
}

export function settings() {
  const p = S.get().prayer || {};
  const city = CITIES.find((c) => c.id === p.city) || CITIES[0];
  return {
    enabled: !!p.enabled, method: METHODS[p.method] ? p.method : 'MWL', asr: p.asr === 'hanafi' ? 'hanafi' : 'standard',
    ramadan: p.ramadan || 'auto', city: p.city === 'custom' ? 'custom' : city.id,
    lat: p.city === 'custom' && Number.isFinite(+p.lat) ? +p.lat : city.lat,
    lng: p.city === 'custom' && Number.isFinite(+p.lng) ? +p.lng : city.lng,
    tz: p.city === 'custom' ? (Number.isFinite(+p.tz) ? +p.tz : -new Date().getTimezoneOffset() / 60) : city.tz,
    cityName: p.city === 'custom' ? 'Custom location' : city.name,
  };
}

// Times for a calendar date, as minutes after local midnight.
export function timesFor(date = new Date(), cfg = settings()) {
  const jd = julian(date.getFullYear(), date.getMonth() + 1, date.getDate()) - cfg.lng / (15 * 24);
  const m = METHODS[cfg.method];
  // Initial guesses as a fraction of the day, then one refinement pass.
  let t = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, maghrib: 18, isha: 18 };
  for (let pass = 0; pass < 2; pass++) {
    const f = (h) => h / 24;
    t = {
      fajr: angleTime(jd, cfg.lat, m.fajr, f(t.fajr), true),
      sunrise: angleTime(jd, cfg.lat, 0.833, f(t.sunrise), true),
      dhuhr: midDay(jd, f(t.dhuhr)),
      asr: asrTime(jd, cfg.lat, cfg.asr === 'hanafi' ? 2 : 1, f(t.asr)),
      maghrib: angleTime(jd, cfg.lat, 0.833, f(t.maghrib), false),
      isha: m.ishaMin ? NaN : angleTime(jd, cfg.lat, m.isha, f(t.isha), false),
    };
  }
  const adj = cfg.tz - cfg.lng / 15;
  const out = {};
  for (const [k, v] of Object.entries(t)) out[k] = Number.isFinite(v) ? Math.round((v + adj) * 60) : null;
  out.dhuhr = out.dhuhr == null ? null : out.dhuhr + 1; // a minute after zenith
  if (m.ishaMin && out.maghrib != null) out.isha = out.maghrib + m.ishaMin;
  // High latitudes: fall back to the one-seventh-of-the-night rule.
  const night = out.sunrise != null && out.maghrib != null ? (out.sunrise + 1440 - out.maghrib) : null;
  if (out.fajr == null && night) out.fajr = out.sunrise - Math.round(night / 7);
  if (out.isha == null && night) out.isha = out.maghrib + Math.round(night / 7);
  return out;
}

export function todayList(now = new Date()) {
  const t = timesFor(now);
  return PRAYERS.map((p) => ({ ...p, min: t[p.id], clock: t[p.id] == null ? null : S.fmtMin(t[p.id]) }));
}

// The next prayer from now (rolls into tomorrow's Fajr after Isha).
export function next(now = new Date()) {
  const m = now.getHours() * 60 + now.getMinutes();
  const list = todayList(now).filter((p) => p.id !== 'sunrise' && p.min != null);
  const up = list.find((p) => p.min > m);
  if (up) return { ...up, inMin: up.min - m };
  const tmr = new Date(now); tmr.setDate(tmr.getDate() + 1);
  const f = timesFor(tmr).fajr;
  return { id: 'fajr', label: 'Fajr', min: f, clock: S.fmtMin(f), inMin: f + 1440 - m, tomorrow: true };
}

// Hijri month from the browser's Umm al-Qura calendar (no network needed).
export function hijri(date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(date);
    const g = (type) => +parts.find((p) => p.type === type)?.value;
    const day = g('day'), month = g('month'), year = g('year');
    if (!month) return null;
    return { day, month, year };
  } catch (e) { return null; }
}
export const isRamadanDate = (date = new Date()) => hijri(date)?.month === 9;

// Days until the next 1 Ramadan (0 while it is Ramadan), searching up to a year ahead.
export function daysToRamadan(from = new Date()) {
  if (isRamadanDate(from)) return 0;
  const d = new Date(from);
  for (let i = 1; i <= 360; i++) { d.setDate(d.getDate() + 1); if (isRamadanDate(d)) return i; }
  return null;
}

// Fasting mode is on when the user switched it on, or on auto during Ramadan.
export function fasting(date = new Date()) {
  const cfg = settings();
  if (cfg.ramadan === 'off') return false;
  if (cfg.ramadan === 'on') return true;
  return cfg.enabled && isRamadanDate(date);
}

// The fasting window for the day that `now` belongs to.
export function fastWindow(now = new Date()) {
  const t = timesFor(now);
  const m = now.getHours() * 60 + now.getMinutes();
  const suhoorEnd = t.fajr, iftar = t.maghrib;
  const state = m < suhoorEnd ? 'suhoor' : m < iftar ? 'fasting' : 'open';
  return {
    state, suhoorEnd, iftar, isha: t.isha,
    suhoorClock: S.fmtMin(suhoorEnd), iftarClock: S.fmtMin(iftar),
    toIftar: iftar - m, toSuhoorEnd: state === 'suhoor' ? suhoorEnd - m : suhoorEnd + 1440 - m,
    pct: state === 'fasting' ? (m - suhoorEnd) / (iftar - suhoorEnd) : state === 'open' ? 1 : 0,
    lengthMin: iftar - suhoorEnd,
  };
}

// Meal clock while fasting: suhoor before dawn, iftar at sunset, a proper meal later.
export function fastingMealTimes(now = new Date()) {
  const t = timesFor(now);
  return { breakfast: S.fmtMin(t.fajr - 40), dinner: S.fmtMin(t.maghrib), lunch: S.fmtMin((t.isha ?? t.maghrib + 90) + 30), snack: S.fmtMin(t.maghrib + 150) };
}
export const FAST_LABEL = { breakfast: 'Suhoor', lunch: 'Late meal', dinner: 'Iftar', snack: 'Night snack / shake' };
export const FAST_EMOJI = { breakfast: '🌌', lunch: '🍛', dinner: '🌙', snack: '🥤' };

export function countdown(min) {
  if (min == null || !Number.isFinite(min)) return '';
  min = Math.max(0, Math.round(min));
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}
