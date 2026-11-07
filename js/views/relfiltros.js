/* =========================================================
   RELATÓRIOS – FILTROS, MAIS GRÁFICOS, MAIS CARDS E RELATÓRIOS NOVOS
   • Filtros de dados (valem para qualquer relatório): obras (status, tipo, cidade, cliente,
     uma lista escolhida), lançamentos (categorias, só pagos / só em aberto, incluir gerais),
     período. Aplicados "por baixo": o relatório é gerado só com os dados filtrados.
   • Filtros de conteúdo (o que sai no papel): cada seção do relatório liga/desliga, além de
     cards, gráficos, destaques, tabelas, assinaturas e limite de linhas por tabela.
   • Ficam guardados por tipo de relatório (Store.db.relFiltros) e valem também para
     "Enviar à central", pacote do mês e fechamento automático.
   • Gráficos novos (rosca, linha, funil) acrescentados aos relatórios e 6 relatórios novos.
   ========================================================= */
(() => {
  const V = Views.relatorios;
  const PADRAO = { status: [], tipos: [], cidades: [], clientes: [], obras: [], catR: [], catD: [], situacao: '', gerais: true, secoes: {}, cards: true, graficos: true, destaques: true, tabelas: true, assinatura: true, limite: 0, nota: '' };
  const STATUS_OBRA = () => (window.CONFIG && CONFIG.statusObra) || [...new Set(Store.all('obras').map(o => o.status).filter(Boolean))];
  const uniq = a => [...new Set(a.filter(Boolean))].sort((x, y) => String(x).localeCompare(String(y), 'pt-BR'));

  V.filtroDe = function (tipo) { const t = (Store.db.relFiltros || {})[tipo] || {}; return Object.assign({}, PADRAO, JSON.parse(JSON.stringify(t))); };
  V.salvarFiltro = function (tipo, f) { Store.db.relFiltros = Store.db.relFiltros || {}; Store.db.relFiltros[tipo] = f; Store.save(); };
  V.filtroAtivo = f => !!(f.status.length || f.tipos.length || f.cidades.length || f.clientes.length || f.obras.length || f.catR.length || f.catD.length || f.situacao || !f.gerais);
  V.conteudoAtivo = f => !!(Object.values(f.secoes || {}).some(v => v === false) || !f.cards || !f.graficos || !f.destaques || !f.tabelas || !f.assinatura || +f.limite);

  /* ---------- filtro de dados: o relatório enxerga só o que passou no filtro ---------- */
  function obraPassa(f, o) {
    if (!o) return false;
    if (f.obras.length && !f.obras.includes(o.id)) return false;
    if (f.status.length && !f.status.includes(o.status)) return false;
    if (f.tipos.length && !f.tipos.includes(o.tipo || '')) return false;
    if (f.cidades.length && !f.cidades.includes(o.cidade || '')) return false;
    if (f.clientes.length && !(o.clienteIds || []).some(c => f.clientes.includes(c))) return false;
    return true;
  }
  const COM_OBRA = ['lancamentos', 'medicoes', 'etapas', 'pendencias', 'entregas', 'os', 'diario', 'compras', 'arquivos', 'revisoes', 'eventos', 'orcamentos', 'contratos'];
  V.comFiltro = function (f, gerar) {
    if (!this.filtroAtivo(f)) return gerar();
    const all0 = Store.all, where0 = Store.where;
    const filtrar = (c, arr) => {
      if (c === 'obras') return arr.filter(o => obraPassa(f, o));
      if (c === 'pessoas' && f.clientes.length) return arr.filter(p => p.tipo !== 'Cliente' || f.clientes.includes(p.id));
      if (!COM_OBRA.includes(c)) return arr;
      const filtraObra = f.obras.length || f.status.length || f.tipos.length || f.cidades.length || f.clientes.length;
      return arr.filter(x => {
        if (c === 'orcamentos' && f.clientes.length && !(x.clienteIds || [x.clienteId]).some(id => f.clientes.includes(id))) return false;
        if (x.obraId) { if (filtraObra && !obraPassa(f, Store.get('obras', x.obraId))) return false; }
        else if (c === 'lancamentos' && (!f.gerais || filtraObra)) return false;
        if (c === 'lancamentos') {
          if (f.situacao === 'pago' && x.status !== 'pago') return false;
          if (f.situacao === 'aberto' && x.status === 'pago') return false;
          if (x.tipo === 'receita' && f.catR.length && !f.catR.includes(x.categoria)) return false;
          if (x.tipo === 'despesa' && f.catD.length && !f.catD.includes(x.categoria)) return false;
        }
        return true;
      });
    };
    Store.all = c => filtrar(c, all0(c) || []);
    Store.where = (c, fn) => filtrar(c, all0(c) || []).filter(fn);
    try { return gerar(); } finally { Store.all = all0; Store.where = where0; }
  };

  /* ---------- filtro de conteúdo: tira do papel o que foi desmarcado ---------- */
  V.chaveSecao = t => String(t || '').replace(/\s+/g, ' ').replace(/\s[–-]\s.*$/, '').replace(/\(.*?\)/g, '').replace(/R\$\s?[\d.,]+/g, '').replace(/[\d.,]+\s*$/, '').trim();
  V.secoesDoHtml = function (html) {
    const d = document.createElement('div'); d.innerHTML = html;
    return [...new Set([...d.querySelectorAll('h2')].map(h => this.chaveSecao(h.textContent)).filter(Boolean))];
  };
  V.aplicarConteudo = function (html, f) {
    if (!this.conteudoAtivo(f)) return html;
    const d = document.createElement('div'); d.innerHTML = html;
    // seções: o h2 e tudo até o próximo h2
    let fora = false;
    [...d.children].forEach(el => {
      if (el.tagName === 'H2') fora = f.secoes[this.chaveSecao(el.textContent)] === false;
      else if (el.classList.contains('rp-top') || el.tagName === 'H1') { fora = false; return; }
      if (fora) el.remove();
    });
    const tira = sel => d.querySelectorAll(sel).forEach(x => x.remove());
    if (!f.cards) tira('.rk');
    if (!f.graficos) tira('svg.rcols, .rbars, .rgraf');
    if (!f.destaques) tira('.hl');
    if (!f.assinatura) tira('.sig');
    if (!f.tabelas) d.querySelectorAll('table').forEach(t => { if (t.querySelector('thead')) t.remove(); });
    if (+f.limite > 0) d.querySelectorAll('table tbody').forEach(tb => { const tr = [...tb.children]; if (tr.length > +f.limite) { tr.slice(+f.limite).forEach(x => x.remove()); const n = tr[0] ? tr[0].children.length : 1; tb.insertAdjacentHTML('beforeend', `<tr><td colspan="${n}" class="tiny" style="text-align:center;color:#64748b">… e mais ${tr.length - +f.limite} linhas (limite do filtro)</td></tr>`); } });
    // h2 sem conteúdo depois da limpeza some também
    [...d.querySelectorAll('h2')].forEach(h => { const nx = h.nextElementSibling; if (!nx || nx.tagName === 'H2' || nx.classList.contains('rp-foot')) h.remove(); });
    return d.innerHTML;
  };
  V.resumoFiltro = function (f) {
    const nomeP = id => (Store.get('pessoas', id) || {}).nome || id, nomeO = id => (Store.get('obras', id) || {}).nome || id;
    const p = [];
    if (f.obras.length) p.push('obras: ' + f.obras.map(nomeO).join(', '));
    if (f.status.length) p.push('status: ' + f.status.join(', '));
    if (f.tipos.length) p.push('tipo: ' + f.tipos.join(', '));
    if (f.cidades.length) p.push('cidade: ' + f.cidades.join(', '));
    if (f.clientes.length) p.push('clientes: ' + f.clientes.map(nomeP).join(', '));
    if (f.catR.length) p.push('receitas: ' + f.catR.join(', '));
    if (f.catD.length) p.push('despesas: ' + f.catD.join(', '));
    if (f.situacao) p.push(f.situacao === 'pago' ? 'só pagos/recebidos' : 'só em aberto');
    if (!f.gerais) p.push('sem lançamentos gerais (sem obra)');
    return p.join(' · ');
  };

  /* ---------- gráficos novos ---------- */
  const CORES = ['#119a09', '#2563eb', '#db2777', '#f59e0b', '#7c3aed', '#0891b2', '#dc2626', '#65a30d', '#ea580c', '#475569'];
  const G = V.graf = {
    donut(items, fmt = UI.money, titulo = '') {
      const it = items.filter(x => x[1] > 0); const tot = it.reduce((a, x) => a + x[1], 0); if (!tot) return '';
      const top = it.slice(0, 8); if (it.length > 8) top.push(['Outros', it.slice(8).reduce((a, x) => a + x[1], 0)]);
      let a0 = -Math.PI / 2; const R = 70, r = 42, cx = 90, cy = 90;
      const arcos = top.map((x, i) => { const ang = x[1] / tot * Math.PI * 2; const a1 = a0 + ang; const g = ang > Math.PI ? 1 : 0;
        const p = (rad, a) => [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
        const [x1, y1] = p(R, a0), [x2, y2] = p(R, a1 - 0.0001), [x3, y3] = p(r, a1 - 0.0001), [x4, y4] = p(r, a0);
        const d = `M${x1},${y1} A${R},${R} 0 ${g} 1 ${x2},${y2} L${x3},${y3} A${r},${r} 0 ${g} 0 ${x4},${y4} Z`; a0 = a1;
        return `<path d="${d}" fill="${CORES[i % CORES.length]}" stroke="#fff" stroke-width="1.5"/>`; }).join('');
      const leg = top.map((x, i) => `<div style="display:flex;gap:8px;align-items:center;margin:3px 0;font-size:11px"><i style="width:10px;height:10px;border-radius:3px;background:${CORES[i % CORES.length]};flex:none;-webkit-print-color-adjust:exact;print-color-adjust:exact"></i><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${UI.esc(x[0])}</span><b style="font-variant-numeric:tabular-nums">${fmt(x[1])}</b><span style="color:#64748b;width:44px;text-align:right">${UI.pct(x[1] / tot * 100, 0)}</span></div>`).join('');
      return `<div class="rgraf" style="display:grid;grid-template-columns:180px 1fr;gap:18px;align-items:center;margin:8px 0 12px;break-inside:avoid"><svg viewBox="0 0 180 180" width="180" height="180">${arcos}<text x="90" y="86" text-anchor="middle" font-size="10" fill="#64748b" font-family="Inter,Arial">${UI.esc(titulo || 'Total')}</text><text x="90" y="102" text-anchor="middle" font-size="12.5" font-weight="800" fill="#0f172a" font-family="Inter,Arial">${fmt(tot)}</text></svg><div>${leg}</div></div>`;
    },
    linha(labels, series, h = 160) {
      const vals = series.flatMap(s => s.vals).filter(v => v != null && isFinite(v)); if (!vals.length) return '';
      const mn = Math.min(0, ...vals), mx = Math.max(1, ...vals); const W = 680, L = 58, T = 10, span = (mx - mn) || 1;
      const X = i => L + (labels.length > 1 ? i * (W - L - 10) / (labels.length - 1) : (W - L) / 2), Y = v => T + (h - T) * (1 - (v - mn) / span);
      const fmtA = v => Math.abs(v) >= 1000 ? UI.num(Math.round(v / 100) / 10) + 'k' : UI.num(Math.round(v));
      const grade = [0, 0.25, 0.5, 0.75, 1].map(f => { const v = mn + span * f; return `<line x1="${L}" x2="${W}" y1="${Y(v)}" y2="${Y(v)}" stroke="#e2e8f0"/><text x="${L - 6}" y="${Y(v) + 3}" font-size="9" text-anchor="end" fill="#64748b">${fmtA(v)}</text>`; }).join('');
      const zero = mn < 0 ? `<line x1="${L}" x2="${W}" y1="${Y(0)}" y2="${Y(0)}" stroke="#94a3b8" stroke-dasharray="3 3"/>` : '';
      const ok = v => v != null && isFinite(v);
      const lin = series.map(s => { const seg = []; let cur = []; s.vals.forEach((v, i) => { if (ok(v)) cur.push(X(i) + ',' + Y(v)); else if (cur.length) { seg.push(cur); cur = []; } }); if (cur.length) seg.push(cur);
        return seg.map(pts => `<polyline fill="none" stroke="${s.cor}" stroke-width="2.4" stroke-linejoin="round" points="${pts.join(' ')}"/>`).join('') + s.vals.map((v, i) => ok(v) ? `<circle cx="${X(i)}" cy="${Y(v)}" r="2.6" fill="${s.cor}"/>` : '').join(''); }).join('');
      const lab = labels.map((l, i) => (labels.length <= 14 || i % Math.ceil(labels.length / 12) === 0) ? `<text x="${X(i)}" y="${h + 14}" font-size="9" text-anchor="middle" fill="#475569">${UI.esc(l)}</text>` : '').join('');
      const leg = series.map((s, j) => `<rect x="${L + j * 150}" y="${h + 24}" width="10" height="10" rx="3" fill="${s.cor}"/><text x="${L + j * 150 + 15}" y="${h + 33}" font-size="10" fill="#334155">${UI.esc(s.nome)}</text>`).join('');
      return `<svg class="rcols rgraf" viewBox="0 0 ${W} ${h + 40}" width="100%" font-family="Inter,Arial,sans-serif">${grade}${zero}${lin}${lab}${leg}</svg>`;
    },
    funil(etapas) {   // [[nome, qtd, valor]]
      const mx = Math.max(1, ...etapas.map(e => e[1]));
      return `<div class="rgraf" style="margin:8px 0 12px;break-inside:avoid">${etapas.map((e, i) => `<div style="display:flex;justify-content:center;margin:3px 0"><div style="width:${Math.max(18, e[1] / mx * 100)}%;background:${CORES[i % CORES.length]};color:#fff;border-radius:8px;padding:7px 12px;display:flex;justify-content:space-between;gap:10px;font-size:11.5px;-webkit-print-color-adjust:exact;print-color-adjust:exact"><b>${UI.esc(e[0])}</b><span>${e[1]}${e[2] ? ' · ' + UI.money(e[2]) : ''}${i && etapas[0][1] ? ' · ' + UI.pct(e[1] / etapas[0][1] * 100, 0) : ''}</span></div></div>`).join('')}</div>`;
    },
    medidor(pctv, rotulo, cor = '#119a09') {
      const p = Math.max(0, Math.min(100, +pctv || 0)); const a = Math.PI * (1 - p / 100); const x = 70 + 54 * Math.cos(a), y = 70 - 54 * Math.sin(a);
      return `<svg viewBox="0 0 140 84" width="140" height="84"><path d="M16,70 A54,54 0 0 1 124,70" fill="none" stroke="#e2e8f0" stroke-width="12" stroke-linecap="round"/>${p > 0 ? `<path d="M16,70 A54,54 0 0 1 ${x.toFixed(1)},${y.toFixed(1)}" fill="none" stroke="${cor}" stroke-width="12" stroke-linecap="round"/>` : ''}<text x="70" y="64" text-anchor="middle" font-size="15" font-weight="800" fill="#0f172a" font-family="Inter,Arial">${UI.pct(p, 0)}</text><text x="70" y="80" text-anchor="middle" font-size="8.5" fill="#64748b" font-family="Inter,Arial">${UI.esc(rotulo)}</text></svg>`;
    }
  };
  const kp = arr => `<div class="rk">${arr.map(x => `<div><span>${x[0]}</span><b>${x[1]}</b>${x[2] ? `<small>${x[2]}</small>` : ''}</div>`).join('')}</div>`;
  const tbl = (h, rows) => rows.length ? `<table><thead><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '<p class="tiny">Nada para mostrar com estes filtros.</p>';

  /* ---------- mais gráficos nos relatórios que já existem ---------- */
  function extras(s) {
    const { money, esc } = UI; const inP = d => (!s.de || d >= s.de) && (!s.ate || d <= s.ate);
    const grp = (arr, fn, val) => { const m = {}; arr.forEach(x => { const k = fn(x) || 'Não informado'; m[k] = (m[k] || 0) + (val ? val(x) : 1); }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
    if (s.tipo === 'financeiro') {
      const ls = Store.where('lancamentos', l => (!s.obra || l.obraId === s.obra) && l.status === 'pago' && inP(l.dataPagamento || l.data));
      const fx = Calc.fluxoMensal(s.obra || null, 0).filter(x => (!s.de || x.mes >= s.de.slice(0, 7)) && (!s.ate || x.mes <= s.ate.slice(0, 7))).slice(-18);
      const porObra = grp(ls.filter(l => l.tipo === 'receita'), l => l.obraId ? ((Store.get('obras', l.obraId) || {}).nome || l.obraId).slice(0, 34) : 'Geral', l => +l.valor || 0);
      return `<h2>Composição das despesas</h2>${G.donut(grp(ls.filter(l => l.tipo === 'despesa'), l => l.categoria, l => +l.valor || 0), money, 'Despesas')}
        <h2>Receita por obra</h2>${G.donut(porObra, money, 'Receitas')}
        <h2>Resultado acumulado</h2>${G.linha(fx.map(x => Calc.mesLabel(x.mes).slice(0, 3)), [{ nome: 'Acumulado', cor: '#119a09', vals: fx.map(x => x.acumulado) }, { nome: 'Resultado do mês', cor: '#2563eb', vals: fx.map(x => x.saldo) }])}`;
    }
    if (s.tipo === 'executivo') {
      const O = Store.all('obras'); const fx = Calc.fluxoMensal(null, 12);
      const ik = Views.financeiro && Views.financeiro.indiceCaixa ? Views.financeiro.indiceCaixa(null) : null;
      return `<h2>Obras por status</h2>${G.donut(grp(O, o => o.status), v => v + '', 'Obras')}
        <h2>Caixa acumulado – 12 meses</h2>${G.linha(fx.map(x => Calc.mesLabel(x.mes).slice(0, 3)), [{ nome: 'Acumulado', cor: '#119a09', vals: fx.map(x => x.acumulado) }])}
        ${ik ? `<h2>Índice de caixa</h2>${kp([['Saldo em caixa', money(ik.saldo)], ['Índice imediato', ik.imediata == null ? '—' : UI.num(ik.imediata, 2) + 'x', 'saldo ÷ contas 30 dias'], ['Fôlego', ik.folego == null ? '—' : UI.num(ik.folego, 1) + ' meses', 'saldo ÷ gasto médio'], ['Menor saldo em 90 dias', money(ik.minimo[1]), UI.date(ik.minimo[0])]])}` : ''}`;
    }
    if (s.tipo === 'carteira') {
      const O = Store.all('obras').filter(o => ['Contratada', 'Em execução'].includes(o.status)).map(o => [o, Calc.obra(o)]);
      return `<h2>Carteira por tipo de serviço</h2>${G.donut(grp(Store.all('obras').filter(o => +o.valorContrato), o => o.tipo, o => +o.valorContrato), money, 'Contratado')}
        ${O.length ? `<h2>Avanço físico das obras em andamento</h2><div class="rbars">${O.sort((a, b) => b[1].fisico - a[1].fisico).map(([o, m]) => `<div class="rb"><span>${esc(o.nome)}</span><div><i style="width:${Math.min(100, m.fisico)}%;background:${m.fisico >= (m.previsto || 0) ? '#16a34a' : '#f59e0b'}"></i></div><b>${UI.pct(m.fisico, 0)}${m.previsto != null ? ' / ' + UI.pct(m.previsto, 0) : ''}</b></div>`).join('')}</div><p class="tiny">Verde: no prazo ou adiantada · amarelo: abaixo do previsto (executado / previsto hoje).</p>` : ''}`;
    }
    if (s.tipo === 'recebiveis') {
      const L = Store.where('lancamentos', l => l.status !== 'pago' && l.tipo === 'receita' && (!s.obra || l.obraId === s.obra));
      const fut = []; for (let i = 0; i < 6; i++) { const m = Enq.addM(UI.today().slice(0, 7), i); fut.push([m, L.filter(l => (l.vencimento || '').startsWith(m)).reduce((a, l) => a + (+l.valor || 0), 0)]); }
      return `<h2>A receber por obra</h2>${G.donut(grp(L, l => l.obraId ? ((Store.get('obras', l.obraId) || {}).nome || l.obraId).slice(0, 34) : 'Geral', l => +l.valor || 0), money, 'A receber')}
        <h2>Entradas previstas – próximos 6 meses</h2>${G.linha(fut.map(x => Calc.mesLabel(x[0]).slice(0, 3)), [{ nome: 'A receber no mês', cor: '#7c3aed', vals: fut.map(x => x[1]) }])}`;
    }
    if (s.tipo === 'marketing' || s.tipo === 'funil') {
      const O = Store.all('obras'); const orc = Store.all('orcamentos');
      const fech = O.filter(o => !['Prospecção', 'Orçamento', 'Cancelada'].includes(o.status));
      return `<h2>Funil de vendas</h2>${G.funil([['Leads e oportunidades', O.length, 0], ['Orçamentos feitos', orc.length, orc.reduce((a, o) => a + (+o.total || 0), 0)], ['Orçamentos aprovados', orc.filter(o => o.status === 'Aprovado').length, orc.filter(o => o.status === 'Aprovado').reduce((a, o) => a + (+o.total || 0), 0)], ['Contratos fechados', fech.length, fech.reduce((a, o) => a + (+o.valorContrato || 0), 0)]])}
        <h2>Origem dos clientes</h2>${G.donut(grp(O, o => o.origem), v => v + '', 'Clientes')}`;
    }
    if (s.tipo === 'obra' && s.obra) {
      const o = Store.get('obras', s.obra); if (!o) return ''; const m = Calc.obra(o);
      const meds = Store.where('medicoes', x => x.obraId === o.id && +x.acumulado > 0).sort((a, b) => a.data.localeCompare(b.data));
      const ls = Store.where('lancamentos', l => l.obraId === o.id && l.tipo === 'despesa' && l.status === 'pago');
      return `<h2>Painel da obra</h2><div class="rgraf" style="display:flex;gap:18px;flex-wrap:wrap;justify-content:space-around;margin:8px 0">${G.medidor(m.fisico, 'avanço físico')}${m.previsto != null ? G.medidor(m.previsto, 'previsto hoje', '#2563eb') : ''}${G.medidor(m.financeiroPct, 'recebido do contrato', '#7c3aed')}${G.medidor(m.prazo.pct, 'prazo decorrido', m.prazo.atraso > 0 ? '#dc2626' : '#f59e0b')}</div>
        ${meds.length > 1 ? `<h2>Curva de avanço (medições)</h2>${G.linha(meds.map(x => UI.date(x.data).slice(0, 5)), [{ nome: 'Acumulado medido (%)', cor: '#119a09', vals: meds.map(x => +x.acumulado) }])}` : ''}
        ${ls.length ? `<h2>Para onde foi o dinheiro</h2>${G.donut(grp(ls, l => l.categoria, l => +l.valor || 0), money, 'Gasto')}` : ''}`;
    }
    return '';
  }

  /* ---------- relatórios novos ---------- */
  V.TIPOS.push(
    ['indice', 'Índice de caixa e projeção 90 dias', 'financeiro', 'Saldo, liquidez, fôlego e o caixa dia a dia nos próximos 90 dias.'],
    ['socios', 'Pró-labore, comissões e lucros', 'financeiro', 'Quanto cada sócio recebe no mês e o lucro distribuível.'],
    ['alertas', 'Alertas e prazos (alvará, ART, medições)', 'operacional', 'Tudo que vence ou precisa de ação, por gravidade.'],
    ['caixapls', 'PCI e PLS CAIXA – situação das obras', 'operacional', 'Avanço medido × curvas da CAIXA e situação de cada obra financiada.'],
    ['compras', 'Compras e cotações', 'operacional', 'Cotações por status, economia obtida e fornecedores.'],
    ['diario', 'Diário de obra (RDO)', 'operacional', 'Dias registrados, efetivo, clima e fotos por obra.']
  );
  const corpo0 = V.corpo;
  V.corpo = function (s) {
    const { money, esc, date, pct } = UI; const o = Store.get('obras', s.obra);
    const periodo = s.de || s.ate ? `${date(s.de) || 'início'} a ${date(s.ate) || 'hoje'}` : 'todo o histórico';
    const inP = d => (!s.de || (d || '') >= s.de) && (!s.ate || (d || '') <= s.ate);
    if (s.tipo === 'indice') {
      const k = Views.financeiro.indiceCaixa(s.obra || null);
      const sem = []; for (let i = 0; i <= 90; i += 7) sem.push(k.proj[i]);
      const st = k.minimo[1] < 0 ? ['err', 'O caixa fica NEGATIVO em ' + date(k.minimo[0]) + ' (' + money(k.minimo[1]) + ') se nada mudar.'] : k.imediata != null && k.imediata < 1 ? ['warn', 'O saldo de hoje não cobre as contas dos próximos 30 dias; depende dos recebimentos.'] : ['ok', 'Caixa confortável para os próximos 90 dias.'];
      return `${this.rhead('ÍNDICE DE CAIXA', 'posição em ' + date(UI.today()))}<h1>Índice de caixa ${o ? '– ' + esc(o.nome) : '– VTN Engenharia'}</h1>
        ${kp([['Saldo em caixa', money(k.saldo)], ['Índice imediato', k.imediata == null ? '—' : UI.num(k.imediata, 2) + 'x', 'saldo ÷ pagar em 30 dias'], ['Liquidez 30 dias', k.liquidez30 == null ? '—' : UI.num(k.liquidez30, 2) + 'x', '(saldo + receber) ÷ pagar'], ['Fôlego', k.folego == null ? '—' : UI.num(k.folego, 1) + ' meses', 'saldo ÷ gasto médio mensal']])}
        ${kp([['A pagar em 30 dias', money(k.pagar30), 'vencido ' + money(k.vencPagar)], ['A receber em 30 dias', money(k.receber30), 'vencido ' + money(k.vencReceber)], ['Entrada média (90 d)', money(k.mediaEntrada), 'por mês'], ['Saída média (90 d)', money(k.mediaSaida), 'por mês']])}
        <div class="hl"><b>Leitura</b><ul><li>${st[1]}</li><li>Menor saldo previsto em 90 dias: <b>${money(k.minimo[1])}</b> em ${date(k.minimo[0])}.</li></ul></div>
        <h2>Caixa previsto – próximos 90 dias</h2>${G.linha(sem.map(x => date(x[0]).slice(0, 5)), [{ nome: 'Saldo previsto', cor: k.minimo[1] < 0 ? '#dc2626' : '#119a09', vals: sem.map(x => x[1]) }])}
        <h2>Saldo semana a semana</h2>${tbl(['Data', 'Saldo previsto'], sem.map(x => [date(x[0]), money(x[1])]))}`;
    }
    if (s.tipo === 'socios') {
      const mes = s.de ? s.de.slice(0, 7) : Enq.addM(UI.today().slice(0, 7), -1); const k = Ferramentas.calcMes(mes);
      return `${this.rhead('PRÓ-LABORE, COMISSÕES E LUCROS', Calc.mesLabel(mes))}<h1>Sócios – ${Calc.mesLabel(mes)}</h1>
        ${kp([['Receita do mês', money(k.R)], ['Despesas operacionais', money(k.D)], ['Resultado antes dos sócios', money(k.resultado)], ['Lucro distribuível', money(k.distribuivel), 'reserva ' + pct(k.reservaPct, 0) + ' = ' + money(k.reserva)]])}
        <h2>Do resultado à distribuição</h2>${tbl(['Item', 'Valor'], [['Receitas recebidas', money(k.R)], ['(–) Despesas operacionais', money(-k.D)], ['= Resultado', money(k.resultado)], ['(–) Pró-labore', money(-k.P)], ['(–) Comissões', money(-k.C)], ['= Antes da reserva', money(k.antes)], ['(–) Reserva', money(-k.reserva)], ['= Distribuível', money(k.distribuivel)]])}
        <h2>Quanto cada sócio recebe</h2>${G.donut(k.S.map(x => [x.nome, Math.max(0, x.total)]), money, 'Total')}
        ${tbl(['Sócio', 'Pró-labore', 'INSS (11%)', 'Comissão', 'Lucro', 'Total líquido'], k.S.map(x => [esc(x.nome), money(+x.prolabore || 0), money(-x.inss), money(x.comissaoV), money(x.lucro), '<b>' + money(x.total) + '</b>']))}
        <p class="tiny">Escolha o mês no campo "De". Estimativa gerencial – confirmar com a contabilidade.</p>`;
    }
    if (s.tipo === 'alertas') {
      const A = Ferramentas.alertas(); const nivel = { err: 'Urgente', warn: 'Atenção', info: 'Informação' };
      const grupos = ['err', 'warn', 'info'].map(n => [nivel[n], A.filter(a => a[0] === n)]).filter(g => g[1].length);
      return `${this.rhead('ALERTAS E PRAZOS', date(UI.today()))}<h1>Alertas e prazos</h1>
        ${kp([['Total de alertas', A.length], ['Urgentes', A.filter(a => a[0] === 'err').length], ['Atenção', A.filter(a => a[0] === 'warn').length], ['Obras ativas', Store.all('obras').filter(o => ['Contratada', 'Em execução'].includes(o.status)).length]])}
        ${grupos.length ? G.donut(grupos.map(g => [g[0], g[1].length]), v => v + '', 'Alertas') : ''}
        ${grupos.map(g => `<h2>${g[0]} (${g[1].length})</h2>${tbl(['Alerta', 'Referência'], g[1].map(a => [esc(a[2]), esc(a[3] || '')]))}`).join('') || '<p>Nenhum alerta. Tudo em dia.</p>'}`;
    }
    if (s.tipo === 'caixapls') {
      const O = Store.all('obras').filter(x => x.pci && (!s.obra || x.id === s.obra));
      const linhas = O.map(x => { const ms = Store.where('medicoes', m => m.obraId === x.id).sort((a, b) => (a.data || '').localeCompare(b.data || '')); const u = ms[ms.length - 1]; let st = null, p = x.pci, tot = 0; try { p = PCI.dados(x); tot = PCI.contas(x, p).total; st = u ? PCI.situacao(x, p, u, null) : null; } catch (e) {} return { x, u, st, n: ms.length, p, tot }; });
      return `${this.rhead('PCI E PLS CAIXA', date(UI.today()))}<h1>Obras financiadas pela CAIXA</h1>
        ${kp([['Obras com PCI', O.length], ['Medições (PLS)', linhas.reduce((a, l) => a + l.n, 0)], ['Normais ou adiantadas', linhas.filter(l => l.st && l.st.cls === 'ok').length], ['Em atenção / risco', linhas.filter(l => l.st && l.st.cls !== 'ok').length]])}
        <h2>Avanço medido por obra</h2><div class="rbars">${linhas.map(l => `<div class="rb"><span>${esc(l.x.nome)}</span><div><i style="width:${Math.min(100, +(l.u || {}).acumulado || 0)}%;background:${l.st && l.st.cls === 'ok' ? '#16a34a' : l.st && l.st.cls === 'warn' ? '#f59e0b' : '#dc2626'}"></i></div><b>${pct(+(l.u || {}).acumulado || 0, 1)}</b></div>`).join('')}</div>
        <h2>Situação × curvas da CAIXA</h2>${tbl(['Obra', 'Última PLS', 'Data', 'Acumulado', 'Etapa', 'Lenta', 'Normal', 'Rápida', 'Situação'], linhas.map(l => [esc(l.x.nome), esc((l.u || {}).numero || '—'), date((l.u || {}).data), pct(+(l.u || {}).acumulado || 0, 1), l.st && l.st.etapa ? l.st.etapa : '—', l.st && l.st.L != null ? pct(l.st.L, 1) : '—', l.st && l.st.N != null ? pct(l.st.N, 1) : '—', l.st && l.st.R != null ? pct(l.st.R, 1) : '—', l.st ? esc(l.st.texto) : 'sem PLS']))}
        <h2>Dados dos PCIs</h2>${tbl(['Obra', 'Custo dos serviços', 'BDI', 'Prazo', 'Valor do imóvel', 'Alvará até'], linhas.map(l => [esc(l.x.nome), money(l.tot), l.p.bdi != null ? pct(+l.p.bdi, 2) : '—', l.p.prazo ? l.p.prazo + ' meses' : '—', money(+l.p.valorImovel || +l.x.valorImovel || 0), date(l.p.alvaraValidade || l.x.alvaraVigencia)]))}`;
    }
    if (s.tipo === 'compras') {
      const C = Store.all('compras').filter(c => (!s.obra || c.obraId === s.obra) && inP(c.data)); const VC = Views.compras;
      const melhor = c => { const t = VC.totais(c).filter(v => v > 0); return t.length ? Math.min(...t) : 0; };
      const econ = c => { const t = VC.totais(c).filter(v => v > 0); return c.escolhido != null && t.length > 1 ? Math.max(...t) - VC.totais(c)[c.escolhido] : 0; };
      const grp = {}; C.forEach(c => grp[c.status] = (grp[c.status] || 0) + 1);
      const forn = {}; C.filter(c => c.escolhido != null).forEach(c => { const n = VC.nomeF((c.fornecedores || [])[c.escolhido]) || '—'; forn[n] = (forn[n] || 0) + (VC.totais(c)[c.escolhido] || 0); });
      return `${this.rhead('COMPRAS E COTAÇÕES', periodo)}<h1>Compras e cotações ${o ? '– ' + esc(o.nome) : ''}</h1>
        ${kp([['Cotações', C.length], ['Valor das compras escolhidas', money(C.filter(c => c.escolhido != null && c.status !== 'Cancelado').reduce((a, c) => a + (VC.totais(c)[c.escolhido] || 0), 0))], ['Economia nas cotações', money(C.reduce((a, c) => a + econ(c), 0)), 'mais caro − escolhido'], ['Em cotação', grp.Cotando || 0]])}
        <h2>Por status</h2>${G.donut(Object.entries(grp), v => v + '', 'Cotações')}
        ${Object.keys(forn).length ? `<h2>Fornecedores escolhidos</h2>${G.donut(Object.entries(forn).sort((a, b) => b[1] - a[1]), money, 'Comprado')}` : ''}
        <h2>Cotações</h2>${tbl(['ID', 'Compra', 'Obra', 'Data', 'Melhor preço', 'Escolhido', 'Economia', 'Status'], C.map(c => [c.id, esc(c.titulo), c.obraId || 'Geral', date(c.data), money(melhor(c)), esc(c.escolhido != null ? VC.nomeF((c.fornecedores || [])[c.escolhido]) : '—'), money(econ(c)), esc(c.status)]))}`;
    }
    if (s.tipo === 'diario') {
      const D = Store.where('diario', d => (!s.obra || d.obraId === s.obra) && inP(d.data)).sort((a, b) => (b.data || '').localeCompare(a.data || ''));
      const porObra = {}; D.forEach(d => { const k = d.obraId || '—'; porObra[k] = porObra[k] || { dias: 0, efetivo: 0, fotos: 0 }; porObra[k].dias++; porObra[k].efetivo += +d.efetivo || 0; porObra[k].fotos += (d.fotos || []).length; });
      const clima = {}; D.forEach(d => { const c = d.clima || 'Não informado'; clima[c] = (clima[c] || 0) + 1; });
      const meses = {}; D.forEach(d => { const m = (d.data || '').slice(0, 7); meses[m] = (meses[m] || 0) + 1; }); const mk = Object.keys(meses).sort().slice(-12);
      return `${this.rhead('DIÁRIO DE OBRA (RDO)', periodo)}<h1>Diário de obra ${o ? '– ' + esc(o.nome) : ''}</h1>
        ${kp([['Dias registrados', D.length], ['Obras com diário', Object.keys(porObra).length], ['Efetivo médio', UI.num(D.reduce((a, d) => a + (+d.efetivo || 0), 0) / Math.max(1, D.length), 1) + ' pessoas'], ['Fotos', D.reduce((a, d) => a + (d.fotos || []).length, 0)]])}
        ${mk.length > 1 ? `<h2>Registros por mês</h2>${G.linha(mk.map(m => Calc.mesLabel(m).slice(0, 3)), [{ nome: 'Dias com registro', cor: '#2563eb', vals: mk.map(m => meses[m]) }])}` : ''}
        <h2>Clima</h2>${G.donut(Object.entries(clima).sort((a, b) => b[1] - a[1]), v => v + ' dias', 'Dias')}
        <h2>Por obra</h2>${tbl(['Obra', 'Dias', 'Efetivo médio', 'Fotos'], Object.entries(porObra).map(([k, v]) => [esc(((Store.get('obras', k) || {}).nome) || k), v.dias, UI.num(v.efetivo / Math.max(1, v.dias), 1), v.fotos]))}
        <h2>Últimos registros</h2>${tbl(['Data', 'Obra', 'Clima', 'Efetivo', 'Registro'], D.slice(0, 40).map(d => [date(d.data), d.obraId || '', esc(d.clima || ''), d.efetivo || 0, esc((d.texto || '').slice(0, 160))]))}`;
    }
    const base = corpo0.call(this, s);
    const ex = extras(s);
    if (!ex) return base;
    // gráficos extras entram antes das tabelas de detalhe (depois da 1ª seção) — se não der, no fim
    const i = base.indexOf('<h2', base.indexOf('<h2') + 3);
    return i > 0 ? base.slice(0, i) + ex + base.slice(i) : base + ex;
  };

  /* ---------- html final: dados filtrados + conteúdo escolhido ---------- */
  V.html = function (o) {
    const s = Object.assign({}, this.st, o || {}); const f = this.filtroDe(s.tipo);
    let corpo = this.comFiltro(f, () => this.corpo(s));
    const rf = this.resumoFiltro(f);
    if (rf || f.nota) corpo = corpo.replace(/(<\/h1>)/, `$1<p class="tiny" style="margin:-6px 0 10px">${rf ? '<b>Filtros:</b> ' + UI.esc(rf) : ''}${f.nota ? (rf ? '<br>' : '') + UI.esc(f.nota) : ''}</p>`);
    corpo = this.aplicarConteudo(corpo, f);
    return this.CSS + '<div class="rp">' + corpo + this.rfoot() + '</div>';
  };

  /* ---------- painel de filtros na tela "Visualizar e imprimir" ---------- */
  const gerar0 = V.t_gerar;
  V.t_gerar = function (c) {
    gerar0.call(this, c);
    const s = this.st, { icon, esc } = UI; const f = this.filtroDe(s.tipo);
    const O = Store.all('obras'); const L = Store.all('lancamentos');
    const opcoes = {
      status: STATUS_OBRA().map(x => [x, x]), tipos: uniq(O.map(o => o.tipo)).map(x => [x, x]), cidades: uniq(O.map(o => o.cidade)).map(x => [x, x]),
      clientes: Store.where('pessoas', p => p.tipo === 'Cliente').sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).map(p => [p.id, p.nome]),
      obras: O.map(o => [o.id, o.id + ' · ' + o.nome]),
      catR: uniq(L.filter(l => l.tipo === 'receita').map(l => l.categoria)).map(x => [x, x]), catD: uniq(L.filter(l => l.tipo === 'despesa').map(l => l.categoria)).map(x => [x, x])
    };
    const secoes = this.secoesDoHtml(this.comFiltro(Object.assign({}, f), () => this.corpo(s)));
    const multi = (k, rot) => `<details class="rf-multi"><summary>${rot}${f[k].length ? ` <span class="badge info">${f[k].length}</span>` : ''}</summary><div class="rf-box">${opcoes[k].length > 8 ? `<input class="input sm" placeholder="Procurar…" data-busca="${k}">` : ''}<div class="rf-opts">${opcoes[k].map(([v, n]) => `<label class="check" data-txt="${esc(String(n).toLowerCase())}"><input type="checkbox" data-mk="${k}" value="${esc(v)}" ${f[k].includes(v) ? 'checked' : ''}> ${esc(n)}</label>`).join('') || '<span class="tiny muted">Nenhuma opção</span>'}</div><div class="row" style="gap:6px;margin-top:6px"><button class="btn sm ghost" data-todos="${k}">Todos</button><button class="btn sm ghost" data-nenhum="${k}">Limpar</button></div></div></details>`;
    const painel = document.createElement('div'); painel.className = 'card mb rf-card';
    const ativo = this.filtroAtivo(f) || this.conteudoAtivo(f);
    painel.innerHTML = `<div class="card-h"><h3>${icon('sliders-horizontal')} Filtros e conteúdo – ${esc(this.nomeDe(s.tipo))}</h3><div class="row">${ativo ? UI.badge('filtros ligados', 'warn') : '<span class="tiny muted">sem filtros</span>'}<button class="btn sm" id="rfLimpar">${icon('eraser')} Limpar</button><button class="btn sm ghost" id="rfAbre">${icon(s.rfAberto ? 'chevron-up' : 'chevron-down')}</button></div></div>
      <div class="card-b" id="rfCorpo" style="${s.rfAberto ? '' : 'display:none'}">
        <div class="tiny muted mb">Dados que entram no relatório</div>
        <div class="rf-grid">${multi('obras', 'Obras')}${multi('status', 'Status da obra')}${multi('tipos', 'Tipo de serviço')}${multi('cidades', 'Cidade')}${multi('clientes', 'Clientes')}${multi('catR', 'Categorias de receita')}${multi('catD', 'Categorias de despesa')}
          <div class="rf-multi"><select class="select" id="rfSit"><option value="">Pagos e em aberto</option><option value="pago" ${f.situacao === 'pago' ? 'selected' : ''}>Só pagos / recebidos</option><option value="aberto" ${f.situacao === 'aberto' ? 'selected' : ''}>Só em aberto</option></select></div>
          <label class="check"><input type="checkbox" id="rfGer" ${f.gerais ? 'checked' : ''}> Incluir lançamentos gerais (sem obra)</label></div>
        <div class="tiny muted mb mt">O que sai no relatório</div>
        <div class="rf-grid">${[['cards', 'Cards de indicadores'], ['graficos', 'Gráficos'], ['destaques', 'Destaques / leitura'], ['tabelas', 'Tabelas'], ['assinatura', 'Assinaturas']].map(([k, n]) => `<label class="check"><input type="checkbox" data-ct="${k}" ${f[k] ? 'checked' : ''}> ${n}</label>`).join('')}
          <label class="row" style="gap:6px"><span class="tiny">Máx. linhas por tabela</span><input type="number" min="0" class="input sm" id="rfLim" value="${+f.limite || ''}" placeholder="todas" style="width:90px"></label></div>
        ${secoes.length ? `<div class="tiny muted mb mt">Seções</div><div class="rf-grid">${secoes.map(n => `<label class="check"><input type="checkbox" data-sec="${esc(n)}" ${f.secoes[n] !== false ? 'checked' : ''}> ${esc(n)}</label>`).join('')}</div>` : ''}
        <div class="field mt"><label>Observação que sai no topo do relatório (opcional)</label><input class="input" id="rfNota" value="${esc(f.nota || '')}" placeholder="Ex.: versão para o banco · valores até ontem"></div>
        <p class="tiny muted" style="margin-bottom:0">Os filtros ficam guardados para este tipo de relatório e valem também para "Enviar à central", o pacote do mês e o fechamento automático.</p>
      </div>`;
    const tb = UI.$('.toolbar', c); tb.parentNode.insertBefore(painel, tb.nextSibling);
    const salvar = () => { this.salvarFiltro(s.tipo, f); App.refresh(); };
    UI.$('#rfAbre', painel).onclick = () => { s.rfAberto = !s.rfAberto; App.refresh(); };
    UI.$('#rfLimpar', painel).onclick = () => { this.salvarFiltro(s.tipo, Object.assign({}, PADRAO, { secoes: {} })); App.refresh(); };
    UI.$$('[data-mk]', painel).forEach(x => x.onchange = () => { const k = x.dataset.mk; f[k] = UI.$$(`[data-mk="${k}"]`, painel).filter(y => y.checked).map(y => y.value); salvar(); });
    UI.$$('[data-todos]', painel).forEach(b => b.onclick = () => { const k = b.dataset.todos; f[k] = opcoes[k].map(x => x[0]); salvar(); });
    UI.$$('[data-nenhum]', painel).forEach(b => b.onclick = () => { f[b.dataset.nenhum] = []; salvar(); });
    UI.$$('[data-busca]', painel).forEach(i => i.oninput = () => { const q = i.value.toLowerCase(); i.parentNode.querySelectorAll('[data-txt]').forEach(l => l.style.display = l.dataset.txt.includes(q) ? '' : 'none'); });
    UI.$('#rfSit', painel).onchange = e => { f.situacao = e.target.value; salvar(); };
    UI.$('#rfGer', painel).onchange = e => { f.gerais = e.target.checked; salvar(); };
    UI.$$('[data-ct]', painel).forEach(x => x.onchange = () => { f[x.dataset.ct] = x.checked; salvar(); });
    UI.$('#rfLim', painel).onchange = e => { f.limite = Math.max(0, +e.target.value || 0); salvar(); };
    UI.$$('[data-sec]', painel).forEach(x => x.onchange = () => { f.secoes[x.dataset.sec] = x.checked; salvar(); });
    UI.$('#rfNota', painel).onchange = e => { f.nota = e.target.value; salvar(); };
    // atalho: "Filtrar" também no topo da central
  };

  // na central, mostra quais tipos estão com filtro ligado
  const central0 = V.t_central;
  V.t_central = function (c) {
    central0.call(this, c);
    UI.$$('[data-ver]', c).forEach(b => { const f = this.filtroDe(b.dataset.ver); if (this.filtroAtivo(f) || this.conteudoAtivo(f)) b.closest('.card-b').querySelector('h3').insertAdjacentHTML('beforeend', ' ' + UI.badge('com filtro', 'warn')); });
  };
})();
