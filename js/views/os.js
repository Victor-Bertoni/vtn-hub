/* Ordens de serviço — kanban (arrastar e soltar) e lista */
Views.os = {
  perm: 'os',
  st: { modo: 'kanban', obra: '', resp: '' },
  render(el) {
    const { icon, esc } = UI; const s = this.st;
    let list = Store.all('os');
    if (s.obra) list = list.filter(x => x.obraId === s.obra);
    if (s.resp) list = list.filter(x => x.responsavelId === s.resp);
    el.innerHTML = `<div class="page-head"><div><h1>Ordens de serviço</h1><p>${list.filter(x => !['Concluída', 'Cancelada'].includes(x.status)).length} abertas · arraste os cartões para mudar o status</p></div>
      <button class="btn primary" onclick="Views.os.edit()">${icon('plus')} Nova OS</button></div>
      <div class="toolbar"><select class="select" id="oso"><option value="">Todas as obras</option>${Store.all('obras').map(o => `<option value="${o.id}" ${o.id === s.obra ? 'selected' : ''}>${o.id} · ${esc(o.nome)}</option>`).join('')}</select>
        <select class="select" id="osr"><option value="">Todos responsáveis</option>${Store.all('pessoas').filter(p => p.tipo !== 'Cliente').map(p => `<option value="${p.id}" ${p.id === s.resp ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select>
        <div class="row" style="margin-left:auto"><button class="btn sm ${s.modo === 'kanban' ? 'primary' : ''}" data-m="kanban">${icon('kanban')}</button><button class="btn sm ${s.modo === 'lista' ? 'primary' : ''}" data-m="lista">${icon('list')}</button></div></div>
      <div id="osc"></div>`;
    UI.$('#oso', el).onchange = e => { s.obra = e.target.value; App.refresh(); };
    UI.$('#osr', el).onchange = e => { s.resp = e.target.value; App.refresh(); };
    UI.$$('[data-m]', el).forEach(b => b.onclick = () => { s.modo = b.dataset.m; App.refresh(); });
    const c = UI.$('#osc', el);
    if (s.modo === 'kanban') this.kanban(c, list); else c.innerHTML = `<div class="card">${this.tabela(list)}</div>`;
  },
  card(x) {
    const { esc, date } = UI; const ck = x.checklist || [];
    const late = x.prazo && x.prazo < UI.today() && !['Concluída', 'Cancelada'].includes(x.status);
    return `<div class="kcard" draggable="true" data-os="${x.id}"><div class="row between"><span class="idlink" data-goto="${x.id}">${x.id}</span>${UI.badge(x.prioridade)}</div>
      <div style="font-weight:600;margin:6px 0 4px">${esc(x.titulo)}</div><div class="tiny muted">${x.obraId ? x.obraId + ' · ' : ''}${esc((Store.get('pessoas', x.responsavelId) || {}).nome || 'Sem responsável')}</div>
      <div class="row between tiny mt" style="margin-top:8px"><span style="${late ? 'color:var(--err);font-weight:600' : ''}">${UI.icon('calendar')} ${date(x.prazo)}</span>${ck.length ? `<span>${UI.icon('check-square')} ${ck.filter(c => c.ok).length}/${ck.length}</span>` : ''}</div></div>`;
  },
  kanban(c, list) {
    c.innerHTML = `<div class="kanban">${LISTAS.statusOS.map(st => { const l = list.filter(x => x.status === st); return `<div class="kcol" data-col="${st}"><h4><span>${st}</span><span class="badge">${l.length}</span></h4>${l.map(x => this.card(x)).join('')}</div>`; }).join('')}</div>`;
    let drag = null;
    UI.$$('.kcard', c).forEach(k => { k.ondragstart = () => { drag = k.dataset.os; k.classList.add('drag'); }; k.ondragend = () => k.classList.remove('drag'); k.onclick = e => { if (!e.target.closest('[data-goto]')) this.edit(k.dataset.os); }; });
    UI.$$('.kcol', c).forEach(col => {
      col.ondragover = e => { e.preventDefault(); col.classList.add('over'); }; col.ondragleave = () => col.classList.remove('over');
      col.ondrop = e => { e.preventDefault(); col.classList.remove('over'); if (!drag) return; const st = col.dataset.col; Store.update('os', drag, { status: st, conclusao: st === 'Concluída' ? UI.today() : '' }); App.refresh(); };
    });
    UI.icons();
  },
  tabela(list) {
    const { esc, date, money } = UI;
    return UI.table([{ h: 'ID', f: x => UI.idLink(x.id) }, { h: 'Título', f: x => `<span class="plink" data-goto="${x.id}">${esc(x.titulo)}</span>` }, { h: 'Obra', f: x => UI.idLink(x.obraId) },
      { h: 'Tipo', k: 'tipo' }, { h: 'Responsável', f: x => UI.pessoa(x.responsavelId) }, { h: 'Prioridade', f: x => UI.badge(x.prioridade) },
      { h: 'Abertura', f: x => date(x.abertura) }, { h: 'Prazo', f: x => date(x.prazo) }, { h: 'Status', f: x => UI.badge(x.status) },
      { h: 'Checklist', f: x => (x.checklist || []).length ? UI.progress((x.checklist.filter(c => c.ok).length / x.checklist.length) * 100) : '—' }, { h: 'Custo est.', num: 1, f: x => x.custoEstimado ? money(x.custoEstimado) : '—' }],
      list.sort((a, b) => (a.prazo || '').localeCompare(b.prazo || '')), { emptyMsg: 'Nenhuma ordem de serviço.' });
  },
  blocoObra(c, o) {
    const list = Store.where('os', x => x.obraId === o.id);
    c.innerHTML = `<div class="toolbar"><button class="btn primary" onclick="Views.os.edit(null,{obraId:'${o.id}'})">${UI.icon('plus')} Nova OS</button></div><div id="k"></div>`;
    this.kanban(UI.$('#k', c), list);
  },
  async edit(id, preset = {}) {
    const x = id ? Store.get('os', id) : Object.assign({ status: 'Aberta', prioridade: 'Média', abertura: UI.today(), checklist: [] }, preset);
    const list = [{ k: 'titulo', l: 'Título do serviço', req: 1, full: 1 },
      { k: 'obraId', l: 'Obra', t: 'select', o: () => Store.all('obras').map(o => [o.id, o.id + ' · ' + o.nome]) },
      { k: 'tipo', l: 'Tipo', t: 'select', o: ['Execução', 'Projeto', 'Medição', 'Vistoria', 'Compra', 'Documento', 'Manutenção', 'Outro'] },
      { k: 'responsavelId', l: 'Responsável', t: 'select', o: () => Store.all('pessoas').map(p => [p.id, p.nome]) },
      { k: 'prioridade', l: 'Prioridade', t: 'select', o: LISTAS.prioridade }, { k: 'status', l: 'Status', t: 'select', o: LISTAS.statusOS },
      { k: 'abertura', l: 'Abertura', t: 'date' }, { k: 'prazo', l: 'Prazo', t: 'date' }, { k: 'conclusao', l: 'Conclusão', t: 'date' },
      { k: 'custoEstimado', l: 'Custo estimado (R$)', t: 'money' }, { k: 'descricao', l: 'Descrição / instruções', t: 'textarea', full: 1 }];
    const ck = JSON.parse(JSON.stringify(x.checklist || []));
    const ckHtml = () => ck.map((c, i) => `<div class="row" style="margin-bottom:6px"><input type="checkbox" data-ck="${i}" ${c.ok ? 'checked' : ''}><input class="input" data-ckt="${i}" value="${UI.esc(c.t)}" style="flex:1"><button class="btn ghost sm" data-ckd="${i}">${UI.icon('x')}</button></div>`).join('');
    const extra = `<div class="field mt"><label>Checklist</label><div id="ckl">${ckHtml()}</div><button class="btn sm" id="ckadd" type="button">${UI.icon('plus')} Item</button></div>`;
    const p = UI.formModal({ title: id ? 'Ordem de serviço ' + id : 'Nova ordem de serviço', list, values: x, extra, wide: true, onDelete: id ? () => { Store.remove('os', id); App.refresh(); } : null });
    setTimeout(() => {
      const box = document.getElementById('ckl'); if (!box) return;
      const sync = () => { UI.$$('[data-ckt]', box).forEach(i => ck[+i.dataset.ckt].t = i.value); UI.$$('[data-ck]', box).forEach(i => ck[+i.dataset.ck].ok = i.checked); };
      const bind = () => { UI.$$('[data-ckd]', box).forEach(b => b.onclick = () => { sync(); ck.splice(+b.dataset.ckd, 1); box.innerHTML = ckHtml(); UI.icons(); bind(); }); };
      document.getElementById('ckadd').onclick = () => { sync(); ck.push({ t: '', ok: false }); box.innerHTML = ckHtml(); UI.icons(); bind(); box.querySelector('[data-ckt]:last-of-type'); };
      bind(); box.addEventListener('input', sync); box.addEventListener('change', sync);
    }, 50);
    const d = await p; if (!d) return;
    d.checklist = ck.filter(c => c.t.trim());
    if (d.status === 'Concluída' && !d.conclusao) d.conclusao = UI.today();
    const r = id ? Store.update('os', id, d) : Store.insert('os', d);
    UI.toast('OS salva: ' + r.id); App.refresh();
  }
};
Open.OS = id => Views.os.edit(id);
