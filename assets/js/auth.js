// ===========================================================================
//  USMS Control — Autenticación y pantalla de acceso
// ===========================================================================
import { supabase } from './supabase.js';
import { el, toast } from './ui.js';

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
  const host = el('div', { class: 'auth-wrap' });

  const card = el('div', { class: 'auth-card' }, [
    el('div', { class: 'auth-brand' }, [
      el('div', { class: 'badge-star big' }, '★'),
      el('div', {}, [
        el('div', { class: 'brand-title' }, 'U.S. MARSHALS'),
        el('div', { class: 'brand-sub' }, 'Service · Centro de Mando'),
      ]),
    ]),
    el('p', { class: 'muted small center' }, iniciado
      ? 'Acceso restringido al liderazgo. Inicia sesión con tu cuenta.'
      : 'Primer acceso: crea la cuenta del Director de la agencia.'),
  ]);

  const email = el('input', { type: 'email', placeholder: 'correo@ejemplo.com', autocomplete: 'username' });
  const nombre = el('input', { type: 'text', placeholder: 'Nombre / identificación' });
  const pass = el('input', { type: 'password', placeholder: 'Contraseña', autocomplete: 'current-password' });
  const btn = el('button', { class: 'btn gold full', onClick: submit }, iniciado ? 'Entrar' : 'Crear Director');

  const form = el('div', { class: 'auth-form' }, [
    el('label', { class: 'field' }, [el('span', {}, 'Correo'), email]),
    iniciado ? null : el('label', { class: 'field' }, [el('span', {}, 'Nombre'), nombre]),
    el('label', { class: 'field' }, [el('span', {}, 'Contraseña'), pass]),
    btn,
  ]);
  card.append(form);
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

  host.append(card);
  return host;
}
