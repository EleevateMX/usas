import { getState, addPersona, updatePersona, removePersona,
  addSancion, removeSancion, setSancionVencida } from '../store.js';
import { el, field, modal, closeModal, confirmDialog, toast, badge, fmtDate } from '../ui.js';
import { icon } from '../icons.js';
import { render } from '../router.js';
import { exportarPersonalCSV } from '../export.js';

const RANGOS = [
  'DUSMT', 'DUSM I', 'DUSM II', 'DUSM III', 'DUSM IV',
  'SDUSM I', 'SDUSM II', 'CDUSM', 'U.S. Marshal', 'N/A',
];
const ESTADOS = ['Activo', 'Inactivo', 'LOA', 'Suspendido', 'Retirado',
  'Traslado', 'Expulsado', 'Vetado', 'KIA', 'Deshabilitada'];
const EQUIPO = [
  ['casco_tactico', 'Casco táctico'], ['casco_ops', 'Casco ops. especiales'],
  ['mascara', 'Máscara'], ['gorra', 'Gorra táctica'], ['tablet', 'Tablet'],
  ['bolsa_evidencias', 'Bolsa evidencias'], ['comlink', 'Comlink'], ['mascara_gas', 'Máscara de gas'],
];

export const nuevoMariscal = () => openForm();
let filtro = '';
let estadoF = '';

function filtrada() {
  return getState().personal
    .filter((p) => !estadoF || p.estado === estadoF)
    .filter((p) => !filtro || [p.nombre, p.placa, p.hash, p.rango, p.discordId, p.correo, p.divisiones.join(' ')]
      .join(' ').toLowerCase().includes(filtro.toLowerCase()))
    .sort((a, b) => (a.placa || 99999) - (b.placa || 99999));
}

export function viewPersonal() {
  return el('div', { class: 'view' }, [
    el('div', { class: 'toolbar' }, [
      el('h2', {}, 'Control de Personal'),
      el('div', { class: 'row gap' }, [
        el('select', { onchange: (e) => { estadoF = e.target.value; rerender(); } },
          [el('option', { value: '' }, 'Todos los estados'),
           ...ESTADOS.map((s) => el('option', { value: s, ...(s === estadoF ? { selected: '' } : {}) }, s))]),
        el('input', { class: 'search', placeholder: 'Buscar nombre, placa, hash, Discord, correo…',
          value: filtro, oninput: (e) => { filtro = e.target.value; rerender(); } }),
        el('button', { class: 'btn ghost ic', title: 'Exportar a CSV', onClick: exportarPersonalCSV }, [icon('download', 15), 'CSV']),
        el('button', { class: 'btn gold', onClick: () => openForm() }, '+ Nuevo mariscal'),
      ]),
    ]),
    el('div', { class: 'card no-pad', id: 'personal-table' }, [tableNode(filtrada())]),
  ]);
}

function rerender() {
  const host = document.getElementById('personal-table');
  if (host) { host.innerHTML = ''; host.append(tableNode(filtrada())); }
}

function tableNode(lista) {
  if (!lista.length)
    return el('div', { class: 'empty' }, 'Sin mariscales registrados. Crea el primero con “Nuevo mariscal”.');
  return el('table', { class: 'tbl rows' }, [
    el('thead', {}, el('tr', {}, [
      el('th', {}, 'Mariscal'), el('th', {}, 'Placa'), el('th', {}, 'Rango'),
      el('th', {}, 'Divisiones'), el('th', {}, 'Estado'),
      el('th', { class: 'right' }, 'Horas/mes'), el('th', { class: 'right' }, 'Adv.'),
      el('th', { class: 'right' }, 'Strikes'), el('th', {}, ''),
    ])),
    el('tbody', {}, lista.map((p) => el('tr', {}, [
      el('td', {}, [el('strong', {}, p.nombre || '(sin nombre)'),
        el('div', { class: 'muted small' }, [p.hash || '', p.fechaIngreso ? ` · ${fmtDate(p.fechaIngreso)}` : ''].join(''))]),
      el('td', {}, p.placa != null ? String(p.placa) : (p.numeroEmpleado || '—')),
      el('td', {}, badge(p.rango, 'rango')),
      el('td', {}, (p.divisiones || []).join(', ') || '—'),
      el('td', {}, badge(p.estado, estadoKind(p.estado))),
      el('td', { class: 'right ' + ((+p.horasMes || 0) < 40 ? 'warn' : '') }, `${p.horasMes || 0}`),
      el('td', { class: 'right' }, fmtNum(p.advertencias)),
      el('td', { class: 'right ' + ((+p.strikes || 0) >= 2 ? 'danger-txt' : '') }, fmtNum(p.strikes)),
      el('td', { class: 'right nowrap' }, [
        el('button', { class: 'icon-btn', title: 'Historial disciplinario', onClick: () => openHistorial(p) }, [icon('history', 16)]),
        el('button', { class: 'icon-btn', title: 'Editar', onClick: () => openForm(p) }, [icon('edit', 16)]),
        el('button', { class: 'icon-btn', title: 'Eliminar', onClick: () =>
          confirmDialog(`¿Eliminar a ${p.nombre || 'este mariscal'}?`, async () => {
            try { await removePersona(p.id); toast('Mariscal eliminado'); render(); } catch (e) { toast(e.message, 'err'); }
          }) }, [icon('trash', 16)]),
      ]),
    ]))),
  ]);
}

const fmtNum = (n) => (Number.isInteger(n) ? String(n) : String(n));
function estadoKind(e) {
  return { Activo: 'ok', Inactivo: 'warn', LOA: 'warn', Suspendido: 'red',
    Retirado: '', Traslado: '', Expulsado: 'red', Vetado: 'red', KIA: 'red', Deshabilitada: '' }[e] || '';
}

// -------------------------------- Alta / edición ---------------------------
function openForm(p = null) {
  const edit = !!p; const d = p || {}; const f = {};
  const inp = (k, v, a = {}) => (f[k] = el('input', { value: v ?? '', ...a }));
  const sel = (k, v, opts) => (f[k] = el('select', {}, opts.map((o) =>
    el('option', { value: o, ...(o === v ? { selected: '' } : {}) }, o))));

  const equipo = { ...(d.equipo || {}) };
  const equipoChecks = EQUIPO.map(([k, label]) => {
    const cb = el('input', { type: 'checkbox', ...(equipo[k] ? { checked: '' } : {}) });
    cb.addEventListener('change', () => { equipo[k] = cb.checked; });
    return el('label', { class: 'chk' }, [cb, el('span', {}, label)]);
  });

  const body = el('div', { class: 'form-grid' }, [
    field('Nombre del personaje', inp('nombre', d.nombre)),
    field('Nº de placa', inp('placa', d.placa, { type: 'number' })),
    field('HASH', inp('hash', d.hash)),
    field('Rango', sel('rango', d.rango || 'DUSM I', RANGOS)),
    field('Estado', sel('estado', d.estado || 'Activo', ESTADOS)),
    field('ID de Discord', inp('discordId', d.discordId)),
    field('Correo electrónico', inp('correo', d.correo)),
    field('Teléfono', inp('telefono', d.telefono)),
    field('Divisiones (separadas por coma)', inp('divisiones', (d.divisiones || []).join(', '))),
    field('Fecha de ingreso', inp('fechaIngreso', d.fechaIngreso || '', { type: 'date' })),
    field('Fecha de salida', inp('fechaSalida', d.fechaSalida || '', { type: 'date' })),
    field('Última actividad (Art. 13)', inp('ultimaActividad', d.ultimaActividad || '', { type: 'date' })),
    field('Horas este mes', inp('horasMes', d.horasMes ?? 0, { type: 'number', min: '0' })),
    el('label', { class: 'field full' }, [el('span', {}, 'Equipo asignado'),
      el('div', { class: 'chk-grid' }, equipoChecks)]),
    el('label', { class: 'field full' }, [el('span', {}, 'Expedientes (enlace/ref.)'), inp('expedientes', d.expedientes)]),
    el('label', { class: 'field full' }, [el('span', {}, 'Notas'),
      (f.notas = el('textarea', { rows: '2' }, d.notas || ''))]),
    edit ? el('p', { class: 'muted small full' }, `Advertencias y strikes se calculan desde el historial disciplinario (botón 🛡).`) : null,
    el('div', { class: 'row gap end full' }, [
      el('button', { class: 'btn ghost', onClick: closeModal }, 'Cancelar'),
      el('button', { class: 'btn gold', onClick: save }, edit ? 'Guardar cambios' : 'Crear mariscal'),
    ]),
  ]);

  async function save() {
    const data = {
      nombre: f.nombre.value.trim(), placa: f.placa.value.trim(), hash: f.hash.value.trim(),
      rango: f.rango.value, estado: f.estado.value,
      discordId: f.discordId.value.trim(), correo: f.correo.value.trim(), telefono: f.telefono.value.trim(),
      divisiones: f.divisiones.value.split(',').map((x) => x.trim()).filter(Boolean),
      fechaIngreso: f.fechaIngreso.value, fechaSalida: f.fechaSalida.value,
      ultimaActividad: f.ultimaActividad.value, horasMes: +f.horasMes.value || 0,
      equipo, expedientes: f.expedientes.value.trim(), notas: f.notas.value.trim(),
    };
    if (!data.nombre) return toast('El nombre es obligatorio', 'err');
    try {
      if (edit) { await updatePersona(p.id, data); toast('Cambios guardados'); }
      else { await addPersona(data); toast('Mariscal creado'); }
      closeModal(); render();
    } catch (e) { toast(e.message, 'err'); }
  }

  modal(edit ? `Editar — ${d.nombre}` : 'Nuevo mariscal', body, { wide: true });
}

// ----------------------------- Historial disciplinario ---------------------
function openHistorial(p) {
  const s = getState();
  const sanciones = s.sanciones.filter((x) => x.personaId === p.id)
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const f = {};
  const sel = (k, opts) => (f[k] = el('select', {}, opts.map((o) =>
    el('option', { value: o.v ?? o }, o.t ?? o))));

  const artOpts = [{ v: '', t: '— Artículo (opcional) —' },
    ...s.normativa.filter((a) => a.activo !== false).map((a) => ({ v: a.id, t: a.titulo }))];

  const form = el('div', { class: 'form-grid compact' }, [
    sel('tipo', [{ v: 'advertencia', t: 'Advertencia' }, { v: 'strike', t: 'Strike' }]),
    (f.cantidad = el('input', { type: 'number', step: '0.5', min: '0.5', value: '1' })),
    (f.fecha = el('input', { type: 'date', value: new Date().toISOString().slice(0, 10) })),
    sel('articuloId', artOpts),
    el('div', { class: 'full' }, [(f.motivo = el('input', { placeholder: 'Motivo / referencia del explanatory' }))]),
    el('button', { class: 'btn gold full', onClick: registrar }, '+ Registrar sanción'),
  ]);

  const lista = el('div', { class: 'hist-list' }, sanciones.length
    ? sanciones.map((x) => sancRow(x, s))
    : [el('p', { class: 'muted' }, 'Sin sanciones registradas.')]);

  async function registrar() {
    const cantidad = +f.cantidad.value || 0;
    if (cantidad <= 0) return toast('Cantidad inválida', 'err');
    try {
      await addSancion({ personaId: p.id, tipo: f.tipo.value, cantidad,
        fecha: f.fecha.value, articuloId: f.articuloId.value, motivo: f.motivo.value.trim() });
      toast('Sanción registrada'); closeModal(); openHistorial(getState().personal.find((x) => x.id === p.id)); render();
    } catch (e) { toast(e.message, 'err'); }
  }

  const pf = getState().personal.find((x) => x.id === p.id) || p;
  const body = el('div', { class: 'hist' }, [
    el('div', { class: 'hist-kpis' }, [
      el('div', { class: 'mini-kpi' }, [el('div', { class: 'mk-val warn' }, fmtNum(pf.advertencias)), el('div', { class: 'mk-lbl' }, 'Adv. vigentes')]),
      el('div', { class: 'mini-kpi' }, [el('div', { class: 'mk-val danger-txt' }, fmtNum(pf.strikes)), el('div', { class: 'mk-lbl' }, 'Strikes vigentes')]),
      el('div', { class: 'mini-kpi' }, [el('div', { class: 'mk-val' }, fmtNum(pf.advertenciasHist)), el('div', { class: 'mk-lbl' }, 'Adv. históricas')]),
      el('div', { class: 'mini-kpi' }, [el('div', { class: 'mk-val' }, fmtNum(pf.strikesHist)), el('div', { class: 'mk-lbl' }, 'Strikes históricos')]),
    ]),
    el('p', { class: 'muted xsmall' }, 'Art. 20: las advertencias salen de la cuenta a los ~90 días. Art. 84: al llegar a 3 advertencias vigentes se agrega 0.5 strike automático.'),
    el('div', { class: 'card sub' }, [el('h4', {}, 'Registrar sanción'), form]),
    el('h4', {}, 'Historial'),
    lista,
    el('div', { class: 'row gap end' }, [el('button', { class: 'btn ghost', onClick: closeModal }, 'Cerrar')]),
  ]);
  modal(`Historial — ${pf.nombre}`, body, { wide: true });
}

function sancRow(x, s) {
  const art = x.articuloId ? s.normativa.find((a) => a.id === x.articuloId) : null;
  return el('div', { class: 'hist-row' + (x.vencida ? ' venc' : '') }, [
    el('div', {}, [
      el('strong', {}, `${x.tipo === 'strike' ? 'Strike' : 'Advertencia'} ×${x.cantidad}`),
      x.vencida ? badge('vencida', '') : badge('vigente', x.tipo === 'strike' ? 'red' : 'warn'),
      el('div', { class: 'muted small' }, `${fmtDate(x.fecha)}${art ? ' · ' + art.titulo.split('—')[0].trim() : ''}${x.motivo ? ' · ' + x.motivo : ''}`),
    ]),
    el('div', { class: 'nowrap' }, [
      el('button', { class: 'icon-btn', title: x.vencida ? 'Reactivar' : 'Marcar vencida/perdonada', onClick: async () => {
        try { await setSancionVencida(x.id, !x.vencida); toast('Actualizado'); closeModal(); render(); } catch (e) { toast(e.message, 'err'); } } }, [icon(x.vencida ? 'undo' : 'check', 16)]),
      el('button', { class: 'icon-btn', title: 'Eliminar', onClick: () =>
        confirmDialog('¿Eliminar esta sanción del historial?', async () => {
          try { await removeSancion(x.id); toast('Eliminada'); closeModal(); render(); } catch (e) { toast(e.message, 'err'); } }) }, [icon('trash', 16)]),
    ]),
  ]);
}
