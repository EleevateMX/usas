// ===========================================================================
//  USMS Control — Capa de persistencia (localStorage)
//  ---------------------------------------------------------------------------
//  Todo el estado vive en el navegador. Usa exportar/importar (JSON) para
//  respaldar o compartir los datos con el resto del liderazgo.
// ===========================================================================

import { NORMATIVA_SEED } from './normativa-seed.js';

const KEY = 'usms_control_v1';
const VERSION = 1;

const DEFAULT_STATE = () => ({
  version: VERSION,
  personal: [],     // mariscales
  finanzas: [],     // movimientos de tesorería
  casos: [],        // casos de Asuntos Internos
  normativa: structuredClone(NORMATIVA_SEED),
  meta: { creado: new Date().toISOString(), nombreFaccion: 'U.S. Marshals Service' },
});

let state = null;
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE();
    const parsed = JSON.parse(raw);
    // Migración suave: garantiza que existan todas las claves.
    return { ...DEFAULT_STATE(), ...parsed, meta: { ...DEFAULT_STATE().meta, ...(parsed.meta || {}) } };
  } catch (e) {
    console.error('No se pudo cargar el estado, se reinicia.', e);
    return DEFAULT_STATE();
  }
}

function persist() {
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((fn) => fn(state));
}

export function getState() {
  if (!state) state = load();
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ---------------------------- PERSONAL -------------------------------------
export function addPersona(p) {
  getState().personal.push({
    id: uid(),
    nombre: '',
    numeroEmpleado: '',
    rango: 'Deputy U.S. Marshal',
    divisiones: [],
    estado: 'Activo',
    fechaIngreso: new Date().toISOString().slice(0, 10),
    horasMes: 0,
    advertencias: 0,
    strikes: 0,
    notas: '',
    ...p,
  });
  persist();
}
export function updatePersona(id, patch) {
  const p = getState().personal.find((x) => x.id === id);
  if (p) Object.assign(p, patch), persist();
}
export function removePersona(id) {
  state.personal = getState().personal.filter((x) => x.id !== id);
  persist();
}

// ---------------------------- FINANZAS -------------------------------------
export function addMovimiento(m) {
  getState().finanzas.push({
    id: uid(),
    fecha: new Date().toISOString().slice(0, 10),
    tipo: 'ingreso',          // ingreso | egreso
    categoria: 'General',
    concepto: '',
    monto: 0,
    responsable: '',
    ...m,
  });
  persist();
}
export function updateMovimiento(id, patch) {
  const m = getState().finanzas.find((x) => x.id === id);
  if (m) Object.assign(m, patch), persist();
}
export function removeMovimiento(id) {
  state.finanzas = getState().finanzas.filter((x) => x.id !== id);
  persist();
}
export function balance() {
  return getState().finanzas.reduce(
    (acc, m) => acc + (m.tipo === 'ingreso' ? +m.monto : -+m.monto), 0);
}

// ---------------------------- CASOS (IA) -----------------------------------
export function addCaso(c) {
  const n = getState().casos.length + 1;
  getState().casos.push({
    id: uid(),
    folio: `OPR-${new Date().getFullYear()}-${String(n).padStart(3, '0')}`,
    fecha: new Date().toISOString().slice(0, 10),
    denunciado: '',
    denunciante: '',
    descripcion: '',
    etiquetas: [],
    articulos: [],          // ids de artículos imputados
    estado: 'Abierto',      // Abierto | En análisis | Resuelto | Archivado
    resolucion: '',
    sancionAplicada: '',
    ...c,
  });
  persist();
}
export function updateCaso(id, patch) {
  const c = getState().casos.find((x) => x.id === id);
  if (c) Object.assign(c, patch), persist();
}
export function removeCaso(id) {
  state.casos = getState().casos.filter((x) => x.id !== id);
  persist();
}

// ---------------------------- NORMATIVA ------------------------------------
export function updateArticulo(id, patch) {
  const a = getState().normativa.find((x) => x.id === id);
  if (a) Object.assign(a, patch), persist();
}
export function addArticulo(a) {
  getState().normativa.push({
    id: uid(),
    libro: 'Personalizado',
    capitulo: '',
    titulo: '',
    sevMin: 0,
    sevMax: 1,
    tags: [],
    resumen: '',
    activo: true,
    ...a,
  });
  persist();
}
export function removeArticulo(id) {
  state.normativa = getState().normativa.filter((x) => x.id !== id);
  persist();
}
export function restoreNormativa() {
  getState().normativa = structuredClone(NORMATIVA_SEED);
  persist();
}

// ---------------------------- IMPORT / EXPORT ------------------------------
export function exportJSON() {
  return JSON.stringify(getState(), null, 2);
}
export function importJSON(text) {
  const data = JSON.parse(text);
  state = { ...DEFAULT_STATE(), ...data };
  persist();
}
export function resetAll() {
  state = DEFAULT_STATE();
  persist();
}
