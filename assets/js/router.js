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
import { viewDivisiones } from './views/divisiones.js';
import { viewMiembros } from './views/miembros.js';
import { viewRespaldo } from './views/respaldo.js';
import { esAdmin, esTD } from './store.js';

export const ROUTES = {
  '/dashboard': { label: 'Centro de Mando', icon: 'dashboard', view: viewDashboard },
  '/personal':  { label: 'Personal',        icon: 'personal',  view: viewPersonal },
  '/divisiones':{ label: 'Divisiones',       icon: 'layers',    view: viewDivisiones },
  '/finanzas':  { label: 'Tesorería',       icon: 'finanzas',  view: viewFinanzas },
  '/asuntos':   { label: 'Asuntos Internos',icon: 'asuntos',   view: viewAsuntos },
  '/normativa': { label: 'Normativa',        icon: 'normativa', view: viewNormativa },
  '/referencia':{ label: 'Referencia',       icon: 'referencia',view: viewReferencia },
  '/training':  { label: 'Training Division',icon: 'training',  view: viewTraining, gate: esTD },
  '/miembros':  { label: 'Miembros',         icon: 'miembros',  view: viewMiembros, gate: esAdmin },
  '/respaldo':  { label: 'Respaldo',         icon: 'respaldo',  view: viewRespaldo },
};

export function currentPath() {
  const h = location.hash.replace(/^#/, '');
  return ROUTES[h] ? h : '/dashboard';
}

export function render() {
  let path = currentPath();
  // Rutas restringidas por gate (rol/división): si no tiene acceso, al dashboard.
  if (ROUTES[path].gate && !ROUTES[path].gate()) { location.hash = '#/dashboard'; path = '/dashboard'; }
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
