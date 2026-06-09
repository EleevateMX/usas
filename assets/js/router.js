// ===========================================================================
//  USMS Control — Router por hash
// ===========================================================================
import { viewDashboard } from './views/dashboard.js';
import { viewPersonal } from './views/personal.js';
import { viewFinanzas } from './views/finanzas.js';
import { viewAsuntos } from './views/asuntos.js';
import { viewNormativa } from './views/normativa.js';
import { viewReferencia } from './views/referencia.js';
import { viewTraining } from './views/training.js';
import { viewAcademia } from './views/academia.js';
import { viewDivisiones } from './views/divisiones.js';
import { viewAscensos } from './views/ascensos.js';
import { viewMiembros } from './views/miembros.js';
import { viewRespaldo } from './views/respaldo.js';
import { esAdmin, esTD, esDirectiva } from './store.js';

export const ROUTES = {
  '/dashboard': { label: 'Centro de Mando', icon: 'dashboard', view: viewDashboard },
  '/personal':  { label: 'Personal',        icon: 'personal',  view: viewPersonal },
  '/divisiones':{ label: 'Divisiones',       icon: 'layers',    view: viewDivisiones },
  '/ascensos':  { label: 'Ascensos',         icon: 'star',      view: viewAscensos, gate: esDirectiva },
  '/finanzas':  { label: 'Tesorería',       icon: 'finanzas',  view: viewFinanzas },
  '/asuntos':   { label: 'Asuntos Internos',icon: 'asuntos',   view: viewAsuntos },
  '/normativa': { label: 'Normativa',        icon: 'normativa', view: viewNormativa },
  '/referencia':{ label: 'Referencia',       icon: 'referencia',view: viewReferencia },
  '/training':  { label: 'Training Division',icon: 'training',  view: viewTraining, gate: esTD },
  '/academia':  { label: 'Programa TD',      icon: 'award',     view: viewAcademia, gate: esTD },
  '/miembros':  { label: 'Miembros',         icon: 'miembros',  view: viewMiembros, gate: esAdmin },
  '/respaldo':  { label: 'Respaldo',         icon: 'respaldo',  view: viewRespaldo },
};

export function currentPath() {
  const h = location.hash.replace(/^#/, '');
  return ROUTES[h] ? h : '/dashboard';
}

// Rutas permitidas en la consola TD aparte (td.html).
const TD_ONLY = ['/training', '/academia'];

export function render() {
  let path = currentPath();
  // Consola TD aparte: solo se permiten las rutas de la Training Division.
  if (window.__tdOnly && !TD_ONLY.includes(path)) { location.hash = '#/academia'; path = '/academia'; }
  // Rutas restringidas por gate (rol/división): si no tiene acceso, al dashboard.
  if (ROUTES[path].gate && !ROUTES[path].gate()) {
    const destino = window.__tdOnly ? '/academia' : '/dashboard';
    location.hash = '#' + destino; path = destino;
  }
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = '';
  try {
    app.append(ROUTES[path].view());
  } catch (e) {
    console.error(e);
    app.append(Object.assign(document.createElement('div'),
      { className: 'card', textContent: 'Error al renderizar la vista: ' + e.message }));
  }
  document.querySelectorAll('.nav-item').forEach((n) =>
    n.classList.toggle('active', n.dataset.path === path));
  document.title = `USMS · ${ROUTES[path].label}`;
}

export function initRouter() {
  window.addEventListener('hashchange', render);
}
