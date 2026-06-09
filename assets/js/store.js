// ===========================================================================
//  USMS Control — Capa de datos (Supabase + caché en memoria)
//  ---------------------------------------------------------------------------
//  Carga todo el estado desde Supabase a una caché local para que las vistas
//  lo lean de forma síncrona. Las mutaciones escriben en la base y refrescan.
// ===========================================================================
import { supabase } from './supabase.js';

const VENCE_DIAS = 90; // Art. 20: advertencias salen de la cuenta a los ~3 meses.

let state = {
  session: null,
  perfil: null,
  personal: [],
  finanzas: [],
  casos: [],
  normativa: [],
  sanciones: [],
  perfiles: [],
  examenPreguntas: [],
  examenIntentos: [],
  examenSesiones: [],
  meta: { nombreFaccion: 'U.S. Marshals Service' },
};

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function notify() { listeners.forEach((fn) => fn(state)); }
export function getState() { return state; }

// ------------------------------- Mapeos ------------------------------------
const mapPersona = (r) => ({
  id: r.id, nombre: r.nombre, numeroEmpleado: r.numero_empleado || '',
  placa: r.placa ?? null, hash: r.hash || '', telefono: r.telefono || '',
  discordId: r.discord_id || '', correo: r.correo || '',
  rango: r.rango, divisiones: r.divisiones || [], estado: r.estado,
  fechaIngreso: r.fecha_ingreso, fechaSalida: r.fecha_salida,
  ultimaActividad: r.ultima_actividad, horasMes: Number(r.horas_mes) || 0,
  equipo: r.equipo || {}, expedientes: r.expedientes || '',
  notas: r.notas || '', advertencias: 0, strikes: 0,
  advertenciasHist: 0, strikesHist: 0,
});
const mapMov = (r) => ({
  id: r.id, fecha: r.fecha, tipo: r.tipo, categoria: r.categoria,
  concepto: r.concepto || '', monto: Number(r.monto) || 0, responsable: r.responsable || '',
});
const mapArt = (r) => ({
  id: r.id, libro: r.libro, capitulo: r.capitulo, titulo: r.titulo,
  sevMin: r.sev_min, sevMax: r.sev_max, tags: r.tags || [],
  resumen: r.resumen || '', activo: r.activo,
});
const mapCaso = (r) => ({
  id: r.id, folio: r.folio, fecha: r.fecha,
  denunciadoId: r.denunciado_id, denunciado: r.denunciado || '',
  denunciante: r.denunciante || '', descripcion: r.descripcion || '',
  estado: r.estado, resolucion: r.resolucion || '',
  sancionAplicada: r.sancion_aplicada || '',
  articulos: (r.caso_articulos || []).map((x) => x.articulo_id),
});
const mapSancion = (r) => ({
  id: r.id, personaId: r.persona_id, casoId: r.caso_id, fecha: r.fecha,
  tipo: r.tipo, cantidad: Number(r.cantidad) || 0, articuloId: r.articulo_id,
  motivo: r.motivo || '', vencida: r.vencida,
});
const mapPerfil = (r) => ({
  id: r.id, email: r.email, nombre: r.nombre, rol: r.rol, activo: r.activo,
});
const mapPregunta = (r) => ({
  id: r.id, categoria: r.categoria, dificultad: r.dificultad, enunciado: r.enunciado,
  opciones: r.opciones || [], correcta: r.correcta, activa: r.activa,
});
const mapIntento = (r) => ({
  id: r.id, nombre: r.nombre, discord: r.discord, fecha: r.created_at,
  puntaje: Number(r.puntaje) || 0, total: r.total || 0, aprobado: r.aprobado,
  estado: r.estado, duracionSeg: r.duracion_seg, sesionId: r.sesion_id,
});
const mapSesion = (r) => ({
  id: r.id, slug: r.slug, nombre: r.nombre, tipo: r.tipo,
  faciles: r.faciles, medias: r.medias, dificiles: r.dificiles,
  duracionMin: r.duracion_min, activa: r.activa, fecha: r.created_at,
});

// Recalcula advertencias/strikes vigentes de cada persona desde el historial.
function computeContadores() {
  const corte = new Date(Date.now() - VENCE_DIAS * 86400000);
  for (const p of state.personal) {
    const ss = state.sanciones.filter((s) => s.personaId === p.id);
    p.advertenciasHist = ss.filter((s) => s.tipo === 'advertencia').reduce((a, s) => a + s.cantidad, 0);
    p.strikesHist = ss.filter((s) => s.tipo === 'strike').reduce((a, s) => a + s.cantidad, 0);
    p.advertencias = ss.filter((s) => s.tipo === 'advertencia' && !s.vencida && new Date(s.fecha) >= corte)
      .reduce((a, s) => a + s.cantidad, 0);
    p.strikes = ss.filter((s) => s.tipo === 'strike' && !s.vencida).reduce((a, s) => a + s.cantidad, 0);
  }
}

// ------------------------------ Carga total --------------------------------
export async function loadAll() {
  const [personal, finanzas, normativa, casos, sanciones, perfiles, preguntas, intentos, sesiones] = await Promise.all([
    supabase.from('personal').select('*').order('nombre'),
    supabase.from('finanzas').select('*').order('fecha', { ascending: false }),
    supabase.from('normativa').select('*').order('orden'),
    supabase.from('casos').select('*, caso_articulos(articulo_id)').order('created_at', { ascending: false }),
    supabase.from('sanciones').select('*').order('fecha', { ascending: false }),
    supabase.from('perfiles').select('*').order('created_at'),
    supabase.from('examen_preguntas').select('*').order('categoria'),
    supabase.from('examen_intentos').select('id, nombre, discord, created_at, puntaje, total, aprobado, estado, duracion_seg, sesion_id').order('created_at', { ascending: false }),
    supabase.from('examen_sesiones').select('*').order('created_at', { ascending: false }),
  ]);
  state.personal = (personal.data || []).map(mapPersona);
  state.finanzas = (finanzas.data || []).map(mapMov);
  state.normativa = (normativa.data || []).map(mapArt);
  state.casos = (casos.data || []).map(mapCaso);
  state.sanciones = (sanciones.data || []).map(mapSancion);
  state.perfiles = (perfiles.data || []).map(mapPerfil);
  state.examenPreguntas = (preguntas.data || []).map(mapPregunta);
  state.examenIntentos = (intentos.data || []).map(mapIntento);
  state.examenSesiones = (sesiones.data || []).map(mapSesion);
  computeContadores();
  notify();
}

// ------------------------------ Sesión / perfil ----------------------------
export function setSession(session) { state.session = session; }
export async function loadPerfil() {
  if (!state.session) { state.perfil = null; return; }
  const { data } = await supabase.from('perfiles').select('*').eq('id', state.session.user.id).single();
  state.perfil = data ? mapPerfil(data) : null;
}
export const rolActual = () => state.perfil?.rol || null;
export const esDirectiva = () => ['Directive', 'Executive', 'Director'].includes(rolActual());
export const esAdmin = () => ['Executive', 'Director'].includes(rolActual());

// ------------------------------- PERSONAL ----------------------------------
function personaToRow(p) {
  const row = {};
  if ('nombre' in p) row.nombre = p.nombre;
  if ('placa' in p) row.placa = p.placa === '' || p.placa == null ? null : Number(p.placa);
  if ('hash' in p) row.hash = p.hash || null;
  if ('telefono' in p) row.telefono = p.telefono || null;
  if ('discordId' in p) row.discord_id = p.discordId || null;
  if ('correo' in p) row.correo = p.correo || null;
  if ('rango' in p) row.rango = p.rango;
  if ('divisiones' in p) row.divisiones = p.divisiones;
  if ('estado' in p) row.estado = p.estado;
  if ('fechaIngreso' in p) row.fecha_ingreso = p.fechaIngreso || null;
  if ('fechaSalida' in p) row.fecha_salida = p.fechaSalida || null;
  if ('ultimaActividad' in p) row.ultima_actividad = p.ultimaActividad || null;
  if ('horasMes' in p) row.horas_mes = p.horasMes;
  if ('equipo' in p) row.equipo = p.equipo;
  if ('expedientes' in p) row.expedientes = p.expedientes;
  if ('notas' in p) row.notas = p.notas;
  return row;
}
export async function addPersona(p) {
  const { error } = await supabase.from('personal').insert(personaToRow(p));
  if (error) throw error;
  await loadAll();
}
export async function updatePersona(id, p) {
  const patch = personaToRow(p);
  patch.updated_at = new Date().toISOString();
  const { error } = await supabase.from('personal').update(patch).eq('id', id);
  if (error) throw error;
  await loadAll();
}
export async function removePersona(id) {
  const { error } = await supabase.from('personal').delete().eq('id', id);
  if (error) throw error;
  await loadAll();
}

// ------------------------------- SANCIONES ---------------------------------
// Registra una sanción y aplica el medio strike automático del Art. 84 (3/3).
export async function addSancion(s) {
  const { error } = await supabase.from('sanciones').insert({
    persona_id: s.personaId, caso_id: s.casoId || null, fecha: s.fecha,
    tipo: s.tipo, cantidad: s.cantidad, articulo_id: s.articuloId || null, motivo: s.motivo || '',
  });
  if (error) throw error;
  await loadAll();
  await aplicarMedioStrikeAuto(s.personaId, s.casoId, s.fecha);
}
export async function removeSancion(id) {
  const { error } = await supabase.from('sanciones').delete().eq('id', id);
  if (error) throw error;
  await loadAll();
}
export async function setSancionVencida(id, vencida) {
  const { error } = await supabase.from('sanciones').update({ vencida }).eq('id', id);
  if (error) throw error;
  await loadAll();
}
// Art. 84: por cada 3 advertencias vigentes, 1 medio strike (0.5). Convierte
// las 3 advertencias en vencidas para no recontarlas.
async function aplicarMedioStrikeAuto(personaId, casoId, fecha) {
  const persona = state.personal.find((p) => p.id === personaId);
  if (!persona || persona.advertencias < 3) return;
  const vigentes = state.sanciones
    .filter((s) => s.personaId === personaId && s.tipo === 'advertencia' && !s.vencida)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  let acumulado = 0; const aVencer = [];
  for (const s of vigentes) { if (acumulado >= 3) break; acumulado += s.cantidad; aVencer.push(s.id); }
  if (acumulado < 3) return;
  await supabase.from('sanciones').update({ vencida: true }).in('id', aVencer);
  await supabase.from('sanciones').insert({
    persona_id: personaId, caso_id: casoId || null, fecha: fecha || new Date().toISOString().slice(0, 10),
    tipo: 'strike', cantidad: 0.5, motivo: 'Medio strike automático por acumulación 3/3 (Art. 84)',
  });
  await loadAll();
}

// ------------------------------- FINANZAS ----------------------------------
export async function addMovimiento(m) {
  const { error } = await supabase.from('finanzas').insert({
    fecha: m.fecha, tipo: m.tipo, categoria: m.categoria,
    concepto: m.concepto, monto: m.monto, responsable: m.responsable,
  });
  if (error) throw error;
  await loadAll();
}
export async function updateMovimiento(id, m) {
  const { error } = await supabase.from('finanzas').update({
    fecha: m.fecha, tipo: m.tipo, categoria: m.categoria,
    concepto: m.concepto, monto: m.monto, responsable: m.responsable,
  }).eq('id', id);
  if (error) throw error;
  await loadAll();
}
export async function removeMovimiento(id) {
  const { error } = await supabase.from('finanzas').delete().eq('id', id);
  if (error) throw error;
  await loadAll();
}
export function balance() {
  return state.finanzas.reduce((a, m) => a + (m.tipo === 'ingreso' ? m.monto : -m.monto), 0);
}

// --------------------------------- CASOS -----------------------------------
async function syncArticulos(casoId, articulos) {
  await supabase.from('caso_articulos').delete().eq('caso_id', casoId);
  if (articulos && articulos.length) {
    await supabase.from('caso_articulos').insert(
      articulos.map((a) => ({ caso_id: casoId, articulo_id: a })));
  }
}
export async function addCaso(c) {
  const n = state.casos.length + 1;
  const folio = c.folio || `OPR-${new Date().getFullYear()}-${String(n).padStart(3, '0')}`;
  const { data, error } = await supabase.from('casos').insert({
    folio, fecha: c.fecha, denunciado_id: c.denunciadoId || null, denunciado: c.denunciado,
    denunciante: c.denunciante, descripcion: c.descripcion, estado: c.estado,
    resolucion: c.resolucion || '', sancion_aplicada: c.sancionAplicada || '',
  }).select('id').single();
  if (error) throw error;
  await syncArticulos(data.id, c.articulos);
  await loadAll();
  return data.id;
}
export async function updateCaso(id, c) {
  const { error } = await supabase.from('casos').update({
    fecha: c.fecha, denunciado_id: c.denunciadoId || null, denunciado: c.denunciado,
    denunciante: c.denunciante, descripcion: c.descripcion, estado: c.estado,
    resolucion: c.resolucion || '', sancion_aplicada: c.sancionAplicada || '',
  }).eq('id', id);
  if (error) throw error;
  if ('articulos' in c) await syncArticulos(id, c.articulos);
  await loadAll();
}
export async function removeCaso(id) {
  const { error } = await supabase.from('casos').delete().eq('id', id);
  if (error) throw error;
  await loadAll();
}

// ------------------------------- NORMATIVA ---------------------------------
export async function updateArticulo(id, a) {
  const { error } = await supabase.from('normativa').update({
    titulo: a.titulo, libro: a.libro, capitulo: a.capitulo,
    sev_min: a.sevMin, sev_max: a.sevMax, tags: a.tags, resumen: a.resumen,
    activo: a.activo, updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw error;
  await loadAll();
}
export async function addArticulo(a) {
  const id = a.id || ('x' + Date.now().toString(36));
  const orden = (state.normativa.length || 0) + 1;
  const { error } = await supabase.from('normativa').insert({
    id, titulo: a.titulo, libro: a.libro, capitulo: a.capitulo,
    sev_min: a.sevMin, sev_max: a.sevMax, tags: a.tags, resumen: a.resumen,
    activo: a.activo, orden,
  });
  if (error) throw error;
  await loadAll();
}
export async function removeArticulo(id) {
  const { error } = await supabase.from('normativa').delete().eq('id', id);
  if (error) throw error;
  await loadAll();
}

// -------------------------------- PERFILES ---------------------------------
export async function updatePerfil(id, patch) {
  const { error } = await supabase.from('perfiles').update(patch).eq('id', id);
  if (error) throw error;
  await loadAll();
  if (id === state.session?.user?.id) await loadPerfil();
}
export async function removePerfil(id) {
  const { error } = await supabase.from('perfiles').delete().eq('id', id);
  if (error) throw error;
  await loadAll();
}

// ------------------------- TRAINING DIVISION / EXAMEN ----------------------
export async function addPregunta(p) {
  const { error } = await supabase.from('examen_preguntas').insert({
    categoria: p.categoria, dificultad: p.dificultad, enunciado: p.enunciado,
    opciones: p.opciones, correcta: p.correcta, activa: p.activa !== false,
  });
  if (error) throw error;
  await loadAll();
}
export async function updatePregunta(id, p) {
  const { error } = await supabase.from('examen_preguntas').update({
    categoria: p.categoria, dificultad: p.dificultad, enunciado: p.enunciado,
    opciones: p.opciones, correcta: p.correcta, activa: p.activa,
  }).eq('id', id);
  if (error) throw error;
  await loadAll();
}
export async function removePregunta(id) {
  const { error } = await supabase.from('examen_preguntas').delete().eq('id', id);
  if (error) throw error;
  await loadAll();
}
export async function removeIntento(id) {
  const { error } = await supabase.from('examen_intentos').delete().eq('id', id);
  if (error) throw error;
  await loadAll();
}
export async function addSesion(s) {
  const { error } = await supabase.from('examen_sesiones').insert({
    nombre: s.nombre, tipo: s.tipo, faciles: s.faciles, medias: s.medias,
    dificiles: s.dificiles, duracion_min: s.duracionMin, activa: true,
  });
  if (error) throw error;
  await loadAll();
}
export async function updateSesion(id, s) {
  const patch = {};
  for (const k of ['nombre', 'tipo', 'faciles', 'medias', 'dificiles', 'activa']) if (k in s) patch[k] = s[k];
  if ('duracionMin' in s) patch.duracion_min = s.duracionMin;
  const { error } = await supabase.from('examen_sesiones').update(patch).eq('id', id);
  if (error) throw error;
  await loadAll();
}
export async function removeSesion(id) {
  const { error } = await supabase.from('examen_sesiones').delete().eq('id', id);
  if (error) throw error;
  await loadAll();
}

// ------------------------------ Export / utils -----------------------------
export function exportJSON() {
  return JSON.stringify({
    personal: state.personal, finanzas: state.finanzas, casos: state.casos,
    normativa: state.normativa, sanciones: state.sanciones,
    exportado: new Date().toISOString(),
  }, null, 2);
}
