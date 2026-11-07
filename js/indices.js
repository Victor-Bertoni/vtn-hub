/* =========================================================
   ÍNDICES E PARÂMETROS BUSCADOS SOZINHOS (sem digitar nada)
   • Banco Central – SGS (api.bcb.gov.br, dados oficiais, gratuito, sem conta):
       IPCA (433) · IGP-M (189) · INCC-DI (192) · INCC-M (7456) · INPC (188)
       Salário mínimo (1619) · Selic meta (432)
     Variação mensal em %. Guardado neste aparelho e atualizado a cada 12 h.
   • CUB/m² Sinduscon-MG: a rotina do servidor (cub_mensal.ps1) baixa o PDF oficial
     para BANCO DE DADOS\cub; o app lê o PDF (pdf.js) e preenche R1, PP4, R8, R16 e PIS
     (B/N/A) e a variação do mês. Administrador logado: grava para todos sozinho.
   • Salário mínimo novo: aplicado na hora e, com administrador logado, salvo nos
     Parâmetros fiscais para todos.
   ========================================================= */
window.Indices = (() => {
  const SERIES = { ipca: [433, 'IPCA (IBGE)'], igpm: [189, 'IGP-M (FGV)'], inccdi: [192, 'INCC-DI (FGV)'], inccm: [7456, 'INCC-M (FGV)'], inpc: [188, 'INPC (IBGE)'], salmin: [1619, 'Salário mínimo'], selic: [432, 'Selic meta (% a.a.)'] };
  const LS = 'vtn_indices_v1';
  let dados = null; try { dados = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) {}
  let buscando = null;
  const ym = d => { const [dd, mm, aa] = d.split('/'); return aa + '-' + mm; };
  async function serie(cod, ini) {
    const r = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${cod}/dados?formato=json&dataInicial=${ini}`, { cache: 'no-store' });
    if (!r.ok) throw new Error('BCB ' + r.status); const j = await r.json();
    return j.map(x => [x.data, +x.valor]);
  }
  async function atualizar(forcar) {
    if (buscando) return buscando;
    if (!forcar && dados && Date.now() - dados.em < 12 * 3600e3) return dados;
    buscando = (async () => {
      const ini = '01/01/' + (new Date().getFullYear() - 6); const novo = { em: Date.now(), s: {}, erros: [] };
      await Promise.all(Object.entries(SERIES).map(async ([k, [cod]]) => {
        try { const L = await serie(cod, ini); novo.s[k] = k === 'selic' ? L.slice(-30).map(x => [x[0].split('/').reverse().join('-'), x[1]]) : L.map(x => [ym(x[0]), x[1]]); }
        catch (e) { novo.erros.push(k); if (dados && dados.s && dados.s[k]) novo.s[k] = dados.s[k]; }
      }));
      if (Object.keys(novo.s).length) { dados = novo; try { localStorage.setItem(LS, JSON.stringify(dados)); } catch (e) {} }
      aplicarSalario(); return dados;
    })().finally(() => { buscando = null; });
    return buscando;
  }
  function ultimo(k) { const L = ((dados || {}).s || {})[k] || []; return L[L.length - 1] || null; }
  // variação acumulada (%) dos meses (de, ate] — de = mês da data-base (exclusivo), ate = último mês (inclusivo)
  function acumulado(k, de, ate) {
    if (k === 'cub') { const H = cubHist(); const a = H.find(h => h[0] === de) || H.filter(h => h[0] <= de).pop(), b = (ate ? H.filter(h => h[0] <= ate).pop() : H[H.length - 1]); return a && b ? { pct: (b[1] / a[1] - 1) * 100, meses: [a[0], b[0]], de: a, ate: b } : null; }
    const L = (((dados || {}).s || {})[k] || []).filter(x => x[0] > de && (!ate || x[0] <= ate)); if (!L.length) return null;
    return { pct: (L.reduce((f, x) => f * (1 + x[1] / 100), 1) - 1) * 100, meses: L.map(x => x[0]), ate: L[L.length - 1][0] };
  }
  function cubHist() { try { const c = Comp.dados().cub || {}; return (c.histLongo || c.hist || []).slice().sort((a, b) => a[0].localeCompare(b[0])); } catch (e) { return []; } }
  /* salário mínimo do Banco Central → parâmetros */
  async function aplicarSalario() {
    const u = ultimo('salmin'); const K = window.Conhecimento; if (!u || !K) return;
    // vale o valor do mês atual (a série já traz o próximo ano quando sai o decreto)
    const hoje = UI.today().slice(0, 7); const L = dados.s.salmin.filter(x => x[0] <= hoje); const v = (L[L.length - 1] || u)[1];
    if (!v || Math.abs(v - (+K.SALARIO_MINIMO || 0)) < 0.01) return;
    const ant = K.SALARIO_MINIMO; K.SALARIO_MINIMO = v; if (K.INSS && K.INSS.faixas && Math.abs(K.INSS.faixas[0][0] - ant) < 0.01) K.INSS.faixas[0][0] = v;   // 1ª faixa do INSS = salário mínimo
    if (window.Auth && (Auth.current() || {}).papel === 'admin' && window.Parametros && Parametros.salvar) {
      try { await Parametros.salvar({ 'Conhecimento.SALARIO_MINIMO': v, 'Conhecimento.INSS': K.INSS }, ['Salário mínimo atualizado sozinho pelo Banco Central: ' + UI.money(ant) + ' → ' + UI.money(v)], []); UI.toast('Salário mínimo atualizado sozinho: ' + UI.money(v)); } catch (e) {}
    }
  }
  /* ---------- CUB do PDF oficial do Sinduscon-MG ---------- */
  let pdfjs = null;
  async function lerPdfCub(buf) {
    if (!pdfjs) { pdfjs = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs'); pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs'; }
    const doc = await pdfjs.getDocument({ data: buf }).promise; const it = [];
    for (let pg = 1; pg <= doc.numPages; pg++) { const c = await (await doc.getPage(pg)).getTextContent(); c.items.forEach(x => { if (x.str.trim()) it.push({ s: x.str.trim(), x: x.transform[4], y: x.transform[5] + (doc.numPages - pg) * 2000 }); }); }
    const texto = it.map(i => i.s).join(' ');
    const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const mm = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s*\/\s*(20\d\d)/);
    const mesN = mm ? MES.map(m => m.normalize('NFD').replace(/[̀-ͯ]/g, '')).indexOf(mm[1]) + 1 : 0;
    const num = s => +s.replace(/\./g, '').replace(',', '.');
    // seção residencial: entre "RESIDENCIAIS" e "COMERCIAIS"
    const yRes = (it.find(i => /RESIDENCIA/i.test(i.s)) || {}).y, yCom = (it.find(i => /COMERCIA/i.test(i.s)) || {}).y;
    const cab = it.filter(i => /PADR[ÃA]O\s+(BAIXO|NORMAL|ALTO)/i.test(i.s) && (!yRes || i.y < yRes) && (!yCom || i.y > yCom));
    const colX = { B: (cab.find(c => /BAIXO/i.test(c.s)) || {}).x, N: (cab.find(c => /NORMAL/i.test(c.s)) || {}).x, A: (cab.find(c => /ALTO/i.test(c.s)) || {}).x };
    const col = x => Object.entries(colX).filter(e => e[1] != null).sort((a, b) => Math.abs(a[1] - x) - Math.abs(b[1] - x))[0];
    const on = {};
    it.filter(i => (!yRes || i.y < yRes) && (!yCom || i.y > yCom) && /^(R-?1|R-?8|R-?16|PP-?4|PIS)$/i.test(i.s)).forEach(cod => {
      const v = it.filter(j => Math.abs(j.y - cod.y) < 2 && j.x > cod.x && /^\d{1,2}\.\d{3},\d{2}$/.test(j.s)).sort((a, b) => a.x - b.x)[0]; if (!v) return;
      const k = cod.s.toUpperCase().replace('-', ''); if (k === 'PIS') { on.PIS = num(v.s); return; }
      const c = col(cod.x); if (c) on[k + '-' + c[0]] = num(v.s);
    });
    const vg = texto.match(/Varia[çc][ãa]o\s+Global:?\s*(-?[\d.,]+)\s*%/i);
    return { mes: mm ? mm[2] + '-' + String(mesN).padStart(2, '0') : '', onerado: on, varR8N: vg ? num(vg[1]) : null };
  }
  // lê as tabelas do CUB baixadas pelo servidor (BANCO DE DADOS\cub) e grava o mês novo + o histórico
  async function cubAutomatico() {
    try {
      const db = window.claude && await claude.use('db'); if (!db || !window.VTN_PASTA || !VTN_PASTA.servidor || (Auth.current() || {}).papel !== 'admin') return;
      const atual = Comp.dados().cub || {}; const hist = new Map((atual.histLongo || atual.hist || []).map(h => [h[0], h[1]]));
      let lista = []; try { const inv = await VTN_PASTA.enviar('inventario', { raizes: ['BANCO DE DADOS/cub'] }); lista = (inv.itens || []).filter(i => /tabela_cub_.*\.pdf$/i.test(i[0]) && i[1] > 0).map(i => i[0]); } catch (e) {}
      const MES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      const mesDoNome = n => { const m = n.toLowerCase().match(/tabela_cub_([a-z]+)_(\d{4})/); return m && MES.indexOf(m[1]) >= 0 ? m[2] + '-' + String(MES.indexOf(m[1]) + 1).padStart(2, '0') : ''; };
      const faltam = lista.filter(n => { const m = mesDoNome(n); return m && (!hist.has(m) || m > (atual.mes || '')); }).sort((a, b) => mesDoNome(a).localeCompare(mesDoNome(b)));
      if (!faltam.length) return;
      let ultimo = null;
      for (const n of faltam.slice(-40)) {
        try { const c = await lerPdfCub(await VTN_PASTA.bin('arquivo?caminho=' + encodeURIComponent(n.replace(/^BANCO DE DADOS[\\/]/, '').replace(/\//g, '\\'))));
          if (c.mes && c.onerado['R8-N']) { hist.set(c.mes, c.onerado['R8-N']); if (!ultimo || c.mes > ultimo.mes) ultimo = c; } } catch (e) {}
      }
      if (!ultimo) return;
      const H = [...hist.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-180);
      const novo = Object.assign({}, atual, { hist: H.slice(-13), histLongo: H });
      if (ultimo.mes >= (atual.mes || '')) Object.assign(novo, { mes: ultimo.mes, onerado: Object.assign({}, atual.onerado || {}, ultimo.onerado), varMes: ultimo.varR8N != null ? { 'R8-N': ultimo.varR8N } : {}, fonte: 'Sinduscon-MG (CUB/m², NBR 12721) – lido sozinho do PDF oficial em ' + new Date().toLocaleDateString('pt-BR') });
      const m0 = novo.mes; const v0 = (novo.onerado || {})['R8-N'];
      const ini = H.filter(h => h[0].endsWith('-12') && h[0] < m0).pop(); if (ini) novo.acAno = +((v0 / ini[1] - 1) * 100).toFixed(2);
      const h12 = H.find(h => h[0] === Enq.addM(m0, -12)); if (h12) novo.ac12 = +((v0 / h12[1] - 1) * 100).toFixed(2);
      await db.collection('sistema').doc('cub').set(novo); UI.toast('CUB atualizado sozinho: ' + Calc.mesLabel(m0) + ' (R8-N ' + UI.money(v0) + ') · histórico de ' + H.length + ' meses');
    } catch (e) { console.warn('CUB automático', e); }
  }
  document.addEventListener('vtn:pronto', () => setTimeout(() => { atualizar(false).catch(() => {}); cubAutomatico(); }, 3000));
  setInterval(() => atualizar(false).catch(() => {}), 3 * 3600e3);
  return { SERIES, atualizar, ultimo, acumulado, cubHist, lerPdfCub, cubAutomatico, get dados() { return dados; } };
})();
