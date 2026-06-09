// ===========================================================================
//  USMS Control — Ascensos (requisitos, propuestas, aprobación e historial)
// ===========================================================================
import { getState, esAdmin, esDirector, esDirectiva, RANGOS_ORDEN, siguienteRango, evaluarAscenso,
  proponerAscenso, ascenderDirecto, resolverAscenso, removeAscenso, setReglasBatch } from '../store.js';
import { el, field, modal, closeModal, confirmDialog, toast, badge, fmtDate } from '../ui.js';
import { icon } from '../icons.js';
import { render } from '../router.js';

let soloElegibles = true;

// Lista de candidatos activos con su evaluación (usado aquí y en el dashboard).
export function elegiblesAscenso(s) {
  return s.personal
    .filter((p) => p.estado === 'Activo' && siguienteRango(p.rango))
    .map((p) => ({ p, ev: evaluarAscenso(p) }))
    .filter((x) => x.ev);
}

export function viewAscensos() {
  const s = getState();
  const admin = esAdmin();
  const yo = s.perfil?.nombre || s.perfil?.email || '';

  const candidatos = elegiblesAscenso(s).sort((a, b) =>
    (b.ev.elegible - a.ev.elegible) || (b.ev.dias - a.ev.dias));
  const elegibles = candidatos.filter((x) => x.ev.elegible);
  const pendientes = s.ascensos.filter((a) => a.estado === 'Pendiente');
  const mesActual = new Date().toISOString().slice(0, 7);
  const aprobadosMes = s.ascensos.filter((a) => a.estado === 'Aprobado' && (a.resolvedAt || '').slice(0, 7) === mesActual).length;
  const historial = s.ascensos.filter((a) => a.estado !== 'Pendiente').slice(0, 20);

  const visibles = soloElegibles ? elegibles : candidatos;
  const nombreDe = (id) => s.personal.find((p) => p.id === id)?.nombre || 'mariscal';

  return el('div', { class: 'view' }, [
    el('div', { class: 'toolbar' }, [
      el('h2', {}, 'Ascensos'),
      el('div', { class: 'row gap' }, [
        esDirector() ? el('button', { class: 'btn navy ic', onClick: () => openReglas() }, [icon('normativa', 15), 'Requisitos']) : null,
      ]),
    ]),

    el('div', { class: 'card info-strip' }, [
      el('span', { class: 'strip-ico' }, [icon('star', 22)]),
      el('p', { class: 'muted small' }, 'El sistema evalúa cada mariscal contra los requisitos del rango (tiempo en grado, horas y strikes). Directive+ puede proponer; Executive/Director aprueban y aplican el ascenso, que reinicia el tiempo en grado. Los requisitos los configura el Director.'),
    ]),

    el('div', { class: 'grid kpis' }, [
      kpi('Elegibles', elegibles.length, 'cumplen requisitos', 'green', 'star'),
      kpi('Propuestas', pendientes.length, 'pendientes de aprobar', 'gold', 'history'),
      kpi('Ascensos del mes', aprobadosMes, 'aplicados', '', 'award'),
    ]),

    // Propuestas pendientes
    pendientes.length ? el('div', { class: 'card' }, [
      el('div', { class: 'card-head' }, [el('h3', { class: 'h-ico' }, [icon('history', 16), 'Propuestas pendientes']), null]),
      el('div', { class: 'list' }, pendientes.map((a) => el('div', { class: 'list-item' }, [
        el('div', {}, [el('strong', {}, nombreDe(a.personaId)),
          el('span', { class: 'muted small' }, ` · ${a.deRango || '—'} → `), badge(a.aRango, 'rango'),
          a.motivo ? el('div', { class: 'muted small' }, a.motivo) : null,
          el('div', { class: 'muted xsmall' }, `Propuesto por ${a.proponente || '—'} · ${fmtDate(a.fecha)}`)]),
        admin ? el('div', { class: 'row gap nowrap' }, [
          el('button', { class: 'btn gold small', onClick: () => resolver(a, 'aprobar', yo) }, 'Aprobar'),
          el('button', { class: 'btn ghost small', onClick: () => resolver(a, 'rechazar', yo) }, 'Rechazar'),
        ]) : el('span', { class: 'muted small' }, 'Pendiente'),
      ]))),
    ]) : null,

    // Candidatos
    el('div', { class: 'card no-pad' }, [
      el('div', { class: 'card-head', style: 'padding:16px 18px 0' }, [
        el('h3', { class: 'h-ico' }, [icon('personal', 16), 'Candidatos a ascenso']),
        el('button', { class: 'btn ghost small', onClick: () => { soloElegibles = !soloElegibles; render(); } },
          soloElegibles ? `Ver todos (${candidatos.length})` : 'Solo elegibles'),
      ]),
      visibles.length
        ? el('table', { class: 'tbl rows' }, [
            el('thead', {}, el('tr', {}, [el('th', {}, 'Mariscal'), el('th', {}, 'Ascenso'), el('th', {}, 'En grado'),
              el('th', {}, 'Horas'), el('th', {}, 'Strikes'), el('th', {}, 'Requisitos'), el('th', {}, '')])),
            el('tbody', {}, visibles.map(({ p, ev }) => filaCandidato(p, ev, admin))),
          ])
        : el('div', { class: 'empty' }, soloElegibles ? 'Ningún mariscal cumple los requisitos ahora mismo.' : 'Sin candidatos.'),
    ]),

    // Historial
    el('div', { class: 'card' }, [
      el('div', { class: 'card-head' }, [el('h3', { class: 'h-ico' }, [icon('award', 16), 'Historial de ascensos']), null]),
      historial.length
        ? el('div', { class: 'list' }, historial.map((a) => el('div', { class: 'list-item' }, [
            el('div', {}, [el('strong', {}, nombreDe(a.personaId)),
              el('span', { class: 'muted small' }, ` · ${a.deRango || '—'} → ${a.aRango}`)]),
            el('div', { class: 'row gap nowrap' }, [
              badge(a.estado, a.estado === 'Aprobado' ? 'ok' : 'red'),
              el('span', { class: 'muted xsmall' }, fmtDate(a.resolvedAt || a.fecha)),
              esAdmin() ? el('button', { class: 'icon-btn', title: 'Eliminar del historial', onClick: () =>
                confirmDialog('¿Eliminar este registro de ascenso?', async () => { try { await removeAscenso(a.id); toast('Eliminado'); render(); } catch (e) { toast(e.message, 'err'); } }) }, [icon('trash', 14)]) : null,
            ]),
          ])))
        : el('p', { class: 'muted' }, 'Aún no hay ascensos registrados.'),
    ]),
  ]);
}

function filaCandidato(p, ev, admin) {
  const reqChip = (lbl, c) => el('span', { class: 'req ' + (c.ok ? 'ok' : 'no'), title: lbl }, [icon(c.ok ? 'check' : 'close', 12), lbl]);
  return el('tr', { class: ev.elegible ? 'elegible-row' : '' }, [
    el('td', {}, [el('strong', {}, p.nombre), el('span', { class: 'muted small' }, ` · placa ${p.placa ?? '—'}`)]),
    el('td', {}, [badge(p.rango, 'rango'), el('span', { class: 'muted small' }, ' → '), badge(ev.siguiente, ev.elegible ? 'ok' : '')]),
    el('td', { class: ev.checks.dias.ok ? '' : 'warn' }, `${ev.dias} d`),
    el('td', { class: ev.checks.horas.ok ? '' : 'warn' }, `${ev.checks.horas.val} h`),
    el('td', { class: ev.checks.strikes.ok ? '' : 'danger-txt' }, String(ev.checks.strikes.val)),
    el('td', {}, el('div', { class: 'reqs' }, [
      reqChip(`${ev.checks.dias.min}d`, ev.checks.dias),
      reqChip(`${ev.checks.horas.min}h`, ev.checks.horas),
      reqChip(`≤${ev.checks.strikes.max} strk`, ev.checks.strikes),
    ])),
    el('td', { class: 'right nowrap' }, [
      el('button', { class: 'btn ghost small', onClick: () => openProponer(p, ev) }, 'Proponer'),
      admin ? el('button', { class: 'btn gold small', onClick: () => ascender(p, ev) }, 'Ascender') : null,
    ]),
  ]);
}

function openProponer(p, ev) {
  const f = {};
  f.motivo = el('textarea', { rows: '2', placeholder: 'Motivo de la propuesta (méritos, desempeño, etc.)' });
  const yo = getState().perfil?.nombre || getState().perfil?.email || '';
  async function save() {
    try {
      await proponerAscenso({ personaId: p.id, deRango: p.rango, aRango: ev.siguiente, motivo: f.motivo.value.trim(), proponente: yo });
      toast('Propuesta registrada'); closeModal(); render();
    } catch (e) { toast(e.message, 'err'); }
  }
  const body = el('div', { class: 'form-grid' }, [
    el('p', { class: 'full' }, [el('strong', {}, p.nombre), ' · ', badge(p.rango, 'rango'), ' → ', badge(ev.siguiente, 'ok')]),
    !ev.elegible ? el('p', { class: 'warn small full' }, 'Aún no cumple todos los requisitos; la propuesta queda como excepción para revisión.') : null,
    el('label', { class: 'field full' }, [el('span', {}, 'Motivo'), f.motivo]),
    el('div', { class: 'row gap end full' }, [
      el('button', { class: 'btn ghost', onClick: closeModal }, 'Cancelar'),
      el('button', { class: 'btn gold', onClick: save }, 'Proponer'),
    ]),
  ]);
  modal('Proponer ascenso', body, { wide: true });
}

function ascender(p, ev) {
  const yo = getState().perfil?.nombre || getState().perfil?.email || '';
  const msg = ev.elegible
    ? `Ascender a ${p.nombre} de ${p.rango} a ${ev.siguiente}.`
    : `${p.nombre} aún NO cumple todos los requisitos. ¿Ascender de ${p.rango} a ${ev.siguiente} de todas formas?`;
  confirmDialog(msg, async () => {
    try { await ascenderDirecto({ personaId: p.id, deRango: p.rango, aRango: ev.siguiente }, yo); toast(`${p.nombre} ascendido a ${ev.siguiente}`); render(); }
    catch (e) { toast(e.message, 'err'); }
  });
}

async function resolver(a, accion, yo) {
  try { await resolverAscenso(a, accion, yo); toast(accion === 'aprobar' ? 'Ascenso aplicado' : 'Propuesta rechazada'); render(); }
  catch (e) { toast(e.message, 'err'); }
}

// Configuración de requisitos por rango (solo Director)
function openReglas() {
  const s = getState();
  const filas = RANGOS_ORDEN.slice(0, -1).map((rango, i) => {
    const r = s.ascensoReglas.find((x) => x.rango === rango) || { rango, orden: i, diasMin: 0, horasMin: 0, strikesMax: 0 };
    const dias = el('input', { type: 'number', min: '0', value: String(r.diasMin) });
    const horas = el('input', { type: 'number', min: '0', value: String(r.horasMin) });
    const strikes = el('input', { type: 'number', min: '0', step: '0.5', value: String(r.strikesMax) });
    return { rango, orden: i, dias, horas, strikes };
  });

  async function guardar() {
    const list = filas.map((f) => ({ rango: f.rango, orden: f.orden, diasMin: +f.dias.value || 0, horasMin: +f.horas.value || 0, strikesMax: +f.strikes.value || 0 }));
    try { await setReglasBatch(list); toast('Requisitos guardados'); closeModal(); render(); }
    catch (e) { toast(e.message, 'err'); }
  }

  const body = el('div', {}, [
    el('p', { class: 'muted small' }, 'Requisitos para avanzar desde cada rango al siguiente.'),
    el('table', { class: 'tbl rows' }, [
      el('thead', {}, el('tr', {}, [el('th', {}, 'Desde rango'), el('th', {}, 'Días en grado'), el('th', {}, 'Horas/mes'), el('th', {}, 'Strikes máx.')])),
      el('tbody', {}, filas.map((f) => el('tr', {}, [
        el('td', {}, [badge(f.rango, 'rango'), el('span', { class: 'muted small' }, ` → ${siguienteRango(f.rango)}`)]),
        el('td', {}, f.dias), el('td', {}, f.horas), el('td', {}, f.strikes),
      ]))),
    ]),
    el('div', { class: 'row gap end' }, [
      el('button', { class: 'btn ghost', onClick: closeModal }, 'Cancelar'),
      el('button', { class: 'btn gold', onClick: guardar }, 'Guardar requisitos'),
    ]),
  ]);
  modal('Requisitos de ascenso', body, { wide: true });
}

const kpi = (label, value, sub, cls, ic) => el('div', { class: `card kpi ${cls}` }, [
  el('span', { class: 'kpi-ico' }, [icon(ic, 26)]),
  el('div', { class: 'kpi-val' }, String(value)),
  el('div', { class: 'kpi-label' }, label),
  sub ? el('div', { class: 'kpi-sub' }, sub) : null,
]);
