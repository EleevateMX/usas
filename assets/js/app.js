// ===========================================================================
//  USMS Control — Bootstrap (con autenticación Supabase)
// ===========================================================================
import { ROUTES, initRouter, render } from './router.js';
import { getState, setSession, loadPerfil, loadAll, subscribe, initRealtime, puedeExportar } from './store.js';
import { getSession, onAuthChange, signOut, viewLogin } from './auth.js';
import { el, toast, modal, closeModal } from './ui.js';
import { icon, sealImg } from './icons.js';
import { abrirCuenta } from './views/miembros.js';
import { abrirBusqueda } from './search.js';
import { abrirNotificaciones, contarNotificaciones } from './notificaciones.js';

const elById = (id) => document.getElementById(id);

function hideLoader() {
  const l = elById('loader');
  if (l) { l.classList.add('hide'); setTimeout(() => l.remove(), 450); }
}

// Re-render por cambios (realtime), sin interrumpir modales ni escritura.
let renderTimer = null;
function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => {
    if (document.getElementById('modal')) return;
    const ae = document.activeElement;
    if (ae && ['INPUT', 'TEXTAREA', 'SELECT'].includes(ae.tagName)) return;
    render();
  }, 120);
}

function buildBrand() {
  const host = elById('badge-host');
  if (host && !host.firstChild) host.append(sealImg(42));
}

function buildNav() {
  const nav = elById('nav');
  nav.innerHTML = '';
  for (const [path, r] of Object.entries(ROUTES)) {
    if (r.gate && !r.gate()) continue;
    const a = el('a', { class: 'nav-item', href: '#' + path, dataset: { path } },
      [icon(r.icon, 18), el('span', {}, r.label)]);
    nav.append(a);
  }
}

function buildTopbar() {
  const p = getState().perfil;
  const host = elById('user-box');
  host.innerHTML = '';
  if (!p) return;
  if (puedeExportar()) {
    host.append(el('button', { class: 'icon-btn', title: 'Búsqueda global (Ctrl/⌘ K)', onClick: abrirBusqueda }, [icon('search', 18)]));
  }
  const bell = el('button', { class: 'icon-btn bell', title: 'Notificaciones', onClick: abrirNotificaciones }, [icon('bell', 18)]);
  const nc = contarNotificaciones();
  if (nc) bell.append(el('span', { class: 'noti-badge' }, String(nc > 9 ? '9+' : nc)));
  host.append(bell);
  host.append(
    el('button', { class: 'user-chip', onClick: abrirCuenta, title: 'Mi cuenta' }, [
      icon('user', 15),
      el('span', { class: 'user-name' }, p.nombre || p.email),
      el('span', { class: 'badge rango' }, p.rol),
    ]),
    el('button', { class: 'icon-btn', title: 'Cerrar sesión', onClick: async () => {
      await signOut(); location.reload();
    } }, [icon('logout', 18)]),
  );
}

async function enterApp() {
  elById('gate').style.display = 'none';
  elById('shell').style.display = 'flex';
  try {
    await loadPerfil();
    if (getState().perfil?.activo === false) { mostrarBaja(); return; }
    await loadAll();
  } catch (e) {
    toast('Error al cargar datos: ' + e.message, 'err');
  }
  buildBrand();
  buildNav();
  buildTopbar();
  initRouter();
  if (!location.hash || !ROUTES[location.hash.replace(/^#/, '')]) location.hash = '#/dashboard';
  render();
  hideLoader();

  // Tiempo real: re-renderiza al detectar cambios (sin interrumpir edición).
  initRealtime();
  if (!window.__usmsRealtimeWired) {
    window.__usmsRealtimeWired = true;
    subscribe(scheduleRender);
  }

  // Búsqueda global con Ctrl/⌘ K.
  if (!window.__usmsSearchWired) {
    window.__usmsSearchWired = true;
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); abrirBusqueda(); }
    });
  }

  const toggle = elById('menu-toggle');
  const sidebar = elById('sidebar');
  const backdrop = elById('backdrop');
  const setMenu = (open) => { sidebar.classList.toggle('open', open); backdrop?.classList.toggle('show', open); };
  if (toggle && !toggle.firstChild) toggle.append(icon('menu', 20));
  toggle?.addEventListener('click', () => setMenu(!sidebar.classList.contains('open')));
  backdrop?.addEventListener('click', () => setMenu(false));
  elById('nav')?.addEventListener('click', () => setMenu(false));

  buildInstall();
}

// -------- Acceso revocado (miembro dado de baja) --------
function mostrarBaja() {
  const p = getState().perfil;
  elById('shell').style.display = 'none';
  const gate = elById('gate');
  gate.style.display = 'grid';
  gate.innerHTML = '';
  gate.append(el('div', { class: 'lv' }, [
    el('div', { class: 'lv-form', style: 'grid-column:1/-1' }, [
      el('div', { class: 'lv-form-inner' }, [
        el('div', { class: 'lv-seal-sm', style: 'display:flex' }, [sealImg(56)]),
        el('div', { class: 'lv-kicker' }, 'Acceso revocado'),
        el('h1', { class: 'lv-h' }, 'Cuenta dada de baja'),
        el('p', { class: 'lv-p muted small' }, `${p?.nombre || p?.email || ''}, tu acceso al Centro de Mando fue dado de baja. Si crees que es un error, contacta a la Directiva para reactivarlo.`),
        el('button', { class: 'btn gold full', onClick: async () => { await signOut(); location.reload(); } }, 'Cerrar sesión'),
      ]),
    ]),
  ]));
  hideLoader();
}

// --------------------------- Instalación PWA -------------------------------
let deferredPrompt = null;
const esStandalone = () => matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; buildInstall(); });
window.addEventListener('appinstalled', () => { deferredPrompt = null; buildInstall(); toast('App instalada'); });

function buildInstall() {
  const slot = elById('install-slot');
  if (!slot) return;
  slot.innerHTML = '';
  if (esStandalone()) return;                 // ya instalada
  if (!deferredPrompt && !esIOS()) return;     // navegador sin soporte de instalación
  slot.append(el('button', { class: 'btn ghost small ic', title: 'Instalar la app', onClick: instalar },
    [icon('download', 14), el('span', { class: 'install-lbl' }, 'Instalar app')]));
}

async function instalar() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null; buildInstall();
    return;
  }
  // iOS: no hay prompt nativo, mostramos instrucciones.
  modal('Instalar en iPhone / iPad', el('div', {}, [
    el('p', { class: 'muted small' }, 'En Safari, instala el Centro de Mando como app:'),
    el('ol', { class: 'install-steps' }, [
      el('li', {}, 'Toca el botón Compartir (el cuadro con la flecha hacia arriba).'),
      el('li', {}, 'Elige “Añadir a pantalla de inicio”.'),
      el('li', {}, 'Confirma con “Añadir”. Quedará con el sello del USMS.'),
    ]),
    el('div', { class: 'row gap end' }, [el('button', { class: 'btn gold', onClick: closeModal }, 'Entendido')]),
  ]));
}

async function showGate() {
  elById('shell').style.display = 'none';
  const gate = elById('gate');
  gate.style.display = 'grid';
  gate.innerHTML = '';
  gate.append(await viewLogin(async () => {
    const s = await getSession();
    setSession(s);
    await enterApp();
  }));
  hideLoader();
}

async function init() {
  const session = await getSession();
  if (session) { setSession(session); await enterApp(); }
  else { await showGate(); }

  onAuthChange(async (s) => {
    if (!s && getState().session) location.reload();
  });
}

document.addEventListener('DOMContentLoaded', init);

// PWA: registra el service worker (instalable + caché de la app).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// Exporta para que otras vistas refresquen menú/topbar tras cambios de rol.
export { buildNav, buildTopbar };
