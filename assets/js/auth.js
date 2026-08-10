// ===========================================================================
//  USMS Control — Autenticación y pantalla de acceso
// ===========================================================================
import { supabase } from './supabase.js';
import { el, toast } from './ui.js';
import { sealImg, icon } from './icons.js';

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
export function onAuthChange(cb) {
  supabase.auth.onAuthStateChange((_e, session) => cb(session));
}
export async function sistemaIniciado() {
  const { data, error } = await supabase.rpc('sistema_iniciado');
  if (error) return true; // ante la duda, mostramos login (no bootstrap).
  return !!data;
}
export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}
export async function signOut() { await supabase.auth.signOut(); }
export async function cambiarPassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}
// Crea un miembro vía Edge Function (bootstrap del Director o alta por admin).
export async function crearMiembro({ email, password, nombre, rol }) {
  const { data, error } = await supabase.functions.invoke('crear-miembro', {
    body: { email, password, nombre, rol },
  });
  if (error) {
    let msg = error.message;
    try { msg = (await error.context.json()).error || msg; } catch { /* noop */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

// --------------------------- Pantalla de acceso ----------------------------
export async function viewLogin(onDone) {
  const iniciado = await sistemaIniciado();

  const email = el('input', { type: 'email', placeholder: 'correo@ejemplo.com', autocomplete: 'username' });
  const nombre = el('input', { type: 'text', placeholder: 'Nombre / identificación' });
  const pass = el('input', { type: 'password', placeholder: 'Contraseña', autocomplete: 'current-password' });
  const btn = el('button', { class: 'btn gold full', onClick: submit }, iniciado ? 'Entrar' : 'Crear Director');

  const field = (label, ic, input) => el('label', { class: 'auth-field' }, [
    el('span', { class: 'auth-lbl' }, label),
    el('div', { class: 'auth-input' }, [icon(ic, 16), input]),
  ]);

  const lema = el('div', { class: 'lv-lema' }, [
    el('span', {}, 'Justicia'), el('span', {}, 'Integridad'), el('span', {}, 'Servicio'),
  ]);
  const features = el('ul', { class: 'lv-features' }, [
    ['personal', 'Personal, tesorería y asuntos internos'],
    ['training', 'Training Division y academias'],
    ['star', 'Ascensos, divisiones y normativa'],
  ].map(([ic, t]) => el('li', {}, [icon(ic, 15), el('span', {}, t)])));

  const host = el('div', { class: 'lv' }, [
    // ---- Panel de marca (izquierda) ----
    el('div', { class: 'lv-brand' }, [
      el('div', { class: 'aurora' }, [el('span', { class: 'a1' }), el('span', { class: 'a2' }), el('span', { class: 'a3' })]),
      el('div', { class: 'lv-brand-inner' }, [
        el('div', { class: 'lv-seal' }, [sealImg(104)]),
        el('div', { class: 'lv-title' }, 'U.S. MARSHALS SERVICE'),
        el('div', { class: 'lv-sub' }, 'San Andreas · Centro de Mando'),
        lema,
        features,
      ]),
      el('div', { class: 'lv-brand-foot' }, 'GTAHUB Roleplay · Uso interno y confidencial'),
    ]),

    // ---- Panel de acceso (derecha) ----
    el('div', { class: 'lv-form' }, [
      el('div', { class: 'lv-form-inner' }, [
        el('div', { class: 'lv-seal-sm' }, [sealImg(56)]),
        el('div', { class: 'lv-kicker' }, iniciado ? 'Acceso autorizado' : 'Primer acceso'),
        el('h1', { class: 'lv-h' }, iniciado ? 'Bienvenido de vuelta' : 'Inicializar sistema'),
        el('p', { class: 'lv-p muted small' }, iniciado
          ? 'Acceso para Directiva (U.S. Marshal) y Supervisory Staff (CDUSM · SDUSM II · SDUSM I).'
          : 'Crea la cuenta del Director de la agencia para inicializar el sistema.'),
        el('div', { class: 'lv-fields' }, [
          field('Correo', 'user', email),
          iniciado ? null : field('Nombre', 'personal', nombre),
          field('Contraseña', 'shield', pass),
          btn,
        ]),
        el('div', { class: 'lv-form-foot muted xsmall' }, 'Uso interno y confidencial · USMS'),
      ]),
    ]),
  ]);
  [email, nombre, pass].forEach((i) => i && i.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); }));

  async function submit() {
    const e = email.value.trim(); const p = pass.value;
    if (!e || !p) return toast('Completa correo y contraseña', 'err');
    btn.disabled = true; btn.textContent = 'Procesando…';
    try {
      if (iniciado) {
        await signIn(e, p);
      } else {
        await crearMiembro({ email: e, password: p, nombre: nombre.value.trim() });
        await signIn(e, p);
      }
      onDone();
    } catch (err) {
      toast(err.message || 'No se pudo acceder', 'err');
      btn.disabled = false; btn.textContent = iniciado ? 'Entrar' : 'Crear Director';
    }
  }

  return host;
}
