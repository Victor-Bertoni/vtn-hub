/* =========================================================
   GASTOS E PAINEL DE CAIXA
   • Painel de caixa: saldo dia a dia (90 dias para trás e 90 para frente), entradas × saídas
     por semana, comparação com a média, formas de pagamento, próximos 15 dias.
   • Gastos: por categoria, obra, fornecedor; tendência; maiores gastos; o que subiu.
   • Orçamento de gastos: limite mensal por categoria, com alerta de estouro.
   • Despesas fixas: aluguel, contador, internet… geram os lançamentos do mês com um clique.
   • Comprovação: gastos pagos sem nota ou sem comprovante, com anexo direto.
   ========================================================= */
(() => {
  const hoje = () => UI.today();
  const dia = n => { const d = new Date(hoje() + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const quando = l => l.status === 'pago' ? (l.dataPagamento || l.data || '') : (l.vencimento || l.data || '');
  const addMes = (ym, n) => Enq.addM(ym, n);
  const SOCIOS = ['Pró-labore', 'Comissões', 'Distribuição de lucros'];
  const FIXAS_CAT = ['Administrativo', 'Taxas (ART/Alvará/CNO)'];

  Views.gastos = {
    perm: 'financeiro.ver',
    st: { tab: 'caixa', mes: UI.today().slice(0, 7), obra: '', cat: '', forn: '', socios: false },
    render(el) {
      const { icon } = UI; const s = this.st;
      const T = [['caixa', 'Painel de caixa', 'activity'], ['gastos', 'Análise de gastos', 'pie-chart'], ['orc', 'Orçamento de gastos', 'target'], ['fixas', 'Despesas fixas', 'repeat'], ['comprov', 'Comprovação', 'file-check']];
      el.innerHTML = `<div class="page-head"><div><h1>Gastos e painel de caixa</h1><p>Para onde vai o dinheiro, quanto entra e sai, e o caixa dos próximos meses</p></div>${Auth.can('financeiro.editar') ? `<button class="btn primary" onclick="Views.financeiro.edit(null,{tipo:'despesa'})">${icon('plus')} Despesa</button>` : ''}</div>
        <div class="tabs">${T.map(t => `<button class="${t[0] === s.tab ? 'active' : ''}" data-t="${t[0]}">${icon(t[2])} ${t[1]}</button>`).join('')}</div><div id="gsc"></div>`;
      UI.$$('[data-t]', el).forEach(b => b.onclick = () => { s.tab = b.dataset.t; App.refresh(); });
      this['t_' + s.tab](UI.$('#gsc', el));
    },
    t_caixa(c) {
      const { money, icon, date, esc } = UI; const G = Views.relatorios.graf; const L = Store.all('lancamentos');
      const sinal = l => l.tipo === 'receita' ? (+l.valor || 0) : -(+l.valor || 0);
      const pagos = L.filter(l => l.status === 'pago');
      const saldoEm = d => pagos.filter(l => (l.dataPagamento || l.data || '') <= d).reduce((a, l) => a + sinal(l), 0);
      const k = Views.financeiro.indiceCaixa(null);
      // série: 90 dias atrás (semanal) + projeção 90 dias
      const atras = []; for (let i = -91; i <= 0; i += 7) atras.push([dia(i), saldoEm(dia(i))]);
      const frente = k.proj.filter((x, i) => i % 7 === 0);
      const labels = atras.map(x => date(x[0]).slice(0, 5)).concat(frente.slice(1).map(x => date(x[0]).slice(0, 5)));
      const real = atras.map(x => x[1]).concat(frente.slice(1).map(() => null)), prev = atras.map((x, i) => i === atras.length - 1 ? x[1] : null).concat(frente.slice(1).map(x => x[1]));
      const lin = (labs, ser) => G.linha(labs, ser);
      // semanas
      const sem = []; for (let i = 11; i >= 0; i--) { const a = dia(-7 * i - 6), b = dia(-7 * i); const P = pagos.filter(l => { const d = l.dataPagamento || l.data || ''; return d >= a && d <= b; }); sem.push([date(b).slice(0, 5), P.filter(l => l.tipo === 'receita').reduce((s2, l) => s2 + l.valor, 0), P.filter(l => l.tipo === 'despesa').reduce((s2, l) => s2 + l.valor, 0)]); }
      const mesAt = hoje().slice(0, 7), mesAnt = addMes(mesAt, -1);
      const doMes = (m, t) => pagos.filter(l => l.tipo === t && (l.dataPagamento || l.data || '').startsWith(m)).reduce((a, l) => a + l.valor, 0);
      const media3 = t => [1, 2, 3].reduce((a, i) => a + doMes(addMes(mesAt, -i), t), 0) / 3;
      const formas = {}; pagos.filter(l => l.tipo === 'despesa' && (l.dataPagamento || '') >= dia(-180)).forEach(l => formas[l.forma || 'Não informada'] = (formas[l.forma || 'Não informada'] || 0) + l.valor);
      const prox = L.filter(l => l.status !== 'pago' && quando(l) && quando(l) <= dia(15)).sort((a, b) => quando(a).localeCompare(quando(b)));
      const varr = (a, b) => b ? ((a - b) / b * 100) : 0;
      c.innerHTML = `<div class="grid g4">
          <div class="card kpi ${k.saldo >= 0 ? 'ok' : 'err'}"><div class="ico">${icon('wallet')}</div><div class="lbl">Saldo em caixa hoje</div><div class="val">${UI.moneyK(k.saldo)}</div><div class="sub">há 30 dias: ${UI.moneyK(saldoEm(dia(-30)))}</div></div>
          <div class="card kpi ok"><div class="ico">${icon('arrow-down-circle')}</div><div class="lbl">Entrou no mês</div><div class="val">${UI.moneyK(doMes(mesAt, 'receita'))}</div><div class="sub">média 3 meses ${UI.moneyK(media3('receita'))} · mês passado ${UI.moneyK(doMes(mesAnt, 'receita'))}</div></div>
          <div class="card kpi err"><div class="ico">${icon('arrow-up-circle')}</div><div class="lbl">Saiu no mês</div><div class="val">${UI.moneyK(doMes(mesAt, 'despesa'))}</div><div class="sub">${doMes(mesAt, 'despesa') > media3('despesa') ? '▲' : '▼'} ${UI.pct(Math.abs(varr(doMes(mesAt, 'despesa'), media3('despesa'))), 0)} vs média 3 meses</div></div>
          <div class="card kpi ${k.minimo[1] < 0 ? 'err' : 'violet'}"><div class="ico">${icon('calendar-range')}</div><div class="lbl">Menor saldo previsto (90 dias)</div><div class="val">${UI.moneyK(k.minimo[1])}</div><div class="sub">em ${date(k.minimo[0])} · fôlego ${k.folego == null ? '—' : UI.num(Math.round(k.folego * 10) / 10) + ' meses'}</div></div></div>
        <div class="card mt"><div class="card-h"><h3>Saldo: 90 dias para trás e 90 para frente</h3></div><div class="card-b">${lin(labels, [{ nome: 'Saldo realizado', cor: '#119a09', vals: real }, { nome: 'Saldo previsto (contas em aberto)', cor: '#2563eb', vals: prev }])}</div></div>
        <div class="grid g2 mt"><div class="card"><div class="card-h"><h3>Entradas × saídas por semana</h3></div><div class="card-b">${G.linha(sem.map(x => x[0]), [{ nome: 'Entradas', cor: '#16a34a', vals: sem.map(x => x[1]) }, { nome: 'Saídas', cor: '#dc2626', vals: sem.map(x => x[2]) }])}</div></div>
          <div class="card"><div class="card-h"><h3>Como se paga (6 meses)</h3></div><div class="card-b">${G.donut(Object.entries(formas).sort((a, b) => b[1] - a[1]), money, 'Pago') || UI.empty('Sem pagamentos.', 'credit-card')}</div></div></div>
        <div class="card mt"><div class="card-h"><h3>Próximos 15 dias (e vencidos)</h3><span class="tiny muted">entra ${money(prox.filter(l => l.tipo === 'receita').reduce((a, l) => a + l.valor, 0))} · sai ${money(prox.filter(l => l.tipo === 'despesa').reduce((a, l) => a + l.valor, 0))}</span></div>
          ${UI.table([{ h: 'Data', f: l => `<span style="${quando(l) < hoje() ? 'color:var(--err);font-weight:600' : ''}">${date(quando(l))}</span>` }, { h: 'ID', f: l => UI.idLink(l.id) }, { h: 'Descrição', f: l => esc(l.descricao) + `<div class="tiny muted">${esc((Store.get('pessoas', l.pessoaId) || {}).nome || '')} · ${esc(l.categoria)}</div>` }, { h: 'Obra', f: l => l.obraId ? UI.idLink(l.obraId) : 'Geral' },
            { h: 'Entra', f: l => l.tipo === 'receita' ? money(l.valor) : '' }, { h: 'Sai', f: l => l.tipo === 'despesa' ? money(l.valor) : '' }], prox, { emptyMsg: 'Nada vencendo nos próximos 15 dias.' })}</div>`;
    },
    t_gastos(c) {
      const { money, esc, date, icon } = UI; const s = this.st; const G = Views.relatorios.graf;
      const base = l => l.tipo === 'despesa' && l.status === 'pago' && (s.socios || !SOCIOS.includes(l.categoria)) && (!s.obra || l.obraId === s.obra) && (!s.cat || l.categoria === s.cat) && (!s.forn || l.pessoaId === s.forn);
      const noMes = m => l => (l.dataPagamento || l.data || '').startsWith(m);
      const D = Store.where('lancamentos', l => base(l) && noMes(s.mes)(l));
      const tot = D.reduce((a, l) => a + l.valor, 0);
      const grp = (arr, fn) => { const m = {}; arr.forEach(l => { const k = fn(l) || 'Não informado'; m[k] = (m[k] || 0) + l.valor; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
      const meses = []; for (let i = 11; i >= 0; i--) meses.push(addMes(s.mes, -i));
      const todos = Store.where('lancamentos', base);
      const topCats = grp(todos.filter(l => meses.includes((l.dataPagamento || l.data || '').slice(0, 7))), l => l.categoria).slice(0, 4).map(x => x[0]);
      const cores = ['#dc2626', '#2563eb', '#f59e0b', '#7c3aed'];
      const media = cat => [1, 2, 3].reduce((a, i) => a + todos.filter(l => noMes(addMes(s.mes, -i))(l) && l.categoria === cat).reduce((x, l) => x + l.valor, 0), 0) / 3;
      const cats = grp(D, l => l.categoria).map(([cat, v]) => [cat, v, media(cat)]);
      const nomeF = id => (Store.get('pessoas', id) || {}).nome || 'Sem fornecedor';
      const pess = Store.all('pessoas').filter(p => Store.all('lancamentos').some(l => l.tipo === 'despesa' && l.pessoaId === p.id));
      c.innerHTML = `<div class="toolbar"><input type="month" class="input" id="gsM" value="${s.mes}"><select class="select" id="gsO"><option value="">Todas as obras + geral</option>${Store.all('obras').map(o => `<option value="${o.id}" ${o.id === s.obra ? 'selected' : ''}>${o.id} · ${esc(o.nome)}</option>`).join('')}</select>
          <select class="select" id="gsC"><option value="">Todas as categorias</option>${LISTAS.catDespesa.map(x => `<option ${x === s.cat ? 'selected' : ''}>${x}</option>`).join('')}</select>
          <select class="select" id="gsF"><option value="">Todos os fornecedores</option>${pess.map(p => `<option value="${p.id}" ${p.id === s.forn ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select>
          <label class="check"><input type="checkbox" id="gsS" ${s.socios ? 'checked' : ''}> Incluir pró-labore/lucros</label></div>
        <div class="grid g4">${[['Gasto no mês', money(tot), D.length + ' pagamentos'], ['Ticket médio', money(D.length ? tot / D.length : 0), 'por pagamento'], ['Sem nota fiscal', UI.pct(tot ? D.filter(l => !l.nf).reduce((a, l) => a + l.valor, 0) / tot * 100 : 0, 0), money(D.filter(l => !l.nf).reduce((a, l) => a + l.valor, 0))], ['Sem comprovante', D.filter(l => !(l.arquivoIds || []).length).length, 'pagamentos sem anexo']].map(k => `<div class="card kpi"><div class="lbl">${k[0]}</div><div class="val">${k[1]}</div><div class="sub">${k[2]}</div></div>`).join('')}</div>
        <div class="grid g2 mt"><div class="card"><div class="card-h"><h3>Por categoria</h3></div><div class="card-b">${G.donut(grp(D, l => l.categoria), money, 'Gasto') || UI.empty('Sem gastos no mês.', 'pie-chart')}</div></div>
          <div class="card"><div class="card-h"><h3>Por obra</h3></div><div class="card-b">${G.donut(grp(D, l => l.obraId ? ((Store.get('obras', l.obraId) || {}).nome || l.obraId).slice(0, 30) : 'Geral / escritório'), money, 'Gasto') || UI.empty('Sem gastos no mês.', 'hard-hat')}</div></div></div>
        <div class="card mt"><div class="card-h"><h3>Tendência – 12 meses (maiores categorias)</h3></div><div class="card-b">${G.linha(meses.map(m => Calc.mesLabel(m).slice(0, 3)), [{ nome: 'Total', cor: '#0f172a', vals: meses.map(m => todos.filter(noMes(m)).reduce((a, l) => a + l.valor, 0)) }].concat(topCats.map((cat, i) => ({ nome: cat, cor: cores[i], vals: meses.map(m => todos.filter(l => noMes(m)(l) && l.categoria === cat).reduce((a, l) => a + l.valor, 0)) }))))}</div></div>
        <div class="grid g2 mt"><div class="card"><div class="card-h"><h3>O que subiu ou caiu (vs média 3 meses)</h3></div>${UI.table([{ h: 'Categoria', f: x => esc(x[0]) }, { h: 'No mês', f: x => money(x[1]) }, { h: 'Média 3 m', f: x => money(x[2]) }, { h: 'Variação', f: x => { const v = x[2] ? (x[1] - x[2]) / x[2] * 100 : 100; return `<b style="color:${v > 15 ? 'var(--err)' : v < -15 ? 'var(--ok)' : 'inherit'}">${v >= 0 ? '▲' : '▼'} ${UI.pct(Math.abs(v), 0)}</b>`; } }], cats, { emptyMsg: 'Sem gastos.' })}</div>
          <div class="card"><div class="card-h"><h3>Maiores fornecedores do mês</h3></div><div class="card-b"><div class="rbars">${grp(D, l => nomeF(l.pessoaId)).slice(0, 10).map((x, i, a) => `<div class="rb" style="grid-template-columns:160px 1fr 110px"><span>${esc(x[0])}</span><div><i style="width:${x[1] / a[0][1] * 100}%;background:#dc2626"></i></div><b>${money(x[1])}</b></div>`).join('') || '<span class="muted tiny">Sem gastos.</span>'}</div></div></div></div>
        <div class="card mt"><div class="card-h"><h3>Maiores gastos do mês</h3></div>${UI.table([{ h: 'ID', f: l => UI.idLink(l.id) }, { h: 'Data', f: l => date(l.dataPagamento || l.data) }, { h: 'Descrição', f: l => esc(l.descricao) + `<div class="tiny muted">${esc(nomeF(l.pessoaId))} · ${esc(l.categoria)}</div>` }, { h: 'Obra', f: l => l.obraId ? UI.idLink(l.obraId) : 'Geral' }, { h: 'NF', f: l => l.nf ? UI.badge('NF ' + (l.nfNumero || ''), 'ok') : UI.badge('sem', 'warn') }, { h: 'Valor', f: l => money(l.valor) }], D.slice().sort((a, b) => b.valor - a.valor).slice(0, 15), { emptyMsg: 'Sem gastos.' })}</div>`;
      const re = () => App.refresh();
      UI.$('#gsM', c).onchange = e => { s.mes = e.target.value || s.mes; re(); }; UI.$('#gsO', c).onchange = e => { s.obra = e.target.value; re(); };
      UI.$('#gsC', c).onchange = e => { s.cat = e.target.value; re(); }; UI.$('#gsF', c).onchange = e => { s.forn = e.target.value; re(); }; UI.$('#gsS', c).onchange = e => { s.socios = e.target.checked; re(); };
    },
    t_orc(c) {
      const { money, esc, icon } = UI; const s = this.st; const O = Store.db.orcGastos = Store.db.orcGastos || {}; const ed = Auth.can('financeiro.editar');
      const gasto = cat => Store.where('lancamentos', l => l.tipo === 'despesa' && l.categoria === cat && (l.status === 'pago' ? (l.dataPagamento || l.data || '') : (l.vencimento || l.data || '')).startsWith(s.mes)).reduce((a, l) => a + l.valor, 0);
      const media = cat => [1, 2, 3].reduce((a, i) => a + Store.where('lancamentos', l => l.tipo === 'despesa' && l.status === 'pago' && l.categoria === cat && (l.dataPagamento || l.data || '').startsWith(addMes(s.mes, -i))).reduce((x, l) => x + l.valor, 0), 0) / 3;
      const L = LISTAS.catDespesa.map(cat => ({ cat, lim: +O[cat] || 0, g: gasto(cat), m: media(cat) }));
      const tl = L.reduce((a, x) => a + x.lim, 0), tg = L.filter(x => x.lim).reduce((a, x) => a + x.g, 0);
      c.innerHTML = `<div class="toolbar"><input type="month" class="input" id="goM" value="${s.mes}">${ed ? `<button class="btn" id="goSug">${icon('wand-2')} Sugerir pela média de 3 meses</button><button class="btn primary" id="goOk">${icon('save')} Salvar limites</button>` : ''}</div>
        <div class="grid g3">${[['Limite do mês', money(tl)], ['Gasto nas categorias com limite', money(tg), tl ? UI.pct(tg / tl * 100, 0) + ' usado' : ''], ['Categorias estouradas', L.filter(x => x.lim && x.g > x.lim).length, L.filter(x => x.lim && x.g > x.lim * 0.8 && x.g <= x.lim).length + ' acima de 80%']].map(k => `<div class="card kpi"><div class="lbl">${k[0]}</div><div class="val">${k[1]}</div><div class="sub">${k[2] || ''}</div></div>`).join('')}</div>
        <div class="card mt"><div class="card-b">${L.map(x => { const p = x.lim ? x.g / x.lim * 100 : 0; const cor = p > 100 ? '#dc2626' : p > 80 ? '#f59e0b' : '#16a34a';
          return `<div style="display:grid;grid-template-columns:220px 1fr 150px 140px;gap:12px;align-items:center;padding:7px 0;border-bottom:1px solid var(--line)"><b>${esc(x.cat)}</b><div style="background:var(--line,#eef2f7);border-radius:99px;height:12px;overflow:hidden">${x.lim ? `<i style="display:block;height:100%;width:${Math.min(100, p)}%;background:${cor}"></i>` : ''}</div>
            <span class="tiny">${money(x.g)}${x.lim ? ` de ${money(x.lim)} (${UI.pct(p, 0)})` : ' · sem limite'}<br><span class="muted">média ${money(x.m)}</span></span>${ed ? `<input type="number" step="any" class="input sm" data-lim="${esc(x.cat)}" value="${x.lim || ''}" placeholder="limite R$">` : ''}</div>`; }).join('')}</div></div>`;
      UI.$('#goM', c).onchange = e => { s.mes = e.target.value || s.mes; App.refresh(); };
      if (ed) {
        UI.$('#goSug', c).onclick = () => UI.$$('[data-lim]', c).forEach(i => { const x = L.find(y => y.cat === i.dataset.lim); if (x && x.m && !i.value) i.value = Math.round(x.m * 1.05); });
        UI.$('#goOk', c).onclick = () => { UI.$$('[data-lim]', c).forEach(i => { if (+i.value > 0) O[i.dataset.lim] = +i.value; else delete O[i.dataset.lim]; }); Store.save(); UI.toast('Limites salvos'); App.refresh(); };
      }
    },
    t_fixas(c) {
      const { money, esc, icon } = UI; const s = this.st; const F = Store.all('despFixas'); const ed = Auth.can('financeiro.editar');
      const gerado = (f, m) => Store.where('lancamentos', l => l.fixaId === f.id && (l.data || '').startsWith(m)).length > 0;
      const ativas = F.filter(f => f.ativo !== false && (!f.inicio || f.inicio.slice(0, 7) <= s.mes) && (!f.fim || f.fim.slice(0, 7) >= s.mes));
      const sugest = []; { const m = {}; Store.where('lancamentos', l => l.tipo === 'despesa' && l.status === 'pago' && (l.dataPagamento || '') >= dia(-120)).forEach(l => { const k = (l.pessoaId || '') + '|' + l.descricao.replace(/\d{2}\/\d{4}|\b(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\w*\b/gi, '').trim().toLowerCase(); (m[k] = m[k] || []).push(l); }); Object.values(m).forEach(arr => { const ms = new Set(arr.map(l => (l.dataPagamento || '').slice(0, 7))); if (ms.size >= 3 && !F.some(f => f.descricao.toLowerCase() === arr[0].descricao.toLowerCase())) sugest.push(arr[0]); }); }
      c.innerHTML = `<div class="toolbar"><input type="month" class="input" id="dfM" value="${s.mes}">${ed ? `<button class="btn" id="dfNova">${icon('plus')} Nova despesa fixa</button><button class="btn primary" id="dfGer">${icon('zap')} Gerar lançamentos de ${Calc.mesLabel(s.mes)}</button>` : ''}</div>
        <div class="grid g3">${[['Despesas fixas ativas', ativas.length], ['Total fixo por mês', money(ativas.reduce((a, f) => a + (+f.valor || 0), 0))], ['Já lançadas no mês', ativas.filter(f => gerado(f, s.mes)).length + ' de ' + ativas.length]].map(k => `<div class="card kpi"><div class="lbl">${k[0]}</div><div class="val">${k[1]}</div></div>`).join('')}</div>
        <div class="card mt">${UI.table([{ h: 'ID', f: f => f.id }, { h: 'Despesa', f: f => `<span class="plink" data-df="${f.id}">${esc(f.descricao)}</span><div class="tiny muted">${esc(f.categoria)} · ${esc((Store.get('pessoas', f.pessoaId) || {}).nome || '')}</div>` }, { h: 'Vence dia', f: f => f.dia || '—' }, { h: 'Obra', f: f => f.obraId ? UI.idLink(f.obraId) : 'Geral' }, { h: 'Valor', f: f => money(f.valor) },
          { h: Calc.mesLabel(s.mes), f: f => f.ativo === false ? UI.badge('Inativa') : gerado(f, s.mes) ? UI.badge('lançada', 'ok') : UI.badge('falta lançar', 'warn') }], F, { emptyMsg: 'Nenhuma despesa fixa. Cadastre aluguel, contador, internet, softwares, seguros…' })}</div>
        ${sugest.length && ed ? `<div class="card mt"><div class="card-h"><h3>Parecem despesas fixas (3+ meses seguidos)</h3></div><div class="card-b">${sugest.slice(0, 10).map((l, i) => `<div class="row" style="justify-content:space-between;border-bottom:1px solid var(--line);padding:6px 0"><span>${esc(l.descricao)} <span class="tiny muted">${esc(l.categoria)} · ${money(l.valor)}</span></span><button class="btn sm" data-sug="${i}">${icon('plus')} Tornar fixa</button></div>`).join('')}</div></div>` : ''}`;
      UI.$('#dfM', c).onchange = e => { s.mes = e.target.value || s.mes; App.refresh(); };
      UI.$$('[data-df]', c).forEach(b => b.onclick = () => this.editFixa(b.dataset.df));
      UI.$$('[data-sug]', c).forEach(b => b.onclick = () => { const l = sugest[+b.dataset.sug]; this.editFixa(null, { descricao: l.descricao, categoria: l.categoria, valor: l.valor, pessoaId: l.pessoaId, obraId: l.obraId, dia: +(l.vencimento || l.dataPagamento || '').slice(8) || 10, forma: l.forma }); });
      if (ed) {
        UI.$('#dfNova', c).onclick = () => this.editFixa();
        UI.$('#dfGer', c).onclick = () => { let n = 0; ativas.forEach(f => { if (gerado(f, s.mes)) return; const d = s.mes + '-' + String(Math.min(28, +f.dia || 10)).padStart(2, '0'); Store.insert('lancamentos', { tipo: 'despesa', categoria: f.categoria, descricao: f.descricao + ' – ' + Calc.mesLabel(s.mes), valor: +f.valor || 0, obraId: f.obraId || '', pessoaId: f.pessoaId || '', forma: f.forma || '', data: d, vencimento: d, status: 'pendente', fixaId: f.id, arquivoIds: [] }); n++; }); UI.toast(n ? n + ' despesas fixas lançadas como "a pagar"' : 'Todas já estavam lançadas'); App.refresh(); };
      }
    },
    async editFixa(id, preset = {}) {
      const f = id ? Store.get('despFixas', id) : Object.assign({ categoria: 'Administrativo', dia: 10, ativo: true, inicio: UI.today() }, preset);
      const d = await UI.formModal({ title: id ? 'Despesa fixa ' + id : 'Nova despesa fixa', values: f, list: [{ k: 'descricao', l: 'Descrição (ex.: Aluguel da sala)', req: 1, full: 1 }, { k: 'categoria', l: 'Categoria', t: 'select', o: LISTAS.catDespesa, blank: false }, { k: 'valor', l: 'Valor mensal', t: 'money', req: 1 },
        { k: 'dia', l: 'Dia do vencimento', t: 'number' }, { k: 'pessoaId', l: 'Fornecedor', t: 'select', o: () => Store.all('pessoas').filter(p => p.tipo !== 'Cliente').map(p => [p.id, p.nome]) }, { k: 'obraId', l: 'Obra', t: 'select', o: () => Store.all('obras').map(o => [o.id, o.id + ' · ' + o.nome]) },
        { k: 'forma', l: 'Forma de pagamento', t: 'select', o: LISTAS.formaPgto }, { k: 'inicio', l: 'Começa em', t: 'date' }, { k: 'fim', l: 'Termina em (opcional)', t: 'date' }, { k: 'ativo', l: 'Ativa', t: 'check' }],
        onDelete: id ? () => { Store.update('despFixas', id, { ativo: false }); App.refresh(); } : null });
      if (!d) return; if (id) Store.update('despFixas', id, d); else Store.insert('despFixas', d); UI.toast('Despesa fixa salva'); App.refresh();
    },
    t_comprov(c) {
      const { money, esc, date, icon } = UI;
      const L = Store.where('lancamentos', l => l.tipo === 'despesa' && l.status === 'pago' && !SOCIOS.includes(l.categoria) && (!l.nf || !(l.arquivoIds || []).length)).sort((a, b) => b.valor - a.valor);
      const semNada = L.filter(l => !l.nf && !(l.arquivoIds || []).length);
      c.innerHTML = `<div class="grid g3">${[['Pagos sem nota e sem comprovante', semNada.length, money(semNada.reduce((a, l) => a + l.valor, 0))], ['Com nota mas sem arquivo', L.filter(l => l.nf && !(l.arquivoIds || []).length).length, 'nota marcada, PDF/XML não anexado'], ['Com comprovante mas sem nota', L.filter(l => !l.nf && (l.arquivoIds || []).length).length, 'só recibo ou comprovante']].map(k => `<div class="card kpi"><div class="lbl">${k[0]}</div><div class="val">${k[1]}</div><div class="sub">${k[2]}</div></div>`).join('')}</div>
        <div class="card mt">${UI.table([{ h: 'ID', f: l => UI.idLink(l.id) }, { h: 'Data', f: l => date(l.dataPagamento || l.data) }, { h: 'Descrição', f: l => esc(l.descricao) + `<div class="tiny muted">${esc((Store.get('pessoas', l.pessoaId) || {}).nome || '')} · ${esc(l.categoria)}</div>` }, { h: 'Obra', f: l => l.obraId ? UI.idLink(l.obraId) : 'Geral' },
          { h: 'Falta', f: l => [!l.nf ? UI.badge('nota', 'warn') : '', !(l.arquivoIds || []).length ? UI.badge('arquivo', 'err') : ''].join(' ') }, { h: 'Valor', f: l => money(l.valor) },
          { h: '', f: l => `<label class="btn sm">${icon('upload')} Anexar<input type="file" hidden multiple accept=".xml,.pdf,image/*" data-anx="${l.id}"></label>` }], L.slice(0, 300), { emptyMsg: 'Todos os gastos pagos têm nota e comprovante. 🎉' })}</div>`;
      UI.$$('[data-anx]', c).forEach(i => i.onchange = () => Views.notas.anexar(i.dataset.anx, [...i.files]));
    }
  };
})();
