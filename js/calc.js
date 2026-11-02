/* =========================================================
   CALC — métricas de gestão (físico, financeiro, prazo, caixa)
   ========================================================= */
window.Calc = (() => {
  const T = () => UI.today();
  const lanc = obraId => Store.where('lancamentos', l => !obraId || l.obraId === obraId);
  const isAtrasado = l => l.status !== 'pago' && l.vencimento && l.vencimento < T();

  function fin(obraId, { de, ate } = {}) {
    let ls = lanc(obraId);
    if (de) ls = ls.filter(l => (l.dataPagamento || l.data) >= de);
    if (ate) ls = ls.filter(l => (l.dataPagamento || l.data) <= ate);
    const s = (tipo, st) => ls.filter(l => l.tipo === tipo && (!st || l.status === st)).reduce((a, l) => a + (+l.valor || 0), 0);
    const r = {
      receitaPaga: s('receita', 'pago'), receitaPendente: s('receita', 'pendente'),
      despesaPaga: s('despesa', 'pago'), despesaPendente: s('despesa', 'pendente'),
      receitaNF: ls.filter(l => l.tipo === 'receita' && l.status === 'pago' && l.nf).reduce((a, l) => a + l.valor, 0),
      atrasadoReceber: ls.filter(l => l.tipo === 'receita' && isAtrasado(l)).reduce((a, l) => a + l.valor, 0),
      atrasadoPagar: ls.filter(l => l.tipo === 'despesa' && isAtrasado(l)).reduce((a, l) => a + l.valor, 0)
    };
    r.lucro = r.receitaPaga - r.despesaPaga;
    r.margem = r.receitaPaga ? r.lucro / r.receitaPaga * 100 : 0;
    r.lucroProjetado = r.receitaPaga + r.receitaPendente - r.despesaPaga - r.despesaPendente;
    return r;
  }

  /** Avanço físico ponderado pelo valor de cada etapa */
  /** Obras CAIXA em execução: o avanço vem da última PLS (fisicoPorMedicao) */
  function ultimaMedicao(obraId) {
    const m = Store.where('medicoes', x => x.obraId === obraId && +x.acumulado > 0).sort((a, b) => a.data.localeCompare(b.data));
    return m.length ? +m[m.length - 1].acumulado : 0;
  }
  function fisico(obraId) {
    const ob = Store.get('obras', obraId);
    if (ob && ob.fisicoPorMedicao) return ultimaMedicao(obraId);
    const ets = Store.where('etapas', e => e.obraId === obraId);
    const tot = ets.reduce((a, e) => a + (+e.valor || 0), 0);
    if (!ets.length) return 0;
    if (!tot) return ets.reduce((a, e) => a + (+e.exec || 0), 0) / ets.length;
    return ets.reduce((a, e) => a + (+e.valor || 0) * (+e.exec || 0) / 100, 0) / tot * 100;
  }
  /** Avanço previsto na data (linear dentro de cada etapa) */
  function previsto(obraId, data = T()) {
    const ob = Store.get('obras', obraId);
    if (ob && ob.fisicoPorMedicao) {
      if (!ob.dataInicio || !ob.dataPrevTermino) return null;
      if (data <= ob.dataInicio) return 0;
      return Math.min(100, UI.daysBetween(ob.dataInicio, data) / Math.max(1, UI.daysBetween(ob.dataInicio, ob.dataPrevTermino)) * 100);
    }
    const todas = Store.where('etapas', e => e.obraId === obraId);
    const ets = todas.filter(e => e.inicioPrev && e.fimPrev);
    if (!ets.length) return null;
    // etapas sem datas entram no total (peso) mas não somam no previsto
    const tot = todas.reduce((a, e) => a + (+e.valor || 0), 0) || todas.length;
    return ets.reduce((a, e) => {
      const w = !todas.some(x => x.valor) ? 1 : (+e.valor || 0);
      let f = 0;
      if (data >= e.fimPrev) f = 1; else if (data > e.inicioPrev) f = UI.daysBetween(e.inicioPrev, data) / Math.max(1, UI.daysBetween(e.inicioPrev, e.fimPrev));
      return a + w * f;
    }, 0) / tot * 100;
  }
  function prazo(o) {
    if (!o.dataInicio || !o.dataPrevTermino) return { pct: 0, dias: 0, restantes: 0, atraso: 0 };
    const total = Math.max(1, UI.daysBetween(o.dataInicio, o.dataPrevTermino));
    const ref = o.dataTermino || T();
    const dec = Math.max(0, UI.daysBetween(o.dataInicio, ref));
    const conc = ['Concluída', 'Cancelada'].includes(o.status) || fisico(o.id) >= 99.9;
    return { pct: Math.min(100, dec / total * 100), total, decorridos: dec, restantes: UI.daysBetween(ref, o.dataPrevTermino), atraso: !conc && ref > o.dataPrevTermino ? UI.daysBetween(o.dataPrevTermino, ref) : 0 };
  }
  /** Painel completo de uma obra */
  function obra(o) {
    const f = fin(o.id), fis = fisico(o.id), prev = previsto(o.id), pz = prazo(o);
    const pend = Store.where('pendencias', p => p.obraId === o.id && p.status !== 'Resolvida');
    const ents = Store.where('entregas', e => e.obraId === o.id);
    const os = Store.where('os', x => x.obraId === o.id);
    const idp = prev ? fis / Math.max(0.1, prev) : null; // índice de desempenho de prazo (físico ÷ previsto)
    const nivel = fis >= 99.9 ? 'Executada' : idp == null ? '—' : idp >= 1.02 ? 'Adiantada' : idp >= 0.95 ? 'No prazo' : idp >= 0.8 ? 'Atenção' : 'Atrasada';
    const contrato = +o.valorContrato || 0;
    const recContrato = Store.where('lancamentos', l => l.obraId === o.id && l.tipo === 'receita' && l.status === 'pago' && !l.extraContrato).reduce((a, l) => a + l.valor, 0);
    return {
      fin: f, fisico: fis, previsto: prev, prazo: pz, idp, nivel,
      financeiroPct: contrato ? recContrato / contrato * 100 : 0,
      recebidoContrato: recContrato,
      saldoContrato: contrato - recContrato,
      pendAbertas: pend.length, pendCriticas: pend.filter(p => ['Alta', 'Crítica'].includes(p.prioridade)).length,
      pendAtrasadas: pend.filter(p => p.prazo && p.prazo < T()).length,
      entregasPend: ents.filter(e => !['Entregue', 'Aprovada'].includes(e.status)).length,
      entregasOk: ents.filter(e => ['Entregue', 'Aprovada'].includes(e.status)).length,
      osAbertas: os.filter(x => !['Concluída', 'Cancelada'].includes(x.status)).length,
      custoM2: o.area ? f.despesaPaga / o.area : 0
    };
  }

  /** Série mensal de caixa: [{mes:'2025-08', receita, despesa, saldo, acumulado}] */
  function fluxoMensal(obraId, meses = 12, incluirPendente = false) {
    const ls = lanc(obraId).filter(l => incluirPendente || l.status === 'pago');
    const keys = new Set(ls.map(l => (l.dataPagamento || l.vencimento || l.data || '').slice(0, 7)).filter(Boolean));
    let arr = [...keys].sort();
    if (meses && arr.length > meses) arr = arr.slice(-meses);
    let ac = 0;
    // acumulado considera tudo antes da janela
    const first = arr[0];
    ls.forEach(l => { const k = (l.dataPagamento || l.vencimento || l.data || '').slice(0, 7); if (k && k < first) ac += l.tipo === 'receita' ? l.valor : -l.valor; });
    return arr.map(m => {
      const r = ls.filter(l => (l.dataPagamento || l.vencimento || l.data || '').startsWith(m));
      const rec = r.filter(l => l.tipo === 'receita').reduce((a, l) => a + l.valor, 0);
      const des = r.filter(l => l.tipo === 'despesa').reduce((a, l) => a + l.valor, 0);
      ac += rec - des;
      return { mes: m, receita: rec, despesa: des, saldo: rec - des, acumulado: ac };
    });
  }
  const mesLabel = m => UI.MES_AB[+m.slice(5, 7) - 1] + '/' + m.slice(2, 4);

  function porCategoria(tipo, obraId) {
    const m = {};
    lanc(obraId).filter(l => l.tipo === tipo && l.status === 'pago').forEach(l => m[l.categoria] = (m[l.categoria] || 0) + l.valor);
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }

  function global() {
    const obras = Store.all('obras');
    const ativas = obras.filter(o => !['Concluída', 'Cancelada', 'Prospecção', 'Orçamento'].includes(o.status));
    const f = fin();
    const carteira = ativas.reduce((a, o) => a + (+o.valorContrato || 0), 0);
    const saldoCarteira = ativas.reduce((a, o) => a + Math.max(0, (+o.valorContrato || 0) - fin(o.id).receitaPaga), 0);
    const pend = Store.where('pendencias', p => p.status !== 'Resolvida');
    const orcs = Store.all('orcamentos');
    const conv = orcs.filter(o => ['Aprovado', 'Recusado'].includes(o.status));
    return {
      obras: obras.length, ativas: ativas.length, carteira, saldoCarteira, fin: f,
      ticketMedio: obras.length ? obras.reduce((a, o) => a + (+o.valorContrato || 0), 0) / obras.length : 0,
      pendAbertas: pend.length, pendAtrasadas: pend.filter(p => p.prazo && p.prazo < T()).length,
      osAbertas: Store.where('os', x => !['Concluída', 'Cancelada'].includes(x.status)).length,
      entregasPend: Store.where('entregas', e => !['Entregue', 'Aprovada'].includes(e.status)).length,
      taxaConversao: conv.length ? conv.filter(o => o.status === 'Aprovado').length / conv.length * 100 : 0,
      fisicoMedio: ativas.length ? ativas.reduce((a, o) => a + fisico(o.id), 0) / ativas.length : 0
    };
  }
  function orcTotal(o) {
    const sub = (o.itens || []).reduce((a, i) => a + (+i.qtd || 0) * (+i.unit || 0), 0);
    const bdi = sub * (+o.bdi || 0) / 100;
    const imp = (sub + bdi) * (+o.imposto || 0) / 100;
    return { sub, bdi, imp, desconto: +o.desconto || 0, total: sub + bdi + imp - (+o.desconto || 0) };
  }
  return { fin, fisico, previsto, prazo, obra, fluxoMensal, mesLabel, porCategoria, global, orcTotal, isAtrasado };
})();
