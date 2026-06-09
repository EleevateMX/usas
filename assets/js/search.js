// ===========================================================================
//  USMS Control — Búsqueda global (paleta de comandos, Ctrl/⌘ K)
//  Salta a cualquier mariscal, caso OPR, movimiento, artículo o academia.
// ===========================================================================
import { getState, puedeExportar } from './store.js';
import { el, modal, closeModal, badge, fmtMoney } from './ui.js';
import { icon } from './icons.js';

function construirIndice(s) {
  const items = [];
  s.personal.forEach((p) => items.push({
    tipo: 'Personal', icon: 'personal', label: p.nombre || '(sin nombre)',
    sub: `${p.rango || '—'} · placa ${p.placa ?? '—'} · ${p.estado}`, hash: '#/personal',
    text: [p.nombre, p.placa, p.hash, p.discordId, p.correo, p.rango, (p.divisiones || []).join(' ')].join(' '),
  }));
  s.casos.forEach((c) => items.push({
    tipo: 'OPR', icon: 'asuntos', label: `${c.folio} · ${c.denunciado || 'sin denunciado'}`,
    sub: c.estado, hash: '#/asuntos', text: [c.folio, c.denunciado, c.denunciante, c.descripcion].join(' '),
  }));
  s.finanzas.forEach((m) => items.push({
    tipo: 'Tesorería', icon: 'finanzas', label: m.concepto || m.categoria,
    sub: `${m.tipo === 'ingreso' ? '+' : '−'}${fmtMoney(m.monto)} · ${m.categoria}`, hash: '#/finanzas',
    text: [m.concepto, m.categoria, m.responsable].join(' '),
  }));
  s.normativa.forEach((a) => items.push({
    tipo: 'Normativa', icon: 'normativa', label: a.titulo,
    sub: a.libro || '', hash: '#/normativa', text: [a.titulo, a.resumen, (a.tags || []).join(' ')].join(' '),
  }));
  s.examenSesiones.forEach((x) => items.push({
    tipo: 'Academia', icon: 'training', label: x.nombre, sub: x.tipo, hash: '#/training',
    text: [x.nombre, x.tipo].join(' '),
  }));
  s.perfiles.forEach((p) => items.push({
    tipo: 'Miembro', icon: 'miembros', label: p.nombre || p.email, sub: p.rol, hash: '#/miembros',
    text: [p.nombre, p.email, p.rol].join(' '),
  }));
  return items;
}

export function abrirBusqueda() {
  if (!puedeExportar()) return;
  if (document.getElementById('modal')) closeModal();
  const s = getState();
  const items = construirIndice(s);

  const input = el('input', { class: 'cmdk-input', placeholder: 'Buscar mariscal, caso, movimiento, artículo, academia…' });
  const results = el('div', { class: 'cmdk-results' });
  let sel = 0; let actuales = [];

  const pinta = () => {
    const q = input.value.trim().toLowerCase();
    actuales = (q ? items.filter((it) => it.text.toLowerCase().includes(q)) : items).slice(0, 40);
    if (sel >= actuales.length) sel = Math.max(0, actuales.length - 1);
    results.innerHTML = '';
    if (!actuales.length) { results.append(el('div', { class: 'cmdk-empty' }, 'Sin resultados.')); return; }
    actuales.forEach((it, i) => results.append(el('button', { class: 'cmdk-row' + (i === sel ? ' sel' : ''), onClick: () => go(it) }, [
      el('span', { class: 'cmdk-ico' }, [icon(it.icon, 16)]),
      el('span', { class: 'cmdk-main' }, [el('span', { class: 'cmdk-lbl' }, it.label), it.sub ? el('span', { class: 'cmdk-sub' }, it.sub) : null]),
      badge(it.tipo, 'rango'),
    ])));
  };
  const go = (it) => { closeModal(); if (location.hash !== it.hash) location.hash = it.hash; };

  input.addEventListener('input', () => { sel = 0; pinta(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, actuales.length - 1); pinta(); scrollSel(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); pinta(); scrollSel(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (actuales[sel]) go(actuales[sel]); }
  });
  const scrollSel = () => { const r = results.querySelector('.cmdk-row.sel'); if (r) r.scrollIntoView({ block: 'nearest' }); };

  const body = el('div', { class: 'cmdk' }, [
    el('div', { class: 'cmdk-top' }, [icon('search', 18), input, el('kbd', {}, 'ESC')]),
    results,
    el('div', { class: 'cmdk-foot muted xsmall' }, `${items.length} registros · ↑↓ para navegar · Enter para abrir`),
  ]);
  modal('Búsqueda global', body, { wide: true });
  setTimeout(() => input.focus(), 30);
  pinta();
}
