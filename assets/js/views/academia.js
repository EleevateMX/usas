// ===========================================================================
//  USMS Training Division — Programa académico (panel de maestros)
//  Los maestros/supervisores TD liberan los temas día a día, registran a los
//  DUSMT y les dan seguimiento. El portal de estudio público es academia.html.
// ===========================================================================
import { getState, esTD, addModulo, updateModulo, removeModulo,
  addAspirante, updateAspirante, removeAspirante, addSeguimiento, removeSeguimiento } from '../store.js';
import { el, field, modal, closeModal, confirmDialog, toast, badge, fmtDate, fmtDateTime } from '../ui.js';
import { icon } from '../icons.js';
import { render } from '../router.js';

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
        el('button', { class: 'btn navy ic', onClick: () => openAspirante() }, [icon('plus', 15), 'Aspirante']),
        el('button', { class: 'btn gold ic', onClick: () => openModulo() }, [icon('plus', 15), 'Módulo / día']),
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

    // Programa (módulos)
    el('div', { class: 'card' }, [
      el('div', { class: 'card-head' }, [el('h3', { class: 'h-ico' }, [icon('layers', 16), 'Programa — temas por día']),
        el('span', { class: 'muted small' }, `${liberados.length}/${modulos.length} liberados`)]),
      modulos.length
        ? el('div', { class: 'prog-list' }, modulos.map((m) => moduloRow(m, gestor)))
        : el('p', { class: 'muted' }, 'Sin módulos. Crea el primer día del programa.'),
    ]),

    // Aspirantes
    el('div', { class: 'card no-pad' }, [
      el('div', { class: 'card-head', style: 'padding:16px 18px 0' }, [el('h3', { class: 'h-ico' }, [icon('personal', 16), 'Aspirantes (DUSMT)']),
        el('span', { class: 'muted small' }, 'progreso de estudio y seguimiento')]),
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
      ? el('div', { class: 'prog-temas' }, m.temas.map((t) => t.url
          ? el('a', { class: 'tema-chip', href: t.url, target: '_blank' }, [icon('file', 13), t.nombre])
          : el('span', { class: 'tema-chip nolink' }, [icon('file', 13), t.nombre])))
      : null,
  ]);
}

function aspiranteRow(a, s, pct, gestor) {
  const notas = s.tdSeguimiento.filter((x) => x.aspiranteId === a.id).length;
  return el('tr', {}, [
    el('td', {}, [el('strong', {}, a.nombre)]),
    el('td', { class: 'muted small' }, a.discord || '—'),
    el('td', {}, badge(a.estado, a.estado === 'Aprobado' ? 'ok' : a.estado === 'Baja' ? 'red' : 'warn')),
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
      el('div', {}, [el('strong', {}, a.nombre), el('span', { class: 'muted small' }, ` · ${a.discord}`)]),
      gestor ? el('label', { class: 'row gap', style: 'align-items:center' }, [el('span', { class: 'muted small' }, 'Estado'), estadoSel]) : badge(a.estado, 'warn'),
    ]),
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

  async function save() {
    const titulo = f.titulo.value.trim();
    if (!titulo) return toast('Ponle un título al módulo', 'err');
    const temas = f.temas.value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const [nombre, url] = l.split('|').map((x) => x.trim());
      return { nombre: nombre || l, url: url || '' };
    });
    const data = { titulo, orden: +f.orden.value || 1, descripcion: f.descripcion.value.trim(), temas, liberado: f.liberado.checked };
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
    el('div', { class: 'row gap end full' }, [
      el('button', { class: 'btn ghost', onClick: closeModal }, 'Cancelar'),
      el('button', { class: 'btn gold', onClick: save }, edit ? 'Guardar' : 'Crear'),
    ]),
  ]);
  modal(edit ? 'Editar módulo' : 'Nuevo módulo / día', body, { wide: true });
}

// ----------------------------- Alta de aspirante ---------------------------
function openAspirante() {
  const f = {};
  f.nombre = el('input', { placeholder: 'Nombre y apellido del personaje' });
  f.discord = el('input', { placeholder: 'Usuario de Discord' });
  async function save() {
    if (f.nombre.value.trim().length < 3) return toast('Nombre completo', 'err');
    if (f.discord.value.trim().length < 2) return toast('Discord válido', 'err');
    try {
      await addAspirante({ nombre: f.nombre.value.trim(), discord: f.discord.value.trim() });
      toast('Aspirante agregado'); closeModal(); render();
    } catch (e) { toast(/duplicate|unique/i.test(e.message) ? 'Ese Discord ya está registrado.' : e.message, 'err'); }
  }
  const body = el('div', { class: 'form-grid' }, [
    el('label', { class: 'field full' }, [el('span', {}, 'Nombre'), f.nombre]),
    el('label', { class: 'field full' }, [el('span', {}, 'Discord'), f.discord]),
    el('div', { class: 'row gap end full' }, [
      el('button', { class: 'btn ghost', onClick: closeModal }, 'Cancelar'),
      el('button', { class: 'btn gold', onClick: save }, 'Agregar'),
    ]),
  ]);
  modal('Nuevo aspirante', body, { wide: true });
}

const kpi = (label, value, sub, cls, ic) => el('div', { class: `card kpi ${cls}` }, [
  el('span', { class: 'kpi-ico' }, [icon(ic, 26)]),
  el('div', { class: 'kpi-val' }, String(value)),
  el('div', { class: 'kpi-label' }, label),
  sub ? el('div', { class: 'kpi-sub' }, sub) : null,
]);
