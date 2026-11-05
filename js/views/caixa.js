/* =========================================================
   PCI e PLS – no formato das planilhas da CAIXA (Construção Individual)
   PCI: Proposta de Construção Individual (dados, custos por serviço com incidências
        aceitáveis, BDI, serviços adicionais, cronograma físico-financeiro).
   PLS: Planilha de Levantamento de Serviços (medição: % de execução de cada serviço,
        acumulado, etapa de referência e situação da obra pelas curvas da CAIXA).
   Base: planilha oficial PCI_CAIXA (20/06/2025). Serve para preparar e conferir;
   o envio oficial continua sendo a planilha da CAIXA.
   Dados: obra.pci (proposta) e medicoes (cada PLS, com exec[] por serviço).
   ========================================================= */
window.PCI = (() => {
  const S = () => window.CAIXA_SERVICOS;   // [nome, mín %, máx %] – os 20 serviços da CAIXA
  // curvas de referência da CAIXA (% acumulado nas etapas 1..24), por faixa do valor do imóvel
  const CURVAS = {
    1: { nome: 'Faixa 1 (valor do imóvel até R$ 264 mil)',
      lenta: [0, 19, 28, 38, 50, 58, 65, 70, 75, 80, 84, 87, 100], normal: [5, 22, 39, 59, 74, 90, 100], rapida: [8, 33, 59, 84, 100] },
    2: { nome: 'Faixa 2 (R$ 264 mil a R$ 500 mil)',
      lenta: [0, 14, 20, 28, 35, 44, 51, 57, 62, 66, 71, 75, 80, 82, 85, 89, 94, 100], normal: [5, 15, 27, 39, 52, 63, 74, 82, 92, 100], rapida: [9, 25, 42, 59, 75, 90, 95, 100] },
    3: { nome: 'Faixa 3 (acima de R$ 500 mil)',
      lenta: [0, 8, 13, 18, 25, 31, 38, 42, 48, 54, 59, 65, 69, 75, 79, 81, 83, 86, 89, 92, 95, 100], normal: [3, 10, 14, 23, 32, 42, 51, 59, 67, 73, 80, 89, 95, 100], rapida: [5, 17, 25, 39, 53, 64, 76, 87, 94, 100] }
  };
  const faixa = va => (+va || 0) <= 264000 ? 1 : (+va || 0) < 500000 ? 2 : 3;
  const curva = (va, tipo, etapa) => { if (etapa <= 0) return 0; const c = CURVAS[faixa(va)][tipo]; return etapa > c.length ? 100 : c[etapa - 1]; };
  const LISTAS = {
    finalidade: ['Construção em terreno próprio', 'Aquisição de terreno e construção', 'Aq. terreno e constr. SBPE', 'Aq. terreno e constr. FGTS', 'Constr. terreno próprio SBPE', 'Constr. terreno próprio FGTS'],
    destinacao: ['Residencial', 'Comercial', 'Misto'],
    sistema: ['Conv.: Estrutura de concreto, aço ou madeira / vedação blocos cerâmicos', 'Conv.: Estrutura de concreto, aço ou madeira / vedação blocos de concreto', 'Conv.: Alvenaria estrutural', 'Conv.: Paredes de concreto moldadas no local (NBR 16055)', 'Conv.: Light Steel Framing (NBR 16970)', 'Conv.: Light Wood Frame (NBR 16936)', 'Conv.: Painéis de PVC preenchidos com concreto (NBR 17077)', 'Inovador (especificar)', 'Outros'],
    padrao: ['Baixo', 'Normal', 'Alto'],
    cobertura: ['Telha de cerâmica/concreto', 'Telha de fibrocimento c/ platibanda', 'Telha de fibrocimento s/ platibanda', 'Telha metálica c/ platibanda', 'Telha metálica s/ platibanda', 'Laje impermeabilizada', 'Outros'],
    teto: ['Laje', 'Forro', 'Laje + forro', 'Telha aparente', 'Outros'],
    acab: ['Pintura/textura/grafiato', 'Pint./text./grafiato e det. em pedra/cerâmica', 'Cerâmica/porcelanato', 'Sem revestimento', 'Outros'],
    revMolhada: ['Cerâmica comercial', 'Porcelanato 1ª', 'Porcelanato 2ª', 'Pedra', 'Granito/mármore', 'Cimentado', 'Outros'],
    pisoSeco: ['Cerâmica comercial', 'Porcelanato 1ª', 'Porcelanato 2ª', 'Laminado', 'Vinílico', 'Pedra', 'Granito/mármore', 'Emborrachado', 'Cimentado', 'Outros'],
    pisoMolhado: ['Cerâmica comercial', 'Porcelanato 1ª', 'Porcelanato 2ª', 'São Tomé', 'Ardósia', 'Granito/mármore', 'Cimentado', 'Outros'],
    paredes: ['Alvenaria', 'Gesso', 'Concreto', 'Madeira', 'Aço', 'Outros'],
    loucas: ['Linha popular', 'Linha média', 'Linha luxo'],
    esquadrias: ['Alumínio', 'PVC', 'Madeira', 'Vidro temperado', 'Aço', 'Outros'],
    agua: ['Concessionária', 'Poço', 'Outra'], esgoto: ['Rede de esgoto', 'Fossa e filtro', 'Fossa e sumidouro', 'Outra'],
    drenagem: ['Rede de água pluvial', 'Interna ao terreno', 'Outra'], energia: ['Nenhuma', 'Fotovoltaica', 'Eólica', 'Outra'],
    areaServ: ['Interna', 'Externa coberta', 'Externa descoberta', 'Não'], cozinha: ['Cozinha', 'Cozinha + A. Serviço', 'Cozinha + copa', 'Cozinha americana'],
    implantacao: ['Isolada', 'Isolada (parte empr. não-condom.)', 'Condomínio'], aguaQuente: ['Não', 'Aquecimento solar', 'Aquecimento a gás', 'Elétrico'],
    simNao: ['Sim', 'Não', 'Falta'], executor: ['Construtora (pessoa jurídica)', 'Pessoa física / administração própria']
  };
  const r2 = v => Math.round((+v || 0) * 100) / 100;
  const dados = o => {
    const p = Object.assign({ custos: [], adicionais: [], cronograma: [], bdi: 0, prazo: 12, etapa0: 0 }, o.pci || {});
    // primeira vez: aproveita as incidências que já estavam na obra
    if (!p.custos.length) { const inc = (Store.db.incidencias || {})[o.id]; const base = +o.valorFinanciado || +o.valorContrato || 0; p.custos = S().map((s, i) => inc ? r2((+inc[i] || 0) / 100 * base) : 0); }
    while (p.adicionais.length < 10) p.adicionais.push({ desc: '', valor: 0 });
    if (!p.valorImovel) p.valorImovel = +o.valorImovel || 0;
    return p;
  };
  // contas da proposta (mesmas da planilha CAIXA)
  function contas(o, p) {
    const adic = p.adicionais.reduce((a, x) => a + (+x.valor || 0), 0);
    const custos = S().map((s, i) => i === 19 ? adic : +p.custos[i] || 0);   // item 20 "Outros" = soma dos serviços adicionais
    const total = custos.reduce((a, v) => a + v, 0);
    const inc = custos.map(v => total ? v / total * 100 : 0);
    let ac = 0; const acum = inc.map(v => (ac += v));
    const fora = S().map((s, i) => total && custos[i] && (inc[i] < s[1] - 1e-9 || inc[i] > s[2] + 1e-9)).map((f, i) => f || (total && !custos[i] && S()[i][1] > 0));
    const comBdi = total * (1 + (+p.bdi || 0) / 100);
    const area = +(p.areaCoberta || 0) + +(p.areaAcessoria || 0);
    const producao = comBdi + (+p.valorTerreno || 0);
    return { custos, total, inc, acum, fora, comBdi, adic, producao, area, unit: v => area ? v / area : 0 };
  }
  // cronograma padrão: curva normal da faixa, esticada para o prazo da obra
  function cronogramaPadrao(va, prazo, etapa0 = 0) {
    const c = CURVAS[faixa(va)].normal, n = c.length; const out = [];
    for (let e = 1; e <= prazo; e++) {
      const t = e / prazo * n, i = Math.floor(t), f = t - i;
      const a = i <= 0 ? 0 : c[Math.min(i, n) - 1], b = c[Math.min(i + 1, n) - 1];
      const v = i >= n ? 100 : a + (b - a) * f;
      out.push(r2(etapa0 + (100 - etapa0) * v / 100));
    }
    out[prazo - 1] = 100; return out;
  }
  const pessoa = id => Store.get('pessoas', id) || {};
  const rtObra = o => pessoa(o.rtId);

  /* ---------- editor do PCI ---------- */
  function editar(obraId) {
    const o = Store.get('obras', obraId); if (!o) return;
    const p = dados(o); const { esc, money, pct, icon } = UI; const ed = Auth.can('obras.editar');
    const sel = (k, lista, v) => `<select class="select" name="${k}"><option value=""></option>${lista.map(x => `<option ${x === v ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
    const inp = (k, v, t = 'text', extra = '') => `<input class="input" name="${k}" type="${t}" ${t === 'number' ? 'step="any"' : ''} value="${esc(v ?? '')}" ${extra}>`;
    const campo = (l, html, cls = '') => `<div class="field ${cls}"><label>${l}</label>${html}</div>`;
    const cli = (o.clienteIds || []).map(pessoa); const rt = rtObra(o);
    const m = UI.modal({ title: `PCI – Proposta de Construção Individual · ${esc(o.nome)}`, wide: true, body: `
      <div class="alert info mb">${icon('info')}<div>Mesma estrutura da planilha <b>PCI da CAIXA</b>. Preencha aqui, confira as incidências e o cronograma e use <b>Copiar para a planilha CAIXA</b> para colar os custos e o cronograma na planilha oficial.</div></div>
      <h3 class="mb">Identificação</h3>
      <div class="form">
        ${campo('Proponente(s) – vêm da obra', `<div class="input" style="height:auto">${cli.map(c => `${esc(c.nome)} · CPF ${esc(c.cpf || '—')} · ${esc(c.email || '')} ${esc(c.telefone || '')}`).join('<br>') || '<span class="muted">Cadastre o cliente na obra</span>'}</div>`, 'full')}
        ${campo('RT pela execução (RTE) – responsável técnico da obra', `<div class="input" style="height:auto">${esc(rt.nome || '—')} · ${esc(rt.registro || 'CREA —')} · CPF ${esc(rt.cpf || '—')}</div>`, 'full')}
        ${campo('RT pelo projeto (RTP)', `<select class="select" name="rtpId"><option value="">O mesmo da execução</option>${Store.all('pessoas').filter(x => x.registro || x.tipo === 'Equipe' || x.tipo === 'Parceiro').map(x => `<option value="${x.id}" ${x.id === p.rtpId ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</select>`)}
        ${campo('Finalidade', sel('finalidade', LISTAS.finalidade, p.finalidade))}
        ${campo('Endereço (da obra)', `<div class="input">${esc(o.endereco || '—')}</div>`)}
        ${campo('Complemento (lote/quadra)', inp('complemento', p.complemento))}
        ${campo('Bairro', inp('bairro', p.bairro))}
        ${campo('Município / UF / CEP (da obra)', `<div class="input">${esc(o.cidade || '—')} / ${esc(o.uf || 'MG')} / ${esc(o.cep || '—')}</div>`)}
        ${campo('Matrícula (da obra)', `<div class="input">${esc(o.matricula || '—')}</div>`)}
        ${campo('ORI – Registro de Imóveis', inp('ori', p.ori))}
        ${campo('Coordenadas', inp('coord', p.coord, 'text', 'placeholder="20°15\'30&quot; S  43°48\'10&quot; W"'))}
        ${campo('Executor da obra', sel('executor', LISTAS.executor, p.executor))}
      </div>
      <h3 class="mb mt2">Documentação básica</h3>
      <div class="form">
        ${campo('Certidão de matrícula', sel('docMatricula', LISTAS.simNao, p.docMatricula))}${campo('Alvará / licença da obra', sel('docAlvara', LISTAS.simNao, p.docAlvara))}
        ${campo('Validade do alvará', inp('alvaraValidade', p.alvaraValidade || o.alvaraVigencia, 'date'))}${campo('Projeto legal aprovado', sel('docProjeto', LISTAS.simNao, p.docProjeto))}
        ${campo('ART/RRT de projeto – nº', inp('artProjeto', p.artProjeto))}${campo('ART/RRT de execução – nº', inp('artExecucao', p.artExecucao || o.art))}
      </div>
      <h3 class="mb mt2">Projeto – características, áreas e valores</h3>
      <div class="form">
        ${campo('Área coberta padrão (m²)', inp('areaCoberta', p.areaCoberta ?? o.area, 'number'))}${campo('Área acessória coberta (m²)', inp('areaAcessoria', p.areaAcessoria, 'number'))}
        ${campo('Área permeável (m²)', inp('areaPermeavel', p.areaPermeavel, 'number'))}${campo('Área do terreno (m²)', inp('areaTerreno', p.areaTerreno, 'number'))}
        ${campo('Valor proposto do terreno (R$)', inp('valorTerreno', p.valorTerreno, 'number'))}${campo('Valor proposto do imóvel (R$)', inp('valorImovel', p.valorImovel, 'number'))}
        ${campo('Destinação', sel('destinacao', LISTAS.destinacao, p.destinacao))}${campo('Sistema construtivo', sel('sistema', LISTAS.sistema, p.sistema))}
      </div>
      <h3 class="mb mt2">Memorial descritivo</h3>
      <div class="form">
        ${campo('Padrão de acabamento', sel('padrao', LISTAS.padrao, p.padrao))}${campo('Implantação', sel('implantacao', LISTAS.implantacao, p.implantacao))}
        ${campo('Cobertura', sel('cobertura', LISTAS.cobertura, p.cobertura))}${campo('Teto', sel('teto', LISTAS.teto, p.teto))}
        ${campo('Pavimentos', inp('pavtos', p.pavtos, 'number'))}${campo('Quartos / suítes / salas', `<div class="row" style="gap:6px">${inp('quartos', p.quartos, 'number', 'placeholder="quartos"')}${inp('suites', p.suites, 'number', 'placeholder="suítes"')}${inp('salas', p.salas, 'number', 'placeholder="salas"')}</div>`)}
        ${campo('Vagas', inp('vagas', p.vagas, 'number'))}${campo('Área de serviço / cozinha', `<div class="row" style="gap:6px">${sel('areaServ', LISTAS.areaServ, p.areaServ)}${sel('cozinha', LISTAS.cozinha, p.cozinha)}</div>`)}
        ${campo('Acabamento paredes externas', sel('acabExt', LISTAS.acab, p.acabExt))}${campo('Acabamento paredes internas', sel('acabInt', LISTAS.acab, p.acabInt))}
        ${campo('Revest. parede áreas molhadas', sel('revMolhada', LISTAS.revMolhada, p.revMolhada))}${campo('Revest. piso áreas secas', sel('pisoSeco', LISTAS.pisoSeco, p.pisoSeco))}
        ${campo('Revest. piso áreas molhadas', sel('pisoMolhado', LISTAS.pisoMolhado, p.pisoMolhado))}${campo('Paredes/painéis áreas secas', sel('paredes', LISTAS.paredes, p.paredes))}
        ${campo('Louças e metais', sel('loucas', LISTAS.loucas, p.loucas))}${campo('Água quente', sel('aguaQuente', LISTAS.aguaQuente, p.aguaQuente))}
        ${campo('Esquadrias externas / internas', `<div class="row" style="gap:6px">${sel('esqExt', LISTAS.esquadrias, p.esqExt)}${sel('esqInt', LISTAS.esquadrias, p.esqInt)}</div>`)}${campo('Abastecimento de água', sel('agua', LISTAS.agua, p.agua))}
        ${campo('Coleta/tratamento de esgoto', sel('esgoto', LISTAS.esgoto, p.esgoto))}${campo('Drenagem', sel('drenagem', LISTAS.drenagem, p.drenagem))}
        ${campo('Geração alternativa de energia', sel('energia', LISTAS.energia, p.energia))}
        ${campo('Divisão interna (ambientes)', `<textarea class="input" name="divisao" rows="2">${esc(p.divisao || '')}</textarea>`, 'full')}
      </div>
      <h3 class="mb mt2">Custos – serviços componentes e incidências aceitáveis</h3>
      <div id="pciCustos"></div>
      <h3 class="mb mt2">Serviços adicionais (entram no item 20 – Outros)</h3>
      <div class="table-wrap"><table class="t"><thead><tr><th>#</th><th>Serviço</th><th class="num">Custo (R$)</th></tr></thead><tbody>
        ${p.adicionais.map((x, i) => `<tr><td>${i + 1}</td><td><input class="input" data-ad="${i}" data-f="desc" value="${esc(x.desc)}" style="width:100%"></td><td class="num"><input class="input" type="number" step="any" data-ad="${i}" data-f="valor" value="${x.valor || ''}" style="width:130px;text-align:right"></td></tr>`).join('')}
      </tbody></table></div>
      <div class="field mt"><label>Justificativas para itens fora das referências de incidência</label><textarea class="input" name="justificativa" rows="3">${esc(p.justificativa || '')}</textarea></div>
      <h3 class="mb mt2">Prazo e cronograma físico-financeiro</h3>
      <div class="form">
        ${campo('Prazo de execução (meses, 1 a 24)', inp('prazo', p.prazo, 'number', 'min="1" max="24"'))}${campo('% de obra pré-executada (etapa 0)', inp('etapa0', p.etapa0, 'number'))}
        ${campo('Descrição das obras pré-existentes', `<textarea class="input" name="preExistente" rows="2">${esc(p.preExistente || '')}</textarea>`, 'full')}
      </div>
      <div class="row mt"><button class="btn sm" id="pciPadrao">${icon('wand-2')} Cronograma padrão (curva normal da CAIXA)</button><span class="tiny muted" id="pciFaixa"></span></div>
      <div id="pciCrono" class="mt"></div>
      <div class="field mt"><label>Outras observações</label><textarea class="input" name="obs" rows="2">${esc(p.obs || '')}</textarea></div>`,
      footer: `<button class="btn" id="pciCopiar">${icon('clipboard-copy')} Copiar para a planilha CAIXA</button><button class="btn" id="pciImprimir">${icon('printer')} Imprimir / PDF</button><button class="btn" data-close>Fechar</button>${ed ? `<button class="btn primary" id="pciSalvar">${icon('save')} Salvar</button>` : ''}` });
    const corpo = m.el.querySelector('.modal-b');
    const ler = () => {
      corpo.querySelectorAll('[name]').forEach(i => { if (i.closest('#pciCustos') || i.closest('#pciCrono')) return; p[i.name] = i.type === 'number' ? (i.value === '' ? '' : +i.value) : i.value; });
      corpo.querySelectorAll('[data-ad]').forEach(i => { const x = p.adicionais[+i.dataset.ad]; x[i.dataset.f] = i.dataset.f === 'valor' ? +i.value || 0 : i.value; });
      corpo.querySelectorAll('[data-cu]').forEach(i => { p.custos[+i.dataset.cu] = +i.value || 0; });
      { const b = corpo.querySelector('#pciCustos [name="bdi"]'); if (b) p.bdi = +b.value || 0; }
      corpo.querySelectorAll('[data-cr]').forEach(i => { p.cronograma[+i.dataset.cr] = i.value === '' ? '' : +i.value; });
      p.prazo = Math.max(1, Math.min(24, Math.round(+p.prazo || 12)));
    };
    const desenhar = () => {
      const k = contas(o, p);
      UI.$('#pciCustos', m.el).innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>Item</th><th>Serviço</th><th class="num">Custo (R$)</th><th class="num">Incidência</th><th class="num">% acum.</th><th class="num">Mín.</th><th class="num">Máx.</th><th></th></tr></thead><tbody>
        ${S().map((s, i) => `<tr><td>${i + 1}</td><td>${esc(s[0])}</td><td class="num">${i === 19 ? `<b>${money(k.custos[i])}</b>` : `<input class="input" type="number" step="any" data-cu="${i}" value="${p.custos[i] || ''}" style="width:130px;text-align:right">`}</td>
          <td class="num"><b>${pct(k.inc[i], 2)}</b></td><td class="num muted">${pct(k.acum[i], 2)}</td><td class="num muted">${pct(s[1], 2)}</td><td class="num muted">${pct(s[2], 2)}</td>
          <td>${!k.total ? '' : k.fora[i] ? `<span class="badge err">${k.inc[i] < s[1] ? 'abaixo' : 'acima'}</span>` : '<span class="badge ok">OK</span>'}</td></tr>`).join('')}
        </tbody><tfoot>
          <tr><td></td><td>Custo total de serviços</td><td class="num"><b>${money(k.total)}</b></td><td class="num">${pct(k.total ? 100 : 0, 2)}</td><td colspan="4"></td></tr>
          <tr><td></td><td>BDI (%)</td><td class="num"><input class="input" type="number" step="any" name="bdi" value="${p.bdi || 0}" style="width:90px;text-align:right" data-recalc></td><td colspan="5"></td></tr>
          <tr><td></td><td>Custo total com BDI</td><td class="num"><b>${money(k.comBdi)}</b></td><td colspan="5"></td></tr>
        </tfoot></table></div>
        <div class="grid g4 mt">
          <div class="card kpi"><div class="lbl">Valor do terreno</div><div class="val">${money(+p.valorTerreno || 0)}</div></div>
          <div class="card kpi"><div class="lbl">Custo de serviços c/ BDI</div><div class="val">${money(k.comBdi)}</div><div class="sub">${k.area ? money(k.unit(k.comBdi)) + '/m²' : 'informe as áreas'}</div></div>
          <div class="card kpi"><div class="lbl">Custo total de produção</div><div class="val">${money(k.producao)}</div><div class="sub">${k.area ? money(k.unit(k.producao)) + '/m²' : ''}</div></div>
          <div class="card kpi ${k.fora.some(Boolean) ? 'err' : 'ok'}"><div class="lbl">Incidências</div><div class="val">${k.fora.filter(Boolean).length ? k.fora.filter(Boolean).length + ' fora' : 'Todas OK'}</div><div class="sub">${k.fora.some(Boolean) ? 'justifique abaixo ou ajuste' : 'dentro dos limites da CAIXA'}</div></div>
        </div>`;
      const va = +p.valorImovel || 0;
      UI.$('#pciFaixa', m.el).textContent = 'Curva de referência: ' + CURVAS[faixa(va)].nome;
      if (!p.cronograma.length || p.cronograma.length !== p.prazo) p.cronograma = cronogramaPadrao(va, p.prazo, +p.etapa0 || 0);
      let ruim = 0;
      UI.$('#pciCrono', m.el).innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>Etapa</th><th class="num">% acum. proposto</th><th class="num">% na etapa</th><th class="num">Valor acumulado</th><th class="num">Curva lenta</th><th class="num">Curva normal</th><th class="num">Curva rápida</th><th></th></tr></thead><tbody>
        <tr><td>0 (pré-executado)</td><td class="num">${pct(+p.etapa0 || 0, 1)}</td><td></td><td class="num">${money((+p.etapa0 || 0) / 100 * k.comBdi)}</td><td colspan="4"></td></tr>
        ${p.cronograma.map((v, i) => { const e = i + 1, ant = i ? +p.cronograma[i - 1] || 0 : +p.etapa0 || 0, L = curva(va, 'lenta', e), R = curva(va, 'rapida', e); const fora = (+v || 0) < L - 1e-9 || (+v || 0) < ant - 1e-9; if (fora) ruim++;
          return `<tr><td>${e}</td><td class="num"><input class="input" type="number" step="any" data-cr="${i}" value="${v}" style="width:90px;text-align:right"></td><td class="num">${pct((+v || 0) - ant, 1)}</td><td class="num">${money((+v || 0) / 100 * k.comBdi)}</td>
            <td class="num muted">${L}%</td><td class="num muted">${curva(va, 'normal', e)}%</td><td class="num muted">${R}%</td><td>${fora ? `<span class="badge err">${(+v || 0) < ant ? 'menor que a anterior' : 'abaixo da curva lenta'}</span>` : ''}</td></tr>`; }).join('')}
        </tbody></table></div>${p.cronograma[p.cronograma.length - 1] !== 100 ? '<div class="alert err mt">A última etapa precisa chegar a 100%.</div>' : ''}${ruim ? `<div class="tiny muted mt">${ruim} etapa(s) fora da referência: a CAIXA pede justificativa.</div>` : ''}`;
      UI.$$('[data-cu],[data-cr],[data-recalc]', m.el).forEach(i => i.onchange = () => { ler(); desenhar(); });
      UI.icons();
    };
    corpo.querySelectorAll('[data-ad], [name="valorImovel"], [name="areaCoberta"], [name="areaAcessoria"], [name="valorTerreno"]').forEach(i => i.addEventListener('change', () => { ler(); desenhar(); }));
    corpo.querySelectorAll('[name="prazo"], [name="etapa0"]').forEach(i => i.addEventListener('change', () => { ler(); p.cronograma = []; desenhar(); }));
    UI.$('#pciPadrao', m.el).onclick = () => { ler(); p.cronograma = []; desenhar(); UI.toast('Cronograma refeito pela curva normal da CAIXA'); };
    desenhar();
    const salvar = () => { ler(); p.atualizadoEm = new Date().toISOString(); Store.update('obras', o.id, { pci: JSON.parse(JSON.stringify(p)) }); };
    if (UI.$('#pciSalvar', m.el)) UI.$('#pciSalvar', m.el).onclick = () => { salvar(); UI.toast('PCI salvo'); m.close(); App.refresh(); };
    UI.$('#pciImprimir', m.el).onclick = () => { ler(); if (ed) salvar(); const h = html(o, p); UI.print(h, 'PCI ' + o.nome); if (ed && window.Drive) Drive.salvarDoc(o.id, { corpo: h, titulo: 'PCI ' + o.nome, categoria: 'PCI', avisar: false }); };
    UI.$('#pciCopiar', m.el).onclick = () => { ler(); const k = contas(o, p);
      const txt = 'CUSTOS (colar na coluna "Custos [R$]" da PCI, itens 1 a 19)\n' + k.custos.slice(0, 19).map(v => String(r2(v)).replace('.', ',')).join('\n') +
        '\n\nSERVIÇOS ADICIONAIS\n' + p.adicionais.filter(x => x.desc || x.valor).map(x => x.desc + '\t' + String(r2(x.valor)).replace('.', ',')).join('\n') +
        '\n\nBDI\n' + String(+p.bdi || 0).replace('.', ',') + '\n\nCRONOGRAMA (% acumulado por etapa)\n' + p.cronograma.map(v => String(v).replace('.', ',')).join('\n');
      navigator.clipboard.writeText(txt).then(() => UI.toast('Copiado. Cole na planilha oficial da CAIXA.'), () => UI.toast('Não foi possível copiar', 'err')); };
  }

  /* ---------- impressão do PCI (mesmo desenho da planilha) ---------- */
  const CSS = `<style>.cx{font:9.5pt Arial,sans-serif;color:#111}.cx h1{font-size:13pt;text-align:right;margin:0}.cx h1 small{display:block;font-size:9pt;font-weight:normal}.cx .sec{background:#1f3f7a;color:#fff;font-weight:bold;padding:3px 6px;margin:8px 0 2px;text-transform:uppercase;font-size:9pt}
    .cx table{width:100%;border-collapse:collapse;font-size:inherit}.cx td,.cx th{border:1px solid #9aa7bd;padding:2px 4px;vertical-align:top}.cx th{background:#dbe3f1;font-weight:bold;text-align:left}.cx .l{font-size:7.5pt;color:#444;display:block}.cx .n{text-align:right}.cx .ok{color:#15803d;font-weight:bold}.cx .er{color:#b91c1c;font-weight:bold}.cx .rod{font-size:7.5pt;color:#555;margin-top:6px}.cx .ass{margin-top:30px;display:flex;gap:40px}.cx .ass div{flex:1;border-top:1px solid #333;padding-top:3px;text-align:center}</style>`;
  const c2 = (l, v) => `<td><span class="l">${l}</span>${UI.esc(v == null || v === '' ? '' : String(v))}</td>`;
  function cab(titulo, sub) { const e = Store.db.empresa; return `<table style="border:0"><tr><td style="border:0"><b>${UI.esc(e.nome)}</b><br><span class="l">CNPJ ${UI.esc(e.cnpj || '')}</span></td><td style="border:0"><h1>${titulo}<small>${sub}</small></h1></td></tr></table>`; }
  function identificacao(o, p) {
    const cli = (o.clienteIds || []).map(pessoa), rt = rtObra(o), rtp = p.rtpId ? pessoa(p.rtpId) : rt;
    return `<div class="sec">Identificação</div><table>${cli.map(c => `<tr>${c2('Proponente', c.nome)}${c2('E-mail', c.email)}${c2('CPF/CNPJ', c.cpf)}${c2('Telefone', c.telefone)}</tr>`).join('') || `<tr>${c2('Proponente', '')}</tr>`}
      <tr>${c2('RT pelo projeto – RTP', rtp.nome)}${c2('E-mail – RTP', rtp.email)}${c2('CAU/CREA – RTP', rtp.registro)}${c2('CPF – RTP', rtp.cpf)}</tr>
      <tr>${c2('RT pela execução – RTE', rt.nome)}${c2('E-mail – RTE', rt.email)}${c2('CAU/CREA – RTE', rt.registro)}${c2('CPF – RTE', rt.cpf)}</tr></table>
      <table><tr>${c2('Endereço', o.endereco)}${c2('Complemento', p.complemento)}${c2('Bairro', p.bairro)}</tr><tr>${c2('Município', o.cidade)}${c2('UF', o.uf || 'MG')}${c2('CEP', o.cep)}</tr>
      <tr>${c2('Matrícula', o.matricula)}${c2('ORI', p.ori)}${c2('Coordenadas', p.coord)}</tr><tr>${c2('Construtora', Store.db.empresa.nome)}${c2('CNPJ', Store.db.empresa.cnpj)}${c2('Finalidade', p.finalidade)}</tr></table>`;
  }
  function html(o, p) {
    const { money, pct } = UI; const k = contas(o, p); const va = +p.valorImovel || 0; const area = k.area;
    return `${CSS}<div class="cx">${cab('Proposta de Construção Individual', 'Construção em terreno próprio / aquisição de terreno e construção – formato CAIXA')}
      ${identificacao(o, p)}
      <div class="sec">Documentação para análise técnica</div><table><tr>${c2('Certidão de matrícula', p.docMatricula)}${c2('Alvará/licença', p.docAlvara)}${c2('Validade do alvará', p.alvaraValidade ? UI.date(p.alvaraValidade) : '')}${c2('Projeto legal aprovado', p.docProjeto)}</tr>
        <tr>${c2('ART/RRT projeto nº', p.artProjeto)}${c2('ART/RRT execução nº', p.artExecucao)}${c2('Destinação', p.destinacao)}${c2('Executor', p.executor)}</tr></table>
      <div class="sec">Projeto – características, áreas e valores</div><table><tr>${c2('Área coberta padrão', (p.areaCoberta || 0) + ' m²')}${c2('Área permeável', (p.areaPermeavel || 0) + ' m²')}${c2('Área acessória coberta', (p.areaAcessoria || 0) + ' m²')}${c2('Área construída total', area + ' m²')}${c2('Área do terreno', (p.areaTerreno || 0) + ' m²')}</tr>
        <tr>${c2('Valor proposto terreno', money(+p.valorTerreno || 0))}${c2('Valor proposto imóvel', money(va))}<td colspan="3"><span class="l">Sistema construtivo</span>${UI.esc(p.sistema || '')}</td></tr></table>
      <div class="sec">Memorial descritivo</div><table><tr>${c2('Padrão', p.padrao)}${c2('Implantação', p.implantacao)}${c2('Cobertura', p.cobertura)}${c2('Teto', p.teto)}${c2('Pavtos.', p.pavtos)}${c2('Quartos/suítes/salas', [p.quartos, p.suites, p.salas].map(x => x || 0).join(' / '))}</tr>
        <tr>${c2('Acab. paredes ext.', p.acabExt)}${c2('Acab. paredes int.', p.acabInt)}${c2('Rev. parede á. molhadas', p.revMolhada)}${c2('Piso á. secas', p.pisoSeco)}${c2('Piso á. molhadas', p.pisoMolhado)}${c2('Paredes/painéis', p.paredes)}</tr>
        <tr>${c2('Esquadrias ext./int.', [p.esqExt, p.esqInt].filter(Boolean).join(' / '))}${c2('Louças e metais', p.loucas)}${c2('Água', p.agua)}${c2('Esgoto', p.esgoto)}${c2('Drenagem', p.drenagem)}${c2('Energia alternativa', p.energia)}</tr>
        <tr>${c2('Área de serviço', p.areaServ)}${c2('Cozinha', p.cozinha)}${c2('Água quente', p.aguaQuente)}${c2('Vagas', p.vagas)}<td colspan="2"><span class="l">Divisão interna</span>${UI.esc(p.divisao || '')}</td></tr></table>
      <div class="sec">Custos – serviços componentes do projeto</div><table><tr><th>Item</th><th>Serviços</th><th class="n">Incidência</th><th class="n">Custos [R$]</th><th class="n">% Ac.</th><th class="n">Mínimo [%]</th><th class="n">Máximo [%]</th><th></th></tr>
        ${S().map((s, i) => `<tr><td>${i + 1}</td><td>${UI.esc(s[0])}</td><td class="n">${pct(k.inc[i], 2)}</td><td class="n">${money(k.custos[i])}</td><td class="n">${pct(k.acum[i], 2)}</td><td class="n">${pct(s[1], 2)}</td><td class="n">${pct(s[2], 2)}</td><td class="${k.fora[i] ? 'er' : 'ok'}">${k.total ? (k.fora[i] ? 'fora' : 'OK') : ''}</td></tr>`).join('')}
        <tr><th colspan="3">Custo total de serviços</th><th class="n">${money(k.total)}</th><th colspan="4"></th></tr><tr><td colspan="3">BDI</td><td class="n">${pct(+p.bdi || 0, 2)}</td><td colspan="4"></td></tr><tr><th colspan="3">Custo total com BDI</th><th class="n">${money(k.comBdi)}</th><th colspan="4"></th></tr></table>
      <div class="sec">Outros – serviços adicionais e resumo dos custos</div><table><tr><td style="width:55%;padding:0;border:0"><table><tr><th>Item</th><th>Serviços adicionais</th><th class="n">Custos [R$]</th></tr>${p.adicionais.map((x, i) => `<tr><td>${i + 1}</td><td>${UI.esc(x.desc || '')}</td><td class="n">${x.valor ? money(x.valor) : ''}</td></tr>`).join('')}<tr><th colspan="2">Totais</th><th class="n">${money(k.adic)}</th></tr></table></td>
        <td style="padding:0;border:0"><table><tr><th>Resumo dos custos</th><th class="n">Totais</th><th class="n">Unitário/m²</th></tr><tr><td>Valor do terreno</td><td class="n">${money(+p.valorTerreno || 0)}</td><td class="n">${money(k.unit(+p.valorTerreno || 0))}</td></tr><tr><td>Custo total de serviços</td><td class="n">${money(k.total)}</td><td class="n">${money(k.unit(k.total))}</td></tr><tr><td>Custo total de serviços c/ BDI</td><td class="n">${money(k.comBdi)}</td><td class="n">${money(k.unit(k.comBdi))}</td></tr><tr><td>Custo total de produção</td><td class="n">${money(k.producao)}</td><td class="n">${money(k.unit(k.producao))}</td></tr>
          <tr><td colspan="3"><span class="l">Justificativas para itens fora das referências</span>${UI.esc(p.justificativa || '')}</td></tr></table></td></tr></table>
      <div class="sec">Prazo de construção e cronograma físico-financeiro</div><table><tr>${c2('Prazo de execução', p.prazo + ' meses')}${c2('% pré-executado (etapa 0)', pct(+p.etapa0 || 0, 1))}${c2('Curva de referência', CURVAS[faixa(va)].nome)}</tr></table>
      <table><tr><th>Etapa</th><th class="n">% na etapa</th><th class="n">% acumulado</th><th class="n">Valor acumulado</th><th class="n">Curva de referência (normal)</th></tr><tr><td>Prévias (0)</td><td></td><td class="n">${pct(+p.etapa0 || 0, 1)}</td><td class="n">${money((+p.etapa0 || 0) / 100 * k.comBdi)}</td><td></td></tr>
        ${p.cronograma.map((v, i) => `<tr><td>${i + 1}</td><td class="n">${pct((+v || 0) - (i ? +p.cronograma[i - 1] || 0 : +p.etapa0 || 0), 1)}</td><td class="n">${pct(+v || 0, 1)}</td><td class="n">${money((+v || 0) / 100 * k.comBdi)}</td><td class="n">${curva(va, 'normal', i + 1)}%</td></tr>`).join('')}</table>
      ${p.preExistente ? `<table><tr>${c2('Obras pré-existentes', p.preExistente)}</tr></table>` : ''}${p.obs ? `<table><tr>${c2('Outras observações', p.obs)}</tr></table>` : ''}
      <div class="ass"><div>Cliente/Proponente<br>${UI.esc(((o.clienteIds || []).map(pessoa)[0] || {}).nome || '')}</div><div>Responsável técnico pela execução<br>${UI.esc(rtObra(o).nome || '')} ${UI.esc(rtObra(o).registro || '')}</div></div>
      <div class="rod">${UI.esc(o.cidade || '')}, ${UI.dateLong ? UI.dateLong(UI.today()) : UI.date(UI.today())}. Documento de preparação no formato da planilha PCI da CAIXA, gerado pelo VTN Hub. O envio oficial é feito na planilha da CAIXA.</div></div>`;
  }

  /* ---------- PLS (medição) ---------- */
  const mesesEntre = (a, b) => { if (!a || !b) return 0; const x = new Date(a + 'T12:00:00'), y = new Date(b + 'T12:00:00'); return (y.getFullYear() - x.getFullYear()) * 12 + (y.getMonth() - x.getMonth()) + (y.getDate() >= x.getDate() ? 0 : -1); };
  // etapa de referência: mês corrido desde o início da obra (etapa 1 = primeiro mês)
  const etapaRef = (o, data) => o.dataInicio ? Math.max(1, mesesEntre(o.dataInicio, data) + 1) : null;
  function situacao(o, p, med, ant90) {
    const va = +p.valorImovel || +o.valorImovel || 0; const e = etapaRef(o, med.data); const ac = +med.acumulado || 0;
    if (!e) return { etapa: null, texto: 'Informe o início da obra', cls: '' };
    const L = curva(va, 'lenta', e), N = curva(va, 'normal', e), R = curva(va, 'rapida', e); const prop = p.cronograma && p.cronograma.length ? (+p.cronograma[Math.min(e, p.cronograma.length) - 1] || 0) : null;
    let texto, cls;
    if (ant90 != null && ac - ant90 < 1 && ac < 100) { texto = 'Paralisada (menos de 1% em 90 dias)'; cls = 'err'; }
    else if (ac >= R) { texto = 'Adiantada'; cls = 'ok'; }
    else if (ac >= L) { texto = 'Normal'; cls = 'ok'; }
    else if (L - ac <= 7.5) { texto = 'Em atenção'; cls = 'warn'; }
    else if (L - ac <= 12) { texto = 'Em risco de paralisação'; cls = 'err'; }
    else { texto = 'Atrasada'; cls = 'err'; }
    return { etapa: e, L, N, R, prop, texto, cls, cron: prop == null ? '' : ac >= prop ? 'Em dia com o cronograma proposto' : `Abaixo do cronograma proposto (${UI.pct(prop, 1)})` };
  }
  function calcPLS(o, p, med) {
    const k = contas(o, p); const exec = med.exec || [];
    const naObra = S().map((s, i) => k.inc[i] * (Math.min(100, +exec[i] || 0)) / 100);
    return { k, naObra, acumulado: r2(naObra.reduce((a, v) => a + v, 0)) };
  }
  async function editarPLS(id, obraId) {
    const o = Store.get('obras', obraId || (Store.get('medicoes', id) || {}).obraId); if (!o) return;
    if (!o.pci) { UI.toast('Preencha o PCI da obra primeiro: as incidências dos serviços vêm dele.', 'err'); return editar(o.id); }
    const p = dados(o); const { esc, money, pct, icon } = UI; const ed = Auth.can('obras.editar');
    const meds = Store.where('medicoes', x => x.obraId === o.id).sort((a, b) => (a.data || '').localeCompare(b.data || ''));
    const novo = !id; const ultima = meds[meds.length - 1];
    const med = id ? JSON.parse(JSON.stringify(Store.get('medicoes', id))) : { obraId: o.id, data: UI.today(), numero: 'PLS ' + String(meds.length + 1).padStart(2, '0'), status: 'Prévia', exec: ultima && ultima.exec ? ultima.exec.slice() : S().map(() => 0), check: {} };
    if (!med.exec) med.exec = S().map(() => 0);
    const anterior = () => { const a = meds.filter(x => x.id !== med.id && (x.data || '') < med.data); return a.length ? +a[a.length - 1].acumulado || 0 : +p.etapa0 || 0; };
    const ant90 = () => { const lim = new Date(med.data + 'T12:00:00'); lim.setDate(lim.getDate() - 90); const l = lim.toISOString().slice(0, 10); const a = meds.filter(x => x.id !== med.id && (x.data || '') <= l); return a.length ? +a[a.length - 1].acumulado || 0 : null; };
    const PERG = [['cond', 'A execução da obra está observando as condições contratadas?'], ['placa', 'A placa/adesivo CAIXA está afixada na obra?'], ['alvara', 'O alvará está válido?'], ['projeto', 'Projeto e especificações estão sendo cumpridos?'], ['patologia', 'Os serviços estão sendo executados de modo a prevenir patologias?']];
    const m = UI.modal({ title: `PLS – Planilha de Levantamento de Serviços · ${esc(o.nome)}`, wide: true, body: `
      <div class="form">
        <div class="field"><label>Número</label><input class="input" name="numero" value="${esc(med.numero || '')}"></div>
        <div class="field"><label>Data do levantamento</label><input class="input" type="date" name="data" value="${esc(med.data || '')}"></div>
        <div class="field"><label>Início da obra (da obra)</label><div class="input">${o.dataInicio ? UI.date(o.dataInicio) : '<span class="muted">cadastre na obra</span>'}</div></div>
        <div class="field"><label>Status</label><select class="select" name="status">${['Prévia', 'Assinada', 'Enviada', 'Paga'].map(x => `<option ${x === med.status ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      </div>
      <div id="plsTab" class="mt"></div>
      <h3 class="mb mt2">Datas e qualidade</h3>
      <div class="table-wrap"><table class="t"><tbody>${PERG.map(([k, t]) => `<tr><td>${t}</td><td style="width:150px"><select class="select" data-ck="${k}">${['', 'Sim', 'Não'].map(x => `<option ${x === ((med.check || {})[k] || '') ? 'selected' : ''}>${x}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>
      <div class="form mt"><div class="field"><label>Emissão do alvará</label><input class="input" type="date" name="alvaraEmissao" value="${esc(med.alvaraEmissao || '')}"></div><div class="field"><label>Vigência do alvará</label><input class="input" type="date" name="alvaraVigencia" value="${esc(med.alvaraVigencia || o.alvaraVigencia || '')}"></div>
        <div class="field"><label>% aferido pela CAIXA (vistoria)</label><input class="input" type="number" step="any" name="aferido" value="${med.aferido ?? ''}"></div><div class="field"><label>Valor liberado (R$)</label><input class="input" type="number" step="any" name="valorLiberado" value="${med.valorLiberado ?? ''}" placeholder="calculado se vazio"></div>
        <div class="field full"><label>Observações</label><textarea class="input" name="obs" rows="2">${esc(med.obs || '')}</textarea></div></div>
      <div class="tiny muted mt">Relatório fotográfico: anexe as fotos da vistoria na aba Documentos da obra (pasta EXECUÇÃO). A CAIXA pede no mínimo 12 fotos.</div>`,
      footer: `${!novo && ed ? `<button class="btn danger" id="plsDel" style="margin-right:auto">${icon('trash-2')}</button>` : ''}<button class="btn" id="plsCopiar">${icon('clipboard-copy')} Copiar % para a planilha CAIXA</button><button class="btn" id="plsImprimir">${icon('printer')} Imprimir / PDF</button><button class="btn" data-close>Fechar</button>${ed ? `<button class="btn primary" id="plsSalvar">${icon('save')} Salvar</button>` : ''}` });
    const corpo = m.el.querySelector('.modal-b');
    const ler = () => {
      ['numero', 'data', 'status', 'alvaraEmissao', 'alvaraVigencia', 'obs'].forEach(n => { const i = corpo.querySelector(`[name="${n}"]`); if (i) med[n] = i.value; });
      ['aferido', 'valorLiberado'].forEach(n => { const i = corpo.querySelector(`[name="${n}"]`); med[n] = i.value === '' ? '' : +i.value; });
      corpo.querySelectorAll('[data-ex]').forEach(i => { med.exec[+i.dataset.ex] = Math.max(0, Math.min(100, +i.value || 0)); });
      med.check = med.check || {}; corpo.querySelectorAll('[data-ck]').forEach(i => { med.check[i.dataset.ck] = i.value; });
    };
    const desenhar = () => {
      const c = calcPLS(o, p, med); med.acumulado = c.acumulado; const an = anterior(); const st = situacao(o, p, med, ant90());
      const base = +o.valorFinanciado || c.k.comBdi; const parcela = Math.max(0, (c.acumulado - an) / 100 * base);
      UI.$('#plsTab', m.el).innerHTML = `<div class="grid g-2-1"><div class="table-wrap"><table class="t"><thead><tr><th>Serviços</th><th class="num">Incidência %</th><th class="num">Execução do item %</th><th class="num">Execução na obra %</th></tr></thead><tbody>
        ${S().map((s, i) => `<tr><td>${esc(s[0])}</td><td class="num muted">${pct(c.k.inc[i], 2)}</td><td class="num"><input class="input" type="number" step="any" min="0" max="100" data-ex="${i}" value="${med.exec[i] || 0}" style="width:80px;text-align:right" ${c.k.inc[i] ? '' : 'disabled'}></td><td class="num">${pct(c.naObra[i], 2)}</td></tr>`).join('')}
        </tbody><tfoot><tr><td>Mensurado acumulado atual</td><td class="num">${pct(c.k.inc.reduce((a, v) => a + v, 0), 2)}</td><td></td><td class="num"><b>${pct(c.acumulado, 2)}</b></td></tr>
          <tr><td>Mensurado acumulado na PLS anterior</td><td></td><td></td><td class="num">${pct(an, 2)}</td></tr><tr><td><b>% executado nessa etapa</b></td><td></td><td></td><td class="num"><b>${pct(c.acumulado - an, 2)}</b></td></tr></tfoot></table></div>
        <div>${c.acumulado < an - 1e-9 ? `<div class="alert err mb">${icon('alert-triangle')}<div>O acumulado desta PLS (${pct(c.acumulado, 2)}) está menor que o da PLS anterior (${pct(an, 2)}). Confira os % de execução.</div></div>` : ''}<div class="card kpi ${st.cls}"><div class="lbl">Situação da obra – curva de referência</div><div class="val" style="font-size:20px">${st.texto}</div><div class="sub">${st.etapa ? `Etapa de referência ${st.etapa} · lenta ${st.L}% · normal ${st.N}% · rápida ${st.R}%` : ''}</div></div>
          ${st.cron ? `<div class="card kpi mt ${st.cron.startsWith('Em dia') ? 'ok' : 'warn'}"><div class="lbl">Cronograma proposto (PCI)</div><div class="val" style="font-size:16px">${st.cron}</div></div>` : ''}
          <div class="card kpi mt"><div class="lbl">Parcela estimada desta PLS</div><div class="val">${money(parcela)}</div><div class="sub">${pct(c.acumulado - an, 2)} × ${money(base)} (${o.valorFinanciado ? 'valor financiado' : 'custo c/ BDI do PCI'})</div></div></div></div>`;
      UI.$$('[data-ex]', m.el).forEach(i => i.onchange = () => { ler(); desenhar(); });
      med._parcela = parcela;
    };
    corpo.querySelector('[name="data"]').addEventListener('change', () => { ler(); desenhar(); });
    desenhar();
    const salvar = () => {
      ler(); const st = situacao(o, p, med, ant90());
      const d = Object.assign({}, med, { situacao: st.texto, valorLiberado: med.valorLiberado === '' || med.valorLiberado == null ? r2(med._parcela) : med.valorLiberado }); delete d._parcela; delete d.id;
      if (novo) { const n = Store.insert('medicoes', d); med.id = n.id;
        if (d.valorLiberado > 0) Store.insert('lancamentos', { tipo: 'receita', categoria: 'Recebimento etapa com NF', descricao: 'Liberação ' + d.numero, valor: d.valorLiberado, data: d.data, vencimento: d.data, status: 'pendente', obraId: o.id, pessoaId: (o.clienteIds || [])[0], nf: true, forma: 'Financiamento CAIXA', arquivoIds: [], medicaoId: n.id });
      } else Store.update('medicoes', med.id, d);
      if (!o.fisicoPorMedicao) Store.update('obras', o.id, { fisicoPorMedicao: true });
      return d;
    };
    if (UI.$('#plsSalvar', m.el)) UI.$('#plsSalvar', m.el).onclick = () => { salvar(); UI.toast(novo ? 'PLS salva (e recebimento pendente criado)' : 'PLS salva'); m.close(); App.refresh(); };
    if (UI.$('#plsDel', m.el)) UI.$('#plsDel', m.el).onclick = async () => { if (await UI.confirm('Excluir esta PLS? O lançamento de recebimento ligado a ela continua no financeiro.', 'Excluir')) { Store.remove('medicoes', med.id); m.close(); App.refresh(); } };
    UI.$('#plsImprimir', m.el).onclick = async () => { ler(); if (ed) salvar();
      // relatório fotográfico: fotos da obra desde a PLS anterior (o usuário confere e descreve)
      const antes = meds.filter(x => x.id !== med.id && (x.data || '') < med.data); const desde = antes.length ? antes[antes.length - 1].data : o.dataInicio;
      const fotos = window.Ferramentas ? await Ferramentas.escolherFotos(o.id, desde) : []; if (fotos === null) return;
      if (fotos.length) UI.toast('Montando o relatório fotográfico…');
      const h = htmlPLS(o, p, med, anterior(), situacao(o, p, med, ant90()), PERG) + (fotos.length ? await Ferramentas.paginaFotos(fotos, med.numero) : '');
      UI.print(h, med.numero + ' ' + o.nome); if (ed && window.Drive) Drive.salvarDoc(o.id, { corpo: h, titulo: med.numero + ' ' + o.nome, categoria: 'PLS', avisar: false }); };
    UI.$('#plsCopiar', m.el).onclick = () => { ler(); navigator.clipboard.writeText(med.exec.map(v => String(v || 0).replace('.', ',')).join('\n')).then(() => UI.toast('Copiado: % de execução dos 20 serviços (cole na coluna "Execução do Item" da PLS).'), () => UI.toast('Não foi possível copiar', 'err')); };
  }
  function htmlPLS(o, p, med, an, st, PERG) {
    const { money, pct } = UI; const c = calcPLS(o, p, med);
    return `${CSS}<div class="cx">${cab('Planilha de Levantamento de Serviços – PLS', 'Construção em terreno próprio / aquisição de terreno e construção – formato CAIXA')}
      ${identificacao(o, p)}
      <div class="sec">Planilha de levantamento de serviços – ${UI.esc(med.numero || '')}</div>
      <table><tr><td style="width:58%;padding:0;border:0"><table><tr><th>Serviços</th><th class="n">Incidência %</th><th class="n">Execução do item %</th><th class="n">Execução na obra %</th></tr>
        ${S().map((s, i) => `<tr><td>${UI.esc(s[0])}</td><td class="n">${pct(c.k.inc[i], 2)}</td><td class="n">${pct(+med.exec[i] || 0, 2)}</td><td class="n">${pct(c.naObra[i], 2)}</td></tr>`).join('')}
        <tr><th>Mensurado acumulado atual</th><th class="n">${pct(c.k.inc.reduce((a, v) => a + v, 0), 2)}</th><th></th><th class="n">${pct(c.acumulado, 2)}</th></tr><tr><td colspan="3">Mensurado acumulado no mês anterior</td><td class="n">${pct(an, 2)}</td></tr><tr><th colspan="3">% executado nessa etapa</th><th class="n">${pct(c.acumulado - an, 2)}</th></tr>
        <tr><td colspan="3">Etapa de referência</td><td class="n">${st.etapa || '—'}</td></tr><tr><td colspan="3">Situação da obra – curva de referência</td><td class="n">${UI.esc(st.texto)}</td></tr><tr><td colspan="3">Situação da obra – cronograma proposto</td><td class="n">${UI.esc(st.cron || '')}</td></tr></table></td>
      <td style="padding:0;border:0"><table><tr><th colspan="2">Datas e qualidade</th></tr><tr>${c2('Valor do imóvel', money(+p.valorImovel || 0))}${c2('Contratação', o.dataContrato ? UI.date(o.dataContrato) : '')}</tr><tr>${c2('Início da obra', o.dataInicio ? UI.date(o.dataInicio) : '')}${c2('Término previsto', o.dataPrevTermino ? UI.date(o.dataPrevTermino) : '')}</tr>
        <tr>${c2('Data do levantamento', UI.date(med.data))}${c2('Nº de etapas', p.prazo)}</tr>${PERG.map(([k, t]) => `<tr><td>${t}</td><td>${UI.esc((med.check || {})[k] || '')}</td></tr>`).join('')}
        <tr>${c2('Emissão do alvará', med.alvaraEmissao ? UI.date(med.alvaraEmissao) : '')}${c2('Vigência do alvará', med.alvaraVigencia ? UI.date(med.alvaraVigencia) : '')}</tr>
        <tr><th colspan="2">Curva de evolução</th></tr><tr><td>Curva lenta / normal / rápida na etapa</td><td class="n">${st.etapa ? `${st.L}% / ${st.N}% / ${st.R}%` : '—'}</td></tr><tr><td>Acumulado aferido (CAIXA)</td><td class="n">${med.aferido !== '' && med.aferido != null ? pct(+med.aferido, 2) : ''}</td></tr><tr><td>Valor liberado</td><td class="n">${med.valorLiberado ? money(+med.valorLiberado) : ''}</td></tr>
        <tr><td colspan="2"><span class="l">Observações</span>${UI.esc(med.obs || '')}</td></tr></table></td></tr></table>
      <div class="ass"><div>Cliente/Proponente<br>${UI.esc(((o.clienteIds || []).map(pessoa)[0] || {}).nome || '')}</div><div>Responsável técnico pela execução da obra<br>${UI.esc(rtObra(o).nome || '')} ${UI.esc(rtObra(o).registro || '')}</div></div>
      <div class="rod">${UI.esc(o.cidade || '')}, ${UI.date(med.data)}. Documento de preparação no formato da PLS da CAIXA, gerado pelo VTN Hub. Relatório fotográfico na página seguinte.</div></div>`;
  }
  return { editar, editarPLS, contas, dados, situacao, etapaRef, CURVAS, faixa, curva, cronogramaPadrao };
})();

/* página: todas as obras com PCI / PLS */
Views.caixa = {
  perm: 'obras.ver',
  render(el) {
    const { esc, money, pct, icon } = UI; const ed = Auth.can('obras.editar');
    const obras = Store.all('obras').filter(o => o.pci || o.valorFinanciado || /caixa/i.test((o.modalidade || '') + ' ' + (o.tipo || '')))
      .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
    const linha = o => { const p = PCI.dados(o); const k = PCI.contas(o, p); const meds = Store.where('medicoes', x => x.obraId === o.id).sort((a, b) => (a.data || '').localeCompare(b.data || '')); const u = meds[meds.length - 1];
      return { o, k, u, fora: k.fora.filter(Boolean).length, tem: !!o.pci }; };
    const L = obras.map(linha);
    el.innerHTML = `<div class="page-head"><div><h1>PCI e PLS CAIXA</h1><p>Proposta de Construção Individual e Planilha de Levantamento de Serviços no formato das planilhas da CAIXA</p></div></div>
      <div class="alert info mb">${icon('info')}<div>Abra o <b>PCI</b> da obra para lançar custos por serviço (com as incidências mínima e máxima da CAIXA), BDI, serviços adicionais e o cronograma com as curvas de referência. Cada <b>PLS</b> registra o % executado de cada serviço, calcula o acumulado, a etapa de referência e a situação da obra. Para aparecer aqui, a obra precisa ter valor financiado, modalidade CAIXA ou um PCI começado. ${ed ? 'Para começar em outra obra, use o botão abaixo.' : ''}</div></div>
      ${ed ? `<div class="toolbar"><select class="select" id="cxObra"><option value="">Começar PCI em outra obra…</option>${Store.all('obras').filter(o => !obras.includes(o)).map(o => `<option value="${o.id}">${o.id} · ${esc(o.nome)}</option>`).join('')}</select></div>` : ''}
      <div class="card">${UI.table([{ h: 'Obra', f: x => `${UI.idLink(x.o.id)} ${esc(x.o.nome)}` }, { h: 'PCI', f: x => x.tem ? UI.badge(x.fora ? x.fora + ' incid. fora' : 'Incidências OK', x.fora ? 'err' : 'ok') : '<span class="muted tiny">não começado</span>' },
        { h: 'Custo c/ BDI', num: 1, f: x => x.k.total ? money(x.k.comBdi) : '—' }, { h: 'Prazo', f: x => x.o.pci ? (x.o.pci.prazo || '—') + ' meses' : '—' },
        { h: 'Última PLS', f: x => x.u ? `${esc(x.u.numero)} · ${UI.date(x.u.data)}` : '—' }, { h: 'Acumulado', f: x => x.u ? UI.progress(+x.u.acumulado || 0) : '—' }, { h: 'Situação', f: x => x.u && x.u.situacao ? UI.badge(x.u.situacao, /Normal|Adiantada/.test(x.u.situacao) ? 'ok' : /atenção/.test(x.u.situacao) ? 'warn' : 'err') : '—' },
        { h: '', f: x => `<div class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn sm" data-pci="${x.o.id}">${icon('file-spreadsheet')} PCI</button>${ed ? `<button class="btn sm primary" data-pls="${x.o.id}">${icon('plus')} PLS</button>` : ''}</div>` }], L, { emptyMsg: 'Nenhuma obra CAIXA ainda.' })}</div>`;
    UI.$$('[data-pci]', el).forEach(b => b.onclick = e => { e.stopPropagation(); PCI.editar(b.dataset.pci); });
    UI.$$('[data-pls]', el).forEach(b => b.onclick = e => { e.stopPropagation(); PCI.editarPLS(null, b.dataset.pls); });
    const so = UI.$('#cxObra', el); if (so) so.onchange = () => so.value && PCI.editar(so.value);
  }
};
