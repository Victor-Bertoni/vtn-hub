/* Relatórios das ferramentas novas: gastos, notas fiscais, folha/ponto e fornecedores
   (entram na Central de relatórios com os mesmos filtros de dados e de conteúdo). */
(() => {
  const V = Views.relatorios; const G = V.graf;
  const kp = arr => `<div class="rk">${arr.map(x => `<div><span>${x[0]}</span><b>${x[1]}</b>${x[2] ? `<small>${x[2]}</small>` : ''}</div>`).join('')}</div>`;
  const tbl = (h, rows) => rows.length ? `<table><thead><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '<p class="tiny">Nada para mostrar.</p>';
  const grp = (arr, fn, val) => { const m = {}; arr.forEach(x => { const k = fn(x) || 'Não informado'; m[k] = (m[k] || 0) + (val ? val(x) : 1); }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  V.TIPOS.push(
    ['gastos', 'Análise de gastos', 'financeiro', 'Por categoria, obra e fornecedor, tendência e maiores gastos.'],
    ['notas', 'Notas fiscais (emitidas e recebidas)', 'fiscal', 'Notas por mês, retenções e o que está sem nota.'],
    ['folha', 'Folha de pagamento e ponto', 'operacional', 'Holerites, horas, extras, faltas e custo da mão de obra por obra.'],
    ['fornecedores', 'Fornecedores', 'financeiro', 'Quanto se comprou de cada um, a pagar, notas e avaliações.']
  );
  const corpo0 = V.corpo;
  V.corpo = function (s) {
    const { money, esc, date, pct } = UI; const inP = d => (!s.de || (d || '') >= s.de) && (!s.ate || (d || '') <= s.ate);
    const periodo = s.de || s.ate ? `${date(s.de) || 'início'} a ${date(s.ate) || 'hoje'}` : 'todo o histórico';
    const nomeP = id => (Store.get('pessoas', id) || {}).nome || 'Não informado', nomeO = id => id ? ((Store.get('obras', id) || {}).nome || id).slice(0, 34) : 'Geral / escritório';
    if (s.tipo === 'gastos') {
      const D = Store.where('lancamentos', l => l.tipo === 'despesa' && l.status === 'pago' && (!s.obra || l.obraId === s.obra) && inP(l.dataPagamento || l.data));
      const tot = D.reduce((a, l) => a + l.valor, 0); const ms = [...new Set(D.map(l => (l.dataPagamento || l.data || '').slice(0, 7)))].sort().slice(-12);
      return `${this.rhead('ANÁLISE DE GASTOS', periodo)}<h1>Análise de gastos</h1>
        ${kp([['Total gasto', money(tot)], ['Pagamentos', D.length, 'ticket médio ' + money(D.length ? tot / D.length : 0)], ['Sem nota fiscal', pct(tot ? D.filter(l => !l.nf).reduce((a, l) => a + l.valor, 0) / tot * 100 : 0, 0)], ['Sem comprovante', D.filter(l => !(l.arquivoIds || []).length).length]])}
        <h2>Por categoria</h2>${G.donut(grp(D, l => l.categoria, l => l.valor), money, 'Gasto')}
        <h2>Por obra</h2>${G.donut(grp(D, l => nomeO(l.obraId), l => l.valor), money, 'Gasto')}
        <h2>Evolução mensal</h2>${G.linha(ms.map(m => Calc.mesLabel(m).slice(0, 3)), [{ nome: 'Gastos', cor: '#dc2626', vals: ms.map(m => D.filter(l => (l.dataPagamento || l.data || '').startsWith(m)).reduce((a, l) => a + l.valor, 0)) }])}
        <h2>Maiores fornecedores</h2>${tbl(['Fornecedor', 'Pagamentos', 'Valor', '% do total'], grp(D, l => nomeP(l.pessoaId), l => l.valor).slice(0, 15).map(([n, v]) => [esc(n), D.filter(l => nomeP(l.pessoaId) === n).length, money(v), pct(tot ? v / tot * 100 : 0)]))}
        <h2>Maiores gastos</h2>${tbl(['Data', 'Descrição', 'Obra', 'NF', 'Valor'], D.slice().sort((a, b) => b.valor - a.valor).slice(0, 20).map(l => [date(l.dataPagamento || l.data), esc(l.descricao), esc(nomeO(l.obraId)), l.nf ? 'Sim ' + esc(l.nfNumero || '') : 'Não', money(l.valor)]))}`;
    }
    if (s.tipo === 'notas') {
      const L = Store.where('lancamentos', l => (!s.obra || l.obraId === s.obra) && inP(l.nfEmissao || l.dataPagamento || l.data));
      const E = L.filter(l => l.tipo === 'receita' && l.nf), R = L.filter(l => l.tipo === 'despesa' && l.nf), semD = L.filter(l => l.tipo === 'despesa' && l.status === 'pago' && !l.nf && !['Pró-labore', 'Distribuição de lucros', 'Impostos', 'Comissões'].includes(l.categoria)), semR = L.filter(l => l.tipo === 'receita' && l.status === 'pago' && !l.nf);
      const v = l => +l.nfValor || +l.valor || 0; const ms = [...new Set(L.map(l => (l.nfEmissao || l.dataPagamento || l.data || '').slice(0, 7)))].filter(Boolean).sort().slice(-12);
      const mesL = l => (l.nfEmissao || l.dataPagamento || l.data || '').slice(0, 7);
      return `${this.rhead('NOTAS FISCAIS', periodo)}<h1>Notas fiscais</h1>
        ${kp([['Emitidas', money(E.reduce((a, l) => a + v(l), 0)), E.length + ' notas'], ['Recebidas', money(R.reduce((a, l) => a + v(l), 0)), R.length + ' notas'], ['Recebido sem nota emitida', money(semR.reduce((a, l) => a + l.valor, 0)), semR.length + ' recebimentos'], ['Gastos sem nota', money(semD.reduce((a, l) => a + l.valor, 0)), semD.length + ' pagamentos']])}
        <h2>Notas por mês</h2>${G.linha(ms.map(m => Calc.mesLabel(m).slice(0, 3)), [{ nome: 'Emitidas', cor: '#16a34a', vals: ms.map(m => E.filter(l => mesL(l) === m).reduce((a, l) => a + v(l), 0)) }, { nome: 'Recebidas', cor: '#dc2626', vals: ms.map(m => R.filter(l => mesL(l) === m).reduce((a, l) => a + v(l), 0)) }])}
        <h2>Notas emitidas</h2>${tbl(['Nº', 'Emissão', 'Tomador', 'Obra', 'ISS retido', 'INSS', 'Valor'], E.map(l => [esc(l.nfNumero || ''), date(l.nfEmissao || l.data), esc(l.nfTomador || nomeP(l.pessoaId)), esc(nomeO(l.obraId)), l.issRetido ? money(l.nfIss) : '—', +l.nfInss ? money(l.nfInss) : '—', money(v(l))]))}
        <h2>Notas recebidas</h2>${G.donut(grp(R, l => l.nfEmitente || nomeP(l.pessoaId), v), money, 'Recebidas')}${tbl(['Nº', 'Emissão', 'Emitente', 'Obra', 'Valor'], R.map(l => [esc(l.nfNumero || ''), date(l.nfEmissao || l.data), esc(l.nfEmitente || nomeP(l.pessoaId)), esc(nomeO(l.obraId)), money(v(l))]))}
        <h2>Gastos pagos sem nota</h2>${tbl(['Data', 'Descrição', 'Fornecedor', 'Valor'], semD.sort((a, b) => b.valor - a.valor).slice(0, 40).map(l => [date(l.dataPagamento || l.data), esc(l.descricao), esc(nomeP(l.pessoaId)), money(l.valor)]))}`;
    }
    if (s.tipo === 'folha') {
      const mes = s.de ? s.de.slice(0, 7) : UI.today().slice(0, 7); const F = Store.where('folha', f => f.mes === mes);
      const P = Store.where('ponto', x => (x.data || '').startsWith(mes) && (!s.obra || x.obraId === s.obra));
      const dias = grp(P, x => x.pessoaId + '|' + x.data).length;
      return `${this.rhead('FOLHA DE PAGAMENTO E PONTO', Calc.mesLabel(mes))}<h1>Folha de pagamento – ${Calc.mesLabel(mes)}</h1>
        ${kp([['Holerites', F.length, F.filter(f => f.status === 'Pago').length + ' pagos'], ['Líquido total', money(F.reduce((a, f) => a + (+f.liquido || 0), 0))], ['FGTS', money(F.reduce((a, f) => a + (+f.fgts || 0), 0))], ['Dias-pessoa com ponto', dias, P.length + ' marcações']])}
        <h2>Líquido por funcionário</h2>${G.donut(F.map(f => [nomeP(f.pessoaId), +f.liquido || 0]).sort((a, b) => b[1] - a[1]), money, 'Líquido')}
        ${tbl(['Funcionário', 'Vínculo', 'Proventos', 'Descontos', 'Líquido', 'FGTS', 'Situação'], F.map(f => [esc(nomeP(f.pessoaId)), esc(f.vinculo || ''), money(f.proventos), money(f.descontos), money(f.liquido), money(f.fgts), esc(f.status)]))}
        <h2>Dias de trabalho por obra (ponto)</h2>${G.donut(grp(P.filter(x => x.tipo === 'entrada'), x => nomeO(x.obraId)), x => x + ' dias', 'Dias')}
        <p class="tiny">Escolha o mês no campo "De". Estimativa gerencial – a folha oficial é da contabilidade.</p>`;
    }
    if (s.tipo === 'fornecedores') {
      const D = Store.where('lancamentos', l => l.tipo === 'despesa' && l.pessoaId && (!s.obra || l.obraId === s.obra) && inP(l.dataPagamento || l.vencimento || l.data));
      const ids = [...new Set(D.map(l => l.pessoaId))]; const linhas = ids.map(id => { const L = D.filter(l => l.pessoaId === id); const pg = L.filter(l => l.status === 'pago'); const p = Store.get('pessoas', id) || {}; const av = ((p.forn || {}).avaliacoes || []);
        return [p.nome || id, pg.reduce((a, l) => a + l.valor, 0), L.filter(l => l.status !== 'pago').reduce((a, l) => a + l.valor, 0), pg.length, pg.length ? pg.filter(l => l.nf).length / pg.length * 100 : 0, av.length ? av.reduce((a, x) => a + ([x.qual, x.prazo, x.preco, x.atend].filter(Boolean).reduce((s2, v, i, arr) => s2 + v / arr.length, 0)), 0) / av.length : null]; }).sort((a, b) => b[1] - a[1]);
      const tot = linhas.reduce((a, x) => a + x[1], 0);
      return `${this.rhead('FORNECEDORES', periodo)}<h1>Fornecedores</h1>
        ${kp([['Fornecedores', linhas.length], ['Pago', money(tot)], ['A pagar', money(linhas.reduce((a, x) => a + x[2], 0))], ['Top 3', pct(tot ? linhas.slice(0, 3).reduce((a, x) => a + x[1], 0) / tot * 100 : 0, 0), 'do total pago']])}
        <h2>Concentração das compras</h2>${G.donut(linhas.map(x => [x[0], x[1]]), money, 'Pago')}
        ${tbl(['Fornecedor', 'Pago', 'A pagar', 'Pagamentos', 'Com NF', 'Avaliação'], linhas.map(x => [esc(x[0]), money(x[1]), money(x[2]), x[3], pct(x[4], 0), x[5] == null ? '—' : UI.num(Math.round(x[5] * 10) / 10) + ' / 5']))}`;
    }
    return corpo0.call(this, s);
  };
})();
