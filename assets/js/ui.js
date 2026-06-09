// ===========================================================================
//  USMS Control — Utilidades de interfaz (sin dependencias)
// ===========================================================================
import { icon } from './icons.js';

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function')
      node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
}

export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const fmtMoney = (n) =>
  '$' + (+n || 0).toLocaleString('en-US', { minimumFractionDigits: 0 });

export const fmtDate = (s) => {
  if (!s) return '—';
  try {
    return new Date(s + (s.length === 10 ? 'T00:00:00' : '')).toLocaleDateString(
      'es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return s; }
};

// ---- Toast -----------------------------------------------------------------
let toastTimer;
export function toast(msg, type = 'ok') {
  let t = document.getElementById('toast');
  if (!t) {
    t = el('div', { id: 'toast', class: 'toast' });
    document.body.append(t);
  }
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = 'toast'), 2600);
}

// ---- Modal -----------------------------------------------------------------
export function modal(title, bodyNode, { wide = false } = {}) {
  closeModal();
  const overlay = el('div', { class: 'modal-overlay', id: 'modal' });
  const box = el('div', { class: `modal ${wide ? 'modal-wide' : ''}` }, [
    el('div', { class: 'modal-head' }, [
      el('h3', {}, title),
      el('button', { class: 'icon-btn', onClick: closeModal, title: 'Cerrar' }, [icon('close', 18)]),
    ]),
    el('div', { class: 'modal-body' }, [bodyNode]),
  ]);
  overlay.append(box);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.body.append(overlay);
  document.addEventListener('keydown', escClose);
  return overlay;
}
export function closeModal() {
  const m = document.getElementById('modal');
  if (m) m.remove();
  document.removeEventListener('keydown', escClose);
}
function escClose(e) { if (e.key === 'Escape') closeModal(); }

export function confirmDialog(message, onYes) {
  const body = el('div', {}, [
    el('p', { class: 'muted' }, message),
    el('div', { class: 'row gap end' }, [
      el('button', { class: 'btn ghost', onClick: closeModal }, 'Cancelar'),
      el('button', { class: 'btn danger', onClick: () => { closeModal(); onYes(); } }, 'Eliminar'),
    ]),
  ]);
  modal('Confirmar', body);
}

// Campo de formulario etiquetado.
export function field(label, inputNode) {
  return el('label', { class: 'field' }, [el('span', {}, label), inputNode]);
}
export function badge(text, kind = '') {
  return el('span', { class: `badge ${kind}` }, text);
}
