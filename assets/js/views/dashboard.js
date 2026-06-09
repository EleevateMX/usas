import { getState, balance, esTD, esDirectiva } from '../store.js';
import { elegiblesAscenso } from './ascensos.js';
import { el, fmtMoney, fmtDate, badge } from '../ui.js';
import { icon, sealImg } from '../icons.js';
import { nuevoMariscal } from './personal.js';
import { nuevoCaso } from './asuntos.js';
import { nuevoMovimiento } from './finanzas.js';
import { exportarReportePDF } from '../export.js';

const h3 = (ic, text) => el('h3', { class: 'h-ico' }, [icon(ic, 17), text]);
const go = (hash) => () => { location.hash = hash; };

export function viewDashboard() {
  const s = getState();
  const activos = s.personal.filter((p) => p.estado === 'Activo').length;
  const inactivos = s.personal.filter((p) => p.estado !== 'Activo').length;
  const casosAbiertos = s.casos.filter((c) => c.estado !== 'Resuelto' && c.estado !== 'Archivado').length;
  const strikesTotal = s.personal.reduce((a, p) => a + (+p.strikes || 0), 0);

  const banderas = s.personal.filter((p) => p.estado === 'Activo' && (+p.horasMes || 0) < 40);
  const hoy = Date.now();
  const inactivos7 = s.personal
    .filter((p) => p.estado === 'Activo' && p.ultimaActividad)
    .map((p) => ({ p, dias: Math.floor((hoy - new Date(p.ultimaActividad)) / 86400000) }))
    .filter((x) => x.dias >= 7).sort((a, b) => b.dias - a.dias);
  const strikesAltos = s.personal.filter((p) => (+p.strikes || 0) >= 2).length;
  const examAlertas = s.examenIntentos.reduce((a, i) => a + (i.alertas || 0), 0);

  // -------- Centro de alertas --------
  const alertas = [];
  if (casosAbiertos) alertas.push(['asuntos', 'Casos OPR abiertos', casosAbiertos, 'red', '#/asuntos']);
  if (inactivos7.length) alertas.push(['clock', 'Inactivos > 7 días (Art. 13)', inactivos7.length, 'warn', '#/personal']);
  if (strikesAltos) alertas.push(['shield', 'Mariscales con 2+ strikes', strikesAltos, 'red', '#/personal']);
  if (banderas.length) alertas.push(['alert', 'Bajo rendimiento (< 40 h)', banderas.length, 'warn', '#/personal']);
  if (esTD() && examAlertas) alertas.push(['alert', 'Alertas de manipulación en exámenes', examAlertas, 'red', '#/training']);
  if (esDirectiva()) {
    const elegibles = elegiblesAscenso(s).filter((x) => x.ev.elegible).length;
    if (elegibles) alertas.push(['star', 'Elegibles para ascenso', elegibles, 'gold', '#/ascensos']);
  }

  // -------- Actividad reciente --------
  const nombreDe = (id) => s.personal.find((p) => p.id === id)?.nombre || 'mariscal';
  const act = [];
  s.sanciones.forEach((x) => act.push({ t: x.fecha, ic: x.tipo === 'strike' ? 'shield' : 'history',
    txt: `${x.tipo === 'strike' ? 'Strike' : 'Advertencia'} ×${x.cantidad} · ${nombreDe(x.personaId)}`, kind: x.tipo === 'strike' ? 'red' : 'warn' }));
  s.finanzas.forEach((m) => act.push({ t: m.fecha, ic: 'finanzas',
    txt: `${m.tipo === 'ingreso' ? '+' : '−'}${fmtMoney(m.monto)} · ${m.concepto || m.categoria}`, kind: m.tipo === 'ingreso' ? 'ok' : '' }));
  s.casos.forEach((c) => act.push({ t: c.fecha, ic: 'asuntos', txt: `Caso ${c.folio} · ${c.denunciado || ''} (${c.estado})`, kind: '' }));
  s.examenIntentos.filter((i) => i.estado !== 'en_curso').forEach((i) => act.push({ t: i.fecha, ic: 'training',
    txt: `Examen · ${i.nombre} ${i.total ? Math.round((i.puntaje / i.total) * 100) : 0}%`, kind: i.aprobado ? 'ok' : 'red' }));
  act.sort((a, b) => new Date(b.t) - new Date(a.t));
  const feed = act.slice(0, 9);

  // -------- Tesorería por mes --------
  const meses = {};
  s.finanzas.forEach((m) => { const k = (m.fecha || '').slice(0, 7); if (!k) return; meses[k] = meses[k] || { ing: 0, egr: 0 }; meses[k][m.tipo === 'ingreso' ? 'ing' : 'egr'] += m.monto; });
  const mk = Object.keys(meses).sort().slice(-6);
  const maxMes = Math.max(1, ...mk.flatMap((k) => [meses[k].ing, meses[k].egr]));

  // -------- Distribución --------
  const RANK_ORDER = ['DUSMT', 'DUSM I', 'DUSM II', 'DUSM III', 'DUSM IV', 'SDUSM I', 'SDUSM II', 'CDUSM', 'U.S. Marshal'];
  const porRango = RANK_ORDER.map((r) => [r, s.personal.filter((p) => p.rango === r).length]).filter(([, n]) => n > 0);
  const maxRango = Math.max(1, ...porRango.map(([, n]) => n));
  const divCount = {};
  s.personal.forEach((p) => (p.divisiones || []).forEach((d) => { divCount[d] = (divCount[d] || 0) + 1; }));
  const porDiv = Object.entries(divCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxDiv = Math.max(1, ...porDiv.map(([, n]) => n));
  const distRow = (label, n, max) => el('div', { class: 'dist-row' }, [
    el('div', { class: 'dist-lbl' }, label),
    el('div', { class: 'dist-track' }, [el('div', { class: 'dist-fill', style: `width:${Math.round((n / max) * 100)}%` })]),
    el('div', { class: 'dist-n' }, String(n)),
  ]);

  const kpi = (label, value, sub, cls, ic) => el('div', { class: `card kpi ${cls}` }, [
    el('span', { class: 'kpi-ico' }, [icon(ic, 26)]),
    el('div', { class: 'kpi-val' }, String(value)),
    el('div', { class: 'kpi-label' }, label),
    sub ? el('div', { class: 'kpi-sub' }, sub) : null,
  ]);

  return el('div', { class: 'view' }, [
    // Hero
    el('div', { class: 'hero' }, [
      el('div', { class: 'hero-seal' }, [sealImg(96)]),
      el('div', { class: 'hero-txt' }, [
        el('div', { class: 'hero-kicker' }, 'Centro de Mando'),
        el('h1', { class: 'hero-title' }, s.meta.nombreFaccion),
        el('div', { class: 'hero-motto' }, [el('span', {}, 'Justicia'), el('span', { class: 'sep' }, '·'),
          el('span', {}, 'Integridad'), el('span', { class: 'sep' }, '·'), el('span', {}, 'Servicio')]),
        el('div', { class: 'hero-meta' }, `${s.perfil?.nombre || ''} · ${s.perfil?.rol || '—'} · ${s.normativa.length} artículos vigentes`),
      ]),
    ]),

    // Acciones rápidas
    el('div', { class: 'quick' }, [
      el('button', { class: 'btn ghost ic', onClick: nuevoMariscal }, [icon('personal', 16), 'Nuevo mariscal']),
      el('button', { class: 'btn ghost ic', onClick: nuevoCaso }, [icon('asuntos', 16), 'Nuevo caso OPR']),
      el('button', { class: 'btn ghost ic', onClick: nuevoMovimiento }, [icon('finanzas', 16), 'Nuevo movimiento']),
      el('button', { class: 'btn ghost ic', onClick: exportarReportePDF }, [icon('download', 16), 'Exportar PDF']),
    ]),

    el('div', { class: 'grid kpis' }, [
      kpi('Personal activo', activos, `${inactivos} inactivos / LOA`, 'gold', 'personal'),
      kpi('Tesorería', fmtMoney(balance()), `${s.finanzas.length} movimientos`, 'green', 'finanzas'),
      kpi('Casos OPR abiertos', casosAbiertos, `${s.casos.length} en total`, 'red', 'asuntos'),
      kpi('Strikes en plantilla', strikesTotal, `${s.normativa.length} artículos vigentes`, '', 'normativa'),
    ]),

    el('div', { class: 'grid two' }, [
      // Centro de alertas
      el('div', { class: 'card' }, [
        el('div', { class: 'card-head' }, [h3('alert', 'Centro de alertas'), null]),
        alertas.length
          ? el('div', { class: 'list' }, alertas.map(([ic, txt, n, kind, href]) =>
              el('a', { class: 'alert-row', href }, [
                el('span', { class: `alert-ico ${kind}` }, [icon(ic, 16)]),
                el('span', { class: 'alert-txt' }, txt),
                badge(String(n), kind),
              ])))
          : el('p', { class: 'muted' }, 'Todo en orden. Sin alertas pendientes.'),
      ]),
      // Actividad reciente
      el('div', { class: 'card' }, [
        el('div', { class: 'card-head' }, [h3('clock', 'Actividad reciente'), el('span', { class: 'muted small' }, 'hora UTC')]),
        feed.length
          ? el('div', { class: 'feed' }, feed.map((a) => el('div', { class: 'feed-row' }, [
              el('span', { class: `feed-ico ${a.kind}` }, [icon(a.ic, 14)]),
              el('span', { class: 'feed-txt' }, a.txt),
              el('span', { class: 'feed-time' }, fmtDate(a.t)),
            ])))
          : el('p', { class: 'muted' }, 'Sin actividad registrada.'),
      ]),
    ]),

    el('div', { class: 'grid two' }, [
      // Tesorería por mes
      el('div', { class: 'card' }, [
        el('div', { class: 'card-head' }, [h3('finanzas', 'Tesorería · últimos meses'),
          el('span', { class: 'fin-legend' }, [el('span', { class: 'lg ing' }, 'Ingresos'), el('span', { class: 'lg egr' }, 'Egresos')])]),
        mk.length
          ? el('div', { class: 'fin-chart' }, mk.map((k) => el('div', { class: 'fin-col' }, [
              el('div', { class: 'fin-bars' }, [
                el('div', { class: 'fin-bar ing', style: `height:${Math.round((meses[k].ing / maxMes) * 100)}%`, title: 'Ingresos ' + fmtMoney(meses[k].ing) }),
                el('div', { class: 'fin-bar egr', style: `height:${Math.round((meses[k].egr / maxMes) * 100)}%`, title: 'Egresos ' + fmtMoney(meses[k].egr) }),
              ]),
              el('div', { class: 'fin-lbl' }, mesCorto(k)),
            ])))
          : el('p', { class: 'muted' }, 'Aún no hay movimientos de tesorería.'),
      ]),
      // Plantilla por rango
      el('div', { class: 'card' }, [
        el('div', { class: 'card-head' }, [h3('award', 'Plantilla por rango'), el('span', { class: 'muted small' }, `${s.personal.length} en total`)]),
        porRango.length
          ? el('div', { class: 'dist' }, porRango.map(([r, n]) => distRow(r, n, maxRango)))
          : el('p', { class: 'muted' }, 'Sin rangos asignados.'),
      ]),
    ]),

    el('div', { class: 'grid two' }, [
      // Inactividad
      el('div', { class: 'card' }, [
        el('div', { class: 'card-head' }, [h3('clock', 'Inactividad — Art. 13'), el('span', { class: 'muted small' }, '> 7 días')]),
        inactivos7.length
          ? el('div', { class: 'list' }, inactivos7.slice(0, 7).map(({ p, dias }) =>
              el('div', { class: 'list-item' }, [
                el('div', {}, [el('strong', {}, p.nombre), el('span', { class: 'muted small' }, ` · placa ${p.placa ?? '—'}`)]),
                badge(`${dias} días`, 'red'),
              ])))
          : el('p', { class: 'muted' }, 'Sin inactividades > 7 días registradas.'),
      ]),
      // Por división
      el('div', { class: 'card' }, [
        el('div', { class: 'card-head' }, [h3('layers', 'Por división'), null]),
        porDiv.length
          ? el('div', { class: 'dist' }, porDiv.map(([d, n]) => distRow(d, n, maxDiv)))
          : el('p', { class: 'muted' }, 'Sin divisiones registradas en el personal.'),
      ]),
    ]),
  ]);
}

function mesCorto(k) {
  try { return new Date(k + '-01T00:00:00Z').toLocaleDateString('es-MX', { month: 'short', timeZone: 'UTC' }); }
  catch { return k; }
}
