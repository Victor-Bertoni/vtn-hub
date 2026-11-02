/* =========================================================
   UI — utilitários de formatação, modais, formulários, gráficos
   ========================================================= */
window.UI = (() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Formatação ---------- */
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const NUM = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
  const money = v => BRL.format(+v || 0);
  const moneyK = v => { v = +v || 0; return Math.abs(v) >= 1000 ? 'R$ ' + NUM.format(Math.round(v / 100) / 10) + ' mil' : money(v); };
  const num = v => NUM.format(+v || 0);
  const pct = (v, d = 1) => (isFinite(v) ? (+v).toFixed(d).replace('.', ',') : '0') + '%';
  const date = iso => { if (!iso) return '—'; const [y, m, d] = iso.slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
  const dateTime = iso => iso ? date(iso) + ' ' + iso.slice(11, 16) : '—';
  const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const MES_AB = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const dateLong = iso => { if (!iso) return '___ de __________ de ____'; const [y, m, d] = iso.slice(0, 10).split('-'); return `${+d} de ${MESES[+m - 1]} de ${y}`; };
  const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
  const size = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
  const initials = n => (n || '?').split(/\s+/).filter(w => w.length > 2 || /^[A-Z]/.test(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  /* Valor por extenso (pt-BR) */
  function extenso(valor) {
    const u = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const d = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const c = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
    const tri = n => { if (n === 100) return 'cem'; const p = []; const h = Math.floor(n / 100), r = n % 100; if (h) p.push(c[h]); if (r < 20) { if (r) p.push(u[r]); } else { p.push(d[Math.floor(r / 10)] + (r % 10 ? ' e ' + u[r % 10] : '')); } return p.join(' e '); };
    const inteiro = n => {
      if (n === 0) return 'zero';
      const grupos = [['', ''], ['mil', 'mil'], ['milhão', 'milhões'], ['bilhão', 'bilhões']];
      const parts = []; let i = 0;
      while (n > 0) { const g = n % 1000; if (g) { let s = (i === 1 && g === 1) ? '' : tri(g); const nm = grupos[i][g > 1 ? 1 : 0]; s = [s, nm].filter(Boolean).join(' '); parts.unshift({ s, g }); } n = Math.floor(n / 1000); i++; }
      return parts.map((p, k) => (k > 0 && (p.g < 100 || p.g % 100 === 0) ? 'e ' : '') + p.s).join(' ').replace(/\s+/g, ' ');
    };
    valor = Math.round((+valor || 0) * 100) / 100;
    const r = Math.floor(valor), cts = Math.round((valor - r) * 100);
    let s = inteiro(r) + (r === 1 ? ' real' : (r >= 1e6 && r % 1e6 === 0 ? ' de reais' : ' reais'));
    if (cts) s += ' e ' + inteiro(cts) + (cts === 1 ? ' centavo' : ' centavos');
    return s;
  }

  /* ---------- Ícones (lucide) ---------- */
  const icon = (n, cls = '') => `<i data-lucide="${n}" class="${cls}"></i>`;
  const icons = () => { try { window.lucide && lucide.createIcons(); } catch (e) {} };

  /* ---------- Badges ---------- */
  const STATUS_COR = {
    'Concluída': 'ok', 'Aprovada': 'ok', 'Aprovado': 'ok', 'Assinado': 'ok', 'Assinada': 'ok', 'Resolvida': 'ok', 'Entregue': 'ok', 'pago': 'ok', 'Paga': 'ok', 'Ativo': 'ok',
    'Em execução': 'info', 'Em andamento': 'info', 'Em elaboração': 'info', 'Enviado': 'info', 'Enviada': 'info', 'Em análise': 'info', 'Contratada': 'info', 'Em planejamento': 'violet',
    'Em entrega': 'violet', 'Aguardando': 'warn', 'Pendente': 'warn', 'pendente': 'warn', 'Aberta': 'warn', 'Orçamento': 'warn', 'Prospecção': 'warn', 'Rascunho': '', 'Prévia': '',
    'Paralisada': 'err', 'Cancelada': 'err', 'Cancelado': 'err', 'Recusado': 'err', 'atrasado': 'err', 'Atrasada': 'err', 'Substituída': '',
    'Crítica': 'err', 'Alta': 'warn', 'Média': 'info', 'Baixa': '', 'Normal': 'ok', 'Adiantada': 'ok', 'Atrasada ': 'err'
  };
  const badge = (s, cls) => `<span class="badge ${cls ?? STATUS_COR[s] ?? ''}">${esc(s === 'pago' ? 'Pago' : s === 'pendente' ? 'Pendente' : s)}</span>`;
  const idLink = id => id ? `<span class="idlink" data-goto="${esc(id)}">${esc(id)}</span>` : '—';
  const pessoa = id => { const p = Store.get('pessoas', id); return p ? `<span class="plink" data-goto="${p.id}">${esc(p.nome)}</span>` : '<span class="muted">—</span>'; };
  const obraNome = id => { const o = Store.get('obras', id); return o ? `<span class="plink" data-goto="${o.id}">${esc(o.nome)}</span>` : '<span class="muted">Geral</span>'; };
  const progress = (p, cls = '') => `<div class="pbar"><div class="progress ${cls}" style="flex:1"><i style="width:${Math.max(0, Math.min(100, p))}%"></i></div><span>${pct(p, 0)}</span></div>`;
  const empty = (msg, ic = 'inbox') => `<div class="empty">${icon(ic)}<div>${esc(msg)}</div></div>`;

  /* ---------- Toast / modal ---------- */
  function toast(msg, type = '') {
    const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
    $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3600);
  }
  function modal({ title, body, footer = '', wide = false, onOpen }) {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
      <div class="modal-h"><h2>${title}</h2><button class="btn ghost icon" data-close>${icon('x')}</button></div>
      <div class="modal-b">${body}</div>${footer ? `<div class="modal-f">${footer}</div>` : ''}</div>`;
    bg.addEventListener('mousedown', e => { if (e.target === bg) close(); });
    bg.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    function close() { bg.remove(); document.removeEventListener('keydown', onKey); }
    document.body.appendChild(bg); icons();
    const api = { el: bg, close, $: s => bg.querySelector(s) };
    onOpen && onOpen(api);
    return api;
  }
  function confirm(msg, okLabel = 'Confirmar') {
    return new Promise(res => {
      const m = modal({ title: 'Confirmar', body: `<p>${esc(msg)}</p>`, footer: `<button class="btn" data-close>Cancelar</button><button class="btn primary" data-ok>${okLabel}</button>` });
      m.$('[data-ok]').onclick = () => { m.close(); res(true); };
      m.el.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => res(false)));
    });
  }

  /* ---------- Formulários ----------
     fields: [{k:'nome', l:'Nome', t:'text|number|date|select|textarea|money|check|multi|time|email', o:[opções], full:true, req:true}] */
  function opts(o) { return (typeof o === 'function' ? o() : o || []).map(x => Array.isArray(x) ? x : [x, x]); }
  function fields(list, v = {}) {
    return `<div class="form">${list.map(f => {
      const val = v[f.k] ?? f.def ?? '';
      const id = 'f_' + f.k;
      let inp;
      if (f.t === 'select') inp = `<select class="select" id="${id}" name="${f.k}">${f.blank !== false ? '<option value="">—</option>' : ''}${opts(f.o).map(([a, b]) => `<option value="${esc(a)}" ${String(a) === String(val) ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>`;
      else if (f.t === 'multi') inp = `<select class="select" id="${id}" name="${f.k}" multiple size="${Math.min(6, opts(f.o).length)}">${opts(f.o).map(([a, b]) => `<option value="${esc(a)}" ${(val || []).includes(a) ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>`;
      else if (f.t === 'textarea') inp = `<textarea class="input" id="${id}" name="${f.k}" rows="${f.rows || 4}">${esc(val)}</textarea>`;
      else if (f.t === 'check') return `<label class="check ${f.full ? 'full' : ''}"><input type="checkbox" name="${f.k}" ${val ? 'checked' : ''}> ${esc(f.l)}</label>`;
      else inp = `<input class="input" id="${id}" name="${f.k}" type="${f.t === 'money' ? 'number' : (f.t || 'text')}" ${f.t === 'money' || f.t === 'number' ? 'step="any"' : ''} value="${esc(val)}" ${f.req ? 'required' : ''} ${f.ph ? `placeholder="${esc(f.ph)}"` : ''}>`;
      return `<div class="field ${f.full ? 'full' : ''}"><label for="${id}">${esc(f.l)}${f.req ? ' *' : ''}</label>${inp}</div>`;
    }).join('')}</div>`;
  }
  function read(el, list) {
    const o = {};
    list.forEach(f => {
      const i = el.querySelector(`[name="${f.k}"]`); if (!i) return;
      if (f.t === 'check') o[f.k] = i.checked;
      else if (f.t === 'multi') o[f.k] = [...i.selectedOptions].map(x => x.value);
      else if (f.t === 'number' || f.t === 'money') o[f.k] = i.value === '' ? 0 : +i.value;
      else o[f.k] = i.value.trim();
    });
    return o;
  }
  /** Modal com formulário: devolve Promise com os dados ou null */
  function formModal({ title, list, values = {}, wide, okLabel = 'Salvar', extra = '', onDelete }) {
    return new Promise(res => {
      const m = modal({ title, wide, body: fields(list, values) + extra,
        footer: `${onDelete ? `<button class="btn danger" data-del style="margin-right:auto">${icon('trash-2')} Excluir</button>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn primary" data-ok>${icon('check')} ${okLabel}</button>` });
      m.$('[data-ok]').onclick = () => {
        const miss = list.filter(f => f.req && !m.$(`[name="${f.k}"]`).value.trim());
        if (miss.length) { toast('Preencha: ' + miss.map(f => f.l).join(', '), 'err'); return; }
        const d = read(m.el, list); m.close(); res(d);
      };
      if (onDelete) m.$('[data-del]').onclick = async () => { if (await confirm('Excluir este registro?', 'Excluir')) { m.close(); onDelete(); res(null); } };
      m.el.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => res(null)));
      setTimeout(() => { const f = m.el.querySelector('input,select,textarea'); f && f.focus(); }, 30);
    });
  }

  /* ---------- Tabela inteligente ----------
     Toda lista ganha: ordenar clicando no cabeçalho, filtrar, contar,
     somar colunas de dinheiro e exportar CSV (Excel). */
  const strip = h => String(h ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
  const MONEY_RE = /^[−-]?\s*R\$\s?[−-]?[\d.]+(,\d+)?$/;
  const parseNum = t => { t = (t || '').replace(/\s/g, ''); const neg = /^[−-]/.test(t) || /R\$[−-]/.test(t); const n = parseFloat(t.replace(/[^\d,]/g, '').replace(',', '.')); return isNaN(n) ? null : (neg ? -n : n); };
  const sortKey = t => { const d = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/); if (d) return d[3] + d[2] + d[1]; const n = /^[−-]?\s*(R\$)?\s?[−-]?[\d.]+(,\d+)?\s*%?$/.test(t) ? parseNum(t) : null; return n != null ? n : t.toLowerCase(); };
  function table(cols, rows, { foot, emptyMsg = 'Nada por aqui ainda.', tools } = {}) {
    if (!rows.length) return empty(emptyMsg);
    const cells = rows.map(r => cols.map(c => c.f ? c.f(r) : esc(r[c.k])));
    let autoFoot = null;
    if (!foot && rows.length >= 2) {
      const sums = cols.map((c, i) => { const txt = cells.map(r => strip(r[i])).filter(t => t && t !== '—'); return txt.length && txt.every(t => MONEY_RE.test(t)) ? txt.reduce((a, t) => a + (parseNum(t) || 0), 0) : null; });
      if (sums.some(v => v != null)) autoFoot = sums.map((v, i) => v != null ? money(v) : i === 0 ? 'Total' : '');
    }
    const showTools = tools !== false && rows.length >= 5;
    return `<div class="smart">${showTools ? `<div class="tbar"><div class="tfind-w">${icon('search')}<input class="tfind" placeholder="Filtrar nesta lista…"></div><span class="tcount">${rows.length} itens</span><button class="btn sm ghost texp" title="Exportar para Excel (CSV)">${icon('file-spreadsheet')} Exportar</button></div>` : ''}
      <div class="table-wrap"><table class="t"><thead><tr>${cols.map((c, i) => `<th class="${c.num ? 'num' : ''} ${c.h ? 'sortable' : ''}" data-col="${i}">${c.h}${c.h ? '<i class="sort-ind"></i>' : ''}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r, j) => `<tr ${r.__attr || ''}>${cols.map((c, i) => `<td class="${c.num ? 'num' : ''} ${c.cls || ''}">${cells[j][i]}</td>`).join('')}</tr>`).join('')}</tbody>
      ${foot || autoFoot ? `<tfoot class="${autoFoot ? 'auto' : ''}"><tr>${(foot || autoFoot).map((f, i) => `<td class="${cols[i] && cols[i].num ? 'num' : ''}">${f}</td>`).join('')}</tr></tfoot>` : ''}</table></div></div>`;
  }
  function recalcFoot(tb) {
    const tf = tb.querySelector('tfoot.auto'); if (!tf) return;
    const vis = [...tb.tBodies[0].rows].filter(r => r.style.display !== 'none');
    [...tf.rows[0].cells].forEach((td, i) => { if (!/R\$/.test(td.textContent)) return; td.textContent = money(vis.reduce((a, r) => a + (parseNum(r.cells[i] ? r.cells[i].textContent : '') || 0), 0)); });
  }
  document.addEventListener('click', e => {
    const th = e.target.closest('table.t th.sortable');
    if (th && !e.target.closest('[data-goto],a,button,input')) {
      const tb = th.closest('table'), i = +th.dataset.col, dir = th.dataset.dir === 'asc' ? 'desc' : 'asc';
      tb.querySelectorAll('th').forEach(x => delete x.dataset.dir); th.dataset.dir = dir;
      const body = tb.tBodies[0];
      [...body.rows].map(r => [sortKey(r.cells[i] ? r.cells[i].textContent.trim() : ''), r]).sort((a, b) => (typeof a[0] === typeof b[0] ? (a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0) : typeof a[0] === 'number' ? -1 : 1) * (dir === 'asc' ? 1 : -1)).forEach(x => body.appendChild(x[1]));
      return;
    }
    const ex = e.target.closest('.texp');
    if (ex) {
      const tb = ex.closest('.smart').querySelector('table');
      const head = [...tb.tHead.rows[0].cells].map(c => c.textContent.trim());
      const rows = [...tb.tBodies[0].rows].filter(r => r.style.display !== 'none').map(r => [...r.cells].map(c => c.textContent.replace(/\s+/g, ' ').trim()));
      const titulo = (document.querySelector('.view h1') || {}).textContent || 'lista';
      csv(titulo.trim().toLowerCase().replace(/[^\wÀ-ú]+/g, '-') + '-' + today() + '.csv', head, rows);
    }
  });
  document.addEventListener('input', e => {
    if (!e.target.classList.contains('tfind')) return;
    const w = e.target.closest('.smart'), q = e.target.value.toLowerCase().trim(), tb = w.querySelector('table');
    let n = 0; [...tb.tBodies[0].rows].forEach(r => { const ok = !q || r.textContent.toLowerCase().includes(q); r.style.display = ok ? '' : 'none'; if (ok) n++; });
    w.querySelector('.tcount').textContent = n + ' itens'; recalcFoot(tb);
  });

  /* ---------- Gráficos (Chart.js) ---------- */
  const charts = {};
  function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
  const PALETA = ['#2563eb', '#06b6d4', '#16a34a', '#7c3aed', '#d97706', '#0891b2', '#db2777', '#4b5563'];
  function chart(id, cfg) {
    const el = document.getElementById(id); if (!el || !window.Chart) return;
    if (charts[id]) charts[id].destroy();
    Chart.defaults.color = css('--text-2'); Chart.defaults.borderColor = css('--border');
    Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
    try {
      Chart.defaults.elements = Chart.defaults.elements || {};
      Object.assign(Chart.defaults.elements.bar || (Chart.defaults.elements.bar = {}), { borderRadius: 7, borderSkipped: false, maxBarThickness: 38 });
      Object.assign(Chart.defaults.elements.line || (Chart.defaults.elements.line = {}), { tension: .35, borderWidth: 2.5 });
      Object.assign(Chart.defaults.elements.point || (Chart.defaults.elements.point = {}), { radius: 0, hoverRadius: 5, hitRadius: 12 });
      Object.assign(Chart.defaults.elements.arc || (Chart.defaults.elements.arc = {}), { borderWidth: 2, borderColor: css('--surface') });
      if (Chart.defaults.plugins && Chart.defaults.plugins.tooltip) Object.assign(Chart.defaults.plugins.tooltip, { backgroundColor: 'rgba(15,23,42,.92)', padding: 10, cornerRadius: 10, titleFont: { weight: '700' }, boxPadding: 4, usePointStyle: true });
      Chart.defaults.borderColor = css('--border');
    } catch (e) {}
    if (cfg.type === 'doughnut') cfg.options = Object.assign({ cutout: '68%' }, cfg.options || {});
    cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: 'circle', padding: 14 } } } }, cfg.options || {});
    if (cfg.type === 'doughnut') cfg.options.interaction = { mode: 'nearest', intersect: true };
    charts[id] = new Chart(el, cfg);
  }
  const moneyTick = v => 'R$ ' + (Math.abs(v) >= 1000 ? NUM.format(v / 1000) + 'k' : v);

  /* ---------- Download / impressão ---------- */
  function download(name, content, mime = 'text/plain') {
    if (window.Cloud && Cloud.ativo) return Cloud.baixar(name, content instanceof Blob ? content : new Blob([content], { type: mime + ';charset=utf-8' }));
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime + ';charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  function csv(name, header, rows) {
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    download(name, '﻿' + [header, ...rows].map(r => r.map(q).join(';')).join('\n'), 'text/csv');
  }
  /** Imprime/salva em PDF um HTML usando um iframe isolado */
  function print(html, title = 'Documento') {
    if (window.Cloud && Cloud.ativo) return Cloud.imprimir(html, title);
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    const d = f.contentDocument;
    d.open(); d.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><link rel="stylesheet" href="css/styles.css">
      <style>body{background:#fff}.doc{border:0;max-width:none;padding:0}@page{margin:18mm}</style></head><body><div class="doc">${html}</div></body></html>`);
    d.close();
    setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 2000); }, 400);
  }
  function docHeader(titulo, sub = '') {
    const e = Store.db.empresa;
    return `<div class="head"><div><b style="font-size:16px">${esc(e.nome)}</b><div class="tiny">CNPJ ${esc(e.cnpj)} · ${esc(e.endereco)}</div></div>
      <div style="text-align:right"><b>${esc(titulo)}</b><div class="tiny">${esc(sub)}</div></div></div>`;
  }

  return { strip, parseNum, $, $$, esc, money, moneyK, num, pct, date, dateTime, dateLong, today, daysBetween, size, initials, extenso, MESES, MES_AB,
    icon, icons, badge, idLink, pessoa, obraNome, progress, empty, toast, modal, confirm, fields, read, formModal, table, chart, PALETA, moneyTick, download, csv, print, docHeader, opts };
})();
