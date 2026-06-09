// ===========================================================================
//  USMS Control — Bootstrap de la aplicación
// ===========================================================================
import { ROUTES, initRouter, render } from './router.js';
import { getState } from './store.js';

function buildNav() {
  const nav = document.getElementById('nav');
  nav.innerHTML = '';
  for (const [path, r] of Object.entries(ROUTES)) {
    const a = document.createElement('a');
    a.className = 'nav-item';
    a.href = '#' + path;
    a.dataset.path = path;
    a.innerHTML = `<span class="nav-ico">${r.icon}</span><span>${r.label}</span>`;
    nav.append(a);
  }
}

function init() {
  getState();          // inicializa estado/semilla
  buildNav();
  initRouter();
  if (!location.hash) location.hash = '#/dashboard';
  render();

  // Botón de menú móvil.
  const toggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  toggle?.addEventListener('click', () => sidebar.classList.toggle('open'));
  document.getElementById('nav')?.addEventListener('click', () => sidebar.classList.remove('open'));
}

document.addEventListener('DOMContentLoaded', init);
