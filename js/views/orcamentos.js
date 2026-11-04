/* Orçamentos / propostas + catálogo de composição de preços */
Views.orcamentos = {
  perm: 'orcamentos',
  st: { tab: 'lista' },
  render(el) {
    const { icon, esc, money, date } = UI; const s = this.st;
    const l = Store.all('orcamentos').slice().sort((a, b) => b.id.localeCompare(a.id));
    const tot = st => l.filter(o => !st || o.status === st).reduce((a, o) => a + Calc.orcTotal(o).total, 0);
    el.innerHTML = `<div class="page-head"><div><h1>Orçamentos</h1><p>Monte propostas a partir da composição de preços e converta em obra e contrato</p></div><button class="btn primary" onclick="Views.orcamentos.novo()">${icon('plus')} Novo orçamento</button></div>
      <div class="grid g4"><div class="card kpi"><div class="lbl">Orçamentos</div><div class="val">${l.length}</div></div><div class="card kpi info"><div class="lbl">Em aberto (enviados)</div><div class="val">${money(tot('Enviado'))}</div></div><div class="card kpi ok"><div class="lbl">Aprovados</div><div class="val">${money(tot('Aprovado'))}</div></div><div class="card kpi"><div class="lbl">Taxa de conversão</div><div class="val">${UI.pct(Calc.global().taxaConversao, 0)}</div></div></div>
      <div class="tabs mt"><button class="${s.tab === 'lista' ? 'active' : ''}" data-t="lista">${icon('list')} Orçamentos</button><button class="${s.tab === 'cat' ? 'active' : ''}" data-t="cat">${icon('book-open')} Composição de preços (${Store.all('catalogo').length})</button></div>
      <div id="oc"></div>`;
    UI.$$('[data-t]', el).forEach(b => b.onclick = () => { s.tab = b.dataset.t; App.refresh(); });
    const c = UI.$('#oc', el);
    if (s.tab === 'lista') {
      c.innerHTML = `<div class="card">${UI.table([{ h: 'ID', f: o => UI.idLink(o.id) }, { h: 'Título', f: o => `<span class="plink" data-goto="${o.id}">${esc(o.titulo)}</span>` }, { h: 'Cliente', f: o => clientesDe(o).map(UI.pessoa).join(', ') || '—' }, { h: 'Obra', f: o => UI.idLink(o.obraId) },
        { h: 'Data', f: o => date(o.data) }, { h: 'Validade', f: o => date(o.validade) }, { h: 'Itens', num: 1, f: o => (o.itens || []).length }, { h: 'Total', num: 1, f: o => `<b>${money(Calc.orcTotal(o).total)}</b>` }, { h: 'Status', f: o => UI.badge(o.status) }], l, { emptyMsg: 'Nenhum orçamento.' })}</div>`;
    } else this.catalogo(c);
  },
  catalogo(c) {
    const { esc, money, icon } = UI;
    const AZ = (a, b) => String(a || '').localeCompare(String(b || ''), 'pt-BR', { sensitivity: 'base', numeric: true });
    const cat = Store.all('catalogo').slice().sort((a, b) => AZ(a.desc, b.desc)); const grupos = [...new Set(cat.map(x => x.grupo))].sort(AZ);
    c.innerHTML = `<div class="toolbar"><button class="btn primary" id="cadd">${icon('plus')} Novo serviço</button><span class="tiny muted">Preencha o valor unitário de cada serviço — ele é usado ao montar orçamentos. (Base: COMPOSIÇÃO_PREÇO_SERVIÇOS.xlsx + 00_GERADOR_ORÇAMENTO_OBRAS_VTN.xlsx + tabela de projetos VTN)</span></div>
      ${grupos.map(g => `<div class="card mb"><div class="card-h"><h3>${esc(g)}</h3></div><div class="table-wrap"><table class="t"><thead><tr><th>Código</th><th>Serviço</th><th>Unidade</th><th class="num">Valor unitário (R$)</th></tr></thead><tbody>
        ${cat.filter(x => x.grupo === g).map(x => `<tr><td><span class="idlink">${x.id}</span></td><td>${esc(x.desc)}</td><td>${esc(x.un)}</td><td class="num"><input class="input" type="number" step="0.01" data-cu="${x.id}" value="${x.unit || 0}" style="width:120px;text-align:right"></td></tr>`).join('')}
      </tbody></table></div></div>`).join('')}`;
    UI.$$('[data-cu]', c).forEach(i => i.onchange = () => { Store.update('catalogo', i.dataset.cu, { unit: +i.value || 0 }); UI.toast('Preço atualizado'); });
    UI.$('#cadd', c).onclick = async () => {
      const d = await UI.formModal({ title: 'Novo serviço no catálogo', list: [{ k: 'grupo', l: 'Grupo', req: 1, def: grupos[0] }, { k: 'desc', l: 'Descrição', req: 1, full: 1 }, { k: 'un', l: 'Unidade', req: 1 }, { k: 'unit', l: 'Valor unitário', t: 'money' }] });
      if (d) { Store.insert('catalogo', d); App.refresh(); }
    };
  },
  novo(preset = {}) {
    const o = Store.get('obras', preset.obraId);
    const r = Store.insert('orcamentos', Object.assign({ titulo: o ? 'Orçamento – ' + o.nome : 'Novo orçamento', data: UI.today(), validade: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10), status: 'Rascunho', itens: [], bdi: 0, imposto: Store.db.empresa.imposto ?? CONFIG.impostoPadrao, desconto: 0, clienteId: o ? (o.clienteIds || [])[0] || '' : '', clienteIds: o ? (o.clienteIds || []).slice() : [], condicoes: '', obs: '' }, preset));
    this.editor(r.id);
  },
  editor(id) {
    const { esc, icon, money } = UI;
    const o = JSON.parse(JSON.stringify(Store.get('orcamentos', id)));
    o.clienteIds = clientesDe(o).slice();
    const AZ = (a, b) => String(a || '').localeCompare(String(b || ''), 'pt-BR', { sensitivity: 'base', numeric: true });
    const cat = Store.all('catalogo').slice().sort((a, b) => AZ(a.desc, b.desc));
    const m = UI.modal({ title: `Orçamento ${id}`, wide: true, body: `<div id="ob"></div>`,
      footer: `<button class="btn danger" data-del style="margin-right:auto">${icon('trash-2')}</button><button class="btn" data-pr>${icon('printer')} Imprimir / PDF</button><button class="btn" data-so title="Grava o PDF na pasta COMERCIAL da obra (OneDrive › 00_SERVIÇOS)">${icon('folder-input')} Salvar na pasta da obra</button><button class="btn" data-pp>${icon('send')} Proposta VTN</button><button class="btn" data-ct>${icon('file-signature')} Gerar contrato</button><button class="btn" data-ob>${icon('hard-hat')} Criar obra</button><button class="btn primary" data-sv>${icon('save')} Salvar</button>` });
    const body = m.$('#ob');
    const draw = () => {
      if (o.ordemItens !== 'manual') o.itens = itensAZ(o.itens);
      const t = Calc.orcTotal(o);
      body.innerHTML = UI.fields([{ k: 'titulo', l: 'Título', full: 1 }, { k: 'clienteIds', l: 'Cliente(s) — clientes cadastrados na obra · Ctrl+clique para mais de um', t: 'multi', o: () => Views.contratos.clientesOpc(o.obraId, o.clienteIds) },
        { k: 'obraId', l: 'Obra', t: 'select', o: () => Store.all('obras').map(x => [x.id, x.id + ' · ' + x.nome]) }, { k: 'data', l: 'Data', t: 'date' }, { k: 'validade', l: 'Validade', t: 'date' },
        { k: 'status', l: 'Status', t: 'select', o: LISTAS.statusOrc }, { k: 'ordemItens', l: 'Ordem dos itens (tela, impressão, proposta e contrato)', t: 'select', o: [['az', 'Alfabética (A → Z)'], ['manual', 'Escolhida por mim (setas ↑ ↓)']], blank: false }], Object.assign({ ordemItens: 'az' }, o)) +
        `<h3 class="mt2 mb">Itens</h3><div class="table-wrap"><table class="t"><thead><tr><th>Descrição</th><th>Un.</th><th class="num">Qtd</th><th class="num">Unitário</th><th class="num">Total</th><th></th></tr></thead><tbody>
        ${o.itens.map((i, k) => `<tr><td><input class="input" data-i="${k}" data-f="desc" value="${esc(i.desc)}" style="width:100%"></td><td><input class="input" data-i="${k}" data-f="un" value="${esc(i.un)}" style="width:70px"></td>
          <td class="num"><input class="input" type="number" step="any" data-i="${k}" data-f="qtd" value="${i.qtd}" style="width:80px;text-align:right"></td><td class="num"><input class="input" type="number" step="any" data-i="${k}" data-f="unit" value="${i.unit}" style="width:110px;text-align:right"></td>
          <td class="num"><b>${money(i.qtd * i.unit)}</b></td><td style="white-space:nowrap">${o.ordemItens === 'manual' ? `<button class="btn ghost sm" data-up="${k}" title="Subir" ${k ? '' : 'disabled'}>${icon('arrow-up')}</button><button class="btn ghost sm" data-dn="${k}" title="Descer" ${k < o.itens.length - 1 ? '' : 'disabled'}>${icon('arrow-down')}</button>` : ''}<button class="btn ghost sm" data-rm="${k}">${icon('x')}</button></td></tr>`).join('')}
        </tbody></table></div>
        <div class="row mt"><select class="select" id="catsel" style="flex:1;min-width:240px"><option value="">+ Adicionar do catálogo de preços…</option>${[...new Set(cat.map(c => c.grupo))].sort(AZ).map(g => `<optgroup label="${esc(g)}">${cat.filter(c => c.grupo === g).map(c => `<option value="${c.id}">${esc(c.desc)} (${esc(c.un)}${c.unit ? ' · ' + money(c.unit) : ''})</option>`).join('')}</optgroup>`).join('')}</select><select class="select" id="compsel" style="flex:1;min-width:240px"><option value="">+ Adicionar composição (mão de obra + materiais)…</option>${(() => { const D = window.Comp ? Comp.dados() : { composicoes: [] }; return [...new Set(D.composicoes.map(c => c.grupo))].sort(AZ).map(g => `<optgroup label="${esc(g)}">${D.composicoes.filter(c => c.grupo === g).sort((a, b) => AZ(a.nome, b.nome)).map(c => `<option value="${c.id}">${esc(c.nome)} (${esc(c.un)} · ${money(Comp.custo(c, D.insumos).total)})</option>`).join('')}</optgroup>`).join(''); })()}</select>
          <button class="btn" id="addfree">${icon('plus')} Item livre</button><button class="btn" id="addet" title="Copiar etapas da obra vinculada">${icon('copy')} Importar etapas da obra</button></div>
        <div class="row mt"><select class="select" id="modorc" style="flex:1;min-width:240px"><option value="">★ Aplicar modelo de orçamento da VTN…</option>${(window.VTN_MODELOS ? VTN_MODELOS.MODELOS_ORC : []).map(mo => `<option value="${mo.id}">${esc(mo.nome)} – ${esc(mo.origem)}</option>`).join('')}</select></div>
        <div class="grid g2 mt2"><div>${UI.fields([{ k: 'condicoes', l: 'Condições de pagamento', t: 'textarea', full: 1, rows: 3 }, { k: 'obs', l: 'Observações / escopo', t: 'textarea', full: 1, rows: 3 }], o)}</div>
          <div class="card"><div class="card-b"><dl class="dl"><dt>Subtotal</dt><dd class="right">${money(t.sub)}</dd>
            <dt>BDI (%)</dt><dd class="right"><input class="input" type="number" step="any" data-g="bdi" value="${o.bdi}" style="width:90px;text-align:right"> ${money(t.bdi)}</dd>
            <dt>Impostos (%)</dt><dd class="right"><input class="input" type="number" step="any" data-g="imposto" value="${o.imposto}" style="width:90px;text-align:right"> ${money(t.imp)}</dd>
            <dt>Desconto (R$)</dt><dd class="right"><input class="input" type="number" step="any" data-g="desconto" value="${o.desconto}" style="width:120px;text-align:right"></dd>
            <dt style="font-size:16px;font-weight:700;color:var(--text)">TOTAL</dt><dd class="right" style="font-size:20px;font-weight:800;color:var(--brand)">${money(t.total)}</dd></dl></div></div></div>`;
      UI.icons();
      const grab = () => { Object.assign(o, UI.read(body, [{ k: 'titulo' }, { k: 'clienteIds', t: 'multi' }, { k: 'obraId' }, { k: 'data' }, { k: 'validade' }, { k: 'status' }, { k: 'ordemItens' }, { k: 'condicoes' }, { k: 'obs' }])); o.clienteId = o.clienteIds[0] || ''; };
      // a obra dita o nome e os clientes do orçamento
      const selObra = UI.$('[name="obraId"]', body); if (selObra) selObra.onchange = () => { grab(); const ob = Store.get('obras', o.obraId); if (ob) { o.titulo = 'Orçamento – ' + ob.nome; o.clienteIds = (ob.clienteIds || []).slice(); o.clienteId = o.clienteIds[0] || ''; UI.toast('Nome e cliente(s) preenchidos pela obra'); } draw(); };
      UI.$$('[data-i]', body).forEach(i => i.onchange = () => { grab(); const it = o.itens[+i.dataset.i]; it[i.dataset.f] = ['qtd', 'unit'].includes(i.dataset.f) ? +i.value || 0 : i.value; draw(); });
      UI.$$('[data-g]', body).forEach(i => i.onchange = () => { grab(); o[i.dataset.g] = +i.value || 0; draw(); });
      UI.$$('[data-rm]', body).forEach(b => b.onclick = () => { grab(); o.itens.splice(+b.dataset.rm, 1); draw(); });
      const mover = (k, d) => { grab(); const j = k + d; if (j < 0 || j >= o.itens.length) return; [o.itens[k], o.itens[j]] = [o.itens[j], o.itens[k]]; draw(); };
      UI.$$('[data-up]', body).forEach(b => b.onclick = () => mover(+b.dataset.up, -1));
      UI.$$('[data-dn]', body).forEach(b => b.onclick = () => mover(+b.dataset.dn, 1));
      const selOrd = UI.$('[name="ordemItens"]', body); if (selOrd) selOrd.onchange = () => { grab(); draw(); };
      if (UI.$('#compsel', body)) UI.$('#compsel', body).onchange = e => { const D = Comp.dados(); const c = D.composicoes.find(x => x.id === e.target.value); if (!c) return; grab(); const r = Comp.custo(c, D.insumos); o.itens.push({ desc: c.nome + (c.itens.length ? ' (mão de obra + materiais)' : ''), un: c.un, qtd: 1, unit: +r.total.toFixed(2), compId: c.id }); draw(); };
      UI.$('#catsel', body).onchange = e => { const c = Store.get('catalogo', e.target.value); if (!c) return; grab(); o.itens.push({ desc: c.desc, un: c.un, qtd: 1, unit: c.unit || 0 }); draw(); };
      UI.$('#addfree', body).onclick = () => { grab(); o.itens.push({ desc: '', un: 'un', qtd: 1, unit: 0 }); draw(); };
      UI.$('#addet', body).onclick = () => { grab(); const ets = Store.where('etapas', e => e.obraId === o.obraId); if (!ets.length) return UI.toast('Selecione uma obra com etapas.', 'err'); ets.forEach(e => o.itens.push({ desc: e.nome, un: 'etapa', qtd: 1, unit: e.valor })); draw(); };
      const mo = UI.$('#modorc', body); if (mo) mo.onchange = async e => {
        const M = VTN_MODELOS.MODELOS_ORC.find(x => x.id === e.target.value); if (!M) return; grab();
        let area = (Store.get('obras', o.obraId) || {}).area || 0;
        if (M.porArea) { const r = await UI.formModal({ title: 'Área para o orçamento', list: [{ k: 'area', l: 'Área construída / projetada (m²)', t: 'number', def: area || 100 }] }); if (!r) { draw(); return; } area = +r.area || 0; }
        M.itens.forEach(([desc, un, q, unit]) => o.itens.push({ desc, un, qtd: q === 'A' ? area : q, unit }));
        o.imposto = M.imposto; if (!o.condicoes) o.condicoes = M.condicoes; if (!o.obs) o.obs = M.obs; o.modeloVTN = M.id;
        UI.toast('Modelo aplicado: ' + M.nome); draw();
      };
      m.grab = grab;
    };
    draw();
    const save = () => { m.grab(); Store.update('orcamentos', id, o); };
    m.$('[data-sv]').onclick = () => { save(); m.close(); UI.toast('Orçamento salvo'); App.refresh(); };
    m.$('[data-pr]').onclick = () => { save(); this.imprimir(id); this.salvarNaObra(id, true); };
    m.$('[data-so]').onclick = () => { save(); this.salvarNaObra(id); };
    m.$('[data-del]').onclick = async () => { if (await UI.confirm('Excluir orçamento?')) { Store.remove('orcamentos', id); m.close(); App.refresh(); } };
    m.$('[data-ob]').onclick = () => {
      save(); const x = Store.get('orcamentos', id);
      if (x.obraId) { UI.toast('Já vinculado a ' + x.obraId); return; }
      m.close();
      Views.obras.edit(null, { nome: x.titulo.replace(/^Orçamento\s*[–-]\s*/i, ''), clienteIds: clientesDe(x).slice(), valorContrato: Calc.orcTotal(x).total, status: 'Contratada', descricao: x.obs });
    };
    m.$('[data-pp]').onclick = () => { save(); m.close(); const x = Store.get('orcamentos', id); const obra = x.modeloVTN === 'obra_mo' ? 'vtn_carta_proposta_obra' : x.modeloVTN === 'vistoria' ? 'vtn_carta_proposta_vistoria' : 'vtn_proposta_2026'; Views.contratos.novo({ modelo: obra, obraId: x.obraId, clienteIds: (Store.get('obras', x.obraId) || {}).clienteIds || clientesDe(x), valor: Calc.orcTotal(x).total, orcamentoId: id, condicoes: x.condicoes, titulo: x.titulo.replace(/^Orçamento\s*[–-]\s*/i, ''), naoIncluso: (x.obs || '').replace(/^Não inclusos?:\s*/i, '').split(/[;,.]\s*/).filter(Boolean).join('\n') }); };
    m.$('[data-ct]').onclick = () => { save(); m.close(); const x = Store.get('orcamentos', id); Views.contratos.novo({ obraId: x.obraId, clienteIds: (Store.get('obras', x.obraId) || {}).clienteIds || clientesDe(x), valor: Calc.orcTotal(x).total, orcamentoId: id, condicoes: x.condicoes, titulo: 'Contrato – ' + x.titulo }); };
  },
  html(id) {
    const { esc, money, date } = UI; const o = Store.get('orcamentos', id); const t = Calc.orcTotal(o);
    const ob = Store.get('obras', o.obraId) || {};
    const papel = Views.contratos.papel({ categoria: 'Orçamento' }, { numero: o.id });
    return `<div class="vdoc">${papel}
      <h1>ORÇAMENTO<br><small>${esc(o.titulo)}</small></h1>
      <table class="kv"><tr><th>${clientesDe(o).length > 1 ? 'CLIENTES' : 'CLIENTE'}</th><td>${clientesDe(o).map(cid => Store.get('pessoas', cid) || {}).map(p => esc(p.nome || '—') + (p.cpf ? '<br><span class="tiny">CPF/CNPJ ' + esc(p.cpf) + '</span>' : '')).join('<br>') || '—'}</td><th>DATA</th><td>${date(o.data)}</td><th>VALIDADE</th><td>${date(o.validade)}</td></tr>
      ${ob.nome ? `<tr><th>OBRA</th><td colspan="5">${esc(ob.nome)}${ob.endereco ? ' – ' + esc(ob.endereco) : ''}${ob.cidade ? ', ' + esc(ob.cidade) + '/' + esc(ob.uf || 'MG') : ''}${ob.area ? ' · ' + UI.num(ob.area) + ' m²' : ''}</td></tr>` : ''}</table>
      <h2>Composição do orçamento</h2>
      <table class="dt"><thead><tr><th>#</th><th>Item</th><th class="n">Qtde</th><th>Unid.</th><th class="n">Custo unitário</th><th class="n">Custo total</th></tr></thead><tbody>
      ${itensOrdem(o.itens, o.ordemItens).map((i, k) => `<tr><td>${String(k + 1).padStart(2, '0')}</td><td>${esc(i.desc)}</td><td class="n">${UI.num(i.qtd)}</td><td>${esc(i.un)}</td><td class="n">${money(i.unit)}</td><td class="n">${money(i.qtd * i.unit)}</td></tr>`).join('')}
      </tbody><tfoot><tr><td colspan="5" class="n">TOTAL ORÇAMENTO</td><td class="n">${money(t.sub)}</td></tr>
      ${t.bdi ? `<tr><td colspan="5" class="n">BDI (${UI.num(o.bdi)}%)</td><td class="n">${money(t.bdi)}</td></tr>` : ''}
      ${t.imp ? `<tr><td colspan="5" class="n">${+o.imposto > 7 ? 'IMPOSTO + TAXA' : 'IMPOSTO NOTA'} (${UI.num(o.imposto)}%)</td><td class="n">${money(t.imp)}</td></tr>` : ''}
      ${t.desconto ? `<tr><td colspan="5" class="n">DESCONTO</td><td class="n">− ${money(t.desconto)}</td></tr>` : ''}</tfoot></table>
      <div class="valor-box"><span>TOTAL + IMPOSTOS</span><b>${money(t.total)}</b><em>${UI.extenso(t.total)}</em></div>
      ${o.condicoes ? `<h2>Condições de pagamento</h2><p>${esc(o.condicoes)}</p>` : ''}${o.obs ? `<h2>Observações e escopo</h2><p>${esc(o.obs)}</p>` : ''}
      <ul><li>Orçamento válido até ${date(o.validade)}.</li><li>Nota fiscal dos serviços prestados.</li></ul>
      <p class="local">${esc((ob.cidade || 'Itabirito'))}/MG, ${UI.dateLong(o.data)}.</p>
      <div class="sigs"><div class="sig-l"><i></i><b>VTN Engenharia e Construções</b><span>RT: Ismael José Viana Timóteo – Engenheiro Civil – CREA/MG 251884</span></div>${(clientesDe(o).length ? clientesDe(o).map(cid => Store.get('pessoas', cid) || {}) : [{}]).map(cli => `<div class="sig-l"><i></i><b>De acordo – ${esc(cli.nome || 'Cliente')}</b><span>CPF/CNPJ nº ${esc(cli.cpf || '________________')}</span></div>`).join('')}</div>
      ${Views.contratos.rodape()}</div>`;
  },
  imprimir(id) { UI.print(this.html(id), 'Orçamento ' + id); },
  /* grava o orçamento em PDF na pasta da obra no OneDrive: 00_SERVIÇOS\<nº> - <NOME>\..COMERCIAL (só arquivo novo; nunca substitui) */
  async salvarNaObra(id, silencioso) {
    const o = Store.get('orcamentos', id); if (!o) return;
    return Drive.salvarDoc(o.obraId, { corpo: this.html(id), titulo: o.titulo, categoria: 'Orçamento', arquivo: ('ORCAMENTO_' + o.id + '_' + (o.titulo || '').replace(/[^\wÀ-ú\- ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 50) + '_' + new Date().toISOString().slice(0, 10)).replace(/_+$/, ''), avisar: !silencioso });
  }
};
Open.ORC = id => Views.orcamentos.editor(id);
