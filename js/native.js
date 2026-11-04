// Native iOS bridge (Capacitor). Every function is a safe no-op on the web/PWA.
// Plugins are reached through window.Capacitor.Plugins so the web build needs no bundler.

export const isNative = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
const plug = (name) => (isNative ? window.Capacitor.Plugins?.[name] : null);

// ---------- Durable storage ----------
// WKWebView localStorage can be cleared by iOS under storage pressure, so the state is
// mirrored to native UserDefaults (Preferences) and restored on launch if needed.
const KEY = 'revive.v1';
export async function restoreStorage() {
  const Prefs = plug('Preferences'); if (!Prefs) return;
  try {
    const local = localStorage.getItem(KEY);
    const { value } = await Prefs.get({ key: KEY });
    if (!value) return;
    if (!local) { localStorage.setItem(KEY, value); return; }
    // Keep whichever copy saw more activity.
    const a = JSON.parse(local), b = JSON.parse(value);
    const score = (s) => (s?.game?.xp || 0) + Object.keys(s?.days || {}).length;
    if (score(b) > score(a)) localStorage.setItem(KEY, value);
  } catch (e) { /* keep local */ }
}
let prefTimer = null;
export function persist(json) {
  const Prefs = plug('Preferences'); if (!Prefs) return;
  clearTimeout(prefTimer);
  prefTimer = setTimeout(() => { Prefs.set({ key: KEY, value: json }).catch(() => {}); }, 400);
}
export async function clearPersisted() { const Prefs = plug('Preferences'); if (Prefs) await Prefs.remove({ key: KEY }).catch(() => {}); }

// ---------- Haptics ----------
export function haptic(kind = 'light') {
  const H = plug('Haptics'); if (!H) return false;
  if (kind === 'success') H.notification({ type: 'SUCCESS' }).catch(() => {});
  else if (kind === 'error') H.notification({ type: 'ERROR' }).catch(() => {});
  else H.impact({ style: kind === 'heavy' ? 'HEAVY' : kind === 'medium' ? 'MEDIUM' : 'LIGHT' }).catch(() => {});
  return true;
}

// ---------- Face ID / Touch ID ----------
export async function biometricAvailable() {
  const B = plug('NativeBiometric'); if (!B) return false;
  try { const r = await B.isAvailable(); return !!r?.isAvailable; } catch (e) { return false; }
}
export async function biometricVerify(reason = 'Unlock Revive') {
  const B = plug('NativeBiometric'); if (!B) return false;
  try { await B.verifyIdentity({ reason, title: 'Unlock Revive', useFallback: false }); return true; } catch (e) { return false; }
}

// ---------- Local notifications (real reminders) ----------
const BASE_ID = 7100;
export async function notificationsAllowed() {
  const N = plug('LocalNotifications'); if (!N) return false;
  try { const p = await N.checkPermissions(); return p.display === 'granted'; } catch (e) { return false; }
}
export async function requestNotifications() {
  const N = plug('LocalNotifications'); if (!N) return false;
  try { const p = await N.requestPermissions(); return p.display === 'granted'; } catch (e) { return false; }
}
export async function cancelReminders() {
  const N = plug('LocalNotifications'); if (!N) return;
  try {
    const { notifications } = await N.getPending();
    const ours = (notifications || []).filter((n) => n.id >= BASE_ID && n.id < BASE_ID + 100).map((n) => ({ id: n.id }));
    if (ours.length) await N.cancel({ notifications: ours });
  } catch (e) {}
}
// items: [{ id, on, time:'HH:MM', title, desc }]
export async function scheduleReminders(items) {
  const N = plug('LocalNotifications'); if (!N) return 0;
  await cancelReminders();
  const list = items.filter((i) => i.on).map((i, idx) => {
    const [hour, minute] = i.time.split(':').map(Number);
    return { id: BASE_ID + idx, title: i.title, body: i.desc, schedule: { on: { hour, minute }, allowWhileIdle: true }, extra: { route: i.route || 'today' } };
  });
  if (list.length) await N.schedule({ notifications: list });
  return list.length;
}
export function onNotificationTap(cb) {
  const N = plug('LocalNotifications'); if (!N) return;
  N.addListener('localNotificationActionPerformed', (e) => cb(e?.notification?.extra?.route || 'today')).catch?.(() => {});
}

// ---------- Share (doctor summary, export) ----------
export async function shareText(title, text) {
  const Sh = plug('Share'); if (!Sh) return false;
  try { await Sh.share({ title, text, dialogTitle: title }); return true; } catch (e) { return true; /* user cancelled */ }
}
export async function shareFile(filename, contents, title = 'Revive') {
  const Fs = plug('Filesystem'), Sh = plug('Share'); if (!Fs || !Sh) return false;
  try {
    const r = await Fs.writeFile({ path: filename, data: contents, directory: 'CACHE', encoding: 'utf8' });
    await Sh.share({ title, url: r.uri, dialogTitle: title });
    return true;
  } catch (e) { return false; }
}

// ---------- Status bar / splash ----------
export function initChrome() {
  const SB = plug('StatusBar'); if (SB) { SB.setStyle({ style: 'DARK' }).catch(() => {}); }
  const SS = plug('SplashScreen'); if (SS) setTimeout(() => SS.hide().catch(() => {}), 250);
  if (isNative) document.documentElement.classList.add('native');
}
