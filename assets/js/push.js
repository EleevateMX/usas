// ===========================================================================
//  USMS Control — Notificaciones push (Web Push / VAPID)
//  Suscribe el navegador del miembro para recibir avisos de casos OPR y
//  alertas de manipulación de exámenes, aunque la app esté cerrada.
// ===========================================================================
import { supabase } from './supabase.js';
import { getState } from './store.js';

const VAPID_PUBLIC = 'BFlrN2aFP9kp0bh9UpTJgKgyCFKG84XAt7G2aQq_k-u6gjwkYwlmvy7EpFsAFQCiXs2qJ_dgBzSN2yN2fVZBN2c';

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSoportado() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function pushEstado() {
  if (!pushSoportado()) return 'no-soportado';
  if (Notification.permission === 'denied') return 'bloqueado';
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub ? 'activo' : 'inactivo';
  } catch { return 'inactivo'; }
}

export async function activarPush() {
  if (!pushSoportado()) throw new Error('Tu navegador no soporta notificaciones push.');
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') throw new Error('Permiso de notificaciones denegado.');
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    });
  }
  const perfil = getState().perfil;
  if (!perfil) throw new Error('Sesión no disponible.');
  const j = sub.toJSON();
  // delete-then-insert para no depender de una política de UPDATE en RLS.
  await supabase.from('push_suscripciones').delete().eq('endpoint', sub.endpoint);
  const { error } = await supabase.from('push_suscripciones').insert({
    perfil_id: perfil.id, endpoint: sub.endpoint,
    p256dh: j.keys.p256dh, auth: j.keys.auth, user_agent: navigator.userAgent,
  });
  if (error) throw error;
  return 'activo';
}

export async function desactivarPush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await supabase.from('push_suscripciones').delete().eq('endpoint', sub.endpoint);
      await sub.unsubscribe();
    }
  } catch { /* noop */ }
  return 'inactivo';
}
