/* Aprovações: alterações, sugestões, contas e pedidos de senha da equipe.
   Nada muda no sistema sem a decisão de um administrador (Victor ou Ismael). */
Views.aprovacoes = {
  perm: 'dashboard',
  st: { filtro: 'pendente', tipo: '' },
  async render(el) {
    const { icon, esc, dateTime } = UI; const s = this.st;
    const eu = Auth.current() || {}; const admin = eu.papel === 'admin';
    el.innerHTML = `<div class="page-head"><div><h1>Aprovações e sugestões</h1><p>${admin ? 'Pedidos da equipe. Nada muda no sistema sem a aprovação de um administrador (Victor ou Ismael · financeiro).' : 'Suas sugestões e alterações enviadas aos administradores.'}</p></div>
      <div class="row">${window.Cloud && Cloud.ativo ? `<button class="btn primary keep" id="apSug">${icon('lightbulb')} Nova sugestão</button>` : ''}</div></div><div id="apl">${UI.empty('Carregando…', 'loader')}</div>`;
    UI.icons();
    if (!(window.Cloud && Cloud.ativo)) { UI.$('#apl', el).innerHTML = UI.empty('As aprovações funcionam no VTN Hub online.', 'cloud-off'); UI.icons(); return; }
    UI.$('#apSug', el).onclick = () => Cloud.sugerir();
    let L = []; try { L = await Cloud.solicitacoes(); } catch (e) {}
    if (!admin) L = L.filter(x => x.autorId === eu.id || (x.claudeId && x.claudeId === Cloud.meuId()));
    const nomes = admin ? await Cloud.nomesClaude([...new Set(L.map(x => x.claudeId).filter(Boolean))]) : {};
    const TIPOS = { alteracao: ['Alteração de dados', 'pencil', 'info'], sugestao: ['Sugestão', 'lightbulb', 'ok'], conta: ['Nova conta', 'user-plus', 'warn'], senha: ['Nova senha', 'key-round', 'warn'] };
    const F = L.filter(x => (!s.filtro || x.status === s.filtro) && (!s.tipo || (x.tipo || 'alteracao') === s.tipo));
    const cor = { pendente: 'warn', aprovada: 'ok', recusada: 'err' };
    const rotStatus = (x) => x.tipo === 'sugestao' ? { pendente: 'em análise', aprovada: 'aceita', recusada: 'recusada' }[x.status] : x.status;
    UI.$('#apl', el).innerHTML = `<div class="row mb" style="gap:6px;flex-wrap:wrap">${[['pendente', 'Pendentes'], ['aprovada', 'Aprovadas'], ['recusada', 'Recusadas'], ['', 'Todas']].map(([k, n]) => `<button class="chip ${s.filtro === k ? 'on' : ''}" data-f="${k}">${n} <b>${L.filter(x => !k || x.status === k).length}</b></button>`).join('')}
        <span style="width:12px"></span>${[['', 'Todos os tipos']].concat(Object.entries(TIPOS).map(([k, v]) => [k, v[0]])).map(([k, n]) => `<button class="chip ${s.tipo === k ? 'on' : ''}" data-t="${k}">${n}</button>`).join('')}</div>
      ${F.length ? `<div class="stack">${F.map(x => { const t = TIPOS[x.tipo || 'alteracao'] || TIPOS.alteracao; const k = x.chave || x.id; const conta = nomes[x.claudeId];
        return `<div class="card"><div class="card-b"><div class="row between" style="gap:8px;flex-wrap:wrap"><div>${UI.badge(t[0], t[2])} <b>${esc(x.autorNome || 'Usuário')}</b> <span class="tiny muted">· ${dateTime((x.criadoEm || '').replace('Z', ''))}${conta ? ' · conta Claude: ' + esc(conta) : ''}</span></div>${UI.badge(rotStatus(x), cor[x.status])}</div>
        ${x.assunto ? `<div class="tiny muted mt">${esc(x.assunto)}</div>` : ''}
        ${x.texto ? `<p style="margin:6px 0 0;white-space:pre-wrap">${esc(x.texto)}</p>` : ''}
        ${x.motivo ? `<p class="tiny" style="margin:8px 0 0"><b>Motivo:</b> ${esc(x.motivo)}</p>` : ''}
        ${x.tipo !== 'sugestao' && (x.resumo || []).length ? `<ul class="tiny" style="margin:8px 0">${(x.resumo || []).map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}
        ${x.decididoPor ? `<div class="tiny muted">${x.status === 'aprovada' ? 'Aprovada' : 'Recusada'} por ${esc(x.decididoPor)} em ${dateTime((x.decididoEm || '').replace('Z', ''))}${x.obs ? ' · ' + esc(x.obs) : ''}</div>` : ''}
        ${admin && x.status === 'pendente' ? `<div class="row mt" style="flex-wrap:wrap">${
          x.tipo === 'sugestao' ? `<button class="btn sm primary keep" data-ok="${k}">${icon('check')} Aceitar</button>`
          : x.tipo === 'conta' ? `<button class="btn sm primary keep" data-ok="${k}">${icon('user-check')} Aprovar conta</button>`
          : x.tipo === 'senha' ? `<button class="btn sm primary keep" data-senha="${k}">${icon('key-round')} Gerar senha temporária</button>`
          : `<button class="btn sm primary keep" data-ok="${k}">${icon('check')} Aprovar e aplicar</button>`}
          <button class="btn sm keep" data-no="${k}">${icon('x')} Recusar</button></div>` : ''}</div></div>`; }).join('')}</div>`
        : UI.empty(s.filtro === 'pendente' ? 'Nada aguardando aprovação.' : 'Nada por aqui.', 'check-circle-2')}`;
    UI.$$('[data-f]', el).forEach(b => b.onclick = () => { s.filtro = b.dataset.f; App.refresh(); });
    UI.$$('[data-t]', el).forEach(b => b.onclick = () => { s.tipo = b.dataset.t; App.refresh(); });
    const acha = k => L.find(x => (x.chave || x.id) === k);
    const fim = (msg) => { UI.toast(msg); App.refresh(); try { App.contarAprovacoes(); } catch (e) {} };
    UI.$$('[data-ok]', el).forEach(b => b.onclick = async () => { const x = acha(b.dataset.ok); const txt = x.tipo === 'sugestao' ? 'Marcar esta sugestão como aceita?' : x.tipo === 'conta' ? 'Aprovar esta conta (somente visualização)?' : 'Aprovar e aplicar esta alteração para todos?'; if (!(await UI.confirm(txt, 'Aprovar'))) return; try { await Cloud.decidir(x, true); fim('Aprovado'); } catch (e) { UI.toast('Não foi possível gravar a decisão.', 'err'); } });
    UI.$$('[data-senha]', el).forEach(b => b.onclick = async () => { const x = acha(b.dataset.senha); const u = Store.get('usuarios', x.autorId) || Store.all('usuarios').find(y => x.email && (y.email || '').toLowerCase() === x.email); if (!u) return UI.toast('Usuário não encontrado.', 'err'); await Contas.redefinir(u.id); try { await Cloud.decidir(x, true, 'senha temporária gerada'); } catch (e) {} App.refresh(); });
    UI.$$('[data-no]', el).forEach(b => b.onclick = async () => { try { await Cloud.decidir(acha(b.dataset.no), false); fim('Recusado'); } catch (e) { UI.toast('Não foi possível gravar a decisão.', 'err'); } });
    UI.icons();
  }
};
