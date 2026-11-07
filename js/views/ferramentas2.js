/* =========================================================
   MAIS FERRAMENTAS
   • Vistorias e visitas com checklist (visita técnica, vistoria CAIXA, segurança, entrega):
     itens OK / não conforme / não se aplica, fotos, conclusão; não conformidade vira pendência.
   • Cronograma físico-financeiro: a partir das etapas da obra ou de um orçamento, distribui
     cada item nos meses (início e duração), mostra % e R$ por mês, curva S e imprime.
   • Reajuste de contrato: INCC, CUB, IPCA ou índice livre – valor reajustado, saldo a reajustar,
     histórico guardado na obra.
   ========================================================= */
(() => {
  const hoje = () => UI.today();
  const CHECK = {
    'Visita técnica': ['Obra limpa e organizada', 'Equipe no local conforme programado', 'Execução conforme projeto', 'Prumo, nível e esquadro conferidos', 'Materiais armazenados corretamente', 'Diário de obra em dia', 'Pendências anteriores resolvidas'],
    'Vistoria CAIXA (PLS)': ['Placa da obra instalada', 'Alvará e ART disponíveis na obra', 'Serviços da etapa concluídos', 'Fotos de todos os cômodos e fachada', 'Percentuais da PLS conferidos com o executado', 'Sem serviços fora do projeto aprovado', 'Acesso livre para o engenheiro da CAIXA'],
    'Segurança do trabalho (NR-18)': ['EPI em uso (capacete, bota, luva, óculos)', 'Cinto e linha de vida em trabalho em altura', 'Guarda-corpo em lajes e aberturas', 'Instalação elétrica provisória protegida', 'Andaimes travados e com piso completo', 'Escadas e rampas em bom estado', 'Extintor e kit de primeiros socorros', 'Área de vivência (banheiro, água, refeição)'],
    'Entrega da obra': ['Limpeza final', 'Portas e janelas funcionando', 'Pontos elétricos e disjuntores testados', 'Pontos hidráulicos e registros sem vazamento', 'Revestimentos sem trincas ou manchas', 'Pintura sem falhas', 'Manual do proprietário entregue', 'Chaves entregues', 'Termo de entrega assinado'],
    'Recebimento de material': ['Quantidade conforme pedido', 'Especificação/marca conforme cotação', 'Sem avarias', 'Nota fiscal conferida e anexada', 'Armazenado em local adequado']
  };
  const RES = [['ok', 'OK', 'ok'], ['nok', 'Não conforme', 'err'], ['na', 'Não se aplica', '']];

  Views.vistorias = {
    perm: 'obras.ver',
    st: { obra: '', tipo: '' },
    render(el) {
      const { esc, icon, date } = UI; const s = this.st;
      const L = Store.all('vistorias').filter(v => (!s.obra || v.obraId === s.obra) && (!s.tipo || v.tipo === s.tipo)).sort((a, b) => (b.data || '').localeCompare(a.data || ''));
      const nok = v => (v.checklist || []).filter(x => x.r === 'nok').length;
      const ag = Store.all('vistorias').filter(v => v.status === 'Agendada' && v.data >= hoje());
      el.innerHTML = `<div class="page-head"><div><h1>Vistorias e visitas</h1><p>Checklist na obra, com fotos, e o que não estiver conforme vira pendência</p></div><button class="btn primary" id="viNova">${icon('plus')} Nova vistoria</button></div>
        <div class="grid g4">${[['Agendadas', ag.length, ag[0] ? 'próxima ' + date(ag[0].data) : ''], ['Realizadas (30 dias)', Store.all('vistorias').filter(v => v.status === 'Realizada' && v.data >= Fiscal.addDays(hoje(), -30)).length, ''], ['Itens não conformes abertos', Store.all('vistorias').reduce((a, v) => a + (v.checklist || []).filter(x => x.r === 'nok' && !x.pendId).length, 0), 'sem pendência criada'], ['Conformidade média', UI.pct((() => { const T = Store.all('vistorias').flatMap(v => (v.checklist || []).filter(x => x.r === 'ok' || x.r === 'nok')); return T.length ? T.filter(x => x.r === 'ok').length / T.length * 100 : 0; })(), 0), 'itens OK ÷ avaliados']].map(k => `<div class="card kpi"><div class="lbl">${k[0]}</div><div class="val">${k[1]}</div><div class="sub">${k[2]}</div></div>`).join('')}</div>
        <div class="toolbar mt"><select class="select" id="viO"><option value="">Todas as obras</option>${Store.all('obras').map(o => `<option value="${o.id}" ${o.id === s.obra ? 'selected' : ''}>${o.id} · ${esc(o.nome)}</option>`).join('')}</select><select class="select" id="viT"><option value="">Todos os tipos</option>${Object.keys(CHECK).map(t => `<option ${t === s.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="card">${UI.table([{ h: 'ID', f: v => v.id }, { h: 'Data', f: v => date(v.data) + (v.hora ? ' ' + v.hora : '') }, { h: 'Vistoria', f: v => `<span class="plink" data-vi="${v.id}">${esc(v.tipo)}</span><div class="tiny muted">${esc((Store.get('pessoas', v.responsavelId) || {}).nome || '')}</div>` }, { h: 'Obra', f: v => UI.idLink(v.obraId) },
          { h: 'Resultado', f: v => v.status === 'Agendada' ? UI.badge('Agendada', 'info') : nok(v) ? UI.badge(nok(v) + ' não conforme(s)', 'err') : UI.badge('Tudo conforme', 'ok') }, { h: 'Fotos', f: v => (v.fotos || []).length || '—' }], L, { emptyMsg: 'Nenhuma vistoria ainda.' })}</div>`;
      UI.$('#viNova', el).onclick = () => this.editar(null, { obraId: s.obra });
      UI.$('#viO', el).onchange = e => { s.obra = e.target.value; App.refresh(); }; UI.$('#viT', el).onchange = e => { s.tipo = e.target.value; App.refresh(); };
      UI.$$('[data-vi]', el).forEach(b => b.onclick = () => this.editar(b.dataset.vi));
    },
    editar(id, preset = {}) {
      const { esc, icon } = UI; let v = id ? JSON.parse(JSON.stringify(Store.get('vistorias', id))) : Object.assign({ tipo: 'Visita técnica', data: hoje(), status: 'Realizada', checklist: [], fotos: [], responsavelId: (Auth.current() || {}).pessoaId || '' }, preset);
      if (!v.checklist.length) v.checklist = CHECK[v.tipo].map(item => ({ item, r: '', obs: '' }));
      const m = UI.modal({ title: id ? 'Vistoria ' + id : 'Nova vistoria', wide: true, body: `<div class="grid g4"><div class="field"><label>Tipo</label><select class="select" id="viTp">${Object.keys(CHECK).map(t => `<option ${t === v.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
          <div class="field"><label>Obra</label><select class="select" id="viOb"><option value=""></option>${Store.all('obras').map(o => `<option value="${o.id}" ${o.id === v.obraId ? 'selected' : ''}>${o.id} · ${esc(o.nome)}</option>`).join('')}</select></div>
          <div class="field"><label>Data e hora</label><div class="row" style="gap:4px"><input type="date" class="input" id="viDt" value="${v.data || ''}"><input type="time" class="input" id="viHr" value="${v.hora || ''}"></div></div>
          <div class="field"><label>Situação</label><select class="select" id="viSt">${['Agendada', 'Realizada'].map(x => `<option ${x === v.status ? 'selected' : ''}>${x}</option>`).join('')}</select></div></div>
        <div class="field"><label>Responsável</label><select class="select" id="viRe"><option value=""></option>${Store.all('pessoas').filter(p => p.tipo !== 'Cliente').map(p => `<option value="${p.id}" ${p.id === v.responsavelId ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select></div>
        <div id="viCk"></div><div class="row mt"><input class="input" id="viNovoIt" placeholder="Acrescentar item ao checklist"><button class="btn sm" id="viAddIt">${icon('plus')}</button></div>
        <div class="field mt"><label>Fotos</label><input type="file" class="input" id="viFt" multiple accept="image/*"><div class="tiny muted">${(v.fotos || []).length} foto(s) guardada(s)</div></div>
        <div class="field"><label>Conclusão / observações</label><textarea class="input" id="viCo" rows="2">${esc(v.conclusao || '')}</textarea></div>`,
        footer: `<button class="btn" data-close>Cancelar</button><button class="btn" id="viPr">${icon('printer')} Imprimir</button><button class="btn" id="viPend">${icon('alert-circle')} Criar pendências dos não conformes</button><button class="btn primary" id="viOk">${icon('save')} Salvar</button>` });
      const desenha = () => { m.$('#viCk').innerHTML = `<table class="t"><thead><tr><th>Item</th>${RES.map(r => `<th style="width:110px">${r[1]}</th>`).join('')}<th>Observação</th></tr></thead><tbody>${v.checklist.map((c, i) => `<tr><td>${esc(c.item)}${c.pendId ? ` <span class="tiny">→ ${c.pendId}</span>` : ''}</td>${RES.map(r => `<td style="text-align:center"><input type="radio" name="ck${i}" value="${r[0]}" ${c.r === r[0] ? 'checked' : ''} data-ck="${i}"></td>`).join('')}<td><input class="input sm" data-ob="${i}" value="${esc(c.obs || '')}"></td></tr>`).join('')}</tbody></table>`;
        m.el.querySelectorAll('[data-ck]').forEach(x => x.onchange = () => { v.checklist[+x.dataset.ck].r = x.value; }); m.el.querySelectorAll('[data-ob]').forEach(x => x.oninput = () => { v.checklist[+x.dataset.ob].obs = x.value; }); };
      desenha();
      m.$('#viTp').onchange = e => { v.tipo = e.target.value; if (!v.checklist.some(c => c.r)) { v.checklist = CHECK[v.tipo].map(item => ({ item, r: '', obs: '' })); desenha(); } };
      m.$('#viAddIt').onclick = () => { const t = m.$('#viNovoIt').value.trim(); if (!t) return; v.checklist.push({ item: t, r: '', obs: '' }); m.$('#viNovoIt').value = ''; desenha(); };
      const salvar = async () => {
        Object.assign(v, { tipo: m.$('#viTp').value, obraId: m.$('#viOb').value, data: m.$('#viDt').value, hora: m.$('#viHr').value, status: m.$('#viSt').value, responsavelId: m.$('#viRe').value, conclusao: m.$('#viCo').value });
        if (!v.obraId) { UI.toast('Escolha a obra', 'err'); return null; }
        const fs = [...m.$('#viFt').files]; if (fs.length) { const up = await Store.uploadFiles(fs, { obraId: v.obraId, pasta: 'VISTORIAS' }); v.fotos = (v.fotos || []).concat(up.map(a => a.id)); m.$('#viFt').value = ''; }
        if (id) Store.update('vistorias', id, v); else { const r = Store.insert('vistorias', v); id = r.id; v.id = id; } return v;
      };
      m.$('#viOk').onclick = async () => { if (await salvar()) { UI.toast('Vistoria salva: ' + id); m.close(); App.refresh(); } };
      m.$('#viPend').onclick = async () => { if (!(await salvar())) return; let n = 0; v.checklist.forEach(c => { if (c.r === 'nok' && !c.pendId) { const p = Store.insert('pendencias', { titulo: c.item + (c.obs ? ' – ' + c.obs : ''), obraId: v.obraId, responsavelId: v.responsavelId, prioridade: 'Alta', status: 'Aberta', prazo: Fiscal.addDays(hoje(), 7), descricao: `Não conforme na ${v.tipo} ${id} de ${UI.date(v.data)}.`, vistoriaId: id }); c.pendId = p.id; n++; } }); Store.update('vistorias', id, { checklist: v.checklist }); desenha(); UI.toast(n ? n + ' pendência(s) criada(s)' : 'Nenhum item não conforme sem pendência'); };
      m.$('#viPr').onclick = async () => { if (!(await salvar())) return; const o = Store.get('obras', v.obraId) || {};
        const fotos = await Promise.all((v.fotos || []).slice(0, 12).map(async a => { try { const b = await Store.Files.get(a); return b ? await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }) : ''; } catch (e) { return ''; } }));
        UI.print(`${UI.docHeader(v.tipo.toUpperCase(), id)}<h1>${esc(v.tipo)} – ${esc(o.nome || '')}</h1><p>${UI.date(v.data)} ${v.hora || ''} · Responsável: ${esc((Store.get('pessoas', v.responsavelId) || {}).nome || '')}</p>
          <table><thead><tr><th>Item</th><th>Resultado</th><th>Observação</th></tr></thead><tbody>${v.checklist.map(c => `<tr><td>${esc(c.item)}</td><td>${(RES.find(r => r[0] === c.r) || ['', '—'])[1]}</td><td>${esc(c.obs || '')}${c.pendId ? ' (pendência ' + c.pendId + ')' : ''}</td></tr>`).join('')}</tbody></table>
          ${v.conclusao ? `<h2>Conclusão</h2><p>${esc(v.conclusao)}</p>` : ''}${fotos.filter(Boolean).length ? `<h2>Fotos</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${fotos.filter(Boolean).map(f => `<img src="${f}" style="width:100%;border-radius:6px">`).join('')}</div>` : ''}
          <div class="sig"><div>${esc((Store.get('pessoas', v.responsavelId) || {}).nome || 'Responsável')}</div><div>${esc(Store.db.empresa.nome)}</div></div>`, v.tipo + ' ' + id); };
    }
  };

  /* ---------- Cronograma físico-financeiro ---------- */
  Views.cronograma = {
    perm: 'obras.ver',
    st: { obra: '', orc: '', fonte: 'etapas', meses: 6, inicio: UI.today().slice(0, 7) },
    itens() {
      const s = this.st; const o = Store.get('obras', s.obra);
      if (s.fonte === 'orc') { const orc = Store.get('orcamentos', s.orc); return orc ? (orc.itens || []).map((i, k) => ({ k: 'i' + k, nome: i.desc, valor: (+i.qtd || 0) * (+i.unit || 0) })).filter(x => x.valor) : []; }
      return o ? Store.where('etapas', e => e.obraId === o.id).sort((a, b) => a.ordem - b.ordem).map(e => ({ k: e.id, nome: e.nome, valor: +e.valor || 0 })) : [];
    },
    plano() { const s = this.st; const key = s.fonte === 'orc' ? 'orc:' + s.orc : 'obra:' + s.obra; Store.db.cronFF = Store.db.cronFF || {}; return (Store.db.cronFF[key] = Store.db.cronFF[key] || { meses: s.meses, inicio: s.inicio, dist: {} }); },
    render(el) {
      const { esc, money, icon } = UI; const s = this.st; const G = Views.relatorios.graf;
      if (!s.obra) s.obra = (Store.all('obras').find(o => o.status === 'Em execução') || Store.all('obras')[0] || {}).id || '';
      const P = this.plano(); const N = +P.meses || 6; const I = this.itens(); const total = I.reduce((a, x) => a + x.valor, 0);
      const meses = Array.from({ length: N }, (_, i) => Enq.addM(P.inicio, i));
      I.forEach((x, i) => { if (!P.dist[x.k]) { const ini = Math.min(N - 1, Math.floor(i * N / Math.max(1, I.length))); const dur = Math.max(1, Math.ceil(N / Math.max(1, I.length)) + 1); P.dist[x.k] = { ini, dur: Math.min(dur, N - ini) }; } });
      const val = (x, m) => { const d = P.dist[x.k]; return m >= d.ini && m < d.ini + d.dur ? x.valor / d.dur : 0; };
      const porMes = meses.map((_, m) => I.reduce((a, x) => a + val(x, m), 0)); let ac = 0; const acum = porMes.map(v => (ac += v));
      el.innerHTML = `<div class="page-head"><div><h1>Cronograma físico-financeiro</h1><p>Distribua cada etapa (ou item do orçamento) nos meses e veja o desembolso e a curva S</p></div><button class="btn" id="cfPr">${icon('printer')} Imprimir</button></div>
        <div class="toolbar"><select class="select" id="cfF"><option value="etapas" ${s.fonte === 'etapas' ? 'selected' : ''}>Etapas da obra</option><option value="orc" ${s.fonte === 'orc' ? 'selected' : ''}>Itens de um orçamento</option></select>
          ${s.fonte === 'orc' ? `<select class="select" id="cfOr">${Store.all('orcamentos').map(o => `<option value="${o.id}" ${o.id === s.orc ? 'selected' : ''}>${o.id} · ${esc(o.titulo || '')}</option>`).join('')}</select>` : `<select class="select" id="cfO">${Store.all('obras').map(o => `<option value="${o.id}" ${o.id === s.obra ? 'selected' : ''}>${o.id} · ${esc(o.nome)}</option>`).join('')}</select>`}
          <label class="tiny muted">Início</label><input type="month" class="input" id="cfI" value="${P.inicio}"><label class="tiny muted">Meses</label><input type="number" min="1" max="48" class="input sm" id="cfN" value="${N}" style="width:70px"></div>
        ${I.length ? `<div class="card" style="overflow:auto"><table class="t"><thead><tr><th>Item</th><th>Valor</th><th>Peso</th><th>Início</th><th>Duração</th>${meses.map(m => `<th>${Calc.mesLabel(m).slice(0, 3)}/${m.slice(2, 4)}</th>`).join('')}</tr></thead><tbody>
          ${I.map(x => { const d = P.dist[x.k]; return `<tr><td>${esc(x.nome)}</td><td>${money(x.valor)}</td><td>${UI.pct(total ? x.valor / total * 100 : 0)}</td><td><select class="select sm" data-ini="${x.k}">${meses.map((m, i) => `<option value="${i}" ${i === d.ini ? 'selected' : ''}>${Calc.mesLabel(m).slice(0, 3)}</option>`).join('')}</select></td><td><input type="number" min="1" class="input sm" style="width:60px" data-dur="${x.k}" value="${d.dur}"></td>${meses.map((_, m) => { const v = val(x, m); return `<td style="${v ? 'background:rgba(37,99,235,.12)' : ''};text-align:right;white-space:nowrap" class="tiny">${v ? money(v) : ''}</td>`; }).join('')}</tr>`; }).join('')}
          </tbody><tfoot><tr><td><b>Desembolso no mês</b></td><td><b>${money(total)}</b></td><td></td><td></td><td></td>${porMes.map(v => `<td class="tiny" style="text-align:right"><b>${money(v)}</b></td>`).join('')}</tr><tr><td>% no mês / acumulado</td><td></td><td></td><td></td><td></td>${porMes.map((v, i) => `<td class="tiny" style="text-align:right">${UI.pct(total ? v / total * 100 : 0)}<br><b>${UI.pct(total ? acum[i] / total * 100 : 0)}</b></td>`).join('')}</tr></tfoot></table></div>
        <div class="card mt"><div class="card-h"><h3>Curva S (acumulado) e desembolso mensal</h3></div><div class="card-b">${G.linha(meses.map(m => Calc.mesLabel(m).slice(0, 3)), [{ nome: '% acumulado', cor: '#119a09', vals: acum.map(v => total ? v / total * 100 : 0) }, { nome: '% do mês', cor: '#2563eb', vals: porMes.map(v => total ? v / total * 100 : 0) }])}</div></div>` : UI.empty(s.fonte === 'orc' ? 'Escolha um orçamento com itens.' : 'Esta obra não tem etapas com valor. Cadastre as etapas na obra ou use um orçamento.', 'calendar-range')}`;
      const re = () => { Store.save(); App.refresh(); };
      UI.$('#cfF', el).onchange = e => { s.fonte = e.target.value; if (s.fonte === 'orc' && !s.orc) s.orc = (Store.all('orcamentos')[0] || {}).id || ''; App.refresh(); };
      const so = UI.$('#cfO', el); if (so) so.onchange = e => { s.obra = e.target.value; App.refresh(); };
      const sr = UI.$('#cfOr', el); if (sr) sr.onchange = e => { s.orc = e.target.value; App.refresh(); };
      UI.$('#cfI', el).onchange = e => { P.inicio = e.target.value || P.inicio; re(); };
      UI.$('#cfN', el).onchange = e => { P.meses = Math.max(1, Math.min(48, +e.target.value || 6)); Object.values(P.dist).forEach(d => { d.ini = Math.min(d.ini, P.meses - 1); d.dur = Math.min(d.dur, P.meses - d.ini); }); re(); };
      UI.$$('[data-ini]', el).forEach(x => x.onchange = () => { const d = P.dist[x.dataset.ini]; d.ini = +x.value; d.dur = Math.min(d.dur, N - d.ini); re(); });
      UI.$$('[data-dur]', el).forEach(x => x.onchange = () => { const d = P.dist[x.dataset.dur]; d.dur = Math.max(1, Math.min(N - d.ini, +x.value || 1)); re(); });
      UI.$('#cfPr', el).onclick = () => { const t = el.querySelector('table'); if (!t) return; const o = Store.get('obras', s.obra) || {}; const c2 = t.cloneNode(true); c2.querySelectorAll('select,input').forEach(i => { const sp = document.createElement('span'); sp.textContent = i.tagName === 'SELECT' ? i.options[i.selectedIndex].text : i.value; i.replaceWith(sp); });
        UI.print(`${UI.docHeader('CRONOGRAMA FÍSICO-FINANCEIRO', s.fonte === 'orc' ? s.orc : s.obra)}<h1>Cronograma físico-financeiro${s.fonte === 'orc' ? '' : ' – ' + esc(o.nome || '')}</h1><div style="font-size:9px">${c2.outerHTML}</div>${G.linha(meses.map(m => Calc.mesLabel(m).slice(0, 3)), [{ nome: '% acumulado', cor: '#119a09', vals: acum.map(v => total ? v / total * 100 : 0) }])}`, 'Cronograma'); };
    }
  };

  /* ---------- Reajuste de contrato (índices buscados sozinhos) ---------- */
  const IDX = [['inccdi', 'INCC-DI (FGV)'], ['inccm', 'INCC-M (FGV)'], ['cub', 'CUB/m² R8-N Sinduscon-MG'], ['ipca', 'IPCA (IBGE)'], ['igpm', 'IGP-M (FGV)'], ['inpc', 'INPC (IBGE)'], ['outro', 'Outro (digitar a variação)']];
  Views.reajuste = {
    perm: 'contratos',
    st: { obra: '', idx: 'inccdi', de: '', ate: '' },
    render(el) {
      const { esc, money, icon, date } = UI; const s = this.st;
      if (!s.obra) s.obra = (Store.all('obras').find(o => +o.valorContrato && ['Contratada', 'Em execução'].includes(o.status)) || {}).id || '';
      const o = Store.get('obras', s.obra) || {}; const m = o.id ? Calc.obra(o) : null; const H = o.reajustes || [];
      const saldo = o.id ? Math.max(0, (+o.valorContrato || 0) - m.fin.receitaPaga) : 0;
      const base = s.de || ((o.dataContrato || o.dataInicio || '').slice(0, 7)) || Enq.addM(UI.today().slice(0, 7), -12);
      const D = Indices.dados; const ult = s.idx === 'cub' ? (Indices.cubHist().slice(-1)[0] || [])[0] : (Indices.ultimo(s.idx) || [])[0];
      const ac = s.idx === 'outro' ? null : Indices.acumulado(s.idx, base, s.ate || '');
      // tabela das últimas variações do índice escolhido
      const L = s.idx === 'cub' ? Indices.cubHist().slice(-12).map((h, i, a) => [h[0], i ? (h[1] / a[i - 1][1] - 1) * 100 : null, h[1]]) : s.idx !== 'outro' ? ((((D || {}).s || {})[s.idx]) || []).slice(-12).map(x => [x[0], x[1]]) : [];
      el.innerHTML = `<div class="page-head"><div><h1>Reajuste de contrato</h1><p>Os índices vêm sozinhos do Banco Central (INCC, IPCA, IGP-M, INPC) e da tabela oficial do Sinduscon-MG (CUB)</p></div><button class="btn" id="rjAt">${icon('refresh-cw')} Buscar índices agora</button></div>
        <div class="alert ${D ? 'info' : 'warn'}">${icon('database')}<div>${D ? `Índices atualizados ${new Date(D.em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} – Banco Central (SGS).${(D.erros || []).length ? ' Falhou agora: ' + D.erros.join(', ') + ' (usando a última cópia).' : ''}` : 'Buscando os índices no Banco Central…'}</div></div>
        <div class="toolbar"><select class="select" id="rjO"><option value="">— escolha a obra —</option>${Store.all('obras').filter(x => +x.valorContrato).map(x => `<option value="${x.id}" ${x.id === s.obra ? 'selected' : ''}>${x.id} · ${esc(x.nome)}</option>`).join('')}</select></div>
        <div class="grid g2"><div class="card"><div class="card-h"><h3>Calcular</h3></div><div class="card-b">
          <div class="grid g2"><div class="field"><label>Índice</label><select class="select" id="rjI">${IDX.map(x => `<option value="${x[0]}" ${x[0] === s.idx ? 'selected' : ''}>${x[1]}</option>`).join('')}</select></div>
            <div class="field"><label>Valor a reajustar</label><input type="number" step="any" class="input" id="rjV" value="${saldo ? saldo.toFixed(2) : (+o.valorContrato || 0)}"><div class="tiny muted">saldo do contrato a receber: ${money(saldo)}</div></div>
            <div class="field"><label>Mês da data-base</label><input type="month" class="input" id="rjDe" value="${base}"><div class="tiny muted">assinatura: ${date(o.dataContrato) || '—'}</div></div><div class="field"><label>Até o mês</label><input type="month" class="input" id="rjAte" value="${s.ate || ult || ''}"><div class="tiny muted">último publicado: ${ult ? Calc.mesLabel(ult) : '—'}</div></div>
            <div class="field"><label>Variação (preenchida sozinha)</label><input type="number" step="any" class="input" id="rjP" value="${ac ? ac.pct.toFixed(4) : ''}" ${s.idx === 'outro' ? 'placeholder="digite a variação %"' : ''}></div><div class="field"><label>Data do reajuste</label><input type="date" class="input" id="rjD" value="${hoje()}"></div></div>
          <div class="alert info mt" id="rjR"></div>
          ${ac && ac.meses ? `<p class="tiny muted">${s.idx === 'cub' ? `CUB R8-N ${Calc.mesLabel(ac.meses[0])}: ${money(ac.de[1])} → ${Calc.mesLabel(ac.meses[1])}: ${money(ac.ate[1])}` : `Meses somados (juros compostos): ${ac.meses.map(x => Calc.mesLabel(x)).join(', ')}`}</p>` : s.idx !== 'outro' ? `<p class="tiny" style="color:var(--warn)">${s.idx === 'cub' && Indices.cubHist().length && base < Indices.cubHist()[0][0] ? 'O histórico do CUB guardado começa em ' + Calc.mesLabel(Indices.cubHist()[0][0]) + ' – o servidor baixa as tabelas antigas e o app completa sozinho.' : 'Ainda não há variação publicada depois da data-base.'}</p>` : ''}
          <div class="row mt"><button class="btn primary" id="rjOk" ${o.id ? '' : 'disabled'}>${icon('save')} Guardar reajuste na obra</button><button class="btn" id="rjPr">${icon('printer')} Memória de cálculo</button></div></div></div>
          <div class="stack"><div class="card"><div class="card-h"><h3>${esc((IDX.find(x => x[0] === s.idx) || [])[1])} – últimos meses</h3></div>${L.length ? UI.table([{ h: 'Mês', f: x => Calc.mesLabel(x[0]) }, { h: 'Variação no mês', f: x => x[1] == null ? '—' : UI.pct(x[1], 2) }].concat(s.idx === 'cub' ? [{ h: 'R8-N (R$/m²)', f: x => money(x[2]) }] : []), L.slice().reverse()) : '<div class="card-b tiny muted">—</div>'}</div>
          <div class="card"><div class="card-h"><h3>Histórico da obra</h3></div>${UI.table([{ h: 'Data', f: r => date(r.data) }, { h: 'Índice', f: r => esc(r.indice) }, { h: 'Período', f: r => r.de ? Calc.mesLabel(r.de) + ' → ' + Calc.mesLabel(r.ate || '') : '' }, { h: 'Variação', f: r => UI.pct(r.pct, 2) }, { h: 'Base', f: r => money(r.base) }, { h: 'Reajuste', f: r => money(r.valor) }], H.slice().reverse(), { emptyMsg: 'Nenhum reajuste guardado.' })}
            ${H.length ? `<div class="card-b tiny">Total reajustado: <b>${money(H.reduce((a, r) => a + r.valor, 0))}</b> · contrato original ${money(o.valorContrato)}</div>` : ''}</div></div></div>`;
      UI.$('#rjO', el).onchange = e => { s.obra = e.target.value; s.de = ''; App.refresh(); };
      UI.$('#rjI', el).onchange = e => { s.idx = e.target.value; s.ate = ''; App.refresh(); };
      UI.$('#rjDe', el).onchange = e => { s.de = e.target.value; App.refresh(); };
      UI.$('#rjAte', el).onchange = e => { s.ate = e.target.value; App.refresh(); };
      UI.$('#rjAt', el).onclick = async () => { await Indices.atualizar(true); await Indices.cubAutomatico(); UI.toast('Índices atualizados'); App.refresh(); };
      if (!D) Indices.atualizar(false).then(() => { if (location.hash.startsWith('#/reajuste')) App.refresh(); }).catch(() => {});
      const calc = () => { const v = +UI.$('#rjV', el).value || 0, p0 = UI.$('#rjP', el).value; if (p0 === '') return null; const pct = +p0; return { base: v, pct, valor: v * pct / 100, novo: v * (1 + pct / 100), indice: (IDX.find(x => x[0] === s.idx) || [])[1], de: UI.$('#rjDe', el).value, ate: UI.$('#rjAte', el).value, data: UI.$('#rjD', el).value, fonte: s.idx === 'cub' ? 'Sinduscon-MG' : s.idx === 'outro' ? 'digitado' : 'Banco Central (SGS)' }; };
      const mostra = () => { const r = calc(); UI.$('#rjR', el).innerHTML = r ? `${icon('trending-up')}<div>Variação <b>${UI.pct(r.pct, 3)}</b> · reajuste <b>${money(r.valor)}</b> · novo valor <b>${money(r.novo)}</b></div>` : `${icon('calculator')}<div>Sem variação para calcular.</div>`; };
      mostra(); ['#rjV', '#rjP'].forEach(k => UI.$(k, el).oninput = mostra);
      UI.$('#rjOk', el).onclick = () => { const r = calc(); if (!r) return UI.toast('Sem variação para calcular', 'err'); Store.update('obras', o.id, { reajustes: H.concat(r) }); UI.toast('Reajuste guardado na obra'); App.refresh(); };
      UI.$('#rjPr', el).onclick = () => { const r = calc(); if (!r) return UI.toast('Sem variação para calcular', 'err');
        UI.print(`${UI.docHeader('MEMÓRIA DE CÁLCULO DE REAJUSTE', o.id || '')}<h1>Reajuste – ${esc(o.nome || '')}</h1><table><tbody><tr><th>Índice</th><td>${esc(r.indice)} – fonte: ${esc(r.fonte)}</td></tr><tr><th>Data-base</th><td>${r.de ? Calc.mesLabel(r.de) : '—'}</td></tr><tr><th>Até</th><td>${r.ate ? Calc.mesLabel(r.ate) : '—'}</td></tr><tr><th>Variação acumulada</th><td>${UI.pct(r.pct, 4)}</td></tr><tr><th>Valor-base</th><td>${money(r.base)}</td></tr><tr><th>Reajuste</th><td>${money(r.valor)}</td></tr><tr><th>Novo valor</th><td><b>${money(r.novo)}</b></td></tr></tbody></table>
          ${L.length ? `<h2>Variações mensais do índice</h2><table><thead><tr><th>Mês</th><th>Variação</th></tr></thead><tbody>${L.filter(x => (!r.de || x[0] > r.de) && (!r.ate || x[0] <= r.ate)).map(x => `<tr><td>${Calc.mesLabel(x[0])}</td><td>${x[1] == null ? '—' : UI.pct(x[1], 2)}</td></tr>`).join('')}</tbody></table>` : ''}
          <p>Fórmula: R = V × [Π(1 + vᵢ) − 1], variações mensais acumuladas de forma composta, conforme cláusula de reajuste do contrato.</p><div class="sig"><div>${esc(Store.db.empresa.nome)}</div><div>Contratante</div></div>`, 'Reajuste ' + (o.id || '')); };
    }
  };
})();
