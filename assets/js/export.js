// ===========================================================================
//  USMS Control — Exportaciones (CSV de datos + reporte imprimible / PDF)
// ===========================================================================
import { getState, balance } from './store.js';
import { fmtMoney, toast } from './ui.js';

const hoy = () => new Date().toISOString().slice(0, 10);

function descargar(nombre, contenido, mime) {
  const blob = new Blob([contenido], { type: mime + ';charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

const csvCell = (v) => {
  const s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
export function exportarCSV(nombre, encabezados, filas) {
  const lineas = [encabezados.map(csvCell).join(',')].concat(filas.map((f) => f.map(csvCell).join(',')));
  descargar(nombre, '﻿' + lineas.join('\r\n'), 'text/csv');
  toast('CSV exportado');
}

export function exportarPersonalCSV() {
  const s = getState();
  exportarCSV(`usms-personal-${hoy()}.csv`,
    ['Nombre', 'Placa', 'Hash', 'Rango', 'Divisiones', 'Estado', 'Horas/mes', 'Advertencias', 'Strikes', 'Discord', 'Correo', 'Ingreso', 'Última actividad'],
    s.personal.map((p) => [p.nombre, p.placa, p.hash, p.rango, (p.divisiones || []).join(' / '), p.estado,
      p.horasMes, p.advertencias, p.strikes, p.discordId, p.correo, p.fechaIngreso, p.ultimaActividad]));
}

export function exportarFinanzasCSV() {
  const s = getState();
  exportarCSV(`usms-tesoreria-${hoy()}.csv`,
    ['Fecha', 'Tipo', 'Categoría', 'Concepto', 'Monto', 'Responsable'],
    s.finanzas.map((m) => [m.fecha, m.tipo, m.categoria, m.concepto, m.monto, m.responsable]));
}

// --------------------------- Reporte imprimible / PDF ----------------------
const RANK_ORDER = ['DUSMT', 'DUSM I', 'DUSM II', 'DUSM III', 'DUSM IV', 'SDUSM I', 'SDUSM II', 'CDUSM', 'U.S. Marshal'];
const esc = (s = '') => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function tablaHTML(filas) {
  return filas.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="r">${esc(v)}</td></tr>`).join('');
}

export function exportarReportePDF() {
  const s = getState();
  const activos = s.personal.filter((p) => p.estado === 'Activo').length;
  const inactivos = s.personal.length - activos;
  const casosAbiertos = s.casos.filter((c) => c.estado !== 'Resuelto' && c.estado !== 'Archivado').length;
  const strikes = s.personal.reduce((a, p) => a + (+p.strikes || 0), 0);
  const banderas = s.personal.filter((p) => p.estado === 'Activo' && (+p.horasMes || 0) < 40).length;

  const porRango = RANK_ORDER.map((r) => [r, s.personal.filter((p) => p.rango === r).length]).filter(([, n]) => n > 0);
  const divCount = {};
  s.personal.forEach((p) => (p.divisiones || []).forEach((d) => { divCount[d] = (divCount[d] || 0) + 1; }));
  const porDiv = Object.entries(divCount).sort((a, b) => b[1] - a[1]);

  const sealUrl = new URL('assets/img/usms-seal.png', location.href).href;
  const ahora = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC';

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>USMS — Reporte ${hoy()}</title>
<style>
  *{box-sizing:border-box} body{font-family:'Segoe UI',Arial,sans-serif;color:#0b1120;margin:0;padding:32px;background:#fff}
  .head{display:flex;align-items:center;gap:16px;border-bottom:3px solid #0b1120;padding-bottom:14px;margin-bottom:18px}
  .head img{width:74px;height:74px}
  .head h1{margin:0;font-size:20px;letter-spacing:.5px} .head p{margin:2px 0 0;color:#555;font-size:12px}
  h2{font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#7c5e1a;border-bottom:1px solid #ddd;padding-bottom:5px;margin:22px 0 10px}
  .kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
  .kpi{border:1px solid #e2e2e2;border-radius:8px;padding:10px 12px} .kpi b{display:block;font-size:22px} .kpi span{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.5px}
  table{width:100%;border-collapse:collapse;font-size:13px} td{padding:5px 8px;border-bottom:1px solid #eee} td.r{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:24px}
  .foot{margin-top:28px;border-top:1px solid #ddd;padding-top:10px;color:#888;font-size:11px}
  @media print{body{padding:0}}
</style></head><body>
  <div class="head"><img src="${sealUrl}" alt=""><div><h1>U.S. MARSHALS SERVICE — Centro de Mando</h1><p>Reporte ejecutivo · ${esc(ahora)} · ${esc(s.perfil?.nombre || '')} (${esc(s.perfil?.rol || '')})</p></div></div>
  <div class="kpis">
    <div class="kpi"><b>${activos}</b><span>Personal activo</span></div>
    <div class="kpi"><b>${inactivos}</b><span>Inactivos / LOA</span></div>
    <div class="kpi"><b>${fmtMoney(balance())}</b><span>Tesorería</span></div>
    <div class="kpi"><b>${casosAbiertos}</b><span>Casos OPR abiertos</span></div>
    <div class="kpi"><b>${strikes}</b><span>Strikes en plantilla</span></div>
  </div>
  <div class="cols">
    <div><h2>Plantilla por rango</h2><table>${tablaHTML(porRango)}</table></div>
    <div><h2>Por división</h2><table>${tablaHTML(porDiv.length ? porDiv : [['—', 0]])}</table></div>
  </div>
  <h2>Indicadores operativos</h2>
  <table>${tablaHTML([
    ['Mariscales con bajo rendimiento (< 40 h)', banderas],
    ['Artículos de normativa vigentes', s.normativa.length],
    ['Academias de Training Division', s.examenSesiones.length],
    ['Intentos de examen registrados', s.examenIntentos.length],
    ['Movimientos de tesorería', s.finanzas.length],
  ])}</table>
  <div class="foot">Documento interno y confidencial · U.S. Marshals Service · GTAHUB Roleplay · Generado desde el Centro de Mando.</div>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) { toast('Permite las ventanas emergentes para exportar el PDF', 'err'); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch { /* el usuario puede imprimir manualmente */ } }, 500);
  toast('Reporte generado — usa “Guardar como PDF”');
}
