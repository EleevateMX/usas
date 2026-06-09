// ===========================================================================
//  USMS Control — Iconografía SVG (sin dependencias, sin emojis)
//  Estilo line-icon (24x24, stroke currentColor). marshalBadge() es la
//  insignia/estrella del U.S. Marshal para login y barra lateral.
// ===========================================================================

const P = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  personal: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  finanzas: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
  asuntos: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  normativa: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
  miembros: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
  respaldo: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
  history: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z"/><path d="m9 12 2 2 4-4"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  menu: '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  undo: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  training: '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1 2.5 3 6 3s6-2 6-3v-5"/><path d="M22 10v6"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5"/>',
};
const FILLED = new Set(['star']);

export function icon(name, size = 18) {
  const span = document.createElement('span');
  span.className = 'ico';
  const filled = FILLED.has(name);
  span.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" ` +
    `fill="${filled ? 'currentColor' : 'none'}" stroke="${filled ? 'none' : 'currentColor'}" ` +
    `stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
  return span;
}

// Insignia / estrella del U.S. Marshal (escudo: anillo dorado con texto curvo,
// borde de cuentas, estrella de 5 puntas biselada y medallón central).
export function marshalBadge(size = 96) {
  const span = document.createElement('span');
  span.className = 'marshal-badge';
  span.innerHTML = `
<svg viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="U.S. Marshals Service">
  <defs>
    <radialGradient id="mb-rim" cx="40%" cy="30%" r="80%">
      <stop offset="0%" stop-color="#f9eab0"/>
      <stop offset="45%" stop-color="#e3bf52"/>
      <stop offset="100%" stop-color="#9c7421"/>
    </radialGradient>
    <radialGradient id="mb-face" cx="50%" cy="36%" r="72%">
      <stop offset="0%" stop-color="#1a2942"/>
      <stop offset="100%" stop-color="#070b16"/>
    </radialGradient>
    <linearGradient id="mb-star" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fbf0c0"/>
      <stop offset="42%" stop-color="#e9c860"/>
      <stop offset="100%" stop-color="#b8902c"/>
    </linearGradient>
    <path id="mb-top" d="M 16,60 A 44,44 0 0 1 104,60" fill="none"/>
    <path id="mb-bot" d="M 16,60 A 44,44 0 0 0 104,60" fill="none"/>
  </defs>

  <circle cx="60" cy="60" r="58" fill="url(#mb-rim)"/>
  <circle cx="60" cy="60" r="58" fill="none" stroke="#7c5e1a" stroke-width="0.8" opacity="0.6"/>
  <circle cx="60" cy="60" r="52" fill="url(#mb-face)"/>
  <circle cx="60" cy="60" r="48.5" fill="none" stroke="#e3bf52" stroke-width="1.6"/>
  <circle cx="60" cy="60" r="45" fill="none" stroke="#e3bf52" stroke-width="2" stroke-linecap="round" stroke-dasharray="0.2 3.1" opacity="0.85"/>

  <g fill="#f2e6b8" font-family="Oswald, sans-serif" font-weight="600" letter-spacing="1.0">
    <text font-size="6.8"><textPath href="#mb-top" startOffset="50%" text-anchor="middle">U.S. MARSHALS SERVICE</textPath></text>
    <text font-size="6.8" fill="#9fb0cc"><textPath href="#mb-bot" startOffset="50%" text-anchor="middle">SAN ANDREAS</textPath></text>
  </g>

  <polygon points="60,34 65.88,49.91 82.83,50.58 69.51,61.09 74.11,77.42 60,68 45.89,77.42 50.49,61.09 37.17,50.58 54.12,49.91"
    fill="url(#mb-star)" stroke="#7c5e1a" stroke-width="0.9" stroke-linejoin="round"/>
  <polygon points="60,40 64,50.5 75,51 65.5,59 69,70 60,63.5 51,70 54.5,59 45,51 56,50.5"
    fill="none" stroke="#fcf3cf" stroke-width="0.5" opacity="0.5" stroke-linejoin="round"/>
  <circle cx="60" cy="58.5" r="4.4" fill="#0b1120" stroke="#e9c860" stroke-width="1"/>
</svg>`;
  return span;
}
