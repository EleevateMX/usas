import { getState, esDirectiva, addPregunta, updatePregunta, removePregunta, removeIntento } from '../store.js';
import { el, field, modal, closeModal, confirmDialog, toast, badge, fmtDate } from '../ui.js';
import { icon } from '../icons.js';
import { render } from '../router.js';

const CATS = {
  intro: 'Introducción', normativa: 'Normativa', imagen: 'Código de Imagen',
  traslados: 'Traslados / VIP', corte: 'Corte', prision: 'Prisión Federal',
  generales: 'Proc. Generales', byc: 'Búsqueda y Captura', comunicaciones: 'Comunicaciones', unidades: 'Unidades / Armamento',
};
const DIFS = { facil: 'Fácil', media: 'Media', dificil: 'Difícil', muydificil: 'Muy difícil' };

function examenURL() {
  return location.origin + location.pathname.replace(/[^/]*$/, '') + 'examen.html';
}

export function viewTraining() {
  const s = getState();
  const intentos = s.examenIntentos;
  const aprobados = intentos.filter((i) => i.aprobado).length;
  const enviados = intentos.filter((i) => i.estado !== 'en_curso').length;
  const pct = enviados ? Math.round((aprobados / enviados) * 100) : 0;
  const dusmt = s.personal.filter((p) => (p.rango || '').toUpperCase() === 'DUSMT' || p.estado === 'Trainee');

  return el('div', { class: 'view' }, [
    el('div', { class: 'toolbar' }, [
      el('h2', {}, 'Training Division'),
      esDirectiva() ? el('button', { class: 'btn gold ic', onClick: () => openPregunta() }, [icon('plus', 15), 'Nueva pregunta']) : null,
    ]),

    // Link del examen
    el('div', { class: 'card info-strip' }, [
      el('span', { class: 'strip-ico' }, [icon('link', 22)]),
      el('div', { style: 'flex:1' }, [
        el('p', { class: 'muted small', style: 'margin:0 0 6px' }, 'Comparte este enlace con los aspirantes (DUSMT). Examen de 26 preguntas, 20 minutos, opción múltiple, corrección automática en el servidor.'),
        el('div', { class: 'row gap' }, [
          el('input', { class: 'search', style: 'width:100%;max-width:520px', value: examenURL(), readonly: '' }),
          el('button', { class: 'btn ghost small ic', onClick: copiarLink }, [icon('copy', 14), 'Copiar']),
          el('a', { class: 'btn navy small', href: examenURL(), target: '_blank' }, 'Abrir'),
        ]),
      ]),
    ]),

    el('div', { class: 'grid kpis' }, [
      kpi('Intentos', intentos.length, `${enviados} enviados`, 'gold', 'training'),
      kpi('Aprobados', aprobados, `${pct}% de aprobación`, 'green', 'award'),
      kpi('Aspirantes DUSMT', dusmt.length, 'en formación', '', 'personal'),
      kpi('Banco de preguntas', s.examenPreguntas.length, `${s.examenPreguntas.filter((q) => q.activa).length} activas`, '', 'normativa'),
    ]),

    el('div', { class: 'grid two' }, [
      // Resultados
      el('div', { class: 'card no-pad' }, [
        el('div', { class: 'card-head', style: 'padding:16px 18px 0' }, [el('h3', { class: 'h-ico' }, [icon('award', 16), 'Resultados de exámenes']), null]),
        intentos.length
          ? el('table', { class: 'tbl rows' }, [
              el('thead', {}, el('tr', {}, [el('th', {}, 'Aspirante'), el('th', {}, 'Fecha'),
                el('th', { class: 'right' }, 'Nota'), el('th', {}, 'Estado'), el('th', {}, '')])),
              el('tbody', {}, intentos.slice(0, 50).map((i) => el('tr', {}, [
                el('td', {}, [el('strong', {}, i.nombre), i.discord ? el('div', { class: 'muted small' }, i.discord) : null]),
                el('td', { class: 'muted small' }, fmtDate(i.fecha)),
                el('td', { class: 'right' }, i.estado === 'en_curso' ? '—' : `${pctNota(i)}%`),
                el('td', {}, estadoBadge(i)),
                el('td', { class: 'right' }, esDirectiva()
                  ? el('button', { class: 'icon-btn', title: 'Eliminar', onClick: () =>
                      confirmDialog(`¿Eliminar el intento de ${i.nombre}?`, async () => { try { await removeIntento(i.id); toast('Eliminado'); render(); } catch (e) { toast(e.message, 'err'); } }) }, [icon('trash', 15)])
                  : null),
              ]))),
            ])
          : el('div', { class: 'empty' }, 'Aún no hay exámenes presentados.'),
      ]),

      // Aspirantes DUSMT
      el('div', { class: 'card' }, [
        el('div', { class: 'card-head' }, [el('h3', { class: 'h-ico' }, [icon('personal', 16), 'Aspirantes (DUSMT)']), null]),
        dusmt.length
          ? el('div', { class: 'list' }, dusmt.map((p) => el('div', { class: 'list-item' }, [
              el('div', {}, [el('strong', {}, p.nombre), el('div', { class: 'muted small' }, `Placa ${p.placa ?? '—'}`)]),
              badge(p.estado, p.estado === 'Activo' ? 'ok' : 'warn'),
            ])))
          : el('p', { class: 'muted' }, 'Sin aspirantes DUSMT registrados. Crea un mariscal con rango “DUSMT” en Personal.'),
      ]),
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
          el('td', {}, q.enunciado.length > 80 ? q.enunciado.slice(0, 80) + '…' : q.enunciado),
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

function copiarLink() {
  navigator.clipboard.writeText(examenURL()).then(() => toast('Enlace copiado')).catch(() => toast('No se pudo copiar', 'err'));
}
