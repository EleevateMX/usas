// ===========================================================================
//  USMS Training Division — Programa académico (panel de maestros)
//  Los maestros/supervisores TD liberan los temas día a día, registran a los
//  DUSMT y les dan seguimiento. El portal de estudio público es academia.html.
// ===========================================================================
import { getState, esTD, addModulo, updateModulo, removeModulo,
  addAspirante, updateAspirante, removeAspirante, addSeguimiento, removeSeguimiento,
  addAnuncio, updateAnuncio, removeAnuncio, crearAcademiaConRoster } from '../store.js';
import { el, field, modal, closeModal, confirmDialog, toast, badge, fmtDate, fmtDateTime } from '../ui.js';
import { icon } from '../icons.js';
import { render } from '../router.js';
import { abrirLectorManual } from '../manual-reader.js';
import { MANUALES } from '../manuales.js';

const portalURL = () => location.origin + location.pathname.replace(/[^/]*$/, '') + 'academia.html';
const TIPO_LBL = { nota: 'Nota', asistencia: 'Asistencia', calificacion: 'Calificación' };
const TIPO_KIND = { nota: '', asistencia: 'warn', calificacion: 'gold' };

export function viewAcademia() {
  const s = getState();
  const gestor = esTD();
  const modulos = [...s.tdModulos].sort((a, b) => a.orden - b.orden);
  const liberados = modulos.filter((m) => m.liberado);
  const enCurso = s.examenSesiones.filter((x) => x.activa);

  const progresoDe = (asp) => {
    if (!liberados.length) return 0;
    const hechos = s.tdProgreso.filter((p) => p.discord === asp.discord && p.completado).length;
    return Math.round((Math.min(hechos, liberados.length) / liberados.length) * 100);
  };
  const progPromedio = s.tdAspirantes.length
    ? Math.round(s.tdAspirantes.reduce((a, x) => a + progresoDe(x), 0) / s.tdAspirantes.length) : 0;

  const url = portalURL();

  return el('div', { class: 'view' }, [
    el('div', { class: 'toolbar' }, [
      el('h2', {}, 'Programa Académico — Training Division'),
      gestor ? el('div', { class: 'row gap' }, [
        el('button', { class: 'btn ghost ic', onClick: () => openAnuncio() }, [icon('plus', 15), 'Anuncio']),
        el('button', { class: 'btn ghost ic', onClick: () => openModulo() }, [icon('plus', 15), 'Módulo / día']),
        el('button', { class: 'btn gold ic', onClick: () => openAgregarAcademia() }, [icon('plus', 15), 'Agregar Academia']),
      ]) : el('span', { class: 'muted small' }, 'Vista de solo lectura'),
    ]),

    el('div', { class: 'card info-strip' }, [
      el('span', { class: 'strip-ico' }, [icon('training', 22)]),
      el('p', { class: 'muted small' }, 'Libera los temas día a día: los DUSMT solo verán los módulos marcados como “liberados” en el portal de estudio. Comparte el enlace del portal con los aspirantes; tú llevas el control y el seguimiento aquí.'),
    ]),

    // Enlace del portal de estudio + academia en curso
    el('div', { class: 'grid two' }, [
      el('div', { class: 'card' }, [
        el('div', { class: 'card-head' }, [el('h3', { class: 'h-ico' }, [icon('link', 16), 'Portal de estudio (DUSMT)']), null]),
        el('div', { class: 'row gap aca-link' }, [
          el('input', { class: 'search', style: 'flex:1;min-width:0', value: url, readonly: '' }),
          el('button', { class: 'btn ghost small ic', onClick: () => navigator.clipboard.writeText(url).then(() => toast('Enlace copiado')).catch(() => toast('No se pudo copiar', 'err')) }, [icon('copy', 14), 'Copiar']),
          el('a', { class: 'btn navy small', href: url, target: '_blank' }, 'Abrir'),
        ]),
        el('p', { class: 'muted small' }, 'Sin login: el aspirante entra con su nombre y Discord, y estudia los temas liberados.'),
      ]),
      el('div', { class: 'card' }, [
        el('div', { class: 'card-head' }, [el('h3', { class: 'h-ico' }, [icon('clock', 16), 'Academia en curso']), null]),
        enCurso.length
          ? el('div', { class: 'list' }, enCurso.map((x) => el('div', { class: 'list-item' }, [
              el('div', {}, [el('strong', {}, x.nombre), el('div', { class: 'muted small' }, `${x.tipo} · ${x.duracionMin} min`)]),
              badge('activa', 'ok'),
            ])))
          : el('p', { class: 'muted small' }, 'No hay academia activa. Actívala en Training Division.'),
      ]),
    ]),

    el('div', { class: 'grid kpis' }, [
      kpi('Módulos', modulos.length, `${liberados.length} liberados`, 'gold', 'training'),
      kpi('Aspirantes', s.tdAspirantes.length, 'en el portal', '', 'personal'),
      kpi('Progreso medio', progPromedio + '%', 'de los aspirantes', 'green', 'award'),
      kpi('Seguimientos', s.tdSeguimiento.length, 'notas registradas', '', 'file'),
    ]),

    // Anuncios
    el('div', { class: 'card' }, [
      el('div', { class: 'card-head' }, [el('h3', { class: 'h-ico' }, [icon('alert', 16), 'Anuncios de la academia']),
        el('span', { class: 'muted small' }, 'visibles para los aspirantes en su portal')]),
      s.tdAnuncios.length
        ? el('div', { class: 'anuncios' }, s.tdAnuncios.map((an) => anuncioRow(an, gestor)))
        : el('p', { class: 'muted' }, gestor ? 'Publica un anuncio para apoyar lo que sale en Discord.' : 'Sin anuncios.'),
    ]),

    // Programa (módulos)
    el('div', { class: 'card' }, [
      el('div', { class: 'card-head' }, [el('h3', { class: 'h-ico' }, [icon('layers', 16), 'Programa — temas por día']),
        el('span', { class: 'muted small' }, `${liberados.length}/${modulos.length} liberados`)]),
      modulos.length
        ? el('div', { class: 'prog-list' }, modulos.map((m) => moduloRow(m, gestor)))
        : el('p', { class: 'muted' }, 'Sin módulos. Crea el primer día del programa.'),
    ]),

    // Biblioteca de manuales
    el('div', { class: 'card' }, [
      el('div', { class: 'card-head' }, [el('h3', { class: 'h-ico' }, [icon('normativa', 16), 'Biblioteca de manuales']),
        el('span', { class: 'muted small' }, 'lectura integrada (sin salir a Google)')]),
      el('div', { class: 'biblio' }, MANUALES.map((man) => man.enApp
        ? el('button', { class: 'biblio-item app', onClick: () => abrirLectorManual(man.slug) }, [icon('file', 15), el('span', {}, man.titulo), el('span', { class: 'tema-pill' }, 'leer en app')])
        : el('a', { class: 'biblio-item', href: man.url, target: '_blank' }, [icon('file', 15), el('span', {}, man.titulo), icon('link', 13)]))),
    ]),

    // Aspirantes
    el('div', { class: 'card no-pad' }, [
      el('div', { class: 'card-head', style: 'padding:16px 18px 0' }, [el('h3', { class: 'h-ico' }, [icon('personal', 16), 'Aspirantes (DUSMT)']),
        gestor ? el('button', { class: 'btn ghost small ic', onClick: () => openAspiranteIndividual() }, [icon('plus', 13), 'Aspirante'])
          : el('span', { class: 'muted small' }, 'progreso de estudio y seguimiento')]),
      s.tdAspirantes.length
        ? el('table', { class: 'tbl rows' }, [
            el('thead', {}, el('tr', {}, [el('th', {}, 'Aspirante'), el('th', {}, 'Discord'), el('th', {}, 'Estado'),
              el('th', {}, 'Progreso'), el('th', {}, 'Seguimiento'), el('th', {}, '')])),
            el('tbody', {}, s.tdAspirantes.map((a) => aspiranteRow(a, s, progresoDe(a), gestor))),
          ])
        : el('div', { class: 'empty' }, 'Aún no hay aspirantes. Se registran solos desde el portal o los agregas con “Aspirante”.'),
    ]),
  ]);
}

function moduloRow(m, gestor) {
  return el('div', { class: 'prog-mod' + (m.liberado ? ' on' : '') }, [
    el('div', { class: 'prog-mod-head' }, [
      el('span', { class: 'prog-num' }, String(m.orden)),
      el('div', { class: 'prog-mod-main' }, [
        el('strong', {}, m.titulo),
        m.descripcion ? el('div', { class: 'muted small' }, m.descripcion) : null,
      ]),
      m.liberado ? badge('liberado', 'ok') : badge('bloqueado', ''),
      gestor ? el('div', { class: 'nowrap' }, [
        el('button', { class: 'btn ghost small', onClick: async () => { try { await updateModulo(m.id, { liberado: !m.liberado }); toast(m.liberado ? 'Tema bloqueado' : 'Tema liberado'); render(); } catch (e) { toast(e.message, 'err'); } } }, m.liberado ? 'Bloquear' : 'Liberar'),
        el('button', { class: 'icon-btn', title: 'Editar', onClick: () => openModulo(m) }, [icon('edit', 15)]),
        el('button', { class: 'icon-btn', title: 'Eliminar', onClick: () =>
          confirmDialog(`¿Eliminar “${m.titulo}”?`, async () => { try { await removeModulo(m.id); toast('Módulo eliminado'); render(); } catch (e) { toast(e.message, 'err'); } }) }, [icon('trash', 15)]),
      ]) : null,
    ]),
    (m.temas || []).length
      ? el('div', { class: 'prog-temas' }, m.temas.map((t) => t.manual
          ? el('button', { class: 'tema-chip lectura', onClick: () => abrirLectorManual(t.manual) }, [icon('file', 13), t.nombre, el('span', { class: 'tema-pill' }, 'leer')])
          : t.url
            ? el('a', { class: 'tema-chip', href: t.url, target: '_blank' }, [icon('file', 13), t.nombre])
            : el('span', { class: 'tema-chip nolink' }, [icon('file', 13), t.nombre])))
      : null,
  ]);
}

function aspiranteRow(a, s, pct, gestor) {
  const notas = s.tdSeguimiento.filter((x) => x.aspiranteId === a.id).length;
  return el('tr', {}, [
    el('td', {}, [el('strong', {}, a.nombre), a.registrado ? null : el('span', { class: 'muted xsmall' }, ' · sin registrar')]),
    el('td', { class: 'muted small' }, a.discord || '—'),
    el('td', {}, [badge(a.estado, a.estado === 'Aprobado' ? 'ok' : a.estado === 'Baja' ? 'red' : 'warn'),
      a.examenHabilitado ? badge('examen', 'gold') : null]),
    el('td', {}, el('div', { class: 'prog-cell' }, [
      el('div', { class: 'prog-bar' }, [el('div', { class: 'prog-fill', style: `width:${pct}%` })]),
      el('span', { class: 'muted small' }, `${pct}%`),
    ])),
    el('td', {}, el('button', { class: 'btn ghost small ic', onClick: () => openSeguimiento(a) }, [icon('file', 14), `${notas}`])),
    el('td', { class: 'right nowrap' }, gestor ? [
      el('button', { class: 'icon-btn', title: 'Eliminar aspirante', onClick: () =>
        confirmDialog(`¿Eliminar a ${a.nombre} del portal?`, async () => { try { await removeAspirante(a.id); toast('Aspirante eliminado'); render(); } catch (e) { toast(e.message, 'err'); } }) }, [icon('trash', 15)]),
    ] : null),
  ]);
}

// --------------------------- Seguimiento del aspirante ---------------------
function openSeguimiento(a) {
  const s = getState();
  const gestor = esTD();
  const yo = s.perfil?.nombre || s.perfil?.email || '';
  const notas = s.tdSeguimiento.filter((x) => x.aspiranteId === a.id);
  const modulos = [...s.tdModulos].sort((x, y) => x.orden - y.orden);
  const f = {};

  f.tipo = el('select', {}, Object.entries(TIPO_LBL).map(([v, l]) => el('option', { value: v }, l)));
  f.modulo = el('select', {}, [el('option', { value: '' }, 'General'),
    ...modulos.map((m) => el('option', { value: m.orden }, `Día ${m.orden}`))]);
  f.contenido = el('textarea', { rows: '2', placeholder: 'Observación, avance, asistencia, calificación…' });
  f.visible = el('input', { type: 'checkbox', checked: '' });

  async function registrar() {
    if (!f.contenido.value.trim()) return toast('Escribe el seguimiento', 'err');
    try {
      await addSeguimiento({ aspiranteId: a.id, autor: yo, tipo: f.tipo.value,
        moduloOrden: f.modulo.value ? +f.modulo.value : null, contenido: f.contenido.value.trim(),
        visibleAspirante: f.visible.checked });
      toast('Seguimiento registrado'); closeModal(); openSeguimiento(getState().tdAspirantes.find((x) => x.id === a.id) || a); render();
    } catch (e) { toast(e.message, 'err'); }
  }

  const estadoSel = el('select', {}, ['En curso', 'Aprobado', 'Baja'].map((e) =>
    el('option', { value: e, ...(e === a.estado ? { selected: '' } : {}) }, e)));
  estadoSel.addEventListener('change', async () => { try { await updateAspirante(a.id, { estado: estadoSel.value }); toast('Estado actualizado'); render(); } catch (e) { toast(e.message, 'err'); } });

  // Asignación de examen al aspirante
  const sesSel = el('select', {}, [el('option', { value: '' }, '— Academia del examen —'),
    ...s.examenSesiones.map((x) => el('option', { value: x.id, ...(x.id === a.examenSesionId ? { selected: '' } : {}) }, `${x.nombre}${x.activa ? '' : ' (cerrada)'}`))]);
  const habBtn = el('button', { class: 'btn ' + (a.examenHabilitado ? 'ghost' : 'gold') + ' small' }, a.examenHabilitado ? 'Quitar examen' : 'Habilitar examen');
  habBtn.addEventListener('click', async () => {
    try {
      if (a.examenHabilitado) await updateAspirante(a.id, { examenHabilitado: false });
      else { if (!sesSel.value) return toast('Elige la academia del examen', 'err'); await updateAspirante(a.id, { examenSesionId: sesSel.value, examenHabilitado: true }); }
      toast('Examen actualizado'); closeModal(); openSeguimiento(getState().tdAspirantes.find((x) => x.id === a.id) || a); render();
    } catch (e) { toast(e.message, 'err'); }
  });
  const examenBlock = el('div', { class: 'card sub' }, [
    el('div', { class: 'row between' }, [el('h4', { style: 'margin:0' }, 'Examen del aspirante'),
      a.examenHabilitado ? badge('habilitado', 'ok') : badge('no asignado', '')]),
    el('div', { class: 'row gap', style: 'margin-top:8px' }, [sesSel, habBtn]),
    el('p', { class: 'muted xsmall' }, 'Al habilitarlo, el aspirante verá el botón para presentar el examen en su portal.'),
  ]);

  const lista = notas.length
    ? el('div', { class: 'seg-list' }, notas.map((n) => el('div', { class: 'seg-item' }, [
        el('div', { class: 'row between' }, [
          el('span', {}, [badge(TIPO_LBL[n.tipo], TIPO_KIND[n.tipo]), n.moduloOrden ? el('span', { class: 'muted small' }, ` · Día ${n.moduloOrden}`) : null,
            n.visibleAspirante ? null : el('span', { class: 'muted xsmall' }, ' · privado')]),
          el('span', { class: 'muted xsmall' }, fmtDateTime(n.fecha)),
        ]),
        el('p', { class: 'seg-txt' }, n.contenido),
        el('div', { class: 'row between' }, [el('span', { class: 'muted xsmall' }, n.autor || '—'),
          gestor ? el('button', { class: 'icon-btn', title: 'Eliminar', onClick: () =>
            confirmDialog('¿Eliminar este seguimiento?', async () => { try { await removeSeguimiento(n.id); toast('Eliminado'); closeModal(); openSeguimiento(a); render(); } catch (e) { toast(e.message, 'err'); } }) }, [icon('trash', 14)]) : null]),
      ])))
    : el('p', { class: 'muted small' }, 'Sin seguimiento aún.');

  const body = el('div', { class: 'seg' }, [
    el('div', { class: 'row between' }, [
      el('div', {}, [el('strong', {}, a.nombre),
        el('div', { class: 'muted small' }, `${a.discord}${a.registrado ? ' · HASH ' + a.hash : ' · sin registrar'}`)]),
      gestor ? el('label', { class: 'row gap', style: 'align-items:center' }, [el('span', { class: 'muted small' }, 'Estado'), estadoSel]) : badge(a.estado, 'warn'),
    ]),
    gestor ? examenBlock : null,
    gestor ? el('div', { class: 'card sub' }, [
      el('h4', {}, 'Registrar seguimiento'),
      el('div', { class: 'form-grid compact' }, [
        field('Tipo', f.tipo), field('Día', f.modulo),
        el('label', { class: 'field full' }, [el('span', {}, 'Detalle'), f.contenido]),
        el('label', { class: 'field row gap full', style: 'align-items:center' }, [f.visible, el('span', {}, 'Visible para el aspirante en su portal')]),
        el('button', { class: 'btn gold full', onClick: registrar }, '+ Registrar'),
      ]),
    ]) : null,
    el('h4', {}, 'Historial de seguimiento'),
    lista,
    el('div', { class: 'row gap end' }, [el('button', { class: 'btn ghost', onClick: closeModal }, 'Cerrar')]),
  ]);
  modal('Seguimiento — ' + a.nombre, body, { wide: true });
}

// ------------------------------ Alta de módulo -----------------------------
function openModulo(m = null) {
  const edit = !!m; const d = m || {}; const f = {};
  f.titulo = el('input', { value: d.titulo || '', placeholder: 'Ej.: Día 6 — Examen práctico' });
  f.orden = el('input', { type: 'number', min: '1', value: String(d.orden || (getState().tdModulos.length + 1)) });
  f.descripcion = el('input', { value: d.descripcion || '', placeholder: 'Breve descripción del día' });
  f.liberado = el('input', { type: 'checkbox', ...(d.liberado ? { checked: '' } : {}) });
  const temasTxt = (d.temas || []).map((t) => `${t.nombre} | ${t.url || ''}`).join('\n');
  f.temas = el('textarea', { rows: '4', placeholder: 'Un tema por línea:\nNombre del manual | https://enlace' }, temasTxt);
  f.guia = el('textarea', { rows: '3', placeholder: 'Resumen / repaso del día (se muestra en el portal de estudio).' }, d.guia || '');

  async function save() {
    const titulo = f.titulo.value.trim();
    if (!titulo) return toast('Ponle un título al módulo', 'err');
    const temas = f.temas.value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const [nombre, url] = l.split('|').map((x) => x.trim());
      return { nombre: nombre || l, url: url || '' };
    });
    const data = { titulo, orden: +f.orden.value || 1, descripcion: f.descripcion.value.trim(), temas, guia: f.guia.value.trim(), liberado: f.liberado.checked };
    try {
      if (edit) { await updateModulo(m.id, data); toast('Módulo actualizado'); }
      else { await addModulo(data); toast('Módulo creado'); }
      closeModal(); render();
    } catch (e) { toast(e.message, 'err'); }
  }

  const body = el('div', { class: 'form-grid' }, [
    el('label', { class: 'field full' }, [el('span', {}, 'Título del día'), f.titulo]),
    field('Orden (día)', f.orden),
    el('label', { class: 'field row gap', style: 'align-items:center' }, [f.liberado, el('span', {}, 'Liberado a los DUSMT')]),
    el('label', { class: 'field full' }, [el('span', {}, 'Descripción'), f.descripcion]),
    el('label', { class: 'field full' }, [el('span', {}, 'Temas / manuales (nombre | enlace)'), f.temas]),
    el('label', { class: 'field full' }, [el('span', {}, 'Guía de estudio / repaso del día'), f.guia]),
    el('div', { class: 'row gap end full' }, [
      el('button', { class: 'btn ghost', onClick: closeModal }, 'Cancelar'),
      el('button', { class: 'btn gold', onClick: save }, edit ? 'Guardar' : 'Crear'),
    ]),
  ]);
  modal(edit ? 'Editar módulo' : 'Nuevo módulo / día', body, { wide: true });
}

// ------------------------------ Anuncios -----------------------------------
function anuncioRow(an, gestor) {
  return el('div', { class: 'anuncio' + (an.fijado ? ' fijado' : '') }, [
    el('div', { class: 'row between' }, [
      el('div', {}, [an.fijado ? badge('Fijado', 'gold') : null, el('strong', {}, ' ' + an.titulo)]),
      el('span', { class: 'muted xsmall' }, fmtDateTime(an.fecha)),
    ]),
    an.contenido ? el('p', { class: 'anuncio-txt' }, an.contenido) : null,
    el('div', { class: 'row between' }, [
      el('span', { class: 'muted xsmall' }, an.autor || '—'),
      gestor ? el('div', { class: 'nowrap' }, [
        el('button', { class: 'icon-btn', title: 'Editar', onClick: () => openAnuncio(an) }, [icon('edit', 14)]),
        el('button', { class: 'icon-btn', title: 'Eliminar', onClick: () =>
          confirmDialog('¿Eliminar este anuncio?', async () => { try { await removeAnuncio(an.id); toast('Anuncio eliminado'); render(); } catch (e) { toast(e.message, 'err'); } }) }, [icon('trash', 14)]),
      ]) : null,
    ]),
  ]);
}

function openAnuncio(an = null) {
  const edit = !!an; const d = an || {}; const f = {};
  const yo = getState().perfil?.nombre || getState().perfil?.email || '';
  f.titulo = el('input', { value: d.titulo || '', placeholder: 'Título del anuncio' });
  f.contenido = el('textarea', { rows: '4', placeholder: 'Contenido del anuncio (apoyo a lo publicado en Discord).' }, d.contenido || '');
  f.fijado = el('input', { type: 'checkbox', ...(d.fijado ? { checked: '' } : {}) });
  async function save() {
    if (!f.titulo.value.trim()) return toast('Ponle un título', 'err');
    const data = { titulo: f.titulo.value.trim(), contenido: f.contenido.value.trim(), fijado: f.fijado.checked, autor: edit ? d.autor : yo };
    try { if (edit) await updateAnuncio(an.id, data); else await addAnuncio(data); toast('Anuncio guardado'); closeModal(); render(); }
    catch (e) { toast(e.message, 'err'); }
  }
  const body = el('div', { class: 'form-grid' }, [
    el('label', { class: 'field full' }, [el('span', {}, 'Título'), f.titulo]),
    el('label', { class: 'field full' }, [el('span', {}, 'Contenido'), f.contenido]),
    el('label', { class: 'field row gap full', style: 'align-items:center' }, [f.fijado, el('span', {}, 'Fijar arriba')]),
    el('div', { class: 'row gap end full' }, [
      el('button', { class: 'btn ghost', onClick: closeModal }, 'Cancelar'),
      el('button', { class: 'btn gold', onClick: save }, edit ? 'Guardar' : 'Publicar'),
    ]),
  ]);
  modal(edit ? 'Editar anuncio' : 'Nuevo anuncio', body, { wide: true });
}

// ----------------------------- Agregar Academia ----------------------------
// Crea una academia y precarga su roster: cada aspirante queda listo para
// ingresar al aula con su Nombre_Apellido + #HASH# (sin registrarse).
const TIPOS_AC = { rapida: 'Academia Rápida (AMTP)', convencional: 'Academia Convencional', reingreso: 'Reingreso', custom: 'Personalizado' };
const PRESETS_AC = {
  rapida: { faciles: 10, medias: 10, dificiles: 6, duracionMin: 20 },
  convencional: { faciles: 8, medias: 10, dificiles: 8, duracionMin: 25 },
  reingreso: { faciles: 14, medias: 5, dificiles: 2, duracionMin: 15 },
  custom: { faciles: 10, medias: 8, dificiles: 6, duracionMin: 20 },
};

function openAgregarAcademia() {
  const s = getState();
  const yaNombres = new Set(s.tdAspirantes.map((a) => clave(a.nombre)));
  const dusmt = s.personal
    .filter((p) => (p.rango || '').toUpperCase() === 'DUSMT' || p.estado === 'Trainee')
    .filter((p) => !yaNombres.has(clave(p.nombre)))
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

  const f = {};
  f.nombre = el('input', { placeholder: 'Ej.: Academia XI' });
  f.tipo = el('select', {}, Object.entries(TIPOS_AC).map(([v, l]) => el('option', { value: v }, l)));

  const seleccion = new Map(); // nombre -> {nombre, hash, discord}
  const lista = dusmt.length
    ? el('div', { class: 'chk-grid' }, dusmt.map((p) => {
        const cb = el('input', { type: 'checkbox' });
        cb.addEventListener('change', () => { cb.checked ? seleccion.set(p.nombre, { nombre: p.nombre, hash: p.hash || '', discord: p.discordId || '' }) : seleccion.delete(p.nombre); });
        return el('label', { class: 'chk' }, [cb, el('span', {}, [el('strong', {}, p.nombre),
          el('span', { class: 'muted small' }, p.hash ? ` · ${p.hash}` : ' · sin #HASH#')])]);
      }))
    : el('p', { class: 'muted small' }, 'No hay mariscales DUSMT libres. Créalos en Personal o usa la lista manual.');

  const manual = el('textarea', { rows: '3', placeholder: 'Manual, uno por línea:\nNombre_Apellido | #HASH#' });

  async function save() {
    const nombre = f.nombre.value.trim();
    if (!nombre) return toast('Ponle nombre a la academia', 'err');
    const manualList = manual.value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const [n, h] = l.split('|').map((x) => (x || '').trim());
      return { nombre: n, hash: h || '', discord: '' };
    }).filter((x) => x.nombre.length >= 3);

    const vistos = new Set(yaNombres);
    const aspirantes = [];
    for (const a of [...seleccion.values(), ...manualList]) {
      const k = clave(a.nombre);
      if (!vistos.has(k)) { vistos.add(k); aspirantes.push(a); }
    }
    const sinHash = aspirantes.filter((a) => !a.hash).map((a) => a.nombre);
    const preset = PRESETS_AC[f.tipo.value] || PRESETS_AC.custom;
    try {
      await crearAcademiaConRoster({ nombre, tipo: f.tipo.value, ...preset, aspirantes });
      toast(`Academia creada con ${aspirantes.length} aspirante(s)` + (sinHash.length ? ` · ${sinHash.length} sin #HASH#` : ''));
      closeModal(); render();
    } catch (e) { toast(e.message, 'err'); }
  }

  const body = el('div', {}, [
    el('p', { class: 'muted small' }, 'Crea la academia y su lista de aspirantes. Cada uno entrará al aula con su Nombre_Apellido y su #HASH# (sin registrarse). Los que no tengan #HASH# se agregan, pero no podrán entrar hasta asignárselo.'),
    el('div', { class: 'form-grid' }, [
      el('label', { class: 'field full' }, [el('span', {}, 'Nombre de la academia'), f.nombre]),
      field('Tipo de examen', f.tipo),
    ]),
    el('div', { class: 'card sub' }, [el('h4', {}, [icon('personal', 14), ' Tomar de los DUSMT']), lista]),
    el('div', { class: 'card sub' }, [el('h4', {}, [icon('plus', 14), ' Agregar manualmente']),
      el('label', { class: 'field full' }, [el('span', {}, 'Nombre_Apellido | #HASH#'), manual])]),
    el('div', { class: 'row gap end' }, [
      el('button', { class: 'btn ghost', onClick: closeModal }, 'Cancelar'),
      el('button', { class: 'btn gold', onClick: save }, 'Crear academia'),
    ]),
  ]);
  modal('Agregar Academia', body, { wide: true });
}

// Alta individual de un aspirante a una academia existente.
function openAspiranteIndividual() {
  const s = getState();
  const f = {};
  f.nombre = el('input', { placeholder: 'Nombre_Apellido' });
  f.hash = el('input', { placeholder: '#HASH#' });
  f.discord = el('input', { placeholder: 'Discord (opcional)' });
  f.sesion = el('select', {}, [el('option', { value: '' }, '— Academia (opcional) —'),
    ...s.examenSesiones.map((x) => el('option', { value: x.id }, `${x.nombre}${x.activa ? '' : ' (cerrada)'}`))]);
  async function save() {
    if (f.nombre.value.trim().length < 3) return toast('Nombre completo', 'err');
    if (f.hash.value.trim().length < 1) return toast('Indica el #HASH#', 'err');
    try {
      await addAspirante({ nombre: f.nombre.value.trim(), hash: f.hash.value.trim(), discord: f.discord.value.trim(),
        sesionId: f.sesion.value || null, examenSesionId: f.sesion.value || null });
      toast('Aspirante agregado'); closeModal(); render();
    } catch (e) { toast(e.message, 'err'); }
  }
  const body = el('div', { class: 'form-grid' }, [
    el('label', { class: 'field full' }, [el('span', {}, 'Nombre_Apellido'), f.nombre]),
    field('#HASH# (contraseña de acceso)', f.hash),
    field('Discord', f.discord),
    el('label', { class: 'field full' }, [el('span', {}, 'Academia'), f.sesion]),
    el('div', { class: 'row gap end full' }, [
      el('button', { class: 'btn ghost', onClick: closeModal }, 'Cancelar'),
      el('button', { class: 'btn gold', onClick: save }, 'Agregar'),
    ]),
  ]);
  modal('Nuevo aspirante', body, { wide: true });
}

const clave = (s) => (s || '').toString().trim().toLowerCase().replace(/[_\s]+/g, ' ');

const kpi = (label, value, sub, cls, ic) => el('div', { class: `card kpi ${cls}` }, [
  el('span', { class: 'kpi-ico' }, [icon(ic, 26)]),
  el('div', { class: 'kpi-val' }, String(value)),
  el('div', { class: 'kpi-label' }, label),
  sub ? el('div', { class: 'kpi-sub' }, sub) : null,
]);
