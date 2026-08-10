// ===========================================================================
//  USMS Control — Centro de notificaciones (menú de la campana)
//  Muestra en la app lo que requiere atención (casos OPR, alertas de examen,
//  elegibles a ascenso, inactividad…) y permite activar las push.
// ===========================================================================
import { getState, esTD, esDirectiva } from './store.js';
import { el } from './ui.js';
import { icon } from './icons.js';
import { elegiblesAscenso } from './views/ascensos.js';
import { pushSoportado, pushEstado, activarPush, desactivarPush } from './push.js';

// Calcula la lista de notificaciones accionables desde el estado.
export function listaNotificaciones(s = getState()) {
  const out = [];
  const casosAbiertos = s.casos.filter((c) => c.estado !== 'Resuelto' && c.estado !== 'Archivado').length;
  if (casosAbiertos) out.push({ ic: 'asuntos', txt: 'Casos OPR abiertos', n: casosAbiertos, kind: 'red', href: '#/asuntos' });

  const hoy = Date.now();
  const inactivos7 = s.personal.filter((p) => p.estado === 'Activo' && p.ultimaActividad)
    .filter((p) => Math.floor((hoy - new Date(p.ultimaActividad)) / 86400000) >= 7).length;
  if (inactivos7) out.push({ ic: 'clock', txt: 'Inactivos > 7 días (Art. 13)', n: inactivos7, kind: 'warn', href: '#/personal' });

  const strikesAltos = s.personal.filter((p) => (+p.strikes || 0) >= 2).length;
  if (strikesAltos) out.push({ ic: 'shield', txt: 'Mariscales con 2+ strikes', n: strikesAltos, kind: 'red', href: '#/personal' });

  const banderas = s.personal.filter((p) => p.estado === 'Activo' && (+p.horasMes || 0) < 40).length;
  if (banderas) out.push({ ic: 'alert', txt: 'Bajo rendimiento (< 40 h)', n: banderas, kind: 'warn', href: '#/personal' });

  if (esTD()) {
    const examAlertas = s.examenIntentos.reduce((a, i) => a + (i.alertas || 0), 0);
    if (examAlertas) out.push({ ic: 'alert', txt: 'Manipulación en exámenes', n: examAlertas, kind: 'red', href: '#/training' });
  }
  if (esDirectiva()) {
    const eleg = elegiblesAscenso(s).filter((x) => x.ev.elegible).length;
    if (eleg) out.push({ ic: 'star', txt: 'Elegibles para ascenso', n: eleg, kind: 'gold', href: '#/ascensos' });
  }
  return out;
}

export function contarNotificaciones(s = getState()) {
  return listaNotificaciones(s).reduce((a, x) => a + x.n, 0);
}

// Abre/cierra el menú de notificaciones anclado a la campana.
export async function abrirNotificaciones() {
  const abierto = document.getElementById('notif-menu');
  if (abierto) { abierto.remove(); document.removeEventListener('keydown', onKey); return; }

  const items = listaNotificaciones();
  const lista = items.length
    ? el('div', { class: 'notif-list' }, items.map((it) => el('a', { class: 'notif-item', href: it.href, onClick: cerrar }, [
        el('span', { class: `notif-ico ${it.kind}` }, [icon(it.ic, 16)]),
        el('span', { class: 'notif-txt' }, it.txt),
        el('span', { class: `badge ${it.kind}` }, String(it.n)),
      ])))
    : el('div', { class: 'notif-empty' }, [icon('check', 22), el('p', {}, 'Todo en orden. Sin notificaciones.')]);

  const pushBtn = el('button', { class: 'btn ghost small full', onClick: togglePush }, 'Notificaciones push');
  const menu = el('div', { class: 'notif-menu', id: 'notif-menu' }, [
    el('div', { class: 'notif-head' }, [el('strong', {}, 'Notificaciones'), items.length ? el('span', { class: 'badge red' }, String(contarNotificaciones())) : null]),
    lista,
    pushSoportado() ? el('div', { class: 'notif-push' }, [pushBtn]) : null,
  ]);
  document.body.append(menu);
  refrescarPush(pushBtn);
  document.addEventListener('keydown', onKey);
  setTimeout(() => document.addEventListener('click', onOutside, { once: true }), 0);

  async function togglePush() {
    pushBtn.disabled = true;
    try {
      const est = await pushEstado();
      if (est === 'activo') { await desactivarPush(); } else { await activarPush(); }
    } catch (e) { const t = document.getElementById('toast'); if (t) { t.textContent = e.message; t.className = 'toast show err'; } }
    finally { pushBtn.disabled = false; refrescarPush(pushBtn); }
  }
}

async function refrescarPush(btn) {
  const est = await pushEstado();
  btn.textContent = est === 'activo' ? '🔔 Notificaciones push activas — desactivar'
    : est === 'bloqueado' ? 'Push bloqueado en el navegador'
    : 'Activar notificaciones push';
  btn.classList.toggle('on', est === 'activo');
}

function cerrar() { const m = document.getElementById('notif-menu'); if (m) m.remove(); document.removeEventListener('keydown', onKey); }
function onKey(e) { if (e.key === 'Escape') cerrar(); }
function onOutside(e) {
  const m = document.getElementById('notif-menu');
  if (m && !m.contains(e.target) && !e.target.closest?.('.bell')) cerrar();
}
