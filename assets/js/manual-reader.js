// ===========================================================================
//  USMS Control — Lector de manuales integrado (overlay, funciona en panel y portal)
// ===========================================================================
import { renderMarkdown } from './md.js';
import { manualBySlug } from './manuales.js';
import { icon } from './icons.js';

export async function abrirLectorManual(slug) {
  const meta = manualBySlug(slug);
  const titulo = meta?.titulo || 'Manual';
  document.getElementById('manual-reader')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'manual-reader';
  overlay.className = 'manual-overlay';

  const body = document.createElement('div');
  body.className = 'manual-body';
  body.innerHTML = '<p class="muted">Cargando manual…</p>';

  const titleEl = document.createElement('div');
  titleEl.className = 'manual-title';
  titleEl.textContent = titulo;

  const acts = document.createElement('div');
  acts.className = 'manual-acts';
  if (meta?.url) {
    const a = document.createElement('a');
    a.href = meta.url; a.target = '_blank'; a.rel = 'noopener';
    a.className = 'btn ghost small'; a.textContent = 'Ver original';
    acts.append(a);
  }
  const close = document.createElement('button');
  close.className = 'icon-btn'; close.title = 'Cerrar';
  close.append(icon('close', 18));
  close.onclick = () => overlay.remove();
  acts.append(close);

  const head = document.createElement('div');
  head.className = 'manual-head';
  head.append(titleEl, acts);

  const sheet = document.createElement('div');
  sheet.className = 'manual-sheet';
  sheet.append(head, body);
  overlay.append(sheet);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  const onKey = (e) => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);
  document.body.append(overlay);

  try {
    const res = await fetch(`assets/manuales/${slug}.md`, { cache: 'no-cache' });
    if (!res.ok) throw new Error('no encontrado');
    const md = await res.text();
    body.innerHTML = '';
    body.append(renderMarkdown(md));
    sheet.scrollTop = 0;
  } catch {
    body.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'Este manual aún no está disponible para lectura en la app. Usa “Ver original”.';
    body.append(p);
  }
}
