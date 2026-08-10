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
      el('h2', {}, 'Miembros y accesos'),
      admin ? el('button', { class: 'btn gold ic', onClick: openCrear }, [icon('plus', 15), 'Generar acceso']) : null,
    ]),

    el('div', { class: 'card info-strip' }, [
      el('span', { class: 'strip-ico' }, [icon('miembros', 22)]),
      el('p', { class: 'muted small' }, 'No hay registro público: los accesos solo se generan aquí (Executive/Director) y se comparten con el miembro. Cadena de mando: Supervisory · Directive · Executive · Director. Las divisiones las asigna solo el Director; el panel de Training Division lo ven los miembros con la división “Training Division” (y la cúpula).'),
    ]),

    el('div', { class: 'card no-pad' }, [
      el('table', { class: 'tbl rows' }, [
        el('thead', {}, el('tr', {}, [
          el('th', {}, 'Miembro'), el('th', {}, 'Correo'), el('th', {}, 'Rol'), el('th', {}, 'Divisiones'), el('th', {}, 'Estado'), el('th', {}, ''),
        ])),
        el('tbody', {}, s.perfiles.map((p) => el('tr', { class: p.activo === false ? 'row-baja' : '' }, [
          el('td', {}, [el('strong', {}, p.nombre || '—'), p.id === yo?.id ? badge(' tú', 'ok') : null]),
          el('td', { class: 'muted' }, p.email),
          el('td', {}, admin && p.id !== yo?.id ? rolSelect(p) : badge(p.rol, 'rango')),
          el('td', {}, [
            el('span', { class: 'chips' }, (p.divisiones || []).length
              ? p.divisiones.map((d) => el('span', { class: 'chip' }, d))
              : [el('span', { class: 'muted small' }, '—')]),
            director ? el('button', { class: 'icon-btn', title: 'Editar divisiones (solo Director)', onClick: () => openDivisiones(p) }, [icon('edit', 14)]) : null,
          ]),
          el('td', {}, p.activo === false ? badge('Baja', 'red') : badge('Activo', 'ok')),
          el('td', { class: 'right nowrap' }, admin && p.id !== yo?.id
            ? [
                el('button', { class: 'icon-btn', title: p.activo === false ? 'Reactivar acceso' : 'Dar de baja (revocar acceso)', onClick: () =>
                    confirmDialog(
                      p.activo === false
                        ? `¿Reactivar el acceso de ${p.nombre || p.email}?`
                        : `¿Dar de baja a ${p.nombre || p.email}? Perderá el acceso al panel hasta que se reactive.`,
                      async () => { try { await updatePerfil(p.id, { activo: p.activo === false }); toast(p.activo === false ? 'Acceso reactivado' : 'Miembro dado de baja'); render(); } catch (e) { toast(e.message, 'err'); } }) },
                  [icon(p.activo === false ? 'undo' : 'logout', 16)]),
                el('button', { class: 'icon-btn', title: 'Eliminar perfil', onClick: () =>
                    confirmDialog(`¿Eliminar el perfil de ${p.nombre || p.email}? (No borra su cuenta de acceso)`,
                      async () => { try { await removePerfil(p.id); toast('Perfil eliminado'); render(); } catch (e) { toast(e.message, 'err'); } }) }, [icon('trash', 16)]),
              ]
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

const DIVISIONES_DISP = ['Training Division', 'IOD', 'SOG', 'UMD', 'AOD', 'SGU', 'RAD', 'OPA', 'Internal Affairs'];

function genPassword() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const r = crypto.getRandomValues(new Uint32Array(8));
  let s = ''; for (const x of r) s += abc[x % abc.length];
  return `USMS-${s.slice(0, 4)}-${s.slice(4, 8)}`;
}
const copiar = (txt, msg) => navigator.clipboard.writeText(txt).then(() => toast(msg)).catch(() => toast('No se pudo copiar', 'err'));

function openCrear() {
  const director = esDirector();
  const f = {};
  f.email = el('input', { type: 'email', placeholder: 'correo@ejemplo.com' });
  f.nombre = el('input', { type: 'text', placeholder: 'Nombre / identificación' });
  f.password = el('input', { type: 'text', value: genPassword() });
  f.rol = el('select', {}, ROLES.map((r) => el('option', { value: r, ...(r === 'Supervisory' ? { selected: '' } : {}) }, r)));

  const divSel = new Set();
  const divChecks = DIVISIONES_DISP.map((d) => {
    const cb = el('input', { type: 'checkbox' });
    cb.addEventListener('change', () => { cb.checked ? divSel.add(d) : divSel.delete(d); });
    return el('label', { class: 'chk' }, [cb, el('span', {}, d)]);
  });

  const body = el('div', { class: 'form-grid' }, [
    field('Correo', f.email),
    field('Nombre', f.nombre),
    el('label', { class: 'field full' }, [el('span', {}, 'Contraseña temporal'),
      el('div', { class: 'row gap' }, [f.password,
        el('button', { class: 'btn ghost small ic', onClick: () => { f.password.value = genPassword(); } }, [icon('undo', 14), 'Regenerar']),
        el('button', { class: 'btn ghost small ic', onClick: () => copiar(f.password.value, 'Contraseña copiada') }, [icon('copy', 14), 'Copiar'])])]),
    field('Rol', f.rol),
    director
      ? el('label', { class: 'field full' }, [el('span', {}, 'Divisiones (opcional — da acceso a paneles como Training Division)'), el('div', { class: 'chk-grid' }, divChecks)])
      : el('p', { class: 'muted xsmall full' }, 'Las divisiones (acceso a Training Division, etc.) las asigna un Director después de crear el acceso.'),
    el('p', { class: 'muted xsmall full' }, 'El miembro entra con este correo y contraseña; podrá cambiarla en “Mi cuenta”. No existe registro público.'),
    el('div', { class: 'row gap end full' }, [
      el('button', { class: 'btn ghost', onClick: closeModal }, 'Cancelar'),
      (f.btn = el('button', { class: 'btn gold', onClick: save }, 'Generar acceso')),
    ]),
  ]);

  async function save() {
    const email = f.email.value.trim(), password = f.password.value, nombre = f.nombre.value.trim();
    if (!email || password.length < 6) return toast('Correo válido y contraseña de 6+ caracteres', 'err');
    f.btn.disabled = true; f.btn.textContent = 'Generando…';
    try {
      await crearMiembro({ email, password, nombre, rol: f.rol.value, divisiones: director ? [...divSel] : undefined });
      await loadAll();
      mostrarCredenciales({ email, password, nombre, rol: f.rol.value, divisiones: director ? [...divSel] : [] });
      render();
    } catch (e) { toast(e.message, 'err'); f.btn.disabled = false; f.btn.textContent = 'Generar acceso'; }
  }
  modal('Generar acceso', body, { wide: true });
}

// Muestra las credenciales generadas para pasárselas al miembro.
function mostrarCredenciales({ email, password, nombre, rol, divisiones }) {
  const base = location.origin + location.pathname.replace(/[^/]*$/, '');
  const texto = `USMS — Acceso al Centro de Mando\nCorreo: ${email}\nContraseña: ${password}\nRol: ${rol}${divisiones && divisiones.length ? `\nDivisiones: ${divisiones.join(', ')}` : ''}\nEntra en: ${base}`;
  const credRow = (k, v) => el('div', { class: 'cred-row' }, [
    el('span', { class: 'cred-k' }, k), el('code', { class: 'cred-v' }, v),
    el('button', { class: 'icon-btn', title: 'Copiar', onClick: () => copiar(v, k + ' copiado') }, [icon('copy', 14)]),
  ]);
  const body = el('div', {}, [
    el('p', { class: 'muted small' }, `Acceso creado para ${nombre || email}. Compártelo con el miembro; podrá cambiar la contraseña en “Mi cuenta”.`),
    el('div', { class: 'cred-box' }, [credRow('Correo', email), credRow('Contraseña', password), credRow('Rol', rol)]),
    el('div', { class: 'row gap end' }, [
      el('button', { class: 'btn ghost ic', onClick: () => copiar(texto, 'Credenciales copiadas') }, [icon('copy', 15), 'Copiar todo']),
      el('button', { class: 'btn gold', onClick: closeModal }, 'Listo'),
    ]),
  ]);
  modal('Acceso generado', body);
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
