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

  // Art. 13: activos con última actividad registrada hace más de 7 días.
  const hoy = Date.now();
  const inactivos7 = s.personal
    .filter((p) => p.estado === 'Activo' && p.ultimaActividad)
    .map((p) => ({ p, dias: Math.floor((hoy - new Date(p.ultimaActividad)) / 86400000) }))
    .filter((x) => x.dias >= 7)
    .sort((a, b) => b.dias - a.dias);
  const sinRegistro = s.personal.filter((p) => p.estado === 'Activo' && !p.ultimaActividad).length;

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

    el('div', { class: 'card' }, [
      el('div', { class: 'card-head' }, [el('h3', {}, '⏱ Inactividad — Art. 13'),
        el('span', { class: 'muted small' }, '> 7 días sin actividad')]),
      inactivos7.length
        ? el('div', { class: 'list' }, inactivos7.slice(0, 8).map(({ p, dias }) =>
            el('div', { class: 'list-item' }, [
              el('div', {}, [el('strong', {}, p.nombre), el('span', { class: 'muted small' }, ` · placa ${p.placa ?? '—'}`)]),
              badge(`${dias} días`, dias >= 7 ? 'red' : 'warn'),
            ])))
        : el('p', { class: 'muted' }, 'Sin inactividades registradas que superen 7 días.'),
      sinRegistro
        ? el('p', { class: 'muted xsmall' }, `${sinRegistro} activos sin “última actividad” registrada. Edita el mariscal para registrarla y activar el control del Art. 13.`)
        : null,
    ]),

    el('div', { class: 'card welcome' }, [
      el('h3', {}, `Centro de Mando — ${s.meta.nombreFaccion}`),
      el('p', { class: 'muted' }, 'Panel de control de personal, tesorería y Asuntos Internos. Los datos se sincronizan en la nube (Supabase) entre todo el liderazgo según los permisos de cada rango.'),
      el('p', { class: 'muted small' }, `Normativa vigente: ${s.normativa.length} artículos · Sesión: ${s.perfil?.nombre || ''} (${s.perfil?.rol || '—'}).`),
    ]),
  ]);
}
