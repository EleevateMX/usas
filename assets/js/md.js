// ===========================================================================
//  USMS Control — Renderizador Markdown mínimo (manuales internos, confiables)
// ===========================================================================
const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const unesc = (s) => s.replace(/\\([\\`*_{}\[\]()#+\-.!>~])/g, '$1');

function inline(raw) {
  let s = escHtml(unesc(raw));
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t, u) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`);
  return s;
}

const isTOC = (l) => /^\[.*\]\(https?:\/\/docs\.google\.com/.test(l);
const isSep = (r) => r.includes('-') && /^\|?[\s:|-]+\|?$/.test(r);

function renderTable(rows) {
  const parse = (r) => r.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  let out = '<table class="md-table">';
  rows.forEach((r, idx) => {
    if (isSep(r)) return;
    const tag = idx === 0 ? 'th' : 'td';
    out += '<tr>' + parse(r).map((c) => `<${tag}>${inline(c)}</${tag}>`).join('') + '</tr>';
  });
  return out + '</table>';
}

export function renderMarkdown(md) {
  const lines = md.replace(/\r/g, '').split('\n');
  let html = ''; let i = 0;
  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t || isTOC(t)) { i++; continue; }
    const hm = t.match(/^(#{1,6})\s+(.*)$/);
    if (hm) { const lvl = Math.min(hm[1].length + 1, 6); html += `<h${lvl}>${inline(hm[2].replace(/#+$/, '').trim())}</h${lvl}>`; i++; continue; }
    if (/^(---+|\*\*\*+)$/.test(t)) { html += '<hr>'; i++; continue; }
    if (t.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(lines[i].trim()); i++; }
      html += renderTable(rows); continue;
    }
    if (/^[-*]\s+/.test(t)) {
      html += '<ul>';
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { const m = lines[i].trim().replace(/^[-*]\s+/, ''); if (m) html += `<li>${inline(m)}</li>`; i++; }
      html += '</ul>'; continue;
    }
    const para = [t]; i++;
    while (i < lines.length) {
      const n = lines[i].trim();
      if (!n || isTOC(n) || /^(#{1,6}\s|[-*]\s|\|)/.test(n) || /^(---+|\*\*\*+)$/.test(n)) break;
      para.push(n); i++;
    }
    html += `<p>${inline(para.join(' '))}</p>`;
  }
  const div = document.createElement('div');
  div.className = 'md';
  div.innerHTML = html;
  return div;
}
