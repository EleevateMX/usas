import { getState, exportJSON, importJSON, resetAll } from '../store.js';
import { el, toast, confirmDialog, fmtDate } from '../ui.js';
import { render } from '../router.js';

export function viewRespaldo() {
  const s = getState();

  return el('div', { class: 'view' }, [
    el('h2', {}, 'Respaldo y datos'),
    el('p', { class: 'muted' }, 'Todos los datos se guardan en este navegador (localStorage). Exporta un archivo JSON para respaldar o compartir con tu liderazgo, e impórtalo en cualquier dispositivo.'),

    el('div', { class: 'grid two' }, [
      el('div', { class: 'card' }, [
        el('h3', {}, '📤 Exportar'),
        el('p', { class: 'muted small' }, `Personal: ${s.personal.length} · Movimientos: ${s.finanzas.length} · Casos: ${s.casos.length} · Artículos: ${s.normativa.length}`),
        el('button', { class: 'btn gold', onClick: doExport }, 'Descargar respaldo (.json)'),
        el('button', { class: 'btn ghost', onClick: doCopy }, 'Copiar al portapapeles'),
      ]),

      el('div', { class: 'card' }, [
        el('h3', {}, '📥 Importar'),
        el('p', { class: 'muted small' }, 'Reemplaza todos los datos actuales por los del archivo seleccionado.'),
        (() => {
          const file = el('input', { type: 'file', accept: '.json,application/json' });
          file.addEventListener('change', () => {
            const fr = new FileReader();
            fr.onload = () => {
              try { importJSON(fr.result); toast('Datos importados'); render(); }
              catch (e) { toast('Archivo inválido: ' + e.message, 'err'); }
            };
            if (file.files[0]) fr.readAsText(file.files[0]);
          });
          return file;
        })(),
      ]),
    ]),

    el('div', { class: 'card danger-zone' }, [
      el('h3', {}, '⚠ Zona de riesgo'),
      el('p', { class: 'muted small' }, 'Borra todos los datos (personal, finanzas, casos) y restablece la normativa al documento original.'),
      el('button', { class: 'btn danger', onClick: () => confirmDialog(
        'Esto borrará TODO de forma permanente en este navegador. ¿Continuar?',
        () => { resetAll(); toast('Datos restablecidos'); location.hash = '#/dashboard'; render(); }) }, 'Restablecer todo'),
    ]),

    el('p', { class: 'muted xsmall' }, `Facción: ${s.meta.nombreFaccion} · Inicializado ${fmtDate(s.meta.creado)}`),
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
