// ===========================================================================
//  USMS — Consola aparte de la Training Division (td.html)
//  Acceso exclusivo para personal con permiso TD. Reutiliza las vistas
//  Programa TD (/academia) y Training Division (/training); el router queda
//  acotado a esas rutas por window.__tdOnly.
// ===========================================================================
window.__tdOnly = true;

import { getSession, signIn, signOut } from './auth.js';
import { setSession, loadPerfil, loadAll, getState, esTD, subscribe, initRealtime } from './store.js';
import { initRouter, render } from './router.js';
import { el, toast } from './ui.js';
import { icon, sealImg } from './icons.js';

const TD_ROUTES = ['/academia', '/training'];
const byId = (id) => document.getElementById(id);

function hideLoader() {
  const l = byId('loader');
  if (l) { l.classList.add('hide'); setTimeout(() => l.remove(), 450); }
}

const field = (label, ic, input) => el('label', { class: 'auth-field' }, [
  el('span', { class: 'auth-lbl' }, label),
  el('div', { class: 'auth-input' }, [icon(ic, 16), input]),
]);

function buildNav() {
  const nav = byId('td-nav');
  nav.innerHTML = '';
  [['/academia', 'Programa TD', 'award'], ['/training', 'Training Division', 'training']].forEach(([path, label, ic]) => {
    nav.append(el('a', { class: 'nav-item td-tab', href: '#' + path, dataset: { path } }, [icon(ic, 16), el('span', {}, label)]));
  });
}

function buildUser() {
  const host = byId('td-user');
  host.innerHTML = '';
  const p = getState().perfil;
  host.append(
    el('span', { class: 'user-chip' }, [icon('user', 15), el('span', { class: 'user-name' }, p?.nombre || p?.email || ''), el('span', { class: 'badge rango' }, p?.rol || '')]),
    el('button', { class: 'icon-btn', title: 'Salir', onClick: async () => { await signOut(); location.reload(); } }, [icon('logout', 18)]),
  );
}

function vistaSinAcceso(msg) {
  byId('td-nav').innerHTML = '';
  buildUser();
  const app = byId('app');
  app.innerHTML = '';
  app.append(el('div', { class: 'view' }, [
    el('div', { class: 'card empty' }, msg || 'No tienes acceso a la Training Division. Pide a un Director que te asigne la división “Training Division”.'),
  ]));
  hideLoader();
}

async function enter() {
  byId('td-gate').style.display = 'none';
  byId('td-shell').style.display = 'flex';
  const seal = byId('td-seal');
  if (seal && !seal.firstChild) seal.append(sealImg(30));
  try { await loadPerfil(); await loadAll(); }
  catch (e) { toast('Error al cargar datos: ' + e.message, 'err'); }

  if (getState().perfil?.activo === false) { vistaSinAcceso('Tu acceso fue dado de baja. Contacta a la Directiva para reactivarlo.'); return; }
  if (!esTD()) { vistaSinAcceso(); return; }

  buildNav();
  buildUser();
  initRouter();
  if (!TD_ROUTES.includes(location.hash.replace(/^#/, ''))) location.hash = '#/academia';
  render();
  hideLoader();

  initRealtime();
  if (!window.__tdWired) {
    window.__tdWired = true;
    subscribe(() => {
      if (document.getElementById('modal')) return;
      const ae = document.activeElement;
      if (ae && ['INPUT', 'TEXTAREA', 'SELECT'].includes(ae.tagName)) return;
      render();
    });
  }
}

function showGate() {
  byId('td-shell').style.display = 'none';
  const gate = byId('td-gate');
  gate.style.display = 'grid';
  gate.innerHTML = '';

  const email = el('input', { type: 'email', placeholder: 'correo@ejemplo.com', autocomplete: 'username' });
  const pass = el('input', { type: 'password', placeholder: 'Contraseña', autocomplete: 'current-password' });
  const btn = el('button', { class: 'btn gold full', onClick: submit }, 'Entrar');

  async function submit() {
    if (!email.value.trim() || !pass.value) return toast('Completa correo y contraseña', 'err');
    btn.disabled = true; btn.textContent = 'Procesando…';
    try {
      await signIn(email.value.trim(), pass.value);
      setSession(await getSession());
      await enter();
    } catch (e) { toast(e.message || 'No se pudo acceder', 'err'); btn.disabled = false; btn.textContent = 'Entrar'; }
  }
  [email, pass].forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); }));

  const features = el('ul', { class: 'lv-features' }, [
    ['award', 'Academias y aspirantes'],
    ['training', 'Programa día a día y manuales'],
    ['file', 'Exámenes, asistencia y seguimiento'],
  ].map(([ic, t]) => el('li', {}, [icon(ic, 15), el('span', {}, t)])));

  gate.append(el('div', { class: 'lv' }, [
    el('div', { class: 'lv-brand' }, [
      el('div', { class: 'aurora' }, [el('span', { class: 'a1' }), el('span', { class: 'a2' }), el('span', { class: 'a3' })]),
      el('div', { class: 'lv-brand-inner' }, [
        el('div', { class: 'lv-seal' }, [sealImg(104)]),
        el('div', { class: 'lv-title' }, 'TRAINING DIVISION'),
        el('div', { class: 'lv-sub' }, 'U.S. Marshals · Consola de instructores'),
        el('div', { class: 'lv-lema' }, [el('span', {}, 'Justicia'), el('span', {}, 'Integridad'), el('span', {}, 'Servicio')]),
        features,
      ]),
      el('div', { class: 'lv-brand-foot' }, 'GTAHUB Roleplay · Uso interno y confidencial'),
    ]),
    el('div', { class: 'lv-form' }, [
      el('div', { class: 'lv-form-inner' }, [
        el('div', { class: 'lv-seal-sm' }, [sealImg(56)]),
        el('div', { class: 'lv-kicker' }, 'Acceso TD'),
        el('h1', { class: 'lv-h' }, 'Consola de instructores'),
        el('p', { class: 'lv-p muted small' }, 'Acceso exclusivo para el personal de la Training Division. Usa tu mismo correo y contraseña del panel.'),
        el('div', { class: 'lv-fields' }, [field('Correo', 'user', email), field('Contraseña', 'shield', pass), btn]),
        el('div', { class: 'lv-form-foot muted xsmall' }, 'U.S. Marshals Service · GTAHUB Roleplay'),
      ]),
    ]),
  ]));
  hideLoader();
}

async function init() {
  const session = await getSession();
  if (session) { setSession(session); await enter(); }
  else showGate();
}

document.addEventListener('DOMContentLoaded', init);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
