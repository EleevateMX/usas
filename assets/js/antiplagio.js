// ===========================================================================
//  USMS Control — Disuasivos anti-copia
//  NOTA: no es protección infalible. Un navegador siempre necesita recibir el
//  HTML/CSS/JS para funcionar, así que quien insista podrá verlo. Esto solo
//  frena la copia casual (clic derecho, selección, atajos, DevTools básicos).
//  Se respeta la escritura en formularios y los botones de "Copiar" de la app
//  (usan la API de portapapeles, no el evento 'copy').
// ===========================================================================
(function () {
  // --- CSS: bloquea selección salvo en campos editables ---
  const css = `
    :root { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; -webkit-touch-callout: none; }
    input, textarea, select, [contenteditable="true"], .cred-v {
      -webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; user-select: text;
    }
    img { -webkit-user-drag: none; user-drag: none; }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  const enCampo = (t) => !!(t && t.closest && t.closest('input, textarea, select, [contenteditable="true"]'));
  const bloquear = (e) => { e.preventDefault(); return false; };

  // Clic derecho (menú contextual) y arrastrar imágenes.
  document.addEventListener('contextmenu', bloquear);
  document.addEventListener('dragstart', bloquear);

  // Copiar / cortar fuera de campos editables (los botones "Copiar" siguen
  // funcionando porque usan navigator.clipboard, no el evento 'copy').
  ['copy', 'cut'].forEach((ev) => document.addEventListener(ev, (e) => {
    if (!enCampo(e.target)) e.preventDefault();
  }));

  // Atajos de teclado: ver fuente, guardar, imprimir, copiar y DevTools.
  document.addEventListener('keydown', (e) => {
    const k = (e.key || '').toLowerCase();
    if (e.key === 'F12') return bloquear(e);
    // DevTools: Ctrl/Cmd + Shift + I / J / C
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(k)) return bloquear(e);
    // Ver fuente / guardar / imprimir / copiar / cortar (fuera de campos)
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && ['u', 's', 'p', 'c', 'x'].includes(k) && !enCampo(e.target)) return bloquear(e);
  });
})();
