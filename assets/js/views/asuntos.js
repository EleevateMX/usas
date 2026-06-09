import { getState, addCaso, updateCaso, removeCaso } from '../store.js';
import { el, field, modal, closeModal, confirmDialog, toast, badge, fmtDate } from '../ui.js';
import { matchInfracciones, rangoSancion } from '../matcher.js';
import { render } from '../router.js';

const ESTADOS = ['Abierto', 'En análisis', 'Resuelto', 'Archivado'];

export function viewAsuntos() {
  const s = getState();
  const casos = [...s.casos].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  return el('div', { class: 'view' }, [
    el('div', { class: 'toolbar' }, [
      el('h2', {}, 'Asuntos Internos — Office of Professional Responsibility'),
      el('button', { class: 'btn gold', onClick: () => openCaso() }, '+ Nuevo reporte'),
    ]),

    el('div', { class: 'card info-strip' }, [
      el('span', {}, '🛡'),
      el('p', { class: 'muted small' }, 'Describe la situación reportada y el sistema delimitará automáticamente qué artículos de la normativa podrían vulnerarse, con su rango de sanción. La sugerencia es orientativa: la resolución final corresponde al explanatory (Arts. 79–91).'),
    ]),

    casos.length
      ? el('div', { class: 'grid cases' }, casos.map((c) => casoCard(c, s)))
      : el('div', { class: 'card empty' }, 'No hay reportes registrados. Crea el primero con “Nuevo reporte”.'),
  ]);
}

function casoCard(c, s) {
  const arts = (c.articulos || []).map((id) => s.normativa.find((a) => a.id === id)).filter(Boolean);
  return el('div', { class: 'card case' }, [
    el('div', { class: 'row between' }, [
      el('div', {}, [el('strong', {}, c.folio), el('span', { class: 'muted small' }, ` · ${fmtDate(c.fecha)}`)]),
      badge(c.estado, { 'Resuelto': 'ok', 'Abierto': 'red', 'En análisis': 'warn', 'Archivado': '' }[c.estado]),
    ]),
    el('div', { class: 'case-meta' }, [
      el('div', {}, [el('span', { class: 'muted small' }, 'Denunciado: '), el('strong', {}, c.denunciado || '—')]),
      el('div', {}, [el('span', { class: 'muted small' }, 'Denunciante: '), c.denunciante || '—']),
    ]),
    el('p', { class: 'case-desc' }, c.descripcion || el('span', { class: 'muted' }, 'Sin descripción')),
    arts.length
      ? el('div', { class: 'chips' }, arts.map((a) =>
          el('span', { class: 'chip imp', title: a.resumen }, `${a.titulo.split('—')[0].trim()} · ${rangoSancion(a)}`)))
      : el('div', { class: 'muted small' }, 'Sin artículos imputados aún.'),
    c.sancionAplicada ? el('div', { class: 'sanc' }, ['Sanción: ', el('strong', {}, c.sancionAplicada)]) : null,
    el('div', { class: 'row gap end' }, [
      el('button', { class: 'btn ghost small', onClick: () => openCaso(c) }, 'Abrir / Analizar'),
      el('button', { class: 'icon-btn', title: 'Eliminar', onClick: () =>
        confirmDialog(`¿Eliminar el caso ${c.folio}?`, () => { removeCaso(c.id); toast('Caso eliminado'); render(); }) }, '🗑'),
    ]),
  ]);
}

// --------------------------- Formulario / Analizador -----------------------
function openCaso(c = null) {
  const edit = !!c; const d = c || {}; const s = getState();
  const personalNombres = s.personal.map((p) => p.nombre).filter(Boolean);

  const f = {};
  const inp = (k, v, a = {}) => (f[k] = el('input', { value: v ?? '', ...a }));

  // Imputación seleccionada (ids). Editable por el analizador.
  let imputados = new Set(d.articulos || []);

  const sugeridosHost = el('div', { class: 'suggest-host' },
    el('p', { class: 'muted small' }, 'Escribe la descripción y pulsa “Analizar situación”.'));

  const desc = el('textarea', { rows: '5', placeholder: 'Ej.: El mariscal disparó armamento letal durante una persecución sin grabación y agredió verbalmente a un civil…' }, d.descripcion || '');

  function analizar() {
    const resultados = matchInfracciones(desc.value, [], s.normativa).slice(0, 12);
    sugeridosHost.innerHTML = '';
    if (!resultados.length) {
      sugeridosHost.append(el('p', { class: 'muted' }, 'No se encontraron coincidencias. Prueba con términos más específicos o imputa manualmente desde la normativa.'));
      return;
    }
    const maxSev = Math.max(...resultados.map((r) => r.articulo.sevMax));
    sugeridosHost.append(
      el('div', { class: 'row between' }, [
        el('h4', {}, `Posibles infracciones (${resultados.length})`),
        el('span', { class: 'muted small' }, `Severidad máx. sugerida: ${rangoSancion({ sevMin: maxSev, sevMax: maxSev })}`),
      ]),
      el('div', { class: 'sugg-list' }, resultados.map((r) => suggRow(r))),
    );
  }

  function suggRow(r) {
    const a = r.articulo;
    const checked = imputados.has(a.id);
    const cb = el('input', { type: 'checkbox', ...(checked ? { checked: '' } : {}) });
    cb.addEventListener('change', () => { cb.checked ? imputados.add(a.id) : imputados.delete(a.id); });
    return el('label', { class: 'sugg' }, [
      cb,
      el('div', { class: 'sugg-main' }, [
        el('div', { class: 'row between' }, [
          el('strong', {}, a.titulo),
          el('span', { class: `sev sev-${a.sevMax}` }, rangoSancion(a)),
        ]),
        el('div', { class: 'muted small' }, a.resumen),
        el('div', { class: 'sugg-foot' }, [
          el('span', { class: 'muted xsmall' }, a.libro),
          r.hits.length ? el('span', { class: 'match' }, `coincide: ${r.hits.slice(0, 4).join(', ')}`) : null,
          el('span', { class: 'score', title: 'Puntaje de relevancia' }, `★ ${r.score}`),
        ]),
      ]),
    ]);
  }

  const sel = (k, v, opts) => (f[k] = el('select', {}, opts.map((o) =>
    el('option', { value: o, ...(o === v ? { selected: '' } : {}) }, o))));

  const body = el('div', { class: 'caso-form' }, [
    el('div', { class: 'form-grid' }, [
      field('Denunciado (mariscal)', datalistInput('denunciado', d.denunciado, personalNombres, f)),
      field('Denunciante', inp('denunciante', d.denunciante)),
      field('Fecha del hecho', inp('fecha', d.fecha || new Date().toISOString().slice(0, 10), { type: 'date' })),
      field('Estado', sel('estado', d.estado || 'Abierto', ESTADOS)),
    ]),
    el('label', { class: 'field full' }, [el('span', {}, 'Descripción de la situación'), desc]),
    el('div', { class: 'row gap' }, [
      el('button', { class: 'btn navy', onClick: analizar }, '🔎 Analizar situación'),
      el('span', { class: 'muted small' }, 'Marca las infracciones que correspondan para imputarlas al caso.'),
    ]),
    sugeridosHost,
    el('label', { class: 'field full' }, [el('span', {}, 'Resolución / Sanción aplicada'),
      (f.sancionAplicada = el('input', { value: d.sancionAplicada || '', placeholder: 'Ej.: 1 strike + re-entrenamiento (Art. 43 Bis, 27)' }))]),
    el('div', { class: 'row gap end full' }, [
      el('button', { class: 'btn ghost', onClick: closeModal }, 'Cancelar'),
      el('button', { class: 'btn gold', onClick: save }, edit ? 'Guardar caso' : 'Crear caso'),
    ]),
  ]);

  function save() {
    const data = {
      denunciado: f.denunciado.value.trim(),
      denunciante: f.denunciante.value.trim(),
      fecha: f.fecha.value,
      estado: f.estado.value,
      descripcion: desc.value.trim(),
      articulos: [...imputados],
      sancionAplicada: f.sancionAplicada.value.trim(),
    };
    if (!data.descripcion) return toast('Describe la situación', 'err');
    if (edit) { updateCaso(c.id, data); toast('Caso actualizado'); }
    else { addCaso(data); toast('Caso creado'); }
    closeModal(); render();
  }

  // Si edita un caso con descripción, analiza automáticamente.
  modal(edit ? `${d.folio} — Análisis` : 'Nuevo reporte OPR', body, { wide: true });
  if (edit && desc.value.trim()) analizar();
}

function datalistInput(key, val, opciones, f) {
  const listId = 'dl-' + key;
  const input = el('input', { value: val || '', list: listId });
  f[key] = input;
  const dl = el('datalist', { id: listId }, opciones.map((o) => el('option', { value: o })));
  return el('div', { class: 'with-datalist' }, [input, dl]);
}
