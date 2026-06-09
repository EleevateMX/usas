import { getState, updateArticulo, addArticulo, removeArticulo, esDirectiva } from '../store.js';
import { el, field, modal, closeModal, confirmDialog, toast, badge } from '../ui.js';
import { icon } from '../icons.js';
import { rangoSancion } from '../matcher.js';
import { SEVERIDAD } from '../normativa-seed.js';
import { render } from '../router.js';

let q = '';
let libroFiltro = '';

function listaFiltrada() {
  const s = getState();
  return s.normativa.filter((a) =>
    (!libroFiltro || a.libro === libroFiltro) &&
    (!q || (a.titulo + a.resumen + a.tags.join(' ')).toLowerCase().includes(q.toLowerCase())));
}

function artCard(a) {
  const puedeEditar = esDirectiva();
  return el('div', { class: 'card norm' + (a.activo === false ? ' off' : '') }, [
    el('div', { class: 'row between' }, [
      el('div', {}, [el('strong', {}, a.titulo),
        el('div', { class: 'muted xsmall' }, `${a.libro} · ${a.capitulo}`)]),
      el('span', { class: `sev sev-${a.sevMax}` }, rangoSancion(a)),
    ]),
    el('p', { class: 'muted small' }, a.resumen),
    el('div', { class: 'row between' }, [
      el('div', { class: 'chips' }, a.tags.slice(0, 6).map((t) => el('span', { class: 'chip' }, t))),
      puedeEditar ? el('div', { class: 'nowrap' }, [
        el('button', { class: 'icon-btn', title: 'Editar', onClick: () => openArt(a) }, [icon('edit', 16)]),
        el('button', { class: 'icon-btn', title: 'Eliminar', onClick: () =>
          confirmDialog(`¿Eliminar ${a.titulo}?`, async () => { try { await removeArticulo(a.id); toast('Artículo eliminado'); render(); } catch (e) { toast(e.message, 'err'); } }) }, [icon('trash', 16)]),
      ]) : null,
    ]),
  ]);
}

// Refresca solo la lista y el contador (preserva foco del buscador).
function refreshList() {
  const lista = listaFiltrada();
  const host = document.getElementById('norm-list');
  if (host) { host.innerHTML = ''; lista.forEach((a) => host.append(artCard(a))); }
  const count = document.getElementById('norm-count');
  if (count) count.textContent = `${lista.length} de ${getState().normativa.length} artículos`;
}

export function viewNormativa() {
  const s = getState();
  const libros = [...new Set(s.normativa.map((a) => a.libro))];
  const lista = listaFiltrada();

  return el('div', { class: 'view' }, [
    el('div', { class: 'toolbar' }, [
      el('h2', {}, 'Normativa Interna'),
      esDirectiva()
        ? el('button', { class: 'btn gold', onClick: () => openArt() }, '+ Nuevo artículo')
        : el('span', { class: 'muted small' }, 'Edición restringida a Directive+'),
    ]),

    el('div', { class: 'row gap wrap filters' }, [
      el('input', { class: 'search', placeholder: 'Buscar artículo, palabra clave…', value: q,
        oninput: (e) => { q = e.target.value; refreshList(); } }),
      el('select', { onchange: (e) => { libroFiltro = e.target.value; refreshList(); } },
        [el('option', { value: '' }, 'Todos los libros'),
         ...libros.map((l) => el('option', { value: l, ...(l === libroFiltro ? { selected: '' } : {}) }, l))]),
      el('span', { id: 'norm-count', class: 'muted small' }, `${lista.length} de ${s.normativa.length} artículos`),
    ]),

    el('div', { class: 'norm-list', id: 'norm-list' }, lista.map(artCard)),
  ]);
}

function openArt(a = null) {
  const edit = !!a; const d = a || {}; const f = {};
  const inp = (k, v, at = {}) => (f[k] = el('input', { value: v ?? '', ...at }));
  const sevSel = (k, v) => (f[k] = el('select', {}, SEVERIDAD.map((label, i) =>
    el('option', { value: i, ...(i === v ? { selected: '' } : {}) }, `${i} · ${label}`))));

  const body = el('div', { class: 'form-grid' }, [
    el('label', { class: 'field full' }, [el('span', {}, 'Título / Artículo'), inp('titulo', d.titulo, { placeholder: 'Art. 116 — …' })]),
    field('Libro', inp('libro', d.libro || 'Personalizado')),
    field('Capítulo', inp('capitulo', d.capitulo)),
    field('Sanción mínima', sevSel('sevMin', d.sevMin ?? 0)),
    field('Sanción máxima', sevSel('sevMax', d.sevMax ?? 1)),
    el('label', { class: 'field full' }, [el('span', {}, 'Resumen / Descripción'),
      (f.resumen = el('textarea', { rows: '3' }, d.resumen || ''))]),
    el('label', { class: 'field full' }, [el('span', {}, 'Etiquetas (coma) — alimentan el analizador de Asuntos Internos'),
      inp('tags', (d.tags || []).join(', '))]),
    el('label', { class: 'field row gap full', style: 'align-items:center' }, [
      (f.activo = el('input', { type: 'checkbox', ...(d.activo !== false ? { checked: '' } : {}) })),
      el('span', {}, 'Artículo vigente (incluido en el análisis)'),
    ]),
    el('div', { class: 'row gap end full' }, [
      el('button', { class: 'btn ghost', onClick: closeModal }, 'Cancelar'),
      el('button', { class: 'btn gold', onClick: save }, edit ? 'Guardar' : 'Crear'),
    ]),
  ]);

  async function save() {
    const data = {
      titulo: f.titulo.value.trim(),
      libro: f.libro.value.trim() || 'Personalizado',
      capitulo: f.capitulo.value.trim(),
      sevMin: +f.sevMin.value, sevMax: +f.sevMax.value,
      resumen: f.resumen.value.trim(),
      tags: f.tags.value.split(',').map((x) => x.trim()).filter(Boolean),
      activo: f.activo.checked,
    };
    if (!data.titulo) return toast('El título es obligatorio', 'err');
    if (data.sevMax < data.sevMin) [data.sevMin, data.sevMax] = [data.sevMax, data.sevMin];
    try {
      if (edit) { await updateArticulo(a.id, data); toast('Artículo actualizado'); }
      else { await addArticulo(data); toast('Artículo creado'); }
      closeModal(); render();
    } catch (e) { toast(e.message, 'err'); }
  }

  modal(edit ? 'Editar artículo' : 'Nuevo artículo', body, { wide: true });
}
