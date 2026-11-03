// Generates an .ics file of daily repeating reminders that iPhone Calendar can import.
import * as S from './store.js';
import { sleepTargets, mealTimes } from './plan.js';

const fold = (s) => s.replace(/[,;\\]/g, (c) => '\\' + c);

export function reminderList() {
  const p = S.get().profile; const t = sleepTargets(); const m = mealTimes();
  const wake = S.minutesOf(p.wakeAnchor);
  return [
    { id: 'wake', on: true, time: p.wakeAnchor, title: '⏰ Wake up — same time every day', desc: 'Open the curtains or step outside for 10 minutes of daylight.' },
    { id: 'breakfast', on: true, time: m.breakfast, title: '🍳 Breakfast time', desc: 'Egg paratha, overnight oats or a shake. Log it in Revive for XP.' },
    { id: 'water1', on: true, time: S.fmtMin(wake + 180), title: '💧 Drink a glass of water', desc: 'Refill your bottle.' },
    { id: 'kegel1', on: true, time: S.fmtMin(wake + 120), title: '💪 Pelvic-floor session (3 min)', desc: 'Open Revive → Train.' },
    { id: 'coffee', on: true, time: S.fmtMin(S.minutesOf(p.caffeineCutoff) - 30), title: '☕ Last call for coffee', desc: 'Caffeine cutoff in 30 minutes.' },
    { id: 'lunch', on: true, time: m.lunch, title: '🌯 Lunch time', desc: 'Chicken-cheese wrap or a Meituan halal order.' },
    { id: 'snack', on: true, time: m.snack, title: '🥤 Shake / snack', desc: 'Banana PB shake, protein milk + dates.' },
    { id: 'water2', on: true, time: S.fmtMin(wake + 420), title: '💧 Water check', desc: 'Aim for 2 L today.' },
    { id: 'kegel2', on: true, time: S.fmtMin(wake + 480), title: '💪 Pelvic-floor session (3 min)', desc: 'Open Revive → Train.' },
    { id: 'dinner', on: true, time: m.dinner, title: '🍛 Dinner time', desc: 'Air-fryer chicken curry + paratha.' },
    { id: 'prep', on: true, time: S.fmtMin(S.minutesOf(t.windDown) - 30), title: '🥣 Prep tomorrow’s breakfast', desc: 'Overnight oats jar or marinate chicken in a bag.' },
    { id: 'winddown', on: true, time: t.windDown, title: '🌙 Wind-down starts', desc: 'Dim lights, screens down, breathing session in Revive.' },
    { id: 'bed', on: true, time: t.bed, title: '🛌 Bedtime target', desc: 'Lights out. Phone away from the bed.' },
  ];
}

export function buildICS(items) {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const today = S.dayKey().replace(/-/g, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Revive//Recovery//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Revive'];
  items.filter((i) => i.on).forEach((i) => {
    const [h, m] = i.time.split(':');
    lines.push('BEGIN:VEVENT',
      `UID:revive-${i.id}-${today}@revive.local`, `DTSTAMP:${stamp}`,
      `DTSTART:${today}T${h}${m}00`, `DURATION:PT10M`, 'RRULE:FREQ=DAILY',
      `SUMMARY:${fold(i.title)}`, `DESCRIPTION:${fold(i.desc)}`, 'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${fold(i.title)}`, 'TRIGGER:PT0M', 'END:VALARM',
      'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadICS(items) {
  const blob = new Blob([buildICS(items)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'revive-reminders.ics';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

// iOS Home Screen apps sometimes ignore blob downloads — share the file instead.
export async function shareICS(items) {
  const file = new File([buildICS(items)], 'revive-reminders.ics', { type: 'text/calendar' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Revive reminders' }); return true; }
  return false;
}
