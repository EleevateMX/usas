// ===========================================================================
//  USMS Training Division — Portal de estudio para aspirantes (DUSMT)
//  Sin login. El aspirante entra con su nombre + Discord y estudia los temas
//  que la Training Division va liberando día a día. El progreso se guarda.
// ===========================================================================
import { supabase } from './supabase.js';
import { el, toast } from './ui.js';
import { sealImg, icon } from './icons.js';

const LS_KEY = 'usms_td_portal';
const app = () => document.getElementById('academia-app');
function montar(node) { const a = app(); a.innerHTML = ''; a.append(node); }

let estado = { nombre: '', discord: '', data: null };

async function api(accion, extra = {}) {
  const { data, error } = await supabase.functions.invoke('td-portal', { body: { accion, ...extra } });
  if (error) { let m = error.message; try { m = (await error.context.json()).error || m; } catch { /* noop */ } throw new Error(m); }
  if (data?.error) throw new Error(data.error);
  return data;
}

// ------------------------------- Registro ----------------------------------
function vistaRegistro() {
  const nombre = el('input', { type: 'text', placeholder: 'Nombre y apellido del personaje', value: estado.nombre });
  const discord = el('input', { type: 'text', placeholder: 'Usuario de Discord', value: estado.discord });
  const btn = el('button', { class: 'btn gold full', onClick: entrar }, 'Entrar al portal');

  async function entrar() {
    if (nombre.value.trim().length < 3) return toast('Escribe tu nombre completo.', 'err');
    if (discord.value.trim().length < 2) return toast('Escribe tu usuario de Discord.', 'err');
    btn.disabled = true; btn.textContent = 'Entrando…';
    estado.nombre = nombre.value.trim(); estado.discord = discord.value.trim();
    try {
      await api('registrar', { nombre: estado.nombre, discord: estado.discord });
      localStorage.setItem(LS_KEY, JSON.stringify({ nombre: estado.nombre, discord: estado.discord }));
      await cargar();
    } catch (e) { toast(e.message || 'No se pudo entrar.', 'err'); btn.disabled = false; btn.textContent = 'Entrar al portal'; }
  }
  [nombre, discord].forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') entrar(); }));

  montar(el('div', { class: 'ex-card' }, [
    el('div', { class: 'ex-brand' }, [sealImg(86),
      el('div', { class: 'brand-title xl' }, 'PORTAL DE ESTUDIO'),
      el('div', { class: 'brand-sub' }, 'Training Division · Programa para DUSMT')]),
    el('div', { class: 'auth-divider' }, [el('span', {}, 'ACCESO DE ASPIRANTE')]),
    el('p', { class: 'muted small center' }, 'Repasa los temas que la Training Division libera día a día. Tu progreso queda guardado con tu Discord.'),
    el('label', { class: 'auth-field' }, [el('span', { class: 'auth-lbl' }, 'Nombre del aspirante'),
      el('div', { class: 'auth-input' }, [icon('user', 16), nombre])]),
    el('label', { class: 'auth-field' }, [el('span', { class: 'auth-lbl' }, 'Discord'),
      el('div', { class: 'auth-input' }, [icon('miembros', 16), discord])]),
    btn,
    el('div', { class: 'auth-foot' }, 'U.S. Marshals Service · GTAHUB Roleplay'),
  ]));
}

// ------------------------------- Cargar ------------------------------------
async function cargar() {
  montar(el('div', { class: 'ex-card' }, [el('div', { class: 'ex-load' }, [sealImg(64), el('p', {}, 'Cargando programa…')])]));
  try {
    estado.data = await api('cargar', { discord: estado.discord });
    vistaPortal();
  } catch (e) { toast(e.message || 'Error al cargar.', 'err'); vistaRegistro(); }
}

// ------------------------------- Portal ------------------------------------
function vistaPortal() {
  const d = estado.data;
  const completados = new Set(d.completados || []);
  const liberados = d.modulos || [];
  const total = d.totalModulos || liberados.length;
  const bloqueados = Math.max(0, total - liberados.length);
  const hechos = liberados.filter((m) => completados.has(m.id)).length;
  const pct = liberados.length ? Math.round((hechos / liberados.length) * 100) : 0;

  const cont = el('div', { class: 'portal-mods' }, liberados.map((m) => moduloCard(m, completados.has(m.id))));

  montar(el('div', { class: 'ex-card wide portal' }, [
    el('div', { class: 'portal-top' }, [
      el('div', { class: 'ex-brand mini' }, [sealImg(54),
        el('div', {}, [el('div', { class: 'brand-title' }, 'PORTAL DE ESTUDIO'),
          el('div', { class: 'brand-sub' }, `${estado.nombre} · Training Division`)])]),
      el('button', { class: 'btn ghost small', onClick: salir }, 'Salir'),
    ]),

    el('div', { class: 'portal-prog' }, [
      el('div', { class: 'row between' }, [el('strong', {}, 'Tu progreso'), el('span', { class: 'muted small' }, `${hechos}/${liberados.length} temas · ${pct}%`)]),
      el('div', { class: 'prog-bar lg' }, [el('div', { class: 'prog-fill', style: `width:${pct}%` })]),
    ]),

    (d.notas || []).length ? notasBloque(d.notas) : null,

    liberados.length ? cont : el('p', { class: 'muted center' }, 'Aún no se ha liberado ningún tema. Vuelve cuando la Training Division publique el primer día.'),

    bloqueados ? el('div', { class: 'portal-locked' }, [icon('clock', 16),
      el('span', {}, `${bloqueados} ${bloqueados === 1 ? 'módulo se liberará' : 'módulos se liberarán'} más adelante.`)]) : null,

    el('div', { class: 'auth-foot' }, 'U.S. Marshals Service · Training Division'),
  ]));
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
    (m.temas || []).length ? el('div', { class: 'portal-temas' }, m.temas.map((t) => t.url
      ? el('a', { class: 'portal-tema', href: t.url, target: '_blank' }, [icon('file', 15), el('span', {}, t.nombre), icon('link', 13)])
      : el('span', { class: 'portal-tema nolink' }, [icon('file', 15), el('span', {}, t.nombre)]))) : null,
    el('div', { class: 'row gap end' }, [check]),
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

async function toggle(moduloId, completado, btn) {
  btn.disabled = true;
  try {
    await api('completar', { discord: estado.discord, moduloId, completado });
    estado.data = await api('cargar', { discord: estado.discord });
    vistaPortal();
  } catch (e) { toast(e.message || 'No se pudo guardar.', 'err'); btn.disabled = false; }
}

function salir() {
  localStorage.removeItem(LS_KEY);
  estado = { nombre: '', discord: '', data: null };
  vistaRegistro();
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (saved?.discord) { estado.nombre = saved.nombre || ''; estado.discord = saved.discord; cargar(); return; }
  } catch { /* noop */ }
  vistaRegistro();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
