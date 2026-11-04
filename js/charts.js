// Tiny dependency-free SVG charts.
export function lineChart(points, { h = 140, color = '#ffb547', min, max, band, labels = true, unit = '', goal } = {}) {
  const W = 340; const H = h; const pl = 30, pr = 10, pt = 12, pb = 22;
  if (!points.length) return `<div class="empty small"><span class="e">📉</span>No data yet</div>`;
  const ys = points.map((p) => p.y);
  let lo = min ?? Math.min(...ys, band ? band[0] : Infinity, goal ?? Infinity); let hi = max ?? Math.max(...ys, band ? band[1] : -Infinity, goal ?? -Infinity);
  if (lo === hi) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
  const n = points.length;
  const X = (i) => pl + (n === 1 ? (W - pl - pr) / 2 : (i * (W - pl - pr)) / (n - 1));
  const Y = (v) => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
  const area = `${path} L${X(n - 1)},${H - pb} L${X(0)},${H - pb} Z`;
  const ticks = [lo + pad, (lo + hi) / 2, hi - pad];
  const id = 'g' + Math.random().toString(36).slice(2, 7);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    ${band ? `<rect x="${pl}" y="${Y(band[1])}" width="${W - pl - pr}" height="${Math.max(0, Y(band[0]) - Y(band[1]))}" fill="rgba(52,211,153,0.10)" rx="4"/>` : ''}
    ${goal != null ? `<line x1="${pl}" x2="${W - pr}" y1="${Y(goal)}" y2="${Y(goal)}" stroke="rgba(52,211,153,.6)" stroke-dasharray="4 4"/>` : ''}
    ${ticks.map((t) => `<line x1="${pl}" x2="${W - pr}" y1="${Y(t)}" y2="${Y(t)}" stroke="rgba(255,255,255,.06)"/><text x="${pl - 4}" y="${Y(t) + 3}" text-anchor="end">${fmt(t)}${unit}</text>`).join('')}
    <path d="${area}" fill="url(#${id})"/>
    <path d="${path}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${points.map((p, i) => `<circle cx="${X(i)}" cy="${Y(p.y)}" r="${i === n - 1 ? 4.5 : 2.5}" fill="${i === n - 1 ? color : '#0b0f1a'}" stroke="${color}" stroke-width="2"/>`).join('')}
    ${labels ? points.map((p, i) => (n <= 8 || i % Math.ceil(n / 6) === 0 || i === n - 1) ? `<text x="${X(i)}" y="${H - 6}" text-anchor="${n > 1 && i === n - 1 ? 'end' : n > 1 && i === 0 ? 'start' : 'middle'}">${p.label ?? ''}</text>` : '').join('') : ''}
  </svg>`;
}
const fmt = (v) => (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10);

export function barChart(bars, { h = 120, color = '#5aa9ff', max, goal } = {}) {
  const W = 340; const H = h; const pb = 20, pt = 8;
  if (!bars.length) return '';
  const hi = max ?? Math.max(...bars.map((b) => b.y), goal ?? 0, 1);
  const bw = (W - 10) / bars.length;
  const Y = (v) => pt + (1 - v / hi) * (H - pt - pb);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">
    ${goal ? `<line x1="0" x2="${W}" y1="${Y(goal)}" y2="${Y(goal)}" stroke="rgba(52,211,153,.6)" stroke-dasharray="4 4"/>` : ''}
    ${bars.map((b, i) => { const y = Y(Math.min(hi, b.y)); return `<rect x="${5 + i * bw + bw * 0.18}" y="${y}" width="${bw * 0.64}" height="${Math.max(0, H - pb - y)}" rx="4" fill="${b.color || color}" opacity="${b.dim ? 0.35 : 1}"/>
      <text x="${5 + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${b.label ?? ''}</text>`; }).join('')}
  </svg>`;
}

// Sleep timeline: bars from bed to wake on a 18:00 → 14:00 axis.
export function sleepChart(nights, { h = 160, target } = {}) {
  const W = 340; const H = h; const pl = 34, pr = 6, pt = 6, pb = 18;
  if (!nights.length) return `<div class="empty small"><span class="e">🌙</span>Log a few nights to see your pattern</div>`;
  const AX0 = 18 * 60; const SPAN = 20 * 60; // 18:00 → 14:00
  const toAx = (hhmm) => ((((hhmm - AX0) % 1440) + 1440) % 1440);
  const rowH = (H - pt - pb) / nights.length;
  const X = (m) => pl + (m / SPAN) * (W - pl - pr);
  const hours = [20, 0, 4, 8, 12];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">
    ${hours.map((hh) => { const x = X(toAx(hh * 60)); return `<line x1="${x}" x2="${x}" y1="${pt}" y2="${H - pb}" stroke="rgba(255,255,255,.06)"/><text x="${x}" y="${H - 5}" text-anchor="middle">${hh === 0 ? '12a' : hh === 12 ? '12p' : hh > 12 ? (hh - 12) + 'p' : hh + 'a'}</text>`; }).join('')}
    ${target ? `<rect x="${X(toAx(target.bed))}" y="${pt}" width="${Math.max(0, X(toAx(target.wake)) - X(toAx(target.bed)))}" height="${H - pt - pb}" fill="rgba(167,139,250,0.08)"/>` : ''}
    ${nights.map((n, i) => { const a = toAx(n.bed), b = toAx(n.wake); const y = pt + i * rowH + rowH * 0.2; const x1 = X(a), x2 = X(b >= a ? b : a); return `<text x="${pl - 4}" y="${y + rowH * 0.45}" text-anchor="end">${n.label}</text><rect x="${x1}" y="${y}" width="${Math.max(2, x2 - x1)}" height="${rowH * 0.6}" rx="${rowH * 0.3}" fill="url(#sl)"/>`; }).join('')}
    <defs><linearGradient id="sl" x1="0" x2="1"><stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#5aa9ff"/></linearGradient></defs>
  </svg>`;
}
