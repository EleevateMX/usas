import { getState, addMovimiento, updateMovimiento, removeMovimiento, balance } from '../store.js';
import { el, field, modal, closeModal, confirmDialog, toast, badge, fmtMoney, fmtDate } from '../ui.js';
import { icon } from '../icons.js';
import { render } from '../router.js';
import { exportarFinanzasCSV } from '../export.js';
import { barrasTesoreria } from '../charts.js';

export const nuevoMovimiento = () => openForm();
const CATEGORIAS = ['General', 'Salarios', 'Unidades', 'Armamento', 'Multas', 'Operativos', 'Capacitaciones', 'Donaciones', 'Mantenimiento'];

export function viewFinanzas() {
  const s = getState();
  const movs = [...s.finanzas].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const ingresos = movs.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + +m.monto, 0);
  const egresos = movs.filter((m) => m.tipo === 'egreso').reduce((a, m) => a + +m.monto, 0);

  // Resumen por categoría (egresos).
  const porCat = {};
  movs.forEach((m) => {
    porCat[m.categoria] = porCat[m.categoria] || { ing: 0, egr: 0 };
    porCat[m.categoria][m.tipo === 'ingreso' ? 'ing' : 'egr'] += +m.monto;
  });

  // Serie mensual (últimos 6 meses) para la gráfica de ingresos/egresos.
  const meses = {};
  movs.forEach((m) => { const k = (m.fecha || '').slice(0, 7); if (!k) return; meses[k] = meses[k] || { ing: 0, egr: 0 }; meses[k][m.tipo === 'ingreso' ? 'ing' : 'egr'] += +m.monto; });
  const mk = Object.keys(meses).sort().slice(-6);
  const serie = { labels: mk.map(mesCorto), ing: mk.map((k) => meses[k].ing), egr: mk.map((k) => meses[k].egr) };

  return el('div', { class: 'view' }, [
    el('div', { class: 'toolbar' }, [
      el('h2', {}, 'Tesorería — Ingresos / Egresos'),
      el('div', { class: 'row gap' }, [
        el('button', { class: 'btn ghost ic', title: 'Exportar a CSV', onClick: exportarFinanzasCSV }, [icon('download', 15), 'CSV']),
        el('button', { class: 'btn gold', onClick: () => openForm() }, '+ Nuevo movimiento'),
      ]),
    ]),

    el('div', { class: 'grid kpis' }, [
      el('div', { class: 'card kpi green' }, [el('div', { class: 'kpi-val' }, fmtMoney(ingresos)), el('div', { class: 'kpi-label' }, 'Ingresos')]),
      el('div', { class: 'card kpi red' }, [el('div', { class: 'kpi-val' }, fmtMoney(egresos)), el('div', { class: 'kpi-label' }, 'Egresos')]),
      el('div', { class: 'card kpi gold' }, [el('div', { class: 'kpi-val' }, fmtMoney(balance())), el('div', { class: 'kpi-label' }, 'Balance actual')]),
    ]),

    el('div', { class: 'card' }, [
      el('div', { class: 'card-head' }, [
        el('h3', { class: 'h-ico' }, [icon('finanzas', 17), 'Ingresos vs. egresos · últimos meses']),
        el('span', { class: 'muted small' }, mk.length ? `Balance actual ${fmtMoney(balance())}` : ''),
      ]),
      mk.length ? barrasTesoreria(serie) : el('p', { class: 'muted' }, 'Aún no hay movimientos para graficar.'),
    ]),

    el('div', { class: 'grid two' }, [
      el('div', { class: 'card no-pad' }, [
        movs.length
          ? el('table', { class: 'tbl rows' }, [
              el('thead', {}, el('tr', {}, [
                el('th', {}, 'Fecha'), el('th', {}, 'Concepto'), el('th', {}, 'Categoría'),
                el('th', {}, 'Responsable'), el('th', { class: 'right' }, 'Monto'), el('th', {}, ''),
              ])),
              el('tbody', {}, movs.map((m) => el('tr', {}, [
                el('td', {}, fmtDate(m.fecha)),
                el('td', {}, m.concepto || '—'),
                el('td', {}, badge(m.categoria, 'rango')),
                el('td', {}, m.responsable || '—'),
                el('td', { class: 'right ' + (m.tipo === 'ingreso' ? 'green-txt' : 'danger-txt') },
                  (m.tipo === 'ingreso' ? '+' : '−') + fmtMoney(m.monto)),
                el('td', { class: 'right nowrap' }, [
                  el('button', { class: 'icon-btn', title: 'Editar', onClick: () => openForm(m) }, [icon('edit', 16)]),
                  el('button', { class: 'icon-btn', title: 'Eliminar', onClick: () =>
                    confirmDialog('¿Eliminar este movimiento?', async () => { try { await removeMovimiento(m.id); toast('Movimiento eliminado'); render(); } catch (e) { toast(e.message, 'err'); } }) }, [icon('trash', 16)]),
                ]),
              ]))),
            ])
          : el('div', { class: 'empty' }, 'Sin movimientos. Registra el primer ingreso o egreso.'),
      ]),

      el('div', { class: 'card' }, [
        el('div', { class: 'card-head' }, [el('h3', {}, 'Resumen por categoría'), null]),
        Object.keys(porCat).length
          ? el('div', { class: 'list' }, Object.entries(porCat)
              .sort((a, b) => (b[1].egr + b[1].ing) - (a[1].egr + a[1].ing))
              .map(([cat, v]) => el('div', { class: 'cat-row' }, [
                el('div', { class: 'row between' }, [el('strong', {}, cat),
                  el('span', { class: 'mono' }, fmtMoney(v.ing - v.egr))]),
                el('div', { class: 'bar' }, [
                  el('div', { class: 'bar-ing', style: `width:${pct(v.ing, ingresos)}%` }),
                  el('div', { class: 'bar-egr', style: `width:${pct(v.egr, egresos)}%` }),
                ]),
                el('div', { class: 'muted small' }, `+${fmtMoney(v.ing)} · −${fmtMoney(v.egr)}`),
              ])))
          : el('p', { class: 'muted' }, 'Aún no hay datos.'),
      ]),
    ]),
  ]);
}

const pct = (v, total) => (total > 0 ? Math.round((v / total) * 100) : 0);
function mesCorto(k) {
  try { return new Date(k + '-01T00:00:00Z').toLocaleDateString('es-MX', { month: 'short', timeZone: 'UTC' }); }
  catch { return k; }
}

function openForm(m = null) {
  const edit = !!m; const d = m || {}; const f = {};
  const inp = (k, v, a = {}) => (f[k] = el('input', { value: v ?? '', ...a }));
  const sel = (k, v, opts) => (f[k] = el('select', {}, opts.map((o) =>
    el('option', { value: o, ...(o === v ? { selected: '' } : {}) }, o))));

  const body = el('div', { class: 'form-grid' }, [
    field('Tipo', sel('tipo', d.tipo || 'ingreso', ['ingreso', 'egreso'])),
    field('Monto', inp('monto', d.monto ?? '', { type: 'number', min: '0', step: '1' })),
    field('Fecha', inp('fecha', d.fecha || new Date().toISOString().slice(0, 10), { type: 'date' })),
    field('Categoría', sel('categoria', d.categoria || 'General', CATEGORIAS)),
    el('label', { class: 'field full' }, [el('span', {}, 'Concepto'), inp('concepto', d.concepto)]),
    field('Responsable', inp('responsable', d.responsable)),
    el('div', { class: 'row gap end full' }, [
      el('button', { class: 'btn ghost', onClick: closeModal }, 'Cancelar'),
      el('button', { class: 'btn gold', onClick: save }, edit ? 'Guardar' : 'Registrar'),
    ]),
  ]);

  async function save() {
    const data = {
      tipo: f.tipo.value, monto: +f.monto.value || 0, fecha: f.fecha.value,
      categoria: f.categoria.value, concepto: f.concepto.value.trim(),
      responsable: f.responsable.value.trim(),
    };
    if (data.monto <= 0) return toast('Ingresa un monto válido', 'err');
    try {
      if (edit) { await updateMovimiento(m.id, data); toast('Movimiento actualizado'); }
      else { await addMovimiento(data); toast('Movimiento registrado'); }
      closeModal(); render();
    } catch (e) { toast(e.message, 'err'); }
  }

  modal(edit ? 'Editar movimiento' : 'Nuevo movimiento', body, { wide: true });
}
