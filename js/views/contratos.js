/* =========================================================
   CONTRATOS, PROPOSTAS, TERMOS E RECIBOS
   Modelos da VTN (extraídos dos documentos reais) + modelos do app.
   Geração automática com dados da obra, cliente, orçamento e empresa,
   papel timbrado, edição livre, impressão/PDF e Word.
   ========================================================= */
Views.contratos = {
  perm: 'contratos',
  st: { tab: 'lista', cat: '', q: '' },
  CATS: { Contrato: ['file-signature', '#18c20e'], Proposta: ['send', '#2563eb'], Termo: ['clipboard-check', '#7c3aed'], Recibo: ['receipt', '#16a34a'], Declaração: ['stamp', '#0891b2'] },
  VARS: ['DATA', 'DATA_EXTENSO', 'ANO', 'CIDADE_ASSINATURA', 'FORO', 'TITULO', 'NUMERO', 'PROPOSTA_REF', 'CLIENTES_QUALIFICACAO', 'CLIENTES_NOMES', 'CLIENTE_SAUDACAO', 'EMPRESA_NOME', 'EMPRESA_CNPJ', 'EMPRESA_SEDE', 'EMPRESA_ESCRITORIO', 'EMPRESA_CONTATO', 'REPRESENTANTE_QUALIFICACAO', 'SOCIOS_QUALIFICACAO',
    'OBJETO', 'OBRA_NOME', 'OBRA_ENDERECO', 'OBRA_CIDADE', 'OBRA_AREA', 'TERRENO_AREA', 'OBRA_CNO', 'LISTA_ESCOPO', 'LISTA_ESCOPO_VALORES', 'LISTA_INCLUSO', 'LISTA_NAO_INCLUSO', 'TABELA_ITENS', 'TABELA_ETAPAS', 'TABELA_ACABAMENTOS', 'TABELA_CNO',
    'VALOR', 'VALOR_EXTENSO', 'VALOR_50', 'VALOR_PIX', 'DESCONTO_PIX', 'VALOR_CARTAO', 'PARCELAS_CARTAO', 'CONDICOES_PAGAMENTO', 'PRAZO_DIAS', 'PRAZO_DIAS_EXTENSO', 'PRAZO_MESES', 'PRAZO_MESES_EXTENSO', 'DATA_INICIO', 'DATA_TERMINO', 'VALIDADE_DIAS',
    'RT_NOME', 'RT_REGISTRO', 'LINDEIROS', 'ASSINATURAS', 'ASSINATURA_RT', 'ASSINATURAS_RT', 'ASSINATURAS_PROJETO', 'ASSINATURAS_OBRA', 'ASSINATURAS_LINDEIROS'],

  modelos() { window.VTN_MODELOS && VTN_MODELOS.sync(); return Store.all('modelosContrato'); },
  modelo(id) { return this.modelos().find(m => m.id === id) || this.modelos()[0]; },

  render(el, tab) {
    const { icon, esc, money, date } = UI; const s = this.st; if (tab) s.tab = tab;
    const M = this.modelos();
    const l = Store.all('contratos').slice().sort((a, b) => (b.data || '').localeCompare(a.data || '') || b.id.localeCompare(a.id));
    const catDe = x => (M.find(m => m.id === x.modelo) || {}).categoria || 'Contrato';
    const tot = st => l.filter(x => catDe(x) === 'Contrato' && (!st || x.status === st)).reduce((a, x) => a + (+x.valor || 0), 0);
    el.innerHTML = `
      <div class="hero hero-doc"><div><div class="hero-kicker">${icon('file-signature')} Documentos da VTN</div><h1>Contratos, propostas e termos</h1>
        <p>Modelos oficiais da VTN (os mais recentes de cada tipo) e modelos do app – preenchidos com os dados da obra, do cliente e do orçamento, em papel timbrado.</p></div>
        <div class="hero-side"><div><span>Documentos</span><b>${l.length}</b><small>${l.filter(x => x.status === 'Assinado').length} assinados</small></div>
          <div><span>Contratos assinados</span><b>${UI.moneyK(tot('Assinado'))}</b><small>em aberto ${UI.moneyK(tot('Enviado') + tot('Rascunho'))}</small></div>
          <div><span>Modelos</span><b>${M.length}</b><small>${M.filter(m => m.vtn).length} da VTN</small></div></div></div>
      <div class="pill-tabs"><button class="${s.tab === 'lista' ? 'active' : ''}" data-t="lista">${icon('list')} Documentos (${l.length})</button><button class="${s.tab === 'mod' ? 'active' : ''}" data-t="mod">${icon('layout-template')} Visualizar modelos (${M.length})</button><button class="${s.tab === 'vars' ? 'active' : ''}" data-t="vars">${icon('braces')} Variáveis</button>
        <button class="btn sm primary" style="margin-left:auto" onclick="Views.contratos.novo()">${icon('plus')} Gerar documento</button></div>
      <div id="cc"></div>`;
    UI.$$('[data-t]', el).forEach(b => b.onclick = () => { s.tab = b.dataset.t; App.refresh(); });
    const c = UI.$('#cc', el);
    if (s.tab === 'lista') {
      c.innerHTML = `<div class="card">${UI.table([{ h: 'ID', f: x => UI.idLink(x.id) }, { h: 'Tipo', f: x => { const k = catDe(x); return `<span class="badge" style="color:${(this.CATS[k] || [])[1]}">${esc(k)}</span>`; } },
        { h: 'Título', f: x => `<span class="plink" data-goto="${x.id}">${esc(x.titulo)}</span>${x.numero ? ` <span class="tiny muted">nº ${esc(x.numero)}</span>` : ''}` },
        { h: 'Modelo', f: x => { const m = M.find(m => m.id === x.modelo) || {}; return `${esc(m.nome || x.modelo)}${m.vtn ? ' <span class="badge brand">VTN</span>' : ''}`; } }, { h: 'Obra', f: x => x.obraId ? UI.idLink(x.obraId) : '—' },
        { h: 'Contratante', f: x => (x.clienteIds || []).map(UI.pessoa).join(', ') || '—' }, { h: 'Data', f: x => date(x.data) }, { h: 'Valor', num: 1, f: x => money(x.valor) }, { h: 'Status', f: x => UI.badge(x.status, { Assinado: 'ok', Enviado: 'info', Cancelado: 'err' }[x.status] || '') }], l, { emptyMsg: 'Nenhum documento ainda. Use "Gerar documento".' })}</div>`;
    } else if (s.tab === 'mod') this.galeria(c);
    else c.innerHTML = `<div class="card"><div class="card-h"><h3>Variáveis que os modelos aceitam</h3></div><div class="card-b"><p class="tiny muted">Escreva {{NOME}} no texto do modelo e o app troca pelo dado real ao gerar o documento.</p><div class="row">${this.VARS.map(v => `<code class="badge mono">{{${v}}}</code>`).join('')}</div></div></div>`;
  },

  galeria(c) {
    const { icon, esc } = UI; const s = this.st; const M = this.modelos();
    const L = M.filter(m => (!s.cat || m.categoria === s.cat) && (!s.q || (m.nome + m.origem).toLowerCase().includes(s.q.toLowerCase())));
    const cats = Object.keys(this.CATS).filter(k => M.some(m => m.categoria === k));
    c.innerHTML = `<div class="filterbar card"><div class="card-b"><div class="toolbar" style="margin:0"><div class="tfind-w" style="flex:1">${icon('search')}<input class="input" id="mq" placeholder="Buscar modelo…" value="${esc(s.q)}"></div>
        <button class="btn" id="madd">${icon('plus')} Novo modelo</button></div>
        <div class="row mt" style="gap:6px"><button class="chip ${!s.cat ? 'on' : ''}" data-c="">Todos <b>${M.length}</b></button>${cats.map(k => `<button class="chip ${s.cat === k ? 'on' : ''}" data-c="${k}">${k} <b>${M.filter(m => m.categoria === k).length}</b></button>`).join('')}</div></div></div>
      ${cats.filter(k => L.some(m => m.categoria === k)).map(k => `<div class="rel-sec"><div class="rel-sec-h"><div class="rel-ico" style="--c:${this.CATS[k][1]}">${icon(this.CATS[k][0])}</div><div><h2>${k}s</h2><p class="muted tiny">${L.filter(m => m.categoria === k).length} modelos</p></div></div>
        <div class="grid g3">${L.filter(m => m.categoria === k).sort((a, b) => (b.vtn ? 1 : 0) - (a.vtn ? 1 : 0)).map(m => `<div class="card mod-card" style="--c:${this.CATS[k][1]}"><div class="mod-thumb" data-pv="${m.id}"><div class="mod-paper">${this.miniatura(m)}</div></div><div class="card-b">
          <div class="row" style="gap:6px">${m.vtn ? '<span class="badge brand">Modelo VTN</span>' : '<span class="badge">Modelo do app</span>'}${m.editado ? '<span class="badge warn">editado</span>' : ''}</div>
          <h3 style="margin:8px 0 4px">${esc(m.nome)}</h3><p class="tiny muted" style="margin:0">${icon('file')} ${esc(m.origem || '')}</p>
          <div class="row mt"><button class="btn sm" data-pv="${m.id}">${icon('eye')} Visualizar</button><button class="btn sm primary" data-use="${m.id}">${icon('wand-2')} Usar</button><button class="btn sm ghost" data-me="${m.id}">${icon('pencil')}</button></div></div></div>`).join('')}</div></div>`).join('') || UI.empty('Nenhum modelo encontrado.', 'file')}`;
    UI.$('#mq', c).onchange = e => { s.q = e.target.value; App.refresh(); };
    UI.$$('[data-c]', c).forEach(b => b.onclick = () => { s.cat = b.dataset.c; App.refresh(); });
    UI.$$('[data-pv]', c).forEach(b => b.onclick = () => this.visualizar(b.dataset.pv));
    UI.$$('[data-use]', c).forEach(b => b.onclick = () => this.novo({ modelo: b.dataset.use }));
    UI.$$('[data-me]', c).forEach(b => b.onclick = () => this.editModelo(b.dataset.me));
    UI.$('#madd', c).onclick = () => { const id = 'mod' + Date.now(); Store.db.modelosContrato.push({ id, nome: 'Novo modelo', categoria: 'Contrato', origem: 'Modelo criado no app', corpo: '<h1>CONTRATO</h1>\n<p>{{CLIENTES_QUALIFICACAO}}</p>\n{{ASSINATURAS}}' }); Store.save(); this.editModelo(id); };
  },
  miniatura(m) {
    const t = m.corpo.replace(/\{\{[A-Z_]+\}\}/g, '▬▬▬').replace(/<h1>([\s\S]*?)<\/h1>/, '<b class="mt-h">$1</b>').replace(/<h2>([\s\S]*?)<\/h2>/g, '<i class="mt-s">$1</i>').replace(/<(?!\/?(b|i)\b)[^>]+>/g, ' ');
    return `<div class="mt-lh">${window.VTN_LOGO ? `<img src="${VTN_LOGO}" style="height:16px">` : '<span>VTN</span>'}</div>${t.slice(0, 900)}`;
  },
  exemplo(modelo) {
    const ob = Store.all('obras').find(o => (o.clienteIds || []).length && +o.valorContrato && o.endereco) || Store.all('obras')[0] || {};
    const orc = Store.all('orcamentos').find(o => (o.itens || []).length);
    return Object.assign({ id: 'EXEMPLO', modelo, titulo: ob.nome || 'Exemplo', obraId: ob.id, clienteIds: ob.clienteIds || [], valor: orc ? Calc.orcTotal(orc).total : ob.valorContrato || 0, data: UI.today(), orcamentoId: orc && orc.id, prazoMeses: 12, prazoDias: 40, cidade: ob.cidade || 'Itabirito', inicio: UI.today() }, this.defaults(modelo, ob, orc));
  },
  visualizar(id) {
    const m = this.modelo(id); const ct = this.exemplo(id);
    const md = UI.modal({ title: m.nome, wide: true, body: `<div class="alert info mb">${UI.icon('info')}<div>Pré-visualização com dados de exemplo (${UI.esc(ct.titulo)}). <b>Origem:</b> ${UI.esc(m.origem || '')}</div></div><div class="doc-stage"><div class="vdoc">${this.papel(m, ct)}${this.gerar(ct)}${this.rodape()}</div></div>`,
      footer: `<button class="btn" data-close>Fechar</button><button class="btn" data-pr>${UI.icon('printer')} Imprimir exemplo</button><button class="btn primary" data-use>${UI.icon('wand-2')} Usar este modelo</button>` });
    md.$('[data-use]').onclick = () => { md.close(); this.novo({ modelo: id }); };
    md.$('[data-pr]').onclick = () => UI.print(md.$('.vdoc').outerHTML, m.nome);
  },
  editModelo(id) {
    const m = Store.db.modelosContrato.find(x => x.id === id);
    const md = UI.modal({ title: 'Modelo: ' + m.nome, wide: true, body: `<div class="form"><div class="field"><label>Nome</label><input class="input" id="mn" value="${UI.esc(m.nome)}"></div><div class="field"><label>Tipo</label><select class="select" id="mcat">${Object.keys(this.CATS).map(k => `<option ${k === m.categoria ? 'selected' : ''}>${k}</option>`).join('')}</select></div></div>
      <div class="field mt"><label>Texto (HTML simples: &lt;h1&gt;, &lt;h2&gt;, &lt;p class="cl"&gt; para cláusula, &lt;ol class="rom"&gt; para incisos) – use {{VARIÁVEIS}}</label><textarea class="input mono" id="mc" rows="22">${UI.esc(m.corpo)}</textarea></div>`,
      footer: `<button class="btn danger" data-d style="margin-right:auto">Excluir</button><button class="btn" data-pv>${UI.icon('eye')} Pré-visualizar</button><button class="btn" data-close>Cancelar</button><button class="btn primary" data-s>Salvar</button>` });
    md.$('[data-s]').onclick = () => { Object.assign(m, { nome: md.$('#mn').value, categoria: md.$('#mcat').value, corpo: md.$('#mc').value, editado: !!m.vtn }); Store.save(); md.close(); App.refresh(); };
    md.$('[data-pv]').onclick = () => { m.corpo = md.$('#mc').value; this.visualizar(id); };
    md.$('[data-d]').onclick = async () => { if (await UI.confirm('Excluir este modelo?')) { Store.db.modelosContrato = Store.db.modelosContrato.filter(x => x.id !== id); Store.save(); md.close(); App.refresh(); } };
  },

  /* nº da proposta: o maior nº já usado por uma proposta que existe + 1.
     Proposta excluída ou nunca usada não "gasta" número: o próximo reaproveita.
     Sem nenhuma proposta no app, continua da numeração antiga (seq.PROP). */
  categoriaDe(x) { return x.categoria || (this.modelos().find(m => m.id === x.modelo) || {}).categoria || ''; },
  proximoNumero(ignorarId) {
    const nums = Store.all('contratos').filter(x => x.id !== ignorarId && this.categoriaDe(x) === 'Proposta')
      .map(x => parseInt(String(x.numero || ''), 10)).filter(n => n > 0);
    const n = (nums.length ? Math.max(...nums) : (Store.db.seq.PROP || 179)) + 1;
    return n + '/' + UI.today().slice(0, 4);
  },
  defaults(modelo, o, orc) {
    const m = this.modelo(modelo) || {}; const tipo = (o && o.tipo) || '';
    const ni = { vtn_contrato_projetos: 'Taxas da Prefeitura\nProtocolos e taxas cartoriais\nExecução da obra e quaisquer outros serviços não discriminados no escopo', vtn_empreitada_global: 'Terraplanagem do lote\nPadrão + instalação de energia, hidrômetro + instalação de água\nMuro de fachada, laterais, fundos e arrimos\nCalçada da rua, calçada no entorno da casa e rampa da garagem\nBox e chuveiros dos banheiros\nSistema de aquecimento solar (incluso somente tubulação embutida)\nReboco interno (incluso revestimento em gesso liso)\nPaisagismo', vtn_proposta_2026: 'Taxas e alvarás da Prefeitura\nTaxas cartoriais', vtn_carta_proposta_obra: 'Pintura geral\nForro ou reboco de teto\nTelhado\nTaxas da Prefeitura\nMateriais e insumos' }[modelo] || '';
    const obj = { vtn_contrato_projetos: 'elaboração dos projetos complementares', vtn_empreitada_global: 'a elaboração dos projetos topográfico, arquitetônico, estrutural, elétrico e hidrossanitário, a PCI e as PLS CAIXA, ART de projeto e execução', vtn_prestacao_servico: (o && o.nome ? 'o serviço "' + o.nome + '"' : 'elaboração de projeto'), vtn_acompanhamento_reforma: 'obras de reforma', vtn_proposta_2026: tipo === 'Projeto' ? 'a elaboração dos projetos da sua residência' : 'serviço especializado em engenharia', vtn_termo_acesso: 'instrução de processo de usucapião' }[modelo] || '';
    const inc = orc ? itensAZ(orc.itens).map(i => i.desc).join('\n') + '\nNota fiscal dos serviços prestados' : '';
    return { naoIncluso: ni, objeto: obj, incluso: inc, numero: m.categoria === 'Proposta' || m.categoria === 'Recibo' ? (m.categoria === 'Recibo' ? 'VTN' + String((Store.db.seq.REC || 471) + 1).padStart(5, '0') : this.proximoNumero()) : '', validadeDias: 15, descontoPix: 10, parcelas: m.id === 'vtn_contrato_projetos' ? 6 : 3 };
  },

  async novo(preset = {}) {
    const M = this.modelos();
    // proposta de um orçamento que já tem proposta: usa a mesma (mesmo nº), não gasta número novo
    if (preset.orcamentoId && (M.find(m => m.id === preset.modelo) || {}).categoria === 'Proposta') {
      const ja = Store.all('contratos').filter(x => x.orcamentoId === preset.orcamentoId && this.categoriaDe(x) === 'Proposta').sort((a, b) => String(b.criadoEm || '').localeCompare(String(a.criadoEm || '')))[0];
      if (ja) {
        if (await UI.confirm(`Este orçamento já tem a proposta nº ${UI.esc(ja.numero || ja.id)}. Atualizar essa mesma proposta com os valores e itens atuais do orçamento (mantém o número)?<br><span class="tiny muted">Cancelar = abrir a proposta como está.</span>`, 'Atualizar')) {
          Store.update('contratos', ja.id, { valor: preset.valor, condicoes: preset.condicoes || ja.condicoes, titulo: preset.titulo || ja.titulo, naoIncluso: preset.naoIncluso || ja.naoIncluso, modelo: preset.modelo, corpo: '' });
        }
        return this.editor(ja.id);
      }
    }
    const o = Store.get('obras', preset.obraId);
    const orc = Store.get('orcamentos', preset.orcamentoId);
    const modelo = preset.modelo || (o && o.modalidade === 'Elaboração de projetos' ? 'vtn_contrato_projetos' : o && o.modalidade === 'Empreitada global' ? 'vtn_empreitada_global' : 'vtn_contrato_projetos');
    const v = Object.assign({ modelo, data: UI.today(), status: 'Rascunho', valor: orc ? Calc.orcTotal(orc).total : o ? o.valorContrato : 0, clienteIds: o ? (o.clienteIds || []).slice() : orc ? clientesDe(orc).slice() : [], prazoMeses: 12, prazoDias: 40, titulo: o ? o.nome : orc ? orc.titulo : '', cidade: (o && o.cidade) || 'Itabirito', inicio: UI.today() },
      this.defaults(modelo, o, orc), preset);
    const opts = () => Object.keys(this.CATS).flatMap(k => M.filter(m => m.categoria === k).map(m => [m.id, `${k} · ${m.nome}${m.vtn ? ' (VTN)' : ''}`]));
    // a obra dita o título e os clientes do documento
    setTimeout(() => {
      const md = [...document.querySelectorAll('.modal')].pop(); if (!md) return;
      const so = md.querySelector('[name="obraId"]'); if (!so) return;
      so.addEventListener('change', () => {
        const ob = Store.get('obras', so.value); if (!ob) return;
        const ti = md.querySelector('[name="titulo"]'); if (ti) ti.value = ob.nome;
        this.trocarClientes(md, ob.id);
        const ci = md.querySelector('[name="cidade"]'); if (ci && ob.cidade) ci.value = ob.cidade;
        UI.toast('Título e cliente(s) preenchidos pela obra');
      });
    }, 60);
    const d = await UI.formModal({ title: 'Gerar documento', wide: true, okLabel: 'Gerar documento', values: v, list: [
      { k: 'modelo', l: 'Modelo', t: 'select', o: opts, req: 1, blank: false, full: 1 },
      { k: 'titulo', l: 'Título / assunto', req: 1 }, { k: 'numero', l: 'Nº da proposta / recibo', ph: 'ex.: 180/2026' },
      { k: 'obraId', l: 'Obra', t: 'select', o: () => Store.all('obras').map(x => [x.id, x.id + ' · ' + x.nome]) }, { k: 'orcamentoId', l: 'Orçamento (itens e valores)', t: 'select', o: () => Store.all('orcamentos').map(x => [x.id, x.id + ' · ' + x.titulo]) },
      { k: 'clienteIds', l: 'Contratante(s) / cliente(s) — vêm da obra · Ctrl+clique para mais de um', t: 'multi', o: () => this.clientesOpc(v.obraId, v.clienteIds), full: 1 },
      { k: 'valor', l: 'Valor (R$)', t: 'money' }, { k: 'data', l: 'Data do documento', t: 'date' }, { k: 'cidade', l: 'Cidade da assinatura' }, { k: 'inicio', l: 'Início dos serviços', t: 'date' },
      { k: 'prazoDias', l: 'Prazo (dias)', t: 'number' }, { k: 'prazoMeses', l: 'Prazo (meses) – obras', t: 'number' }, { k: 'descontoPix', l: 'Desconto à vista no PIX (%)', t: 'number' }, { k: 'parcelas', l: 'Parcelas no cartão', t: 'number' },
      { k: 'objeto', l: 'Objeto (complementa o texto do modelo)', t: 'textarea', rows: 2, full: 1 },
      { k: 'escopo', l: 'Escopo – um item por linha (use "Item – R$ 1.000,00"). Vazio = itens do orçamento', t: 'textarea', rows: 4, full: 1 },
      { k: 'naoIncluso', l: 'Não incluso – um por linha', t: 'textarea', rows: 3, full: 1 }, { k: 'incluso', l: 'Incluso (propostas) – um por linha', t: 'textarea', rows: 2, full: 1 },
      { k: 'condicoes', l: 'Condições de pagamento', t: 'textarea', rows: 2, full: 1 }, { k: 'propostaRef', l: 'Proposta de referência (contratos)', ph: 'ex.: Proposta nº 177/2026, de 20/10/2026', full: 1 },
      { k: 'lindeiros', l: 'Lindeiros (termo de acesso) – "Nome – endereço" por linha', t: 'textarea', rows: 2, full: 1 }] });
    if (!d) return;
    const m = this.modelo(d.modelo);
    if (m.categoria === 'Recibo' && d.numero) { const n = parseInt(String(d.numero).replace(/\D/g, ''), 10); if (n) Store.db.seq.REC = Math.max(Store.db.seq.REC || 0, n); }
    const c = Store.insert('contratos', Object.assign({}, preset, d, { status: 'Rascunho', corpo: '' }));
    this.editor(c.id);
  },

  /* Papel timbrado e rodapé */
  papel(m, ct) {
    const e = Store.db.empresa, { esc } = UI; const cat = (m && m.categoria) || 'Contrato';
    const tag = cat === 'Orçamento' ? 'ORÇAMENTO Nº ' + (ct.numero || '') : cat === 'Proposta' ? 'PROPOSTA' + (ct.numero ? ' Nº ' + ct.numero : '') : cat === 'Recibo' ? 'RECIBO' + (ct.numero ? ' Nº ' + ct.numero : '') : cat.toUpperCase() + (ct.id && ct.id !== 'EXEMPLO' ? ' · ' + ct.id : '');
    return `<div class="lh">${window.VTN_LOGO ? `<img class="lh-logo" src="${VTN_LOGO}" alt="VTN Engenharia e Construções">` : '<div class="lh-logo">VTN</div>'}<div class="lh-side"><div class="lh-tag">${esc(tag)}</div><em>${esc(e.slogan || 'Seu projeto, nossa missão!')}</em></div></div>`;
  },
  rodape() { const e = Store.db.empresa, { esc } = UI; return `<div class="lh-foot"><span>${esc(e.email || 'contato@vtnengenharia.com.br')}</span><span>${esc(e.telefone || '(31) 9 9539-1592')}</span><span>${esc(e.site || 'vtnengenharia.com.br')}</span><span>CNPJ ${esc(e.cnpj)}</span></div>`; },

  /* Substitui as variáveis do modelo pelos dados reais */
  gerar(ct) {
    const { esc, money, date } = UI;
    const e = Store.db.empresa; const o = Store.get('obras', ct.obraId) || {};
    const socios = e.socios || (window.VTN_MODELOS ? VTN_MODELOS.SOCIOS : []);
    const ism = socios.find(s => s.rt) || socios[0] || {};
    const cls = (ct.clienteIds || []).map(id => Store.get('pessoas', id)).filter(Boolean);
    const fem = p => /a$/i.test((p.nome || '').split(' ')[0]) && !/^(luca|josua|joshua)$/i.test((p.nome || '').split(' ')[0]);
    const q = p => [`<b>${esc(p.nome)}</b>`, p.nacionalidade || (fem(p) ? 'brasileira' : 'brasileiro'), p.estadoCivil, p.profissao, p.rg ? 'Carteira de Identidade ' + p.rg : '', `${fem(p) ? 'portadora' : 'portador'} do CPF/CNPJ nº ${p.cpf || '________________'}`, p.endereco ? (fem(p) ? 'residente e domiciliada em ' : 'residente e domiciliado em ') + p.endereco : ''].filter(Boolean).map(String).join(', ');
    const rt = Store.get('pessoas', o.rtId) || {};
    const orc = Store.get('orcamentos', ct.orcamentoId);
    const ets = Store.where('etapas', x => x.obraId === o.id).sort((a, b) => a.ordem - b.ordem);
    const tot = ets.reduce((a, x) => a + (+x.valor || 0), 0);
    const linhas = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
    const escopoL = linhas(ct.escopo).length ? linhas(ct.escopo).map(t => { const m = t.match(/^(.*?)\s*[–-]\s*(R\$\s*[\d.,]+)\s*$/); return m ? [m[1], m[2]] : [t, '']; })
      : orc ? itensAZ(orc.itens).map(i => [i.desc + (i.un && !/verba|vb|un$/i.test(i.un) && i.qtd ? ` (${UI.num(i.qtd)} ${i.un})` : ''), money((+i.qtd || 0) * (+i.unit || 0) * (1 + ((+orc.bdi || 0) + (+orc.imposto || 0)) / 100))])
      : ets.map(x => [x.nome, x.valor ? money(x.valor) : '']);
    const rom = arr => arr.length ? `<ol class="rom">${arr.map(x => `<li>${x};</li>`).join('')}</ol>` : '<p>________________</p>';
    const valor = +ct.valor || 0, pix = +ct.descontoPix || 0;
    const ext = n => UI.extenso(n).replace(/\s*reais?$/i, '').replace(/^um real$/, 'um');
    const assin = (nome, sub) => `<div class="sig-l"><i></i><b>${esc(nome)}</b><span>${sub}</span></div>`;
    const cliSig = cls.length ? cls.map(p => assin(p.nome, 'CPF/CNPJ nº ' + esc(p.cpf || '________________'))).join('') : assin('CONTRATANTE', 'CPF nº ________________');
    const rtSig = assin('VTN Engenharia e Construções', `RT: ${esc(ism.nome || '')} – ${esc(ism.titulo || 'Engenheiro Civil')} – ${esc(ism.crea || '')}`);
    const vic = socios.find(s => /victor/i.test(s.nome)), ger = socios.find(s => /geraldo/i.test(s.nome)), mar = socios.find(s => /marcos/i.test(s.nome));
    const lind = linhas(ct.lindeiros);
    const fx = Calc.fluxoMensal(o.id || null, 0);
    const map = {
      DATA: date(ct.data), DATA_EXTENSO: UI.dateLong(ct.data), ANO: (ct.data || UI.today()).slice(0, 4), CIDADE_ASSINATURA: esc((ct.cidade || 'Itabirito').replace(/\/MG$/i, '') + '/MG'), FORO: esc(ct.foro || (ct.cidade || 'Itabirito').replace(/\/MG$/i, '') + ', Minas Gerais'),
      TITULO: esc(ct.titulo || ''), NUMERO: esc(ct.numero || '___/' + (ct.data || UI.today()).slice(0, 4)), PROPOSTA_REF: esc(ct.propostaRef || 'proposta comercial apresentada pela CONTRATADA'),
      CLIENTES_QUALIFICACAO: cls.length ? cls.map(q).join('; e ') : '________________', CLIENTES_NOMES: esc(cls.map(p => p.nome).join(' e ') || '________________'),
      CLIENTE_SAUDACAO: cls.length ? (cls.length > 1 ? 'Prezados ' : fem(cls[0]) ? 'Prezada ' : 'Prezado ') + esc(cls.map(p => p.nome.split(' ')[0]).join(' e ')) : 'Prezado(a) cliente',
      EMPRESA_NOME: esc(e.nome), EMPRESA_CNPJ: esc(e.cnpj), EMPRESA_SEDE: esc(e.sede || e.endereco), EMPRESA_ESCRITORIO: esc(e.escritorio || e.endereco), EMPRESA_CONTATO: esc([e.email, e.telefone, e.site].filter(Boolean).join(' · ')),
      REPRESENTANTE_QUALIFICACAO: `<b>${esc(ism.nome || '')}</b>, brasileiro, ${esc(ism.titulo || 'engenheiro civil').toLowerCase()} registrado no ${esc(ism.crea || '')}, portador do CPF nº ${esc(ism.cpf || '')} e Carteira de Identidade ${esc(ism.rg || '')}`,
      SOCIOS_QUALIFICACAO: [ism, ger].filter(Boolean).map(s => `<b>${esc(s.nome)}</b>, brasileiro, portador do CPF nº ${esc(s.cpf || '')} e Carteira de Identidade ${esc(s.rg || '')}`).join(' e '),
      OBJETO: esc(ct.objeto || o.descricao || 'prestação dos serviços descritos'), OBRA_NOME: esc(o.nome || ct.titulo || ''), OBRA_ENDERECO: esc(o.endereco || '________________'), OBRA_CIDADE: esc((o.cidade || (ct.cidade || '').replace(/\/MG$/i, '')) + '/' + (o.uf || 'MG')), OBRA_AREA: o.area ? UI.num(o.area) : '____', TERRENO_AREA: o.areaTerreno ? UI.num(o.areaTerreno) : '____', OBRA_CNO: esc(o.cno || '________'),
      LISTA_ESCOPO: rom(escopoL.map(x => esc(x[0]))), LISTA_ESCOPO_VALORES: rom(escopoL.map(x => esc(x[0]) + (x[1] ? ' – <b>' + esc(x[1]) + '</b>' : ''))),
      LISTA_INCLUSO: `<ul class="chk">${(linhas(ct.incluso).length ? linhas(ct.incluso) : escopoL.map(x => x[0]).concat('Nota fiscal dos serviços prestados')).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`,
      LISTA_NAO_INCLUSO: linhas(ct.naoIncluso).length ? `<ul class="nchk">${linhas(ct.naoIncluso).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p>—</p>',
      TABELA_ITENS: orc ? `<table class="dt"><thead><tr><th>#</th><th>Serviço</th><th class="n">Qtd</th><th>Un.</th>${ct.modelo === 'vtn_carta_proposta_obra' ? '' : '<th class="n">Unitário</th><th class="n">Total</th>'}</tr></thead><tbody>${itensAZ(orc.itens).map((i, k) => `<tr><td>${k + 1}</td><td>${esc(i.desc)}</td><td class="n">${UI.num(i.qtd)}</td><td>${esc(i.un)}</td>${ct.modelo === 'vtn_carta_proposta_obra' ? '' : `<td class="n">${money(i.unit)}</td><td class="n">${money(i.qtd * i.unit)}</td>`}</tr>`).join('')}</tbody></table>` : rom(escopoL.map(x => esc(x[0]) + (x[1] ? ' – ' + esc(x[1]) : ''))),
      TABELA_ETAPAS: ets.length ? `<table class="dt"><thead><tr><th>Etapa</th><th>Descrição</th><th class="n">Valor</th><th class="n">%</th><th>Previsão</th></tr></thead><tbody>${ets.map(x => `<tr><td>${x.ordem}</td><td>${esc(x.nome)}</td><td class="n">${money(x.valor)}</td><td class="n">${UI.pct(tot ? x.valor / tot * 100 : 0)}</td><td>${date(x.fimPrev)}</td></tr>`).join('')}</tbody></table>` : '',
      TABELA_ACABAMENTOS: `<table class="dt"><thead><tr><th>Local / item</th><th>Material</th><th class="n">Faixa de preço</th></tr></thead><tbody>${(ct.acabamentos || [['Revestimento piso', 'Porcelanato', 'Até R$ 90,00/m²'], ['Revestimento parede', 'Porcelanato', 'Até R$ 60,00/m²'], ['Pias e bancadas', 'Granito', 'Até R$ 3.000,00'], ['Lavatórios', 'Granito', 'Até R$ 800,00 cada'], ['Tanque lavanderia', 'A definir', 'Até R$ 400,00'], ['Vasos sanitários', 'Cerâmico', 'Até R$ 800,00 cada'], ['Torneiras tanque', 'A definir', 'Até R$ 50,00 cada'], ['Torneira cozinha', 'A definir', 'Até R$ 150,00 cada'], ['Torneira lavatório', 'A definir', 'Até R$ 100,00 cada'], ['Acabamento de registro interno', 'Cromado', 'Até R$ 25,00 cada'], ['Pintura externa', 'Tinta acrílica', '—'], ['Pintura interna', 'Tinta látex', '—'], ['Porta interna', 'Prancheta', '—'], ['Porta externa', 'Madeira maciça', 'Até R$ 1.500,00 cada'], ['Maçaneta porta interna', 'A definir', 'Até R$ 50,00 cada'], ['Maçaneta porta externa', 'A definir', 'Até R$ 80,00'], ['Puxador porta externa', 'A definir', 'Até R$ 80,00'], ['Rebaixamento forro', 'Aramado simples', '—'], ['Lâmpadas', 'Painel LED 30x30', 'Até R$ 20,00 cada'], ['Vidros', 'Blindex incolor', '—']]).map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td class="n">${esc(r[2])}</td></tr>`).join('')}</tbody></table>`,
      TABELA_CNO: fx.length ? `<table class="dt"><thead><tr><th>Mês</th><th class="n">Recebido com NF</th><th class="n">Despesas no CNO</th></tr></thead><tbody>${fx.map(x => `<tr><td>${Calc.mesLabel(x.mes)}</td><td class="n">${x.receita ? money(x.receita) : 'sem recebíveis'}</td><td class="n">${money(x.despesa)}</td></tr>`).join('')}</tbody><tfoot><tr><td>Total</td><td class="n">${money(fx.reduce((a, x) => a + x.receita, 0))}</td><td class="n">${money(fx.reduce((a, x) => a + x.despesa, 0))}</td></tr></tfoot></table>` : '<p>Sem lançamentos.</p>',
      VALOR: money(valor), VALOR_EXTENSO: UI.extenso(valor), VALOR_50: money(valor / 2), VALOR_PIX: money(valor * (1 - pix / 100)), DESCONTO_PIX: UI.num(pix), VALOR_CARTAO: money(valor * 1.05), PARCELAS_CARTAO: ct.parcelas || 3,
      CONDICOES_PAGAMENTO: esc(ct.condicoes || (orc && orc.condicoes) || '50% no início e 50% na entrega dos serviços.'),
      PRAZO_DIAS: ct.prazoDias || 40, PRAZO_DIAS_EXTENSO: ext(+ct.prazoDias || 40), PRAZO_MESES: ct.prazoMeses || 12, PRAZO_MESES_EXTENSO: ext(+ct.prazoMeses || 12),
      DATA_INICIO: date(ct.inicio || o.dataInicio), DATA_TERMINO: date(o.dataPrevTermino), VALIDADE_DIAS: ct.validadeDias || 15,
      RT_NOME: esc(rt.nome || ism.nome || ''), RT_REGISTRO: esc(rt.registro || ism.crea || ''),
      LINDEIROS: lind.length ? `<ol>${lind.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : '<ol><li>________________</li></ol>',
      ASSINATURAS_LINDEIROS: `<div class="sigs">${[...cls.map(p => p.nome), ...lind.map(x => x.split(/\s[–-]\s/)[0])].map(n => assin(n, 'Proprietário/Responsável · CPF/CNPJ: ____________')).join('')}${rtSig}</div>`,
      ASSINATURA_RT: `<div class="sigs one">${rtSig}</div>`,
      ASSINATURAS_RT: `<div class="sigs">${cliSig}${rtSig}</div>`,
      ASSINATURAS_PROJETO: `<div class="sigs"><div class="sig-grp">CONTRATANTE</div>${cliSig}<div class="sig-grp">CONTRATADA</div>${rtSig}${vic ? assin('VTN Engenharia e Construções', `${esc(vic.nome)} – ${esc(vic.titulo || 'Engenheiro Civil')} – ${esc(vic.crea || '')}`) : ''}</div>`,
      ASSINATURAS_OBRA: `<div class="sigs"><div class="sig-grp">CONTRATANTE</div>${cliSig}<div class="sig-grp">CONTRATADA</div>${rtSig}${ger ? assin('VTN Engenharia e Construções', esc(ger.nome) + ' – CPF nº ' + esc(ger.cpf || '')) : ''}${mar ? assin('VTN Engenharia e Construções', esc(mar.nome) + ' – CPF nº ' + esc(mar.cpf || '')) : ''}<div class="sig-grp">TESTEMUNHAS</div>${assin('Testemunha 01', 'CPF nº ________________')}${assin('Testemunha 02', 'CPF nº ________________')}</div>`,
      CIDADE: esc((ct.cidade || 'Itabirito').replace(/\/MG$/i, '') + '/MG'), EMPRESA_ENDERECO: esc(e.sede || e.endereco), EMPRESA_REPRESENTANTE: esc(e.representante || ''), OBRA_DESCRICAO: esc(o.tipo === 'Projeto' ? 'residência unifamiliar' : 'imóvel residencial'),
      ASSINATURAS: `<div class="sigs">${cliSig}${rtSig}${assin('Testemunha 01', 'CPF nº ________________')}${assin('Testemunha 02', 'CPF nº ________________')}</div>`
    };
    const mod = this.modelo(ct.modelo);
    return mod.corpo.replace(/\{\{(\w+)\}\}/g, (_, k) => map[k] ?? '{{' + k + '}}');
  },

  editor(id) {
    const { icon, esc } = UI; const ct = Store.get('contratos', id); const mod = this.modelo(ct.modelo);
    if (!ct.corpo) { Store.update('contratos', id, { corpo: this.gerar(ct) }); }
    const anex = Store.where('arquivos', a => a.contratoId === id);
    const m = UI.modal({ title: `${id} – ${esc(ct.titulo)}`, wide: true,
      body: `<div class="toolbar"><select class="select" id="cst">${LISTAS.statusContrato.map(s => `<option ${s === ct.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
        <button class="btn sm" id="creg">${icon('refresh-cw')} Regerar do modelo</button><button class="btn sm" id="cdat">${icon('settings-2')} Dados</button>
        <label class="btn sm">${icon('upload')} Anexar assinado<input type="file" id="cup" hidden></label>${anex.map(a => `<span class="badge ok" data-goto="${a.id}" style="cursor:pointer">${icon('paperclip')} ${esc(a.nome)}</span>`).join('')}
        <span class="tiny muted" style="margin-left:auto">${mod.vtn ? '<span class="badge brand">Modelo VTN</span> ' : ''}Clique no texto para editar</span></div>
        <div class="doc-stage"><div class="vdoc" id="cdoc"><div contenteditable="false">${this.papel(mod, ct)}</div><div id="cbody" contenteditable="true">${Store.get('contratos', id).corpo}</div><div contenteditable="false">${this.rodape()}</div></div></div>`,
      footer: `<button class="btn danger" data-del style="margin-right:auto">${icon('trash-2')}</button><button class="btn" data-doc>${icon('file-down')} Baixar Word</button><button class="btn" data-pr>${icon('printer')} Imprimir / PDF</button><button class="btn" data-so title="Grava o PDF na pasta da obra no drive (fase certa pelo tipo do documento)">${icon('folder-input')} Salvar na pasta da obra</button><button class="btn primary" data-sv>${icon('save')} Salvar</button>` });
    const save = () => Store.update('contratos', id, { corpo: m.$('#cbody').innerHTML, status: m.$('#cst').value });
    m.$('[data-sv]').onclick = () => { save(); m.close(); UI.toast('Documento salvo'); App.refresh(); };
    const naPasta = avisar => { const x = Store.get('contratos', id); const cat = this.categoriaDe(x); return Drive.salvarDoc(x.obraId, { corpo: m.$('#cdoc').outerHTML, titulo: x.titulo, categoria: cat, arquivo: [cat.toUpperCase(), x.numero ? String(x.numero).replace('/', '-') : x.id, x.titulo, new Date().toISOString().slice(0, 10)].filter(Boolean).join('_').replace(/[^\wÀ-ú\- ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 120), avisar }); };
    m.$('[data-pr]').onclick = () => { save(); UI.print(m.$('#cdoc').outerHTML, ct.titulo); naPasta(false); };
    m.$('[data-so]').onclick = () => { save(); naPasta(true); };
    m.$('[data-doc]').onclick = () => { save(); UI.download(ct.titulo.replace(/[^\wÀ-ú\-]+/g, '_') + '.doc', `<html><head><meta charset="utf-8"><style>${this.WORD_CSS}</style></head><body>${m.$('#cdoc').outerHTML}</body></html>`, 'application/msword'); };
    m.$('[data-del]').onclick = async () => { if (await UI.confirm('Excluir documento?')) { Store.remove('contratos', id); m.close(); App.refresh(); } };
    m.$('#creg').onclick = async () => { if (await UI.confirm('Substituir o texto atual pelo modelo com os dados atualizados?')) { m.$('#cbody').innerHTML = this.gerar(Store.get('contratos', id)); } };
    m.$('#cdat').onclick = () => { save(); m.close(); this.dados(id); };
    m.$('#cup').onchange = async e => { const o = Store.get('contratos', id); await Store.uploadFiles([...e.target.files], { obraId: o.obraId, pasta: '00_COMERCIAL', contratoId: id }); Store.update('contratos', id, { status: 'Assinado' }); UI.toast('Documento assinado anexado'); m.close(); this.editor(id); };
  },
  // contratantes = só os clientes da obra do documento (+ os já marcados); sem obra ou obra sem cliente: pessoas do tipo Cliente
  clientesOpc(obraId, sel) {
    const ob = obraId && Store.get('obras', obraId);
    const ids = [...new Set([...((ob && ob.clienteIds) || []), ...(sel || [])])];
    const ps = ids.length ? ids.map(i => Store.get('pessoas', i)).filter(Boolean) : Store.all('pessoas').filter(p => p.tipo === 'Cliente');
    return ps.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base' })).map(p => [p.id, p.nome]);
  },
  trocarClientes(md, obraId) {
    const sc = md.querySelector('[name="clienteIds"]'); if (!sc) return;
    const ob = Store.get('obras', obraId); const daObra = (ob && ob.clienteIds) || [];
    sc.innerHTML = ''; this.clientesOpc(obraId, []).forEach(([v, t]) => { const o = new Option(t, v); o.selected = daObra.includes(v); sc.add(o); });
  },
  async dados(id) {
    const c = Store.get('contratos', id);
    setTimeout(() => {
      const md = [...document.querySelectorAll('.modal')].pop(); const so = md && md.querySelector('[name="obraId"]'); if (!so) return;
      so.addEventListener('change', () => { if (so.value) this.trocarClientes(md, so.value); });
    }, 60);
    const d = await UI.formModal({ title: 'Dados do documento ' + id, wide: true, values: c, list: [{ k: 'titulo', l: 'Título', req: 1 }, { k: 'numero', l: 'Número' }, { k: 'modelo', l: 'Modelo', t: 'select', o: () => this.modelos().map(m => [m.id, m.categoria + ' · ' + m.nome]), blank: false, full: 1 },
      { k: 'obraId', l: 'Obra', t: 'select', o: () => Store.all('obras').map(x => [x.id, x.id + ' · ' + x.nome]) }, { k: 'orcamentoId', l: 'Orçamento', t: 'select', o: () => Store.all('orcamentos').map(x => [x.id, x.id + ' · ' + x.titulo]) },
      { k: 'clienteIds', l: 'Contratante(s) — clientes da obra (para outro contratante, cadastre-o na obra)', t: 'multi', o: () => this.clientesOpc(c.obraId, c.clienteIds), full: 1 },
      { k: 'valor', l: 'Valor', t: 'money' }, { k: 'data', l: 'Data', t: 'date' }, { k: 'cidade', l: 'Cidade' }, { k: 'inicio', l: 'Início', t: 'date' }, { k: 'prazoDias', l: 'Prazo dias', t: 'number' }, { k: 'prazoMeses', l: 'Prazo meses', t: 'number' },
      { k: 'descontoPix', l: 'Desconto PIX (%)', t: 'number' }, { k: 'parcelas', l: 'Parcelas cartão', t: 'number' },
      { k: 'objeto', l: 'Objeto', t: 'textarea', rows: 2, full: 1 }, { k: 'escopo', l: 'Escopo (um por linha)', t: 'textarea', rows: 4, full: 1 }, { k: 'naoIncluso', l: 'Não incluso', t: 'textarea', rows: 3, full: 1 }, { k: 'incluso', l: 'Incluso', t: 'textarea', rows: 2, full: 1 },
      { k: 'condicoes', l: 'Condições de pagamento', t: 'textarea', full: 1 }, { k: 'propostaRef', l: 'Proposta de referência', full: 1 }, { k: 'lindeiros', l: 'Lindeiros', t: 'textarea', rows: 2, full: 1 }] });
    if (d) { Store.update('contratos', id, Object.assign(d, { corpo: '' })); }
    this.editor(id);
  },
  WORD_CSS: "body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.5;color:#111}.lh{border-bottom:3px solid #18c20e;padding-bottom:8px;margin-bottom:18px}.lh-logo{height:60px}.lh-side{text-align:right}.lh-emp b{font-size:13pt}.lh-emp span{display:block;color:#666;font-size:9pt}.lh-tag{float:right;font-weight:bold;color:#119a09}h1{text-align:center;font-size:14pt}h1 small{display:block;font-size:10pt;color:#555}h2{font-size:11pt;background:#f1f5f9;border-left:4px solid #18c20e;padding:4px 8px;text-transform:uppercase}p{text-align:justify}p.cl{font-weight:bold;margin-bottom:2px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #cbd5e1;padding:4px 6px}th{background:#f1f5f9}.n{text-align:right}.sig-l{margin-top:36px;text-align:center}.sig-l i{display:block;border-top:1px solid #333;width:70%;margin:0 auto 4px}.sig-l b{display:block}.sig-l span{font-size:9pt}.sig-grp{font-weight:bold;margin-top:24px}.lh-foot{border-top:1px solid #ccc;margin-top:30px;padding-top:6px;font-size:8.5pt;color:#666;text-align:center}.valor-box{border:2px solid #18c20e;padding:8px;text-align:center;margin:10px 0}.valor-box b{display:block;font-size:16pt}.local{text-align:right;margin-top:24px}"
};
Open.CT = id => Views.contratos.editor(id);
