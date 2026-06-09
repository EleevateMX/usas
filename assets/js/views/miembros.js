import { getState, esAdmin, esDirector, updatePerfil, removePerfil, loadAll, miFicha } from '../store.js';
import { crearMiembro, cambiarPassword } from '../auth.js';
import { el, field, modal, closeModal, confirmDialog, toast, badge } from '../ui.js';
import { icon } from '../icons.js';
import { render } from '../router.js';

const ROLES = ['Supervisory', 'Directive', 'Executive', 'Director'];

export function viewMiembros() {
  const s = getState();
  const yo = s.perfil;
  const admin = esAdmin();
  const director = esDirector();

  return el('div', { class: 'view' }, [
    el('div', { class: 'toolbar' }, [
      el('h2', {}, 'Miembros y roles'),
      admin ? el('button', { class: 'btn gold', onClick: openCrear }, '+ Crear miembro') : null,
    ]),

    el('div', { class: 'card info-strip' }, [
      el('span', { class: 'strip-ico' }, [icon('miembros', 22)]),
      el('p', { class: 'muted small' }, 'Cadena de mando: Supervisory · Directive · Executive · Director. Executive/Director crean miembros y cambian roles; las divisiones las asigna solo el Director. La Normativa la edita Directive+. El panel de Training Division solo lo ven los miembros con la división “Training Division” marcada (y la cúpula).'),
    ]),

    el('div', { class: 'card no-pad' }, [
      el('table', { class: 'tbl rows' }, [
        el('thead', {}, el('tr', {}, [
          el('th', {}, 'Miembro'), el('th', {}, 'Correo'), el('th', {}, 'Rol'), el('th', {}, 'Divisiones'), el('th', {}, ''),
        ])),
        el('tbody', {}, s.perfiles.map((p) => el('tr', {}, [
          el('td', {}, [el('strong', {}, p.nombre || '—'), p.id === yo?.id ? badge(' tú', 'ok') : null]),
          el('td', { class: 'muted' }, p.email),
          el('td', {}, admin && p.id !== yo?.id ? rolSelect(p) : badge(p.rol, 'rango')),
          el('td', {}, [
            el('span', { class: 'chips' }, (p.divisiones || []).length
              ? p.divisiones.map((d) => el('span', { class: 'chip' }, d))
              : [el('span', { class: 'muted small' }, '—')]),
            director ? el('button', { class: 'icon-btn', title: 'Editar divisiones (solo Director)', onClick: () => openDivisiones(p) }, [icon('edit', 14)]) : null,
          ]),
          el('td', { class: 'right' }, admin && p.id !== yo?.id
            ? el('button', { class: 'icon-btn', title: 'Eliminar perfil', onClick: () =>
                confirmDialog(`¿Eliminar el perfil de ${p.nombre || p.email}? (No borra su cuenta de acceso)`,
                  async () => { try { await removePerfil(p.id); toast('Perfil eliminado'); render(); } catch (e) { toast(e.message, 'err'); } }) }, [icon('trash', 16)])
            : null),
        ]))),
      ]),
    ]),
  ]);
}

function rolSelect(p) {
  const sel = el('select', {}, ROLES.map((r) =>
    el('option', { value: r, ...(r === p.rol ? { selected: '' } : {}) }, r)));
  sel.addEventListener('change', async () => {
    try { await updatePerfil(p.id, { rol: sel.value }); toast('Rol actualizado'); render(); }
    catch (e) { toast(e.message, 'err'); render(); }
  });
  return sel;
}

function openCrear() {
  const f = {};
  const inp = (k, a = {}) => (f[k] = el('input', a));
  const body = el('div', { class: 'form-grid' }, [
    field('Correo', inp('email', { type: 'email' })),
    field('Nombre', inp('nombre', { type: 'text' })),
    field('Contraseña temporal', inp('password', { type: 'text', placeholder: 'mín. 6 caracteres' })),
    field('Rol', (f.rol = el('select', {}, ROLES.map((r) => el('option', { value: r }, r))))),
    el('div', { class: 'row gap end full' }, [
      el('button', { class: 'btn ghost', onClick: closeModal }, 'Cancelar'),
      el('button', { class: 'btn gold', onClick: save }, 'Crear'),
    ]),
  ]);
  async function save() {
    const email = f.email.value.trim(), password = f.password.value, nombre = f.nombre.value.trim();
    if (!email || password.length < 6) return toast('Correo válido y contraseña de 6+ caracteres', 'err');
    try {
      await crearMiembro({ email, password, nombre, rol: f.rol.value });
      await loadAll();
      toast('Miembro creado'); closeModal(); render();
    } catch (e) { toast(e.message, 'err'); }
  }
  modal('Crear miembro', body, { wide: true });
}

function openDivisiones(p) {
  const inp = el('input', { value: (p.divisiones || []).join(', '), placeholder: 'Ej.: Training Division, SOG' });
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') guardar(); });
  async function guardar() {
    const divs = inp.value.split(',').map((x) => x.trim()).filter(Boolean);
    try { await updatePerfil(p.id, { divisiones: divs }); toast('Divisiones actualizadas'); closeModal(); render(); }
    catch (e) { toast(e.message, 'err'); }
  }
  const body = el('div', {}, [
    el('p', { class: 'muted small' }, `Divisiones de ${p.nombre || p.email}. Incluye “Training Division” (o TD) para darle acceso al panel de exámenes; “SOG”, “IOD”, etc. para sus respectivos paneles.`),
    el('label', { class: 'field' }, [el('span', {}, 'Divisiones (separadas por coma)'), inp]),
    el('div', { class: 'row gap end' }, [
      el('button', { class: 'btn ghost', onClick: closeModal }, 'Cancelar'),
      el('button', { class: 'btn gold', onClick: guardar }, 'Guardar'),
    ]),
  ]);
  modal('Divisiones — ' + (p.nombre || p.email), body);
}

// "Mi cuenta": cambiar contraseña (accesible desde la barra superior).
export function abrirCuenta() {
  const p = getState().perfil;
  if (!p) return;
  const np = el('input', { type: 'password', placeholder: 'Nueva contraseña (6+)' });
  const ficha = miFicha();
  const body = el('div', {}, [
    el('p', { class: 'muted small' }, `${p.nombre || ''} · ${p.email}`),
    el('p', {}, ['Rol actual: ', badge(p.rol, 'rango')]),
    ficha ? el('p', { class: 'muted small' }, ['Ficha vinculada: ', el('strong', {}, ficha.nombre), ` · ${ficha.rango} · placa ${ficha.placa ?? '—'}`])
      : el('p', { class: 'muted small' }, 'Sin ficha de personal vinculada (se enlaza por correo).'),
    el('label', { class: 'field' }, [el('span', {}, 'Cambiar contraseña'), np]),
    el('div', { class: 'row gap end' }, [
      el('button', { class: 'btn ghost', onClick: closeModal }, 'Cerrar'),
      el('button', { class: 'btn gold', onClick: async () => {
        if (np.value.length < 6) return toast('Mínimo 6 caracteres', 'err');
        try { await cambiarPassword(np.value); toast('Contraseña actualizada'); closeModal(); }
        catch (e) { toast(e.message, 'err'); }
      } }, 'Guardar'),
    ]),
  ]);
  modal('Mi cuenta', body);
}
