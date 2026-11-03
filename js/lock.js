// App lock: Face ID via WebAuthn platform passkey (on-device check), with a PIN fallback.
// Note: this is a privacy screen for the app UI. Data lives in this browser's storage.
import * as S from './store.js';
import * as UI from './ui.js';

const enc = new TextEncoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function hashPin(pin) {
  const salt = 'revive-local-salt';
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(salt + ':' + pin));
  return b64(buf);
}

export async function faceIdAvailable() {
  try {
    return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
  } catch (e) { return false; }
}

export async function registerFaceId() {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge, rp: { name: 'Revive' },
      user: { id: userId, name: 'revive-user', displayName: 'Revive' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      timeout: 60000, attestation: 'none',
    },
  });
  if (!cred) throw new Error('No credential');
  return b64(cred.rawId);
}

export async function verifyFaceId(credId) {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const res = await navigator.credentials.get({
    publicKey: { challenge, allowCredentials: [{ type: 'public-key', id: unb64(credId) }], userVerification: 'required', timeout: 60000 },
  });
  return !!res;
}

let unlocked = false;
export function isUnlocked() { return unlocked || !S.get().lock.enabled; }
export function lockNow() { if (S.get().lock.enabled) { unlocked = false; } }

export function showLock(onUnlock) {
  const st = S.get();
  if (!st.lock.enabled) { unlocked = true; onUnlock(); return; }
  let pin = '';
  const close = UI.fullscreen(`<div class="lock">
      <div class="logo">🔥</div>
      <h2>Revive is locked</h2>
      <div class="dots" id="pin-dots">${'<i></i>'.repeat(4)}</div>
      <div class="keypad">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-k="${n}">${n}</button>`).join('')}
        ${st.lock.faceId ? `<button data-face style="font-size:22px">${UI.ICON.face}</button>` : '<button class="empty"></button>'}
        <button data-k="0">0</button>
        <button data-del style="font-size:18px">⌫</button>
      </div>
    </div>`, {
    onMount: (w, closeFn) => {
      const dots = w.querySelector('#pin-dots');
      const paint = () => [...dots.children].forEach((d, i) => d.classList.toggle('on', i < pin.length));
      const done = () => { unlocked = true; closeFn(); onUnlock(); };
      const tryFace = async () => { try { if (await verifyFaceId(st.lock.credId)) done(); } catch (e) { /* fall back to PIN */ } };
      w.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', async () => {
        if (pin.length >= 4) return; pin += b.dataset.k; paint(); UI.haptic(8);
        if (pin.length === 4) {
          if (await hashPin(pin) === st.lock.pinHash) done();
          else { dots.classList.add('shake'); UI.haptic(60); setTimeout(() => { dots.classList.remove('shake'); pin = ''; paint(); }, 450); }
        }
      }));
      w.querySelector('[data-del]').addEventListener('click', () => { pin = pin.slice(0, -1); paint(); });
      const fb = w.querySelector('[data-face]'); if (fb) { fb.svgSize = 1; fb.addEventListener('click', tryFace); fb.querySelector('svg').style.width = '30px'; }
      if (st.lock.faceId && st.lock.credId) setTimeout(tryFace, 350);
    },
  });
  return close;
}

// Set-up flow inside a sheet.
export function setupSheet(onDone) {
  let first = null; let pin = '';
  UI.openSheet(`<h2>Set a 4-digit PIN</h2><p class="muted small" id="pin-msg">Choose a PIN you will remember.</p>
    <div class="row mt16" style="justify-content:center"><div class="dots lock-dots" id="sdots" style="display:flex;gap:16px">${'<i style="width:14px;height:14px;border-radius:7px;border:2px solid var(--muted);display:block"></i>'.repeat(4)}</div></div>
    <div class="row mt16" style="justify-content:center"><div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-k="${n}">${n}</button>`).join('')}<button class="empty"></button><button data-k="0">0</button><button data-del style="font-size:18px">⌫</button></div></div>`, {
    onMount: (sh, close) => {
      const dots = sh.querySelector('#sdots'); const msg = sh.querySelector('#pin-msg');
      const paint = () => [...dots.children].forEach((d, i) => { d.style.background = i < pin.length ? 'var(--amber)' : 'transparent'; d.style.borderColor = i < pin.length ? 'var(--amber)' : 'var(--muted)'; });
      sh.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', async () => {
        if (pin.length >= 4) return; pin += b.dataset.k; paint();
        if (pin.length === 4) {
          if (!first) { first = pin; pin = ''; msg.textContent = 'Enter it again to confirm.'; setTimeout(paint, 150); }
          else if (first === pin) {
            const st = S.get(); st.lock.pinHash = await hashPin(pin); st.lock.enabled = true;
            let face = false;
            if (await faceIdAvailable()) {
              try { st.lock.credId = await registerFaceId(); st.lock.faceId = true; face = true; } catch (e) { st.lock.faceId = false; }
            }
            S.saveNow(); unlocked = true; close();
            UI.toast(face ? 'Lock on: Face ID + PIN' : 'Lock on: PIN', '🔒'); onDone && onDone();
          } else { first = null; pin = ''; msg.textContent = 'PINs did not match — start again.'; paint(); UI.haptic(60); }
        }
      }));
      sh.querySelector('[data-del]').addEventListener('click', () => { pin = pin.slice(0, -1); paint(); });
    },
  });
}
