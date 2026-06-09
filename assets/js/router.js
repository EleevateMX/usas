// ===========================================================================
//  USMS Control — Router por hash
// ===========================================================================
import { viewDashboard } from './views/dashboard.js';
import { viewPersonal } from './views/personal.js';
import { viewFinanzas } from './views/finanzas.js';
import { viewAsuntos } from './views/asuntos.js';
import { viewNormativa } from './views/normativa.js';
import { viewTraining } from './views/training.js';
import { viewMiembros } from './views/miembros.js';
import { viewRespaldo } from './views/respaldo.js';

export const ROUTES = {
  '/dashboard': { label: 'Centro de Mando', icon: 'dashboard', view: viewDashboard },
  '/personal':  { label: 'Personal',        icon: 'personal',  view: viewPersonal },
  '/finanzas':  { label: 'Tesorería',       icon: 'finanzas',  view: viewFinanzas },
  '/asuntos':   { label: 'Asuntos Internos',icon: 'asuntos',   view: viewAsuntos },
  '/normativa': { label: 'Normativa',        icon: 'normativa', view: viewNormativa },
  '/training':  { label: 'Training Division',icon: 'training',  view: viewTraining },
  '/miembros':  { label: 'Miembros',         icon: 'miembros',  view: viewMiembros, soloAdmin: true },
  '/respaldo':  { label: 'Respaldo',         icon: 'respaldo',  view: viewRespaldo },
};

export function currentPath() {
  const h = location.hash.replace(/^#/, '');
  return ROUTES[h] ? h : '/dashboard';
}

export function render() {
  const path = currentPath();
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
