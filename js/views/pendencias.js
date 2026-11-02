/* Pendências e entregas */
Views.pendencias = {
  perm: 'pendencias',
  st: { tab: 'pend', obra: '', status: 'abertas' },
  render(el) {
    const { icon, esc } = UI; const s = this.st;
    const P = Store.all('pendencias'), E = Store.all('entregas'), t = UI.today();
    el.innerHTML = `<div class="page-head"><div><h1>Pendências e entregas</h1><p>${P.filter(p => p.status !== 'Resolvida').length} pendências abertas (${P.filter(p => p.status !== 'Resolvida' && p.prazo && p.prazo < t).length} atrasadas) · ${E.filter(e => !['Entregue', 'Aprovada'].includes(e.status)).length} entregas pendentes</p></div>
      <div class="row"><button class="btn" onclick="Views.pendencias.editEntrega()">${icon('package-plus')} Nova entrega</button><button class="btn primary" onclick="Views.pendencias.editPend()">${icon('plus')} Nova pendência</button></div></div>
      <div class="toolbar"><select class="select" id="po"><option value="">Todas as obras</option>${Store.all('obras').map(o => `<option value="${o.id}" ${o.id === s.obra ? 'selected' : ''}>${o.id} · ${esc(o.nome)}</option>`).join('')}</select>
        <select class="select" id="ps"><option value="abertas" ${s.status === 'abertas' ? 'selected' : ''}>Somente abertas</option><option value="" ${!s.status ? 'selected' : ''}>Todas</option><option value="fechadas" ${s.status === 'fechadas' ? 'selected' : ''}>Concluídas</option></select></div>
      <div class="tabs"><button class="${s.tab === 'pend' ? 'active' : ''}" data-t="pend">${icon('alert-circle')} Pendências</button><button class="${s.tab === 'ent' ? 'active' : ''}" data-t="ent">${icon('package-check')} Entregas</button></div>
      <div class="card" id="pc"></div>`;
    UI.$('#po', el).onchange = e => { s.obra = e.target.value; App.refresh(); };
    UI.$('#ps', el).onchange = e => { s.status = e.target.value; App.refresh(); };
    UI.$$('[data-t]', el).forEach(b => b.onclick = () => { s.tab = b.dataset.t; App.refresh(); });
    const c = UI.$('#pc', el);
    const fecha = s.tab === 'pend' ? x => x.status === 'Resolvida' : x => ['Entregue', 'Aprovada'].includes(x.status);
    let l = (s.tab === 'pend' ? P : E).filter(x => (!s.obra || x.obraId === s.obra) && (s.status === 'abertas' ? !fecha(x) : s.status === 'fechadas' ? fecha(x) : true));
    c.innerHTML = s.tab === 'pend' ? this.tPend(l) : this.tEnt(l);
    this.bind(c);
  },
  tPend(l, semObra) {
    const { esc, date } = UI; const t = UI.today();
    const ord = { 'Crítica': 0, 'Alta': 1, 'Média': 2, 'Baixa': 3 };
    return UI.table([{ h: '', f: p => `<input type="checkbox" data-res="${p.id}" ${p.status === 'Resolvida' ? 'checked' : ''} title="Marcar como resolvida">` },
      { h: 'ID', f: p => UI.idLink(p.id) }, { h: 'Pendência', f: p => `<span class="plink" data-goto="${p.id}" style="${p.status === 'Resolvida' ? 'text-decoration:line-through;opacity:.6' : ''}">${esc(p.titulo)}</span>${p.descricao ? `<div class="tiny muted">${esc(p.descricao)}</div>` : ''}` },
      ...(semObra ? [] : [{ h: 'Obra', f: p => UI.idLink(p.obraId) }]), { h: 'Responsável', f: p => UI.pessoa(p.responsavelId) },
      { h: 'Prioridade', f: p => UI.badge(p.prioridade) }, { h: 'Prazo', f: p => `<span style="${p.status !== 'Resolvida' && p.prazo && p.prazo < t ? 'color:var(--err);font-weight:600' : ''}">${date(p.prazo)}</span>` }, { h: 'Status', f: p => UI.badge(p.status) }],
      l.sort((a, b) => (a.status === 'Resolvida') - (b.status === 'Resolvida') || ord[a.prioridade] - ord[b.prioridade] || (a.prazo || '9').localeCompare(b.prazo || '9')), { emptyMsg: 'Nenhuma pendência. 🎉' });
  },
  tEnt(l, semObra) {
    const { esc, date } = UI; const t = UI.today();
    return UI.table([{ h: 'ID', f: e => UI.idLink(e.id) }, { h: 'Entrega', f: e => `<span class="plink" data-goto="${e.id}">${esc(e.titulo)}</span>` }, ...(semObra ? [] : [{ h: 'Obra', f: e => UI.idLink(e.obraId) }]),
      { h: 'Tipo', k: 'tipo' }, { h: 'Responsável', f: e => UI.pessoa(e.responsavelId) },
      { h: 'Prazo', f: e => `<span style="${!['Entregue', 'Aprovada'].includes(e.status) && e.prazo && e.prazo < t ? 'color:var(--err);font-weight:600' : ''}">${date(e.prazo)}</span>` },
      { h: 'Entregue em', f: e => date(e.dataEntrega) }, { h: 'Status', f: e => UI.badge(e.status) }],
      l.sort((a, b) => (a.prazo || '').localeCompare(b.prazo || '')), { emptyMsg: 'Nenhuma entrega.' });
  },
  bind(c) {
    UI.$$('[data-res]', c).forEach(cb => cb.onchange = () => { Store.update('pendencias', cb.dataset.res, { status: cb.checked ? 'Resolvida' : 'Aberta', resolvidaEm: cb.checked ? UI.today() : '' }); App.refresh(); });
  },
  blocoObra(c, o) {
    const { icon } = UI;
    const P = Store.where('pendencias', p => p.obraId === o.id), E = Store.where('entregas', e => e.obraId === o.id);
    c.innerHTML = `<div class="grid g2">
      <div class="card"><div class="card-h"><h3>Pendências</h3><button class="btn sm primary" onclick="Views.pendencias.editPend(null,{obraId:'${o.id}'})">${icon('plus')} Pendência</button></div>${this.tPend(P, 1)}</div>
      <div class="card"><div class="card-h"><h3>Entregas</h3><button class="btn sm primary" onclick="Views.pendencias.editEntrega(null,{obraId:'${o.id}'})">${icon('plus')} Entrega</button></div>${this.tEnt(E, 1)}</div></div>`;
    this.bind(c);
  },
  async editPend(id, preset = {}) {
    const p = id ? Store.get('pendencias', id) : Object.assign({ status: 'Aberta', prioridade: 'Média' }, preset);
    const list = [{ k: 'titulo', l: 'Pendência', req: 1, full: 1 }, { k: 'obraId', l: 'Obra', t: 'select', o: () => Store.all('obras').map(o => [o.id, o.id + ' · ' + o.nome]) },
      { k: 'responsavelId', l: 'Responsável', t: 'select', o: () => Store.all('pessoas').map(x => [x.id, x.nome]) },
      { k: 'prioridade', l: 'Prioridade', t: 'select', o: LISTAS.prioridade }, { k: 'status', l: 'Status', t: 'select', o: LISTAS.statusPend },
      { k: 'prazo', l: 'Prazo', t: 'date' }, { k: 'descricao', l: 'Detalhes', t: 'textarea', full: 1 }];
    const d = await UI.formModal({ title: id ? 'Pendência ' + id : 'Nova pendência', list, values: p, onDelete: id ? () => { Store.remove('pendencias', id); App.refresh(); } : null });
    if (!d) return; const r = id ? Store.update('pendencias', id, d) : Store.insert('pendencias', d); UI.toast('Salvo: ' + r.id); App.renderShell(); App.route();
  },
  async editEntrega(id, preset = {}) {
    const e = id ? Store.get('entregas', id) : Object.assign({ status: 'Pendente', tipo: 'Documento' }, preset);
    const list = [{ k: 'titulo', l: 'Entrega', req: 1, full: 1 }, { k: 'obraId', l: 'Obra', t: 'select', o: () => Store.all('obras').map(o => [o.id, o.id + ' · ' + o.nome]) },
      { k: 'tipo', l: 'Tipo', t: 'select', o: ['Documento', 'Projeto', 'Etapa', 'Medição', 'Material', 'Chaves', 'Outro'] },
      { k: 'responsavelId', l: 'Responsável', t: 'select', o: () => Store.all('pessoas').map(x => [x.id, x.nome]) },
      { k: 'status', l: 'Status', t: 'select', o: LISTAS.statusEntrega }, { k: 'prazo', l: 'Prazo', t: 'date' }, { k: 'dataEntrega', l: 'Data da entrega', t: 'date' },
      { k: 'obs', l: 'Observações', t: 'textarea', full: 1 }];
    const d = await UI.formModal({ title: id ? 'Entrega ' + id : 'Nova entrega', list, values: e, onDelete: id ? () => { Store.remove('entregas', id); App.refresh(); } : null });
    if (!d) return;
    if (['Entregue', 'Aprovada'].includes(d.status) && !d.dataEntrega) d.dataEntrega = UI.today();
    const r = id ? Store.update('entregas', id, d) : Store.insert('entregas', d); UI.toast('Salvo: ' + r.id); App.refresh();
  }
};
Open.PD = id => Views.pendencias.editPend(id);
Open.EN = id => Views.pendencias.editEntrega(id);
