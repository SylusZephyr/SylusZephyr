// Account + cross-device sync + remote content, backed by Supabase.
// Everything here is optional: with no project configured the app stays fully local.
import * as S from './store.js';
import { CLOUD, AUTH_REDIRECT } from './config.js';
import { merge, stripLocal } from './sync.js';
import { isNative } from './native.js';

const CFG_KEY = 'revive.cloud';
const CONTENT_KEY = 'revive.content';
const DEVICE_KEY = 'revive.device';

let client = null;
let session = null;
let channel = null;
let pushTimer = null;
let applyingRemote = false;
const listeners = new Set();
export const status = { configured: false, user: null, lastSync: null, syncing: false, error: null, online: navigator.onLine };

const deviceId = (() => {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(DEVICE_KEY, id); }
  return id;
})();

function emit() { listeners.forEach((fn) => { try { fn(status); } catch (e) {} }); }
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function getConfig() {
  try { const saved = JSON.parse(localStorage.getItem(CFG_KEY) || 'null'); if (saved?.url && saved?.anonKey) return saved; } catch (e) {}
  return CLOUD.url && CLOUD.anonKey ? CLOUD : null;
}
export function saveConfig(url, anonKey) {
  localStorage.setItem(CFG_KEY, JSON.stringify({ url: url.trim().replace(/\/$/, ''), anonKey: anonKey.trim() }));
}
export function clearConfig() { localStorage.removeItem(CFG_KEY); }

function platform() {
  if (window.reviveDesktop) return 'desktop';
  if (isNative) return window.Capacitor.getPlatform();
  return 'web';
}

function loadLibrary() {
  if (window.supabase?.createClient) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script'); s.src = 'js/vendor/supabase.js';
    s.onload = resolve; s.onerror = () => reject(new Error('Could not load sync library'));
    document.head.appendChild(s);
  });
}

export async function init() {
  const cfg = getConfig();
  status.configured = !!cfg;
  if (!cfg) { emit(); return; }
  try {
    await loadLibrary();
    client = window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: platform() === 'web', flowType: 'pkce', storageKey: 'revive.auth' },
      realtime: { params: { eventsPerSecond: 5 } },
    });
    client.auth.onAuthStateChange((_event, s) => { setSession(s); });
    const { data } = await client.auth.getSession();
    setSession(data.session);
    listenForDeepLinks();
    fetchContent();
  } catch (e) { status.error = e.message; emit(); }
  window.addEventListener('online', () => { status.online = true; emit(); if (session) pullAndMerge(); });
  window.addEventListener('offline', () => { status.online = false; emit(); });
}

function setSession(s) {
  const was = session?.user?.id;
  session = s;
  status.user = s?.user ? { id: s.user.id, email: s.user.email, provider: s.user.app_metadata?.provider } : null;
  emit();
  if (s?.user && s.user.id !== was) { pullAndMerge().then(subscribe); }
  if (!s?.user && channel) { client.removeChannel(channel); channel = null; }
}

// ---------- Sign-in ----------
export async function sendEmailCode(email) {
  if (!client) throw new Error('Cloud not connected');
  const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw error;
}
export async function verifyEmailCode(email, token) {
  const { error } = await client.auth.verifyOtp({ email, token: token.trim(), type: 'email' });
  if (error) throw error;
}

export async function signInWithGoogle() {
  if (!client) throw new Error('Cloud not connected');
  const p = platform();
  if (p === 'web') {
    const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
    if (error) throw error;
    return;
  }
  // Native and desktop: open the system browser and come back through a deep link.
  const redirectTo = AUTH_REDIRECT[p === 'desktop' ? 'desktop' : p] || AUTH_REDIRECT.ios;
  const { data, error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } });
  if (error) throw error;
  if (p === 'desktop') window.reviveDesktop.openExternal(data.url);
  else await window.Capacitor.Plugins.Browser.open({ url: data.url, presentationStyle: 'popover' });
}

let deepLinksBound = false;
function listenForDeepLinks() {
  if (deepLinksBound) return; deepLinksBound = true;
  const handle = async (url) => {
    if (!url || !url.includes('auth-callback')) return;
    const code = new URL(url.replace(/^[a-z.]+:\/\//i, 'https://x/')).searchParams.get('code');
    if (!code) return;
    try { await client.auth.exchangeCodeForSession(code); } catch (e) { status.error = e.message; emit(); }
    if (isNative) window.Capacitor.Plugins.Browser?.close().catch(() => {});
  };
  if (window.reviveDesktop) window.reviveDesktop.onDeepLink(handle);
  if (isNative) window.Capacitor.Plugins.App?.addListener('appUrlOpen', (e) => handle(e.url));
}

export async function signOut() {
  if (!client) return;
  await pushNow();
  await client.auth.signOut();
}

// Permanently removes the cloud account and its synced data (local data on this device is kept).
export async function deleteAccount() {
  if (!client || !session?.user) return;
  const { error } = await client.rpc('delete_my_account');
  if (error) throw error;
  await client.auth.signOut().catch(() => {});
}

// ---------- Sync ----------
async function pullAndMerge() {
  if (!client || !session?.user) return;
  status.syncing = true; emit();
  try {
    const { data, error } = await client.from('user_state').select('state, updated_at, device_id').eq('user_id', session.user.id).maybeSingle();
    if (error) throw error;
    if (data?.state) applyRemote(data.state);
    await pushNow();
    status.lastSync = Date.now(); status.error = null;
  } catch (e) { status.error = e.message || String(e); }
  status.syncing = false; emit();
}

function applyRemote(remote) {
  const local = S.get();
  const merged = merge(local, remote);
  applyingRemote = true;
  S.replace(merged);
  applyingRemote = false;
}

function subscribe() {
  if (!client || !session?.user || channel) return;
  channel = client.channel('state-' + session.user.id)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_state', filter: `user_id=eq.${session.user.id}` }, (payload) => {
      const row = payload.new;
      if (!row || row.device_id === deviceId) return;
      applyRemote(row.state);
      status.lastSync = Date.now(); emit();
      window.dispatchEvent(new CustomEvent('revive:remote-update'));
    })
    .subscribe();
}

// Called after every local save (debounced).
export function schedulePush() {
  if (applyingRemote || !client || !session?.user) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushNow, 2500);
}
export async function pushNow() {
  clearTimeout(pushTimer);
  if (!client || !session?.user || !navigator.onLine) return;
  const state = stripLocal(S.get());
  const { error } = await client.from('user_state').upsert({ user_id: session.user.id, state, device_id: deviceId, updated_at: new Date().toISOString() });
  if (error) { status.error = error.message; emit(); return; }
  status.lastSync = Date.now(); status.error = null; emit();
}
export const syncNow = () => pullAndMerge();

// ---------- Remote content (recipes, tips, stories published from the dashboard) ----------
export function cachedContent() {
  try { return JSON.parse(localStorage.getItem(CONTENT_KEY) || 'null') || { items: [], fetchedAt: null }; } catch (e) { return { items: [], fetchedAt: null }; }
}
async function fetchContent() {
  if (!client || !navigator.onLine) return;
  try {
    const { data, error } = await client.from('content').select('id, kind, data, updated_at').eq('published', true).order('updated_at', { ascending: true });
    if (error) throw error;
    localStorage.setItem(CONTENT_KEY, JSON.stringify({ items: data || [], fetchedAt: Date.now() }));
    window.dispatchEvent(new CustomEvent('revive:content'));
  } catch (e) { /* keep cached content */ }
}
