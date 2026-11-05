/* Caixa, contas a pagar/receber, balanço (DRE) e lucro por obra */
Views.financeiro = {
  perm: 'financeiro.ver',
  st: { tab: 'caixa', obra: '', tipo: '', status: '', cat: '', de: '', ate: '', q: '' },
  render(el, tab) {
    const { icon, money, esc } = UI; const s = this.st; if (tab) s.tab = tab;
    const T = [['caixa', 'Caixa / lançamentos', 'list'], ['receber', 'A receber', 'hand-coins'], ['pagar', 'A pagar', 'receipt'], ['indice', 'Índice de caixa', 'gauge'], ['fluxo', 'Fluxo por obra', 'git-compare'], ['socios', 'Pró-labore e lucros', 'users'], ['balanco', 'Balanço (DRE)', 'scale'], ['obras', 'Lucro por obra', 'hard-hat'], ['auditoria', 'Auditoria', 'shield-check']];
    const f = Calc.fin(s.obra || null, { de: s.de, ate: s.ate });
    el.innerHTML = `
      <div class="page-head"><div><h1>Caixa e balanço</h1><p>Receitas, despesas, pagamentos e lucro da empresa e de cada obra</p></div>
        <div class="row">${Auth.can('financeiro.editar') ? `<button class="btn" onclick="Views.financeiro.edit(null,{tipo:'despesa'})">${icon('arrow-up-circle')} Despesa</button><button class="btn primary" onclick="Views.financeiro.edit(null,{tipo:'receita'})">${icon('arrow-down-circle')} Receita</button>` : ''}</div></div>
      <div class="grid g4">
        <div class="card kpi ok"><div class="ico">${icon('arrow-down-circle')}</div><div class="lbl">Receitas recebidas</div><div class="val">${money(f.receitaPaga)}</div><div class="sub">A receber ${money(f.receitaPendente)}</div></div>
        <div class="card kpi err"><div class="ico">${icon('arrow-up-circle')}</div><div class="lbl">Despesas pagas</div><div class="val">${money(f.despesaPaga)}</div><div class="sub">A pagar ${money(f.despesaPendente)}</div></div>
        <div class="card kpi ${f.lucro >= 0 ? 'ok' : 'err'}"><div class="ico">${icon('wallet')}</div><div class="lbl">Saldo em caixa (lucro)</div><div class="val">${money(f.lucro)}</div><div class="sub">Margem ${UI.pct(f.margem)}</div></div>
        <div class="card kpi violet"><div class="ico">${icon('trending-up')}</div><div class="lbl">Resultado projetado</div><div class="val">${money(f.lucroProjetado)}</div><div class="sub">Vencidos: receber ${money(f.atrasadoReceber)} · pagar ${money(f.atrasadoPagar)}</div></div>
      </div>
      <div class="toolbar mt">
        <select class="select" id="fo"><option value="">Todas as obras + geral</option>${Store.all('obras').map(o => `<option value="${o.id}" ${o.id === s.obra ? 'selected' : ''}>${o.id} · ${esc(o.nome)}</option>`).join('')}</select>
        <label class="tiny muted">De</label><input type="date" class="input" id="fde" value="${s.de}"><label class="tiny muted">até</label><input type="date" class="input" id="fate" value="${s.ate}">
        <button class="btn sm ghost" id="flimpa">Limpar</button>
      </div>
      <div class="tabs">${T.map(t => `<button class="${t[0] === s.tab ? 'active' : ''}" data-t="${t[0]}">${icon(t[2])} ${t[1]}</button>`).join('')}</div>
      <div id="fc"></div>`;
    const re = () => App.refresh();
    UI.$('#fo', el).onchange = e => { s.obra = e.target.value; re(); };
    UI.$('#fde', el).onchange = e => { s.de = e.target.value; re(); };
    UI.$('#fate', el).onchange = e => { s.ate = e.target.value; re(); };
    UI.$('#flimpa', el).onclick = () => { Object.assign(s, { obra: '', de: '', ate: '', tipo: '', status: '', cat: '', q: '' }); re(); };
    UI.$$('[data-t]', el).forEach(b => b.onclick = () => { s.tab = b.dataset.t; re(); });
    this['t_' + s.tab](UI.$('#fc', el));
  },
  filtrados() {
    const s = this.st;
    return Store.all('lancamentos').filter(l => (!s.obra || l.obraId === s.obra) && (!s.de || (l.dataPagamento || l.vencimento || l.data) >= s.de) && (!s.ate || (l.dataPagamento || l.vencimento || l.data) <= s.ate))
      .sort((a, b) => (b.dataPagamento || b.vencimento || b.data).localeCompare(a.dataPagamento || a.vencimento || a.data));
  },
  tabela(ls, opt = {}) {
    const { money, esc, icon, date } = UI; const ed = Auth.can('financeiro.editar');
    const tot = ls.reduce((a, l) => a + (l.tipo === 'receita' ? l.valor : -l.valor), 0);
    return UI.table([
      { h: 'ID', f: l => UI.idLink(l.id) },
      { h: 'Data', f: l => `<span class="nowrap">${date(l.dataPagamento || l.vencimento || l.data)}</span>${l.status !== 'pago' && l.vencimento ? `<div class="tiny ${Calc.isAtrasado(l) ? '' : 'muted'}" style="${Calc.isAtrasado(l) ? 'color:var(--err)' : ''}">venc. ${date(l.vencimento)}</div>` : ''}` },
      { h: 'Descrição', f: l => `${esc(l.descricao)}<div class="tiny muted">${esc(l.categoria)}${l.nf ? ' · <b>NF</b>' + (l.nfNumero ? ' ' + esc(l.nfNumero) : '') : ''}${(l.arquivoIds || []).length ? ' · ' + icon('paperclip') : ''}</div>` },
      ...(opt.semObra ? [] : [{ h: 'Obra', f: l => l.obraId ? UI.idLink(l.obraId) : '<span class="muted tiny">Geral</span>' }]),
      { h: 'Pessoa', f: l => UI.pessoa(l.pessoaId) },
      { h: 'Status', f: l => Calc.isAtrasado(l) ? UI.badge('Vencido', 'err') : UI.badge(l.status) },
      { h: 'Valor', num: 1, f: l => `<b style="color:${l.tipo === 'receita' ? 'var(--ok)' : 'var(--err)'}">${l.tipo === 'receita' ? '+' : '−'} ${money(l.valor)}</b>` },
      { h: '', f: l => ed && l.status !== 'pago' ? `<button class="btn sm" data-pagar="${l.id}">${icon('check')} ${l.tipo === 'receita' ? 'Recebido' : 'Pago'}</button>` : '' }
    ], ls, { foot: opt.semObra ? ['', '', 'Saldo', '', '', money(tot), ''] : ['', '', 'Saldo', '', '', '', money(tot), ''], emptyMsg: 'Nenhum lançamento.' });
  },
  bindPagar(c) {
    UI.$$('[data-pagar]', c).forEach(b => b.onclick = e => { e.stopPropagation(); Store.update('lancamentos', b.dataset.pagar, { status: 'pago', dataPagamento: UI.today() }); UI.toast('Baixa registrada'); App.refresh(); });
    UI.$$('tbody tr', c).forEach(tr => { const id = tr.querySelector('[data-goto]'); if (id) tr.style.cursor = 'pointer', tr.onclick = e => { if (!e.target.closest('button,[data-goto]')) this.edit(id.dataset.goto); }; });
  },
  t_caixa(c) {
    const s = this.st; const { esc, icon } = UI;
    let ls = this.filtrados();
    if (s.tipo) ls = ls.filter(l => l.tipo === s.tipo);
    if (s.status) ls = ls.filter(l => l.status === s.status);
    if (s.cat) ls = ls.filter(l => l.categoria === s.cat);
    if (s.q) ls = ls.filter(l => (l.descricao + l.id + l.nfNumero).toLowerCase().includes(s.q.toLowerCase()));
    c.innerHTML = `<div class="toolbar"><input class="input" id="fq" placeholder="Buscar descrição, NF, ID…" value="${esc(s.q)}">
      <select class="select" id="ft"><option value="">Receitas e despesas</option><option value="receita" ${s.tipo === 'receita' ? 'selected' : ''}>Receitas</option><option value="despesa" ${s.tipo === 'despesa' ? 'selected' : ''}>Despesas</option></select>
      <select class="select" id="fs"><option value="">Todos status</option><option value="pago" ${s.status === 'pago' ? 'selected' : ''}>Pago/recebido</option><option value="pendente" ${s.status === 'pendente' ? 'selected' : ''}>Pendente</option></select>
      <select class="select" id="fcat"><option value="">Todas categorias</option>${[...LISTAS.catReceita, ...LISTAS.catDespesa].map(x => `<option ${x === s.cat ? 'selected' : ''}>${x}</option>`).join('')}</select>
      <button class="btn sm" id="fcsv" style="margin-left:auto">${icon('download')} CSV</button></div>
      <div class="card">${this.tabela(ls)}</div>`;
    UI.$('#fq', c).onchange = e => { s.q = e.target.value; App.refresh(); };
    UI.$('#ft', c).onchange = e => { s.tipo = e.target.value; App.refresh(); };
    UI.$('#fs', c).onchange = e => { s.status = e.target.value; App.refresh(); };
    UI.$('#fcat', c).onchange = e => { s.cat = e.target.value; App.refresh(); };
    UI.$('#fcsv', c).onclick = () => UI.csv('lancamentos.csv', ['ID', 'Tipo', 'Categoria', 'Descrição', 'Obra', 'Pessoa', 'Data', 'Vencimento', 'Pagamento', 'Status', 'NF', 'Valor'],
      ls.map(l => [l.id, l.tipo, l.categoria, l.descricao, l.obraId, (Store.get('pessoas', l.pessoaId) || {}).nome, l.data, l.vencimento, l.dataPagamento, l.status, l.nf ? 'Sim' : 'Não', String(l.valor).replace('.', ',')]));
    this.bindPagar(c);
  },
  t_receber(c) { const ls = this.filtrados().filter(l => l.tipo === 'receita' && l.status !== 'pago').sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || '')); c.innerHTML = `<div class="card">${this.tabela(ls)}</div>`; this.bindPagar(c); },
  t_pagar(c) { const ls = this.filtrados().filter(l => l.tipo === 'despesa' && l.status !== 'pago').sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || '')); c.innerHTML = `<div class="card">${this.tabela(ls)}</div>`; this.bindPagar(c); },
  /* ÍNDICE DE CAIXA: quanto o dinheiro em caixa cobre as contas que vencem, e quanto tempo a empresa aguenta.
     Regime de caixa: saldo = tudo que entrou − tudo que saiu (lançamentos pagos até hoje). Usa o filtro de obra; ignora o filtro de datas. */
  indiceCaixa(obra) {
    const hoje = UI.today(), dia = n => { const d = new Date(hoje + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    const L = Store.all('lancamentos').filter(l => !obra || l.obraId === obra);
    const sinal = l => l.tipo === 'receita' ? +l.valor || 0 : -(+l.valor || 0);
    const pagos = L.filter(l => l.status === 'pago' && (l.dataPagamento || l.data || '') <= hoje);
    const saldo = pagos.reduce((a, l) => a + sinal(l), 0);
    const pend = L.filter(l => l.status !== 'pago');
    const vence = l => l.vencimento || l.data || hoje;
    const ate = (tipo, d) => pend.filter(l => l.tipo === tipo && vence(l) <= d).reduce((a, l) => a + (+l.valor || 0), 0);
    const pagar30 = ate('despesa', dia(30)), receber30 = ate('receita', dia(30));
    const vencPagar = ate('despesa', dia(-1)), vencReceber = ate('receita', dia(-1));
    const desde = dia(-90); const saida90 = pagos.filter(l => l.tipo === 'despesa' && (l.dataPagamento || l.data) >= desde).reduce((a, l) => a + (+l.valor || 0), 0);
    const entrada90 = pagos.filter(l => l.tipo === 'receita' && (l.dataPagamento || l.data) >= desde).reduce((a, l) => a + (+l.valor || 0), 0);
    const mediaSaida = saida90 / 3, mediaEntrada = entrada90 / 3;
    // projeção dia a dia (90 dias): pendentes entram/saem no vencimento; vencidos contam hoje
    const proj = []; let s = saldo;
    for (let k = 0; k <= 90; k++) { const d = dia(k); s += pend.filter(l => (k === 0 ? vence(l) <= d : vence(l) === d)).reduce((a, l) => a + sinal(l), 0); proj.push([d, s]); }
    const minimo = proj.reduce((m, x) => x[1] < m[1] ? x : m, proj[0]);
    return { saldo, pagar30, receber30, vencPagar, vencReceber, mediaSaida, mediaEntrada,
      imediata: pagar30 ? saldo / pagar30 : null, liquidez30: pagar30 ? (saldo + receber30) / pagar30 : null,
      folego: mediaSaida ? saldo / mediaSaida : null, proj, minimo };
  },
  t_indice(c) {
    const { money, icon, date, esc } = UI; const s = this.st; const k = this.indiceCaixa(s.obra || null);
    const num = v => v == null ? '—' : (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');
    // faixas: ≥ 1,5 folgado · 1 a 1,5 atenção · < 1 aperto (o caixa não cobre as contas)
    const faixa = v => v == null ? ['ok', 'check-circle-2', 'Sem contas a pagar em 30 dias'] : v >= 1.5 ? ['ok', 'check-circle-2', 'Folgado'] : v >= 1 ? ['warn', 'alert-triangle', 'Atenção'] : ['err', 'alert-octagon', 'Aperto: o caixa não cobre'];
    const tile = (titulo, v, conta, explica) => { const f = faixa(v); return `<div class="card kpi ${f[0]}"><div class="ico">${icon('gauge')}</div><div class="lbl">${titulo}</div><div class="val">${num(v)}</div><div class="sub">${icon(f[1])} <b>${f[2]}</b></div><div class="tiny muted mt">${conta}</div><div class="tiny muted">${explica}</div></div>`; };
    const fol = k.folego == null ? '—' : k.folego >= 24 ? '24+ meses' : (Math.round(k.folego * 10) / 10).toString().replace('.', ',') + ' meses';
    const folCls = k.folego == null ? 'ok' : k.folego >= 3 ? 'ok' : k.folego >= 1 ? 'warn' : 'err';
    const fx = Calc.fluxoMensal(s.obra || null, 0).slice(-12);
    let acum = k.saldo - fx.reduce((a, x) => a + (x.receita - x.despesa), 0);
    const meses = fx.map(x => { acum += x.receita - x.despesa; return Object.assign({}, x, { final: acum }); });
    c.innerHTML = `<div class="alert info mb">${icon('info')}<div><b>Índice de caixa</b> mostra se o dinheiro que já está em caixa paga as contas que vão vencer. Acima de <b>1,5</b> está folgado; entre <b>1 e 1,5</b>, atenção; abaixo de <b>1</b>, o caixa não cobre as contas e é preciso receber antes de pagar. ${s.obra ? 'Calculado só para a obra ' + esc(s.obra) + '.' : 'Calculado para a empresa toda (todas as obras + geral).'}</div></div>
      <div class="grid g4">
        <div class="card kpi ${k.saldo >= 0 ? 'ok' : 'err'}"><div class="ico">${icon('wallet')}</div><div class="lbl">Saldo em caixa hoje</div><div class="val">${money(k.saldo)}</div><div class="sub">tudo que entrou − tudo que saiu</div></div>
        ${tile('Índice de caixa imediato', k.imediata, `${money(k.saldo)} ÷ ${money(k.pagar30)}`, 'saldo de hoje ÷ contas a pagar nos próximos 30 dias (inclui vencidas)')}
        ${tile('Índice de caixa 30 dias', k.liquidez30, `(${money(k.saldo)} + ${money(k.receber30)}) ÷ ${money(k.pagar30)}`, 'saldo + o que vai receber em 30 dias ÷ o que vai pagar em 30 dias')}
        <div class="card kpi ${folCls}"><div class="ico">${icon('hourglass')}</div><div class="lbl">Fôlego do caixa</div><div class="val">${fol}</div><div class="sub">quanto tempo o saldo paga as saídas</div><div class="tiny muted mt">saída média: ${money(k.mediaSaida)}/mês (últimos 3 meses)</div><div class="tiny muted">entrada média: ${money(k.mediaEntrada)}/mês</div></div>
      </div>
      <div class="grid g2 mt">
        <div class="card"><div class="card-h"><div><h3>Saldo projetado – próximos 90 dias</h3><div class="tiny muted">com as contas a pagar e a receber já lançadas, cada uma no seu vencimento</div></div></div><div class="card-b"><div class="chart-box"><canvas id="chIdx"></canvas></div>
          <div class="tiny mt">${k.minimo[1] < 0 ? `${icon('alert-octagon')} <b style="color:var(--err)">O caixa fica negativo</b>: ponto mais baixo de ${money(k.minimo[1])} em ${date(k.minimo[0])}.` : `${icon('check-circle-2')} Ponto mais baixo: <b>${money(k.minimo[1])}</b> em ${date(k.minimo[0])}.`}</div></div></div>
        <div class="card"><div class="card-h"><h3>O que pesa no índice</h3></div><div class="card-b p0"><table class="t"><tbody>
          <tr><td>A pagar em 30 dias</td><td class="num"><b>${money(k.pagar30)}</b></td></tr>
          <tr><td style="padding-left:28px">já vencido</td><td class="num" style="color:${k.vencPagar ? 'var(--err)' : ''}">${money(k.vencPagar)}</td></tr>
          <tr><td>A receber em 30 dias</td><td class="num"><b>${money(k.receber30)}</b></td></tr>
          <tr><td style="padding-left:28px">já vencido (cobrar)</td><td class="num" style="color:${k.vencReceber ? 'var(--err)' : ''}">${money(k.vencReceber)}</td></tr>
          <tr><td>Saldo depois de 30 dias</td><td class="num"><b style="color:${k.saldo + k.receber30 - k.pagar30 >= 0 ? 'var(--ok)' : 'var(--err)'}">${money(k.saldo + k.receber30 - k.pagar30)}</b></td></tr>
        </tbody></table><div class="card-b tiny muted">Para o índice ficar certo, lance as contas a pagar e a receber com vencimento. O saldo inicial do caixa (dinheiro que já existia antes do app) entra como um lançamento de receita “Saldo inicial”.</div></div></div>
      </div>
      <div class="card mt"><div class="card-h"><h3>Caixa mês a mês (últimos 12 meses)</h3></div>${UI.table([{ h: 'Mês', f: x => Calc.mesLabel(x.mes) }, { h: 'Entrou', num: 1, f: x => money(x.receita) }, { h: 'Saiu', num: 1, f: x => money(x.despesa) }, { h: 'Resultado do mês', num: 1, f: x => `<b style="color:${x.receita - x.despesa >= 0 ? 'var(--ok)' : 'var(--err)'}">${money(x.receita - x.despesa)}</b>` }, { h: 'Saldo no fim do mês', num: 1, f: x => money(x.final) }], meses.slice().reverse(), { emptyMsg: 'Sem lançamentos pagos.' })}</div>`;
    const cor = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim() || '#18c20e';
    UI.chart('chIdx', { type: 'line', data: { labels: k.proj.map(x => date(x[0])), datasets: [{ label: 'Saldo projetado', data: k.proj.map(x => Math.round(x[1] * 100) / 100), borderColor: cor, backgroundColor: 'transparent', borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: 0, stepped: true }, { label: 'Zero', data: k.proj.map(() => 0), borderColor: '#94a3b8', borderDash: [4, 4], borderWidth: 1, pointRadius: 0, pointHoverRadius: 0 }] },
      options: { interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { filter: i => i.datasetIndex === 0, callbacks: { label: i => 'Saldo: ' + money(i.parsed.y) } } }, scales: { x: { ticks: { maxTicksLimit: 7 } }, y: { ticks: { callback: v => UI.moneyK(v) } } } } });
  },
  t_balanco(c) {
    const { money, pct } = UI; const s = this.st;
    const fx = Calc.fluxoMensal(s.obra || null, 0).filter(x => (!s.de || x.mes >= s.de.slice(0, 7)) && (!s.ate || x.mes <= s.ate.slice(0, 7)));
    const ls = this.filtrados().filter(l => l.status === 'pago');
    const cats = (tipo, list) => list.map(cat => [cat, ls.filter(l => l.tipo === tipo && l.categoria === cat).reduce((a, l) => a + l.valor, 0)]).filter(x => x[1]);
    const rc = cats('receita', LISTAS.catReceita), dc = cats('despesa', LISTAS.catDespesa);
    const R = rc.reduce((a, x) => a + x[1], 0), D = dc.reduce((a, x) => a + x[1], 0);
    const imp = dc.filter(x => x[0] === 'Impostos').reduce((a, x) => a + x[1], 0);
    const cus = dc.filter(x => ['Material', 'Mão de obra', 'Empreiteiro', 'Equipamentos/Locação', 'Projetos/Terceiros'].includes(x[0])).reduce((a, x) => a + x[1], 0);
    const line = (l, v, b, ind) => `<tr><td style="${ind ? 'padding-left:28px' : ''}${b ? ';font-weight:700' : ''}">${l}</td><td class="num" style="${b ? 'font-weight:700' : ''}">${money(v)}</td><td class="num muted">${R ? pct(v / R * 100) : '—'}</td></tr>`;
    c.innerHTML = `<div class="grid g2">
      <div class="card"><div class="card-h"><h3>Demonstrativo de resultado (DRE simplificado)</h3><span class="tiny muted">regime de caixa</span></div><div class="card-b p0"><table class="t"><thead><tr><th>Conta</th><th class="num">Valor</th><th class="num">% receita</th></tr></thead><tbody>
        ${line('(+) Receita bruta', R, 1)}${rc.map(x => line(x[0], x[1], 0, 1)).join('')}
        ${line('(−) Impostos', imp, 1)}${line('(=) Receita líquida', R - imp, 1)}
        ${line('(−) Custos diretos da obra', cus, 1)}${dc.filter(x => ['Material', 'Mão de obra', 'Empreiteiro', 'Equipamentos/Locação', 'Projetos/Terceiros'].includes(x[0])).map(x => line(x[0], x[1], 0, 1)).join('')}
        ${line('(=) Lucro bruto', R - imp - cus, 1)}
        ${line('(−) Despesas operacionais', D - imp - cus, 1)}${dc.filter(x => !['Impostos', 'Material', 'Mão de obra', 'Empreiteiro', 'Equipamentos/Locação', 'Projetos/Terceiros'].includes(x[0])).map(x => line(x[0], x[1], 0, 1)).join('')}
        <tr><td style="font-weight:800">(=) RESULTADO LÍQUIDO</td><td class="num" style="font-weight:800;color:${R - D >= 0 ? 'var(--ok)' : 'var(--err)'}">${money(R - D)}</td><td class="num">${R ? pct((R - D) / R * 100) : '—'}</td></tr>
      </tbody></table></div></div>
      <div class="card"><div class="card-h"><h3>Receitas × despesas por mês</h3></div><div class="card-b"><div class="chart-box"><canvas id="chBal"></canvas></div></div></div></div>
      <div class="card mt"><div class="card-h"><h3>Balanço mensal</h3></div>${UI.table([{ h: 'Mês', f: x => Calc.mesLabel(x.mes) }, { h: 'Receitas', num: 1, f: x => money(x.receita) }, { h: 'Despesas', num: 1, f: x => money(x.despesa) }, { h: 'Resultado', num: 1, f: x => `<b style="color:${x.saldo >= 0 ? 'var(--ok)' : 'var(--err)'}">${money(x.saldo)}</b>` }, { h: 'Acumulado', num: 1, f: x => money(x.acumulado) }], fx, { foot: ['Total', money(fx.reduce((a, x) => a + x.receita, 0)), money(fx.reduce((a, x) => a + x.despesa, 0)), money(fx.reduce((a, x) => a + x.saldo, 0)), ''] })}</div>`;
    UI.chart('chBal', { type: 'bar', data: { labels: fx.map(x => Calc.mesLabel(x.mes)), datasets: [{ label: 'Receitas', data: fx.map(x => x.receita), backgroundColor: '#16a34a', borderRadius: 4 }, { label: 'Despesas', data: fx.map(x => x.despesa), backgroundColor: '#dc2626', borderRadius: 4 }, { type: 'line', label: 'Acumulado', data: fx.map(x => x.acumulado), borderColor: '#2563eb', tension: .3 }] }, options: { scales: { y: { ticks: { callback: UI.moneyTick } } } } });
  },
  /* Auditoria financeira: cada obra com contrato é revisada uma a uma (valor do contrato, documentos e lançamentos).
     Só administradores (Victor e Ismael) editam e marcam como revisado. Nada é apagado. */
  t_auditoria(c) {
    const { money, esc, icon, date } = UI; const s = this.st; s.aud = s.aud || 'revisar';
    const adm = ((Auth.current() || {}).papel === 'admin');
    const catDe = x => Views.contratos.categoriaDe(x);
    const docs = oid => Store.all('contratos').filter(x => x.obraId === oid && catDe(x) === 'Contrato');
    const todas = Store.all('obras').filter(o => (+o.valorContrato || 0) > 0 || docs(o.id).length).map(o => {
      const f = Calc.fin(o.id); const a = o.auditoriaFin || {};
      const valorDocs = docs(o.id).reduce((t, x) => t + (+x.valor || 0), 0);
      return { o, f, a, valorDocs, receitas: f.receitaPaga + f.receitaPendente, dif: (+o.valorContrato || 0) - (f.receitaPaga + f.receitaPendente), ok: a.status === 'revisado' };
    }).sort((x, y) => (parseInt(x.o.numero, 10) || 0) - (parseInt(y.o.numero, 10) || 0) || String(x.o.id).localeCompare(y.o.id));
    const L = todas.filter(r => s.aud === 'todos' || (s.aud === 'revisado' ? r.ok : !r.ok));
    const nOk = todas.filter(r => r.ok).length;
    c.innerHTML = `<div class="card mb"><div class="card-b"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:10px">
        <div><b>Auditoria financeira dos contratos</b><div class="tiny muted">${nOk} de ${todas.length} revisados · confira valor do contrato, documentos e lançamentos de cada obra e marque como revisado. ${adm ? '' : 'Somente Victor e Ismael alteram.'}</div>
        <div class="mt" style="height:8px;max-width:420px;background:var(--surface-2);border-radius:99px;overflow:hidden"><div style="height:100%;width:${todas.length ? nOk / todas.length * 100 : 0}%;background:var(--ok)"></div></div></div>
        <div class="row" style="gap:6px">${[['revisar', 'A revisar'], ['revisado', 'Revisados'], ['todos', 'Todos']].map(([k, l]) => `<button class="btn sm ${s.aud === k ? 'primary' : ''}" data-aud="${k}">${l}</button>`).join('')}</div></div></div></div>
      <div class="card">${UI.table([
        { h: 'Obra', f: r => `${UI.idLink(r.o.id)} <span class="plink" data-goto="${r.o.id}">${esc(r.o.nome)}</span>` },
        { h: 'Contrato (obra)', num: 1, f: r => money(r.o.valorContrato) },
        { h: 'Documentos de contrato', num: 1, f: r => r.valorDocs ? money(r.valorDocs) + (Math.abs(r.valorDocs - (+r.o.valorContrato || 0)) > 0.5 ? ' <span class="badge warn" title="Diferente do valor da obra">≠</span>' : '') : '<span class="muted">—</span>' },
        { h: 'Recebido', num: 1, f: r => money(r.f.receitaPaga) }, { h: 'A receber', num: 1, f: r => money(r.f.receitaPendente) },
        { h: 'Falta lançar', num: 1, f: r => Math.abs(r.dif) > 0.5 ? `<b style="color:${r.dif > 0 ? 'var(--warn)' : 'var(--err)'}">${money(r.dif)}</b>` : '<span style="color:var(--ok)">ok</span>' },
        { h: 'Situação', f: r => r.ok ? `<span class="badge ok">Revisado</span><div class="tiny muted">${date((r.a.em || '').slice(0, 10))} · ${esc(r.a.por || '')}</div>` : '<span class="badge warn">A revisar</span>' },
        { h: '', f: r => `<button class="btn sm" data-rev="${r.o.id}">${icon('shield-check')} ${adm ? 'Revisar' : 'Ver'}</button>` }
      ], L, { emptyMsg: s.aud === 'revisar' ? 'Tudo revisado 🎉' : 'Nada aqui.' })}</div>
      <p class="tiny muted">"Falta lançar" = valor do contrato − (recebido + a receber). Diferente de zero indica parcela faltando, valor errado ou lançamento a mais.</p>`;
    UI.$$('[data-aud]', c).forEach(b => b.onclick = () => { s.aud = b.dataset.aud; this.t_auditoria(c); UI.icons(); });
    UI.$$('[data-rev]', c).forEach(b => b.onclick = () => this.revisarObra(b.dataset.rev, () => { this.t_auditoria(c); UI.icons(); }));
    UI.icons();
  },
  revisarObra(oid, depois) {
    const { money, esc, icon, date } = UI; const adm = ((Auth.current() || {}).papel === 'admin');
    const o = Store.get('obras', oid); const ls = Store.where('lancamentos', l => l.obraId === oid).slice().sort((a, b) => String(a.vencimento || a.data || '').localeCompare(String(b.vencimento || b.data || '')));
    const dcs = Store.all('contratos').filter(x => x.obraId === oid && Views.contratos.categoriaDe(x) === 'Contrato');
    const f = Calc.fin(oid); const a = o.auditoriaFin || {};
    const m = UI.modal({ title: 'Auditoria financeira · ' + o.id + ' · ' + o.nome, wide: true, body: `
      <div class="grid g3"><div class="field"><label>Valor do contrato (obra)</label><input class="input" type="number" step="0.01" id="avc" value="${+o.valorContrato || 0}" ${adm ? '' : 'disabled'}></div>
        <div class="field"><label>Recebido / a receber</label><div class="input" style="background:var(--surface-2)">${money(f.receitaPaga)} / ${money(f.receitaPendente)}</div></div>
        <div class="field"><label>Gasto / a pagar</label><div class="input" style="background:var(--surface-2)">${money(f.despesaPaga)} / ${money(f.despesaPendente)}</div></div></div>
      ${dcs.length ? `<h3 class="mt2 mb">Documentos de contrato</h3><div class="table-wrap"><table class="t"><thead><tr><th>Documento</th><th>Data</th><th class="num">Valor (R$)</th><th>Condições de pagamento</th></tr></thead><tbody>
        ${dcs.map(x => `<tr><td>${UI.idLink(x.id)} ${esc(x.titulo || '')}</td><td>${date(x.data)}</td><td class="num"><input class="input" type="number" step="0.01" data-dv="${x.id}" value="${+x.valor || 0}" style="width:130px;text-align:right" ${adm ? '' : 'disabled'}></td><td><textarea class="input" data-dc="${x.id}" rows="2" style="width:100%" ${adm ? '' : 'disabled'}>${esc(x.condicoes || '')}</textarea></td></tr>`).join('')}</tbody></table></div>` : '<p class="tiny muted mt2">Esta obra não tem documento de contrato gerado no app.</p>'}
      <h3 class="mt2 mb">Lançamentos da obra (${ls.length})</h3><div class="table-wrap"><table class="t"><thead><tr><th>Venc./data</th><th>Tipo</th><th>Descrição</th><th>Status</th><th class="num">Valor</th><th></th></tr></thead><tbody>
        ${ls.map(l => `<tr><td>${date(l.vencimento || l.data)}</td><td>${l.tipo === 'receita' ? '<span class="badge ok">Receita</span>' : '<span class="badge err">Despesa</span>'}</td><td>${esc(l.descricao || l.categoria || '')}</td><td>${esc(l.status)}</td><td class="num">${money(l.valor)}</td><td>${adm ? `<button class="btn sm ghost" data-le="${l.id}">${icon('pencil')}</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Nenhum lançamento.</td></tr>'}</tbody></table></div>
      ${adm ? `<div class="row mt"><button class="btn" id="anovo">${icon('plus')} Novo lançamento desta obra</button></div>` : ''}
      <div class="field mt2"><label>Observações da auditoria</label><textarea class="input" id="aobs" rows="2" ${adm ? '' : 'disabled'}>${esc(a.obs || '')}</textarea></div>
      ${a.status === 'revisado' ? `<p class="tiny muted">Revisado em ${date((a.em || '').slice(0, 10))} por ${esc(a.por || '')}.</p>` : ''}`,
      footer: adm ? `<button class="btn" data-close>Fechar</button>${a.status === 'revisado' ? `<button class="btn" data-ar>Voltar para "a revisar"</button>` : ''}<button class="btn" data-sv>${icon('save')} Salvar</button><button class="btn primary" data-ok>${icon('shield-check')} Salvar e marcar revisado</button>` : `<button class="btn" data-close>Fechar</button>` });
    if (!adm) return;
    const gravar = status => {
      Store.update('obras', oid, { valorContrato: +m.$('#avc').value || 0, auditoriaFin: Object.assign({}, o.auditoriaFin, { obs: m.$('#aobs').value }, status ? { status, em: new Date().toISOString(), por: (Auth.current() || {}).nome || '' } : {}) });
      m.el.querySelectorAll('[data-dv]').forEach(i => Store.update('contratos', i.dataset.dv, { valor: +i.value || 0, condicoes: m.$(`[data-dc="${i.dataset.dv}"]`).value }));
    };
    m.$('[data-sv]').onclick = () => { gravar(); UI.toast('Auditoria salva'); m.close(); depois && depois(); };
    m.$('[data-ok]').onclick = () => { gravar('revisado'); UI.toast('Marcado como revisado'); m.close(); depois && depois(); };
    const ar = m.$('[data-ar]'); if (ar) ar.onclick = () => { gravar('a revisar'); m.close(); depois && depois(); };
    m.el.querySelectorAll('[data-le]').forEach(b => b.onclick = async () => { gravar(); m.close(); await this.edit(b.dataset.le); this.revisarObra(oid, depois); });
    const nv = m.$('#anovo'); if (nv) nv.onclick = async () => { gravar(); m.close(); await this.edit(null, { obraId: oid, tipo: 'receita' }); this.revisarObra(oid, depois); };
  },
  t_obras(c) {
    const { money, pct, esc } = UI;
    const rows = Store.all('obras').map(o => ({ o, f: Calc.fin(o.id) }));
    const g = Calc.fin(null); const geral = Store.where('lancamentos', l => !l.obraId);
    c.innerHTML = `<div class="card">${UI.table([
      { h: 'Obra', f: r => `${UI.idLink(r.o.id)} <span class="plink" data-goto="${r.o.id}">${esc(r.o.nome)}</span>` }, { h: 'Contrato', num: 1, f: r => money(r.o.valorContrato) },
      { h: 'Recebido', num: 1, f: r => money(r.f.receitaPaga) }, { h: 'A receber', num: 1, f: r => money(r.f.receitaPendente) },
      { h: 'Gasto', num: 1, f: r => money(r.f.despesaPaga) }, { h: 'A pagar', num: 1, f: r => money(r.f.despesaPendente) },
      { h: 'Lucro', num: 1, f: r => `<b style="color:${r.f.lucro >= 0 ? 'var(--ok)' : 'var(--err)'}">${money(r.f.lucro)}</b>` }, { h: 'Margem', num: 1, f: r => pct(r.f.margem) },
      { h: 'Projetado', num: 1, f: r => money(r.f.lucroProjetado) }
    ], rows, { foot: ['Total empresa', money(rows.reduce((a, r) => a + (+r.o.valorContrato || 0), 0)), money(g.receitaPaga), money(g.receitaPendente), money(g.despesaPaga), money(g.despesaPendente), money(g.lucro), pct(g.margem), money(g.lucroProjetado)] })}</div>
      <p class="tiny muted">Lançamentos gerais (sem obra): ${geral.length}. Eles entram no total da empresa.</p>
      <div class="card mt"><div class="card-h"><h3>Lucro por obra</h3></div><div class="card-b"><div class="chart-box sm"><canvas id="chLo"></canvas></div></div></div>`;
    UI.chart('chLo', { type: 'bar', data: { labels: rows.map(r => r.o.id), datasets: [{ label: 'Recebido', data: rows.map(r => r.f.receitaPaga), backgroundColor: '#16a34a' }, { label: 'Gasto', data: rows.map(r => r.f.despesaPaga), backgroundColor: '#dc2626' }, { label: 'Lucro', data: rows.map(r => r.f.lucro), backgroundColor: '#2563eb' }] }, options: { scales: { y: { ticks: { callback: UI.moneyTick } } } } });
  },

  /* Aba "Financeiro" dentro da obra */
  blocoObra(c, o, m) {
    const { money, icon, pct } = UI;
    const ls = Store.where('lancamentos', l => l.obraId === o.id).sort((a, b) => (b.dataPagamento || b.vencimento || b.data).localeCompare(a.dataPagamento || a.vencimento || a.data));
    const cats = Calc.porCategoria('despesa', o.id);
    c.innerHTML = `<div class="toolbar">${Auth.can('financeiro.editar') ? `<button class="btn" onclick="Views.financeiro.edit(null,{tipo:'despesa',obraId:'${o.id}'})">${icon('arrow-up-circle')} Despesa</button><button class="btn primary" onclick="Views.financeiro.edit(null,{tipo:'receita',obraId:'${o.id}'})">${icon('arrow-down-circle')} Receita / pagamento do cliente</button>` : ''}
        <span class="tiny muted">Recebido ${money(m.fin.receitaPaga)} (${pct(m.financeiroPct)} do contrato) · gasto ${money(m.fin.despesaPaga)} · lucro ${money(m.fin.lucro)}</span></div>
      <div class="grid g-2-1"><div class="card">${this.tabela(ls, { semObra: 1 })}</div>
        <div class="stack"><div class="card"><div class="card-h"><h3>Gastos por categoria</h3></div><div class="card-b"><div class="chart-box sm"><canvas id="chOc"></canvas></div></div></div>
        <div class="card"><div class="card-h"><h3>Fluxo mensal da obra</h3></div><div class="card-b"><div class="chart-box sm"><canvas id="chOf"></canvas></div></div></div></div></div>`;
    this.bindPagar(c);
    UI.chart('chOc', { type: 'doughnut', data: { labels: cats.map(x => x[0]), datasets: [{ data: cats.map(x => x[1]), backgroundColor: UI.PALETA, borderWidth: 0 }] }, options: { cutout: '60%' } });
    const fx = Calc.fluxoMensal(o.id, 0);
    UI.chart('chOf', { type: 'bar', data: { labels: fx.map(x => Calc.mesLabel(x.mes)), datasets: [{ label: 'Receitas', data: fx.map(x => x.receita), backgroundColor: '#16a34a' }, { label: 'Despesas', data: fx.map(x => x.despesa), backgroundColor: '#dc2626' }] }, options: { scales: { y: { ticks: { callback: UI.moneyTick } } } } });
  },

  async edit(id, preset = {}) {
    const l = id ? Store.get('lancamentos', id) : Object.assign({ tipo: 'receita', status: 'pago', data: UI.today(), vencimento: UI.today(), dataPagamento: UI.today(), forma: 'PIX' }, preset);
    if (!Auth.can('financeiro.editar') && !id) return UI.toast('Sem permissão.', 'err');
    const tipo = l.tipo;
    const list = [
      { k: 'tipo', l: 'Tipo', t: 'select', o: [['receita', 'Receita (entrada)'], ['despesa', 'Despesa (saída)']], blank: false },
      { k: 'categoria', l: 'Categoria', t: 'select', o: tipo === 'receita' ? LISTAS.catReceita : LISTAS.catDespesa, req: 1 },
      { k: 'descricao', l: 'Descrição', req: 1, full: 1 },
      { k: 'valor', l: 'Valor (R$)', t: 'money', req: 1 },
      { k: 'obraId', l: 'Obra', t: 'select', o: () => Store.all('obras').map(o => [o.id, o.id + ' · ' + o.nome]) },
      { k: 'pessoaId', l: tipo === 'receita' ? 'Pagador (cliente da obra)' : 'Fornecedor / favorecido', t: 'select', o: () => tipo === 'receita' ? Views.contratos.clientesOpc(l.obraId, [l.pessoaId]) : Store.all('pessoas').map(p => [p.id, p.nome]) },
      { k: 'forma', l: 'Forma de pagamento', t: 'select', o: LISTAS.formaPgto },
      { k: 'data', l: 'Competência', t: 'date' }, { k: 'vencimento', l: 'Vencimento', t: 'date' },
      { k: 'status', l: 'Situação', t: 'select', o: [['pago', tipo === 'receita' ? 'Recebido' : 'Pago'], ['pendente', 'Pendente']], blank: false },
      { k: 'dataPagamento', l: 'Data do pagamento', t: 'date' },
      { k: 'nf', l: 'Com nota fiscal', t: 'check' }, { k: 'nfNumero', l: 'Nº da NF' },
      { k: 'extraContrato', l: 'Fora do contrato principal da obra (serviço extra/aditivo)', t: 'check', full: 1 },
      { k: 'obs', l: 'Observações', t: 'textarea', full: 1, rows: 2 }
    ];
    const anex = (l.arquivoIds || []).map(a => Store.get('arquivos', a)).filter(Boolean);
    const extra = `<div class="field mt"><label>Comprovantes / NF (anexos)</label>${anex.map(a => `<div class="file">${UI.icon('paperclip')}<span class="nm">${UI.esc(a.nome)}</span><button class="btn ghost sm" data-goto="${a.id}">${UI.icon('external-link')}</button></div>`).join('')}<input type="file" id="lfile" multiple class="input"></div>${id ? `<div class="row mt"><button type="button" class="btn sm" id="lrec">${UI.icon('printer')} ${tipo === 'receita' ? 'Emitir recibo' : 'Recibo de pagamento'}</button></div>` : ''}`;
    const fileHolder = {};
    const p = UI.formModal({ title: id ? `${id} – ${tipo === 'receita' ? 'Receita' : 'Despesa'}` : (tipo === 'receita' ? 'Nova receita' : 'Nova despesa'), list, values: l, extra,
      onDelete: id && Auth.can('financeiro.editar') ? () => { Store.remove('lancamentos', id); App.refresh(); } : null });
    setTimeout(() => { const rb = document.getElementById('lrec'); if (rb) rb.onclick = () => Views.financeiro.recibo(id); const fi = document.getElementById('lfile'); if (fi) fi.onchange = () => fileHolder.files = [...fi.files];
      const so = document.querySelector('.modal [name="obraId"]'); if (so && tipo === 'receita') so.addEventListener('change', () => Views.contratos.trocarClientes(so.closest('.modal'), so.value, 'pessoaId'));
      const ts = document.querySelector('.modal [name="tipo"]'); if (ts) ts.onchange = () => { document.querySelector('.modal-bg').remove(); this.edit(id, Object.assign({}, l, { tipo: ts.value, categoria: '' })); }; }, 50);
    const d = await p; if (!d) return;
    if (d.status === 'pago' && !d.dataPagamento) d.dataPagamento = d.vencimento || d.data;
    if (d.status === 'pendente') d.dataPagamento = '';
    let rec = id ? Store.update('lancamentos', id, d) : Store.insert('lancamentos', Object.assign(d, { arquivoIds: [] }));
    if (fileHolder.files && fileHolder.files.length) {
      const up = await Store.uploadFiles(fileHolder.files, { obraId: d.obraId || null, pasta: d.tipo === 'receita' ? 'COMPROVANTES_PG_CLIENTE' : 'NOTAS FISCAIS', lancamentoId: rec.id });
      Store.update('lancamentos', rec.id, { arquivoIds: [...(rec.arquivoIds || []), ...up.map(u => u.id)] });
    }
    UI.toast('Lançamento salvo: ' + rec.id); App.refresh();
  }
};
Views.financeiro.recibo = function (id) {
  const { esc, money, date } = UI; const l = Store.get('lancamentos', id); const e = Store.db.empresa;
  const p = Store.get('pessoas', l.pessoaId) || {}; const o = Store.get('obras', l.obraId) || {};
  const rec = l.tipo === 'receita';
  const html = `${UI.docHeader('RECIBO', id)}<h1>RECIBO ${money(l.valor)}</h1>
    <p>${rec ? `Recebemos de <b>${esc(p.nome || '__________________')}</b>${p.cpf ? ', CPF/CNPJ ' + esc(p.cpf) : ''}` : `Eu, <b>${esc(p.nome || '__________________')}</b>${p.cpf ? ', CPF/CNPJ ' + esc(p.cpf) : ''}, recebi de <b>${esc(e.nome)}</b>, CNPJ ${esc(e.cnpj)}`}, a importância de <b>${money(l.valor)}</b> (${UI.extenso(l.valor)}), referente a <b>${esc(l.descricao)}</b>${o.nome ? ` – obra/serviço ${esc(o.id)} ${esc(o.nome)}${o.endereco ? ', ' + esc(o.endereco) : ''}` : ''}.</p>
    <p>Forma de pagamento: ${esc(l.forma || '—')}. Data: ${date(l.dataPagamento || l.data)}.</p>
    <p>Para clareza, firmo(amos) o presente recibo, dando plena e geral quitação do valor acima.</p>
    <p>${esc(e.cidade || '')}, ${UI.dateLong(l.dataPagamento || UI.today())}.</p>
    <div class="sig"><div>${rec ? esc(e.nome) + '<br>CNPJ ' + esc(e.cnpj) : esc(p.nome || 'Recebedor')}</div><div>${rec ? esc(p.nome || 'Pagador') : esc(e.nome)}</div></div>`;
  UI.print(html, 'Recibo ' + id);
};
Open.FN = id => Views.financeiro.edit(id);
