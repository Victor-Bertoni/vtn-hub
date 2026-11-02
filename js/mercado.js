/* =========================================================
   RODAPÉ "MERCADO E NOTÍCIAS" (tempo real)
   - Cotações: dólar, euro, bitcoin (AwesomeAPI, ~30 s) e ações da B3
     (brapi.dev; sem chave só algumas ações; com chave grátis, todas).
   - Notícias nacionais e internacionais ligadas à construção civil,
     engenharia, crédito imobiliário, juros e ao que mexe com a bolsa.
   - Tudo roda no navegador de quem abre o app: não usa tokens/créditos.
   ========================================================= */
window.Mercado = (() => {
  const LS = 'vtn_mercado_cache';
  const ACOES_LIVRES = ['PETR4', 'VALE3', 'ITUB4', 'MGLU3'];
  const ACOES_SETOR = ['^BVSP', 'CYRE3', 'MRVE3', 'EVEN3', 'DIRR3', 'CURY3', 'TEND3', 'EZTC3', 'GGBR4', 'PETR4', 'VALE3', 'ITUB4'];
  const NOMES = { '^BVSP': 'Ibovespa', CYRE3: 'Cyrela', MRVE3: 'MRV', EVEN3: 'Even', DIRR3: 'Direcional', CURY3: 'Cury', TEND3: 'Tenda', EZTC3: 'EZTec', GGBR4: 'Gerdau', PETR4: 'Petrobras', VALE3: 'Vale', ITUB4: 'Itaú', MGLU3: 'Magalu' };
  const FEEDS = {
    nacional: [
      'https://news.google.com/rss/search?q=%22constru%C3%A7%C3%A3o+civil%22+OR+INCC+OR+%22Minha+Casa+Minha+Vida%22+OR+%22cr%C3%A9dito+imobili%C3%A1rio%22+when:3d&hl=pt-BR&gl=BR&ceid=BR:pt-419',
      'https://news.google.com/rss/search?q=Ibovespa+OR+Selic+OR+Copom+OR+d%C3%B3lar+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419'
    ],
    internacional: [
      'https://news.google.com/rss/search?q=%22construction+industry%22+OR+%22steel+prices%22+OR+%22housing+market%22+when:3d&hl=en-US&gl=US&ceid=US:en',
      'https://news.google.com/rss/search?q=%22Federal+Reserve%22+OR+%22Wall+Street%22+OR+%22oil+prices%22+OR+%22stock+market%22+when:1d&hl=en-US&gl=US&ceid=US:en'
    ]
  };
  let estado = { moedas: [], acoes: [], noticias: { nacional: [], internacional: [] }, atualizado: null, erros: {} };
  try { const c = JSON.parse(localStorage.getItem(LS) || 'null'); if (c) estado = Object.assign(estado, c, { erros: {} }); } catch (e) {}
  const guarda = () => { try { localStorage.setItem(LS, JSON.stringify({ moedas: estado.moedas, acoes: estado.acoes, noticias: estado.noticias, atualizado: estado.atualizado })); } catch (e) {} };
  const token = () => ((window.Store && Store.db && Store.db.empresa) || {}).brapiToken || '';
  const fmt = (v, d = 2) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  async function getJSON(url, ms = 12000) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
    try { const r = await fetch(url, { signal: ctl.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); } finally { clearTimeout(t); }
  }

  /* ---------- cotações ---------- */
  async function moedas() {
    try {
      const j = await getJSON('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-BRL');
      estado.moedas = [['USDBRL', 'Dólar', 4], ['EURBRL', 'Euro', 4], ['BTCBRL', 'Bitcoin', 0]].filter(([k]) => j[k]).map(([k, n, d]) => ({ s: n, v: +j[k].bid, p: +j[k].pctChange, d, pre: 'R$ ' }));
      delete estado.erros.moedas;
    } catch (e) { estado.erros.moedas = true; }
  }
  async function acoes() {
    const tk = token(); const lista = tk ? ACOES_SETOR : ACOES_LIVRES;
    try {
      const j = await getJSON('https://brapi.dev/api/quote/' + lista.map(encodeURIComponent).join(',') + (tk ? '?token=' + encodeURIComponent(tk) : ''));
      estado.acoes = (j.results || []).filter(x => x && x.regularMarketPrice != null).map(x => ({ s: NOMES[x.symbol] || x.symbol, t: x.symbol, v: +x.regularMarketPrice, p: +x.regularMarketChangePercent || 0, d: x.symbol === '^BVSP' ? 0 : 2, pre: x.symbol === '^BVSP' ? '' : 'R$ ' }));
      delete estado.erros.acoes;
    } catch (e) {
      // sem chave a brapi recusa alguns pedidos em grupo: tenta uma a uma
      const out = [];
      for (const s of ACOES_LIVRES) { try { const j = await getJSON('https://brapi.dev/api/quote/' + s); const x = (j.results || [])[0]; if (x && x.regularMarketPrice != null) out.push({ s: NOMES[s] || s, t: s, v: +x.regularMarketPrice, p: +x.regularMarketChangePercent || 0, d: 2, pre: 'R$ ' }); } catch (er) {} }
      if (out.length) { estado.acoes = out; delete estado.erros.acoes; } else estado.erros.acoes = true;
    }
  }

  /* ---------- notícias ---------- */
  function limpaTitulo(t) { return String(t || '').replace(/\s+-\s+[^-]{2,60}$/, '').trim(); }
  function fonteDe(t, f) { const m = String(t || '').match(/\s-\s([^-]{2,60})$/); return (f || (m && m[1]) || '').trim(); }
  async function lerFeed(url) {
    // 1º: rss2json (JSON com CORS); 2º: allorigins (XML)
    try {
      const j = await getJSON('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(url));
      if (j.status === 'ok') return (j.items || []).map(i => ({ t: limpaTitulo(i.title), f: fonteDe(i.title, i.author), u: i.link, d: i.pubDate ? new Date(i.pubDate.replace(' ', 'T') + 'Z').toISOString() : '' }));
    } catch (e) {}
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 12000);
    try {
      const r = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(url), { signal: ctl.signal }); const x = new DOMParser().parseFromString(await r.text(), 'text/xml');
      return [...x.querySelectorAll('item')].map(i => { const t = (i.querySelector('title') || {}).textContent; return { t: limpaTitulo(t), f: (i.querySelector('source') || {}).textContent || fonteDe(t), u: (i.querySelector('link') || {}).textContent, d: new Date((i.querySelector('pubDate') || {}).textContent || Date.now()).toISOString() }; });
    } finally { clearTimeout(tm); }
  }
  // o que mais afeta a VTN aparece primeiro
  const PESO = [/constru|incc|obra|habita|imobili|minha casa|caixa|cimento|a[cç]o\b|steel|construction|housing|cement/i, /selic|copom|juros|infla|ipca|fed\b|federal reserve|rates?\b/i, /ibovespa|bolsa|d[oó]lar|wall street|stock|oil|petr[oó]leo/i];
  const peso = n => PESO.reduce((s, r, i) => s + (r.test(n.t) ? 3 - i : 0), 0);
  async function noticias() {
    for (const tipo of ['nacional', 'internacional']) {
      try {
        const L = (await Promise.all(FEEDS[tipo].map(u => lerFeed(u).catch(() => [])))).flat().filter(n => n.t && n.u);
        const vistos = new Set(); const U = L.filter(n => { const k = n.t.toLowerCase().slice(0, 60); if (vistos.has(k)) return false; vistos.add(k); return true; });
        U.sort((a, b) => (peso(b) - peso(a)) || (b.d || '').localeCompare(a.d || ''));
        if (U.length) { estado.noticias[tipo] = U.slice(0, 25); delete estado.erros[tipo]; } else estado.erros[tipo] = true;
      } catch (e) { estado.erros[tipo] = true; }
    }
  }

  /* ---------- desenho ---------- */
  function chip(x) { const cls = x.p > 0 ? 'up' : x.p < 0 ? 'down' : ''; return `<span class="mk-q" title="${esc(x.t || x.s)}"><b>${esc(x.s)}</b> ${x.pre}${fmt(x.v, x.d)} <i class="${cls}">${x.p > 0 ? '▲' : x.p < 0 ? '▼' : '•'} ${fmt(Math.abs(x.p))}%</i></span>`; }
  function quando(iso) { if (!iso) return ''; const m = Math.round((Date.now() - new Date(iso)) / 60000); return m < 60 ? `há ${Math.max(1, m)} min` : m < 1440 ? `há ${Math.round(m / 60)} h` : new Date(iso).toLocaleDateString('pt-BR'); }
  function render() {
    let el = document.getElementById('mkBar');
    if (!el) { el = document.createElement('footer'); el.id = 'mkBar'; el.className = 'mk-bar'; document.body.appendChild(el); document.body.classList.add('com-mercado'); }
    const cot = [...estado.moedas, ...estado.acoes];
    const news = [...estado.noticias.nacional.slice(0, 8).map(n => Object.assign({ g: '🇧🇷' }, n)), ...estado.noticias.internacional.slice(0, 6).map(n => Object.assign({ g: '🌎' }, n))];
    const faixa = cot.map(chip).join('') + news.map(n => `<a class="mk-n" href="${esc(n.u)}" target="_blank" rel="noopener">${n.g} ${esc(n.t)}${n.f ? ` <small>${esc(n.f)}</small>` : ''}</a>`).join('');
    const vivo = estado.atualizado && (Date.now() - new Date(estado.atualizado)) < (estado.fonte === 'banco' ? 90 : 5) * 60000;
    el.innerHTML = `<button class="mk-tag" id="mkOpen" title="Abrir painel de mercado e notícias"><span class="mk-dot ${vivo ? 'on' : ''}"></span>Mercado</button>
      <div class="mk-track"><div class="mk-roll">${faixa || '<span class="mk-q">Carregando cotações e notícias…</span>'}${faixa ? `<span aria-hidden="true" class="mk-dup">${faixa}</span>` : ''}</div></div>
      <span class="mk-time">${estado.atualizado ? new Date(estado.atualizado).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>`;
    const roll = el.querySelector('.mk-roll'); if (roll) roll.style.animationDuration = Math.max(40, (cot.length + news.length) * 7) + 's';
    el.querySelector('#mkOpen').onclick = painel;
  }
  function painel() {
    const lista = (L) => L.length ? L.map(n => `<a class="mk-item" href="${esc(n.u)}" target="_blank" rel="noopener"><b>${esc(n.t)}</b><span>${esc(n.f || '')}${n.d ? ' · ' + quando(n.d) : ''}</span></a>`).join('') : '<p class="tiny muted">Sem notícias no momento.</p>';
    const tab = (L) => L.length ? `<div class="mk-grid">${L.map(x => `<div class="mk-card"><span>${esc(x.s)}</span><b>${x.pre}${fmt(x.v, x.d)}</b><i class="${x.p > 0 ? 'up' : x.p < 0 ? 'down' : ''}">${x.p > 0 ? '▲' : x.p < 0 ? '▼' : '•'} ${fmt(Math.abs(x.p))}%</i></div>`).join('')}</div>` : '';
    const m = UI.modal({ title: 'Mercado e notícias', wide: true, body: `
      <div class="tiny muted mb">${estado.fonte === 'banco' ? 'Atualizado automaticamente ao longo do dia (cotações podem ter até ~15 min de atraso).' : 'Atualiza sozinho: cotações a cada 1 minuto, notícias a cada 10 minutos.'} ${estado.atualizado ? 'Última atualização: ' + new Date(estado.atualizado).toLocaleTimeString('pt-BR') : ''}</div>
      <h3 class="mk-h">Câmbio</h3>${tab(estado.moedas) || '<p class="tiny muted">Cotações de câmbio indisponíveis agora.</p>'}
      <h3 class="mk-h">B3 · construção e destaques</h3>${tab(estado.acoes) || '<p class="tiny muted">Cotações da bolsa indisponíveis agora.</p>'}
      ${token() ? '' : '<p class="tiny muted">Sem chave da brapi aparecem só Petrobras, Vale, Itaú e Magalu. Com uma chave grátis (brapi.dev) entram o Ibovespa e as construtoras (Cyrela, MRV, Direcional, Cury, Tenda, EZTec, Even) e a Gerdau. Um administrador cadastra a chave em Configurações.</p>'}
      <div class="mk-cols"><div><h3 class="mk-h">🇧🇷 Nacional · construção, crédito, juros e bolsa</h3>${lista(estado.noticias.nacional)}</div>
      <div><h3 class="mk-h">🌎 Internacional · construção, aço, petróleo e mercados</h3>${lista(estado.noticias.internacional)}</div></div>`,
      footer: `<button class="btn" data-close>Fechar</button><button class="btn primary keep" id="mkRef">Atualizar agora</button>` });
    m.$('#mkRef').onclick = async () => { m.$('#mkRef').disabled = true; await tudo(true); m.close(); painel(); };
  }

  /* ---------- ciclo ---------- */
  let ultNews = 0;
  async function tudo(forcar) {
    await Promise.all([moedas(), acoes(), (forcar || Date.now() - ultNews > 10 * 60000) ? noticias().then(() => { ultNews = Date.now(); }) : null]);
    if (estado.moedas.length || estado.acoes.length) estado.atualizado = new Date().toISOString();
    guarda(); if (doBanco) aplicarBanco(doBanco); render(); relatar();
  }
  /* diagnóstico: um administrador grava no banco se as fontes responderam (uma vez por abertura) */
  let relatado = false;
  async function relatar() {
    if (relatado || !(window.Cloud && Cloud.ativo && Cloud.dbEditor) || !window.claude) return; relatado = true;
    try { const db = await claude.use('db'); if (db) await db.collection('sistema').doc('mercadoStatus').set({ em: new Date().toISOString(), moedas: estado.moedas.length, acoes: estado.acoes.length, nac: estado.noticias.nacional.length, int: estado.noticias.internacional.length, erros: Object.keys(estado.erros) }); } catch (e) {}
  }
  /* fonte 2: cotações e notícias gravadas no banco do app (sistema/mercado), atualizadas por uma tarefa agendada.
     Usada quando o navegador não consegue buscar direto (o app publicado bloqueia sites de fora). */
  let doBanco = null;
  function aplicarBanco(d) {
    if (!d) return; doBanco = d;
    const vivoLocal = estado.atualizado && !Object.keys(estado.erros).length && (Date.now() - new Date(estado.atualizado)) < 5 * 60000;
    if (vivoLocal) return;
    if (!estado.moedas.length || estado.erros.moedas) estado.moedas = d.moedas || [];
    if (!estado.acoes.length || estado.erros.acoes) estado.acoes = d.acoes || [];
    ['nacional', 'internacional'].forEach(k => { if (!estado.noticias[k].length || estado.erros[k]) estado.noticias[k] = (d.noticias || {})[k] || []; });
    estado.atualizado = d.atualizadoEm || estado.atualizado; estado.fonte = 'banco';
    render();
  }
  async function ouvirBanco() {
    try { const db = window.claude && await claude.use('db'); if (!db) return; db.collection('sistema').doc('mercado').onSnapshot(sn => { const d = sn && (sn.data ? sn.data() : null); if (d) aplicarBanco(d); }, () => {}); } catch (e) {}
  }
  function iniciar() {
    if (document.getElementById('mkBar')) return;
    render(); tudo(true); ouvirBanco();
    setInterval(() => { if (!document.hidden) tudo(false); }, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tudo(false); });
  }
  return { iniciar, estado: () => estado, atualizar: () => tudo(true), painel };
})();
