/* Pessoas: clientes, equipe, responsáveis técnicos, fornecedores */
Views.pessoas = {
  perm: 'pessoas',
  st: { q: '', tipo: '', cidade: '' },
  render(el) {
    const { icon, esc, money, moneyK, pct } = UI; const s = this.st;
    const todos = Store.all('pessoas');
    const info = p => { const ob = this.obrasDe(p.id); const cli = ob.filter(o => (o.clienteIds || []).includes(p.id)); const rec = cli.reduce((a, o) => a + Calc.fin(o.id).receitaPaga, 0);
      const pago = Store.where('lancamentos', l => l.pessoaId === p.id && l.tipo === 'despesa' && l.status === 'pago').reduce((a, l) => a + l.valor, 0);
      const ultima = ob.map(o => o.dataContrato || o.dataInicio || '').filter(Boolean).sort().pop() || '';
      return { p, ob, cli, rec, pago, ativa: ob.some(o => ['Contratada', 'Em planejamento', 'Em execução', 'Em entrega'].includes(o.status)), ultima }; };
    let L = todos.map(info);
    if (s.tipo) L = L.filter(x => x.p.tipo === s.tipo);
    if (s.cidade) L = L.filter(x => (x.p.cidade || '') === s.cidade);
    if (s.q) L = L.filter(x => (x.p.id + ' ' + x.p.nome + ' ' + x.p.email + ' ' + x.p.cpf + ' ' + x.p.registro + ' ' + x.p.telefone + ' ' + x.p.cidade).toLowerCase().includes(s.q.toLowerCase()));
    L.sort((a, b) => b.rec - a.rec || b.ob.length - a.ob.length || a.p.nome.localeCompare(b.p.nome));
    const cnt = t => todos.filter(p => p.tipo === t).length;
    const clientes = todos.filter(p => p.tipo === 'Cliente').map(info);
    const recorr = clientes.filter(x => x.cli.length > 1).length;
    const topCli = clientes.filter(x => x.rec > 0).sort((a, b) => b.rec - a.rec).slice(0, 8);
    el.innerHTML = `<div class="page-head"><div><h1>Clientes e equipe</h1><p>${todos.length} pessoas · clique no nome ou no ID para ver tudo sobre a pessoa</p></div><button class="btn primary" onclick="Views.pessoas.edit()">${icon('user-plus')} Nova pessoa</button></div>
      <div class="grid g4 mb">
        ${Views.dashboard.kpi('', 'users', 'Clientes', cnt('Cliente'), `${clientes.filter(x => x.ativa).length} com obra ativa`)}
        ${Views.dashboard.kpi('ok', 'repeat', 'Clientes recorrentes', recorr, pct(recorr / Math.max(1, clientes.length) * 100) + ' da base')}
        ${Views.dashboard.kpi('info', 'hand-coins', 'Receita média por cliente', moneyK(clientes.reduce((a, x) => a + x.rec, 0) / Math.max(1, clientes.filter(x => x.rec > 0).length)), 'clientes com recebimento')}
        ${Views.dashboard.kpi('violet', 'hard-hat', 'Equipe e parceiros', todos.length - cnt('Cliente'), `${cnt('Fornecedor')} fornecedores · ${cnt('Prestador/Empreiteiro')} prestadores`)}
      </div>
      <div class="grid g-2-1 mb">
        <div class="card"><div class="card-h"><h3>Top clientes por receita</h3></div><div class="card-b"><div class="chart-box sm"><canvas id="peTop"></canvas></div></div></div>
        <div class="card"><div class="card-h"><h3>Pessoas por tipo</h3></div><div class="card-b"><div class="chart-box sm"><canvas id="peTp"></canvas></div></div></div>
      </div>
      <div class="filterbar card"><div class="card-b"><div class="toolbar" style="margin:0"><div class="tfind-w" style="min-width:260px;flex:1">${icon('search')}<input class="input" id="pq" placeholder="Nome, CPF/CNPJ, e-mail, telefone, registro…" value="${esc(s.q)}"></div></div>
        <div class="row mt" style="gap:6px"><button class="chip ${!s.tipo ? 'on' : ''}" data-tp="">Todos <b>${todos.length}</b></button>${LISTAS.tipoPessoa.filter(cnt).map(t => `<button class="chip ${s.tipo === t ? 'on' : ''}" data-tp="${t}">${t} <b>${cnt(t)}</b></button>`).join('')}</div></div></div>
      <div class="card">${UI.table([
        { h: 'ID', f: x => UI.idLink(x.p.id) }, { h: 'Nome', f: x => `<div class="row" style="flex-wrap:nowrap"><div class="avatar">${UI.initials(x.p.nome)}</div><div><span class="plink" data-goto="${x.p.id}">${esc(x.p.nome)}</span><div class="tiny muted">${esc(x.p.cargo || x.p.registro || x.p.profissao || '')}</div></div></div>` },
        { h: 'Tipo', f: x => UI.badge(x.p.tipo, 'brand') }, { h: 'Telefone', f: x => x.p.telefone ? `<a class="plink" target="_blank" rel="noopener" href="https://wa.me/55${String(x.p.telefone).replace(/\D/g, '').replace(/^55/, '')}">${esc(x.p.telefone)}</a>` : '—' },
        { h: 'E-mail', f: x => esc(x.p.email || '—') }, { h: 'CPF/CNPJ', f: x => `<span class="mono">${esc(x.p.cpf || '—')}</span>` }, { h: 'Cidade', f: x => esc(x.p.cidade || '—') },
        { h: 'Obras', num: 1, f: x => x.ob.length || '—' }, { h: 'Situação', f: x => x.ativa ? UI.badge('obra ativa', 'ok') : x.ob.length ? UI.badge('histórico') : '—' },
        { h: 'Última obra', f: x => UI.date(x.ultima) }, { h: 'Receita (cliente)', num: 1, f: x => x.rec ? money(x.rec) : '—' }, { h: 'Pago a ele(a)', num: 1, f: x => x.pago ? money(x.pago) : '—' },
        { h: 'Códigos', f: x => x.ob.slice(0, 4).map(o => UI.idLink(o.id)).join(' ') + (x.ob.length > 4 ? ` <span class="tiny muted">+${x.ob.length - 4}</span>` : '') || '—' }
      ], L, { emptyMsg: 'Ninguém encontrado.' })}</div>`;
    UI.$('#pq', el).onchange = e => { s.q = e.target.value; App.refresh(); };
    UI.$$('[data-tp]', el).forEach(b => b.onclick = () => { s.tipo = b.dataset.tp; App.refresh(); });
    const tipos = LISTAS.tipoPessoa.filter(cnt).map(t => [t, cnt(t)]);
    UI.chart('peTop', { type: 'bar', data: { labels: topCli.map(x => x.p.nome.split(' ').slice(0, 2).join(' ')), datasets: [{ label: 'Recebido', data: topCli.map(x => x.rec), backgroundColor: '#db2777' }] }, options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => money(c.raw) } } }, scales: { x: { ticks: { callback: UI.moneyTick } } } } });
    UI.chart('peTp', { type: 'doughnut', data: { labels: tipos.map(x => x[0]), datasets: [{ data: tipos.map(x => x[1]), backgroundColor: UI.PALETA }] }, options: { plugins: { legend: { position: 'right' } } } });
  },
  obrasDe(pid) {
    return Store.where('obras', o => (o.clienteIds || []).includes(pid) || o.rtId === pid || o.gestorId === pid || (o.equipe || []).some(e => e.pessoaId === pid));
  },
  fields() {
    return [{ k: 'nome', l: 'Nome / razão social', req: 1, full: 1 }, { k: 'tipo', l: 'Tipo', t: 'select', o: LISTAS.tipoPessoa, req: 1 },
      { k: 'cargo', l: 'Cargo / função' }, { k: 'cpf', l: 'CPF / CNPJ' }, { k: 'rg', l: 'RG' },
      { k: 'registro', l: 'Registro profissional (CREA/CAU)' }, { k: 'nacionalidade', l: 'Nacionalidade' },
      { k: 'estadoCivil', l: 'Estado civil' }, { k: 'profissao', l: 'Profissão' },
      { k: 'email', l: 'E-mail', t: 'email' }, { k: 'telefone', l: 'Telefone / WhatsApp' },
      { k: 'endereco', l: 'Endereço', full: 1 }, { k: 'cidade', l: 'Cidade/UF' }, { k: 'pix', l: 'Chave PIX / dados bancários' },
      { k: 'valorDiaria', l: 'Diária / valor hora (R$)', t: 'money' }, { k: 'obs', l: 'Observações', t: 'textarea', full: 1 }];
  },
  async edit(id, preset = {}) {
    const p = id ? Store.get('pessoas', id) : Object.assign({ tipo: 'Cliente' }, preset);
    const d = await UI.formModal({ title: id ? 'Editar ' + id : 'Nova pessoa', list: this.fields(), values: p, wide: true, onDelete: id && Auth.can('config') ? () => { Store.remove('pessoas', id); location.hash = '#/pessoas'; } : null });
    if (!d) return; const r = id ? Store.update('pessoas', id, d) : Store.insert('pessoas', d); UI.toast('Salvo: ' + r.id);
    if (!id) location.hash = '#/pessoa/' + r.id; else App.refresh();
  }
};

Views.pessoaDetalhe = {
  perm: 'pessoas',
  render(el, id) {
    const p = Store.get('pessoas', id);
    if (!p) { el.innerHTML = UI.empty('Pessoa não encontrada.'); return; }
    const { esc, icon, money, date } = UI;
    const obras = Views.pessoas.obrasDe(id);
    const papel = o => (o.clienteIds || []).includes(id) ? 'Cliente' : o.rtId === id ? 'Resp. técnico' : o.gestorId === id ? 'Gestor' : ((o.equipe || []).find(e => e.pessoaId === id) || {}).papel;
    const ls = Store.where('lancamentos', l => l.pessoaId === id);
    const rec = ls.filter(l => l.tipo === 'receita'), des = ls.filter(l => l.tipo === 'despesa');
    const sum = (a, st) => a.filter(l => !st || l.status === st).reduce((s, l) => s + l.valor, 0);
    const os = Store.where('os', x => x.responsavelId === id), pend = Store.where('pendencias', x => x.responsavelId === id && x.status !== 'Resolvida');
    const cts = Store.where('contratos', c => (c.clienteIds || []).includes(id));
    const grupos = Store.where('grupos', g => (g.membros || []).includes(id));
    const user = Store.all('usuarios').find(u => u.pessoaId === id);
    el.innerHTML = `<div class="crumbs"><a href="#/pessoas">Pessoas</a> / ${p.id}</div>
      <div class="page-head"><div class="row"><div class="avatar lg">${UI.initials(p.nome)}</div><div><div class="row"><span class="idlink">${p.id}</span>${UI.badge(p.tipo, 'brand')}${user ? UI.badge('Usuário: ' + (PAPEIS[user.papel] || {}).nome, 'info') : ''}</div><h1 style="margin-top:6px">${esc(p.nome)}</h1><p>${esc(p.cargo || '')} ${p.registro ? '· ' + esc(p.registro) : ''}</p></div></div>
        <button class="btn primary" onclick="Views.pessoas.edit('${id}')">${icon('pencil')} Editar</button></div>
      <div class="grid g4">
        <div class="card kpi"><div class="lbl">Obras vinculadas</div><div class="val">${obras.length}</div></div>
        <div class="card kpi ok"><div class="lbl">${p.tipo === 'Cliente' ? 'Pagou à empresa' : 'Recebido dele(a)'}</div><div class="val">${money(sum(rec, 'pago'))}</div><div class="sub">Pendente ${money(sum(rec, 'pendente'))}</div></div>
        <div class="card kpi err"><div class="lbl">Pago a ele(a)</div><div class="val">${money(sum(des, 'pago'))}</div><div class="sub">A pagar ${money(sum(des, 'pendente'))}</div></div>
        <div class="card kpi"><div class="lbl">OS / pendências abertas</div><div class="val">${os.filter(x => !['Concluída', 'Cancelada'].includes(x.status)).length} / ${pend.length}</div></div>
      </div>
      <div class="grid g-2-1 mt">
        <div class="stack">
          <div class="card"><div class="card-h"><h3>Obras</h3></div>${UI.table([{ h: 'ID', f: o => UI.idLink(o.id) }, { h: 'Obra', f: o => `<span class="plink" data-goto="${o.id}">${esc(o.nome)}</span>` }, { h: 'Papel', f: o => esc(papel(o) || '') }, { h: 'Status', f: o => UI.badge(o.status) }, { h: 'Físico', f: o => UI.progress(Calc.fisico(o.id)) }], obras, { emptyMsg: 'Sem obras.' })}</div>
          ${Auth.can('financeiro.ver') ? `<div class="card"><div class="card-h"><h3>Pagamentos e recebimentos</h3></div>${Views.financeiro.tabela(ls.sort((a, b) => (b.dataPagamento || b.data).localeCompare(a.dataPagamento || a.data)))}</div>` : ''}
          <div class="card"><div class="card-h"><h3>Ordens de serviço e pendências sob responsabilidade</h3></div>${Views.os.tabela(os)}<div style="border-top:1px solid var(--border)">${Views.pendencias.tPend(pend)}</div></div>
        </div>
        <div class="stack">
          <div class="card"><div class="card-h"><h3>Dados</h3></div><div class="card-b"><dl class="dl">
            ${[['E-mail', p.email], ['Telefone', p.telefone], ['CPF/CNPJ', p.cpf], ['RG', p.rg], ['Registro', p.registro], ['Nacionalidade', p.nacionalidade], ['Estado civil', p.estadoCivil], ['Profissão', p.profissao], ['Endereço', p.endereco], ['Cidade', p.cidade], ['PIX/Banco', p.pix], ['Diária', p.valorDiaria ? money(p.valorDiaria) : ''], ['Cadastro', date(p.criadoEm)]].filter(x => x[1]).map(x => `<dt>${x[0]}</dt><dd>${esc(x[1])}</dd>`).join('')}
          </dl>${p.obs ? `<div class="alert info mt">${icon('info')}<div>${esc(p.obs)}</div></div>` : ''}</div></div>
          <div class="card"><div class="card-h"><h3>Contratos</h3></div>${UI.table([{ h: 'ID', f: c => UI.idLink(c.id) }, { h: 'Título', f: c => esc(c.titulo) }, { h: 'Status', f: c => UI.badge(c.status) }], cts, { emptyMsg: 'Nenhum contrato.' })}</div>
          <div class="card"><div class="card-h"><h3>Grupos de chat</h3></div><div class="card-b stack">${grupos.map(g => `<a class="btn" href="#/chat/${g.id}">${icon('messages-square')} ${esc(g.nome)}</a>`).join('') || '<span class="muted">Nenhum</span>'}</div></div>
        </div>
      </div>`;
    Views.financeiro.bindPagar(el);
    Views.pendencias.bind(el);
  }
};
