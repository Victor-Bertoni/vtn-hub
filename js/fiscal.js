/* =========================================================
   FISCAL — feriados (nacionais, MG, municipais), obrigações
   tributárias/trabalhistas/conselhos e cálculo do Simples Nacional.
   ⚠️ Datas e regras são referência: confirme com a contabilidade.
   ========================================================= */
window.Fiscal = (() => {
  const pad = n => String(n).padStart(2, '0');
  const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

  /* Páscoa (algoritmo de Meeus/Jones/Butcher) */
  function pascoa(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
    return iso(y, mes, dia);
  }

  /** Feriados do ano. esfera: Nacional | Estadual | Municipal BH | Municipal Itabirito | Facultativo */
  function feriados(y) {
    const p = pascoa(y);
    const L = [
      [iso(y, 1, 1), 'Confraternização Universal', 'Nacional'],
      [addDays(p, -48), 'Carnaval (segunda)', 'Facultativo'],
      [addDays(p, -47), 'Carnaval (terça)', 'Facultativo'],
      [addDays(p, -46), 'Quarta-feira de Cinzas (até 14h)', 'Facultativo'],
      [addDays(p, -2), 'Paixão de Cristo (Sexta-feira Santa)', 'Nacional'],
      [p, 'Páscoa', 'Nacional'],
      [iso(y, 4, 21), 'Tiradentes', 'Nacional'],
      [iso(y, 5, 1), 'Dia do Trabalho', 'Nacional'],
      [addDays(p, 60), 'Corpus Christi', 'Municipal BH'],
      [iso(y, 9, 7), 'Independência do Brasil', 'Nacional'],
      [iso(y, 10, 12), 'Nossa Senhora Aparecida', 'Nacional'],
      [iso(y, 10, 28), 'Dia do Servidor Público', 'Facultativo'],
      [iso(y, 11, 2), 'Finados', 'Nacional'],
      [iso(y, 11, 15), 'Proclamação da República', 'Nacional'],
      [iso(y, 11, 20), 'Dia Nacional de Zumbi e da Consciência Negra', 'Nacional'],
      [iso(y, 12, 25), 'Natal', 'Nacional'],
      [iso(y, 8, 15), 'Assunção de Nossa Senhora', 'Municipal BH'],
      [iso(y, 12, 8), 'Imaculada Conceição', 'Municipal BH'],
      [iso(y, 8, 15), 'Feriado municipal (N. Sra. da Boa Viagem)', 'Municipal Itabirito'],
      [iso(y, 12, 8), 'Feriado municipal (N. Sra. da Conceição)', 'Municipal Itabirito'],
      [iso(y, 12, 24), 'Véspera de Natal (após 14h)', 'Facultativo'],
      [iso(y, 12, 31), 'Véspera de Ano Novo (após 14h)', 'Facultativo']
    ];
    const extra = (Store.db.feriadosExtra || []).filter(f => f.data.startsWith(String(y)) || f.anual).map(f => [f.anual ? y + f.data.slice(4) : f.data, f.nome, f.esfera || 'Municipal']);
    return [...L, ...extra].map(([data, nome, esfera]) => ({ data, nome, esfera })).sort((a, b) => a.data.localeCompare(b.data));
  }
  const cacheF = {};
  function feriadosEm(data) {
    const y = +data.slice(0, 4); cacheF[y] = cacheF[y] || feriados(y);
    return cacheF[y].filter(f => f.data === data);
  }
  function limparCache() { Object.keys(cacheF).forEach(k => delete cacheF[k]); }
  /** dia útil = seg–sex e não feriado (nacional ou da cidade escolhida) */
  function diaUtil(data, cidade = (Store.db.fiscalCfg || {}).cidade || 'BH') {
    const wd = new Date(data + 'T12:00:00').getDay();
    if (wd === 0 || wd === 6) return false;
    return !feriadosEm(data).some(f => f.esfera === 'Nacional' || (cidade === 'BH' && f.esfera === 'Municipal BH') || (cidade === 'Itabirito' && f.esfera === 'Municipal Itabirito'));
  }
  function ajustar(data, regra) {
    if (!regra || regra === 'nenhum') return data;
    let d = data, n = 0;
    while (!diaUtil(d) && n < 10) { d = addDays(d, regra === 'antecipa' ? -1 : 1); n++; }
    return d;
  }
  function diasUteis(a, b) { let n = 0, d = a; while (d <= b) { if (diaUtil(d)) n++; d = addDays(d, 1); } return n; }

  /* ---------- Obrigações (modelo padrão — editável em Impostos) ---------- */
  const OBRIGACOES_PADRAO = [
    { id: 'das', nome: 'DAS – Simples Nacional (PGDAS-D)', esfera: 'Federal', tipo: 'mensal', dia: 20, ajuste: 'prorroga', desc: 'Guia única do Simples (IRPJ, CSLL, PIS, COFINS, CPP e ISS). Competência do mês anterior.' },
    { id: 'dctfweb', nome: 'DCTFWeb (contribuições previdenciárias)', esfera: 'Federal', tipo: 'mensal', dia: 15, ajuste: 'antecipa', desc: 'Declaração de débitos previdenciários – inclui obras com CNO.' },
    { id: 'darfprev', nome: 'DARF previdenciário (INSS via DCTFWeb)', esfera: 'Federal', tipo: 'mensal', dia: 20, ajuste: 'antecipa', desc: 'INSS patronal (Anexo IV), retenções de 11% e INSS de obra (aferição/SERO).' },
    { id: 'esocial', nome: 'eSocial – eventos periódicos / EFD-Reinf', esfera: 'Trabalhista', tipo: 'mensal', dia: 15, ajuste: 'antecipa', desc: 'Folha, pró-labore e retenções (R-2010 / R-4020).' },
    { id: 'fgts', nome: 'FGTS Digital', esfera: 'Trabalhista', tipo: 'mensal', dia: 20, ajuste: 'antecipa', desc: 'Recolhimento do FGTS dos empregados.' },
    { id: 'issretido', nome: 'ISS retido / NFS-e – conferência prefeitura', esfera: 'Municipal', tipo: 'mensal', dia: 10, ajuste: 'prorroga', desc: 'Conferir ISS retido pelos tomadores e guias municipais (BH / Itabirito).' },
    { id: 'defis', nome: 'DEFIS – Declaração anual do Simples', esfera: 'Federal', tipo: 'anual', mes: 3, dia: 31, ajuste: 'antecipa', desc: 'Informações socioeconômicas e fiscais do ano anterior.' },
    { id: 'irpf', nome: 'IRPF dos sócios', esfera: 'Federal', tipo: 'anual', mes: 5, dia: 29, ajuste: 'antecipa', desc: 'Declaração de ajuste anual – informar distribuição de lucros.' },
    { id: 'crea_pj', nome: 'Anuidade CREA-MG (PJ e profissionais)', esfera: 'Conselho', tipo: 'anual', mes: 3, dia: 31, ajuste: 'nenhum', desc: 'Desconto para pagamento antecipado (jan/fev).' },
    { id: 'tflf', nome: 'TFLF – Taxa de Fiscalização (Prefeitura BH)', esfera: 'Municipal', tipo: 'anual', mes: 2, dia: 10, ajuste: 'prorroga', desc: 'Taxa anual de localização e funcionamento – confira a data na guia.' },
    { id: 'iptu', nome: 'IPTU – sala comercial (cota única/1ª parcela)', esfera: 'Municipal', tipo: 'anual', mes: 2, dia: 10, ajuste: 'prorroga', desc: 'Conferir com o contrato de aluguel quem paga.' },
    { id: 'ipva', nome: 'IPVA – veículos/carretinha (MG)', esfera: 'Estadual', tipo: 'anual', mes: 3, dia: 15, ajuste: 'nenhum', desc: 'Vencimento conforme final de placa (SEF-MG). Licenciamento anual.' },
    { id: 'cert', nome: 'Renovação do certificado digital (e-CNPJ)', esfera: 'Federal', tipo: 'anual', mes: 12, dia: 15, ajuste: 'nenhum', desc: 'Ajuste a data conforme a validade do certificado.' },
    { id: 'balanco', nome: 'Fechamento contábil anual / balanço', esfera: 'Federal', tipo: 'anual', mes: 4, dia: 30, ajuste: 'nenhum', desc: 'Entrega de documentos à contabilidade.' }
  ];
  function obrigacoes() { return Store.db.obrigacoes && Store.db.obrigacoes.length ? Store.db.obrigacoes : OBRIGACOES_PADRAO; }
  /** Gera as ocorrências entre duas datas */
  function ocorrencias(de, ate) {
    const out = []; const y0 = +de.slice(0, 4), y1 = +ate.slice(0, 4);
    obrigacoes().forEach(o => {
      for (let y = y0; y <= y1; y++) {
        if (o.tipo === 'anual') {
          const dd = Math.min(o.dia, new Date(y, o.mes, 0).getDate());
          const base = iso(y, o.mes, dd), data = ajustar(base, o.ajuste);
          if (data >= de && data <= ate) out.push({ key: o.id + ':' + y, obrig: o, data, competencia: String(y - 1) });
        } else {
          for (let m = 1; m <= 12; m++) {
            const dd = Math.min(o.dia, new Date(y, m, 0).getDate());
            const data = ajustar(iso(y, m, dd), o.ajuste);
            if (data >= de && data <= ate) { const cm = m === 1 ? 12 : m - 1, cy = m === 1 ? y - 1 : y; out.push({ key: o.id + ':' + iso(y, m, 1).slice(0, 7), obrig: o, data, competencia: pad(cm) + '/' + cy }); }
          }
        }
      }
    });
    const pagos = Store.db.obrigacoesStatus || {};
    const ini = ((Store.db.fiscalCfg || {}).inicioControle) || '2026-10-01';
    return out.map(x => Object.assign(x, { status: pagos[x.key] || (x.data < ini ? 'historico' : x.data < UI.today() ? 'atrasado' : 'pendente') })).sort((a, b) => a.data.localeCompare(b.data));
  }
  function marcar(key, status) { Store.db.obrigacoesStatus = Store.db.obrigacoesStatus || {}; if (status) Store.db.obrigacoesStatus[key] = status; else delete Store.db.obrigacoesStatus[key]; Store.save(); }

  /* ---------- Simples Nacional (LC 123/2006, anexos vigentes) ---------- */
  const ANEXOS = {
    III: { nome: 'Anexo III – serviços (Fator R ≥ 28%: engenharia, projetos)', faixas: [[180000, 6, 0], [360000, 11.2, 9360], [720000, 13.5, 17640], [1800000, 16, 35640], [3600000, 21, 125640], [4800000, 33, 648000]],
      rep: { IRPJ: 4, CSLL: 3.5, COFINS: 12.82, PIS: 2.78, CPP: 43.4, ISS: 33.5 } },
    IV: { nome: 'Anexo IV – construção civil / obras (INSS patronal à parte)', faixas: [[180000, 4.5, 0], [360000, 9, 8100], [720000, 10.2, 12420], [1800000, 14, 39780], [3600000, 22, 183780], [4800000, 33, 828000]],
      rep: { IRPJ: 18.8, CSLL: 15.2, COFINS: 17.67, PIS: 3.83, CPP: 0, ISS: 44.5 } },
    V: { nome: 'Anexo V – serviços com Fator R < 28%', faixas: [[180000, 15.5, 0], [360000, 18, 4500], [720000, 19.5, 9900], [1800000, 20.5, 17100], [3600000, 23, 62100], [4800000, 30.5, 540000]],
      rep: { IRPJ: 25, CSLL: 15, COFINS: 14.1, PIS: 3.05, CPP: 28.85, ISS: 14 } }
  };
  function simples(rbt12, anexo = 'III') {
    const A = ANEXOS[anexo]; const r = Math.max(rbt12, 1);
    const f = A.faixas.find(x => r <= x[0]) || A.faixas[A.faixas.length - 1];
    const efetiva = Math.max(0, (r * f[1] / 100 - f[2]) / r * 100);
    return { faixa: A.faixas.indexOf(f) + 1, nominal: f[1], deducao: f[2], efetiva, rep: A.rep };
  }
  /** Receita bruta dos 12 meses anteriores à competência (regime de caixa, receitas pagas) */
  function rbt12(compYM) {
    const ini = new Date(compYM + '-01T12:00:00'); ini.setMonth(ini.getMonth() - 12);
    const a = ini.toISOString().slice(0, 7);
    return Store.where('lancamentos', l => l.tipo === 'receita' && l.status === 'pago' && (l.dataPagamento || l.data || '').slice(0, 7) >= a && (l.dataPagamento || l.data || '').slice(0, 7) < compYM).reduce((s, l) => s + l.valor, 0);
  }
  function receitaMes(ym, soNF) { return Store.where('lancamentos', l => l.tipo === 'receita' && l.status === 'pago' && (!soNF || l.nf) && (l.dataPagamento || l.data || '').startsWith(ym)).reduce((s, l) => s + l.valor, 0); }
  function dasMes(ym) {
    const cfg = Store.db.fiscalCfg || {};
    const rec = receitaMes(ym, cfg.baseSoNF !== false);
    const r12 = rbt12(ym); const s = simples(r12 || rec * 12, cfg.anexo || 'III');
    const das = rec * s.efetiva / 100;
    const rep = Object.fromEntries(Object.entries(s.rep).map(([k, v]) => [k, das * v / 100]));
    return { ym, receita: rec, rbt12: r12, ...s, das, repValores: rep, federal: das - (rep.ISS || 0), municipal: rep.ISS || 0 };
  }
  const ESFERA_COR = { 'Nacional': 'info', 'Federal': 'info', 'Estadual': 'violet', 'Municipal': 'warn', 'Municipal BH': 'warn', 'Municipal Itabirito': 'brand', 'Facultativo': '', 'Conselho': 'ok', 'Trabalhista': 'err' };
  return { pascoa, feriados, feriadosEm, diaUtil, diasUteis, ajustar, ocorrencias, obrigacoes, OBRIGACOES_PADRAO, marcar, ANEXOS, simples, rbt12, receitaMes, dasMes, addDays, ESFERA_COR, limparCache };
})();
