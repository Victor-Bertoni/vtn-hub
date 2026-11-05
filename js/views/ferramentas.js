/* =========================================================
   FERRAMENTAS DE GESTÃO
   - Alertas de documentos e prazos (alvará, ART, PLS, compras, caixa) no painel
   - Fluxo de caixa projetado por obra (cronograma do PCI × liberações)
   - Pró-labore, comissões e distribuição de lucros
   - Compras e cotações (comparar fornecedores e gerar a despesa)
   - Funil comercial (orçamento → proposta → contrato)
   - Curva ABC do orçamento
   - Diário de obra com fotos (RDO pelo celular) e relatório fotográfico da PLS
   ========================================================= */
window.Ferramentas = (() => {
  const hoje = () => UI.today();
  const ativa = o => !['Concluída', 'Cancelada', 'Prospecção', 'Orçamento'].includes(o.status);
  const addMes = (iso, n) => { const d = new Date((iso || hoje()).slice(0, 7) + '-15T12:00:00'); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 7); };
  const mesDe = iso => (iso || '').slice(0, 7);

  /* ---------- alertas do painel ---------- */
  function alertas() {
    const out = [], h = hoje();
    Store.all('obras').forEach(o => {
      const nome = o.nome || o.id;
      if (ativa(o)) {
        const alv = o.alvaraVigencia || (o.pci || {}).alvaraValidade;
        if (alv) { const d = UI.daysBetween(h, alv); if (d < 0) out.push(['err', 'file-warning', `${nome}: alvará vencido há ${-d} dias`, o.id]); else if (d <= 30) out.push(['warn', 'file-clock', `${nome}: alvará vence em ${d} dias (${UI.date(alv)})`, o.id]); }
        if (o.dataPrevTermino && !o.dataTermino) { const d = UI.daysBetween(h, o.dataPrevTermino); if (d >= 0 && d <= 15) out.push(['warn', 'flag', `${nome}: término previsto em ${d} dias`, o.id]); }
        if (o.status === 'Em execução' && (o.pci || o.valorFinanciado)) {
          const ms = Store.where('medicoes', m => m.obraId === o.id).sort((a, b) => (a.data || '').localeCompare(b.data || ''));
          const u = ms[ms.length - 1]; const desde = u ? u.data : o.dataInicio;
          if (desde) { const d = UI.daysBetween(desde, h); if (d > 35) out.push(['warn', 'ruler', `${nome}: ${u ? 'última PLS' : 'início da obra'} há ${d} dias – hora de medir`, o.id]); }
          if (u && u.situacao && /risco|Atrasada|Paralisada/.test(u.situacao)) out.push(['err', 'trending-down', `${nome}: obra ${u.situacao.toLowerCase()} na última PLS`, o.id]);
        }
      }
      if (o.status === 'Concluída' && (o.art || '').trim() && !o.artBaixada) out.push(['warn', 'stamp', `${nome}: obra concluída sem baixa da ART`, o.id]);
    });
    Store.all('compras').forEach(c => {
      if (c.status === 'Cotando' && c.data && UI.daysBetween(c.data, h) > 7) out.push(['warn', 'shopping-cart', `Cotação parada há ${UI.daysBetween(c.data, h)} dias: ${c.titulo}`, c.id]);
      if (['Aprovado', 'Comprado'].includes(c.status) && c.previsao && c.previsao < h) out.push(['warn', 'truck', `Entrega atrasada: ${c.titulo}`, c.id]);
    });
    if (Auth.can('financeiro.ver') && Views.financeiro.indiceCaixa) {
      const k = Views.financeiro.indiceCaixa(null);
      if (k.imediata != null && k.imediata < 1) out.push(['err', 'gauge', `Índice de caixa ${String(Math.round(k.imediata * 100) / 100).replace('.', ',')}: o caixa não cobre as contas dos próximos 30 dias`, null]);
      if (k.minimo[1] < 0) out.push(['err', 'trending-down', `Caixa projetado fica negativo em ${UI.date(k.minimo[0])} (${UI.money(k.minimo[1])})`, null]);
    }
    return out;
  }

  /* ---------- fluxo de caixa projetado por obra ---------- */
  function fluxoObra(o) {
    const p = o.pci || {}; const k = window.PCI && o.pci ? PCI.contas(o, PCI.dados(o)) : null;
    const custo = +o.custoPrevisto || (k ? k.total : 0);
    const receita = +o.valorFinanciado || +o.valorContrato || 0;
    const caixa = !!(o.valorFinanciado || o.pci);
    const inicio = o.dataInicio || o.dataContrato || hoje();
    let crono = (p.cronograma || []).map(Number);
    if (!crono.length) { let n = 12; if (o.dataInicio && o.dataPrevTermino) n = Math.max(1, Math.round(UI.daysBetween(o.dataInicio, o.dataPrevTermino) / 30)); crono = Array.from({ length: n }, (_, i) => Math.round((i + 1) / n * 10000) / 100); }
    const e0 = +p.etapa0 || 0;
    const L = Store.where('lancamentos', l => l.obraId === o.id);
    const m0 = mesDe(inicio), atual = mesDe(hoje()), ult = addMes(m0, crono.length + 1);
    const meses = []; for (let m = addMes(m0, -1); m <= ult; m = addMes(m, 1)) meses.push(m);
    L.forEach(l => { const m = mesDe(l.dataPagamento || l.vencimento || l.data); if (m && !meses.includes(m)) meses.push(m); });
    meses.sort();
    let saldo = 0;
    const linhas = meses.map(m => {
      const e = Math.round((new Date(m + '-15') - new Date(m0 + '-15')) / (30.44 * 86400000)) + 1;   // etapa da obra nesse mês
      const pct = e >= 1 && e <= crono.length ? crono[e - 1] - (e > 1 ? crono[e - 2] : e0) : 0;
      const pctAnt = e - 1 >= 1 && e - 1 <= crono.length ? crono[e - 2] - (e > 2 ? crono[e - 3] : e0) : 0;
      const prevSaida = pct / 100 * custo;
      const prevEntrada = caixa ? pctAnt / 100 * receita : pct / 100 * receita;   // CAIXA libera no mês seguinte à medição
      const pagos = L.filter(l => l.status === 'pago' && mesDe(l.dataPagamento || l.data) === m);
      const realE = pagos.filter(l => l.tipo === 'receita').reduce((a, l) => a + (+l.valor || 0), 0), realS = pagos.filter(l => l.tipo === 'despesa').reduce((a, l) => a + (+l.valor || 0), 0);
      const passado = m < atual;
      const ent = passado ? realE : Math.max(realE, prevEntrada), sai = passado ? realS : Math.max(realS, prevSaida);
      saldo += ent - sai;
      return { m, etapa: e, pct, prevEntrada, prevSaida, realE, realS, ent, sai, saldo, passado };
    }).filter(x => x.prevEntrada || x.prevSaida || x.realE || x.realS || x.m === atual);
    const minimo = linhas.reduce((a, x) => x.saldo < a.saldo ? x : a, { saldo: 0, m: null });
    return { linhas, custo, receita, caixa, necessidade: Math.max(0, -minimo.saldo), mesCritico: minimo.m, temCrono: !!(p.cronograma || []).length };
  }

  /* ---------- curva ABC ---------- */
  function abc(orcId) {
    const o = Store.get('orcamentos', orcId); if (!o) return;
    const { esc, money, pct } = UI;
    const its = (o.itens || []).map(i => Object.assign({}, i, { tot: (+i.qtd || 0) * (+i.unit || 0) })).filter(i => i.tot > 0).sort((a, b) => b.tot - a.tot);
    const T = its.reduce((a, i) => a + i.tot, 0); let ac = 0;
    its.forEach(i => { i.p = T ? i.tot / T * 100 : 0; ac += i.p; i.ac = ac; i.cl = i.ac - i.p < 80 ? 'A' : i.ac - i.p < 95 ? 'B' : 'C'; });
    const n = c => its.filter(i => i.cl === c), soma = c => n(c).reduce((a, i) => a + i.tot, 0);
    UI.modal({ title: 'Curva ABC – ' + esc(o.titulo || o.id), wide: true, body: `
      <div class="alert info mb">${UI.icon('info')}<div>Os itens <b>A</b> somam cerca de 80% do custo: é neles que vale negociar preço, cotar com mais fornecedores e controlar a compra. <b>B</b> fica na faixa de 80–95% e <b>C</b> é o resto.</div></div>
      <div class="grid g3 mb">${['A', 'B', 'C'].map(c => `<div class="card kpi ${c === 'A' ? 'err' : c === 'B' ? 'warn' : 'ok'}"><div class="lbl">Classe ${c}</div><div class="val">${n(c).length} itens</div><div class="sub">${money(soma(c))} · ${pct(T ? soma(c) / T * 100 : 0, 1)} do total</div></div>`).join('')}</div>
      <div class="table-wrap"><table class="t"><thead><tr><th>#</th><th>Item</th><th class="num">Total</th><th class="num">% do custo</th><th class="num">% acumulado</th><th>Classe</th></tr></thead><tbody>
        ${its.map((i, k) => `<tr><td>${k + 1}</td><td>${esc(i.desc)}</td><td class="num">${money(i.tot)}</td><td class="num">${pct(i.p, 2)}</td><td class="num">${pct(i.ac, 1)}</td><td>${UI.badge(i.cl, i.cl === 'A' ? 'err' : i.cl === 'B' ? 'warn' : 'ok')}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Orçamento sem itens com valor.</td></tr>'}
      </tbody></table></div>`, footer: '<button class="btn" data-close>Fechar</button>' });
  }

  /* ---------- fotos: reduzir antes de enviar e montar o relatório fotográfico ---------- */
  function reduzir(file, max = 1600, q = 0.82) {
    return new Promise(res => {
      if (!/^image\//.test(file.type) || /gif|svg/.test(file.type)) return res(file);
      const img = new Image(); const u = URL.createObjectURL(file);
      img.onload = () => { const s = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        c.toBlob(b => res(b ? new File([b], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file), 'image/jpeg', q); };
      img.onerror = () => { URL.revokeObjectURL(u); res(file); }; img.src = u;
    });
  }
  async function dataUrl(id, max = 900) {
    try { const b = await Store.Files.get(id); if (!b) return null; const f = new File([b], 'f', { type: b.type || 'image/jpeg' }); const r = await reduzir(f, max, 0.78);
      return await new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => ok(null); fr.readAsDataURL(r); }); } catch (e) { return null; }
  }
  const fotosDaObra = obraId => Store.where('arquivos', a => a.obraId === obraId && (/^image\//.test(a.mime || '') || /\.(jpe?g|png|webp|heic)$/i.test(a.nome || '')) && a.temBlob !== false)
    .sort((a, b) => (b.data || '').localeCompare(a.data || '') || b.id.localeCompare(a.id));
  // escolhe as fotos do relatório: devolve [{id, desc}] ou null (sem relatório)
  function escolherFotos(obraId, desde) {
    return new Promise(res => {
      const fs = fotosDaObra(obraId); const { esc, icon } = UI;
      if (!fs.length) { UI.toast('Esta obra ainda não tem fotos. Envie pelo Diário de obra ou em Documentos.', 'err'); return res([]); }
      const marcar = new Set(fs.filter(f => !desde || (f.data || '') >= desde).slice(0, 12).map(f => f.id));
      if (marcar.size < 12) fs.slice(0, 12).forEach(f => marcar.size < 12 && marcar.add(f.id));
      const m = UI.modal({ title: 'Relatório fotográfico', wide: true, body: `<div class="alert info mb">${icon('camera')}<div>Marque as fotos (a CAIXA pede no mínimo <b>12</b>) e escreva o que cada uma mostra. Fotos do diário e dos documentos da obra.</div></div>
        <div class="row mb"><b id="rfN"></b><button class="btn sm ghost" id="rfTodas">Marcar todas</button><button class="btn sm ghost" id="rfNenhuma">Desmarcar todas</button></div>
        <div class="grid g3" id="rfGrade">${fs.map(f => `<label class="card" style="padding:8px;cursor:pointer"><div class="row" style="gap:6px"><input type="checkbox" data-f="${f.id}" ${marcar.has(f.id) ? 'checked' : ''}><span class="tiny muted">${UI.date(f.data)} · ${esc(f.nome)}</span></div>
          <div data-th="${f.id}" style="height:120px;background:var(--bg-2,#f1f5f9);border-radius:6px;margin:6px 0;display:flex;align-items:center;justify-content:center" class="tiny muted">carregando…</div>
          <input class="input" data-d="${f.id}" placeholder="Descrever foto" value="${esc(f.descricao || '')}"></label>`).join('')}</div>`,
        footer: `<button class="btn" id="rfSem">Sem fotos</button><button class="btn primary" id="rfOk">${icon('check')} Usar fotos marcadas</button>` });
      const conta = () => { const n = m.el.querySelectorAll('[data-f]:checked').length; m.$('#rfN').textContent = n + ' foto(s) marcada(s)' + (n < 12 ? ' – a CAIXA pede no mínimo 12' : ''); m.$('#rfN').style.color = n < 12 ? 'var(--err)' : ''; };
      m.el.querySelectorAll('[data-f]').forEach(c => c.onchange = conta); conta();
      m.$('#rfTodas').onclick = () => { m.el.querySelectorAll('[data-f]').forEach(c => c.checked = true); conta(); };
      m.$('#rfNenhuma').onclick = () => { m.el.querySelectorAll('[data-f]').forEach(c => c.checked = false); conta(); };
      fs.slice(0, 60).forEach(async f => { const u = await dataUrl(f.id, 360); const el = m.el.querySelector(`[data-th="${f.id}"]`); if (el) el.innerHTML = u ? `<img src="${u}" style="max-width:100%;max-height:120px;border-radius:6px">` : 'sem prévia'; });
      let feito = false; const fim = v => { if (feito) return; feito = true; m.close(); res(v); };
      m.$('#rfSem').onclick = () => fim([]);
      m.$('#rfOk').onclick = () => fim([...m.el.querySelectorAll('[data-f]:checked')].map(c => { const id = c.dataset.f; const d = m.el.querySelector(`[data-d="${id}"]`).value.trim(); if (d) Store.update('arquivos', id, { descricao: d }); return { id, desc: d }; }));
      m.el.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => fim(null)));
    });
  }
  async function paginaFotos(lista, titulo) {
    if (!lista || !lista.length) return '';
    const imgs = []; for (const f of lista) imgs.push({ src: await dataUrl(f.id, 900), desc: f.desc || (Store.get('arquivos', f.id) || {}).nome || '' });
    return `<div style="page-break-before:always"></div><div class="cx"><div class="sec">Relatório fotográfico${titulo ? ' – ' + UI.esc(titulo) : ''}</div>
      <table>${imgs.reduce((a, x, i) => (i % 2 ? a[a.length - 1].push(x) : a.push([x]), a), []).map(par => `<tr>${par.map(x => `<td style="width:50%;text-align:center;padding:4px">${x.src ? `<img src="${x.src}" style="max-width:100%;max-height:300px">` : '<i>foto indisponível</i>'}<div style="text-align:left;font-size:8pt;margin-top:2px">${UI.esc(x.desc)}</div></td>`).join('')}${par.length < 2 ? '<td></td>' : ''}</tr>`).join('')}</table></div>`;
  }

  /* ---------- diário de obra (RDO) com fotos ---------- */
  async function editarDiario(id, obraId) {
    const x = id ? JSON.parse(JSON.stringify(Store.get('diario', id))) : { obraId, data: hoje(), autorId: (Auth.current() || {}).pessoaId, fotoIds: [] };
    const o = Store.get('obras', x.obraId || obraId); const { esc, icon } = UI; const ed = Auth.can('obras.editar');
    const pessoas = Store.all('pessoas').filter(p => p.tipo !== 'Cliente').sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
    const CLIMA = ['Ensolarado', 'Nublado', 'Chuvoso', 'Chuva forte (parado)', '-'];
    const sel = (n, l, v) => `<select class="select" name="${n}"><option value=""></option>${l.map(c => `<option ${c === v ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>`;
    const m = UI.modal({ title: (id ? 'Diário ' + id : 'Diário de obra') + ' · ' + esc((o || {}).nome || ''), wide: true, body: `
      <div class="form">
        <div class="field"><label>Data</label><input class="input" type="date" name="data" value="${esc(x.data || '')}"></div>
        <div class="field"><label>Autor</label><select class="select" name="autorId"><option value=""></option>${pessoas.map(p => `<option value="${p.id}" ${p.id === x.autorId ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select></div>
        <div class="field"><label>Clima de manhã</label>${sel('clima', CLIMA, x.clima)}</div><div class="field"><label>Clima à tarde</label>${sel('climaTarde', CLIMA, x.climaTarde)}</div>
        <div class="field"><label>Efetivo (pessoas na obra)</label><input class="input" type="number" name="efetivo" value="${esc(x.efetivo ?? '')}"></div>
        <div class="field"><label>Equipe / empreiteiros</label><input class="input" name="equipe" value="${esc(x.equipe || '')}" placeholder="ex.: 2 pedreiros, 1 servente, eletricista"></div>
        <div class="field full"><label>Serviços executados *</label><textarea class="input" name="texto" rows="4">${esc(x.texto || '')}</textarea></div>
        <div class="field full"><label>Ocorrências / problemas</label><textarea class="input" name="ocorrencias" rows="2">${esc(x.ocorrencias || '')}</textarea></div>
        <div class="field full"><label>Materiais recebidos / faltando</label><textarea class="input" name="materiais" rows="2">${esc(x.materiais || '')}</textarea></div>
      </div>
      <h3 class="mb mt2">Fotos do dia</h3>
      <div class="grid g4" id="dFotos">${(x.fotoIds || []).map(f => `<div data-th="${f}" class="tiny muted" style="height:110px;display:flex;align-items:center;justify-content:center;background:var(--bg-2,#f1f5f9);border-radius:8px">carregando…</div>`).join('')}</div>
      ${ed ? `<label class="btn mt" style="display:inline-flex;gap:6px;cursor:pointer">${icon('camera')} Tirar / escolher fotos<input type="file" id="dArq" accept="image/*" multiple capture="environment" style="display:none"></label> <span class="tiny muted" id="dNovas"></span>
      <div class="tiny muted mt">As fotos são reduzidas antes de enviar (economiza internet no celular) e vão para a pasta EXECUÇÃO › FOTOS DIÁRIO da obra. Servem para o relatório fotográfico da PLS.</div>` : ''}`,
      footer: `${id && ed ? `<button class="btn danger" id="dDel" style="margin-right:auto">${icon('trash-2')}</button>` : ''}<button class="btn" data-close>Fechar</button>${ed ? `<button class="btn primary" id="dOk">${icon('save')} Salvar</button>` : ''}` });
    (x.fotoIds || []).forEach(async f => { const u = await dataUrl(f, 300); const el = m.el.querySelector(`[data-th="${f}"]`); if (el) { el.innerHTML = u ? `<img src="${u}" style="max-width:100%;max-height:110px;border-radius:8px;cursor:pointer">` : 'sem prévia'; el.onclick = () => Store.openFile(f); } });
    let novas = [];
    const arq = m.$('#dArq'); if (arq) arq.onchange = () => { novas = novas.concat([...arq.files]); m.$('#dNovas').textContent = novas.length + ' foto(s) nova(s) para enviar'; };
    if (m.$('#dDel')) m.$('#dDel').onclick = async () => { if (await UI.confirm('Excluir este registro do diário? As fotos continuam nos documentos da obra.', 'Excluir')) { Store.remove('diario', id); m.close(); App.refresh(); } };
    if (m.$('#dOk')) m.$('#dOk').onclick = async () => {
      const d = {}; m.el.querySelectorAll('[name]').forEach(i => d[i.name] = i.type === 'number' ? (i.value === '' ? '' : +i.value) : i.value.trim());
      if (!d.texto) return UI.toast('Descreva os serviços executados.', 'err');
      const b = m.$('#dOk'); b.disabled = true; b.textContent = 'Salvando…';
      const rec = id ? Store.update('diario', id, d) : Store.insert('diario', Object.assign(d, { obraId: x.obraId || obraId, fotoIds: [] }));
      if (novas.length) {
        const red = []; for (const f of novas) red.push(await reduzir(f));
        const ups = await Store.uploadFiles(red, { obraId: rec.obraId, diarioId: rec.id, fase: 'EXECUÇÃO', pasta: 'FOTOS DIÁRIO', descricao: (d.texto || '').slice(0, 80), data: d.data });
        Store.update('diario', rec.id, { fotoIds: (Store.get('diario', rec.id).fotoIds || []).concat(ups.map(u => u.id)) });
      }
      m.close(); UI.toast('Diário salvo' + (novas.length ? ` com ${novas.length} foto(s)` : '')); App.refresh();
    };
  }

  /* ---------- relatórios de pró-labore / comissões / lucros ---------- */
  const CAT_SOC = ['Pró-labore', 'Comissões', 'Distribuição de lucros'];
  function socios() { const e = Store.db.empresa; if (!Array.isArray(e.socios)) e.socios = []; return e.socios; }
  function calcMes(mes) {
    const L = Store.all('lancamentos').filter(l => l.status === 'pago' && mesDe(l.dataPagamento || l.data) === mes);
    const R = L.filter(l => l.tipo === 'receita').reduce((a, l) => a + (+l.valor || 0), 0);
    const D = L.filter(l => l.tipo === 'despesa' && !CAT_SOC.includes(l.categoria)).reduce((a, l) => a + (+l.valor || 0), 0);
    const S = socios().map(s => {
      const rec = L.filter(l => l.tipo === 'receita' && l.obraId && (Store.get('obras', l.obraId) || {}).vendedorId === s.pessoaId).reduce((a, l) => a + (+l.valor || 0), 0);
      return Object.assign({}, s, { nome: (Store.get('pessoas', s.pessoaId) || {}).nome || '—', baseComissao: rec, comissaoV: rec * (+s.comissao || 0) / 100, inss: (+s.prolabore || 0) * 0.11 });
    });
    const P = S.reduce((a, s) => a + (+s.prolabore || 0), 0), C = S.reduce((a, s) => a + s.comissaoV, 0);
    const reservaPct = +Store.db.empresa.reservaLucro >= 0 && Store.db.empresa.reservaLucro !== undefined ? +Store.db.empresa.reservaLucro : 10;
    const resultado = R - D, antes = resultado - P - C, reserva = Math.max(0, antes) * reservaPct / 100, distribuivel = Math.max(0, antes - reserva);
    const somaPart = S.reduce((a, s) => a + (+s.participacao || 0), 0) || 100;
    S.forEach(s => { s.lucro = distribuivel * (+s.participacao || 0) / somaPart; s.total = (+s.prolabore || 0) - s.inss + s.comissaoV + s.lucro; });
    return { R, D, resultado, P, C, antes, reservaPct, reserva, distribuivel, S };
  }
  function tabSocios(c) {
    const { money, esc, icon, pct } = UI; const s = Views.financeiro.st; const ed = Auth.can('financeiro.editar');
    s.mesSoc = s.mesSoc || addMes(hoje(), -1);
    const k = calcMes(s.mesSoc); const pessoas = Store.all('pessoas').filter(p => p.tipo !== 'Cliente');
    c.innerHTML = `<div class="toolbar"><label class="tiny muted">Mês de referência</label><input type="month" class="input" id="smes" value="${s.mesSoc}"><span class="tiny muted">regime de caixa: só o que foi pago/recebido no mês</span></div>
      <div class="grid g4">
        <div class="card kpi ok"><div class="lbl">Receitas recebidas</div><div class="val">${money(k.R)}</div></div>
        <div class="card kpi err"><div class="lbl">Despesas pagas (sem sócios)</div><div class="val">${money(k.D)}</div></div>
        <div class="card kpi ${k.resultado >= 0 ? 'ok' : 'err'}"><div class="lbl">Resultado do mês</div><div class="val">${money(k.resultado)}</div><div class="sub">antes de pró-labore e comissões</div></div>
        <div class="card kpi ${k.distribuivel > 0 ? 'ok' : 'warn'}"><div class="lbl">Lucro distribuível</div><div class="val">${money(k.distribuivel)}</div><div class="sub">depois de pró-labore, comissões e reserva de ${pct(k.reservaPct, 0)}</div></div>
      </div>
      <div class="card mt"><div class="card-h"><h3>Sócios: pró-labore, comissão e participação</h3>${ed ? `<button class="btn sm" id="sAdd">${icon('plus')} Sócio</button>` : ''}</div><div class="card-b p0"><div class="table-wrap"><table class="t"><thead><tr><th>Sócio</th><th class="num">Pró-labore (R$)</th><th class="num">Comissão (% das receitas das obras que vendeu)</th><th class="num">Participação no lucro (%)</th><th></th></tr></thead><tbody>
        ${socios().map((x, i) => `<tr><td>${ed ? `<select class="select" data-s="${i}" data-k="pessoaId"><option value=""></option>${pessoas.map(p => `<option value="${p.id}" ${p.id === x.pessoaId ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select>` : esc((Store.get('pessoas', x.pessoaId) || {}).nome || '')}</td>
          <td class="num"><input class="input" type="number" step="any" data-s="${i}" data-k="prolabore" value="${x.prolabore || ''}" style="width:120px;text-align:right" ${ed ? '' : 'disabled'}></td>
          <td class="num"><input class="input" type="number" step="any" data-s="${i}" data-k="comissao" value="${x.comissao || ''}" style="width:90px;text-align:right" ${ed ? '' : 'disabled'}></td>
          <td class="num"><input class="input" type="number" step="any" data-s="${i}" data-k="participacao" value="${x.participacao || ''}" style="width:90px;text-align:right" ${ed ? '' : 'disabled'}></td>
          <td>${ed ? `<button class="btn ghost sm" data-rm="${i}">${icon('x')}</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Cadastre os sócios (Victor, Ismael…) e os valores.</td></tr>'}
        </tbody></table></div><div class="card-b row"><label class="tiny muted">Reserva de lucro que fica na empresa (%)</label><input class="input" type="number" id="sRes" value="${k.reservaPct}" style="width:80px" ${ed ? '' : 'disabled'}><span class="tiny muted">A comissão usa o campo "Vendedor" da obra.</span></div></div>
      <div class="card mt"><div class="card-h"><h3>Quanto cada sócio recebe em ${Calc.mesLabel(s.mesSoc)}</h3>${ed && k.S.length ? `<button class="btn sm primary" id="sLanc">${icon('wallet')} Lançar no financeiro (pendente)</button>` : ''}</div>
        ${UI.table([{ h: 'Sócio', f: x => esc(x.nome) }, { h: 'Pró-labore', num: 1, f: x => money(+x.prolabore || 0) }, { h: 'INSS 11% (retido)', num: 1, f: x => '− ' + money(x.inss) }, { h: 'Comissão', num: 1, f: x => `${money(x.comissaoV)}<div class="tiny muted">${pct(+x.comissao || 0, 1)} de ${money(x.baseComissao)}</div>` }, { h: 'Lucro', num: 1, f: x => money(x.lucro) }, { h: 'Total líquido', num: 1, f: x => `<b>${money(x.total)}</b>` }], k.S, { emptyMsg: 'Nenhum sócio cadastrado.' })}
        <div class="card-b tiny muted">Pró-labore tem INSS de 11% descontado do sócio (até o teto) e entra na folha/eSocial; a distribuição de lucros é isenta de IR para o sócio quando a contabilidade comprova o lucro. Confirme os valores com a contabilidade antes de pagar.</div></div>`;
    const re = () => { Store.save(); tabSocios(c); UI.icons(); };
    UI.$('#smes', c).onchange = e => { s.mesSoc = e.target.value; tabSocios(c); UI.icons(); };
    if (!ed) return;
    UI.$$('[data-s]', c).forEach(i => i.onchange = () => { const x = socios()[+i.dataset.s]; x[i.dataset.k] = i.dataset.k === 'pessoaId' ? i.value : +i.value || 0; re(); });
    UI.$$('[data-rm]', c).forEach(b => b.onclick = () => { socios().splice(+b.dataset.rm, 1); re(); });
    if (UI.$('#sAdd', c)) UI.$('#sAdd', c).onclick = () => { socios().push({ pessoaId: '', prolabore: 0, comissao: 0, participacao: 0 }); re(); };
    UI.$('#sRes', c).onchange = e => { Store.db.empresa.reservaLucro = +e.target.value || 0; re(); };
    if (UI.$('#sLanc', c)) UI.$('#sLanc', c).onclick = async () => {
      const venc = addMes(s.mesSoc, 1) + '-05'; let n = 0;
      const lanc = (cat, x, valor, desc) => { const ref = `${cat}|${s.mesSoc}|${x.pessoaId}`; if (valor <= 0 || Store.all('lancamentos').some(l => l.refSocio === ref)) return; Store.insert('lancamentos', { tipo: 'despesa', categoria: cat, descricao: `${desc} ${Calc.mesLabel(s.mesSoc)} – ${x.nome}`, valor: Math.round(valor * 100) / 100, data: venc, vencimento: venc, status: 'pendente', pessoaId: x.pessoaId, forma: 'PIX', arquivoIds: [], refSocio: ref }); n++; };
      if (!await UI.confirm(`Criar as despesas pendentes de ${Calc.mesLabel(s.mesSoc)} (vencimento ${UI.date(venc)})? Lançamentos que já existem não são duplicados.`, 'Lançar')) return;
      k.S.forEach(x => { lanc('Pró-labore', x, +x.prolabore || 0, 'Pró-labore'); lanc('Comissões', x, x.comissaoV, 'Comissão'); lanc('Distribuição de lucros', x, x.lucro, 'Distribuição de lucros'); });
      UI.toast(n ? n + ' lançamento(s) criado(s)' : 'Nada novo para lançar'); App.refresh();
    };
  }

  /* ---------- aba "Fluxo por obra" do financeiro ---------- */
  function tabFluxo(c) {
    const { money, esc, icon } = UI; const s = Views.financeiro.st;
    const obras = Store.all('obras').filter(o => ativa(o) && (+o.valorFinanciado || +o.valorContrato));
    const R = obras.map(o => ({ o, f: fluxoObra(o) })).sort((a, b) => b.f.necessidade - a.f.necessidade);
    const sel = s.obra ? Store.get('obras', s.obra) : null;
    let det = '';
    if (sel) { const f = fluxoObra(sel);
      det = `<div class="card mt"><div class="card-h"><div><h3>${esc(sel.nome)} – fluxo mês a mês</h3><div class="tiny muted">Meses passados: realizado. Meses futuros: o maior entre o lançado e o previsto pelo ${f.temCrono ? 'cronograma do PCI' : 'prazo da obra (linear)'}. ${f.caixa ? 'A CAIXA libera no mês seguinte à medição.' : ''}</div></div></div>
        ${UI.table([{ h: 'Mês', f: x => `${Calc.mesLabel(x.m)}${x.m === mesDe(hoje()) ? ' <span class="badge info">atual</span>' : ''}` }, { h: 'Etapa', f: x => x.etapa >= 1 ? x.etapa : '—' }, { h: 'Entra', num: 1, f: x => `<span style="color:var(--ok)">${money(x.ent)}</span>${!x.passado && x.prevEntrada ? `<div class="tiny muted">previsto ${money(x.prevEntrada)}</div>` : ''}` },
          { h: 'Sai', num: 1, f: x => `<span style="color:var(--err)">${money(x.sai)}</span>${!x.passado && x.prevSaida ? `<div class="tiny muted">previsto ${money(x.prevSaida)}</div>` : ''}` }, { h: 'Saldo acumulado da obra', num: 1, f: x => `<b style="color:${x.saldo < 0 ? 'var(--err)' : 'var(--ok)'}">${money(x.saldo)}</b>` }], f.linhas)}
        <div class="card-b">${f.necessidade ? `<div class="alert err">${icon('alert-octagon')}<div>Esta obra precisa de <b>${money(f.necessidade)}</b> de capital próprio (capital de giro), no pior momento em <b>${Calc.mesLabel(f.mesCritico)}</b>. Planeje esse dinheiro ou negocie o cronograma.</div></div>` : `<div class="alert ok">${icon('check-circle-2')}<div>O caixa da obra não fica negativo pela previsão.</div></div>`}
        ${!f.custo ? `<div class="alert warn mt">${icon('alert-triangle')}<div>Sem custo previsto: preencha "Custo previsto" na obra ou o PCI para projetar as saídas.</div></div>` : ''}</div></div>`; }
    c.innerHTML = `<div class="alert info mb">${icon('info')}<div>Projeta, para cada obra em andamento, quanto entra e quanto sai por mês, cruzando o cronograma (PCI) com as liberações e os lançamentos. Mostra quanto <b>capital de giro</b> cada obra exige e quando. Escolha uma obra no filtro acima para ver o detalhe.</div></div>
      <div class="card">${UI.table([{ h: 'Obra', f: x => `${UI.idLink(x.o.id)} ${esc(x.o.nome)}` }, { h: 'Receita (contrato/financiado)', num: 1, f: x => money(x.f.receita) }, { h: 'Custo previsto', num: 1, f: x => x.f.custo ? money(x.f.custo) : '<span class="muted tiny">sem custo</span>' }, { h: 'Cronograma', f: x => x.f.temCrono ? 'PCI' : 'linear' },
        { h: 'Capital de giro necessário', num: 1, f: x => x.f.necessidade ? `<b style="color:var(--err)">${money(x.f.necessidade)}</b>` : '<span style="color:var(--ok)">não precisa</span>' }, { h: 'Mês crítico', f: x => x.f.necessidade ? Calc.mesLabel(x.f.mesCritico) : '—' },
        { h: '', f: x => `<button class="btn sm" data-ver="${x.o.id}">Ver</button>` }], R, { emptyMsg: 'Nenhuma obra em andamento com valor.' })}
        <div class="card-b"><b>Total de capital de giro das obras: ${money(R.reduce((a, x) => a + x.f.necessidade, 0))}</b></div></div>${det}`;
    UI.$$('[data-ver]', c).forEach(b => b.onclick = e => { e.stopPropagation(); s.obra = b.dataset.ver; App.refresh(); });
  }

  return { alertas, fluxoObra, abc, escolherFotos, paginaFotos, editarDiario, reduzir, calcMes, tabSocios, tabFluxo, fotosDaObra };
})();

/* abas novas do financeiro */
Views.financeiro.t_fluxo = c => Ferramentas.tabFluxo(c);
Views.financeiro.t_socios = c => Ferramentas.tabSocios(c);
/* diário com fotos */
Views.obraDetalhe.editDiario = (id, obraId) => Ferramentas.editarDiario(id, obraId);
Open.DI = id => Ferramentas.editarDiario(id);

/* =========================================================
   COMPRAS E COTAÇÕES
   ========================================================= */
Views.compras = {
  perm: 'financeiro.ver',
  st: { status: '' },
  STATUS: ['Cotando', 'Aprovado', 'Comprado', 'Recebido', 'Cancelado'],
  totais(c) { return (c.fornecedores || []).map(f => (c.itens || []).reduce((a, it, i) => a + (+it.qtd || 0) * (+(f.precos || [])[i] || 0), 0) + (+f.frete || 0)); },
  render(el) {
    const { esc, money, icon } = UI; const s = this.st; const ed = Auth.can('financeiro.editar');
    const L = Store.all('compras').filter(c => !s.status || c.status === s.status).sort((a, b) => (b.data || '').localeCompare(a.data || '') || b.id.localeCompare(a.id));
    const econ = Store.all('compras').filter(c => c.escolhido != null && c.status !== 'Cancelado').reduce((a, c) => { const t = this.totais(c).filter(v => v > 0); return a + (t.length > 1 ? Math.max(...t) - this.totais(c)[c.escolhido] : 0); }, 0);
    el.innerHTML = `<div class="page-head"><div><h1>Compras e cotações</h1><p>Peça preço a vários fornecedores, compare item a item e gere a despesa da compra escolhida</p></div>${ed ? `<button class="btn primary" id="cNova">${icon('plus')} Nova cotação</button>` : ''}</div>
      <div class="grid g4">${this.STATUS.slice(0, 4).map(st => `<div class="card kpi"><div class="lbl">${st}</div><div class="val">${Store.all('compras').filter(c => c.status === st).length}</div></div>`).join('')}</div>
      <div class="alert ok mt">${icon('piggy-bank')}<div>Economia obtida nas cotações (diferença entre a proposta mais cara e a escolhida): <b>${money(econ)}</b></div></div>
      <div class="row mt" style="gap:6px"><button class="chip ${!s.status ? 'on' : ''}" data-st="">Todas</button>${this.STATUS.map(st => `<button class="chip ${s.status === st ? 'on' : ''}" data-st="${st}">${st}</button>`).join('')}</div>
      <div class="card mt">${UI.table([{ h: 'ID', f: c => UI.idLink(c.id) }, { h: 'Compra', f: c => `<span class="plink" data-ab="${c.id}">${esc(c.titulo)}</span><div class="tiny muted">${(c.itens || []).length} itens · ${(c.fornecedores || []).length} fornecedores</div>` }, { h: 'Obra', f: c => c.obraId ? UI.idLink(c.obraId) : '<span class="muted tiny">Geral</span>' },
        { h: 'Data', f: c => UI.date(c.data) }, { h: 'Melhor preço', num: 1, f: c => { const t = this.totais(c).filter(v => v > 0); return t.length ? money(Math.min(...t)) : '—'; } }, { h: 'Escolhido', f: c => c.escolhido != null ? esc(this.nomeF((c.fornecedores || [])[c.escolhido])) : '—' },
        { h: 'Status', f: c => UI.badge(c.status, { Recebido: 'ok', Comprado: 'info', Aprovado: 'info', Cancelado: 'err', Cotando: 'warn' }[c.status] || '') }], L, { emptyMsg: 'Nenhuma cotação ainda.' })}</div>`;
    UI.$$('[data-st]', el).forEach(b => b.onclick = () => { s.status = b.dataset.st; App.refresh(); });
    UI.$$('[data-ab]', el).forEach(b => b.onclick = e => { e.stopPropagation(); this.editar(b.dataset.ab); });
    UI.$$('tbody tr', el).forEach(tr => { const g = tr.querySelector('[data-ab]'); if (g) { tr.style.cursor = 'pointer'; tr.onclick = e => { if (!e.target.closest('[data-goto]')) this.editar(g.dataset.ab); }; } });
    if (UI.$('#cNova', el)) UI.$('#cNova', el).onclick = () => this.editar(null);
  },
  nomeF(f) { if (!f) return ''; return (Store.get('pessoas', f.pessoaId) || {}).nome || f.nome || 'Fornecedor'; },
  editar(id) {
    const { esc, money, icon } = UI; const ed = Auth.can('financeiro.editar');
    const c = id ? JSON.parse(JSON.stringify(Store.get('compras', id))) : { titulo: '', data: UI.today(), status: 'Cotando', obraId: '', itens: [{ desc: '', un: 'un', qtd: 1 }], fornecedores: [{ pessoaId: '', nome: '', precos: [] }, { pessoaId: '', nome: '', precos: [] }, { pessoaId: '', nome: '', precos: [] }] };
    const forn = Store.all('pessoas').filter(p => /Fornecedor|Prestador|Empreiteiro/.test(p.tipo || '')).sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
    const m = UI.modal({ title: id ? 'Cotação ' + id : 'Nova cotação', wide: true, body: '<div id="cqCorpo"></div>',
      footer: `${id && ed ? `<button class="btn danger" id="cqDel" style="margin-right:auto">${icon('trash-2')}</button>` : ''}<button class="btn" id="cqTexto">${icon('message-square')} Texto para pedir cotação</button><button class="btn" data-close>Fechar</button>${ed ? `<button class="btn primary" id="cqOk">${icon('save')} Salvar</button>` : ''}` });
    const corpo = m.$('#cqCorpo');
    const ler = () => {
      corpo.querySelectorAll('[data-c]').forEach(i => c[i.dataset.c] = i.value);
      corpo.querySelectorAll('[data-it]').forEach(i => { const it = c.itens[+i.dataset.it]; it[i.dataset.f] = i.dataset.f === 'qtd' ? +i.value || 0 : i.value; });
      corpo.querySelectorAll('[data-fo]').forEach(i => { const f = c.fornecedores[+i.dataset.fo]; if (i.dataset.f === 'preco') { f.precos = f.precos || []; f.precos[+i.dataset.i] = i.value === '' ? '' : +i.value; } else f[i.dataset.f] = i.dataset.f === 'frete' ? +i.value || 0 : i.value; });
    };
    const desenhar = () => {
      const tot = this.totais(c); const validos = tot.map((t, j) => [t, j]).filter(x => x[0] > 0); const melhor = validos.length ? validos.reduce((a, x) => x[0] < a[0] ? x : a)[1] : -1;
      const minItem = c.itens.map((it, i) => { const v = c.fornecedores.map(f => +(f.precos || [])[i] || 0).filter(v => v > 0); return v.length ? Math.min(...v) : 0; });
      corpo.innerHTML = `<div class="form">
          <div class="field"><label>O que comprar</label><input class="input" data-c="titulo" value="${esc(c.titulo)}" placeholder="ex.: Cimento e areia – fundação"></div>
          <div class="field"><label>Obra</label><select class="select" data-c="obraId"><option value="">Geral (empresa)</option>${Store.all('obras').map(o => `<option value="${o.id}" ${o.id === c.obraId ? 'selected' : ''}>${o.id} · ${esc(o.nome)}</option>`).join('')}</select></div>
          <div class="field"><label>Data</label><input class="input" type="date" data-c="data" value="${esc(c.data || '')}"></div>
          <div class="field"><label>Status</label><select class="select" data-c="status">${this.STATUS.map(x => `<option ${x === c.status ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
          <div class="field"><label>Entrega prevista</label><input class="input" type="date" data-c="previsao" value="${esc(c.previsao || '')}"></div>
          <div class="field"><label>Importar itens de um orçamento</label><select class="select" id="cqOrc"><option value="">—</option>${Store.all('orcamentos').filter(o => !c.obraId || o.obraId === c.obraId).map(o => `<option value="${o.id}">${o.id} · ${esc(o.titulo)}</option>`).join('')}</select></div>
        </div>
        <div class="table-wrap mt"><table class="t"><thead><tr><th>Item</th><th>Un.</th><th class="num">Qtd</th>${c.fornecedores.map((f, j) => `<th style="min-width:140px;width:140px;vertical-align:top"><div style="display:grid;gap:4px"><select class="select" data-fo="${j}" data-f="pessoaId" style="width:100%"><option value="">Fornecedor ${j + 1}…</option>${forn.map(p => `<option value="${p.id}" ${p.id === f.pessoaId ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select>${!f.pessoaId ? `<input class="input" data-fo="${j}" data-f="nome" value="${esc(f.nome || '')}" placeholder="ou digite o nome" style="width:100%">` : ''}</div></th>`).join('')}<th></th></tr></thead><tbody>
          ${c.itens.map((it, i) => `<tr><td><input class="input" data-it="${i}" data-f="desc" value="${esc(it.desc)}" style="min-width:160px;width:100%"></td><td><input class="input" data-it="${i}" data-f="un" value="${esc(it.un || '')}" style="width:60px"></td><td class="num"><input class="input" type="number" step="any" data-it="${i}" data-f="qtd" value="${it.qtd}" style="width:80px;text-align:right"></td>
            ${c.fornecedores.map((f, j) => { const v = +(f.precos || [])[i] || 0; return `<td class="num"><input class="input" type="number" step="any" data-fo="${j}" data-f="preco" data-i="${i}" value="${(f.precos || [])[i] ?? ''}" placeholder="R$ unit." style="width:110px;text-align:right;${v && v === minItem[i] ? 'border-color:var(--ok);font-weight:700' : ''}">${v ? `<div class="tiny muted">${money(v * (+it.qtd || 0))}</div>` : ''}</td>`; }).join('')}
            <td><button class="btn ghost sm" data-rmi="${i}">${icon('x')}</button></td></tr>`).join('')}
          <tr><td colspan="3" class="num">Frete</td>${c.fornecedores.map((f, j) => `<td class="num"><input class="input" type="number" step="any" data-fo="${j}" data-f="frete" value="${f.frete || ''}" style="width:110px;text-align:right"></td>`).join('')}<td></td></tr>
          <tr><td colspan="3" class="num">Prazo de entrega</td>${c.fornecedores.map((f, j) => `<td><input class="input" data-fo="${j}" data-f="prazo" value="${esc(f.prazo || '')}" placeholder="ex.: 3 dias" style="width:120px"></td>`).join('')}<td></td></tr>
          <tr><td colspan="3" class="num">Pagamento</td>${c.fornecedores.map((f, j) => `<td><input class="input" data-fo="${j}" data-f="pagamento" value="${esc(f.pagamento || '')}" placeholder="ex.: 30 dias" style="width:120px"></td>`).join('')}<td></td></tr>
          </tbody><tfoot><tr><td colspan="3" class="num"><b>Total</b></td>${tot.map((t, j) => `<td class="num"><b style="${j === melhor ? 'color:var(--ok)' : ''}">${t ? money(t) : '—'}</b>${j === melhor ? '<div><span class="badge ok">menor total</span></div>' : ''}${c.escolhido === j ? '<div><span class="badge info">escolhido</span></div>' : ''}${ed && t ? `<div><button class="btn sm mt" data-esc="${j}">Escolher</button></div>` : ''}</td>`).join('')}<td></td></tr></tfoot></table></div>
        <div class="row mt"><button class="btn sm" id="cqItem">${icon('plus')} Item</button><button class="btn sm" id="cqForn">${icon('plus')} Fornecedor</button><span class="tiny muted">Em verde, o menor preço de cada item.</span></div>
        ${c.escolhido != null ? `<div class="alert info mt">${icon('shopping-cart')}<div>Escolhido: <b>${esc(this.nomeF(c.fornecedores[c.escolhido]))}</b> – ${money(tot[c.escolhido])}. ${c.lancamentoId ? `Despesa lançada: ${UI.idLink(c.lancamentoId)}` : 'Ao salvar, a despesa é criada como pendente no financeiro.'}</div></div>` : ''}`;
      UI.icons();
      corpo.querySelectorAll('[data-c],[data-it],[data-fo]').forEach(i => i.onchange = () => { ler(); desenhar(); });
      corpo.querySelectorAll('[data-rmi]').forEach(b => b.onclick = () => { ler(); c.itens.splice(+b.dataset.rmi, 1); c.fornecedores.forEach(f => (f.precos || []).splice(+b.dataset.rmi, 1)); desenhar(); });
      UI.$('#cqItem', corpo).onclick = () => { ler(); c.itens.push({ desc: '', un: 'un', qtd: 1 }); desenhar(); };
      UI.$('#cqForn', corpo).onclick = () => { ler(); c.fornecedores.push({ pessoaId: '', nome: '', precos: [] }); desenhar(); };
      corpo.querySelectorAll('[data-esc]').forEach(b => b.onclick = () => { ler(); c.escolhido = +b.dataset.esc; if (c.status === 'Cotando') c.status = 'Aprovado'; desenhar(); });
      UI.$('#cqOrc', corpo).onchange = e => { const o = Store.get('orcamentos', e.target.value); if (!o) return; ler(); c.itens = c.itens.filter(i => i.desc).concat(itensAZ(o.itens).map(i => ({ desc: i.desc, un: i.un, qtd: i.qtd }))); if (!c.titulo) c.titulo = 'Compra – ' + o.titulo; if (!c.obraId) c.obraId = o.obraId || ''; desenhar(); };
    };
    desenhar();
    m.$('#cqTexto').onclick = () => { ler(); const ob = Store.get('obras', c.obraId);
      const t = `Olá! Poderia me passar o orçamento dos itens abaixo${ob ? ' para a obra em ' + (ob.cidade || '') : ''}?\n\n` + c.itens.filter(i => i.desc).map(i => `• ${i.qtd} ${i.un || ''} – ${i.desc}`).join('\n') + `\n\nPor favor informe preço unitário, frete, prazo de entrega e forma de pagamento.\n${Store.db.empresa.nome}`;
      navigator.clipboard.writeText(t).then(() => UI.toast('Texto copiado: cole no WhatsApp ou e-mail do fornecedor.'), () => UI.toast('Não foi possível copiar', 'err')); };
    if (m.$('#cqDel')) m.$('#cqDel').onclick = async () => { if (await UI.confirm('Excluir esta cotação? A despesa lançada (se houver) continua no financeiro.', 'Excluir')) { Store.remove('compras', id); m.close(); App.refresh(); } };
    if (m.$('#cqOk')) m.$('#cqOk').onclick = () => {
      ler(); if (!c.titulo) return UI.toast('Informe o que vai comprar.', 'err');
      c.itens = c.itens.filter(i => i.desc || i.qtd);
      let rec = id ? Store.update('compras', id, c) : Store.insert('compras', c);
      if (c.escolhido != null && !c.lancamentoId && c.status !== 'Cancelado') {
        const f = c.fornecedores[c.escolhido], t = this.totais(c)[c.escolhido];
        if (t > 0) { const l = Store.insert('lancamentos', { tipo: 'despesa', categoria: 'Material', descricao: `${c.titulo} – ${this.nomeF(f)}`, valor: Math.round(t * 100) / 100, data: c.data, vencimento: c.previsao || c.data, status: 'pendente', obraId: c.obraId || null, pessoaId: f.pessoaId || null, forma: 'Boleto', arquivoIds: [], compraId: rec.id });
          Store.update('compras', rec.id, { lancamentoId: l.id }); UI.toast('Despesa pendente criada: ' + l.id); }
      }
      m.close(); App.refresh();
    };
  }
};
Open.CM = id => Views.compras.editar(id);

/* =========================================================
   FUNIL COMERCIAL
   ========================================================= */
Views.funil = {
  perm: 'contratos',
  st: { periodo: '12' },
  render(el) {
    const { esc, money, pct, icon } = UI; const s = this.st; const h = UI.today();
    const de = s.periodo === 'tudo' ? '0000' : s.periodo === 'ano' ? h.slice(0, 4) + '-01-01' : (() => { const d = new Date(h + 'T12:00:00'); d.setMonth(d.getMonth() - +s.periodo); return d.toISOString().slice(0, 10); })();
    const cat = x => Views.contratos.categoriaDe(x);
    const orcs = Store.all('orcamentos').filter(o => (o.data || '') >= de);
    const props = Store.all('contratos').filter(x => cat(x) === 'Proposta' && (x.data || '') >= de);
    const aceitas = props.filter(x => x.status === 'Assinado');
    const contr = Store.all('contratos').filter(x => cat(x) === 'Contrato' && x.status === 'Assinado' && (x.data || '') >= de);
    const vOrc = orcs.reduce((a, o) => a + Calc.orcTotal(o).total, 0), vProp = props.reduce((a, x) => a + (+x.valor || 0), 0), vAc = aceitas.reduce((a, x) => a + (+x.valor || 0), 0), vCt = contr.reduce((a, x) => a + (+x.valor || 0), 0);
    const media = arr => arr.length ? Math.round(arr.reduce((a, v) => a + v, 0) / arr.length) : null;
    const dOrcProp = media(props.map(p => { const o = Store.get('orcamentos', p.orcamentoId); return o && o.data && p.data ? UI.daysBetween(o.data, p.data) : null; }).filter(v => v != null && v >= 0));
    const dPropCt = media(contr.map(ct => { const p = Store.all('contratos').filter(x => cat(x) === 'Proposta' && x.obraId && x.obraId === ct.obraId && (x.data || '') <= (ct.data || '')).sort((a, b) => (b.data || '').localeCompare(a.data || ''))[0]; return p && p.data && ct.data ? UI.daysBetween(p.data, ct.data) : null; }).filter(v => v != null && v >= 0));
    const etapas = [['Orçamentos feitos', orcs.length, vOrc, 'calculator'], ['Propostas enviadas', props.length, vProp, 'send'], ['Propostas aceitas', aceitas.length, vAc, 'thumbs-up'], ['Contratos assinados', contr.length, vCt, 'file-signature']];
    const maxN = Math.max(1, ...etapas.map(e => e[1]));
    const origem = {}; Store.all('obras').forEach(o => { const temCt = contr.some(c => c.obraId === o.id); const k = o.origem || 'Não informado'; origem[k] = origem[k] || { n: 0, ct: 0, v: 0 }; if (orcs.some(x => x.obraId === o.id) || props.some(x => x.obraId === o.id) || temCt) { origem[k].n++; if (temCt) { origem[k].ct++; origem[k].v += contr.filter(c => c.obraId === o.id).reduce((a, c) => a + (+c.valor || 0), 0); } } });
    const perdidos = orcs.filter(o => o.status === 'Recusado');
    el.innerHTML = `<div class="page-head"><div><h1>Funil comercial</h1><p>Do orçamento ao contrato: quantos avançam, quanto valem e quanto tempo levam</p></div>
        <select class="select" id="fuPer" style="max-width:200px">${[['3', 'Últimos 3 meses'], ['6', 'Últimos 6 meses'], ['12', 'Últimos 12 meses'], ['ano', 'Este ano'], ['tudo', 'Tudo']].map(([v, t]) => `<option value="${v}" ${v === s.periodo ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="card"><div class="card-b">${etapas.map((e, i) => `<div style="margin:10px 0"><div class="row" style="justify-content:space-between"><b>${icon(e[3])} ${e[0]}</b><span>${e[1]} · ${money(e[2])}${i === 3 ? ` · <b>${pct(etapas[0][1] ? e[1] / etapas[0][1] * 100 : 0, 0)}</b> dos orçamentos` : i ? ` · <b>${pct(etapas[i - 1][1] ? e[1] / etapas[i - 1][1] * 100 : 0, 0)}</b> da etapa anterior` : ''}</span></div>
          <div style="height:22px;background:var(--bg-2,#eef2f7);border-radius:6px;margin-top:4px"><div style="height:100%;width:${Math.max(2, e[1] / maxN * 100)}%;background:var(--brand);border-radius:6px;opacity:${1 - i * 0.18}"></div></div></div>`).join('')}</div></div>
      <div class="grid g4 mt">
        <div class="card kpi"><div class="lbl">Conversão orçamento → contrato</div><div class="val">${pct(orcs.length ? contr.length / orcs.length * 100 : 0, 0)}</div><div class="sub">${contr.length} de ${orcs.length}</div></div>
        <div class="card kpi"><div class="lbl">Tempo orçamento → proposta</div><div class="val">${dOrcProp == null ? '—' : dOrcProp + ' dias'}</div><div class="sub">média</div></div>
        <div class="card kpi"><div class="lbl">Tempo proposta → contrato</div><div class="val">${dPropCt == null ? '—' : dPropCt + ' dias'}</div><div class="sub">média</div></div>
        <div class="card kpi ${perdidos.length ? 'warn' : ''}"><div class="lbl">Orçamentos recusados</div><div class="val">${perdidos.length}</div><div class="sub">${money(perdidos.reduce((a, o) => a + Calc.orcTotal(o).total, 0))}</div></div>
      </div>
      <div class="grid g2 mt">
        <div class="card"><div class="card-h"><h3>De onde vêm os clientes que fecham</h3></div>${UI.table([{ h: 'Origem', f: x => esc(x[0]) }, { h: 'Negociações', num: 1, f: x => x[1].n }, { h: 'Fecharam', num: 1, f: x => x[1].ct }, { h: 'Conversão', num: 1, f: x => pct(x[1].n ? x[1].ct / x[1].n * 100 : 0, 0) }, { h: 'Valor fechado', num: 1, f: x => money(x[1].v) }], Object.entries(origem).filter(x => x[1].n).sort((a, b) => b[1].v - a[1].v), { emptyMsg: 'Preencha "Como o cliente chegou" nas obras.' })}</div>
        <div class="card"><div class="card-h"><h3>Propostas em aberto (para cobrar resposta)</h3></div>${UI.table([{ h: 'Proposta', f: x => `${UI.idLink(x.id)} ${esc(x.titulo)}` }, { h: 'Enviada', f: x => UI.date(x.data) }, { h: 'Dias', num: 1, f: x => x.data ? UI.daysBetween(x.data, h) : '—' }, { h: 'Valor', num: 1, f: x => money(x.valor) }], props.filter(x => !['Assinado', 'Cancelado'].includes(x.status)).sort((a, b) => (a.data || '').localeCompare(b.data || '')), { emptyMsg: 'Nenhuma proposta em aberto.' })}</div>
      </div>`;
    UI.$('#fuPer', el).onchange = e => { s.periodo = e.target.value; App.refresh(); };
  }
};

/* =========================================================
   SINCRONIZAR COM O DRIVE (OneDrive\00_VTN)
   O servidor do PC lista o drive (só leitura); o app acrescenta ao banco o que faltar:
   obras novas (pastas "NN - NOME" em 00_SERVIÇOS), clientes, e TODOS os arquivos (índice).
   Nada é apagado: arquivo que sumiu do drive só ganha a marca "não encontrado no drive".
   Roda sozinho para administrador (no máximo a cada 6 h) e pelo botão em Configurações / Obras.
   ========================================================= */
window.SincDrive = (() => {
  const RAIZES = ['00_SERVIÇOS', '01_CONTABILIDADE', '02_PROSPECÇÃO', '03_MODELOS PLANTAS', '04_PLANEJAMENTO', '06_ESTUDOS', '07_DOCUMENTOS GERAIS', '09 - PREFEITURAS', '10 - LICITAÇÕES', '11 - COTAÇÕES'];
  // nunca entram no banco (o banco vai cifrado para o GitHub, mas senha e certificado não saem do PC)
  const SENSIVEL = /senha|password|login|\.pfx$|\.p12$|\.cer$|\.key$|certificado digital|cód_ass|cod_ass/i;
  const LIXO = /(^|\/)(~\$|\.~lock|thumbs\.db$|desktop\.ini$|\.ds_store$)|\.(tmp|bak|dwl2?|lck|crdownload|partial)$/i;
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
  const titulo = s => s.toLowerCase().split(/\s+/).map(w => ['e', 'de', 'da', 'do', 'das', 'dos', 'a'].includes(w) ? w : /^(bh|ap|vtn|copasa|e\.)$/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const CIDADES = [['ITABIRITO', 'Itabirito'], ['IBIRITE', 'Ibirité'], ['CONTAGEM', 'Contagem'], ['LAGOA SANTA', 'Lagoa Santa'], ['NOVA LIMA', 'Nova Lima'], ['VESPASIANO', 'Vespasiano'], ['CONGONHAS', 'Congonhas'], ['BRUMADINHO', 'Brumadinho'], ['SANTA LUZIA', 'Santa Luzia'], ['PARQUE EUROPA', 'Contagem'], [' BH', 'Belo Horizonte']];
  const tipoDoc = n => { const u = norm(n); return /CONTRATO/.test(u) ? 'Contrato' : /PROPOSTA/.test(u) ? 'Proposta' : /ORCAMENTO/.test(u) ? 'Orçamento' : /\bART\b|\bRRT\b/.test(u) ? 'ART/RRT' : /NFS ?E|\bNF\b|NOTA FISCAL/.test(u) ? 'Nota fiscal' : /\bPLS\b|\bPCI\b/.test(u) ? 'CAIXA' : /\.(JPE?G|PNG|HEIC|WEBP)$/i.test(n) ? 'Foto' : /\.(DWG|DXF|RVT|IFC|SKP)$/i.test(n) ? 'Projeto' : ''; };
  const pad = n => String(n).padStart(4, '0');
  let rodando = false;

  async function rodar({ silencioso = false } = {}) {
    if (rodando) return; const eu = (Auth.current && Auth.current()) || {};
    if (eu.papel !== 'admin' || !(window.VTN_PASTA && VTN_PASTA.servidor)) { if (!silencioso) UI.toast('A sincronização com o drive roda com o computador servidor ligado e um administrador logado.', 'err'); return; }
    rodando = true; if (!silencioso) UI.toast('Lendo o drive todo… pode levar alguns segundos.');
    let inv; try { inv = await VTN_PASTA.enviar('inventario', { raizes: RAIZES }); } catch (e) { rodando = false; if (!silencioso) UI.toast('Não foi possível ler o drive: ' + e.message + ' (o servidor do PC precisa estar atualizado).', 'err'); return; }
    const db = Store.db, agora = new Date().toISOString(), hoje = UI.today();
    const r = { obras: [], clientes: 0, novos: 0, atualizados: 0, ausentes: 0, status: [], ignorados: 0, total: 0 };
    // obras existentes: pela pasta gravada, senão pelo número (só se for único)
    const porPasta = {}, porNum = {};
    db.obras.forEach(o => { if (o.pasta) porPasta[norm(String(o.pasta).split('/').pop())] = o; const n = Drive.numeroDa(o); if (n) (porNum[n] = porNum[n] || []).push(o); });
    const palavras = t => norm(t).split(' ').filter(w => w.length > 3 && !/^(OBRA|PROJETO|PROJETOS|LOTE|CASA|COND|PARQUE|EUROPA|ITABIRITO|CONTAGEM|FINAL|REFORMA|LAUDO|VISTORIA|RESIDENCIA)$/.test(w));
    const obraDaPasta = top => { const p = porPasta[norm(top)]; if (p) return p; const m = /^\s*0*(\d+)\s*-/.exec(top); if (!m) return null;
      const l = (porNum[+m[1]] || []).filter(o => !o.pasta || /00_SERVI[ÇC]OS$/.test(o.pasta) || norm(String(o.pasta).split('/').pop()) === norm(top)); const pt = palavras(top);
      if (l.length === 1) return l[0];
      const comNome = l.find(o => palavras(o.nome).some(w => pt.includes(w))); if (comNome) return comNome;
      // obra antiga sem número/pasta próprios: casa pelo nome (2 palavras em comum), e só se ainda não tiver pasta própria
      return db.obras.find(o => (!o.pasta || /00_SERVI[ÇC]OS$/.test(o.pasta)) && palavras(o.nome).filter(w => pt.includes(w)).length >= 2) || null; };
    // índice dos arquivos já no banco
    const chave = (oid, pasta, nome) => (oid || '') + '|' + norm(pasta) + '|' + String(nome || '').toLowerCase();
    const idx = new Map(); db.arquivos.forEach(a => { idx.set(chave(a.obraId, a.pasta, a.nome), a); if (a.caminho) idx.set('@' + a.caminho.toLowerCase(), a); });
    const vistos = new Set(); const tops = new Set(); const obraDoTop = {};
    const itens = inv.itens || [];
    // 1) pastas de obra em 00_SERVIÇOS
    itens.forEach(([rel]) => { const p = rel.split('/'); if (p[0] === '00_SERVIÇOS' && p[1]) tops.add(p[1]); });
    [...tops].sort().forEach(top => {
      let o = obraDaPasta(top); const m = /^\s*0*(\d+)\s*-\s*(.+)$/.exec(top);
      if (!o && m && +m[1] > 0) {   // pastas 00… são modelos/gerais, não viram obra
        const num = +m[1], resto = m[2].replace(/_/g, ' ').trim();
        let id = 'OB-' + pad(num); if (db.obras.some(x => x.id === id)) { let k = 0; while (db.obras.some(x => x.id === id + 'ABCDEFGHIJ'[k])) k++; id = id + 'ABCDEFGHIJ'[k]; }
        const cidade = (CIDADES.find(([k]) => norm(' ' + resto).includes(k)) || [])[1] || '';
        const nomeCli = titulo(resto.replace(/\b(ITABIRITO|IBIRITÉ|CONTAGEM|LAGOA SANTA|NOVA LIMA|VESPASIANO|CONGONHAS|BRUMADINHO|COND\.? PARQUE EUROPA|OBRA|PROJETOS?|LOTE|REFORMA|LAUDO|VISTORIA)\b/gi, '').replace(/[-–]+/g, ' ').replace(/\s+/g, ' ').trim());
        let cli = nomeCli ? db.pessoas.find(p => norm(p.nome) === norm(nomeCli)) : null;
        if (!cli && nomeCli) { cli = { id: Store.nextId('pessoas'), nome: nomeCli, tipo: 'Cliente', email: '', telefone: '', cpf: '', obs: `Criado pela sincronização com o drive a partir da pasta "${top}". Completar dados.`, criadoEm: agora }; db.pessoas.push(cli); r.clientes++; }
        o = { id, numero: String(num), nome: titulo(resto), tipo: 'Serviço', modalidade: 'Prestação de serviço de engenharia', status: 'Prospecção', fase: '00_COMERCIAL', clienteIds: cli ? [cli.id] : [], rtId: '', gestorId: '', endereco: '', cidade, uf: 'MG', cep: '', area: 0, valorContrato: 0, valorImovel: 0, valorFinanciado: 0, custoPrevisto: 0,
          dataInicio: '', descricao: `Criada pela sincronização com o drive em ${UI.date(hoje)} (pasta 00_SERVIÇOS/${top}).`, equipe: [], pasta: '00_VTN/00_SERVIÇOS/' + top, criadoEm: agora };
        const rt = db.obras.find(x => x.rtId); if (rt) { o.rtId = rt.rtId; o.gestorId = rt.gestorId || rt.rtId; }
        db.obras.push(o); porPasta[norm(top)] = o; r.obras.push(o.id + ' ' + o.nome);
      }
      obraDoTop[top] = o || null;
      if (o && (!o.pasta || /00_SERVI[ÇC]OS$/.test(o.pasta))) { o.pasta = '00_VTN/00_SERVIÇOS/' + top; porPasta[norm(top)] = o; }
    });
    // 2) todos os arquivos
    const docsPorObra = {};
    itens.forEach(([rel, tam, ms]) => {
      if (tam < 0) return; r.total++;
      if (LIXO.test(rel) || SENSIVEL.test(rel)) { r.ignorados++; return; }
      const p = rel.split('/'); const nome = p.pop(); let obraId = null, pasta;
      if (p[0] === '00_SERVIÇOS' && obraDoTop[p[1]]) { obraId = obraDoTop[p[1]].id; pasta = p.slice(2).join('/') || '(raiz)'; }
      else pasta = p.join('/');
      const data = ms ? new Date(ms).toISOString().slice(0, 10) : '';
      const a = idx.get('@' + rel.toLowerCase()) || idx.get(chave(obraId, pasta, nome));
      if (a) { vistos.add(a.id); const pat = {}; if (!a.caminho) pat.caminho = rel; if (tam && a.tamanho !== tam) pat.tamanho = tam; if (data && !a.temBlob && a.data !== data) pat.data = data; if (a.ausenteNoDrive) pat.ausenteNoDrive = false;
        if (Object.keys(pat).length) { Object.assign(a, pat); if (pat.tamanho || pat.data) r.atualizados++; } }
      else { const n = { id: Store.nextId('arquivos'), obraId, pasta, nome, tamanho: tam, data, temBlob: false, origem: 'Drive (OneDrive 00_VTN)', caminho: rel, tipoDoc: tipoDoc(nome), criadoEm: agora };
        db.arquivos.push(n); idx.set('@' + rel.toLowerCase(), n); vistos.add(n.id); r.novos++; }
      if (obraId) (docsPorObra[obraId] = docsPorObra[obraId] || []).push(norm(nome));
    });
    // 3) arquivos do índice que não estão mais no drive (só marca, nunca apaga)
    db.arquivos.forEach(a => { if (!vistos.has(a.id) && !a.temBlob && a.caminho && !a.ausenteNoDrive) { a.ausenteNoDrive = true; r.ausentes++; } });
    // 4) status: só avança (nunca volta) quando os documentos mostram
    Object.entries(docsPorObra).forEach(([oid, ns]) => { const o = db.obras.find(x => x.id === oid); if (!o) return; const tem = re => ns.some(n => re.test(n));
      let novo = null;
      if (o.status === 'Prospecção' && tem(/PROPOSTA|ORCAMENTO/)) novo = 'Orçamento';
      if (['Prospecção', 'Orçamento'].includes(o.status) && tem(/CONTRATO.*ASSINAD|ASSINAD.*CONTRATO/)) novo = 'Contratada';
      if (novo) { r.status.push(`${o.id} ${o.nome}: ${o.status} → ${novo}`); o.status = novo; o.atualizadoEm = agora; } });
    db.sincDrive = { em: agora, por: eu.nome || eu.email || '', total: r.total, novos: r.novos, obras: r.obras.length };
    Store.save(); rodando = false;
    const resumo = `Drive sincronizado: ${r.total} arquivos lidos · ${r.novos} novos no banco · ${r.atualizados} atualizados · ${r.obras.length} obra(s) nova(s) · ${r.clientes} cliente(s) novo(s)${r.status.length ? ' · ' + r.status.length + ' status avançado(s)' : ''}${r.ausentes ? ' · ' + r.ausentes + ' não encontrados no drive (mantidos)' : ''}.`;
    if (silencioso) { if (r.novos || r.obras.length) UI.toast(resumo); }
    else UI.modal({ title: 'Sincronização com o drive', body: `<div class="alert ok mb">${UI.icon('check-circle-2')}<div>${UI.esc(resumo)}</div></div>
      ${r.obras.length ? `<h3 class="mb">Obras criadas a partir das pastas</h3><ul>${r.obras.map(x => `<li>${UI.esc(x)}</li>`).join('')}</ul><p class="tiny muted">Complete status, valores e clientes de cada uma.</p>` : ''}
      ${r.status.length ? `<h3 class="mb mt">Status avançados pelos documentos</h3><ul>${r.status.map(x => `<li>${UI.esc(x)}</li>`).join('')}</ul>` : ''}
      <p class="tiny muted mt">${r.ignorados} arquivo(s) ignorado(s): temporários do Office/AutoCAD e arquivos de senha/certificado (esses nunca saem do computador). Nada foi apagado do banco nem do drive.</p>`, footer: '<button class="btn primary" data-close>OK</button>' });
    App.refresh();
    return r;
  }
  // automático: administrador logado no servidor, no máximo a cada 6 h (para os dois administradores não rodarem juntos)
  setInterval(() => { try {
    if (rodando || !window.Store || !Store.db || !(Store.db.obras || []).length || !window.VTN_PASTA || !VTN_PASTA.servidor) return;
    const eu = (Auth.current && Auth.current()) || {}; if (eu.papel !== 'admin') return;
    const u = (Store.db.sincDrive || {}).em; if (u && Date.now() - new Date(u).getTime() < 6 * 3600e3) return;
    rodar({ silencioso: true });
  } catch (e) {} }, 60000);
  return { rodar, RAIZES };
})();
