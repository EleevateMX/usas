import { getState, esDirectiva, addPregunta, updatePregunta, removePregunta, removeIntento,
  addSesion, updateSesion, removeSesion } from '../store.js';
import { el, field, modal, closeModal, confirmDialog, toast, badge, fmtDate } from '../ui.js';
import { icon } from '../icons.js';
import { render } from '../router.js';

const CATS = {
  intro: 'Introducción', normativa: 'Normativa', imagen: 'Código de Imagen',
  traslados: 'Traslados / VIP', corte: 'Corte', prision: 'Prisión Federal',
  generales: 'Proc. Generales', byc: 'Búsqueda y Captura', comunicaciones: 'Comunicaciones', unidades: 'Unidades / Armamento',
};
const DIFS = { facil: 'Fácil', media: 'Media', dificil: 'Difícil', muydificil: 'Muy difícil' };
const TIPOS = { rapida: 'Academia Rápida (AMTP)', convencional: 'Academia Convencional', reingreso: 'Reingreso', custom: 'Personalizado' };
const PRESETS = {
  rapida: { faciles: 10, medias: 10, dificiles: 6, duracionMin: 20 },
  convencional: { faciles: 8, medias: 10, dificiles: 8, duracionMin: 25 },
  reingreso: { faciles: 14, medias: 5, dificiles: 2, duracionMin: 15 },
  custom: { faciles: 10, medias: 8, dificiles: 6, duracionMin: 20 },
};

const examenURL = (slug) => location.origin + location.pathname.replace(/[^/]*$/, '') + 'examen.html?s=' + slug;
const expandidas = new Set();

export function viewTraining() {
  const s = getState();
  const intentos = s.examenIntentos;
  const aprobados = intentos.filter((i) => i.aprobado).length;
  const enviados = intentos.filter((i) => i.estado !== 'en_curso').length;
  const pct = enviados ? Math.round((aprobados / enviados) * 100) : 0;
  const dusmt = s.personal.filter((p) => (p.rango || '').toUpperCase() === 'DUSMT' || p.estado === 'Trainee');
  const act = s.examenPreguntas.filter((q) => q.activa);
  const disp = {
    facil: act.filter((q) => q.dificultad === 'facil').length,
    media: act.filter((q) => q.dificultad === 'media').length,
    dificil: act.filter((q) => q.dificultad === 'dificil' || q.dificultad === 'muydificil').length,
  };
  const idsSes = new Set(s.examenSesiones.map((x) => x.id));
  const huerfanos = intentos.filter((i) => !i.sesionId || !idsSes.has(i.sesionId));

  return el('div', { class: 'view' }, [
    el('div', { class: 'toolbar' }, [
      el('h2', {}, 'Training Division'),
      el('div', { class: 'row gap' }, esDirectiva() ? [
        el('button', { class: 'btn navy ic', onClick: () => openPregunta() }, [icon('plus', 15), 'Pregunta']),
        el('button', { class: 'btn gold ic', onClick: () => openSesion(disp) }, [icon('plus', 15), 'Crear academia']),
      ] : [el('span', { class: 'muted small' }, 'Vista de solo lectura')]),
    ]),

    el('div', { class: 'grid kpis' }, [
      kpi('Academias', s.examenSesiones.length, `${s.examenSesiones.filter((x) => x.activa).length} activas`, 'gold', 'training'),
      kpi('Intentos', intentos.length, `${enviados} enviados`, '', 'scan'),
      kpi('Aprobados', aprobados, `${pct}% de aprobación`, 'green', 'award'),
      kpi('Banco de preguntas', s.examenPreguntas.length, `F:${disp.facil} · M:${disp.media} · D:${disp.dificil}`, '', 'normativa'),
    ]),

    // Academias — cada una es una sección con sus respuestas
    el('div', { class: 'card' }, [
      el('div', { class: 'card-head' }, [el('h3', { class: 'h-ico' }, [icon('training', 16), 'Academias / exámenes']),
        el('span', { class: 'muted small' }, 'Cada academia tiene su enlace y su sección de respuestas')]),
      s.examenSesiones.length
        ? el('div', { class: 'list' }, s.examenSesiones.map((ses) => academiaRow(ses, intentos)))
        : el('p', { class: 'muted' }, esDirectiva() ? 'Crea una academia para generar el enlace del examen.' : 'No hay academias creadas.'),
    ]),

    el('div', { class: 'grid two' }, [
      // Aspirantes DUSMT
      el('div', { class: 'card' }, [
        el('div', { class: 'card-head' }, [el('h3', { class: 'h-ico' }, [icon('personal', 16), 'Aspirantes (DUSMT)']), null]),
        dusmt.length
          ? el('div', { class: 'list' }, dusmt.map((p) => el('div', { class: 'list-item' }, [
              el('div', {}, [el('strong', {}, p.nombre), el('div', { class: 'muted small' }, `Placa ${p.placa ?? '—'}`)]),
              badge(p.estado, p.estado === 'Activo' ? 'ok' : 'warn'),
            ])))
          : el('p', { class: 'muted' }, 'Sin aspirantes DUSMT. Crea un mariscal con rango “DUSMT” en Personal.'),
      ]),
      // Resultados sin academia (huérfanos)
      huerfanos.length
        ? el('div', { class: 'card no-pad' }, [
            el('div', { class: 'card-head', style: 'padding:16px 18px 0' }, [el('h3', { class: 'h-ico' }, [icon('award', 16), 'Otros resultados']),
              el('span', { class: 'muted small' }, 'sin academia asociada')]),
            tablaIntentos(huerfanos),
          ])
        : el('div', { class: 'card' }, [el('p', { class: 'muted', style: 'margin:0' }, 'Los resultados aparecen dentro de cada academia.')]),
    ]),

    // Banco de preguntas
    el('div', { class: 'card no-pad' }, [
      el('div', { class: 'card-head', style: 'padding:16px 18px 0' }, [
        el('h3', { class: 'h-ico' }, [icon('normativa', 16), 'Banco de preguntas']),
        el('span', { class: 'muted small' }, esDirectiva() ? 'Editable (Directive+)' : 'Solo lectura'),
      ]),
      el('table', { class: 'tbl rows' }, [
        el('thead', {}, el('tr', {}, [el('th', {}, 'Bloque'), el('th', {}, 'Dif.'), el('th', {}, 'Pregunta'), el('th', {}, 'Estado'), el('th', {}, '')])),
        el('tbody', {}, s.examenPreguntas.map((q) => el('tr', { class: q.activa ? '' : 'muted' }, [
          el('td', {}, badge(CATS[q.categoria] || q.categoria, 'rango')),
          el('td', {}, DIFS[q.dificultad] || q.dificultad),
          el('td', {}, q.enunciado.length > 76 ? q.enunciado.slice(0, 76) + '…' : q.enunciado),
          el('td', {}, q.activa ? badge('activa', 'ok') : badge('inactiva', '')),
          el('td', { class: 'right nowrap' }, esDirectiva() ? [
            el('button', { class: 'icon-btn', title: 'Editar', onClick: () => openPregunta(q) }, [icon('edit', 15)]),
            el('button', { class: 'icon-btn', title: 'Eliminar', onClick: () =>
              confirmDialog('¿Eliminar esta pregunta del banco?', async () => { try { await removePregunta(q.id); toast('Eliminada'); render(); } catch (e) { toast(e.message, 'err'); } }) }, [icon('trash', 15)]),
          ] : null),
        ]))),
      ]),
    ]),
  ]);
}

function academiaRow(ses, intentos) {
  const propios = intentos.filter((i) => i.sesionId === ses.id);
  const aprob = propios.filter((i) => i.aprobado).length;
  const url = examenURL(ses.slug);
  const abierto = expandidas.has(ses.id);

  return el('div', { class: 'academia' + (ses.activa ? '' : ' cerrada') }, [
    el('div', { class: 'aca-top' }, [
      el('div', {}, [el('strong', {}, ses.nombre),
        el('span', { class: 'badge rango' }, TIPOS[ses.tipo] || ses.tipo),
        ses.activa ? badge('activa', 'ok') : badge('cerrada', '')]),
      el('span', { class: 'muted small' }, `${ses.faciles}F · ${ses.medias}M · ${ses.dificiles}D · ${ses.duracionMin} min`),
    ]),
    el('div', { class: 'row gap aca-link' }, [
      el('input', { class: 'search', style: 'flex:1;min-width:0', value: url, readonly: '' }),
      el('button', { class: 'btn ghost small ic', onClick: () => { navigator.clipboard.writeText(url).then(() => toast('Enlace copiado')).catch(() => toast('No se pudo copiar', 'err')); } }, [icon('copy', 14), 'Copiar']),
      el('a', { class: 'btn navy small', href: url, target: '_blank' }, 'Abrir'),
    ]),
    el('div', { class: 'row between aca-foot' }, [
      el('button', { class: 'btn ghost small ic', onClick: () => { abierto ? expandidas.delete(ses.id) : expandidas.add(ses.id); render(); } },
        [icon(abierto ? 'undo' : 'award', 14), `${abierto ? 'Ocultar' : 'Ver'} respuestas (${propios.length})`]),
      el('span', { class: 'muted small' }, `${aprob} aprobados · creada ${fmtDate(ses.fecha)}`),
      esDirectiva() ? el('div', { class: 'nowrap' }, [
        el('button', { class: 'btn ghost small', onClick: async () => { try { await updateSesion(ses.id, { activa: !ses.activa }); toast(ses.activa ? 'Academia cerrada' : 'Academia reabierta'); render(); } catch (e) { toast(e.message, 'err'); } } }, ses.activa ? 'Cerrar' : 'Reabrir'),
        el('button', { class: 'icon-btn', title: 'Eliminar', onClick: () =>
          confirmDialog(`¿Eliminar la academia "${ses.nombre}"? Sus resultados quedarán como "Otros resultados".`, async () => { try { await removeSesion(ses.id); expandidas.delete(ses.id); toast('Academia eliminada'); render(); } catch (e) { toast(e.message, 'err'); } }) }, [icon('trash', 15)]),
      ]) : null,
    ]),
    abierto ? el('div', { class: 'aca-resp' }, propios.length ? [tablaIntentos(propios)]
      : [el('p', { class: 'muted small', style: 'padding:10px 4px' }, 'Aún nadie ha presentado esta academia.')]) : null,
  ]);
}

function tablaIntentos(lista) {
  return el('table', { class: 'tbl rows' }, [
    el('thead', {}, el('tr', {}, [el('th', {}, 'Aspirante'), el('th', {}, 'Discord'), el('th', {}, 'Fecha'),
      el('th', { class: 'right' }, 'Nota'), el('th', {}, 'Estado'), el('th', {}, '')])),
    el('tbody', {}, lista.slice(0, 100).map((i) => el('tr', {}, [
      el('td', {}, [el('strong', {}, i.nombre), i.alertas > 0
        ? el('span', { class: 'alert-flag', title: alertaResumen(i) }, [icon('alert', 13), `${i.alertas}`]) : null]),
      el('td', { class: 'muted small' }, i.discord || '—'),
      el('td', { class: 'muted small' }, fmtDate(i.fecha)),
      el('td', { class: 'right' }, i.estado === 'en_curso' ? '—' : `${pctNota(i)}%`),
      el('td', {}, estadoBadge(i)),
      el('td', { class: 'right nowrap' }, [
        i.estado !== 'en_curso'
          ? el('button', { class: 'icon-btn', title: 'Ver preguntas', onClick: () => openRevision(i) }, [icon('file', 15)]) : null,
        esDirectiva()
          ? el('button', { class: 'icon-btn', title: 'Eliminar', onClick: () =>
              confirmDialog(`¿Eliminar el intento de ${i.nombre}?`, async () => { try { await removeIntento(i.id); toast('Eliminado'); render(); } catch (e) { toast(e.message, 'err'); } }) }, [icon('trash', 15)]) : null,
      ]),
    ]))),
  ]);
}

// Revisión de un examen: cada pregunta con la respuesta del aspirante vs la correcta.
function openRevision(i) {
  const s = getState();
  const byId = new Map(s.examenPreguntas.map((q) => [q.id, q]));
  const orden = [...(i.preguntas || [])].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  const items = orden.map((pm) => byId.get(pm.id)).filter(Boolean);
  const aciertos = items.filter((q) => Number(i.respuestas?.[q.id]) === q.correcta).length;

  const body = el('div', { class: 'revision' }, [
    el('div', { class: 'rev-head' }, [
      el('div', {}, [el('strong', {}, i.nombre), i.discord ? el('span', { class: 'muted small' }, ` · ${i.discord}`) : null]),
      el('span', { class: `badge ${i.aprobado ? 'ok' : 'red'}` }, `${pctNota(i)}% · ${i.puntaje}/${i.total}`),
    ]),
    items.length
      ? el('div', { class: 'rev-list' }, items.map((q, idx) => revisionCard(q, i.respuestas?.[q.id], idx)))
      : el('p', { class: 'muted' }, 'Este intento no guardó el detalle de preguntas (resultado de demostración).'),
    el('div', { class: 'row gap end' }, [el('button', { class: 'btn ghost', onClick: closeModal }, 'Cerrar')]),
  ]);
  modal(`Revisión — ${i.nombre} (${aciertos}/${items.length || i.total})`, body, { wide: true });
}

function revisionCard(q, elegida, num) {
  const tieneResp = elegida !== undefined && elegida !== null;
  const acierto = tieneResp && Number(elegida) === q.correcta;
  return el('div', { class: 'rev-q' + (acierto ? ' ok' : ' no') }, [
    el('div', { class: 'rev-q-head' }, [
      el('span', { class: 'ex-num' }, String(num + 1)),
      el('span', { class: 'rev-enun' }, q.enunciado),
      el('span', { class: `badge ${acierto ? 'ok' : 'red'}` }, acierto ? 'Correcta' : (tieneResp ? 'Incorrecta' : 'Sin responder')),
    ]),
    el('div', { class: 'rev-opts' }, q.opciones.map((texto, idx) => {
      const esCorrecta = idx === q.correcta;
      const esElegida = tieneResp && Number(elegida) === idx;
      const cls = esCorrecta ? 'correcta' : (esElegida ? 'elegida-mal' : '');
      return el('div', { class: 'rev-opt ' + cls }, [
        el('span', { class: 'ex-key' }, String.fromCharCode(65 + idx)),
        el('span', {}, texto),
        esCorrecta ? el('span', { class: 'rev-tag' }, [icon('check', 13), 'Correcta']) : null,
        (esElegida && !esCorrecta) ? el('span', { class: 'rev-tag mal' }, [icon('close', 13), 'Su respuesta']) : null,
      ]);
    })),
  ]);
}

const EVENTO_LBL = {
  cambio_pestana: 'cambió de pestaña', salir_pantalla: 'salió de la ventana',
  copiar: 'copió', pegar: 'pegó', menu_contextual: 'menú contextual',
  atajo: 'atajo de teclado', reintento_bloqueado: 'intentó repetir el examen', fuera_de_tiempo: 'envío fuera de tiempo',
};
function alertaResumen(i) {
  const c = {};
  (i.eventos || []).forEach((e) => { c[e.tipo] = (c[e.tipo] || 0) + 1; });
  const partes = Object.entries(c).map(([t, n]) => `${n}× ${EVENTO_LBL[t] || t}`);
  return `Posible manipulación (Internal Affairs): ${partes.join(', ') || i.alertas + ' alertas'}`;
}
const pctNota = (i) => (i.total ? Math.round((i.puntaje / i.total) * 100) : 0);
function estadoBadge(i) {
  if (i.estado === 'en_curso') return badge('en curso', 'warn');
  if (i.estado === 'expirado') return badge('expirado', '');
  return i.aprobado ? badge('aprobado', 'ok') : badge('no aprobado', 'red');
}
const kpi = (label, value, sub, cls, ic) => el('div', { class: `card kpi ${cls}` }, [
  el('span', { class: 'kpi-ico' }, [icon(ic, 26)]),
  el('div', { class: 'kpi-val' }, String(value)),
  el('div', { class: 'kpi-label' }, label),
  sub ? el('div', { class: 'kpi-sub' }, sub) : null,
]);

// ------------------------- Crear / editar academia -------------------------
function openSesion(disp) {
  const f = {};
  const num = (k, v) => (f[k] = el('input', { type: 'number', min: '0', value: String(v) }));
  const tipoSel = el('select', {}, Object.entries(TIPOS).map(([v, l]) => el('option', { value: v }, l)));
  f.tipo = tipoSel;
  const aplicar = (t) => { const p = PRESETS[t] || PRESETS.custom; f.faciles.value = p.faciles; f.medias.value = p.medias; f.dificiles.value = p.dificiles; f.duracion.value = p.duracionMin; };
  tipoSel.addEventListener('change', () => aplicar(tipoSel.value));

  const p0 = PRESETS.rapida;
  const body = el('div', { class: 'form-grid' }, [
    el('label', { class: 'field full' }, [el('span', {}, 'Nombre de la academia'), (f.nombre = el('input', { placeholder: 'Ej.: Academia Convencional — Junio 2026' }))]),
    field('Tipo de examen', tipoSel),
    field('Duración (min)', (f.duracion = el('input', { type: 'number', min: '1', value: String(p0.duracionMin) }))),
    field(`Fáciles (disp. ${disp.facil})`, num('faciles', p0.faciles)),
    field(`Medias (disp. ${disp.media})`, num('medias', p0.medias)),
    field(`Difíciles (disp. ${disp.dificil})`, num('dificiles', p0.dificiles)),
    el('p', { class: 'muted small full' }, 'El tipo prerrellena la dificultad; puedes ajustarla. Reingreso = mayoría de preguntas fáciles. Al crear se genera el enlace único.'),
    el('div', { class: 'row gap end full' }, [
      el('button', { class: 'btn ghost', onClick: closeModal }, 'Cancelar'),
      el('button', { class: 'btn gold', onClick: save }, 'Crear academia'),
    ]),
  ]);

  async function save() {
    const data = {
      nombre: f.nombre.value.trim(), tipo: f.tipo.value,
      faciles: Math.min(+f.faciles.value || 0, disp.facil),
      medias: Math.min(+f.medias.value || 0, disp.media),
      dificiles: Math.min(+f.dificiles.value || 0, disp.dificil),
      duracionMin: Math.max(1, +f.duracion.value || 20),
    };
    if (!data.nombre) return toast('Ponle un nombre a la academia', 'err');
    if (data.faciles + data.medias + data.dificiles === 0) return toast('Configura al menos una pregunta', 'err');
    try { await addSesion(data); toast('Academia creada'); closeModal(); render(); }
    catch (e) { toast(e.message, 'err'); }
  }

  modal('Crear academia', body, { wide: true });
}

// --------------------------- Alta / edición de pregunta --------------------
function openPregunta(q = null) {
  const edit = !!q; const d = q || {}; const f = {};
  const opciones = [...(d.opciones || ['', '', '', ''])];
  while (opciones.length < 4) opciones.push('');

  const sel = (k, v, obj) => (f[k] = el('select', {}, Object.entries(obj).map(([val, lab]) =>
    el('option', { value: val, ...(val === v ? { selected: '' } : {}) }, lab))));

  const optInputs = opciones.slice(0, 4).map((o, i) => el('label', { class: 'field full' }, [
    el('span', {}, `Opción ${String.fromCharCode(65 + i)}`),
    (f['op' + i] = el('input', { value: o })),
  ]));

  const correcta = el('select', {}, [0, 1, 2, 3].map((i) =>
    el('option', { value: i, ...(i === (d.correcta ?? 0) ? { selected: '' } : {}) }, `Opción ${String.fromCharCode(65 + i)}`)));
  f.correcta = correcta;

  const body = el('div', { class: 'form-grid' }, [
    field('Bloque', sel('categoria', d.categoria || 'intro', CATS)),
    field('Dificultad', sel('dificultad', d.dificultad || 'facil', DIFS)),
    el('label', { class: 'field full' }, [el('span', {}, 'Enunciado'), (f.enunciado = el('textarea', { rows: '2' }, d.enunciado || ''))]),
    ...optInputs,
    field('Respuesta correcta', correcta),
    el('label', { class: 'field row gap full', style: 'align-items:center' }, [
      (f.activa = el('input', { type: 'checkbox', ...(d.activa !== false ? { checked: '' } : {}) })),
      el('span', {}, 'Pregunta activa (entra en el examen)'),
    ]),
    el('div', { class: 'row gap end full' }, [
      el('button', { class: 'btn ghost', onClick: closeModal }, 'Cancelar'),
      el('button', { class: 'btn gold', onClick: save }, edit ? 'Guardar' : 'Crear'),
    ]),
  ]);

  async function save() {
    const opts = [f.op0.value.trim(), f.op1.value.trim(), f.op2.value.trim(), f.op3.value.trim()];
    const data = {
      categoria: f.categoria.value, dificultad: f.dificultad.value,
      enunciado: f.enunciado.value.trim(), opciones: opts,
      correcta: +f.correcta.value, activa: f.activa.checked,
    };
    if (!data.enunciado || opts.some((o) => !o)) return toast('Completa el enunciado y las 4 opciones.', 'err');
    try {
      if (edit) { await updatePregunta(q.id, data); toast('Pregunta actualizada'); }
      else { await addPregunta(data); toast('Pregunta creada'); }
      closeModal(); render();
    } catch (e) { toast(e.message, 'err'); }
  }

  modal(edit ? 'Editar pregunta' : 'Nueva pregunta', body, { wide: true });
}
