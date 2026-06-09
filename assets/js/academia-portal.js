// ===========================================================================
//  USMS Training Division — Portal/Aula de estudio para aspirantes (DUSMT)
//  Sin cuenta del panel. El aspirante se registra UNA vez (Nombre + #HASH# +
//  Discord) y luego ingresa con Nombre + #HASH#. Sesión temporal por token:
//  si la TD lo da de baja, pierde el acceso.
// ===========================================================================
import { supabase } from './supabase.js';
import { el, toast } from './ui.js';
import { sealImg, icon } from './icons.js';
import { abrirLectorManual } from './manual-reader.js';

const LS_KEY = 'usms_td_token';
const app = () => document.getElementById('academia-app');
function montar(node) { const a = app(); a.innerHTML = ''; a.append(node); }

let estado = { token: '', data: null };

async function api(accion, extra = {}) {
  const { data, error } = await supabase.functions.invoke('td-portal', { body: { accion, ...extra } });
  if (error) { let m = error.message; try { m = (await error.context.json()).error || m; } catch { /* noop */ } throw new Error(m); }
  if (data?.error) throw new Error(data.error);
  return data;
}

// ------------------------------- Acceso ------------------------------------
function vistaAcceso(modo = 'login') {
  const nombre = el('input', { type: 'text', placeholder: 'Nombre_Apellido' });
  const hash = el('input', { type: 'text', placeholder: '#HASH#' });
  const discord = el('input', { type: 'text', placeholder: 'Usuario de Discord' });
  const esReg = modo === 'registro';
  const btn = el('button', { class: 'btn gold full', onClick: enviar }, esReg ? 'Registrarme' : 'Ingresar');

  async function enviar() {
    if (nombre.value.trim().length < 3) return toast('Escribe tu Nombre_Apellido.', 'err');
    if (hash.value.trim().length < 2) return toast('Escribe tu #HASH#.', 'err');
    if (esReg && discord.value.trim().length < 2) return toast('Escribe tu Discord.', 'err');
    btn.disabled = true; btn.textContent = 'Procesando…';
    try {
      const r = esReg
        ? await api('registrar', { nombre: nombre.value.trim(), hash: hash.value.trim(), discord: discord.value.trim() })
        : await api('login', { nombre: nombre.value.trim(), hash: hash.value.trim() });
      estado.token = r.token;
      localStorage.setItem(LS_KEY, r.token);
      await cargar();
    } catch (e) { toast(e.message || 'No se pudo acceder.', 'err'); btn.disabled = false; btn.textContent = esReg ? 'Registrarme' : 'Ingresar'; }
  }
  [nombre, hash, discord].forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') enviar(); }));

  const tab = (lbl, m) => el('button', { class: 'aula-tab' + (m === modo ? ' on' : ''), onClick: () => vistaAcceso(m) }, lbl);

  montar(el('div', { class: 'ex-card' }, [
    el('div', { class: 'ex-brand' }, [sealImg(86),
      el('div', { class: 'brand-title xl' }, 'AULA DUSMT'),
      el('div', { class: 'brand-sub' }, 'Training Division · Portal de estudio')]),
    el('div', { class: 'aula-tabs' }, [tab('Ingresar', 'login'), tab('Registrarme', 'registro')]),
    el('p', { class: 'muted small center' }, esReg
      ? 'Regístrate una sola vez. Debes estar en la lista de aspirantes de la academia; tu #HASH# será tu llave de acceso, guárdalo.'
      : 'Ingresa con tu Nombre_Apellido y tu #HASH#. Tu Discord no se pide al ingresar, por seguridad.'),
    el('label', { class: 'auth-field' }, [el('span', { class: 'auth-lbl' }, 'Nombre y Apellido'),
      el('div', { class: 'auth-input' }, [icon('user', 16), nombre])]),
    el('label', { class: 'auth-field' }, [el('span', { class: 'auth-lbl' }, '#HASH#'),
      el('div', { class: 'auth-input' }, [icon('shield', 16), hash])]),
    esReg ? el('label', { class: 'auth-field' }, [el('span', { class: 'auth-lbl' }, 'Discord'),
      el('div', { class: 'auth-input' }, [icon('miembros', 16), discord])]) : null,
    btn,
    el('div', { class: 'auth-foot' }, 'U.S. Marshals Service · GTAHUB Roleplay'),
  ]));
}

// ------------------------------- Cargar ------------------------------------
async function cargar() {
  montar(el('div', { class: 'ex-card' }, [el('div', { class: 'ex-load' }, [sealImg(64), el('p', {}, 'Cargando aula…')])]));
  try { estado.data = await api('cargar', { token: estado.token }); vistaPortal(); }
  catch (e) {
    toast(e.message || 'Sesión no válida.', 'err');
    localStorage.removeItem(LS_KEY); estado = { token: '', data: null };
    vistaAcceso('login');
  }
}

// ------------------------------- Aula --------------------------------------
function vistaPortal() {
  const d = estado.data;
  const completados = new Set(d.completados || []);
  const modulos = d.modulos || [];
  const liberados = modulos.filter((m) => m.liberado);
  const total = modulos.length;
  const bloqueados = total - liberados.length;
  const hechos = liberados.filter((m) => completados.has(m.id)).length;
  const pct = liberados.length ? Math.round((hechos / liberados.length) * 100) : 0;
  const conGuia = liberados.filter((m) => (m.guia || '').trim());

  montar(el('div', { class: 'ex-card wide portal' }, [
    el('div', { class: 'portal-top' }, [
      el('div', { class: 'ex-brand mini' }, [sealImg(54),
        el('div', {}, [el('div', { class: 'brand-title' }, 'AULA DUSMT'),
          el('div', { class: 'brand-sub' }, `${d.aspirante?.nombre || ''} · ${estadoTxt(d.aspirante?.estado)}`)])]),
      el('button', { class: 'btn ghost small', onClick: salir }, 'Salir'),
    ]),

    heroBienvenida(d.aspirante?.nombre || 'Aspirante'),
    misionVision(),

    el('div', { class: 'portal-prog' }, [
      el('div', { class: 'row between' }, [el('strong', {}, 'Tu progreso de estudio'), el('span', { class: 'muted small' }, `${hechos}/${liberados.length} temas · ${pct}%`)]),
      el('div', { class: 'prog-bar lg' }, [el('div', { class: 'prog-fill', style: `width:${pct}%` })]),
    ]),

    // Línea de tiempo de la academia (los 5 días)
    modulos.length ? el('div', {}, [
      el('h3', { class: 'portal-h' }, [icon('layers', 16), 'Ruta de la academia']),
      lineaTiempo(modulos, completados),
    ]) : null,

    examenCard(d.examen, d.aspirante),
    (d.anuncios || []).length ? anunciosBloque(d.anuncios) : null,
    (d.notas || []).length ? notasBloque(d.notas) : null,

    // Repaso general antes del examen
    conGuia.length ? repasoGeneral(conGuia) : null,

    el('h3', { class: 'portal-h' }, [icon('training', 16), 'Programa · temas liberados']),
    liberados.length ? el('div', { class: 'portal-mods' }, liberados.map((m) => moduloCard(m, completados.has(m.id))))
      : el('p', { class: 'muted center' }, 'Aún no se ha liberado ningún tema. Vuelve cuando la TD publique el primer día.'),

    el('div', { class: 'auth-foot' }, 'U.S. Marshals Service · Training Division'),
  ]));
}

function lineaTiempo(modulos, completados) {
  return el('div', { class: 'aula-timeline' }, modulos.map((m) => {
    const hecho = m.liberado && completados.has(m.id);
    const estado = !m.liberado ? 'lock' : hecho ? 'done' : 'open';
    const etiqueta = estado === 'lock' ? 'Próximamente' : estado === 'done' ? 'Estudiado' : 'Disponible';
    return el('div', { class: 'tl-step ' + estado }, [
      el('div', { class: 'tl-dot' }, [icon(estado === 'done' ? 'check' : estado === 'lock' ? 'clock' : 'star', 12)]),
      el('div', { class: 'tl-body' }, [
        el('div', { class: 'tl-day' }, `Día ${m.orden}`),
        el('div', { class: 'tl-title' }, m.titulo),
        el('div', { class: 'tl-state' }, etiqueta),
      ]),
    ]);
  }));
}

function estadoTxt(e) { return e === 'Aprobado' ? 'Aprobado' : e === 'Baja' ? 'Baja' : 'En curso'; }

function heroBienvenida(nombre) {
  return el('div', { class: 'aula-hero' }, [
    el('div', { class: 'aula-kicker' }, 'U.S. Marshals National Training Academy'),
    el('h2', { class: 'aula-welcome' }, `Bienvenido/a, ${nombre}`),
    el('p', { class: 'aula-sub' }, 'Tu formación como Deputy U.S. Marshal empieza aquí. Avanza día a día, estudia los manuales y prepárate para el examen.'),
    el('div', { class: 'aula-lema' }, [
      el('span', { class: 'lema-chip' }, 'Justicia'),
      el('span', { class: 'lema-chip' }, 'Integridad'),
      el('span', { class: 'lema-chip' }, 'Servicio'),
    ]),
  ]);
}

const FUNCIONES = ['Captura de fugitivos', 'Traslado de prisioneros', 'Protección judicial', 'Protección de testigos', 'Órdenes judiciales', 'Bienes incautados'];
function misionVision() {
  return el('div', { class: 'aula-mv' }, [
    el('div', { class: 'mv-col' }, [
      el('div', { class: 'mv-head' }, [icon('shield', 16), el('strong', {}, 'Misión')]),
      el('p', {}, 'Proteger el sistema de justicia federal de San Andreas: ejecutar órdenes judiciales, custodiar y trasladar prisioneros, resguardar tribunales, jueces y testigos, y capturar fugitivos — siempre con Justicia, Integridad y Servicio.'),
    ]),
    el('div', { class: 'mv-col' }, [
      el('div', { class: 'mv-head' }, [icon('star', 16), el('strong', {}, 'Visión')]),
      el('p', {}, 'Formar Deputies disciplinados y profesionales, referentes de la ley por su integridad, criterio y compromiso con la comunidad.'),
    ]),
    el('div', { class: 'mv-funcs' }, FUNCIONES.map((f) => el('span', { class: 'func-chip' }, [icon('check', 12), f]))),
  ]);
}

function mensajeExamen(tipo, aprobado) {
  if (aprobado) return '¡Felicidades! Aprobaste la evaluación teórica. Excelente base para lo aplicado.';
  if (tipo === 'rapida') return 'Repasa en la retroalimentación del examen los puntos que fallaste antes de la parte aplicada.';
  if (tipo === 'reingreso') return 'Revisa los temas marcados como “a reforzar” y consúltalo con tu instructor para mejorar.';
  return 'No te sientas mal: la práctica hace al maestro. Esto es solo la introducción a lo aplicado.';
}

function examenCard(ex, asp) {
  if (!ex || !ex.habilitado) return null;
  if (ex.presentado) {
    return el('div', { class: 'portal-examen ' + (ex.aprobado ? 'ok' : 'no') }, [
      el('div', { class: 'pe-head' }, [icon(ex.aprobado ? 'check' : 'close', 18),
        el('strong', {}, ex.aprobado ? 'Examen aprobado' : 'No aprobado')]),
      el('div', { class: 'pe-score' }, [
        ex.porcentaje != null ? el('span', { class: 'pe-pct' }, `${ex.porcentaje}%`) : null,
        el('span', { class: 'muted small' }, `${ex.nombre}${ex.puntaje != null ? ` · ${ex.puntaje}/${ex.totalPreg} correctas` : ''}`),
      ]),
      el('p', { class: 'pe-msg' }, mensajeExamen(ex.tipo, ex.aprobado)),
    ]);
  }
  const params = new URLSearchParams({ s: ex.slug, n: asp?.nombre || '', d: asp?.discord || '' });
  const href = 'examen.html?' + params.toString();
  return el('div', { class: 'portal-examen disp' }, [
    el('div', { class: 'pe-head' }, [icon('award', 18), el('strong', {}, 'Examen disponible')]),
    el('p', { class: 'muted small' }, `La Training Division habilitó tu examen: ${ex.nombre}. Tienes un único intento.`),
    el('a', { class: 'btn gold', href, target: '_blank' }, 'Presentar examen →'),
  ]);
}

function anunciosBloque(anuncios) {
  return el('div', { class: 'portal-notas' }, [
    el('div', { class: 'fb-head' }, [icon('alert', 16), el('strong', {}, 'Anuncios de la academia')]),
    el('div', { class: 'seg-list' }, anuncios.slice(0, 12).map((an) => el('div', { class: 'seg-item' + (an.fijado ? ' fijado' : '') }, [
      el('div', { class: 'row between' }, [el('strong', {}, an.titulo), an.fijado ? el('span', { class: 'muted xsmall' }, '📌') : null]),
      an.contenido ? el('p', { class: 'seg-txt' }, an.contenido) : null,
      el('div', { class: 'muted xsmall' }, an.autor || 'Training Division'),
    ]))),
  ]);
}

function notasBloque(notas) {
  return el('div', { class: 'portal-notas' }, [
    el('div', { class: 'fb-head' }, [icon('file', 16), el('strong', {}, 'Notas de tus instructores')]),
    el('div', { class: 'seg-list' }, notas.slice(0, 8).map((n) => el('div', { class: 'seg-item' }, [
      el('p', { class: 'seg-txt' }, n.contenido),
      el('div', { class: 'muted xsmall' }, `${n.autor || 'Instructor'}${n.modulo_orden ? ' · Día ' + n.modulo_orden : ''}`),
    ]))),
  ]);
}

function repasoGeneral(conGuia) {
  const cont = el('div', { class: 'repaso-body', style: 'display:none' }, conGuia.map((m) => el('div', { class: 'repaso-item' }, [
    el('strong', {}, m.titulo), el('p', { class: 'muted small' }, m.guia),
  ])));
  const btn = el('button', { class: 'btn navy small ic', onClick: () => { const o = cont.style.display === 'none'; cont.style.display = o ? 'block' : 'none'; btn.lastChild.textContent = o ? 'Ocultar repaso general' : 'Ver repaso general'; } },
    [icon('normativa', 15), el('span', {}, 'Ver repaso general')]);
  return el('div', { class: 'portal-repaso' }, [
    el('div', { class: 'row between' }, [el('div', { class: 'fb-head', style: 'margin:0' }, [icon('award', 16), el('strong', {}, 'Repaso general (antes del examen)')]), btn]),
    cont,
  ]);
}

function moduloCard(m, hecho) {
  const check = el('button', { class: 'portal-check' + (hecho ? ' on' : ''), title: hecho ? 'Marcar como pendiente' : 'Marcar como estudiado' },
    [icon(hecho ? 'check' : 'undo', 16), el('span', {}, hecho ? 'Estudiado' : 'Marcar estudiado')]);
  check.addEventListener('click', () => toggle(m.id, !hecho, check));

  return el('div', { class: 'portal-mod' + (hecho ? ' done' : '') }, [
    el('div', { class: 'portal-mod-head' }, [
      el('span', { class: 'prog-num' }, String(m.orden)),
      el('div', { class: 'portal-mod-main' }, [el('strong', {}, m.titulo), m.descripcion ? el('p', { class: 'muted small' }, m.descripcion) : null]),
    ]),
    (m.temas || []).length ? el('div', { class: 'portal-temas' }, m.temas.map((t) => {
      if (t.manual) {
        const b = el('button', { class: 'portal-tema lectura', onClick: () => abrirLectorManual(t.manual) }, [icon('file', 15), el('span', {}, t.nombre), el('span', { class: 'tema-pill' }, 'Leer aquí')]);
        return b;
      }
      if (t.url) return el('a', { class: 'portal-tema', href: t.url, target: '_blank' }, [icon('file', 15), el('span', {}, t.nombre), icon('link', 13)]);
      return el('span', { class: 'portal-tema nolink' }, [icon('file', 15), el('span', {}, t.nombre)]);
    })) : null,
    (m.guia || '').trim() ? el('div', { class: 'portal-guia' }, [el('span', { class: 'guia-lbl' }, 'Guía de estudio'), el('p', {}, m.guia)]) : null,
    el('div', { class: 'row gap end' }, [check]),
  ]);
}

async function toggle(moduloId, completado, btn) {
  btn.disabled = true;
  try {
    await api('completar', { token: estado.token, moduloId, completado });
    estado.data = await api('cargar', { token: estado.token });
    vistaPortal();
  } catch (e) { toast(e.message || 'No se pudo guardar.', 'err'); btn.disabled = false; }
}

function salir() {
  localStorage.removeItem(LS_KEY);
  estado = { token: '', data: null };
  vistaAcceso('login');
}

document.addEventListener('DOMContentLoaded', () => {
  const t = localStorage.getItem(LS_KEY);
  if (t) { estado.token = t; cargar(); } else { vistaAcceso('login'); }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
