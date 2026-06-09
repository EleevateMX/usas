import { getState, exportJSON } from '../store.js';
import { el, toast } from '../ui.js';

export function viewRespaldo() {
  const s = getState();
  return el('div', { class: 'view' }, [
    el('h2', {}, 'Respaldo y datos'),
    el('p', { class: 'muted' }, 'Los datos se guardan en la nube (Supabase) y se sincronizan entre todo el liderazgo. Aquí puedes exportar una copia de respaldo en JSON.'),

    el('div', { class: 'card' }, [
      el('h3', {}, '📤 Exportar copia'),
      el('p', { class: 'muted small' }, `Personal: ${s.personal.length} · Movimientos: ${s.finanzas.length} · Casos: ${s.casos.length} · Sanciones: ${s.sanciones.length} · Artículos: ${s.normativa.length}`),
      el('div', { class: 'row gap' }, [
        el('button', { class: 'btn gold', onClick: doExport }, 'Descargar respaldo (.json)'),
        el('button', { class: 'btn ghost', onClick: doCopy }, 'Copiar al portapapeles'),
      ]),
    ]),

    el('div', { class: 'card' }, [
      el('h3', {}, '☁ Sincronización en la nube'),
      el('p', { class: 'muted small' }, 'Todo cambio se guarda al instante en Supabase. Cualquier miembro del liderazgo con acceso verá los datos actualizados al recargar. El control de permisos se administra desde “Miembros”.'),
    ]),
  ]);
}

function doExport() {
  const blob = new Blob([exportJSON()], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob),
    download: `usms-respaldo-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a); a.click(); a.remove();
  toast('Respaldo descargado');
}
async function doCopy() {
  try { await navigator.clipboard.writeText(exportJSON()); toast('Copiado al portapapeles'); }
  catch { toast('No se pudo copiar', 'err'); }
}
