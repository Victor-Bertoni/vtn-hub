/* =========================================================
   CENTRAL DE CONHECIMENTO — contabilidade, impostos, leis, incentivos,
   NFS-e, folha de pagamento, INSS de obra, CAIXA e financiamento.
   Pesquisa feita em 31/10/2026. Valores de referência: confirme com o contador.
   ========================================================= */
window.Conhecimento = {
  ATUALIZADO: '2026-10-31',
  // Tabelas 2026 (fontes na aba de cada tema)
  SALARIO_MINIMO: 1621.00,
  LIMITES: { ME: 360000, EPP: 4800000, SUB: 3600000 },
  INSS: { teto: 8475.55, faixas: [[1621.00, 7.5, 0], [2902.84, 9, 24.32], [4354.27, 12, 111.40], [8475.55, 14, 198.49]] },
  IRRF: { faixas: [[2428.80, 0, 0], [2826.65, 7.5, 182.16], [3751.05, 15, 394.16], [4664.68, 22.5, 675.49], [Infinity, 27.5, 908.73]], dependente: 189.59, simplificado: 607.20 },
  MCMV: [ // renda familiar mensal (urbano) – vigência operada pela CAIXA desde 22/04/2026
    { faixa: 'Faixa 1', ate: 3200, imovel: '210 a 275 mil (por região)', juros: '4,00% a 5,25% a.a.', subsidio: 'até ~R$ 55 mil' },
    { faixa: 'Faixa 2', ate: 5000, imovel: '210 a 275 mil (por região)', juros: '4,75% a 7,00% a.a.', subsidio: 'parcial, decrescente' },
    { faixa: 'Faixa 3', ate: 9600, imovel: 'até R$ 400 mil', juros: '7,66% a 8,16% a.a.', subsidio: 'sem subsídio' },
    { faixa: 'Faixa 4', ate: 13000, imovel: 'até R$ 600 mil', juros: '≈10% a 10,5% a.a.', subsidio: 'sem subsídio (entrada ~20%)' }
  ],
  /* Biblioteca de legislação. ok:true = conferido no texto/órgão oficial em 31/10/2026 */
  LEIS: [
    { tema: 'NFS-e / Simples', norma: 'Resolução CGSN nº 191, de 04/08/2026', ok: true, resumo: 'Altera a Res. CGSN 140/2018: ME/EPP do Simples emitem NFS-e pelo Emissor Nacional a partir de 01/11/2026. Obrigações de IBS/CBS só produzem efeitos para o Simples a partir de 01/01/2027.', impacto: 'Toda nota da VTN desde 01/11/2026 pelo Emissor Nacional.', url: 'https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/agosto/simples-nacional-nfs-e-nacional-sera-obrigatoria-para-me-e-epp-a-partir-de-1o-de-novembro-de-2026', orgao: 'Receita Federal / CGSN' },
    { tema: 'Imposto de renda', norma: 'Lei nº 15.270, de 26/11/2025 – art. 3º-A', ok: true, resumo: 'Redução mensal do IRPF desde jan/2026: até R$ 312,89 para rendimentos até R$ 5.000 (imposto zero); de R$ 5.000,01 a R$ 7.350: R$ 978,62 − 0,133145 × rendimento; acima de R$ 7.350 sem redução.', impacto: 'Folha e pró-labore até R$ 5 mil sem IRRF.', url: 'https://www2.camara.leg.br/legin/fed/lei/2025/lei-15270-26-novembro-2025-798354-publicacaooriginal-177117-pl.html', orgao: 'Câmara dos Deputados (texto original)' },
    { tema: 'Lucros e dividendos', norma: 'Lei nº 15.270/2025 – art. 6º-A', ok: true, resumo: 'Desde jan/2026, retenção de 10% de IR sobre o TOTAL pago no mês pela mesma empresa à mesma pessoa física quando passar de R$ 50.000 (pagamentos no mês são somados; sem deduções). Fora da regra: lucros até 2025 com distribuição aprovada até 31/12/2025 e pagos nos termos aprovados.', impacto: 'Planejar distribuições mensais abaixo de R$ 50 mil por sócio ou provisionar os 10%.', url: 'https://www2.camara.leg.br/legin/fed/lei/2025/lei-15270-26-novembro-2025-798354-publicacaooriginal-177117-pl.html', orgao: 'Câmara dos Deputados' },
    { tema: 'Imposto de renda', norma: 'Lei nº 15.270/2025 – art. 16-A (IRPF mínimo)', ok: true, resumo: 'Renda anual acima de R$ 600 mil: tributação mínima a partir do ano-calendário 2026; alíquota = (renda/60.000) − 10, chegando a 10% em R$ 1,2 milhão. Desconta o IR já pago e a retenção do art. 6º-A.', impacto: 'Sócios com renda alta (lucros + pró-labore) devem simular a declaração 2027.', url: 'https://www2.camara.leg.br/legin/fed/lei/2025/lei-15270-26-novembro-2025-798354-publicacaooriginal-177117-pl.html', orgao: 'Câmara dos Deputados' },
    { tema: 'Imposto de renda', norma: 'Receita Federal – Exemplos de aplicação da Lei 15.270/2025', ok: true, resumo: 'Tabela mensal 2026: isento até R$ 2.428,80; 15% (dedução R$ 394,16); 22,5% (R$ 675,49); 27,5% (R$ 908,73). Desconto simplificado R$ 607,20 (25% do limite da 1ª faixa).', impacto: 'Base para a calculadora de folha.', url: 'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/exemplos-de-aplicacao-da-lei-15-270-2025', orgao: 'Receita Federal' },
    { tema: 'INSS / folha', norma: 'Portaria Interministerial MPS/MF nº 13, de 09/01/2026', ok: true, resumo: 'Desde 01/01/2026: até R$ 1.621,00 = 7,5%; R$ 1.621,01–2.902,84 = 9%; R$ 2.902,85–4.354,27 = 12%; R$ 4.354,28–8.475,55 = 14%. Teto R$ 8.475,55. Piso (salário mínimo) R$ 1.621.', impacto: 'Desconto de INSS de funcionários e pró-labore.', url: 'https://www.gov.br/previdencia/pt-br/noticias/2026/janeiro/beneficios-com-valor-acima-do-salario-minimo-sao-reajustados-em-3-9', orgao: 'Ministério da Previdência Social' },
    { tema: 'Desoneração da folha', norma: 'Lei nº 14.973, de 16/09/2024 – arts. 9º-A e 9º-B', ok: true, resumo: 'Reoneração gradual para quem optou pela CPRB (inclui obras de construção civil, opção por obra): 2025 = 80% da CPRB + 25% da contribuição sobre a folha; 2026 = 60% + 50%; 2027 = 40% + 75%. A partir de 01/01/2028 as obras não encerradas recolhem integralmente sobre a folha.', impacto: 'Construção: CPRB de 4,5% vira 2,7% em 2026 (+ 10% sobre a folha). Avaliar com o contador se se aplica à VTN.', url: 'https://www2.camara.leg.br/legin/fed/lei/2024/lei-14973-16-setembro-2024-796242-publicacaooriginal-173011-pl.html', orgao: 'Câmara dos Deputados' },
    { tema: 'Retenção de INSS', norma: 'Instrução Normativa RFB nº 2.289, de 30/10/2025', ok: true, resumo: 'Consolida as hipóteses de dispensa da retenção de 11% da IN RFB 2.110/2022 (ex.: empreitada total, transporte de cargas, serviços nas dependências da própria prestadora). Na empreitada parcial ou cessão de mão de obra a retenção continua.', impacto: 'Conferir em cada contrato de obra se há retenção de 11% na nota.', url: 'https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2025/novembro/receita-federal-consolida-hipoteses-de-dispensa-da-retencao-previdenciaria-em-contratos-de-servicos-e-obras', orgao: 'Receita Federal' },
    { tema: 'INSS de obra', norma: 'Instrução Normativa RFB nº 2.110, de 17/10/2022', ok: true, resumo: 'Normas gerais de tributação previdenciária: CNO, responsabilidade na construção civil, aferição de obra, retenção de 11%.', impacto: 'Base da aferição (SERO) e da CND de obra para averbação.', url: 'https://legislacaofinanceira.fazenda.sp.gov.br/Federal/INSTRU%C3%87%C3%83O%20NORMATIVA%20RFB%20N%C2%BA%202.110-2022.pdf', orgao: 'DOU 19/10/2022 (cópia SEFAZ-SP)' },
    { tema: 'Minha Casa Minha Vida', norma: 'Portaria MCID nº 333, de 30/03/2026 (DOU 01/04/2026)', ok: true, resumo: 'Faixas urbanas: até R$ 3.200; R$ 3.200,01–5.000; R$ 5.000,01–9.600. Rurais (anual): até R$ 50.000; até R$ 70.900; até R$ 134.000. Vale para contratos a partir da publicação. Segundo o governo, a Faixa 4 urbana subiu para R$ 13 mil e os tetos de imóvel para R$ 400 mil (F3) e R$ 600 mil (F4).', impacto: 'Enquadramento dos clientes de obras CAIXA.', url: 'https://www.gov.br/cidades/pt-br/acesso-a-informacao/institucional/base-juridica/portarias/2026/PORTARIAMCIDN333DE30DEMARODE2026PORTARIAMCIDN333DE30DEMARODE2026DOUImprensaNacional.pdf', orgao: 'Ministério das Cidades / Secom' },
    { tema: 'Contribuinte', norma: 'Lei Complementar nº 225, de 08/01/2026 (Código de Defesa do Contribuinte)', ok: true, resumo: 'Direitos e deveres do contribuinte e regras de combate ao devedor contumaz.', impacto: 'Manter regularidade fiscal (CND) – importante para licitações e financiamentos.', url: 'https://www2.camara.leg.br/legin/fed/leicom/2026/leicomplementar-225-8-janeiro-2026-798639-norma-pl.html', orgao: 'Câmara dos Deputados' },
    { tema: 'CAIXA', norma: 'CAIXA – Crédito Imobiliário para Construção (regras oficiais)', ok: true, resumo: 'Até 80% da construção, 35 anos, FGTS, liberação por etapa medida, RT obrigatório, PCI/PLS, habite-se e averbação obrigatórios.', impacto: 'Processo das obras financiadas.', url: 'https://www.caixa.gov.br/voce/habitacao/construcao/Paginas/default.aspx', orgao: 'CAIXA' },
    { tema: 'ISS', norma: 'Itabirito – Lei Municipal nº 2.323/2003 (ISSQN), com as Leis 2.910/2013, 2.985/2013 e 3.225/2017', ok: true, resumo: 'Alíquotas da lista anexa: 7.01 engenharia 2%; 7.02 obras 5%; 7.03 projetos 3%; 7.04 e 7.05 demolição e reforma 5%; 7.20 topografia 3%; 28.01 avaliação 4%. Alíquota mínima de 2% (art. 4º-A). ISS de obra (7.02, 7.04, 7.05, 7.17) devido no local da obra. Tomador pessoa jurídica dos itens 7.02 a 7.05 e 7.17 a 7.19 retém o ISS; pessoa física tomadora de 7.02, 7.04 e 7.05 também é responsável (art. 44).', impacto: 'Notas de obra em Itabirito: 5%; projetos 3%; engenharia/laudos 2%. Clientes PJ retêm o ISS.', url: 'https://itabirito.mg.gov.br/wp-content/uploads/2024/04/a_91_1_18_10012023112300.pdf', orgao: 'Prefeitura de Itabirito' },
    { tema: 'ISS', norma: 'Itabirito – Decreto nº 10.369/2014 (dedução de materiais na construção civil)', ok: false, resumo: 'A prefeitura permite deduzir da base do ISS o material incorporado à obra. Dedução padrão (art. 4º) pedida por e-mail (fiscalizacao.tributos@pmi.mg.gov.br) com contrato e CNPJ; dedução maior exige notas fiscais de compra protocoladas.', impacto: 'Reduz o ISS das obras com material em Itabirito.', url: 'https://itabirito.mg.gov.br/servico/iss-digital/', orgao: 'Prefeitura de Itabirito – página ISS Digital' },
    { tema: 'ISS', norma: 'Belo Horizonte – Consulta oficial de códigos de tributação e alíquotas (BHISS Digital)', ok: true, resumo: 'Engenharia sem execução (0701-0/01-88) 2,5%; execução de obras 7.02 5%; projetos e estudos 7.03 2,5%; demolição e reforma 5%; fiscalização de obras 7.19 3%; topografia 7.20 2,5%; consultoria 17.01 5%; avaliação de imóveis 28.01 5%.', impacto: 'Código e alíquota a usar na NFS-e de serviços prestados em BH.', url: 'https://bhissdigital.pbh.gov.br/atde/pages/codigoTributacaoMunicipal.jsf', orgao: 'Prefeitura de Belo Horizonte – Secretaria de Fazenda' },
    { tema: 'Simples Nacional', norma: 'Lei Complementar nº 123/2006 (Estatuto da ME/EPP) – texto compilado', ok: true, resumo: 'Art. 3º: ME até R$ 360 mil e EPP até R$ 4,8 mi; § 9º exclusão no mês seguinte ao excesso; § 9º-A: se o excesso não passar de 20%, exclusão só no ano seguinte. Art. 13-A: sublimite de R$ 3,6 mi para ICMS/ISS no DAS (art. 20, § 1º-A: regra dos 20%). Art. 18, §§ 5º-J e 5º-M: Fator R ≥ 28% → Anexo III; abaixo → Anexo V. Art. 21, § 4º, I: na retenção de ISS de optante, a alíquota é o percentual de ISS da faixa do Simples do mês anterior, informado na nota.', impacto: 'Base de todo o módulo Enquadramento ao vivo.', url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm', orgao: 'Planalto (texto compilado)' },
    { tema: 'Simples Nacional', norma: 'Resolução CGSN nº 140/2018', ok: false, resumo: 'Regulamento do Simples Nacional (PGDAS-D, DEFIS, anexos, obrigações).', impacto: 'Regras operacionais do DAS.', url: 'https://normas.receita.fazenda.gov.br/sijut2consulta/consulta.action?termoBusca=Resolu%C3%A7%C3%A3o+CGSN+140', orgao: 'Receita Federal (busca de normas)' },
    { tema: 'Reforma tributária', norma: 'Emenda Constitucional nº 132/2023 e Lei Complementar nº 214/2025', ok: false, resumo: 'Criação de IBS, CBS e Imposto Seletivo; transição 2026–2033; regras do Simples na reforma.', impacto: 'Campos IBS/CBS na NFS-e a partir de 2027 para o Simples.', url: 'https://www.lexml.gov.br/busca/search?keyword=Lei+Complementar+214+2025', orgao: 'Planalto (busca LexML)' },
    { tema: 'ISS', norma: 'Lei Complementar nº 116/2003', ok: false, resumo: 'Lista de serviços do ISS (7.01 engenharia, 7.02 execução de obras, 7.05 reparação/reforma); ISS da obra devido no local da obra; dedução de materiais.', impacto: 'ISS das obras em Itabirito recolhido em Itabirito.', url: 'https://www.lexml.gov.br/busca/search?keyword=Lei+Complementar+116+2003', orgao: 'Planalto (busca LexML)' },
    { tema: 'Previdência', norma: 'Lei nº 8.212/1991 – art. 31 (retenção de 11%)', ok: false, resumo: 'Retenção de 11% sobre nota de cessão de mão de obra/empreitada.', impacto: 'Notas de obra para tomador PJ.', url: 'https://www.lexml.gov.br/busca/search?keyword=Lei+8.212+1991', orgao: 'Planalto (busca LexML)' },
    { tema: 'Engenharia', norma: 'Lei nº 6.496/1977 (ART) e resoluções do CONFEA', ok: false, resumo: 'Obrigatoriedade da ART em todo contrato de obra ou serviço de engenharia.', impacto: 'ART em cada serviço (já registrada nas pastas).', url: 'https://www.lexml.gov.br/busca/search?keyword=Lei+6.496+1977', orgao: 'Planalto (busca LexML)' },
    { tema: 'Habitação', norma: 'Lei nº 14.620/2023 (Programa Minha Casa, Minha Vida)', ok: false, resumo: 'Lei do programa MCMV; as faixas e valores são fixados por portaria do Ministério das Cidades.', impacto: 'Base legal das portarias MCID.', url: 'https://www.lexml.gov.br/busca/search?keyword=Lei+14.620+2023', orgao: 'Planalto (busca LexML)' },
    { tema: 'Incorporação', norma: 'Lei nº 10.931/2004 (patrimônio de afetação e RET)', ok: false, resumo: 'Regime Especial de Tributação para incorporações com patrimônio de afetação.', impacto: 'Só se a VTN incorporar e vender unidades.', url: 'https://www.lexml.gov.br/busca/search?keyword=Lei+10.931+2004', orgao: 'Planalto (busca LexML)' },
    { tema: 'Obras', norma: 'Código Civil (Lei nº 10.406/2002) – art. 618', ok: false, resumo: 'Empreiteiro responde por 5 anos pela solidez e segurança da obra.', impacto: 'Garantia nos contratos e termos de entrega.', url: 'https://www.lexml.gov.br/busca/search?keyword=C%C3%B3digo+Civil+art+618', orgao: 'Planalto (busca LexML)' },
    { tema: 'Licitações', norma: 'Lei nº 14.133/2021 (licitações e contratos)', ok: false, resumo: 'Regras de licitação e credenciamento públicos.', impacto: 'Credenciamentos (Cabo Verde, Novo Cruzeiro) e licitações.', url: 'https://www.lexml.gov.br/busca/search?keyword=Lei+14.133+2021', orgao: 'Planalto (busca LexML)' }
  ],
  /* ISS municipal – conferido em 01/11/2026: BH = consulta oficial BHISS Digital (códigos de tributação);
     Itabirito = Lei Municipal 2.323/2003 consolidada (Leis 2.910/13, 2.985/13, 3.225/17), PDF no site da prefeitura. null = não identificado */
  ISS_MUN: [
    ['7.01', 'Engenharia, arquitetura, agrimensura (sem execução de obra)', 2.5, 2, '0701-0/01-88'],
    ['7.02', 'Execução de obras de construção civil (empreitada ou administração)', 5, 5, '0702-0/01-88 a /10-88'],
    ['7.03', 'Projetos, estudos de viabilidade, planos e relatórios de engenharia', 2.5, 3, '0703-0/06-88'],
    ['7.04', 'Demolição', 5, 5, '0704-0/01-88'],
    ['7.05', 'Reparação, conservação e reforma de edifícios e imóveis', 5, 5, '0705-0/01-88 e /05-88'],
    ['7.06', 'Instalação de gesso, revestimentos, divisórias (material do tomador)', 5, 2, '0706-0/06-88'],
    ['7.17', 'Escoramento e contenção de encostas', 5, null, '0717-0/01-88'],
    ['7.19', 'Acompanhamento e fiscalização da execução de obras', 3, null, '0719-0/01-88'],
    ['7.20', 'Levantamentos topográficos, cartografia, aerofotogrametria', 2.5, 3, '0720-0/03-88'],
    ['17.01', 'Assessoria e consultoria', 5, 2, '1701-0/02-88'],
    ['28.01', 'Avaliação de bens e de imóveis', 5, 4, '2801-0/02-88']
  ],
  ITEM_POR_TIPO: { 'Obra': '7.02', 'Reforma': '7.05', 'Projeto': '7.03', 'Serviço': '7.01', 'Laudo/Vistoria': '7.01' },
  issDe(cidade, tipo) {
    const it = this.ITEM_POR_TIPO[tipo] || '7.01'; const r = this.ISS_MUN.find(x => x[0] === it);
    const c = (cidade || '').toLowerCase(); const v = c.includes('itabirito') ? r[3] : c.includes('belo horizonte') || c === 'bh' ? r[2] : null;
    return { item: it, aliq: v, desc: r[1] };
  },
  /* Alertas regulatórios que aparecem no painel */
  ALERTAS: [
    { data: '2026-11-01', nivel: 'err', titulo: 'NFS-e Nacional obrigatória para ME/EPP do Simples a partir de 01/11/2026', texto: 'Resolução CGSN nº 191/2026: emissão pelo Emissor Nacional (web ou API). BH já aderiu ao emissor nacional. Confirme o acesso da VTN ao emissor e o cadastro dos serviços (7.01/7.02, 7.03…).' },
    { data: '2027-01-01', nivel: 'warn', titulo: 'IBS/CBS nos documentos fiscais do Simples a partir de 01/01/2027', texto: 'Notas sem os campos de IBS/CBS podem ser rejeitadas. Em 2026 o destaque é só informativo (CBS 0,9% + IBS 0,1%).' },
    { data: '2026-01-01', nivel: 'warn', titulo: 'Dividendos: retenção de 10% acima de R$ 50 mil/mês por sócio (Lei 15.270/2025)', texto: 'Lei 15.270/2025, art. 6º-A: os 10% incidem sobre o TOTAL pago no mês quando passar de R$ 50 mil (conferido no texto da lei). A Receita aplica também ao Simples (tema contestado judicialmente).' },
    { data: '2026-01-01', nivel: 'info', titulo: 'IR: isenção para salários até R$ 5.000 desde jan/2026', texto: 'Redutor mensal de até R$ 312,89 (até R$ 5 mil) e redução parcial até R$ 7.350. Atualize folha e pró-labore.' }
  ],
  calcINSS(base) { const b = Math.min(base, this.INSS.teto); const f = this.INSS.faixas.find(x => b <= x[0]) || this.INSS.faixas[3]; return Math.max(0, b * f[1] / 100 - f[2]); },
  calcIRRF(bruto, inss, dep = 0) {
    const legal = inss + dep * this.IRRF.dependente; const ded = Math.max(legal, this.IRRF.simplificado);
    const base = Math.max(0, bruto - ded);
    const f = this.IRRF.faixas.find(x => base <= x[0]);
    let ir = Math.max(0, base * f[1] / 100 - f[2]);
    let red = 0;
    if (bruto <= 5000) red = Math.min(ir, 312.89);
    else if (bruto <= 7350) red = Math.min(ir, Math.max(0, 978.62 - 0.133145 * bruto));
    return { base, ir: Math.max(0, ir - red), irSemRedutor: ir, redutor: red, deducao: ded };
  },
  parcelas(valor, taxaAA, n) {
    const i = Math.pow(1 + taxaAA / 100, 1 / 12) - 1;
    const price = i ? valor * i / (1 - Math.pow(1 + i, -n)) : valor / n;
    const amort = valor / n;
    return { i, price, totalPrice: price * n, sac1: amort + valor * i, sacN: amort + amort * i, totalSac: valor + i * amort * n * (n + 1) / 2 };
  }
};

Views.conhecimento = {
  perm: 'dashboard',
  st: { tab: 'inicio', q: '' },
  TABS: [['inicio', 'Início', 'sparkles'], ['leis', 'Legislação', 'scale'], ['folha', 'Folha de pagamento', 'users'], ['prolabore', 'Pró-labore e lucros', 'piggy-bank'], ['simples', 'Simples e incentivos', 'badge-percent'],
    ['nfse', 'NFS-e e reforma', 'file-text'], ['iss', 'ISS BH × Itabirito', 'map-pin'], ['obra', 'INSS de obra / CNO', 'hard-hat'], ['caixa', 'CAIXA e financiamento', 'home'], ['contab', 'Contabilidade', 'book-open-check'], ['fontes', 'Fontes', 'link']],
  render(el, tab) {
    const { icon, esc } = UI; const s = this.st; if (tab) s.tab = tab;
    el.innerHTML = `<div class="hero"><div><div class="hero-kicker">${icon('graduation-cap')} Central de conhecimento</div><h1>Contabilidade, impostos e financiamento</h1>
      <p>Tudo que impacta a VTN, pesquisado em fontes oficiais e especializadas, com calculadoras. Atualizado em ${UI.date(Conhecimento.ATUALIZADO)} · o Radar fiscal semanal traz as novidades.</p></div>
      <div class="hero-side"><div><span>Salário mínimo 2026</span><b>${UI.money(Conhecimento.SALARIO_MINIMO)}</b><small>teto INSS ${UI.money(Conhecimento.INSS.teto)}</small></div><div><span>Isenção IR</span><b>até R$ 5.000</b><small>Lei 15.270/2025</small></div></div></div>
      <div class="pill-tabs">${this.TABS.map(t => `<button class="${t[0] === s.tab ? 'active' : ''}" data-t="${t[0]}">${icon(t[2])} ${t[1]}</button>`).join('')}</div><div id="kc"></div>`;
    UI.$$('[data-t]', el).forEach(b => b.onclick = () => { s.tab = b.dataset.t; App.refresh(); });
    this['t_' + s.tab](UI.$('#kc', el));
  },
  art(titulo, html, cls = '') { return `<div class="card ${cls}"><div class="card-h"><h3>${titulo}</h3></div><div class="card-b kb">${html}</div></div>`; },

  t_inicio(c) {
    const { icon, esc, date } = UI;
    c.innerHTML = `<div class="card mb"><div class="card-h"><h3>${icon('siren')} Alertas regulatórios que afetam a VTN</h3></div><div class="card-b stack">
      ${Conhecimento.ALERTAS.map(a => `<div class="alert ${a.nivel}">${icon(a.nivel === 'err' ? 'alert-octagon' : a.nivel === 'warn' ? 'alert-triangle' : 'info')}<div><b>${esc(a.titulo)}</b><div class="muted">${esc(a.texto)}</div><div class="tiny">Vigência: ${date(a.data)}</div></div></div>`).join('')}</div></div>
      <div class="grid g3">${this.TABS.slice(1, -1).map(t => `<div class="card kb-tile" data-go="${t[0]}"><div class="card-b"><div class="ico-big">${icon(t[2])}</div><h3>${t[1]}</h3><p class="muted tiny">${{ folha: 'INSS e IRRF 2026, FGTS, encargos, provisões e calculadora do custo do funcionário.', prolabore: 'Pró-labore, INSS 11%, Fator R e a nova regra de dividendos (10% acima de R$ 50 mil).', simples: 'Anexos III, IV e V, Fator R, desoneração/CPRB, incentivos e planejamento tributário.', nfse: 'NFS-e Nacional obrigatória desde 01/11/2026, IBS/CBS e cronograma da reforma.', obra: 'CNO, SERO/aferição, retenção de 11%, DCTFWeb e regularização de obra para habite-se.', caixa: 'Passo a passo da CAIXA, PCI/PLS, medições, MCMV 2026 e simulador SAC × Price.', contab: 'Livros, DRE, distribuição de lucros, obrigações acessórias e boas práticas.' }[t[0]]}</p></div></div>`).join('')}</div>`;
    UI.$$('[data-go]', c).forEach(b => b.onclick = () => { this.st.tab = b.dataset.go; App.refresh(); });
  },

  t_leis(c) {
    const { esc, icon } = UI; const s = this.st; const L = Conhecimento.LEIS;
    const temas = [...new Set(L.map(l => l.tema))];
    const f = L.filter(l => (!s.tema || l.tema === s.tema) && (!s.q || (l.norma + l.resumo + l.tema).toLowerCase().includes(s.q.toLowerCase())));
    c.innerHTML = `<div class="alert info mb">${icon('shield-check')}<div><b>${L.filter(l => l.ok).length} normas conferidas no texto ou no órgão oficial</b> (Câmara dos Deputados, Receita Federal, Previdência, Ministério das Cidades, CAIXA, DOU) em 31/10/2026. As marcadas "base legal" são leis vigentes conhecidas, com link para a busca oficial do LexML. Os textos são públicos.</div></div>
      <div class="toolbar"><input class="input" id="lq" placeholder="Buscar lei, portaria, assunto…" value="${esc(s.q || '')}" style="min-width:260px"><button class="btn sm ${!s.tema ? 'primary' : ''}" data-tm="">Todos</button>${temas.map(t => `<button class="btn sm ${s.tema === t ? 'primary' : ''}" data-tm="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      <div class="stack">${f.map(l => `<div class="card"><div class="card-b"><div class="row between"><div class="row">${UI.badge(l.tema, 'info')}${l.ok ? UI.badge('✓ conferido na fonte oficial', 'ok') : UI.badge('base legal – consultar texto', '')}</div><a class="btn sm" href="${l.url}" target="_blank" rel="noopener">${icon('external-link')} Texto oficial</a></div>
        <h3 style="margin:10px 0 6px">${esc(l.norma)}</h3><p style="margin:0 0 6px">${esc(l.resumo)}</p><div class="tiny"><b>Impacto na VTN:</b> ${esc(l.impacto)} · <span class="muted">Fonte: ${esc(l.orgao)}</span></div></div></div>`).join('')}</div>`;
    UI.$('#lq', c).onchange = e => { s.q = e.target.value; App.refresh(); };
    UI.$$('[data-tm]', c).forEach(b => b.onclick = () => { s.tema = b.dataset.tm; App.refresh(); });
  },

  t_iss(c) {
    const { esc, icon, pct } = UI; const f = v => v == null ? '<span class="muted">confirmar</span>' : pct(v, 1);
    c.innerHTML = `<div class="alert info mb">${icon('shield-check')}<div><b>Conferido em 01/11/2026 nas fontes oficiais:</b> consulta de códigos e alíquotas do BHISS Digital (Prefeitura de BH) e Lei Municipal 2.323/2003 de Itabirito, já com as alterações de 2013 e 2017 (PDF no site da prefeitura).</div></div>
      <div class="card mb"><div class="card-h"><h3>Alíquotas de ISS dos serviços da VTN</h3></div><div class="card-b p0 table-wrap"><table class="t"><thead><tr><th>Item LC 116</th><th>Serviço</th><th class="num">Belo Horizonte</th><th>Código BH</th><th class="num">Itabirito</th></tr></thead><tbody>
      ${Conhecimento.ISS_MUN.map(r => `<tr><td><b>${r[0]}</b></td><td>${esc(r[1])}</td><td class="num">${f(r[2])}</td><td class="mono">${esc(r[4])}</td><td class="num">${f(r[3])}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="grid g2">
      ${this.art('Regras que pesam para a VTN', `<ul>
        <li><b>Obra paga ISS onde a obra está</b> (7.02, 7.04, 7.05, 7.17) – não onde fica a sede. Obra em Itabirito → ISS de Itabirito; projeto ou laudo segue a regra geral (sede do prestador).</li>
        <li><b>Retenção pelo cliente:</b> em Itabirito, tomador pessoa jurídica dos itens 7.02 a 7.05 e 7.17 a 7.19 retém o ISS; pessoa física tomadora de obra/demolição/reforma também é responsável (Lei 2.323/2003, art. 44).</li>
        <li><b>Alíquota mínima de 2%</b> e proibição de benefícios abaixo disso (Itabirito, art. 4º-A, igual à LC 116).</li>
        <li><b>Material da obra:</b> Itabirito permite deduzir o material incorporado (Decreto 10.369/2014) – peça por e-mail a fiscalizacao.tributos@pmi.mg.gov.br com contrato e CNPJ.</li></ul>`)}
      ${this.art('E no Simples Nacional?', `<ul>
        <li>Enquanto a VTN estiver no Simples e abaixo do sublimite de R$ 3,6 mi, o ISS vai <b>dentro do DAS</b>, pelo percentual de ISS da faixa do Simples – não pela alíquota municipal da tabela.</li>
        <li>Quando o cliente retém o ISS, a retenção usa o percentual de ISS da faixa do Simples informado na nota, e esse valor sai do DAS (LC 123/2006, art. 21, § 4º, I – conferido no texto compilado do Planalto).</li>
        <li>A alíquota municipal passa a valer integralmente se a VTN passar do sublimite ou sair do Simples.</li></ul>`)}
      </div>
      <div class="card mt"><div class="card-h"><h3>Onde acompanhar mudanças</h3></div><div class="card-b row">
        <a class="btn sm" target="_blank" rel="noopener" href="https://dom-web.pbh.gov.br/">${icon('newspaper')} Diário Oficial de BH (DOM)</a>
        <a class="btn sm" target="_blank" rel="noopener" href="https://itabirito.atende.net/diariooficial/edicao">${icon('newspaper')} Diário Oficial de Itabirito</a>
        <a class="btn sm" target="_blank" rel="noopener" href="https://bhissdigital.pbh.gov.br/atde/pages/codigoTributacaoMunicipal.jsf">${icon('search')} BHISS – códigos e alíquotas</a>
        <a class="btn sm" target="_blank" rel="noopener" href="https://itabirito.mg.gov.br/servico/iss-digital/">${icon('landmark')} ISS Digital Itabirito</a>
        <a class="btn sm" target="_blank" rel="noopener" href="https://prefeitura.pbh.gov.br/">${icon('landmark')} Prefeitura de BH</a></div></div>`;
  },

  t_folha(c) {
    const K = Conhecimento, { money, pct } = UI;
    c.innerHTML = `<div class="grid g-2-1"><div class="stack">
      ${this.art('Tabela INSS do empregado – 2026', `<table class="t"><thead><tr><th>Salário de contribuição</th><th class="num">Alíquota</th><th class="num">Parcela a deduzir</th></tr></thead><tbody>
        ${K.INSS.faixas.map((f, i) => `<tr><td>${i ? 'De ' + money(K.INSS.faixas[i - 1][0] + 0.01) + ' a ' : 'Até '}${money(f[0])}</td><td class="num">${pct(f[1], 1)}</td><td class="num">${money(f[2])}</td></tr>`).join('')}</tbody></table>
        <p>Cálculo progressivo: <b>salário × alíquota da faixa − parcela a deduzir</b>. Teto ${money(K.INSS.teto)} → desconto máximo ${money(K.calcINSS(K.INSS.teto))}. O 13º é calculado separadamente.</p>`)}
      ${this.art('Tabela IRRF mensal – 2026 (com a reforma do IR)', `<table class="t"><thead><tr><th>Base de cálculo</th><th class="num">Alíquota</th><th class="num">Parcela a deduzir</th></tr></thead><tbody>
        ${K.IRRF.faixas.map((f, i) => `<tr><td>${i ? (f[0] === Infinity ? 'Acima de ' + money(K.IRRF.faixas[i - 1][0]) : 'Até ' + money(f[0])) : 'Até ' + money(f[0])}</td><td class="num">${f[1] ? pct(f[1], 1) : 'Isento'}</td><td class="num">${money(f[2])}</td></tr>`).join('')}</tbody></table>
        <ul><li>Dedução por dependente: ${money(K.IRRF.dependente)} · desconto simplificado: até ${money(K.IRRF.simplificado)}.</li>
        <li><b>Lei 15.270/2025:</b> quem ganha até R$ 5.000/mês tem redução de até R$ 312,89 (imposto zera). Entre R$ 5.000,01 e R$ 7.350: redução = R$ 978,62 − 0,133145 × rendimento. Acima de R$ 7.350, tabela normal.</li></ul>`)}
      ${this.art('Encargos e obrigações da folha', `<ul>
        <li><b>FGTS:</b> 8% do salário (FGTS Digital, vence dia 20). Multa rescisória de 40% sobre o saldo.</li>
        <li><b>Provisões mensais:</b> férias + 1/3 ≈ 11,11% e 13º ≈ 8,33% do salário, com FGTS (e INSS patronal, no Anexo IV) sobre elas.</li>
        <li><b>INSS patronal (CPP):</b> no Simples, Anexos I, II, III e V já está dentro do DAS. No <b>Anexo IV</b> (construção de imóveis/obras) a empresa paga à parte <b>20% + RAT/GILRAT</b> (construção ≈ 3% × FAP) via DCTFWeb; contribuições a terceiros (Sistema S) seguem dispensadas no Simples.</li>
        <li><b>eSocial:</b> admissões até o dia anterior ao início, eventos periódicos até o dia 15. Exame admissional, PCMSO/PGR e NR-18 obrigatórios em obra.</li>
        <li><b>Construção civil:</b> piso salarial e benefícios pela convenção coletiva (sindicato da construção da região: BH/Itabirito). Diaristas habituais podem gerar vínculo trabalhista: prefira empreiteiros PJ com contrato, ART e notas.</li></ul>`)}
      </div>
      <div class="card"><div class="card-h"><h3>Calculadora: salário e custo do funcionário</h3></div><div class="card-b" id="fcalc">${UI.fields([{ k: 'sal', l: 'Salário bruto (R$)', t: 'money', def: 2500 }, { k: 'dep', l: 'Dependentes', t: 'number', def: 0 }, { k: 'anx', l: 'Anexo da empresa', t: 'select', o: [['III', 'Anexo III/V (CPP no DAS)'], ['IV', 'Anexo IV (CPP à parte)']], def: 'IV', blank: false }, { k: 'rat', l: 'RAT × FAP (%)', t: 'number', def: 3 }])}<div id="fres" class="mt"></div></div></div></div>`;
    const box = UI.$('#fcalc', c);
    const calc = () => {
      const v = UI.read(box, [{ k: 'sal', t: 'money' }, { k: 'dep', t: 'number' }, { k: 'anx' }, { k: 'rat', t: 'number' }]);
      const inss = K.calcINSS(v.sal), ir = K.calcIRRF(v.sal, inss, v.dep);
      const fgts = v.sal * 0.08, prov = v.sal * (0.1111 + 0.0833), cpp = v.anx === 'IV' ? v.sal * (0.20 + v.rat / 100) : 0;
      const encProv = prov * (0.08 + (v.anx === 'IV' ? 0.20 + v.rat / 100 : 0));
      const custo = v.sal + fgts + prov + cpp + encProv;
      UI.$('#fres', c).innerHTML = `<table class="t"><tbody>
        <tr><td>INSS do empregado</td><td class="num">− ${money(inss)}</td></tr><tr><td>IRRF ${ir.redutor ? `<span class="badge ok">redutor ${money(ir.redutor)}</span>` : ''}</td><td class="num">− ${money(ir.ir)}</td></tr>
        <tr><td><b>Salário líquido</b></td><td class="num"><b>${money(v.sal - inss - ir.ir)}</b></td></tr>
        <tr><td colspan="2" class="tiny muted">Custo para a empresa</td></tr>
        <tr><td>FGTS 8%</td><td class="num">${money(fgts)}</td></tr><tr><td>Provisão férias + 1/3 e 13º</td><td class="num">${money(prov)}</td></tr>
        <tr><td>INSS patronal ${v.anx === 'IV' ? '(20% + RAT)' : '(no DAS)'}</td><td class="num">${money(cpp)}</td></tr><tr><td>Encargos sobre provisões</td><td class="num">${money(encProv)}</td></tr>
        <tr><td><b>Custo total mensal</b></td><td class="num"><b style="color:var(--brand)">${money(custo)}</b></td></tr><tr><td>Custo ÷ salário</td><td class="num">${pct(custo / Math.max(1, v.sal) * 100, 0)}</td></tr></tbody></table>
        <p class="tiny muted">Não inclui vale-transporte, alimentação, EPIs, exames e benefícios da convenção coletiva.</p>`;
    };
    box.addEventListener('input', calc); box.addEventListener('change', calc); calc();
  },

  t_prolabore(c) {
    const K = Conhecimento, { money, pct } = UI;
    const r12 = Fiscal.rbt12(UI.today().slice(0, 7));
    c.innerHTML = `<div class="grid g-2-1"><div class="stack">
      ${this.art('Pró-labore', `<ul><li>É a remuneração do sócio que trabalha na empresa. Sobre ele incide <b>INSS de 11%</b>, descontado do sócio até o teto (máx. ${money(K.INSS.teto * 0.11)}), e IRRF pela tabela mensal.</li>
        <li>A empresa paga <b>20% de CPP</b> sobre o pró-labore só se estiver no <b>Anexo IV</b>; nos demais anexos a CPP já está no DAS.</li>
        <li>Não há obrigação de pró-labore mínimo para quem não retira, mas quem trabalha na empresa deve ter pró-labore declarado (eSocial/DCTFWeb). Pagar só "distribuição de lucros" sem pró-labore é um risco previdenciário.</li></ul>`)}
      ${this.art('Fator R (Anexo III × Anexo V)', `<p>Fator R = folha de salários dos últimos 12 meses (inclui pró-labore e FGTS) ÷ receita bruta dos últimos 12 meses. Se for <b>≥ 28%</b>, serviços de engenharia/projetos ficam no <b>Anexo III</b> (alíquota inicial de 6%); abaixo disso caem no <b>Anexo V</b> (15,5%).</p>
        <p>Receita dos últimos 12 meses da VTN (pelo caixa do app): <b>${money(r12)}</b> → folha mínima para 28%: <b>${money(r12 * 0.28)}</b> no ano (~${money(r12 * 0.28 / 12)}/mês).</p>`)}
      ${this.art('Distribuição de lucros e dividendos – regra nova de 2026', `<ul><li><b>Lei 15.270/2025, art. 6º-A (conferido):</b> desde 01/01/2026 há retenção de <b>10% de IR sobre o valor total</b> pago no mês quando a empresa paga mais de <b>R$ 50.000 ao mesmo sócio</b> (pessoa física residente); pagamentos do mês são somados. A Receita entende que se aplica também ao Simples Nacional; o tema é questionado na Justiça.</li>
        <li>Lucros de 2025 ou anteriores, com distribuição aprovada até 31/12/2025, ficam fora da regra.</li>
        <li><b>IRPF mínimo (art. 16-A):</b> renda anual acima de R$ 600 mil → alíquota = (renda ÷ 60.000) − 10, até 10% em R$ 1,2 milhão, descontando o IR já pago e a retenção dos lucros.</li>
        <li>Para distribuir acima da presunção sem tributação, a empresa precisa de <b>escrituração contábil completa</b> (balanço e DRE) que comprove o lucro.</li></ul>`)}
      </div>
      <div class="card"><div class="card-h"><h3>Calculadora de pró-labore e lucros</h3></div><div class="card-b" id="pcalc">${UI.fields([{ k: 'pl', l: 'Pró-labore mensal por sócio (R$)', t: 'money', def: K.SALARIO_MINIMO }, { k: 'socios', l: 'Nº de sócios com pró-labore', t: 'number', def: 3 }, { k: 'anx', l: 'Anexo', t: 'select', o: [['III', 'Anexo III/V'], ['IV', 'Anexo IV']], def: 'III', blank: false }, { k: 'lucro', l: 'Lucro distribuído no mês por sócio (R$)', t: 'money', def: 10000 }])}<div id="pres" class="mt"></div></div></div></div>`;
    const box = UI.$('#pcalc', c);
    const calc = () => {
      const v = UI.read(box, [{ k: 'pl', t: 'money' }, { k: 'socios', t: 'number' }, { k: 'anx' }, { k: 'lucro', t: 'money' }]);
      const inss = Math.min(v.pl, K.INSS.teto) * 0.11, ir = K.calcIRRF(v.pl, inss, 0), cpp = v.anx === 'IV' ? v.pl * 0.20 : 0;
      const folhaAno = v.pl * v.socios * 12, fr = r12 ? folhaAno / r12 * 100 : 0;
      const ret = v.lucro > 50000 ? v.lucro * 0.10 : 0; // art. 6º-A: 10% sobre o total do mês
      UI.$('#pres', c).innerHTML = `<table class="t"><tbody><tr><td>INSS do sócio (11%)</td><td class="num">− ${money(inss)}</td></tr><tr><td>IRRF</td><td class="num">− ${money(ir.ir)}</td></tr>
        <tr><td><b>Pró-labore líquido</b></td><td class="num"><b>${money(v.pl - inss - ir.ir)}</b></td></tr><tr><td>CPP da empresa</td><td class="num">${money(cpp)}</td></tr>
        <tr><td>Fator R estimado (só pró-labore)</td><td class="num"><b style="color:${fr >= 28 ? 'var(--ok)' : 'var(--err)'}">${pct(fr, 1)}</b> → ${fr >= 28 ? 'Anexo III' : 'Anexo V'}</td></tr>
        <tr><td>Retenção sobre lucros (10% acima de R$ 50 mil)</td><td class="num">${ret ? '− ' + money(ret) : 'isento'}</td></tr></tbody></table>
        <p class="tiny muted">Lei 15.270/2025, art. 6º-A: 10% sobre o total pago no mês ao sócio quando passar de R$ 50 mil.</p>`;
    };
    box.addEventListener('input', calc); box.addEventListener('change', calc); calc();
  },

  t_simples(c) {
    c.innerHTML = `<div class="grid g2">
      ${this.art('Qual anexo vale para cada serviço da VTN', `<table class="t"><thead><tr><th>Serviço</th><th>Enquadramento usual</th></tr></thead><tbody>
        <tr><td>Projetos, topografia, laudos, PCI/PLS (engenharia consultiva)</td><td>Anexo III se Fator R ≥ 28%; senão Anexo V</td></tr>
        <tr><td>Execução de obras, empreitada, construção de imóveis</td><td><b>Anexo IV</b> (CPP 20% + RAT fora do DAS; retenção de 11% de INSS pelo tomador PJ)</td></tr>
        <tr><td>Locação de equipamentos sem operador</td><td>Anexo III</td></tr></tbody></table><p class="tiny muted">Empresas com mais de uma atividade apuram cada receita no seu anexo, no mesmo PGDAS-D.</p>`)}
      ${this.art('Desoneração da folha (CPRB) e reoneração', `<ul><li>Lei 14.973/2024: reoneração gradual. CPP sobre a folha 5% (2025), 10% (2026), 15% (2027) e 20% (2028); CPRB cai até ser extinta em 2028.</li>
        <li>Construção civil: CPRB de 4,5% (2024) caiu para cerca de 2,7% em 2026.</li><li>A CPRB é típica de Lucro Presumido/Real. Para empresa do Simples no Anexo IV, a aplicação é discutida – avalie com o contador se compensa sair do Simples para uma obra grande.</li></ul>`)}
      ${this.art('Incentivos e economia tributária legal', `<ul>
        <li><b>Fator R:</b> ajustar o pró-labore para manter os serviços de engenharia no Anexo III (6% inicial em vez de 15,5%).</li>
        <li><b>Separar receitas</b> de projeto (Anexo III) e de obra (Anexo IV) na nota e no PGDAS-D.</li>
        <li><b>ISS sobre obras:</b> a lei permite deduzir materiais fornecidos pelo prestador da base do ISS (LC 116, itens 7.02/7.05), conforme regra do município.</li>
        <li><b>Reforma Casa Brasil / MCMV:</b> clientes com renda até R$ 13 mil têm crédito mais barato – argumento de venda para obras e reformas.</li>
        <li><b>RET (Regime Especial de Tributação):</b> para incorporações e MCMV (alíquota unificada reduzida). Vale se a VTN passar a incorporar/vender unidades.</li>
        <li><b>Depreciação e despesas dedutíveis</b> (betoneira, carretinha, GPS, softwares) importam no Lucro Presumido/Real e na contabilidade para justificar lucros.</li>
        <li><b>Reforma tributária:</b> a partir de 2027, avaliar recolher IBS/CBS fora do DAS para gerar crédito a clientes PJ (construtoras, condomínios).</li></ul>`)}
      ${this.art('Limites do Simples', `<ul><li>Receita bruta anual até R$ 4,8 milhões (ISS/ICMS no DAS até R$ 3,6 milhões).</li><li>Microempresa até R$ 360 mil/ano; EPP de R$ 360 mil a R$ 4,8 milhões.</li><li>Use a aba <a href="#/impostos">Impostos → Simples Nacional</a> para simular alíquota efetiva e Fator R.</li></ul>`)}
    </div>`;
  },

  t_nfse(c) {
    c.innerHTML = `<div class="grid g2">
      ${this.art('NFS-e Nacional – o que muda para a VTN', `<div class="alert err mb"><b>Desde 01/11/2026</b> as ME/EPP do Simples devem emitir NFS-e pelo <b>Emissor Nacional</b> (web ou API) – Resolução CGSN nº 191/2026 (a data de 01/09 foi revogada).</div>
        <ul><li>Belo Horizonte aderiu ao Emissor Nacional e consolidou suas normas; confira o cadastro da VTN no portal nfse.gov.br e na PBH.</li>
        <li>Itabirito: verifique se a prefeitura já opera no ambiente nacional e onde recolher o ISS das obras (no local da obra, itens 7.02/7.05).</li>
        <li>Revise os códigos de serviço (tributação nacional 07.01.01 engenharia, 07.02 obras etc.), a descrição padrão e o CNO nas notas de obra.</li>
        <li>Informe nas notas de obra o valor de materiais (dedução do ISS, quando permitida) e a retenção de 11% de INSS quando o tomador for PJ.</li></ul>`)}
      ${this.art('IBS e CBS (reforma tributária)', `<ul><li><b>2026:</b> CBS 0,9% e IBS 0,1% destacados só para teste, sem cobrança. Campos obrigatórios em parte das NFS-e desde 01/10/2026 e ampliação em 01/12/2026.</li>
        <li><b>01/01/2027:</b> empresas do Simples passam a preencher IBS/CBS; notas sem os campos podem ser rejeitadas. CBS começa a ser cobrada e PIS/COFINS são extintos.</li>
        <li><b>2029–2032:</b> ISS e ICMS caem gradualmente; <b>2033:</b> sistema novo completo.</li>
        <li>O Simples continua; a partir de 2027 será possível recolher IBS/CBS por fora do DAS para gerar crédito ao cliente PJ.</li></ul>`)}
      ${this.art('Boas práticas de emissão', `<ul><li>Emitir a nota na competência do serviço (medição, entrega de projeto) e anexar no app (lançamento → comprovantes).</li><li>Conferir dados do tomador (CPF/CNPJ, endereço) – nota errada exige cancelamento/substituição dentro do prazo municipal.</li><li>Guardar XML e PDF por pelo menos 5 anos.</li><li>Controle de NFs sem emissão: o app mostra "% receita com NF" no painel financeiro.</li></ul>`)}
    </div>`;
  },

  t_obra(c) {
    c.innerHTML = `<div class="grid g2">
      ${this.art('CNO – Cadastro Nacional de Obras', `<ul><li>Obrigatório para obras de construção civil (substituiu a matrícula CEI). Responsável: o dono da obra (pessoa física) ou a empresa que executa por empreitada total.</li>
        <li>Prazo: até 30 dias do início da obra. As notas fiscais e a folha da obra devem citar o número do CNO.</li><li>Nas obras CAIXA da VTN, o CNO aparece na pasta de cada cliente (ex.: Lucas e Kamile, Carol e Tiago, Jeferson).</li></ul>`)}
      ${this.art('SERO, aferição e INSS da obra', `<ul><li><b>SERO</b> (Serviço Eletrônico para Aferição de Obras) calcula o INSS devido pela obra com base na área, no padrão e no <b>CUB</b> do estado, descontando o que já foi recolhido em folha e notas (retenções).</li>
        <li>Obras de pessoa física em área própria podem ter redução conforme área e categoria; mão de obra própria comprovada por notas com retenção reduz o valor a pagar.</li>
        <li>Ao final, a DCTFWeb Aferição de Obras gera a <b>CND de obra</b>, exigida para averbação na matrícula (e para a CAIXA encerrar o contrato).</li>
        <li>Dica: acompanhe a obra no app e lance mão de obra e notas com retenção para reduzir o INSS da aferição.</li></ul>`)}
      ${this.art('Retenção de 11% de INSS', `<ul><li>Quando a VTN presta empreitada/cessão de mão de obra a <b>tomador PJ</b> (ou a pessoa física equiparada, como incorporador), o tomador retém 11% da nota (destacar na NFS-e).</li>
        <li>Empresas do Simples no Anexo IV estão sujeitas à retenção; nos demais anexos, em regra não.</li><li>O valor retido é compensado na DCTFWeb da VTN.</li></ul>`)}
      ${this.art('Checklist de conclusão de obra', `<ol><li>Última PLS/medição CAIXA</li><li>Habite-se (prefeitura)</li><li>Aferição no SERO e CND de obra</li><li>Averbação na matrícula (cartório)</li><li>Termo de entrega e recebimento (modelo em Contratos)</li><li>Encerramento do CNO</li></ol>`)}
    </div>`;
  },

  t_caixa(c) {
    const K = Conhecimento, { money } = UI;
    c.innerHTML = `<div class="grid g-2-1"><div class="stack">
      ${this.art('Crédito CAIXA para construção – como funciona (site oficial)', `<ul><li>Financia até <b>80% da construção</b>, prazo de até <b>35 anos</b>, uso de FGTS para amortizar/pagar parcelas. Somente pessoa física, imóvel residencial para moradia própria.</li>
        <li>Modalidades: <b>construção em terreno próprio</b> ou <b>aquisição de terreno + construção</b>.</li>
        <li>Passo a passo: simulação → análise de documentos, crédito, vistoria e avaliação → assinatura → <b>acompanhamento da obra</b>: o crédito é liberado conforme a etapa do cronograma, declarada pelo cliente junto com o responsável técnico; a CAIXA faz vistorias.</li>
        <li>Conclusão: <b>habite-se e averbação na matrícula</b> são obrigatórios e iniciam a amortização.</li>
        <li>Exigências: projeto aprovado na prefeitura, <b>engenheiro ou arquiteto responsável</b> (projetos, execução e informações de evolução), seguros MIP e DFI, tarifas de avaliação, reavaliação a cada vistoria e administração.</li>
        <li>Formulários de engenharia: <b>PCI</b> (Proposta de Construção Individual) e <b>PLS</b> (Planilha de Levantamento de Serviços); PRM para reforma. Alteração de área ou valor financiado por mudança de projeto não é permitida sem análise prévia da CAIXA.</li></ul>`)}
      ${this.art('Minha Casa Minha Vida 2026 (urbano)', `<table class="t"><thead><tr><th>Faixa</th><th>Renda familiar</th><th>Imóvel</th><th>Juros</th><th>Subsídio</th></tr></thead><tbody>
        ${K.MCMV.map((f, i) => `<tr><td><b>${f.faixa}</b></td><td>${i ? money(K.MCMV[i - 1].ate + 0.01) + ' a ' : 'até '}${money(f.ate)}</td><td>${f.imovel}</td><td>${f.juros}</td><td>${f.subsidio}</td></tr>`).join('')}</tbody></table>
        <p class="tiny muted">Faixas 1–3: Portaria MCID nº 333/2026 (DOU 01/04/2026) – conferido. Faixa 4 (R$ 13 mil) e tetos de R$ 400/600 mil: comunicado oficial do governo. Juros por faixa: referência de mercado – confirme na simulação CAIXA.</p>`)}
      ${this.art('Papel da VTN nas obras CAIXA', `<ol><li>Topografia e projetos (arquitetônico com parceiros, estrutural, elétrico, hidro) + ART</li><li>PCI com orçamento e cronograma (incidências dentro dos limites – ver aba Medições/CAIXA de cada obra)</li><li>Alvará, CNO e placa/adesivo de obra</li><li>PLS mensal (medição) com relatório fotográfico e assinatura</li><li>Reprogramação de cronograma quando necessário</li><li>Habite-se, aferição/CND e averbação</li></ol>`)}
      </div>
      <div class="stack"><div class="card"><div class="card-h"><h3>Simulador SAC × Price</h3></div><div class="card-b" id="scalc">${UI.fields([{ k: 'val', l: 'Valor financiado (R$)', t: 'money', def: 250000 }, { k: 'tx', l: 'Juros (% ao ano)', t: 'number', def: 10.5 }, { k: 'n', l: 'Prazo (meses)', t: 'number', def: 420 }])}<div id="sres" class="mt"></div></div></div>
      <div class="card"><div class="card-h"><h3>Em qual faixa do MCMV o cliente entra?</h3></div><div class="card-b" id="mcalc">${UI.fields([{ k: 'renda', l: 'Renda familiar mensal (R$)', t: 'money', def: 9000 }])}<div id="mres" class="mt"></div></div></div></div></div>`;
    const sb = UI.$('#scalc', c), mb = UI.$('#mcalc', c);
    const sc = () => { const v = UI.read(sb, [{ k: 'val', t: 'money' }, { k: 'tx', t: 'number' }, { k: 'n', t: 'number' }]); const p = K.parcelas(v.val, v.tx, Math.max(1, v.n));
      UI.$('#sres', c).innerHTML = `<table class="t"><thead><tr><th></th><th class="num">SAC</th><th class="num">Price</th></tr></thead><tbody><tr><td>1ª parcela</td><td class="num">${money(p.sac1)}</td><td class="num">${money(p.price)}</td></tr><tr><td>Última parcela</td><td class="num">${money(p.sacN)}</td><td class="num">${money(p.price)}</td></tr><tr><td>Total pago</td><td class="num">${money(p.totalSac)}</td><td class="num">${money(p.totalPrice)}</td></tr><tr><td>Renda mínima (30%)</td><td class="num">${money(p.sac1 / 0.3)}</td><td class="num">${money(p.price / 0.3)}</td></tr></tbody></table><p class="tiny muted">Sem seguros (MIP/DFI), taxa de administração e TR.</p>`; };
    const mc = () => { const r = UI.read(mb, [{ k: 'renda', t: 'money' }]).renda; const f = K.MCMV.find(x => r <= x.ate);
      UI.$('#mres', c).innerHTML = f ? `<div class="alert ok"><div><b>${f.faixa}</b> · imóvel ${f.imovel} · juros ${f.juros} · ${f.subsidio}</div></div>` : `<div class="alert warn"><div>Acima de R$ 13.000: fora do MCMV – SBPE/SFH (juros de mercado, a partir de ~11% a.a.).</div></div>`; };
    sb.addEventListener('input', sc); mb.addEventListener('input', mc); sc(); mc();
  },

  t_contab(c) {
    c.innerHTML = `<div class="grid g2">
      ${this.art('Obrigações contábeis da VTN (Simples Nacional)', `<ul><li><b>Livro Caixa</b> é o mínimo exigido; a <b>escrituração contábil completa</b> (Livro Diário, balanço e DRE) é recomendada e necessária para distribuir lucros acima da presunção e para financiamentos/licitações.</li>
        <li>PGDAS-D mensal, DEFIS anual (até 31/03), DCTFWeb/EFD-Reinf e eSocial quando houver folha, pró-labore ou retenções.</li><li>Guarde notas, extratos e contratos por pelo menos 5 anos (o app guarda a estrutura e os anexos).</li></ul>`)}
      ${this.art('Rotina mensal sugerida (fechamento)', `<ol><li>Lançar todas as receitas e despesas no Caixa do app (com NF e comprovante)</li><li>Conferir extratos (Mercado Pago, Itaú, Nubank) × lançamentos</li><li>Enviar notas e extratos à contabilidade até o dia 5</li><li>Conferir o DAS (Impostos → Simples) e pagar até o dia 20</li><li>Pró-labore, folha e FGTS até o dia 20</li><li>Relatório DRE do mês (Relatórios → Financeiro)</li><li>Atualizar medições, pendências e previsão de caixa</li></ol>`)}
      ${this.art('Plano de contas simplificado usado no app', `<p><b>Receitas:</b> recebimento de etapa (com/sem NF), serviço de engenharia, projetos, aditivos. <b>Custos diretos:</b> material, mão de obra, empreiteiro, equipamentos/locação, projetos de terceiros. <b>Despesas:</b> impostos, taxas (ART/alvará/CNO), deslocamento, administrativo. Isso alimenta a DRE e o lucro por obra.</p>`)}
      ${this.art('Indicadores que todo mês você deve olhar', `<ul><li>Margem por obra e lucro realizado × projetado</li><li>% de receita com NF (exposição fiscal)</li><li>Despesa média mensal × caixa (meses de cobertura)</li><li>Contas a receber por tempo de atraso</li><li>Ritmo das obras (IDP) e curva física × financeira</li><li>Fator R e alíquota efetiva do Simples</li></ul>`)}
    </div>`;
  },

  t_fontes(c) {
    const F = [
      ['Câmara – Lei 15.270/2025 (texto original)', 'https://www2.camara.leg.br/legin/fed/lei/2025/lei-15270-26-novembro-2025-798354-publicacaooriginal-177117-pl.html'],
      ['Receita Federal – Resolução CGSN 191/2026 (NFS-e Nacional)', 'https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/agosto/simples-nacional-nfs-e-nacional-sera-obrigatoria-para-me-e-epp-a-partir-de-1o-de-novembro-de-2026'],
      ['Previdência – Portaria Interministerial MPS/MF 13/2026 (tabela INSS)', 'https://www.gov.br/previdencia/pt-br/noticias/2026/janeiro/beneficios-com-valor-acima-do-salario-minimo-sao-reajustados-em-3-9'],
      ['Ministério das Cidades – Portaria MCID 333/2026', 'https://www.gov.br/cidades/pt-br/acesso-a-informacao/institucional/base-juridica/portarias/2026/PORTARIAMCIDN333DE30DEMARODE2026PORTARIAMCIDN333DE30DEMARODE2026DOUImprensaNacional.pdf'],
      ['Câmara – Lei 14.973/2024 (reoneração)', 'https://www2.camara.leg.br/legin/fed/lei/2024/lei-14973-16-setembro-2024-796242-publicacaooriginal-173011-pl.html'],
      ['Receita – IN RFB 2.289/2025 (dispensa de retenção)', 'https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2025/novembro/receita-federal-consolida-hipoteses-de-dispensa-da-retencao-previdenciaria-em-contratos-de-servicos-e-obras'],
      ['Receita – Exemplos da Lei 15.270/2025 (tabela IRRF)', 'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/exemplos-de-aplicacao-da-lei-15-270-2025'],
      ['Prefeitura de BH – BHISS: códigos de tributação e alíquotas', 'https://bhissdigital.pbh.gov.br/atde/pages/codigoTributacaoMunicipal.jsf'],
      ['Prefeitura de Itabirito – Lei 2.323/2003 (ISSQN) consolidada', 'https://itabirito.mg.gov.br/wp-content/uploads/2024/04/a_91_1_18_10012023112300.pdf'],
      ['Diário Oficial do Município de BH (DOM)', 'https://dom-web.pbh.gov.br/'],
      ['Diário Oficial de Itabirito', 'https://itabirito.atende.net/diariooficial/edicao'],
      ['CAIXA – Crédito imobiliário para construção (oficial)', 'https://www.caixa.gov.br/voce/habitacao/construcao/Paginas/default.aspx'],
      ['Fenacon – NFS-e Nacional obrigatória para ME/EPP a partir de 01/11/2026', 'https://fenacon.org.br/reforma-tributaria/simples-nacional-nfs-e-nacional-sera-obrigatoria-para-me-e-epp-a-partir-de-1o-de-novembro-de-2026/'],
      ['PBH – Belo Horizonte adere ao Emissor Nacional de NFS-e', 'https://prefeitura.pbh.gov.br/noticias/belo-horizonte-adere-ao-emissor-nacional-de-nota-fiscal-de-servico-eletronica'],
      ['Guia Tributário – Destaque de CBS/IBS na NFS-e', 'https://guiatributario.net/2026/08/03/'],
      ['Contabilizei – Tabela INSS 2026', 'https://www.contabilizei.com.br/contabilidade-online/tabela-inss/'],
      ['Contabilidade.com – IRRF 2026 e redução até R$ 7.350', 'https://contabilidade.com/blog/irrf-2026-como-calcular-o-imposto-de-renda-retido-na-fonte-com-a-nova-tabela-e-reducao-ate-r-7-350/'],
      ['Ozai – Simples e retenção de 10% sobre lucros', 'https://www.ozai.com.br/as-empresas-do-simples-nacional-terao-que-reter-10-sobre-lucros-distribuidos/'],
      ['Fenacon/CRC-MA – Tributação de 10% sobre dividendos', 'https://fenacon.org.br/noticias/tributacao-de-10-sobre-dividendos-acima-de-r-50-mil-por-que-empresarios-devem-agir-agora/'],
      ['Valor Final – Minha Casa Minha Vida 2026', 'https://valorfinal.com.br/guia/minha-casa-minha-vida-2026'],
      ['Contajá – Desoneração da folha 2026 e CPRB', 'https://contaja.com.br/blog/desoneracao-da-folha-de-pagamento/'],
      ['Receita Federal – Manual do SERO', 'https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/manuais/manual-do-sero'],
      ['Contabilidade.com – Fator R 2026', 'https://contabilidade.com/blog/fator-r-2026-como-calcular-e-pagar-menos-imposto/'],
      ['Agilize – Retenção de INSS na construção civil', 'https://agilize.com.br/blog/gestao-contabil-e-fiscal/inss-construcao-civil/']
    ];
    c.innerHTML = `<div class="card"><div class="card-h"><h3>Fontes consultadas em 31/10/2026</h3><span class="tiny muted">Conteúdo informativo – não substitui o contador</span></div><div class="card-b p0">
      ${F.map(f => `<a class="file" style="padding:12px 16px;border-bottom:1px solid var(--border)" href="${f[1]}" target="_blank" rel="noopener">${UI.icon('external-link')}<span class="nm">${UI.esc(f[0])}</span><span class="tiny muted">${UI.esc(new URL(f[1]).hostname)}</span></a>`).join('')}</div></div>`;
  }
};
