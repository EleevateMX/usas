import { getState, addPersona, updatePersona, removePersona } from '../store.js';
import { el, field, modal, closeModal, confirmDialog, toast, badge, fmtDate } from '../ui.js';
import { render } from '../router.js';

const RANGOS = [
  'Trainee', 'Cadet', 'Deputy U.S. Marshal', 'Deputy U.S. Marshal II',
  'Deputy U.S. Marshal III', 'Senior Deputy', 'Supervisory', 'Field Supervisor',
  'Directive Staff', 'Executive Staff', 'Director',
];
const ESTADOS = ['Activo', 'Inactivo', 'LOA', 'Suspendido', 'Retired Deputy'];

let filtro = '';

export function viewPersonal() {
  const s = getState();
  const lista = s.personal
    .filter((p) => !filtro || (p.nombre + p.numeroEmpleado + p.rango + p.divisiones.join(' '))
      .toLowerCase().includes(filtro.toLowerCase()))
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

  return el('div', { class: 'view' }, [
    el('div', { class: 'toolbar' }, [
      el('h2', {}, 'Control de Personal'),
      el('div', { class: 'row gap' }, [
        el('input', {
          class: 'search', placeholder: 'Buscar nombre, nº, rango, división…',
          value: filtro, oninput: (e) => { filtro = e.target.value; rerenderTable(); },
        }),
        el('button', { class: 'btn gold', onClick: () => openForm() }, '+ Nuevo mariscal'),
      ]),
    ]),

    el('div', { class: 'card no-pad', id: 'personal-table' }, [tableNode(lista)]),
  ]);
}

function rerenderTable() {
  const s = getState();
  const lista = s.personal
    .filter((p) => !filtro || (p.nombre + p.numeroEmpleado + p.rango + p.divisiones.join(' '))
      .toLowerCase().includes(filtro.toLowerCase()))
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  const host = document.getElementById('personal-table');
  if (host) { host.innerHTML = ''; host.append(tableNode(lista)); }
}

function tableNode(lista) {
  if (!lista.length)
    return el('div', { class: 'empty' }, 'Sin mariscales registrados. Crea el primero con “Nuevo mariscal”.');

  return el('table', { class: 'tbl rows' }, [
    el('thead', {}, el('tr', {}, [
      el('th', {}, 'Mariscal'), el('th', {}, 'Nº'), el('th', {}, 'Rango'),
      el('th', {}, 'Divisiones'), el('th', {}, 'Estado'),
      el('th', { class: 'right' }, 'Horas/mes'), el('th', { class: 'right' }, 'Adv.'),
      el('th', { class: 'right' }, 'Strikes'), el('th', {}, ''),
    ])),
    el('tbody', {}, lista.map((p) => el('tr', {}, [
      el('td', {}, [el('strong', {}, p.nombre || '(sin nombre)'),
        el('div', { class: 'muted small' }, `Ingreso ${fmtDate(p.fechaIngreso)}`)]),
      el('td', {}, p.numeroEmpleado || '—'),
      el('td', {}, badge(p.rango, 'rango')),
      el('td', {}, (p.divisiones || []).join(', ') || '—'),
      el('td', {}, badge(p.estado, estadoKind(p.estado))),
      el('td', { class: 'right ' + ((+p.horasMes || 0) < 40 ? 'warn' : '') }, `${p.horasMes || 0}`),
      el('td', { class: 'right' }, String(p.advertencias || 0)),
      el('td', { class: 'right ' + ((+p.strikes || 0) >= 2 ? 'danger-txt' : '') }, String(p.strikes || 0)),
      el('td', { class: 'right nowrap' }, [
        el('button', { class: 'icon-btn', title: 'Editar', onClick: () => openForm(p) }, '✎'),
        el('button', { class: 'icon-btn', title: 'Eliminar', onClick: () =>
          confirmDialog(`¿Eliminar a ${p.nombre || 'este mariscal'}?`, () => {
            removePersona(p.id); toast('Mariscal eliminado'); render();
          }) }, '🗑'),
      ]),
    ]))),
  ]);
}

function estadoKind(e) {
  return { Activo: 'ok', Inactivo: 'warn', LOA: 'warn', Suspendido: 'red', 'Retired Deputy': '' }[e] || '';
}

function openForm(p = null) {
  const edit = !!p;
  const d = p || {};
  const f = {};
  const inp = (key, val, attrs = {}) => (f[key] = el('input', { value: val ?? '', ...attrs }));
  const sel = (key, val, opts) => (f[key] = el('select', {},
    opts.map((o) => el('option', { value: o, ...(o === val ? { selected: '' } : {}) }, o))));

  const body = el('div', { class: 'form-grid' }, [
    field('Nombre del personaje', inp('nombre', d.nombre)),
    field('Nº de empleado', inp('numeroEmpleado', d.numeroEmpleado)),
    field('Rango', sel('rango', d.rango || 'Deputy U.S. Marshal', RANGOS)),
    field('Estado', sel('estado', d.estado || 'Activo', ESTADOS)),
    field('Divisiones (separadas por coma)', inp('divisiones', (d.divisiones || []).join(', '))),
    field('Fecha de ingreso', inp('fechaIngreso', d.fechaIngreso || new Date().toISOString().slice(0, 10), { type: 'date' })),
    field('Horas este mes', inp('horasMes', d.horasMes ?? 0, { type: 'number', min: '0' })),
    field('Advertencias', inp('advertencias', d.advertencias ?? 0, { type: 'number', min: '0' })),
    field('Strikes', inp('strikes', d.strikes ?? 0, { type: 'number', min: '0', step: '0.5' })),
    el('label', { class: 'field full' }, [el('span', {}, 'Notas'),
      (f.notas = el('textarea', { rows: '2' }, d.notas || ''))]),
    el('div', { class: 'row gap end full' }, [
      el('button', { class: 'btn ghost', onClick: closeModal }, 'Cancelar'),
      el('button', { class: 'btn gold', onClick: save }, edit ? 'Guardar cambios' : 'Crear mariscal'),
    ]),
  ]);

  function save() {
    const data = {
      nombre: f.nombre.value.trim(),
      numeroEmpleado: f.numeroEmpleado.value.trim(),
      rango: f.rango.value,
      estado: f.estado.value,
      divisiones: f.divisiones.value.split(',').map((x) => x.trim()).filter(Boolean),
      fechaIngreso: f.fechaIngreso.value,
      horasMes: +f.horasMes.value || 0,
      advertencias: +f.advertencias.value || 0,
      strikes: +f.strikes.value || 0,
      notas: f.notas.value.trim(),
    };
    if (!data.nombre) return toast('El nombre es obligatorio', 'err');
    if (edit) { updatePersona(p.id, data); toast('Cambios guardados'); }
    else { addPersona(data); toast('Mariscal creado'); }
    closeModal(); render();
  }

  modal(edit ? `Editar — ${d.nombre}` : 'Nuevo mariscal', body, { wide: true });
}
