// ===========================================================================
//  USMS Control — Motor de coincidencia de infracciones
//  ---------------------------------------------------------------------------
//  Dada la descripción de una situación (y opcionalmente etiquetas marcadas),
//  puntúa los artículos de la normativa por relevancia y devuelve los más
//  probables con su rango de sanción. Lee siempre de la normativa EDITABLE del
//  store, de modo que las actualizaciones del usuario se reflejan al instante.
// ===========================================================================

import { SEVERIDAD } from './normativa-seed.js';

const STOPWORDS = new Set(
  ('el la los las un una unos unas de del al a y o u en con por para que se su sus ' +
   'lo le les me te nos es son fue ha han hay como mas más este esta estos estas ' +
   'pero si no sin sobre entre cuando donde quien cual cuyo todo toda muy ya solo ' +
   'tambien tras durante mientras desde hasta cada otro otra')
    .split(' ')
);

// Normaliza: minúsculas, sin acentos, sin signos.
export function norm(s = '') {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s) {
  return norm(s).split(' ').filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

export function sevLabel(n) {
  return SEVERIDAD[n] ?? '—';
}
export function rangoSancion(a) {
  return a.sevMin === a.sevMax
    ? sevLabel(a.sevMax)
    : `${sevLabel(a.sevMin)} → ${sevLabel(a.sevMax)}`;
}

// Devuelve [{ articulo, score, hits }] ordenado por score desc.
export function matchInfracciones(descripcion, etiquetas, normativa) {
  const texto = tokens(descripcion);
  const setTexto = new Set(texto);
  const freq = texto.reduce((m, w) => (m[w] = (m[w] || 0) + 1, m), {});
  const tagsSel = (etiquetas || []).map(norm);

  const resultados = normativa
    .filter((a) => a.activo !== false)
    .map((a) => {
      let score = 0;
      const hits = [];

      // 1) Etiquetas seleccionadas explícitamente → peso fuerte.
      for (const tag of a.tags) {
        const t = norm(tag);
        if (tagsSel.includes(t)) { score += 6; hits.push(tag); }
      }

      // 2) Etiquetas del artículo presentes en el texto de la situación.
      for (const tag of a.tags) {
        const tToks = tokens(tag);
        if (tToks.length === 0) continue;
        const presentes = tToks.filter((w) => setTexto.has(w)).length;
        if (presentes === tToks.length) {            // frase completa
          score += 4; if (!hits.includes(tag)) hits.push(tag);
        } else if (presentes > 0) {                   // parcial
          score += 1.5 * presentes;
        }
      }

      // 3) Palabras del título/resumen presentes en el texto.
      for (const w of tokens(a.titulo + ' ' + a.resumen)) {
        if (freq[w]) score += 0.4 * Math.min(freq[w], 3);
      }

      return { articulo: a, score: +score.toFixed(2), hits: [...new Set(hits)] };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.articulo.sevMax - a.articulo.sevMax);

  return resultados;
}
