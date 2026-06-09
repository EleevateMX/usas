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
  divisionMiembros: [],
  tdModulos: [],
  tdAspirantes: [],
  tdSeguimiento: [],
  tdProgreso: [],
  tdAnuncios: [],
  ascensoReglas: [],
  ascensos: [],
  tdAsistencia: [],
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
  fechaIngreso: r.fecha_ingreso, fechaSalida: r.fecha_salida, fechaAscenso: r.fecha_ascenso,
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
  divisiones: r.divisiones || [],
});
const mapPregunta = (r) => ({
  id: r.id, categoria: r.categoria, dificultad: r.dificultad, enunciado: r.enunciado,
  opciones: r.opciones || [], correcta: r.correcta, activa: r.activa,
  explicacion: r.explicacion || '',
});
const mapIntento = (r) => ({
  id: r.id, nombre: r.nombre, discord: r.discord, fecha: r.created_at,
  puntaje: Number(r.puntaje) || 0, total: r.total || 0, aprobado: r.aprobado,
  estado: r.estado, duracionSeg: r.duracion_seg, sesionId: r.sesion_id,
  alertas: r.alertas || 0, eventos: r.eventos || [],
  preguntas: r.preguntas || [], respuestas: r.respuestas || {},
});
const mapSesion = (r) => ({
  id: r.id, slug: r.slug, nombre: r.nombre, tipo: r.tipo,
  faciles: r.faciles, medias: r.medias, dificiles: r.dificiles,
  duracionMin: r.duracion_min, activa: r.activa, fecha: r.created_at,
});
const mapDivMiembro = (r) => ({
  id: r.id, personaId: r.persona_id, division: r.division,
  cargo: r.cargo, notas: r.notas || '', fecha: r.created_at,
});
const mapModulo = (r) => ({
  id: r.id, orden: r.orden, titulo: r.titulo, descripcion: r.descripcion || '',
  temas: r.temas || [], guia: r.guia || '', categorias: r.categorias || [], liberado: r.liberado, fecha: r.created_at,
});
const mapAspirante = (r) => ({
  id: r.id, nombre: r.nombre, discord: r.discord, hash: r.hash || '', sesionId: r.sesion_id,
  estado: r.estado, examenSesionId: r.examen_sesion_id, examenHabilitado: r.examen_habilitado,
  registrado: !!r.hash, fecha: r.created_at,
});
const mapAnuncio = (r) => ({
  id: r.id, titulo: r.titulo, contenido: r.contenido || '', autor: r.autor || '',
  fijado: r.fijado, sesionId: r.sesion_id, fecha: r.created_at,
});
const mapRegla = (r) => ({
  rango: r.rango, orden: r.orden, diasMin: r.dias_min, horasMin: Number(r.horas_min) || 0, strikesMax: Number(r.strikes_max) || 0,
});
const mapAscenso = (r) => ({
  id: r.id, personaId: r.persona_id, deRango: r.de_rango, aRango: r.a_rango, estado: r.estado,
  motivo: r.motivo || '', proponente: r.proponente || '', aprobadoPor: r.aprobado_por || '',
  fecha: r.created_at, resolvedAt: r.resolved_at,
});
const mapSeguimiento = (r) => ({
  id: r.id, aspiranteId: r.aspirante_id, autor: r.autor || '', moduloOrden: r.modulo_orden,
  tipo: r.tipo, contenido: r.contenido || '', visibleAspirante: r.visible_aspirante, fecha: r.created_at,
});
const mapProgreso = (r) => ({
  id: r.id, discord: r.discord, moduloId: r.modulo_id, completado: r.completado, fecha: r.created_at,
});
const mapAsistencia = (r) => ({
  id: r.id, aspiranteId: r.aspirante_id, dia: r.dia, presente: r.presente,
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
  const [personal, finanzas, normativa, casos, sanciones, perfiles, preguntas, intentos, sesiones, divMiembros, tdMods, tdAsp, tdSeg, tdProg, tdAnun, ascReglas, ascList, tdAsis] = await Promise.all([
    supabase.from('personal').select('*').order('nombre'),
    supabase.from('finanzas').select('*').order('fecha', { ascending: false }),
    supabase.from('normativa').select('*').order('orden'),
    supabase.from('casos').select('*, caso_articulos(articulo_id)').order('created_at', { ascending: false }),
    supabase.from('sanciones').select('*').order('fecha', { ascending: false }),
    supabase.from('perfiles').select('*').order('created_at'),
    supabase.from('examen_preguntas').select('*').order('categoria'),
    supabase.from('examen_intentos').select('id, nombre, discord, created_at, puntaje, total, aprobado, estado, duracion_seg, sesion_id, alertas, eventos, preguntas, respuestas').order('created_at', { ascending: false }),
    supabase.from('examen_sesiones').select('*').order('created_at', { ascending: false }),
    supabase.from('division_miembros').select('*').order('created_at'),
    supabase.from('td_modulos').select('*').order('orden'),
    supabase.from('td_aspirantes').select('*').order('created_at', { ascending: false }),
    supabase.from('td_seguimiento').select('*').order('created_at', { ascending: false }),
    supabase.from('td_progreso').select('*'),
    supabase.from('td_anuncios').select('*').order('fijado', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('ascenso_reglas').select('*').order('orden'),
    supabase.from('ascensos').select('*').order('created_at', { ascending: false }),
    supabase.from('td_asistencia').select('*'),
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
  state.divisionMiembros = (divMiembros.data || []).map(mapDivMiembro);
  state.tdModulos = (tdMods.data || []).map(mapModulo);
  state.tdAspirantes = (tdAsp.data || []).map(mapAspirante);
  state.tdSeguimiento = (tdSeg.data || []).map(mapSeguimiento);
  state.tdProgreso = (tdProg.data || []).map(mapProgreso);
  state.tdAnuncios = (tdAnun.data || []).map(mapAnuncio);
  state.ascensoReglas = (ascReglas.data || []).map(mapRegla);
  state.ascensos = (ascList.data || []).map(mapAscenso);
  state.tdAsistencia = (tdAsis.data || []).map(mapAsistencia);
  computeContadores();
  notify();
}

// ------------------------------ Tiempo real --------------------------------
let realtimeChannel = null;
let reloadTimer = null;
export function initRealtime() {
  if (realtimeChannel) return;
  realtimeChannel = supabase
    .channel('usms-db')
    .on('postgres_changes', { event: '*', schema: 'public' }, () => {
      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => { loadAll().catch(() => {}); }, 450);
    })
    .subscribe();
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
export const esDirector = () => rolActual() === 'Director';
export const misDivisiones = () => state.perfil?.divisiones || [];
// Exportar datos y búsqueda global: todo el Supervisory Staff (SDUSM I → U.S. Marshal).
export const puedeExportar = () => !!state.perfil;

// Dispara una notificación push a la audiencia indicada (no bloquea).
export async function notificar(payload) {
  try { await supabase.functions.invoke('notificar', { body: payload }); }
  catch { /* las notificaciones nunca deben romper el flujo */ }
}
// Pertenece a la Training Division (o es cúpula Executive/Director, que ve todo).
export const esTD = () => esAdmin() || misDivisiones().some((d) => {
  const n = (d || '').toLowerCase().trim();
  return n === 'td' || n.includes('training');
});

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
  if ('fechaAscenso' in p) row.fecha_ascenso = p.fechaAscenso || null;
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
  notificar({ titulo: 'Nuevo caso OPR', cuerpo: `${folio} · ${c.denunciado || 'sin denunciado'}`, url: '#/asuntos', audiencia: 'opr' });
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
    explicacion: p.explicacion || '',
  });
  if (error) throw error;
  await loadAll();
}
export async function updatePregunta(id, p) {
  const { error } = await supabase.from('examen_preguntas').update({
    categoria: p.categoria, dificultad: p.dificultad, enunciado: p.enunciado,
    opciones: p.opciones, correcta: p.correcta, activa: p.activa,
    explicacion: p.explicacion || '',
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

// ------------------------- DIVISIONES (membresía) --------------------------
export async function addDivMiembro(d) {
  const { error } = await supabase.from('division_miembros').insert({
    persona_id: d.personaId, division: d.division, cargo: d.cargo || 'Miembro', notas: d.notas || '',
  });
  if (error) throw error;
  await loadAll();
}
export async function updateDivMiembro(id, patch) {
  const row = {};
  if ('division' in patch) row.division = patch.division;
  if ('cargo' in patch) row.cargo = patch.cargo;
  if ('notas' in patch) row.notas = patch.notas;
  const { error } = await supabase.from('division_miembros').update(row).eq('id', id);
  if (error) throw error;
  await loadAll();
}
export async function removeDivMiembro(id) {
  const { error } = await supabase.from('division_miembros').delete().eq('id', id);
  if (error) throw error;
  await loadAll();
}

// Da de baja a un mariscal: fija estado de salida, fecha y deja constancia en notas.
export async function darDeBaja(id, { estado, fechaSalida, motivo }) {
  const p = state.personal.find((x) => x.id === id);
  const sello = `[BAJA ${fechaSalida || new Date().toISOString().slice(0, 10)}] ${estado}${motivo ? ' — ' + motivo : ''}`;
  const notas = p?.notas ? `${sello}\n${p.notas}` : sello;
  await updatePersona(id, { estado, fechaSalida: fechaSalida || new Date().toISOString().slice(0, 10), notas });
}

// ----------------------- TRAINING DIVISION · PROGRAMA ----------------------
export async function addModulo(m) {
  const orden = m.orden || ((state.tdModulos.at(-1)?.orden || 0) + 1);
  const { error } = await supabase.from('td_modulos').insert({
    orden, titulo: m.titulo, descripcion: m.descripcion || '', temas: m.temas || [],
    guia: m.guia || '', categorias: m.categorias || [], liberado: !!m.liberado,
  });
  if (error) throw error;
  await loadAll();
}
export async function updateModulo(id, patch) {
  const row = {};
  for (const k of ['orden', 'titulo', 'descripcion', 'temas', 'guia', 'categorias', 'liberado']) if (k in patch) row[k] = patch[k];
  const { error } = await supabase.from('td_modulos').update(row).eq('id', id);
  if (error) throw error;
  await loadAll();
}
export async function removeModulo(id) {
  const { error } = await supabase.from('td_modulos').delete().eq('id', id);
  if (error) throw error;
  await loadAll();
}

export async function addAspirante(a) {
  const { error } = await supabase.from('td_aspirantes').insert({
    nombre: a.nombre, hash: a.hash || null, discord: a.discord || null,
    sesion_id: a.sesionId || null, examen_sesion_id: a.examenSesionId || null, estado: a.estado || 'En curso',
  });
  if (error) throw error;
  await loadAll();
}
// Crea una academia (sesión de examen) y precarga su roster de aspirantes
// (Nombre + #HASH#), listos para ingresar al aula sin registrarse.
export async function crearAcademiaConRoster({ nombre, tipo, faciles, medias, dificiles, duracionMin, aspirantes }) {
  const { data: ses, error } = await supabase.from('examen_sesiones').insert({
    nombre, tipo, faciles, medias, dificiles, duracion_min: duracionMin, activa: true,
  }).select('id').single();
  if (error) throw error;
  if (aspirantes && aspirantes.length) {
    const rows = aspirantes.map((a) => ({
      nombre: a.nombre, hash: a.hash || null, discord: a.discord || null,
      sesion_id: ses.id, examen_sesion_id: ses.id, estado: 'En curso',
    }));
    const { error: e2 } = await supabase.from('td_aspirantes').insert(rows);
    if (e2) throw e2;
  }
  await loadAll();
  return ses.id;
}
// Alta masiva de aspirantes permitidos (roster de la academia, sin Discord aún).
export async function addAspirantesBulk(nombres, sesionId) {
  const rows = nombres.map((n) => ({ nombre: n, sesion_id: sesionId || null, estado: 'En curso' }));
  if (!rows.length) return;
  const { error } = await supabase.from('td_aspirantes').insert(rows);
  if (error) throw error;
  await loadAll();
}
export async function updateAspirante(id, patch) {
  const row = {};
  if ('nombre' in patch) row.nombre = patch.nombre;
  if ('estado' in patch) row.estado = patch.estado;
  if ('sesionId' in patch) row.sesion_id = patch.sesionId || null;
  if ('examenSesionId' in patch) row.examen_sesion_id = patch.examenSesionId || null;
  if ('examenHabilitado' in patch) row.examen_habilitado = patch.examenHabilitado;
  const { error } = await supabase.from('td_aspirantes').update(row).eq('id', id);
  if (error) throw error;
  await loadAll();
}

export async function addAnuncio(a) {
  const { error } = await supabase.from('td_anuncios').insert({
    titulo: a.titulo, contenido: a.contenido || '', autor: a.autor || '', fijado: !!a.fijado,
    sesion_id: a.sesionId || null,
  });
  if (error) throw error;
  await loadAll();
}
export async function updateAnuncio(id, patch) {
  const row = {};
  for (const k of ['titulo', 'contenido', 'autor', 'fijado']) if (k in patch) row[k] = patch[k];
  if ('sesionId' in patch) row.sesion_id = patch.sesionId || null;
  const { error } = await supabase.from('td_anuncios').update(row).eq('id', id);
  if (error) throw error;
  await loadAll();
}
export async function removeAnuncio(id) {
  const { error } = await supabase.from('td_anuncios').delete().eq('id', id);
  if (error) throw error;
  await loadAll();
}
export async function removeAspirante(id) {
  const { error } = await supabase.from('td_aspirantes').delete().eq('id', id);
  if (error) throw error;
  await loadAll();
}
export async function setAsistencia(aspiranteId, dia, presente) {
  const { error } = await supabase.from('td_asistencia')
    .upsert({ aspirante_id: aspiranteId, dia, presente }, { onConflict: 'aspirante_id,dia' });
  if (error) throw error;
  await loadAll();
}
// Gradúa a un aspirante: lo marca Aprobado y, si tiene ficha DUSMT en Personal,
// lo promueve a DUSM I dejando registro en Ascensos.
export async function graduarAspirante(aspirante, aprobadoPor) {
  const norm = (x) => (x || '').toString().trim().toLowerCase().replace(/[_\s]+/g, ' ');
  await supabase.from('td_aspirantes').update({ estado: 'Aprobado' }).eq('id', aspirante.id);
  const ficha = state.personal.find((p) => norm(p.nombre) === norm(aspirante.nombre) && (p.rango || '').toUpperCase() === 'DUSMT');
  let promovido = false;
  if (ficha) {
    await supabase.from('ascensos').insert({
      persona_id: ficha.id, de_rango: 'DUSMT', a_rango: 'DUSM I',
      motivo: 'Graduación de la academia (examen aprobado)', proponente: aprobadoPor || '', aprobado_por: aprobadoPor || '',
      estado: 'Aprobado', resolved_at: new Date().toISOString(),
    });
    await supabase.from('personal').update({ rango: 'DUSM I', fecha_ascenso: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() }).eq('id', ficha.id);
    promovido = true;
  }
  await loadAll();
  return { promovido };
}
// Habilita (o quita) el examen para todo el roster de una academia.
export async function habilitarExamenAcademia(sesionId, habilitado) {
  const patch = habilitado ? { examen_sesion_id: sesionId, examen_habilitado: true } : { examen_habilitado: false };
  const { error } = await supabase.from('td_aspirantes').update(patch).eq('sesion_id', sesionId);
  if (error) throw error;
  await loadAll();
}

export async function addSeguimiento(s) {
  const { error } = await supabase.from('td_seguimiento').insert({
    aspirante_id: s.aspiranteId, autor: s.autor || '', modulo_orden: s.moduloOrden || null,
    tipo: s.tipo || 'nota', contenido: s.contenido || '', visible_aspirante: s.visibleAspirante !== false,
  });
  if (error) throw error;
  await loadAll();
}
export async function removeSeguimiento(id) {
  const { error } = await supabase.from('td_seguimiento').delete().eq('id', id);
  if (error) throw error;
  await loadAll();
}

// -------------------------------- ASCENSOS ---------------------------------
export const RANGOS_ORDEN = ['DUSMT', 'DUSM I', 'DUSM II', 'DUSM III', 'DUSM IV', 'SDUSM I', 'SDUSM II', 'CDUSM', 'U.S. Marshal'];
export const siguienteRango = (r) => { const i = RANGOS_ORDEN.indexOf(r); return i >= 0 && i < RANGOS_ORDEN.length - 1 ? RANGOS_ORDEN[i + 1] : null; };

// Ficha del roster vinculada al usuario que ha iniciado sesión (por correo).
export const miFicha = () => {
  const email = (state.perfil?.email || '').toLowerCase();
  if (!email) return null;
  return state.personal.find((p) => (p.correo || '').toLowerCase() === email) || null;
};

// Evalúa si una persona cumple los requisitos para ascender al siguiente rango.
export function evaluarAscenso(p) {
  const siguiente = siguienteRango(p.rango);
  if (!siguiente) return null;
  const regla = state.ascensoReglas.find((r) => r.rango === p.rango);
  const base = p.fechaAscenso || p.fechaIngreso;
  const dias = base ? Math.floor((Date.now() - new Date(base)) / 86400000) : 0;
  const horas = +p.horasMes || 0;
  const strikes = +p.strikes || 0;
  const req = regla || { diasMin: 0, horasMin: 0, strikesMax: 0 };
  const checks = {
    dias: { ok: dias >= req.diasMin, val: dias, min: req.diasMin },
    horas: { ok: horas >= req.horasMin, val: horas, min: req.horasMin },
    strikes: { ok: strikes <= req.strikesMax, val: strikes, max: req.strikesMax },
  };
  return { siguiente, dias, checks, elegible: checks.dias.ok && checks.horas.ok && checks.strikes.ok };
}

export async function setRegla(rango, patch) {
  const row = { rango };
  if ('diasMin' in patch) row.dias_min = patch.diasMin;
  if ('horasMin' in patch) row.horas_min = patch.horasMin;
  if ('strikesMax' in patch) row.strikes_max = patch.strikesMax;
  if ('orden' in patch) row.orden = patch.orden;
  const { error } = await supabase.from('ascenso_reglas').upsert(row, { onConflict: 'rango' });
  if (error) throw error;
  await loadAll();
}
export async function setReglasBatch(list) {
  const rows = list.map((r) => ({ rango: r.rango, orden: r.orden, dias_min: r.diasMin, horas_min: r.horasMin, strikes_max: r.strikesMax }));
  const { error } = await supabase.from('ascenso_reglas').upsert(rows, { onConflict: 'rango' });
  if (error) throw error;
  await loadAll();
}
export async function proponerAscenso(a) {
  const { error } = await supabase.from('ascensos').insert({
    persona_id: a.personaId, de_rango: a.deRango, a_rango: a.aRango,
    motivo: a.motivo || '', proponente: a.proponente || '', estado: 'Pendiente',
  });
  if (error) throw error;
  await loadAll();
}
// Aplica un ascenso: promueve a la persona y reinicia su "tiempo en grado".
export async function aplicarAscenso({ personaId, aRango }) {
  const hoy = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from('personal')
    .update({ rango: aRango, fecha_ascenso: hoy, updated_at: new Date().toISOString() }).eq('id', personaId);
  if (error) throw error;
}
export async function ascenderDirecto(a, aprobadoPor) {
  await supabase.from('ascensos').insert({
    persona_id: a.personaId, de_rango: a.deRango, a_rango: a.aRango, motivo: a.motivo || '',
    proponente: aprobadoPor || '', aprobado_por: aprobadoPor || '', estado: 'Aprobado', resolved_at: new Date().toISOString(),
  });
  await aplicarAscenso(a);
  await loadAll();
}
export async function resolverAscenso(asc, accion, aprobadoPor) {
  if (accion === 'aprobar') {
    await supabase.from('ascensos').update({ estado: 'Aprobado', aprobado_por: aprobadoPor || '', resolved_at: new Date().toISOString() }).eq('id', asc.id);
    await aplicarAscenso({ personaId: asc.personaId, aRango: asc.aRango });
  } else {
    await supabase.from('ascensos').update({ estado: 'Rechazado', aprobado_por: aprobadoPor || '', resolved_at: new Date().toISOString() }).eq('id', asc.id);
  }
  await loadAll();
}
export async function removeAscenso(id) {
  const { error } = await supabase.from('ascensos').delete().eq('id', id);
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
