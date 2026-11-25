// Merges two copies of the app state (this device vs. the cloud) without losing entries.
// Rules: days keep whichever copy has more activity; lists are unioned by a stable key;
// counters take the max; profile/settings follow the copy edited most recently.

const LOCAL_ONLY = ['lock', 'closedDays', 'remindersSyncedFor', 'nativeReminders', 'lastExportAt'];

const activity = (d) => (d ? (d.xpToday || 0) + (d.meals?.length || 0) * 5 + Object.values(d.checks || {}).filter(Boolean).length * 3 + (d.waterMl || 0) / 250 : -1);

function unionBy(a = [], b = [], key) {
  const map = new Map();
  for (const x of [...a, ...b]) { const k = key(x); if (!map.has(k)) map.set(k, x); }
  return [...map.values()];
}
const unique = (a = [], b = []) => [...new Set([...a, ...b])];

// Same day logged on two devices or windows: combine field by field instead of picking one copy.
// Meals are unioned by id minus anything deleted on either side; counters take the larger value;
// checks are ticked if ticked anywhere; single answers come from the busier copy.
export function mergeDay(a, b) {
  const [main, other] = activity(a) >= activity(b) ? [a, b] : [b, a];
  const removed = unique(a.removedMeals, b.removedMeals);
  const out = { ...other, ...main };
  out.removedMeals = removed;
  out.meals = unionBy(main.meals, other.meals, (m) => m.id || `${m.time}|${m.name}`).filter((m) => !removed.includes(m.id));
  out.coffee = (main.coffee || []).length >= (other.coffee || []).length ? main.coffee || [] : other.coffee || [];
  out.waterMl = Math.max(main.waterMl || 0, other.waterMl || 0);
  out.checks = { ...(other.checks || {}) }; for (const [k, v] of Object.entries(main.checks || {})) out.checks[k] = !!(v || out.checks[k]);
  out.xpLog = { ...(other.xpLog || {}), ...(main.xpLog || {}) };
  out.xpToday = Object.values(out.xpLog).reduce((s, x) => s + (+x || 0), 0) || Math.max(main.xpToday || 0, other.xpToday || 0);
  for (const k of ['pf', 'walkMin', 'breath', 'cookedCount']) if (main[k] != null || other[k] != null) out[k] = Math.max(main[k] || 0, other[k] || 0);
  out.sleep = main.sleep?.wake ? main.sleep : other.sleep?.wake ? other.sleep : main.sleep || other.sleep;
  for (const k of ['energy', 'mood', 'appetite', 'notes']) if (main[k] == null && other[k] != null) out[k] = other[k];
  return out;
}

export function stripLocal(state) {
  const out = { ...state };
  for (const k of LOCAL_ONLY) delete out[k];
  return out;
}

export function merge(local, remote) {
  if (!remote) return local;
  if (!local) return remote;
  const newer = (remote.editedAt || 0) > (local.editedAt || 0) ? remote : local;
  const out = { ...local };

  out.onboarded = local.onboarded || remote.onboarded;
  out.profile = { ...newer.profile };
  out.settings = { ...local.settings, ...(newer === remote ? remote.settings : {}) };
  out.medical = {
    ...newer.medical,
    visits: unionBy(local.medical?.visits, remote.medical?.visits, (x) => x.id),
    labs: unionBy(local.medical?.labs, remote.medical?.labs, (x) => x.id),
    questions: newer.medical?.questions || local.medical?.questions,
  };

  out.days = { ...remote.days };
  for (const [k, d] of Object.entries(local.days || {})) out.days[k] = out.days[k] ? mergeDay(d, out.days[k]) : d;

  out.checkins = { ...remote.checkins };
  for (const [wk, c] of Object.entries(local.checkins || {})) out.checkins[wk] = { ...(out.checkins[wk] || {}), ...c };

  out.weights = unionBy(local.weights, remote.weights, (w) => w.date).sort((a, b) => a.date.localeCompare(b.date));
  out.pantry = newer.pantry || local.pantry;
  out.shopping = newer.shopping || local.shopping;
  out.favorites = unique(local.favorites, remote.favorites);
  out.savedTips = unique(local.savedTips, remote.savedTips);
  out.likedTips = unique(local.likedTips, remote.likedTips);
  out.cooked = { ...remote.cooked };
  for (const [id, n] of Object.entries(local.cooked || {})) out.cooked[id] = Math.max(n, out.cooked[id] || 0);
  out.storiesSeen = { ...remote.storiesSeen, ...local.storiesSeen };
  out.weekPlan = newer.weekPlan || local.weekPlan;
  out.prayer = newer.prayer || local.prayer;
  out.reminderPrefs = { ...remote.reminderPrefs, ...local.reminderPrefs };
  out.recipeNotes = { ...remote.recipeNotes, ...local.recipeNotes };

  out.pf = {
    ...newer.pf,
    sessions: unionBy(local.pf?.sessions, remote.pf?.sessions, (s) => `${s.date}|${s.at}`),
    control: unionBy(local.pf?.control, remote.pf?.control, (s) => JSON.stringify(s)),
  };
  out.walks = unionBy(local.walks, remote.walks, (w) => JSON.stringify(w));
  out.sxLog = unionBy(local.sxLog, remote.sxLog, (x) => JSON.stringify(x));

  const lg = local.game || {}, rg = remote.game || {};
  out.game = {
    ...newer.game,
    xp: Math.max(lg.xp || 0, rg.xp || 0),
    freezes: Math.max(lg.freezes || 0, rg.freezes || 0),
    bestStreak: Math.max(lg.bestStreak || 0, rg.bestStreak || 0),
    badges: { ...rg.badges, ...lg.badges },
    frozen: { ...rg.frozen, ...lg.frozen },
    challenges: { ...rg.challenges, ...lg.challenges },
    moments: { ...rg.moments, ...lg.moments },
  };
  out.createdAt = Math.min(local.createdAt || Date.now(), remote.createdAt || Date.now());
  out.editedAt = Math.max(local.editedAt || 0, remote.editedAt || 0);
  return out;
}
