/* Chat com grupos entre os participantes.
   Hoje as mensagens ficam salvas neste navegador. Para conversar em tempo real
   entre computadores, ligue a um backend (WebSocket / Firebase / Supabase) em
   Views.chat.enviar() e carregue as mensagens recebidas com Store.insert('mensagens', …). */
Views.chat = {
  perm: 'chat',
  como: null,
  render(el, gid) {
    const { icon, esc } = UI;
    const me = Auth.current().pessoaId;
    const admin = Auth.can('config');
    let gs = Store.all('grupos').filter(g => admin || (g.membros || []).includes(me));
    const ult = g => Store.where('mensagens', m => m.grupoId === g.id).sort((a, b) => b.data.localeCompare(a.data))[0];
    gs = gs.sort((a, b) => ((ult(b) || {}).data || '').localeCompare((ult(a) || {}).data || ''));
    const g = Store.get('grupos', gid) || gs[0];
    const autor = this.como || me;
    const msgs = g ? Store.where('mensagens', m => m.grupoId === g.id).sort((a, b) => a.data.localeCompare(b.data)) : [];
    el.innerHTML = `<div class="page-head"><div><h1>Chat e grupos</h1><p>Converse com equipe, clientes e fornecedores por obra</p></div><button class="btn primary" id="ng">${icon('users')} Novo grupo</button></div>
      <div class="card chat"><div class="chat-list">${gs.map(x => { const u = ult(x); return `<div class="chat-item ${g && x.id === g.id ? 'active' : ''}" data-g="${x.id}"><div class="avatar">${icon(x.obraId ? 'hard-hat' : 'users')}</div><div style="min-width:0;flex:1"><b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.nome)}</b><span class="tiny muted" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u ? esc((Store.get('pessoas', u.autorId) || {}).nome?.split(' ')[0] || '') + ': ' + esc(u.texto) : 'Sem mensagens'}</span></div></div>`; }).join('') || UI.empty('Nenhum grupo')}</div>
      <div class="chat-main">${g ? `<div class="card-h"><div><h3>${esc(g.nome)}</h3><div class="tiny muted">${(g.membros || []).map(id => esc((Store.get('pessoas', id) || {}).nome || '')).join(', ')}</div></div><div class="row">${g.obraId ? `<a class="btn sm" href="#/obra/${g.obraId}">${icon('hard-hat')} ${g.obraId}</a>` : ''}<button class="btn sm" id="eg">${icon('settings-2')}</button></div></div>
        <div class="chat-msgs" id="msgs">${msgs.map(mm => { const a = Store.get('pessoas', mm.autorId) || {}; const arq = mm.arquivoId && Store.get('arquivos', mm.arquivoId);
          return `<div class="msg ${mm.autorId === autor ? 'me' : ''}"><div class="who">${esc(a.nome || '?')}</div>${esc(mm.texto)}${arq ? `<div><span class="badge" data-goto="${arq.id}" style="cursor:pointer;margin-top:4px">${icon('paperclip')} ${esc(arq.nome)}</span></div>` : ''}<div class="when">${UI.dateTime(mm.data)}</div></div>`; }).join('') || UI.empty('Comece a conversa.', 'message-circle')}</div>
        <div class="chat-input">${admin ? `<select class="select" id="como" title="Enviar como (simulação enquanto não há login)">${(g.membros || []).map(id => `<option value="${id}" ${id === autor ? 'selected' : ''}>${esc((Store.get('pessoas', id) || {}).nome?.split(' ')[0] || id)}</option>`).join('')}</select>` : ''}
          <label class="btn icon" title="Anexar">${icon('paperclip')}<input type="file" id="cf" hidden></label><input class="input" id="ct" placeholder="Escreva uma mensagem…" autocomplete="off"><button class="btn primary" id="cs">${icon('send')}</button></div>` : UI.empty('Crie um grupo para começar.', 'messages-square')}</div></div>`;
    const box = UI.$('#msgs', el); if (box) box.scrollTop = box.scrollHeight;
    UI.$$('[data-g]', el).forEach(i => i.onclick = () => location.hash = '#/chat/' + i.dataset.g);
    UI.$('#ng', el).onclick = () => this.editGrupo();
    if (!g) return;
    UI.$('#eg', el).onclick = () => this.editGrupo(g.id);
    const como = UI.$('#como', el); if (como) como.onchange = () => { this.como = como.value; App.refresh(); };
    const send = async (arquivoId) => { const t = UI.$('#ct', el).value.trim(); if (!t && !arquivoId) return; this.enviar(g.id, autor, t || 'Arquivo enviado', arquivoId); };
    UI.$('#cs', el).onclick = () => send(); UI.$('#ct', el).onkeydown = e => { if (e.key === 'Enter') send(); };
    UI.$('#cf', el).onchange = async e => { const [r] = await Store.uploadFiles([...e.target.files], { obraId: g.obraId, pasta: 'CHAT' }); send(r.id); };
    setTimeout(() => { const i = document.getElementById('ct'); i && i.focus(); }, 30);
  },
  enviar(grupoId, autorId, texto, arquivoId) {
    Store.insert('mensagens', { grupoId, autorId, texto, arquivoId: arquivoId || null, data: new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 19) });
    App.refresh();
  },
  async editGrupo(id) {
    const g = id ? Store.get('grupos', id) : { membros: [Auth.current().pessoaId] };
    const d = await UI.formModal({ title: id ? 'Editar grupo' : 'Novo grupo', values: g, list: [{ k: 'nome', l: 'Nome do grupo', req: 1, full: 1 }, { k: 'obraId', l: 'Obra (opcional)', t: 'select', o: () => Store.all('obras').map(o => [o.id, o.id + ' · ' + o.nome]) },
      { k: 'membros', l: 'Participantes (Ctrl+clique)', t: 'multi', o: () => Store.all('pessoas').map(p => [p.id, p.nome + ' – ' + p.tipo]), full: 1 }],
      onDelete: id ? () => { Store.remove('grupos', id); Store.where('mensagens', m => m.grupoId === id).forEach(m => Store.remove('mensagens', m.id)); location.hash = '#/chat'; } : null });
    if (!d) return; const r = id ? Store.update('grupos', id, d) : Store.insert('grupos', d); location.hash = '#/chat/' + r.id; App.refresh();
  }
};
