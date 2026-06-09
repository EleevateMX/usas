// ===========================================================================
//  USMS Control — Módulo de Divisiones
//  Organiza al personal dentro de cada división con su cargo
//  (Supervisor · Encargado · Miembro) para llevar control de la cadena.
// ===========================================================================
import { getState, esDirectiva, addDivMiembro, updateDivMiembro, removeDivMiembro } from '../store.js';
import { el, field, modal, closeModal, confirmDialog, toast, badge } from '../ui.js';
import { icon } from '../icons.js';
import { render } from '../router.js';

// Divisiones oficiales del USMS (sigla → nombre completo).
const DIVISIONES = [
  ['IOD', 'Investigative Operations Division'],
  ['SOG', 'Special Operations Group'],
  ['UMD', 'Unit Management Division'],
  ['AOD', 'Air Operations Division'],
  ['TD', 'Training Division'],
  ['SGU', 'Suppression Gang Unit'],
  ['RAD', 'Resources Administration Division'],
  ['OPA', 'Office of Public Affairs'],
  ['OPR', 'Office of Professional Responsibility'],
];
const NOMBRE_DIV = Object.fromEntries(DIVISIONES);
const CARGOS = ['Supervisor', 'Encargado', 'Miembro'];
const CARGO_KIND = { Supervisor: 'gold', Encargado: 'warn', Miembro: '' };
const ordenCargo = (c) => CARGOS.indexOf(c);

export function viewDivisiones() {
  const s = getState();
  const dir = esDirectiva();
  const personaById = new Map(s.personal.map((p) => [p.id, p]));

  // Agrupa membresías por división (oficiales + cualquiera con gente asignada).
  const presentes = new Set(s.divisionMiembros.map((m) => m.division));
  const claves = [...new Set([...DIVISIONES.map((d) => d[0]), ...presentes])];

  return el('div', { class: 'view' }, [
    el('div', { class: 'toolbar' }, [
      el('h2', {}, 'Divisiones'),
      dir ? el('button', { class: 'btn gold ic', onClick: () => openAsignar() }, [icon('plus', 15), 'Asignar miembro']) : el('span', { class: 'muted small' }, 'Vista de solo lectura'),
    ]),

    el('div', { class: 'card info-strip' }, [
      el('span', { class: 'strip-ico' }, [icon('layers', 22)]),
      el('p', { class: 'muted small' }, 'Estructura de cada división: Supervisor (cabeza), Encargado (segundo al mando) y Miembros. Asignar y editar lo gestiona Directive+; el resto del Supervisory Staff lo consulta.'),
    ]),

    el('div', { class: 'div-mod-grid' }, claves.map((clave) => divisionCard(clave, s, personaById, dir))),
  ]);
}

function divisionCard(clave, s, personaById, dir) {
  const miembros = s.divisionMiembros.filter((m) => m.division === clave)
    .map((m) => ({ ...m, persona: personaById.get(m.personaId) }))
    .filter((m) => m.persona)
    .sort((a, b) => ordenCargo(a.cargo) - ordenCargo(b.cargo) || (a.persona.nombre || '').localeCompare(b.persona.nombre || ''));

  const porCargo = (c) => miembros.filter((m) => m.cargo === c);
  const nombre = NOMBRE_DIV[clave] || clave;

  return el('div', { class: 'card division-card' }, [
    el('div', { class: 'div-head' }, [
      el('div', { class: 'div-sigla-lg' }, clave),
      el('div', {}, [el('strong', {}, nombre),
        el('div', { class: 'muted small' }, `${miembros.length} ${miembros.length === 1 ? 'integrante' : 'integrantes'}`)]),
      dir ? el('button', { class: 'icon-btn', title: 'Asignar a esta división', onClick: () => openAsignar(clave) }, [icon('plus', 16)]) : null,
    ]),
    miembros.length
      ? el('div', { class: 'div-cargos' }, CARGOS.map((c) => {
          const lista = porCargo(c);
          if (!lista.length) return null;
          return el('div', { class: 'div-cargo-group' }, [
            el('div', { class: 'div-cargo-lbl' }, [badge(c, CARGO_KIND[c]), el('span', { class: 'muted xsmall' }, `${lista.length}`)]),
            el('div', { class: 'div-people' }, lista.map((m) => personaRow(m, dir))),
          ]);
        }))
      : el('p', { class: 'muted small', style: 'margin:6px 0 0' }, 'Sin integrantes asignados.'),
  ]);
}

function personaRow(m, dir) {
  const p = m.persona;
  const inactivo = p.estado !== 'Activo';
  const acciones = dir ? el('span', { class: 'div-row-act' }, [
    cargoSelect(m),
    el('button', { class: 'icon-btn', title: 'Quitar de la división', onClick: () =>
      confirmDialog(`¿Quitar a ${p.nombre} de ${m.division}?`, async () => {
        try { await removeDivMiembro(m.id); toast('Integrante removido'); render(); } catch (e) { toast(e.message, 'err'); }
      }) }, [icon('close', 14)]),
  ]) : null;

  return el('div', { class: 'div-person' + (inactivo ? ' inact' : '') }, [
    el('span', { class: 'div-person-main' }, [
      el('strong', {}, p.nombre || '(sin nombre)'),
      el('span', { class: 'muted small' }, ` · ${p.rango || '—'} · placa ${p.placa ?? '—'}`),
    ]),
    inactivo ? badge(p.estado, 'warn') : null,
    acciones,
  ]);
}

function cargoSelect(m) {
  const sel = el('select', { class: 'mini-sel' }, CARGOS.map((c) =>
    el('option', { value: c, ...(c === m.cargo ? { selected: '' } : {}) }, c)));
  sel.addEventListener('change', async () => {
    try { await updateDivMiembro(m.id, { cargo: sel.value }); toast('Cargo actualizado'); render(); }
    catch (e) { toast(e.message, 'err'); render(); }
  });
  return sel;
}

// --------------------------- Asignar integrante ----------------------------
function openAsignar(divPref = '') {
  const s = getState();
  const f = {};
  const personas = [...s.personal].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

  f.persona = el('select', {}, [el('option', { value: '' }, '— Selecciona mariscal —'),
    ...personas.map((p) => el('option', { value: p.id }, `${p.nombre} · ${p.rango || '—'}`))]);

  const listId = 'dl-div';
  f.division = el('input', { value: divPref, list: listId, placeholder: 'Ej.: SOG' });
  const dl = el('datalist', { id: listId }, DIVISIONES.map(([sig, nom]) => el('option', { value: sig }, nom)));

  f.cargo = el('select', {}, CARGOS.map((c) => el('option', { value: c }, c)));

  async function save() {
    const personaId = f.persona.value;
    const division = f.division.value.trim();
    if (!personaId) return toast('Selecciona un mariscal', 'err');
    if (!division) return toast('Indica la división', 'err');
    try {
      await addDivMiembro({ personaId, division, cargo: f.cargo.value });
      toast('Integrante asignado'); closeModal(); render();
    } catch (e) {
      toast(/duplicate|unique/i.test(e.message) ? 'Ese mariscal ya está en esa división.' : e.message, 'err');
    }
  }

  const body = el('div', { class: 'form-grid' }, [
    el('label', { class: 'field full' }, [el('span', {}, 'Mariscal'), f.persona]),
    el('label', { class: 'field' }, [el('span', {}, 'División'), el('div', { class: 'with-datalist' }, [f.division, dl])]),
    field('Cargo', f.cargo),
    el('div', { class: 'row gap end full' }, [
      el('button', { class: 'btn ghost', onClick: closeModal }, 'Cancelar'),
      el('button', { class: 'btn gold', onClick: save }, 'Asignar'),
    ]),
  ]);
  modal('Asignar a división', body, { wide: true });
}
