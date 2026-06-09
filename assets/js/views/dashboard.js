import { getState, balance } from '../store.js';
import { el, fmtMoney, fmtDate, badge } from '../ui.js';

export function viewDashboard() {
  const s = getState();
  const activos = s.personal.filter((p) => p.estado === 'Activo').length;
  const inactivos = s.personal.filter((p) => p.estado !== 'Activo').length;
  const casosAbiertos = s.casos.filter((c) => c.estado !== 'Resuelto' && c.estado !== 'Archivado').length;
  const strikesTotal = s.personal.reduce((a, p) => a + (+p.strikes || 0), 0);

  // Banderas de bajo rendimiento (horas) e inactividad.
  const banderas = s.personal
    .filter((p) => p.estado === 'Activo' && (+p.horasMes || 0) < 40)
    .sort((a, b) => (a.horasMes || 0) - (b.horasMes || 0));

  const recientes = [...s.casos].reverse().slice(0, 5);

  const kpi = (label, value, sub, cls = '') =>
    el('div', { class: `card kpi ${cls}` }, [
      el('div', { class: 'kpi-val' }, String(value)),
      el('div', { class: 'kpi-label' }, label),
      sub ? el('div', { class: 'kpi-sub' }, sub) : null,
    ]);

  return el('div', { class: 'view' }, [
    el('div', { class: 'grid kpis' }, [
      kpi('Personal activo', activos, `${inactivos} inactivos / LOA`, 'gold'),
      kpi('Tesorería', fmtMoney(balance()), `${s.finanzas.length} movimientos`, 'green'),
      kpi('Casos OPR abiertos', casosAbiertos, `${s.casos.length} en total`, 'red'),
      kpi('Strikes en plantilla', strikesTotal, `${s.normativa.length} artículos vigentes`),
    ]),

    el('div', { class: 'grid two' }, [
      el('div', { class: 'card' }, [
        el('div', { class: 'card-head' }, [el('h3', {}, '⚠ Banderas de actividad'),
          el('span', { class: 'muted small' }, '< 40 h/mes')]),
        banderas.length
          ? el('table', { class: 'tbl' }, [
              el('thead', {}, el('tr', {}, [el('th', {}, 'Mariscal'), el('th', {}, 'Rango'), el('th', { class: 'right' }, 'Horas')])),
              el('tbody', {}, banderas.map((p) =>
                el('tr', {}, [
                  el('td', {}, p.nombre || '(sin nombre)'),
                  el('td', {}, badge(p.rango, 'rango')),
                  el('td', { class: 'right warn' }, `${p.horasMes || 0} h`),
                ]))),
            ])
          : el('p', { class: 'muted' }, 'Sin banderas. Toda la plantilla cumple horas.'),
      ]),

      el('div', { class: 'card' }, [
        el('div', { class: 'card-head' }, [el('h3', {}, '🛡 Últimos casos OPR'), null]),
        recientes.length
          ? el('div', { class: 'list' }, recientes.map((c) =>
              el('a', { class: 'list-item', href: '#/asuntos' }, [
                el('div', {}, [el('strong', {}, c.folio), el('div', { class: 'muted small' }, c.denunciado || '—')]),
                badge(c.estado, c.estado === 'Resuelto' ? 'ok' : c.estado === 'Abierto' ? 'red' : 'warn'),
              ])))
          : el('p', { class: 'muted' }, 'No hay casos registrados todavía.'),
      ]),
    ]),

    el('div', { class: 'card welcome' }, [
      el('h3', {}, `Centro de Mando — ${s.meta.nombreFaccion}`),
      el('p', { class: 'muted' }, 'Panel de control de personal, tesorería y Asuntos Internos. Los datos se guardan localmente en este navegador; usa Respaldo para exportar/importar y compartir con tu liderazgo.'),
      el('p', { class: 'muted small' }, `Última actualización de la normativa: ${fmtDate(s.meta.creado)} · ${s.normativa.length} artículos.`),
    ]),
  ]);
}
