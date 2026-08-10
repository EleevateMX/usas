import { getState, balance, esTD, esDirectiva } from '../store.js';
import { elegiblesAscenso } from './ascensos.js';
import { el, fmtMoney, fmtDate, badge } from '../ui.js';
import { icon, sealImg } from '../icons.js';
import { nuevoMariscal } from './personal.js';
import { nuevoCaso } from './asuntos.js';
import { nuevoMovimiento } from './finanzas.js';
import { exportarReportePDF } from '../export.js';
import { barrasTesoreria, barrasH, statTile, sparkline } from '../charts.js';

const h3 = (ic, text, extra) => el('div', { class: 'card-head' }, [el('h3', { class: 'h-ico' }, [icon(ic, 17), text]), extra || null]);
const RANK_ORDER = ['DUSMT', 'DUSM I', 'DUSM II', 'DUSM III', 'DUSM IV', 'SDUSM I', 'SDUSM II', 'CDUSM', 'U.S. Marshal'];

export function viewDashboard() {
  const s = getState();
  const activos = s.personal.filter((p) => p.estado === 'Activo').length;
  const inactivos = s.personal.length - activos;
  const casosAbiertos = s.casos.filter((c) => c.estado !== 'Resuelto' && c.estado !== 'Archivado').length;
  const strikesTotal = s.personal.reduce((a, p) => a + (+p.strikes || 0), 0);
  const banderas = s.personal.filter((p) => p.estado === 'Activo' && (+p.horasMes || 0) < 40);

  const hoy = Date.now();
  const inactivos7 = s.personal.filter((p) => p.estado === 'Activo' && p.ultimaActividad)
    .map((p) => ({ p, dias: Math.floor((hoy - new Date(p.ultimaActividad)) / 86400000) }))
    .filter((x) => x.dias >= 7).sort((a, b) => b.dias - a.dias);
  const strikesAltos = s.personal.filter((p) => (+p.strikes || 0) >= 2).length;
  const examAlertas = s.examenIntentos.reduce((a, i) => a + (i.alertas || 0), 0);

  const enviados = s.examenIntentos.filter((i) => i.estado !== 'en_curso');
  const aprobPct = enviados.length ? Math.round((enviados.filter((i) => i.aprobado).length / enviados.length) * 100) : 0;

  // -------- Tesorería por mes (últimos 6) + balance acumulado --------
  const meses = {};
  s.finanzas.forEach((m) => { const k = (m.fecha || '').slice(0, 7); if (!k) return; meses[k] = meses[k] || { ing: 0, egr: 0 }; meses[k][m.tipo === 'ingreso' ? 'ing' : 'egr'] += m.monto; });
  const allK = Object.keys(meses).sort();
  const mk = allK.slice(-6);
  const labels = mk.map(mesCorto);
  const ing = mk.map((k) => meses[k].ing);
  const egr = mk.map((k) => meses[k].egr);
  let acc = allK.slice(0, allK.length - mk.length).reduce((a, k) => a + meses[k].ing - meses[k].egr, 0);
  const balAcum = mk.map((k) => { acc += meses[k].ing - meses[k].egr; return acc; });

  // -------- Distribuciones --------
  const porRango = RANK_ORDER.map((r) => ({ label: r, value: s.personal.filter((p) => p.rango === r).length })).filter((r) => r.value > 0);
  const divCount = {};
  s.personal.forEach((p) => (p.divisiones || []).forEach((d) => { divCount[d] = (divCount[d] || 0) + 1; }));
  const porDiv = Object.entries(divCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }));

  // -------- Centro de alertas --------
  const alertas = [];
  if (casosAbiertos) alertas.push(['asuntos', 'Casos OPR abiertos', casosAbiertos, 'red', '#/asuntos']);
  if (inactivos7.length) alertas.push(['clock', 'Inactivos > 7 días (Art. 13)', inactivos7.length, 'warn', '#/personal']);
  if (strikesAltos) alertas.push(['shield', 'Mariscales con 2+ strikes', strikesAltos, 'red', '#/personal']);
  if (banderas.length) alertas.push(['alert', 'Bajo rendimiento (< 40 h)', banderas.length, 'warn', '#/personal']);
  if (esTD() && examAlertas) alertas.push(['alert', 'Manipulación en exámenes', examAlertas, 'red', '#/training']);
  if (esDirectiva()) { const eleg = elegiblesAscenso(s).filter((x) => x.ev.elegible).length; if (eleg) alertas.push(['star', 'Elegibles para ascenso', eleg, 'gold', '#/ascensos']); }

  // -------- Actividad reciente --------
  const nombreDe = (id) => s.personal.find((p) => p.id === id)?.nombre || 'mariscal';
  const act = [];
  s.sanciones.forEach((x) => act.push({ t: x.fecha, ic: x.tipo === 'strike' ? 'shield' : 'history', txt: `${x.tipo === 'strike' ? 'Strike' : 'Advertencia'} ×${x.cantidad} · ${nombreDe(x.personaId)}`, kind: x.tipo === 'strike' ? 'red' : 'warn' }));
  s.finanzas.forEach((m) => act.push({ t: m.fecha, ic: 'finanzas', txt: `${m.tipo === 'ingreso' ? '+' : '−'}${fmtMoney(m.monto)} · ${m.concepto || m.categoria}`, kind: m.tipo === 'ingreso' ? 'ok' : '' }));
  s.casos.forEach((c) => act.push({ t: c.fecha, ic: 'asuntos', txt: `Caso ${c.folio} · ${c.denunciado || ''} (${c.estado})`, kind: '' }));
  s.examenIntentos.filter((i) => i.estado !== 'en_curso').forEach((i) => act.push({ t: i.fecha, ic: 'training', txt: `Examen · ${i.nombre} ${i.total ? Math.round((i.puntaje / i.total) * 100) : 0}%`, kind: i.aprobado ? 'ok' : 'red' }));
  act.sort((a, b) => new Date(b.t) - new Date(a.t));
  const feed = act.slice(0, 8);

  return el('div', { class: 'view dash' }, [
    // ---------------- Hero ----------------
    el('div', { class: 'dash-hero' }, [
      el('div', { class: 'dash-hero-seal' }, [sealImg(84)]),
      el('div', { class: 'dash-hero-txt' }, [
        el('div', { class: 'hero-kicker' }, 'Centro de Mando'),
        el('h1', { class: 'hero-title' }, s.meta.nombreFaccion),
        el('div', { class: 'hero-lema' }, [el('span', {}, 'Justicia'), el('i', {}, '·'), el('span', {}, 'Integridad'), el('i', {}, '·'), el('span', {}, 'Servicio')]),
      ]),
      el('div', { class: 'dash-hero-meta' }, [
        el('div', { class: 'hm-line' }, [icon('user', 14), `${s.perfil?.nombre || ''}`]),
        el('div', { class: 'hm-line muted' }, [icon('shield', 14), `${s.perfil?.rol || '—'}`]),
        el('div', { class: 'hm-line muted' }, [icon('normativa', 14), `${s.normativa.length} artículos vigentes`]),
      ]),
    ]),

    // ---------------- Acciones rápidas ----------------
    el('div', { class: 'quick' }, [
      el('button', { class: 'btn ghost ic', onClick: nuevoMariscal }, [icon('personal', 16), 'Nuevo mariscal']),
      el('button', { class: 'btn ghost ic', onClick: nuevoCaso }, [icon('asuntos', 16), 'Nuevo caso OPR']),
      el('button', { class: 'btn ghost ic', onClick: nuevoMovimiento }, [icon('finanzas', 16), 'Nuevo movimiento']),
      el('button', { class: 'btn ghost ic', onClick: exportarReportePDF }, [icon('download', 16), 'Exportar PDF']),
    ]),

    // ---------------- KPI stat tiles ----------------
    el('div', { class: 'stats' }, [
      statTile({ label: 'Personal activo', value: activos, sub: `${inactivos} inactivos / LOA`, tone: 'gold', icon: icon('personal', 18) }),
      statTile({ label: 'Tesorería', value: fmtMoney(balance()), sub: `${s.finanzas.length} movimientos`, tone: 'green', icon: icon('finanzas', 18), spark: balAcum.length ? sparkline(balAcum, 'bal') : null }),
      statTile({ label: 'Casos OPR abiertos', value: casosAbiertos, sub: `${s.casos.length} en total`, tone: 'red', icon: icon('asuntos', 18) }),
      statTile({ label: 'Aprobación exámenes', value: aprobPct + '%', sub: `${enviados.length} presentados`, tone: '', icon: icon('award', 18) }),
      statTile({ label: 'Strikes en plantilla', value: strikesTotal, sub: `${strikesAltos} con 2+`, tone: '', icon: icon('shield', 18) }),
    ]),

    // ---------------- Alertas + Actividad ----------------
    el('div', { class: 'grid two' }, [
      el('div', { class: 'card' }, [
        h3('alert', 'Centro de alertas'),
        alertas.length
          ? el('div', { class: 'list' }, alertas.map(([ic, txt, nn, kind, href]) => el('a', { class: 'alert-row', href }, [
              el('span', { class: `alert-ico ${kind}` }, [icon(ic, 16)]), el('span', { class: 'alert-txt' }, txt), badge(String(nn), kind),
            ])))
          : el('p', { class: 'muted' }, 'Todo en orden. Sin alertas pendientes.'),
      ]),
      el('div', { class: 'card' }, [
        h3('clock', 'Actividad reciente', el('span', { class: 'muted small' }, 'hora UTC')),
        feed.length
          ? el('div', { class: 'feed' }, feed.map((a) => el('div', { class: 'feed-row' }, [
              el('span', { class: `feed-ico ${a.kind}` }, [icon(a.ic, 14)]), el('span', { class: 'feed-txt' }, a.txt), el('span', { class: 'feed-time' }, fmtDate(a.t)),
            ])))
          : el('p', { class: 'muted' }, 'Sin actividad registrada.'),
      ]),
    ]),

    // ---------------- Tesorería (gráfica) ----------------
    el('div', { class: 'card' }, [
      h3('finanzas', 'Tesorería · últimos meses', el('span', { class: 'muted small' }, mk.length ? `Balance actual ${fmtMoney(balance())}` : '')),
      mk.length ? barrasTesoreria({ labels, ing, egr }) : el('p', { class: 'muted' }, 'Aún no hay movimientos de tesorería.'),
    ]),

    // ---------------- Distribuciones ----------------
    el('div', { class: 'grid two' }, [
      el('div', { class: 'card' }, [
        h3('award', 'Plantilla por rango', el('span', { class: 'muted small' }, `${s.personal.length} en total`)),
        porRango.length ? barrasH(porRango) : el('p', { class: 'muted' }, 'Sin rangos asignados.'),
      ]),
      el('div', { class: 'card' }, [
        h3('layers', 'Por división'),
        porDiv.length ? barrasH(porDiv) : el('p', { class: 'muted' }, 'Sin divisiones registradas en el personal.'),
      ]),
    ]),

    // ---------------- Inactividad ----------------
    el('div', { class: 'card' }, [
      h3('clock', 'Inactividad — Art. 13', el('span', { class: 'muted small' }, '> 7 días')),
      inactivos7.length
        ? el('div', { class: 'list' }, inactivos7.slice(0, 8).map(({ p, dias }) => el('div', { class: 'list-item' }, [
            el('div', {}, [el('strong', {}, p.nombre), el('span', { class: 'muted small' }, ` · placa ${p.placa ?? '—'}`)]), badge(`${dias} días`, 'red'),
          ])))
        : el('p', { class: 'muted' }, 'Sin inactividades > 7 días registradas.'),
    ]),
  ]);
}

function mesCorto(k) {
  try { return new Date(k + '-01T00:00:00Z').toLocaleDateString('es-MX', { month: 'short', timeZone: 'UTC' }); }
  catch { return k; }
}
