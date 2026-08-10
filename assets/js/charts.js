// ===========================================================================
//  USMS Control — Gráficas SVG reutilizables (sin dependencias, offline)
//  Paleta validada para superficie oscura (dataviz): ingresos=aqua #199e70,
//  egresos=orange #d95926, balance/serie=blue #3987e5. CVD-safe + etiquetas.
// ===========================================================================
import { el, fmtMoney } from './ui.js';

const NS = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}, children = []) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  for (const c of [].concat(children)) if (c != null) n.append(c.nodeType ? c : document.createTextNode(c));
  return n;
}

export const fmtShort = (n) => {
  const a = Math.abs(n);
  if (a >= 1e6) return '$' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (a >= 1e3) return '$' + (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  return '$' + Math.round(n);
};

// ------------------------------- Tooltip -----------------------------------
let tipEl = null;
function showTip(html, e) {
  if (!tipEl) { tipEl = el('div', { class: 'viz-tip' }); document.body.append(tipEl); }
  tipEl.innerHTML = html;
  tipEl.style.display = 'block';
  moveTip(e);
}
function moveTip(e) {
  if (!tipEl) return;
  const w = tipEl.offsetWidth || 140;
  tipEl.style.left = Math.min((e.clientX || 0) + 14, window.innerWidth - w - 10) + 'px';
  tipEl.style.top = ((e.clientY || 0) + 14) + 'px';
}
function hideTip() { if (tipEl) tipEl.style.display = 'none'; }

// -------------------- Barras agrupadas: Ingresos vs Egresos ----------------
export function barrasTesoreria({ labels, ing, egr }) {
  const W = 640, H = 240, padL = 34, padR = 10, padT = 14, padB = 30;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const max = Math.max(1, ...ing, ...egr);
  const n = Math.max(1, labels.length);
  const gw = plotW / n;
  const bw = Math.max(6, Math.min(22, (gw - 12) / 2));
  const yBase = padT + plotH;
  const kids = [];

  // gridlines + eje Y (recesivo)
  for (let i = 0; i <= 4; i++) {
    const gy = yBase - (i / 4) * plotH;
    kids.push(s('line', { x1: padL, y1: gy, x2: W - padR, y2: gy, class: 'viz-grid' }));
    kids.push(s('text', { x: padL - 6, y: gy + 3, class: 'viz-axis', 'text-anchor': 'end' }, fmtShort((max * i) / 4)));
  }

  labels.forEach((lb, gi) => {
    const cx = padL + gi * gw + gw / 2;
    [[cx - bw - 1, ing[gi], 'in', 'Ingresos'], [cx + 1, egr[gi], 'out', 'Egresos']].forEach(([bx, val, cls, name]) => {
      const bh = Math.max(0, (val / max) * plotH);
      const rect = s('rect', { x: bx, y: yBase - bh, width: bw, height: bh, rx: 3, class: 'viz-bar ' + cls });
      rect.addEventListener('mouseenter', (e) => showTip(`<strong>${lb}</strong><br>${name}: ${fmtMoney(val)}`, e));
      rect.addEventListener('mousemove', moveTip);
      rect.addEventListener('mouseleave', hideTip);
      kids.push(rect);
    });
    kids.push(s('text', { x: cx, y: H - 10, class: 'viz-xlabel', 'text-anchor': 'middle' }, lb));
  });

  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'viz-svg', role: 'img' }, kids);
  const legend = el('div', { class: 'viz-legend' }, [
    el('span', { class: 'viz-lg' }, [el('span', { class: 'viz-dot in' }), 'Ingresos']),
    el('span', { class: 'viz-lg' }, [el('span', { class: 'viz-dot out' }), 'Egresos']),
  ]);
  return el('div', { class: 'viz' }, [legend, svg]);
}

// ------------------------------ Sparkline ----------------------------------
export function sparkline(values, tone = 'bal') {
  const W = 120, H = 34, pad = 3;
  const max = Math.max(1, ...values), min = Math.min(0, ...values);
  const rng = max - min || 1;
  const step = values.length > 1 ? (W - pad * 2) / (values.length - 1) : 0;
  const pts = values.map((v, i) => [pad + i * step, H - pad - ((v - min) / rng) * (H - pad * 2)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const kids = [s('path', { d, class: 'viz-spark ' + tone, fill: 'none' })];
  if (pts.length) kids.push(s('circle', { cx: pts.at(-1)[0], cy: pts.at(-1)[1], r: 2.5, class: 'viz-spark-dot ' + tone }));
  return s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'viz-spark-svg' }, kids);
}

// ----------------------- Barras horizontales (magnitud) --------------------
export function barrasH(rows, { max } = {}) {
  const m = max || Math.max(1, ...rows.map((r) => r.value));
  return el('div', { class: 'viz-bars' }, rows.map((r) => el('div', { class: 'viz-brow' }, [
    el('div', { class: 'viz-blabel' }, r.label),
    el('div', { class: 'viz-btrack' }, [el('div', { class: 'viz-bfill', style: `width:${Math.round((r.value / m) * 100)}%` })]),
    el('div', { class: 'viz-bval' }, String(r.value)),
  ])));
}

// ------------------------------ KPI stat tile ------------------------------
export function statTile({ label, value, sub, tone = '', icon: ic, spark }) {
  return el('div', { class: `stat ${tone}` }, [
    el('div', { class: 'stat-top' }, [
      el('div', { class: 'stat-label' }, label),
      ic ? el('span', { class: 'stat-ic' }, [ic]) : null,
    ]),
    el('div', { class: 'stat-val' }, String(value)),
    el('div', { class: 'stat-foot' }, [
      sub ? el('span', { class: 'stat-sub' }, sub) : el('span', {}),
      spark || null,
    ]),
  ]);
}
