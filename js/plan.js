// Personal plan logic: sleep schedule shifting, nutrition targets, meal slots, wind-down.
import * as S from './store.js';
import * as Pr from './prayer.js';

export function nutritionTargets() {
  const p = S.get().profile;
  const w = latestWeight() ?? p.startKg;
  const bmr = 10 * w + 6.25 * p.heightCm - 5 * p.age + 5; // Mifflin-St Jeor
  const tdee = bmr * 1.4;
  const kcal = Math.round((tdee + 300) / 50) * 50;      // gentle surplus for 0.1–0.25 kg/week
  const protein = Math.round(w * 1.6);
  return { kcal, protein, bmr: Math.round(bmr), tdee: Math.round(tdee) };
}

export function latestWeight() {
  const ws = S.get().weights; if (!ws.length) return null;
  return [...ws].sort((a, b) => a.date.localeCompare(b.date)).at(-1).kg;
}

// Bedtime target: starts at the current habitual bedtime and moves 15 min earlier
// every 3 days until it reaches (wake anchor − sleep need).
export function sleepTargets(k = S.dayKey()) {
  const p = S.get().profile;
  const wake = S.minutesOf(p.wakeAnchor);
  const ideal = (wake - p.sleepNeedMin + 1440) % 1440;
  const start = S.minutesOf(p.currentBedtime);
  const started = p.bedShiftStartedOn || k;
  const days = Math.max(0, S.daysBetween(started, k));
  const shift = Math.floor(days / 3) * 15;
  // distance from start back to ideal (going earlier), in minutes, modulo a day
  const gap = ((start - ideal) + 1440) % 1440;
  const effGap = gap > 720 ? 0 : gap; // if ideal is "later" than start, no shift needed
  const moved = Math.min(effGap, shift);
  const bed = (start - moved + 1440) % 1440;
  const windDown = (bed - 60 + 1440) % 1440;
  const daysLeft = Math.ceil(Math.max(0, effGap - moved) / 15) * 3;
  return { wake: S.fmtMin(wake), bed: S.fmtMin(bed), ideal: S.fmtMin(ideal), windDown: S.fmtMin(windDown), daysLeft, reached: moved >= effGap };
}

// Is "now" inside the wind-down window (wind-down start → wake time)?
export function inWindDown(now = new Date()) {
  const st = S.get(); if (!st.settings.winddown) return false;
  const t = sleepTargets();
  const m = now.getHours() * 60 + now.getMinutes();
  const a = S.minutesOf(t.windDown); const b = (S.minutesOf(t.wake) - 120 + 1440) % 1440; // until 2h before wake
  return a <= b ? (m >= a && m < b) : (m >= a || m < b);
}

// Suggested meal slot for current time relative to wake anchor.
export function currentSlot(now = new Date()) {
  if (Pr.fasting(now)) {
    const f = Pr.fastWindow(now); const m = now.getHours() * 60 + now.getMinutes();
    if (f.state === 'suhoor') return 'breakfast';
    if (f.state === 'fasting') return 'dinner';
    return m < (f.isha ?? f.iftar + 90) + 30 ? 'dinner' : m < f.iftar + 240 ? 'lunch' : 'snack';
  }
  const p = S.get().profile; const d = S.day();
  const wake = S.minutesOf(d.sleep.wake || p.wakeAnchor);
  const m = now.getHours() * 60 + now.getMinutes();
  const since = (m - wake + 1440) % 1440;
  if (since < 210) return 'breakfast';
  if (since < 450) return 'lunch';
  if (since < 780) return 'dinner';
  return 'snack';
}
export const BASE_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack / shake' };
const BASE_EMOJI = { breakfast: '', lunch: '', dinner: '', snack: '' };
// Labels follow fasting mode (Suhoor / Iftar) without every caller needing to know.
export const SLOT_LABEL = new Proxy(BASE_LABEL, { get: (o, k) => (Pr.fasting() ? Pr.FAST_LABEL : o)[k] });
export const SLOT_EMOJI = new Proxy(BASE_EMOJI, { get: (o, k) => (Pr.fasting() ? Pr.FAST_EMOJI : o)[k] });

export function mealTimes() {
  if (Pr.fasting()) return Pr.fastingMealTimes();
  const p = S.get().profile; const w = S.minutesOf(p.wakeAnchor);
  return { breakfast: S.fmtMin(w + 60), lunch: S.fmtMin(w + 330), dinner: S.fmtMin(w + 600), snack: S.fmtMin(w + 450) };
}

export function dayTotals(k = S.dayKey()) {
  const d = S.get().days[k]; if (!d) return { kcal: 0, protein: 0 };
  return d.meals.reduce((a, m) => ({ kcal: a.kcal + (m.kcal || 0), protein: a.protein + (m.protein || 0) }), { kcal: 0, protein: 0 });
}

export function sleepDurationMin(bed, wake) {
  const b = S.minutesOf(bed); const w = S.minutesOf(wake); if (b == null || w == null) return null;
  return (w - b + 1440) % 1440;
}

export function programWeek() {
  const st = S.get(); const start = st.programStart || S.dayKey(new Date(st.createdAt));
  const days = S.daysBetween(start, S.dayKey());
  return Math.floor(days / 7) + 1;
}

export const PROGRAM = [
  { w: 1, t: 'Medical safety & regular eating', goals: ['Book your follow-up doctor visit (Me → Medical)', 'Breakfast every day', 'Two more eating opportunities daily', 'Increase fluids gradually', 'No strenuous exercise until cleared'] },
  { w: 2, t: 'Three meals & sleep consistency', goals: ['Repeat your 5 easiest recipes', 'Use the calendar reminders', 'Same wake time every day', 'Coffee before cutoff'] },
  { w: 3, t: 'Build strength & stamina safely', goals: ['If cleared: gentle cycling/walking', 'Pelvic-floor sessions 2–3× daily', 'Add a daily shake'] },
  { w: 4, t: 'Review & refine', goals: ['Compare check-in scores', 'Review any test results', 'Keep what worked, simplify what you missed'] },
];

// Coffee after the cutoff — times between midnight and 4 AM belong to the
// previous day and are always "late".
export function isAfterCutoff(hhmm) {
  const m = S.minutesOf(hhmm); if (m == null) return false;
  if (Pr.fasting()) {
    // While fasting, coffee only happens after iftar: the rule becomes "not in the 6 h before bed".
    const dm = (x) => ((x - S.DAY_ROLLOVER_HOUR * 60) + 1440) % 1440;
    return dm(m) > dm(S.minutesOf(sleepTargets().bed)) - 360;
  }
  if (m < S.DAY_ROLLOVER_HOUR * 60) return true;
  return m >= S.minutesOf(S.get().profile.caffeineCutoff);
}
