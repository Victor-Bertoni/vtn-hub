/* =========================================================
   ENQUADRAMENTO EM TEMPO REAL
   Recalcula a cada lançamento: ME × EPP, faixa do Simples,
   Fator R (Anexo III × V), sublimite de R$ 3,6 mi e teto de
   R$ 4,8 mi. Avisa quando a categoria muda e diz o que muda.
   Base: LC 123/2006 (limites confirmados no Perguntas e
   Respostas do Simples – Receita/CGSN, atualizado em 09/10/2026).
   ========================================================= */
window.Enq = (() => {
  const LIM = () => (window.Conhecimento && Conhecimento.LIMITES) || { ME: 360000, EPP: 4800000, SUB: 3600000 };
  let ME = 360000, EPP = 4800000, SUB = 3600000;
  const addM = (ym, n) => { const d = new Date(ym + '-01T12:00:00'); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 7); };
  const recMes = ym => Store.where('lancamentos', l => l.tipo === 'receita' && l.status === 'pago' && (l.dataPagamento || l.data || '').startsWith(ym)).reduce((s, l) => s + (+l.valor || 0), 0);
  const FOLHA_RE = /pr[oó]-?\s?labore|folha|sal[aá]rio|fgts|inss|encargo/i;

  function cfg() {
    const f = Store.db.fiscalCfg || {};
    return Object.assign({ proLabore: 0, folha: 0, mesesMedia: 3, incluirAReceber: true, anexo: f.anexo || 'III', iss: f.issItabirito || 3 }, f.enq || {}, { anexo: f.anexo || 'III' });
  }
  function salvarCfg(patch) { Store.db.fiscalCfg = Store.db.fiscalCfg || {}; Store.db.fiscalCfg.enq = Object.assign({}, (Store.db.fiscalCfg.enq || {}), patch); Store.save(); }

  /**
   * Estado completo. extraMensal/extraUnico permitem simular
   * "e se eu faturar mais X por mês / fechar um contrato de Y".
   */
  function estado(sim = {}) {
    ({ ME, EPP, SUB } = LIM());
    const c = cfg(); const extraMensal = +sim.extraMensal || 0, extraUnico = +sim.extraUnico || 0;
    const hoje = UI.today(), ym = hoje.slice(0, 7), Y = +ym.slice(0, 4), M = +ym.slice(5, 7);
    // histórico real (13 meses) e média dos últimos meses fechados
    const hist = []; for (let i = -24; i <= 0; i++) { const m = addM(ym, i); hist.push({ ym: m, v: recMes(m), real: true }); }
    const fechados = hist.slice(-1 - c.mesesMedia, -1);
    const media = fechados.reduce((s, x) => s + x.v, 0) / Math.max(1, fechados.length) + extraMensal;
    // contas a receber já lançadas (vencendo nos próximos 12 meses)
    const aRec = {}; if (c.incluirAReceber) Store.where('lancamentos', l => l.tipo === 'receita' && l.status !== 'pago' && l.vencimento).forEach(l => { const m = l.vencimento.slice(0, 7); aRec[m] = (aRec[m] || 0) + (+l.valor || 0); });
    // projeção 12 meses: maior entre a média e o que já está a receber
    const proj = []; for (let i = 0; i <= 12; i++) {
      const m = addM(ym, i); const real = i === 0 ? hist[hist.length - 1].v : 0;
      const v = i === 0 ? Math.max(real, Math.max(media, real + (aRec[m] || 0))) + extraUnico : Math.max(media, aRec[m] || 0);
      proj.push({ ym: m, v, real: i === 0 ? real : 0 });
    }
    const serie = hist.slice(0, -1).concat(proj); // meses passados + atual(proj) + futuros
    const valorEm = m => (serie.find(x => x.ym === m) || { v: 0 }).v;
    const rbt12De = comp => { let s = 0; for (let i = 1; i <= 12; i++) s += valorEm(addM(comp, -i)); return s; };

    const anoAnt = hist.filter(x => x.ym.startsWith(String(Y - 1))).reduce((s, x) => s + x.v, 0);
    const acumAno = hist.filter(x => x.ym.startsWith(String(Y))).reduce((s, x) => s + x.v, 0) + extraUnico;
    const projAno = serie.filter(x => x.ym.startsWith(String(Y))).reduce((s, x) => s + x.v, 0);
    const r12 = rbt12De(ym);

    // Fator R: pró-labore + salários + encargos dos últimos 12 meses ÷ RBT12
    const ini = addM(ym, -12);
    const folhaLanc = Store.where('lancamentos', l => l.tipo === 'despesa' && l.status === 'pago' && FOLHA_RE.test((l.categoria || '') + ' ' + (l.descricao || '')) && (l.dataPagamento || l.data || '').slice(0, 7) >= ini && (l.dataPagamento || l.data || '').slice(0, 7) < ym).reduce((s, l) => s + l.valor, 0);
    const folha12 = folhaLanc + (c.proLabore + c.folha) * 12 * 1.0;
    const informouFolha = folha12 > 0;
    const fatorR = r12 > 0 ? folha12 / r12 * 100 : 0;
    const anexo = c.anexo === 'III' && informouFolha ? (fatorR >= 28 ? 'III' : 'V') : c.anexo;
    const proLaboreMin = Math.max(0, 0.28 * Math.max(r12, projAno) - folhaLanc - c.folha * 12) / 12;

    // categoria
    const catAtual = anoAnt > ME ? 'EPP' : 'ME';
    const catProx = projAno > EPP ? 'Fora do Simples' : projAno > ME ? 'EPP' : 'ME';
    const s = Fiscal.simples(r12 || media * 12, anexo);
    const faixas = Fiscal.ANEXOS[anexo].faixas;
    const limFaixa = faixas[s.faixa - 1][0];
    // quando muda de faixa (RBT12 projetada) e quando o acumulado do ano passa de 360 mil
    let mudaFaixa = null; for (let i = 1; i <= 12; i++) { const comp = addM(ym, i); const r = rbt12De(comp); const f = Fiscal.simples(r, anexo); if (f.faixa !== s.faixa) { mudaFaixa = { ym: comp, faixa: f.faixa, rbt12: r, efetiva: f.efetiva }; break; } }
    let cruzaME = null; if (catAtual === 'ME') { let a = 0; for (const x of serie.filter(x => x.ym.startsWith(String(Y)))) { a += x.v; if (a > ME) { cruzaME = x.ym; break; } } }
    const simplesStatus = acumAno > EPP * 1.2 ? 'excluida_mes' : acumAno > EPP ? 'excluida_ano' : acumAno > SUB * 1.2 ? 'sub_mes' : acumAno > SUB ? 'sub_ano' : 'ok';
    const efet12 = Fiscal.simples(rbt12De(addM(ym, 12)), anexo).efetiva;

    return { hoje, ym, Y, M, media, hist, proj, serie, anoAnt, acumAno, projAno, r12, folha12, folhaLanc, informouFolha, fatorR, anexo, anexoCfg: c.anexo, proLaboreMin,
      catAtual, catProx, faixa: s.faixa, nominal: s.nominal, efetiva: s.efetiva, efet12, limFaixa, faixas, mudaFaixa, cruzaME, simplesStatus, rbt12De, cfg: c,
      pctME: acumAno / ME * 100, pctEPP: acumAno / EPP * 100, pctSUB: acumAno / SUB * 100, pctFaixa: r12 / limFaixa * 100 };
  }

  const STATUS_TXT = { ok: 'No Simples – ISS dentro do DAS', sub_ano: 'Passou do sublimite: ISS fora do DAS a partir de 01/01', sub_mes: 'Passou do sublimite em +20%: ISS fora do DAS no mês seguinte', excluida_ano: 'Passou de R$ 4,8 mi: exclusão do Simples em 01/01', excluida_mes: 'Passou de R$ 4,8 mi em +20%: exclusão no mês seguinte' };
  function snap(e) { return { cat: e.catAtual, prox: e.catProx, faixa: e.faixa, anexo: e.anexo, simples: e.simplesStatus }; }

  /** O que muda em cada transição (legislação + prática) */
  const MUDANCAS = {
    faixa: { titulo: 'Mudança de faixa do Simples', icon: 'trending-up', fonte: 'LC 123/2006, art. 18 e Anexos', itens: [
      'A alíquota nominal e a parcela a deduzir mudam; a alíquota efetiva sobe aos poucos (não há "salto" no imposto).',
      'A repartição do DAS muda (percentual de ISS, IRPJ, CSLL, CPP).',
      'O cálculo é automático no PGDAS-D, pela receita bruta dos 12 meses anteriores (RBT12).'] },
    me_epp: { titulo: 'ME → EPP (receita do ano acima de R$ 360 mil)', icon: 'building-2', fonte: 'LC 123/2006, art. 3º (conferido no Planalto e no manual da Receita/CGSN)', itens: [
      'A empresa continua no Simples Nacional e o DAS segue a mesma tabela (o que muda o imposto é a faixa da RBT12, não o porte).',
      'O enquadramento passa a EPP a partir de 1º de janeiro do ano seguinte. Comunique a Junta Comercial (JUCEMG) – confirme o procedimento com o contador.',
      'Continuam valendo para EPP: preferência em licitações (empate ficto, prazo para regularizar certidões, licitações exclusivas até R$ 80 mil) – LC 123, arts. 42 a 49.',
      'Linhas de crédito para micro e pequenas empresas (ex.: Pronampe) seguem acessíveis até R$ 4,8 mi de receita – confira as regras vigentes do banco.',
      'Benefícios locais exclusivos de ME (se a prefeitura ou o estado tiver) deixam de valer.'] },
    fator_r: { titulo: 'Fator R abaixo de 28% → Anexo V', icon: 'percent', fonte: 'LC 123/2006, art. 18, §§ 5º-J e 5º-M (conferido no Planalto)', itens: [
      'Serviços de engenharia e projetos saem do Anexo III (alíquota inicial 6%) e vão para o Anexo V (15,5%).',
      'Folha considerada: pró-labore, salários, FGTS e INSS patronal dos últimos 12 meses ÷ receita bruta dos 12 meses.',
      'Saída usual: ajustar o pró-labore (há 11% de INSS e IRRF pela tabela) – o app calcula o valor mínimo mensal.',
      'Obras de construção civil são do Anexo IV e não dependem do Fator R (mas pagam o INSS patronal fora do DAS).'] },
    sublimite: { titulo: 'Sublimite de R$ 3,6 milhões', icon: 'landmark', fonte: 'LC 123/2006, art. 13-A e art. 20, § 1º-A (conferido no Planalto)', itens: [
      'Acima de R$ 3,6 mi no ano, o ISS deixa de ser pago no DAS e passa a ser recolhido direto à prefeitura (alíquota municipal de 2% a 5%).',
      'Excesso de até 20% (até R$ 4,32 mi): efeito a partir de 1º de janeiro do ano seguinte.',
      'Excesso acima de 20%: efeito já no mês seguinte ao excesso.',
      'Tributos federais continuam no DAS.'] },
    teto: { titulo: 'Teto de R$ 4,8 milhões – saída do Simples', icon: 'log-out', fonte: 'LC 123/2006, art. 3º, §§ 9º e 9º-A (conferido no Planalto)', itens: [
      'Excesso de até 20% (até R$ 5,76 mi): exclusão a partir de 1º de janeiro do ano seguinte. Acima de 20%: exclusão já no mês seguinte.',
      'Opções: Lucro Presumido ou Lucro Real. No Presumido, serviços presumem 32% de lucro para IRPJ e CSLL; obra por empreitada com fornecimento de todo o material presume 8% (IRPJ) e 12% (CSLL) – Lei 9.249/1995.',
      'PIS 0,65% e COFINS 3% (cumulativos), ISS municipal e INSS patronal de 20% sobre a folha (+ RAT e terceiros).',
      'LC 224/2025: a parte da receita acima de R$ 5 mi/ano tem presunção 10% maior desde 2026 (tema com liminares na Justiça).',
      'A partir de 2027 entram CBS e, gradualmente, o IBS (reforma tributária).'] }
  };

  /** Lista de alertas para o painel e para o topo */
  function alertas(e = estado()) {
    const out = []; const { money, pct } = UI;
    if (e.catAtual === 'ME' && e.pctME >= 70) out.push([e.pctME >= 100 ? 'err' : 'warn', 'building-2', e.pctME >= 100 ? `Receita do ano passou de R$ 360 mil (${money(e.acumAno)}): a VTN vira EPP em 01/01/${e.Y + 1}` : `Receita do ano em ${pct(e.pctME, 0)} do limite de ME${e.cruzaME ? ' – previsão de passar em ' + Calc.mesLabel(e.cruzaME) : ''}`, 'me_epp']);
    if (e.mudaFaixa) out.push(['warn', 'trending-up', `Simples: muda para a faixa ${e.mudaFaixa.faixa} em ${Calc.mesLabel(e.mudaFaixa.ym)} (alíquota efetiva ${pct(e.efetiva, 2)} → ${pct(e.mudaFaixa.efetiva, 2)})`, 'faixa']);
    if (e.anexoCfg === 'III') {
      if (!e.informouFolha) out.push(['info', 'percent', 'Informe o pró-labore em Enquadramento para o app calcular o Fator R (Anexo III × V)', 'fator_r']);
      else if (e.fatorR < 28) out.push(['err', 'percent', `Fator R em ${pct(e.fatorR, 1)}: serviços caem no Anexo V. Pró-labore mínimo sugerido ${money(e.proLaboreMin)}/mês`, 'fator_r']);
      else if (e.fatorR < 31) out.push(['warn', 'percent', `Fator R em ${pct(e.fatorR, 1)} – perto do limite de 28%`, 'fator_r']);
    }
    if (e.pctSUB >= 80 && e.simplesStatus === 'ok') out.push(['warn', 'landmark', `Receita do ano em ${pct(e.pctSUB, 0)} do sublimite de R$ 3,6 mi`, 'sublimite']);
    if (e.simplesStatus !== 'ok') out.push(['err', 'log-out', STATUS_TXT[e.simplesStatus], e.simplesStatus.startsWith('sub') ? 'sublimite' : 'teto']);
    return out;
  }

  /** Chip no topo do app */
  function chip() {
    const el = document.getElementById('enqChip'); if (!el) return;
    try {
      const e = estado(); const al = alertas(e); const nivel = al.some(a => a[0] === 'err') ? 'err' : al.some(a => a[0] === 'warn') ? 'warn' : 'ok';
      el.className = 'enq-chip ' + nivel; el.title = al.map(a => a[2]).join('\n') || 'Enquadramento em dia';
      el.innerHTML = `<i></i><b>${e.catAtual}</b><span>Anexo ${e.anexo} · faixa ${e.faixa} · ${UI.pct(e.efetiva, 2)}</span>`;
    } catch (err) { el.innerHTML = ''; }
  }

  /** Vigia em tempo real: roda a cada gravação no banco */
  let busy = false;
  function check(silent) {
    if (busy || !Store.db) return;
    const e = estado(); const novo = snap(e); const old = Store.db.enqSnap;
    busy = true;
    try {
      if (!old) { Store.db.enqSnap = novo; Store.save(); return; }
      const ev = [];
      if (old.cat !== novo.cat) ev.push(['me_epp', `Enquadramento: ${old.cat} → ${novo.cat}`]);
      if (old.prox !== novo.prox) ev.push(['me_epp', `Projeção do ano: ${old.prox} → ${novo.prox}`]);
      if (old.faixa !== novo.faixa) ev.push(['faixa', `Faixa do Simples: ${old.faixa}ª → ${novo.faixa}ª`]);
      if (old.anexo !== novo.anexo) ev.push(['fator_r', `Anexo: ${old.anexo} → ${novo.anexo}`]);
      if (old.simples !== novo.simples) ev.push([novo.simples.startsWith('sub') ? 'sublimite' : 'teto', STATUS_TXT[novo.simples]]);
      if (ev.length) {
        Store.db.enqHist = Store.db.enqHist || [];
        ev.forEach(x => Store.db.enqHist.unshift({ data: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 19), tipo: x[0], texto: x[1], acumAno: e.acumAno, rbt12: e.r12 }));
        Store.db.enqHist = Store.db.enqHist.slice(0, 100);
        Store.db.enqSnap = novo; Store.save();
        if (!silent) ev.forEach(x => UI.toast('⚠ ' + x[1] + ' – veja o que muda em Enquadramento', 'warn'));
        if (window.Central && Central.cfg().enquadramento) Central.enviar('enquadramento', { origem: 'automático', titulo: 'Alerta de enquadramento – ' + ev.map(x => x[1]).join('; ') });
      }
    } finally { busy = false; }
    chip();
  }
  function watch() { Store.on(() => { if (!busy) { check(false); } }); check(true); }

  return { get ME() { return LIM().ME; }, get EPP() { return LIM().EPP; }, get SUB() { return LIM().SUB; }, estado, alertas, chip, check, watch, cfg, salvarCfg, MUDANCAS, STATUS_TXT, addM };
})();

/* liga o vigia depois que o app carregar */
document.addEventListener('vtn:pronto', () => setTimeout(() => { if (!Store.db) return; Enq.watch(); window.Central && Central.auto(); }, 0));
