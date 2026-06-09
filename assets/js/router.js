// ===========================================================================
//  USMS Control — Router por hash (sin dependencias)
// ===========================================================================
import { viewDashboard } from './views/dashboard.js';
import { viewPersonal } from './views/personal.js';
import { viewFinanzas } from './views/finanzas.js';
import { viewAsuntos } from './views/asuntos.js';
import { viewNormativa } from './views/normativa.js';
import { viewRespaldo } from './views/respaldo.js';

export const ROUTES = {
  '/dashboard': { label: 'Centro de Mando', icon: '★', view: viewDashboard },
  '/personal':  { label: 'Personal',        icon: '👮', view: viewPersonal },
  '/finanzas':  { label: 'Tesorería',       icon: '💵', view: viewFinanzas },
  '/asuntos':   { label: 'Asuntos Internos',icon: '🛡', view: viewAsuntos },
  '/normativa': { label: 'Normativa',        icon: '📖', view: viewNormativa },
  '/respaldo':  { label: 'Respaldo',         icon: '💾', view: viewRespaldo },
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
  // Resalta el ítem activo en el menú.
  document.querySelectorAll('.nav-item').forEach((n) =>
    n.classList.toggle('active', n.dataset.path === path));
  document.title = `USMS · ${ROUTES[path].label}`;
}

export function initRouter() {
  window.addEventListener('hashchange', render);
}
