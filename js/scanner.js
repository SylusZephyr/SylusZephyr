// Barcode capture. Uses the camera with the built-in BarcodeDetector where the platform has it
// (Android, ChromeOS, macOS Chrome); everywhere else the number can be typed in.
import * as UI from './ui.js';

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
export const canScan = () => 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia;

export function scanBarcode() {
  return canScan() ? scanWithCamera().catch(() => typeIn()) : typeIn();
}

function typeIn(note = '') {
  return new Promise((resolve) => {
    let done = false;
    UI.openSheet(`<h2>Enter barcode</h2>
      <p class="muted small mt8">${note || 'Type the 8–13 digits under the barcode on the pack.'}</p>
      <div class="field"><input id="bc-num" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="6901234567892" maxlength="14"></div>
      <button class="btn primary block mt12" id="bc-go">Look up</button>`, {
      onMount: (sh, close) => {
        const inp = sh.querySelector('#bc-num'); setTimeout(() => inp.focus(), 50);
        const go = () => { const v = inp.value.replace(/\D/g, ''); if (v.length < 8) { UI.toast('Barcodes have 8 to 13 digits'); return; } done = true; close(); resolve(v); };
        sh.querySelector('#bc-go').onclick = go;
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      },
      onClose: () => { if (!done) resolve(null); },
    });
  });
}

async function scanWithCamera() {
  const supported = await window.BarcodeDetector.getSupportedFormats?.().catch(() => FORMATS) || FORMATS;
  const detector = new window.BarcodeDetector({ formats: FORMATS.filter((f) => supported.includes(f)) });
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false });
  return new Promise((resolve) => {
    let stopped = false;
    const stop = (closeFn, value) => {
      if (stopped) return; stopped = true;
      stream.getTracks().forEach((t) => t.stop()); closeFn(); resolve(value);
    };
    UI.fullscreen(`<div class="scanner" role="dialog" aria-modal="true" aria-label="Scan a barcode">
      <video playsinline muted autoplay></video>
      <div class="scan-frame" aria-hidden="true"><i></i></div>
      <div class="scan-top"><button class="icon-btn" data-x aria-label="Close">${UI.ICON.close}</button><span>Point at the barcode</span><span style="width:40px"></span></div>
      <div class="scan-bottom"><button class="btn" data-type>Type the number instead</button></div>
    </div>`, {
      onMount: (w, close) => {
        const video = /** @type {HTMLVideoElement} */ (/** @type {unknown} */ (w.querySelector('video'))); video.srcObject = stream;
        w.querySelector('[data-x]').onclick = () => stop(close, null);
        w.querySelector('[data-type]').onclick = () => { stop(close, undefined); };
        const tick = async () => {
          if (stopped) return;
          try {
            if (video.readyState >= 2) {
              const codes = await detector.detect(video);
              const hit = codes.find((c) => /^\d{8,14}$/.test(c.rawValue));
              if (hit) { UI.haptic(40); stop(close, hit.rawValue); return; }
            }
          } catch (e) {}
          setTimeout(tick, 180);
        };
        video.addEventListener('loadeddata', tick, { once: true });
      },
    });
  }).then((v) => (v === undefined ? typeIn() : v));
}
