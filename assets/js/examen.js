// ===========================================================================
//  USMS Training Division — Examen teórico AMTP (página pública)
//  Sin login. Las preguntas llegan sin la respuesta correcta; la corrección
//  ocurre en el servidor (Edge Functions). 20 minutos, respuestas bloqueadas.
// ===========================================================================
import { supabase } from './supabase.js';
import { el, toast } from './ui.js';
import { marshalBadge, icon } from './icons.js';

const SLUG = new URLSearchParams(location.search).get('s') || '';

const app = () => document.getElementById('examen-app');

let estado = {
  intentoId: null, token: null, preguntas: [], respuestas: {},
  duracionSeg: 1200, restante: 1200, timer: null, enviando: false,
};

function montar(node) { const a = app(); a.innerHTML = ''; a.append(node); }

// ------------------------------- Registro ----------------------------------
function vistaRegistro() {
  const nombre = el('input', { type: 'text', placeholder: 'Nombre y apellido del personaje' });
  const discord = el('input', { type: 'text', placeholder: 'Usuario de Discord' });
  const btn = el('button', { class: 'btn gold full', onClick: iniciar }, 'Comenzar examen');

  async function iniciar() {
    if (nombre.value.trim().length < 3) return toast('Escribe tu nombre completo.', 'err');
    btn.disabled = true; btn.textContent = 'Preparando…';
    try {
      const { data, error } = await supabase.functions.invoke('examen-iniciar', {
        body: { nombre: nombre.value.trim(), discord: discord.value.trim(), slug: SLUG },
      });
      if (error) throw new Error((await error.context?.json?.())?.error || error.message);
      if (data?.error) throw new Error(data.error);
      estado.intentoId = data.intentoId; estado.token = data.token;
      estado.preguntas = data.preguntas; estado.respuestas = {};
      estado.duracionSeg = data.duracionSeg; estado.restante = data.duracionSeg;
      vistaExamen();
    } catch (e) { toast(e.message || 'No se pudo iniciar.', 'err'); btn.disabled = false; btn.textContent = 'Comenzar examen'; }
  }
  [nombre, discord].forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') iniciar(); }));

  montar(el('div', { class: 'ex-card' }, [
    el('div', { class: 'ex-brand' }, [marshalBadge(74),
      el('div', { class: 'brand-title xl' }, 'TRAINING DIVISION'),
      el('div', { class: 'brand-sub' }, 'Examen teórico · AMTP / Academia')]),
    el('div', { class: 'auth-divider' }, [el('span', {}, 'REGISTRO DE ASPIRANTE')]),
    el('ul', { class: 'ex-rules' }, [
      el('li', {}, '26 preguntas de opción múltiple.'),
      el('li', {}, 'Tiempo límite: 20 minutos (autoenvío al agotarse).'),
      el('li', {}, 'Una vez marcada una respuesta, no se puede cambiar.'),
      el('li', {}, 'Nota mínima para aprobar: 60%.'),
    ]),
    el('label', { class: 'auth-field' }, [el('span', { class: 'auth-lbl' }, 'Nombre del aspirante'),
      el('div', { class: 'auth-input' }, [icon('user', 16), nombre])]),
    el('label', { class: 'auth-field' }, [el('span', { class: 'auth-lbl' }, 'Discord'),
      el('div', { class: 'auth-input' }, [icon('miembros', 16), discord])]),
    btn,
    el('div', { class: 'auth-foot' }, 'U.S. Marshals Service · GTAHUB Roleplay'),
  ]));
}

// ------------------------------- Examen ------------------------------------
function vistaExamen() {
  const cont = el('div', { class: 'ex-quiz' });
  const reloj = el('div', { class: 'ex-timer', id: 'ex-timer' }, fmtTime(estado.restante));
  const progreso = el('div', { class: 'ex-progress', id: 'ex-progress' }, '0 / ' + estado.preguntas.length);

  estado.preguntas.forEach((p, i) => cont.append(preguntaCard(p, i, progreso)));

  const enviar = el('button', { class: 'btn gold full', onClick: () => enviarExamen(false) }, 'Enviar examen');

  montar(el('div', { class: 'ex-card wide' }, [
    el('div', { class: 'ex-top' }, [
      el('div', {}, [el('strong', {}, 'Examen teórico USMS'), el('div', { class: 'muted small' }, 'No recargues la página.')]),
      el('div', { class: 'ex-top-right' }, [progreso, reloj]),
    ]),
    cont,
    enviar,
  ]));

  clearInterval(estado.timer);
  estado.timer = setInterval(() => {
    estado.restante--;
    const t = document.getElementById('ex-timer');
    if (t) { t.textContent = fmtTime(estado.restante); if (estado.restante <= 60) t.classList.add('urgente'); }
    if (estado.restante <= 0) { clearInterval(estado.timer); enviarExamen(true); }
  }, 1000);
}

function preguntaCard(p, i, progreso) {
  const card = el('div', { class: 'ex-q', dataset: { qid: p.id } });
  const opts = el('div', { class: 'ex-opts' });
  p.opciones.forEach((texto, idx) => {
    const opt = el('button', { class: 'ex-opt', type: 'button' }, [
      el('span', { class: 'ex-key' }, String.fromCharCode(65 + idx)), el('span', {}, texto)]);
    opt.addEventListener('click', () => {
      if (estado.respuestas[p.id] !== undefined) return; // bloqueado tras responder
      estado.respuestas[p.id] = idx;
      opt.classList.add('sel');
      [...opts.children].forEach((c) => c.classList.add('locked'));
      card.classList.add('answered');
      progreso.textContent = `${Object.keys(estado.respuestas).length} / ${estado.preguntas.length}`;
    });
    opts.append(opt);
  });
  card.append(
    el('div', { class: 'ex-q-head' }, [el('span', { class: 'ex-num' }, `${i + 1}`),
      el('span', { class: `ex-dif ${p.dificultad}` }, p.dificultad)]),
    el('p', { class: 'ex-enun' }, p.enunciado),
    opts,
  );
  return card;
}

async function enviarExamen(auto) {
  if (estado.enviando) return;
  const faltan = estado.preguntas.length - Object.keys(estado.respuestas).length;
  if (!auto && faltan > 0 && !confirm(`Te faltan ${faltan} preguntas por responder. ¿Enviar de todas formas? No podrás volver.`)) return;
  estado.enviando = true; clearInterval(estado.timer);
  montar(el('div', { class: 'ex-card' }, [el('div', { class: 'ex-load' }, [marshalBadge(60), el('p', {}, 'Corrigiendo examen…')])]));
  try {
    const { data, error } = await supabase.functions.invoke('examen-enviar', {
      body: { intentoId: estado.intentoId, token: estado.token, respuestas: estado.respuestas },
    });
    if (error) throw new Error((await error.context?.json?.())?.error || error.message);
    if (data?.error) throw new Error(data.error);
    vistaResultado(data, auto);
  } catch (e) { toast(e.message || 'Error al enviar.', 'err'); estado.enviando = false; vistaExamen(); }
}

function vistaResultado(r, auto) {
  const ok = r.aprobado;
  montar(el('div', { class: 'ex-card' }, [
    el('div', { class: 'ex-brand' }, [marshalBadge(70)]),
    el('div', { class: `ex-result ${ok ? 'ok' : 'no'}` }, [
      el('div', { class: 'ex-res-ico' }, [icon(ok ? 'check' : 'close', 40)]),
      el('h2', {}, ok ? 'APROBADO' : 'NO APROBADO'),
      el('div', { class: 'ex-score' }, `${r.porcentaje}%`),
      el('p', { class: 'muted' }, `${r.puntaje} de ${r.total} respuestas correctas.`),
      auto ? el('p', { class: 'muted small' }, 'El examen se envió automáticamente al agotarse el tiempo.') : null,
      r.expirado ? el('p', { class: 'warn small' }, 'Enviado fuera del tiempo límite.') : null,
    ]),
    el('p', { class: 'muted small center' }, 'Tu resultado fue registrado y será revisado por un instructor de la Training Division.'),
    el('div', { class: 'auth-foot' }, 'U.S. Marshals Service · Training Division'),
  ]));
}

const fmtTime = (s) => `${String(Math.floor(Math.max(s, 0) / 60)).padStart(2, '0')}:${String(Math.max(s, 0) % 60).padStart(2, '0')}`;

window.addEventListener('beforeunload', (e) => {
  if (estado.intentoId && !estado.enviando && estado.restante > 0) { e.preventDefault(); e.returnValue = ''; }
});

function vistaSinEnlace() {
  montar(el('div', { class: 'ex-card' }, [
    el('div', { class: 'ex-brand' }, [marshalBadge(70),
      el('div', { class: 'brand-title xl' }, 'TRAINING DIVISION')]),
    el('div', { class: 'ex-result no' }, [
      el('div', { class: 'ex-res-ico' }, [icon('close', 36)]),
      el('h2', {}, 'ENLACE INVÁLIDO'),
      el('p', { class: 'muted small center' }, 'Este enlace no corresponde a ninguna academia. Solicita a la Training Division el enlace del examen vigente.'),
    ]),
  ]));
}

document.addEventListener('DOMContentLoaded', () => { SLUG ? vistaRegistro() : vistaSinEnlace(); });
