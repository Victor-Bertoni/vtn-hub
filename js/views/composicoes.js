/* =========================================================
   COMPOSIÇÕES DE SERVIÇOS E MATERIAIS + CUB/m² (Sinduscon-MG)
   - Composição = mão de obra VTN (planilha de composição de preços)
     + materiais (insumo × coeficiente de consumo por unidade).
   - Administradores (Victor e Ismael) alteram direto; os demais
     alteram e a mudança vai para Aprovações.
   ========================================================= */
window.Comp = (() => {
  const SEED = window.VTN_COMP_SEED || { insumos: [], comp: [], cub: null };
  const pad = (p, n) => p + '-' + String(n).padStart(4, '0');
  function base() {
    const insumos = SEED.insumos.map((x, i) => ({ id: pad('IN', i + 1), cod: x[0], nome: x[1], un: x[2], tipo: x[3], preco: x[4], fonte: x[5] || '', atualizadoEm: x[6] || '' }));
    const porCod = Object.fromEntries(insumos.map(x => [x.cod, x.id]));
    const composicoes = SEED.comp.map((c, i) => ({ id: pad('CP', i + 1), codigo: 'VTN-' + String(i + 1).padStart(3, '0'), grupo: c.g, nome: c.n, un: c.u, maoObra: c.mo || 0, terceiro: c.t || 0, itens: (c.i || []).map(([cod, coef]) => ({ insumoId: porCod[cod], coef })), obs: c.o || '' }));
    return { insumos, composicoes, cub: JSON.parse(JSON.stringify(SEED.cub)), v: SEED.v || 1 };
  }
  /* atualiza dados já gravados com uma base nova, sem apagar o que a equipe editou */
  function migrar(db) {
    const b = base(); if ((db.compSeedV || 1) >= b.v) return false;
    const porCodDb = Object.fromEntries((db.insumos || []).map(x => [x.cod, x]));
    const mapa = {};
    b.insumos.forEach(n => { const o = porCodDb[n.cod]; if (o) { mapa[n.id] = o.id; if (!o.atualizadoEm || o.atualizadoEm <= '2026-11-01' && !(+o.preco && o.fonte && o.fonte !== 'VTN')) Object.assign(o, { nome: n.nome, un: n.un, preco: n.preco, fonte: n.fonte, atualizadoEm: n.atualizadoEm }); } else { const id = Store.nextId('insumos'); db.insumos.push(Object.assign({}, n, { id })); mapa[n.id] = id; } });
    const nomes = new Set((db.composicoes || []).map(c => c.nome));
    b.composicoes.forEach(n => {
      const itens = n.itens.map(i => ({ insumoId: mapa[i.insumoId], coef: i.coef }));
      const o = db.composicoes.find(c => c.nome === n.nome);
      if (!o) { db.composicoes.push(Object.assign({}, n, { id: Store.nextId('composicoes'), codigo: 'VTN-' + String(db.composicoes.length + 1).padStart(3, '0'), itens })); return; }
      if (!o.terceiro && n.terceiro) o.terceiro = n.terceiro;
      if (!(+o.maoObra) && n.maoObra) o.maoObra = n.maoObra;
      if (!(o.itens || []).length && itens.length) o.itens = itens;
      if (!o.obs && n.obs) o.obs = n.obs;
    });
    db.compSeedV = b.v; return true;
  }
  /* garante os dados no banco (só quem pode gravar direto); os demais veem a base sem gravar */
  function dados() {
    const db = Store.db; const pode = !(window.Cloud && Cloud.ativo) || Cloud.podeEditar;
    if (!Array.isArray(db.insumos) || !Array.isArray(db.composicoes) || !db.cub) {
      const b = base();
      if (pode) {
        if (!Array.isArray(db.insumos)) db.insumos = b.insumos;
        if (!Array.isArray(db.composicoes)) db.composicoes = b.composicoes;
        if (!db.cub) db.cub = b.cub;
        db.compSeedV = b.v;
        db.seq = db.seq || {}; db.seq.IN = Math.max(db.seq.IN || 0, db.insumos.length); db.seq.CP = Math.max(db.seq.CP || 0, db.composicoes.length);
        Store.save();
      } else return { insumos: db.insumos || b.insumos, composicoes: db.composicoes || b.composicoes, cub: db.cub || b.cub, base: true };
    }
    if (pode && migrar(db)) Store.save();
    return { insumos: db.insumos, composicoes: db.composicoes, cub: cubAtual(db.cub) };
  }
  /* CUB mais novo gravado pela tarefa mensal (sistema/cub), se houver */
  let cubNuvem = null;
  function cubAtual(c) { return cubNuvem && cubNuvem.mes && (!c || cubNuvem.mes > (c.mes || '')) ? cubNuvem : c; }
  document.addEventListener('vtn:pronto', async () => {
    try { const db = window.claude && await claude.use('db'); if (!db) return; db.collection('sistema').doc('cub').onSnapshot(s => { const d = s && s.data && s.data(); if (d && d.onerado) { cubNuvem = d; if (location.hash.startsWith('#/composicoes')) App.refresh(); } }, () => {}); } catch (e) {}
  });
  function custo(c, ins) {
    const M = Object.fromEntries((ins || dados().insumos).map(x => [x.id, x]));
    let mat = 0, faltam = 0;
    const linhas = (c.itens || []).map(i => { const x = M[i.insumoId] || { nome: '(insumo removido)', un: '', preco: 0 }; const v = (+i.coef || 0) * (+x.preco || 0); mat += v; if (!(+x.preco)) faltam++; return { x, coef: +i.coef || 0, v }; });
    const mo = +c.maoObra || 0;
    return { mat, mo, total: mat + mo, linhas, faltam };
  }
  return { dados, custo, base, get refs() { return (Store.db && Store.db.compRefs) || SEED.refs || []; }, get fontes() { return (Store.db && Store.db.compFontes) || SEED.fontes || []; } };
})();

Views.composicoes = {
  perm: 'dashboard',
  st: { tab: 'comp', grupo: '', q: '', bdi: 25, area: 100, padrao: 'R1-N', regime: 'onerado', extra: 0 },
  render(el, tab) {
    const { icon, money, esc } = UI; const s = this.st; if (tab) s.tab = tab;
    const D = Comp.dados(); const admin = (Auth.current() || {}).papel === 'admin';
    const semPreco = D.insumos.filter(x => !(+x.preco)).length;
    const cub = D.cub || {};
    const T = [['comp', 'Composições de serviços', 'layers'], ['ins', 'Insumos e materiais', 'package'], ['cub', 'CUB/m² Minas Gerais', 'building-2']];
    el.innerHTML = `
      <div class="hero"><div><div class="hero-kicker">${icon('layers')} Engenharia de custos</div><h1>Composições e CUB</h1><p>Custo por serviço = mão de obra VTN + materiais (consumo × preço do insumo). ${admin ? 'Você pode alterar direto.' : 'Suas alterações vão para aprovação do Victor ou do Ismael.'}</p></div>
        <div class="hero-side"><div><span>Composições</span><b>${D.composicoes.length}</b><small>${D.insumos.length} insumos</small></div><div><span>CUB R8-N (${esc(this.mesNome(cub.mes))})</span><b>${cub.onerado ? money(cub.onerado['R8-N']) : '—'}</b><small>por m² · Sinduscon-MG</small></div></div></div>
      ${semPreco ? `<div class="alert warn mb">${icon('alert-triangle')} <b>${semPreco} insumos sem preço.</b> As composições mostram só a mão de obra até os preços serem cotados (aba Insumos).</div>` : ''}
      <div class="pill-tabs">${T.map(t => `<button class="${t[0] === s.tab ? 'active' : ''}" data-t="${t[0]}">${icon(t[2])} ${t[1]}</button>`).join('')}</div>
      <div id="cpc"></div>`;
    UI.$$('[data-t]', el).forEach(b => b.onclick = () => { s.tab = b.dataset.t; App.refresh(); });
    this['t_' + s.tab](UI.$('#cpc', el), D);
    UI.icons();
  },
  precoObra() { const r = Comp.refs.find(x => String(x[0]).indexOf('Obra completa') === 0); return r ? +r[2] || 0 : 0; },
  mesNome(m) { if (!m) return ''; const [a, b] = m.split('-'); return UI.MES_AB[+b - 1] + '/' + a; },

  /* ---------- composições ---------- */
  t_comp(c, D) {
    const { icon, money, esc, num } = UI; const s = this.st;
    const AZ = (a, b) => String(a || '').localeCompare(String(b || ''), 'pt-BR', { sensitivity: 'base', numeric: true });
    const grupos = [...new Set(D.composicoes.map(x => x.grupo))].sort(AZ);
    const L = D.composicoes.filter(x => (!s.grupo || x.grupo === s.grupo)).sort((a, b) => AZ(a.grupo, b.grupo) || AZ(a.nome, b.nome));
    const rows = L.map(x => Object.assign({ __attr: `data-cp="${x.id}" style="cursor:pointer"` }, x, { _c: Comp.custo(x, D.insumos) }));
    c.innerHTML = `<div class="row mb" style="gap:8px;flex-wrap:wrap"><select class="select" id="cpg" style="max-width:320px"><option value="">Todas as etapas</option>${grupos.map(g => `<option ${g === s.grupo ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select>
        <label class="tiny muted row" style="gap:6px">BDI para preço de venda <input class="input" id="cpbdi" type="number" value="${s.bdi}" style="width:70px">%</label>
        <span style="flex:1"></span><button class="btn primary keep" id="cpnova">${icon('plus')} Nova composição</button></div>
      <div class="card"><div class="card-b" style="padding:0">${UI.table([
        { h: 'Código', f: x => `<span class="mono tiny">${esc(x.codigo)}</span>` },
        { h: 'Serviço', f: x => `<b>${esc(x.nome)}</b><div class="tiny muted">${esc(x.grupo)}</div>` },
        { h: 'Un.', k: 'un' },
        { h: 'Mão de obra', num: 1, f: x => money(x._c.mo) },
        { h: 'Materiais', num: 1, f: x => x.itens.length ? money(x._c.mat) + (x._c.faltam ? ` <span class="badge warn" title="insumos sem preço">${x._c.faltam}</span>` : '') : '<span class="muted">—</span>' },
        { h: 'Custo direto', num: 1, f: x => `<b>${money(x._c.total)}</b>` },
        { h: 'Terceiro (custo)', num: 1, f: x => +x.terceiro ? money(x.terceiro) + (+x.maoObra ? `<div class="tiny ${x.maoObra - x.terceiro >= 0 ? 'up' : 'down'}" style="color:${x.maoObra - x.terceiro >= 0 ? '#16a34a' : '#dc2626'}">margem MO ${money(x.maoObra - x.terceiro)}</div>` : '') : '<span class="muted">—</span>' },
        { h: `Preço c/ BDI ${num(s.bdi)}%`, num: 1, f: x => money(x._c.total * (1 + s.bdi / 100)) }
      ], rows, { emptyMsg: 'Nenhuma composição.', foot: false })}</div></div>
      <p class="tiny muted mt">Clique numa linha para ver e editar. Terceiro = quanto a VTN paga ao subempreiteiro (planilha de serviços de terceiros). Consumos sem fonte própria são referência técnica — ajuste conforme a obra.</p>
      <details class="mt"><summary class="tiny muted" style="cursor:pointer">Arquivos da VTN usados nesta base</summary><ul class="tiny muted">${Comp.fontes.map(f => `<li>${esc(f)}</li>`).join('')}</ul></details>`;
    UI.$('#cpg', c).onchange = e => { s.grupo = e.target.value; App.refresh(); };
    UI.$('#cpbdi', c).onchange = e => { s.bdi = +e.target.value || 0; App.refresh(); };
    UI.$('#cpnova', c).onclick = () => this.editar(null);
    UI.$$('[data-cp]', c).forEach(r => r.onclick = () => this.editar(r.dataset.cp));
  },
  editar(id) {
    const { icon, money, esc, num } = UI; const D = Comp.dados();
    const orig = id ? D.composicoes.find(x => x.id === id) : null;
    const x = JSON.parse(JSON.stringify(orig || { grupo: this.st.grupo || 'Serviços Preliminares', nome: '', un: 'm²', maoObra: 0, itens: [], obs: '' }));
    const m = UI.modal({ title: orig ? 'Composição ' + orig.codigo : 'Nova composição', wide: true, body: '<div id="cpe"></div>',
      footer: `${orig ? `<button class="btn danger" id="cpdel">${icon('trash-2')} Excluir</button>` : ''}<span style="flex:1"></span><button class="btn" data-close>Cancelar</button><button class="btn primary keep" id="cpok">${icon('save')} Salvar</button>` });
    const box = m.$('#cpe');
    const grupos = [...new Set(D.composicoes.map(y => y.grupo))];
    const draw = () => {
      const r = Comp.custo(x, D.insumos);
      box.innerHTML = `<div class="grid g4" style="gap:10px">
          <div class="field" style="grid-column:span 2"><label>Serviço</label><input class="input" data-k="nome" value="${esc(x.nome)}"></div>
          <div class="field"><label>Etapa</label><input class="input" data-k="grupo" list="cpgl" value="${esc(x.grupo)}"><datalist id="cpgl">${grupos.map(g => `<option value="${esc(g)}">`).join('')}</datalist></div>
          <div class="field"><label>Unidade</label><input class="input" data-k="un" value="${esc(x.un)}"></div>
          <div class="field"><label>Mão de obra VTN (R$/${esc(x.un || 'un')})</label><input class="input" type="number" step="0.01" data-k="maoObra" value="${x.maoObra || 0}"></div>
          <div class="field"><label>Custo do terceiro (R$/${esc(x.un || 'un')})</label><input class="input" type="number" step="0.01" data-k="terceiro" value="${x.terceiro || 0}"></div></div>
        <h3 class="mk-h">Materiais por ${esc(x.un || 'unidade')}</h3>
        <div class="table-wrap"><table class="t"><thead><tr><th>Insumo</th><th>Un.</th><th class="num">Consumo</th><th class="num">Preço</th><th class="num">Subtotal</th><th></th></tr></thead><tbody>
          ${r.linhas.map((l, k) => `<tr><td>${esc(l.x.nome)}${+l.x.preco ? '' : ' <span class="badge warn">sem preço</span>'}</td><td>${esc(l.x.un)}</td><td class="num"><input class="input" type="number" step="0.0001" data-c="${k}" value="${l.coef}" style="width:90px;text-align:right"></td><td class="num">${money(l.x.preco || 0)}</td><td class="num">${money(l.v)}</td><td><button class="btn ghost icon sm" data-rm="${k}" title="Remover">${icon('x')}</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted tiny">Só mão de obra. Adicione materiais abaixo.</td></tr>'}
        </tbody><tfoot><tr><td colspan="4">Materiais</td><td class="num">${money(r.mat)}</td><td></td></tr><tr><td colspan="4">Mão de obra</td><td class="num">${money(r.mo)}</td><td></td></tr><tr><td colspan="4"><b>Custo direto por ${esc(x.un || 'un')}</b></td><td class="num"><b>${money(r.total)}</b></td><td></td></tr></tfoot></table></div>
        <div class="row mt"><select class="select" id="cpadd" style="flex:1"><option value="">+ Adicionar material/insumo…</option>${D.insumos.slice().sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base', numeric: true })).map(i => `<option value="${i.id}">${esc(i.nome)} (${esc(i.un)}${+i.preco ? ' · ' + money(i.preco) : ''})</option>`).join('')}</select></div>
        <div class="field mt"><label>Observações</label><textarea class="input" rows="2" data-k="obs">${esc(x.obs || '')}</textarea></div>`;
      UI.$$('[data-k]', box).forEach(i => i.onchange = () => { x[i.dataset.k] = ['maoObra', 'terceiro'].includes(i.dataset.k) ? +i.value || 0 : i.value; draw(); });
      UI.$$('[data-c]', box).forEach(i => i.onchange = () => { x.itens[+i.dataset.c].coef = +i.value || 0; draw(); });
      UI.$$('[data-rm]', box).forEach(b => b.onclick = () => { x.itens.splice(+b.dataset.rm, 1); draw(); });
      UI.$('#cpadd', box).onchange = e => { if (e.target.value) { x.itens.push({ insumoId: e.target.value, coef: 1 }); draw(); } };
      UI.icons();
    };
    draw();
    m.$('#cpok').onclick = () => {
      if (!x.nome.trim()) return UI.toast('Informe o nome do serviço.', 'err');
      this.garantir();
      if (orig) Object.assign(Store.db.composicoes.find(y => y.id === orig.id), x);
      else { x.id = Store.nextId('composicoes'); x.codigo = 'VTN-' + String(Store.db.composicoes.length + 1).padStart(3, '0'); Store.db.composicoes.push(x); }
      m.close(); Store.save(); App.refresh(); if (window.Cloud && Cloud.ativo && Cloud.podeEditar) UI.toast('Composição salva');
    };
    const del = m.$('#cpdel'); if (del) del.onclick = async () => { if (!(await UI.confirm('Excluir esta composição?', 'Excluir'))) return; this.garantir(); Store.db.composicoes = Store.db.composicoes.filter(y => y.id !== orig.id); m.close(); Store.save(); App.refresh(); };
  },
  /* para quem não grava direto: coloca a base no Store antes de editar (a diferença vira pedido) */
  garantir() { const D = Comp.dados(); if (!Array.isArray(Store.db.insumos)) Store.db.insumos = JSON.parse(JSON.stringify(D.insumos)); if (!Array.isArray(Store.db.composicoes)) Store.db.composicoes = JSON.parse(JSON.stringify(D.composicoes)); if (!Store.db.cub) Store.db.cub = JSON.parse(JSON.stringify(D.cub)); },

  /* ---------- insumos ---------- */
  t_ins(c, D) {
    const { icon, money, esc, date } = UI;
    const uso = id => D.composicoes.filter(x => x.itens.some(i => i.insumoId === id)).length;
    const rows = D.insumos.slice().sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base', numeric: true })).map(x => Object.assign({ __attr: `data-in="${x.id}" style="cursor:pointer"` }, x));
    c.innerHTML = `<div class="row mb"><span class="tiny muted">Atualize os preços com as cotações dos fornecedores: todas as composições recalculam na hora.</span><span style="flex:1"></span><button class="btn primary keep" id="innovo">${icon('plus')} Novo insumo</button></div>
      <div class="card"><div class="card-b" style="padding:0">${UI.table([
        { h: 'Insumo', f: x => `<b>${esc(x.nome)}</b>` }, { h: 'Tipo', k: 'tipo' }, { h: 'Un.', k: 'un' },
        { h: 'Preço', num: 1, f: x => +x.preco ? money(x.preco) : '<span class="badge warn">a cotar</span>' },
        { h: 'Fonte / fornecedor', f: x => esc(x.fonte || '—') }, { h: 'Atualizado', f: x => x.atualizadoEm ? date(x.atualizadoEm) : '—' },
        { h: 'Usado em', num: 1, f: x => uso(x.id) + ' comp.' }
      ], rows, { foot: false })}</div></div>`;
    UI.$('#innovo', c).onclick = () => this.editarIns(null);
    UI.$$('[data-in]', c).forEach(r => r.onclick = () => this.editarIns(r.dataset.in));
  },
  async editarIns(id) {
    const D = Comp.dados(); const orig = id ? D.insumos.find(x => x.id === id) : null;
    const v = await UI.formModal({ title: orig ? 'Insumo' : 'Novo insumo', values: orig || { tipo: 'Material', un: 'unid', preco: 0 }, list: [
      { k: 'nome', l: 'Nome', req: 1 }, { k: 'tipo', l: 'Tipo', t: 'select', o: ['Material', 'Mão de obra', 'Equipamento'] }, { k: 'un', l: 'Unidade' },
      { k: 'preco', l: 'Preço (R$)', t: 'number' }, { k: 'fonte', l: 'Fonte / fornecedor' }],
      onDelete: orig ? () => { this.garantir(); Store.db.insumos = Store.db.insumos.filter(x => x.id !== orig.id); Store.save(); App.refresh(); } : undefined });
    if (!v) return;
    this.garantir(); v.preco = +v.preco || 0; v.atualizadoEm = UI.today();
    if (orig) Object.assign(Store.db.insumos.find(x => x.id === orig.id), v);
    else { v.id = Store.nextId('insumos'); Store.db.insumos.push(v); }
    Store.save(); App.refresh();
  },

  /* ---------- CUB ---------- */
  t_cub(c, D) {
    const { icon, money, esc, num, pct } = UI; const s = this.st; const cub = D.cub || {};
    const P = [['R1-B', 'Residência unifamiliar · baixo'], ['R1-N', 'Residência unifamiliar · normal'], ['R1-A', 'Residência unifamiliar · alto'], ['PP4-B', 'Prédio popular 4 pav. · baixo'], ['PP4-N', 'Prédio popular 4 pav. · normal'], ['R8-B', 'Residencial 8 pav. · baixo'], ['R8-N', 'Residencial 8 pav. · normal (CUB padrão)'], ['R8-A', 'Residencial 8 pav. · alto'], ['R16-N', 'Residencial 16 pav. · normal'], ['R16-A', 'Residencial 16 pav. · alto'], ['PIS', 'Projeto de interesse social']];
    const O = cub.onerado || {}; const V = cub.varMes || {};
    const val = O[s.padrao] || 0; const des = s.regime === 'desonerado' && cub.desonerado && cub.desonerado[s.padrao];
    const unit = des || val; const tot = (+s.area || 0) * unit * (1 + (+s.extra || 0) / 100);
    c.innerHTML = `<div class="grid g2" style="gap:14px;align-items:start">
      <div class="card"><div class="card-h"><h3>CUB/m² · ${esc(this.mesNome(cub.mes))}</h3><span class="tiny muted">${esc(cub.regime === 'onerado' ? 'regime onerado' : '')}</span></div><div class="card-b" style="padding:0">
        <div class="table-wrap"><table class="t"><thead><tr><th>Padrão</th><th>Descrição</th><th class="num">R$/m²</th><th class="num">Mês</th></tr></thead><tbody>
        ${P.filter(p => O[p[0]]).map(([k, d]) => `<tr ${k === s.padrao ? 'style="background:var(--bg-2)"' : ''}><td><b>${k}</b></td><td class="tiny">${d}</td><td class="num"><b>${money(O[k])}</b></td><td class="num ${V[k] > 0 ? 'up' : V[k] < 0 ? 'down' : ''}">${V[k] != null ? (V[k] > 0 ? '+' : '') + num(V[k], 2) + '%' : ''}</td></tr>`).join('')}
        </tbody></table></div>
        <div class="card-b tiny muted">R8-N desonerado: ${cub.desonerado && cub.desonerado['R8-N'] ? money(cub.desonerado['R8-N']) : '—'} · acumulado no ano ${cub.acAno != null ? num(cub.acAno, 2) + '%' : '—'} · 12 meses ${cub.ac12 != null ? num(cub.ac12, 2) + '%' : '—'}<br>Fonte: ${esc(cub.fonte || 'Sinduscon-MG')}. Padrões comerciais (CAL, CSL) e galpão (GI) não estão nesta tabela.</div></div></div>
      <div class="stack">
        <div class="card"><div class="card-h"><h3>${icon('calculator')} Estimativa pelo CUB</h3></div><div class="card-b">
          <div class="grid g2" style="gap:10px">
            <div class="field"><label>Área construída (m²)</label><input class="input" id="cba" type="number" value="${s.area}"></div>
            <div class="field"><label>Padrão</label><select class="select" id="cbp">${P.filter(p => O[p[0]]).map(([k, d]) => `<option value="${k}" ${k === s.padrao ? 'selected' : ''}>${k} – ${d}</option>`).join('')}</select></div>
            <div class="field"><label>Regime</label><select class="select" id="cbr"><option value="onerado">Onerado</option><option value="desonerado" ${s.regime === 'desonerado' ? 'selected' : ''}>Desonerado (só R8-N)</option></select></div>
            <div class="field"><label>Itens fora do CUB (%)</label><input class="input" id="cbx" type="number" value="${s.extra}" title="fundações especiais, elevadores, BDI, projetos, terreno…"></div></div>
          <div class="kpi-big mt"><span class="tiny muted">Custo estimado</span><div style="font-size:26px;font-weight:800">${money(tot)}</div><span class="tiny muted">${num(+s.area || 0)} m² × ${money(unit)}${+s.extra ? ` + ${num(s.extra)}%` : ''}</span></div>
          <p class="tiny muted">O CUB (NBR 12721) não inclui fundações especiais, elevadores, equipamentos, paisagismo, BDI, projetos, impostos e terreno. Use o campo "itens fora do CUB" para somá-los.</p>
          <div class="row"><button class="btn primary keep" id="cborc">${icon('file-plus')} Criar orçamento com esta estimativa</button>${(Auth.current() || {}).papel === 'admin' ? `<button class="btn keep" id="cbedit">${icon('pencil')} Atualizar CUB</button>` : ''}</div><div id="cbaviso"></div></div></div>
        <div class="card"><div class="card-h"><h3>R8-N · últimos 12 meses</h3></div><div class="card-b"><div style="height:200px"><canvas id="cbch"></canvas></div></div></div>
        ${Comp.refs.length ? `<div class="card"><div class="card-h"><h3>${icon('bookmark')} Referências de preço da VTN</h3></div><div class="card-b" style="padding:0"><div class="table-wrap"><table class="t"><tbody>${Comp.refs.map(r => `<tr><td>${esc(r[0])}<div class="tiny muted">${esc(r[3])}</div></td><td class="num"><b>${money(r[2])}</b></td><td class="tiny">${esc(r[1])}</td></tr>`).join('')}</tbody></table></div>${O['R1-N'] ? `<div class="card-b tiny muted">Obra completa VTN = ${num(this.precoObra() / O['R1-N'] * 100, 0)}% do CUB R1-N (${money(O['R1-N'])}/m²).</div>` : ''}</div></div>` : ''}
      </div></div>`;
    const set = (k, f) => e => { s[k] = f ? f(e.target.value) : e.target.value; App.refresh(); };
    UI.$('#cba', c).onchange = set('area', v => +v || 0); UI.$('#cbp', c).onchange = set('padrao'); UI.$('#cbr', c).onchange = set('regime'); UI.$('#cbx', c).onchange = set('extra', v => +v || 0);
    if (UI.$('#cbedit', c)) UI.$('#cbedit', c).onclick = () => this.editarCub(cub);
    (async () => { try { const db = window.claude && await claude.use('db'); if (!db) return; const a = await db.collection('sistema').doc('cub_aviso').get(); const v = a.exists && a.data(); const box = UI.$('#cbaviso', c);
      if (v && v.mes > (cub.mes || '') && box) { box.innerHTML = `<div class="alert warn mt">${icon('bell')}<div><b>Saiu o CUB de ${esc(this.mesNome(v.mes))}.</b> <a href="#" id="cbpdf">Abrir a tabela (PDF)</a> e clique em "Atualizar CUB".</div></div>`; UI.icons(); UI.$('#cbpdf', box).onclick = e => { e.preventDefault(); if (window.VTN_PASTA && v.arquivo) VTN_PASTA.abrir(v.arquivo).catch(() => window.open(v.url, '_blank')); else window.open(v.url, '_blank'); }; } } catch (e) {} })();
    UI.$('#cborc', c).onclick = () => { if (!Views.orcamentos || !Views.orcamentos.novo) return; Views.orcamentos.novo({ titulo: `Estimativa CUB ${s.padrao} – ${num(s.area)} m²`, itens: [{ desc: `Construção padrão ${s.padrao} (CUB/m² Sinduscon-MG ${this.mesNome(cub.mes)}${s.regime === 'desonerado' ? ', desonerado' : ''})${+s.extra ? ` + ${num(s.extra)}% itens fora do CUB` : ''}`, un: 'm²', qtd: +s.area || 0, unit: +(unit * (1 + (+s.extra || 0) / 100)).toFixed(2) }] }); };
    const H = cub.hist || [], HD = cub.histDes || [];
    UI.chart('cbch', { type: 'line', data: { labels: H.map(h => this.mesNome(h[0])), datasets: [{ label: 'Onerado', data: H.map(h => h[1]) }].concat(HD.length ? [{ label: 'Desonerado', data: HD.map(h => h[1]) }] : []) }, options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { ticks: { callback: v => 'R$ ' + v.toLocaleString('pt-BR') } } } } });
  },
  /* administradores digitam o CUB do mês (tabela do Sinduscon-MG) – vale para todos */
  editarCub(cub) {
    const P = ['R1-B', 'R1-N', 'R1-A', 'PP4-B', 'PP4-N', 'R8-B', 'R8-N', 'R8-A', 'R16-N', 'R16-A', 'PIS']; const O = cub.onerado || {}, V = cub.varMes || {};
    const prox = (() => { const [a, m] = (cub.mes || '2026-09').split('-').map(Number); const d = new Date(a, m, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); })();
    const m = UI.modal({ title: 'Atualizar CUB/m² (Sinduscon-MG)', wide: true, body: `<p class="tiny muted">Copie da tabela oficial do Sinduscon-MG (regime onerado). A variação do mês é opcional.</p>
      <div class="grid g4" style="gap:10px"><div class="field"><label>Mês de referência</label><input class="input" type="month" id="cbmes" value="${prox}"></div><div class="field"><label>R8-N desonerado</label><input class="input" type="number" step="0.01" id="cbdes" value=""></div></div>
      <div class="table-wrap mt"><table class="t"><thead><tr><th>Padrão</th><th class="num">R$/m²</th><th class="num">Variação no mês (%)</th></tr></thead><tbody>${P.map(k => `<tr><td><b>${k}</b></td><td class="num"><input class="input" type="number" step="0.01" data-v="${k}" placeholder="${O[k] || ''}" style="width:130px;text-align:right"></td><td class="num"><input class="input" type="number" step="0.01" data-p="${k}" style="width:100px;text-align:right"></td></tr>`).join('')}</tbody></table></div>`,
      footer: `<button class="btn" data-close>Cancelar</button><button class="btn primary keep" id="cbok">Salvar para todos</button>` });
    m.$('#cbok').onclick = async () => {
      const mes = m.$('#cbmes').value; const on = {}, vm = {};
      P.forEach(k => { const v = +m.$(`[data-v="${k}"]`).value; if (v) on[k] = v; const p = m.$(`[data-p="${k}"]`).value; if (p !== '') vm[k] = +p; });
      if (!mes || !on['R8-N']) return UI.toast('Informe o mês e pelo menos o R8-N.', 'err');
      const hist = (cub.hist || []).filter(h => h[0] !== mes).concat([[mes, on['R8-N']]]).sort((a, b) => a[0].localeCompare(b[0])).slice(-13);
      const des = +m.$('#cbdes').value; const histDes = des ? (cub.histDes || []).filter(h => h[0] !== mes).concat([[mes, des]]).sort((a, b) => a[0].localeCompare(b[0])).slice(-13) : (cub.histDes || []);
      const histLongo = (cub.histLongo || cub.hist || []).filter(h => h[0] !== mes).concat([[mes, on['R8-N']]]).sort((a, b) => a[0].localeCompare(b[0])).slice(-180);
      const novo = Object.assign({}, cub, { mes, onerado: Object.assign({}, O, on), varMes: vm, desonerado: des ? { 'R8-N': des } : (cub.desonerado || {}), hist, histDes, histLongo, fonte: 'Sinduscon-MG (CUB/m², NBR 12721) – digitado no VTN Hub em ' + new Date().toLocaleDateString('pt-BR') });
      const ini = hist.find(h => h[0].endsWith('-12') && h[0] < mes); if (ini) novo.acAno = +((on['R8-N'] / ini[1] - 1) * 100).toFixed(2);
      if (hist.length >= 13) novo.ac12 = +((on['R8-N'] / hist[0][1] - 1) * 100).toFixed(2);
      try { const db = await claude.use('db'); await db.collection('sistema').doc('cub').set(novo); m.close(); UI.toast('CUB de ' + this.mesNome(mes) + ' salvo para todos'); App.refresh(); }
      catch (e) { UI.toast('Não foi possível salvar.', 'err'); }
    };
  }
};
