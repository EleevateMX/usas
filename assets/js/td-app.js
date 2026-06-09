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

function vistaSinAcceso() {
  byId('td-nav').innerHTML = '';
  buildUser();
  const app = byId('app');
  app.innerHTML = '';
  app.append(el('div', { class: 'view' }, [
    el('div', { class: 'card empty' }, 'No tienes acceso a la Training Division. Pide a un Director que te asigne la división “Training Division”.'),
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

  gate.append(el('div', { class: 'auth-wrap' }, [
    el('div', { class: 'aurora' }, [el('span', { class: 'a1' }), el('span', { class: 'a2' }), el('span', { class: 'a3' })]),
    el('div', { class: 'auth-card' }, [
      el('div', { class: 'auth-brand' }, [sealImg(96),
        el('div', { class: 'brand-title xl' }, 'TRAINING DIVISION'),
        el('div', { class: 'brand-sub' }, 'Consola de instructores')]),
      el('div', { class: 'auth-divider' }, [el('span', {}, 'ACCESO TD')]),
      el('p', { class: 'muted small center' }, 'Acceso exclusivo para el personal de la Training Division. Usa tu mismo correo y contraseña del panel.'),
      el('div', { class: 'auth-form' }, [field('Correo', 'user', email), field('Contraseña', 'shield', pass), btn]),
      el('div', { class: 'auth-foot' }, 'U.S. Marshals Service · GTAHUB Roleplay'),
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
