/* =========================================================
   APP — autenticação, menu, rotas, busca global
   ========================================================= */
window.Views = {};
window.Open = {};   // Open['OS'](id) → abre o detalhe daquele tipo de ID

window.Auth = (() => {
  let user = null;
  function current() { return user; }
  function can(perm) {
    if (!user) return false;
    const p = (PAPEIS[user.papel] || {}).perms || [];
    return p.includes('*') || p.includes(perm) || (perm.endsWith('.ver') && p.includes(perm.replace('.ver', '.editar')));
  }
  function init() {
    if (!CONFIG.AUTH.enabled) { user = Store.get('usuarios', CONFIG.AUTH.defaultUserId) || Store.all('usuarios')[0]; return true; }
    let sid = null; try { sid = localStorage.getItem(CONFIG.AUTH.sessionKey) || sessionStorage.getItem(CONFIG.AUTH.sessionKey); } catch (e) {}
    user = sid ? Store.get('usuarios', sid) : null;
    if (user && !user.ativo) user = null;
    return !!user;
  }
  /* Senhas guardadas só como "hash" (SHA-256 com sal), nunca em texto */
  async function hash(senha, salt) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + senha));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  async function definirSenha(u, senha, temporaria) {
    const salt = [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, '0')).join('');
    return Object.assign(u, { salt, senhaHash: await hash(senha, salt), trocarSenha: !!temporaria, senha: undefined });
  }
  async function login(email, senha) {
    const u = Store.all('usuarios').find(x => (x.email || '').toLowerCase() === email.trim().toLowerCase() && x.ativo);
    if (!u) return false;
    const ok = u.senhaHash ? (await hash(senha, u.salt || '')) === u.senhaHash : (u.senha && u.senha === senha);
    if (!ok) return false;
    user = u; try { localStorage.setItem(CONFIG.AUTH.sessionKey, u.id); } catch (e) { try { sessionStorage.setItem(CONFIG.AUTH.sessionKey, u.id); } catch (e2) {} }
    return true;
  }
  function logout() { if (window.VTN_STANDALONE) return VTN_STANDALONE.sair(); try { localStorage.removeItem(CONFIG.AUTH.sessionKey); sessionStorage.removeItem(CONFIG.AUTH.sessionKey); } catch (e) {} user = null; location.reload(); }
  function switchTo(id) { user = Store.get('usuarios', id); App.renderShell(); App.route(); }
  return { current, can, init, login, logout, switchTo, hash, definirSenha };
})();

window.App = (() => {
  const { $, esc, icon } = UI;
  const MENU = [
    ['Visão geral'],
    ['dashboard', 'Painel', 'layout-dashboard', 'dashboard'],
    ['obras', 'Obras e serviços', 'hard-hat', 'obras.ver'],
    ['os', 'Ordens de serviço', 'clipboard-list', 'os'],
    ['pendencias', 'Pendências e entregas', 'list-checks', 'pendencias'],
    ['agenda', 'Agenda', 'calendar-heart', 'calendario'],
    ['calendario', 'Calendário e feriados', 'calendar-days', 'calendario'],
    ['Financeiro'],
    ['financeiro', 'Caixa e balanço', 'wallet', 'financeiro.ver'],
    ['impostos', 'Impostos e obrigações', 'landmark', 'financeiro.ver'],
    ['enquadramento', 'Enquadramento ao vivo', 'activity', 'financeiro.ver'],
    ['orcamentos', 'Orçamentos', 'calculator', 'orcamentos'],
    ['composicoes', 'Composições e CUB', 'layers', 'orcamentos'],
    ['contratos', 'Contratos e propostas', 'file-signature', 'contratos'],
    ['relatorios', 'Central de relatórios', 'file-bar-chart', 'relatorios'],
    ['Pessoas'],
    ['pessoas', 'Clientes e equipe', 'users', 'pessoas'],
    ['chat', 'Chat e grupos', 'messages-square', 'chat'],
    ['Conhecimento'],
    ['conhecimento', 'Central de conhecimento', 'graduation-cap', 'dashboard'],
    ['Sistema'],
    ['aprovacoes', 'Aprovações', 'check-circle-2', 'dashboard'],
    ['config', 'Configurações', 'settings', 'config']
  ];

  function renderShell() {
    const u = Auth.current();
    const pend = Store.where('pendencias', p => p.status !== 'Resolvida' && p.prazo && p.prazo < UI.today()).length;
    $('#app').innerHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="brand"><div class="brand-logo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><circle cx="12" cy="3" r="1.2" fill="currentColor"/><circle cx="12" cy="21" r="1.2" fill="currentColor"/><circle cx="3" cy="12" r="1.2" fill="currentColor"/><circle cx="21" cy="12" r="1.2" fill="currentColor"/></svg></div><div><b>${esc(CONFIG.appName)}</b><span>${esc(CONFIG.appTagline)}</span></div></div>
      <nav class="nav">${MENU.map(m => m.length === 1 ? `<div class="nav-sec">${m[0]}</div>` :
        (Auth.can(m[3]) ? `<a href="#/${m[0]}" data-nav="${m[0]}">${icon(m[2])}<span>${m[1]}</span>${m[0] === 'pendencias' && pend ? `<span class="badge err">${pend}</span>` : ''}${m[0] === 'aprovacoes' ? '<span class="badge warn" id="apBadge" hidden></span>' : ''}</a>` : '')).join('')}</nav>
      <div class="side-foot"><div class="row"><div class="avatar">${UI.initials(u.nome)}</div><div style="min-width:0"><b style="color:#fff;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc((window.Cloud && Cloud.nome) || u.nome)}</b><span class="tiny">${esc((PAPEIS[u.papel] || {}).nome)}</span></div></div>
        ${CONFIG.AUTH.enabled ? `<button class="btn sm mt" style="width:100%;justify-content:center;background:#1d2026;border-color:#2a2f37;color:#c9cdd4" onclick="Auth.logout()">${icon('log-out')} Sair</button>` : (window.Cloud && Cloud.ativo ? (Cloud.podeEditar ? `<div class="tiny mt" style="color:#8fb3ff">● Online · pode editar</div>` : `<div class="tiny mt" style="color:#fcd34d">👁 Somente visualização</div>`) : `<div class="tiny mt" style="color:#6b7280">Modo local (este computador)</div>`)}</div>
    </aside>
    <div class="main">
      <header class="topbar">
        <button class="btn ghost icon menu-btn" onclick="document.getElementById('sidebar').classList.toggle('open')">${icon('menu')}</button>
        <div class="search">${icon('search')}<input id="gsearch" placeholder="Buscar obra, pessoa, ID (ex.: OS-0001), arquivo…" autocomplete="off"><div class="search-results" id="gresults"></div></div>
        <div class="top-actions">
          <a id="enqChip" class="enq-chip" href="#/enquadramento"></a>
          ${window.Cloud && Cloud.ativo && (Auth.current() || {}).papel !== 'admin' ? `<button class="btn sm keep" id="sugBtn" title="Sugerir uma mudança aos administradores">${icon('lightbulb')} Sugerir</button>` : ''}
          <button class="btn sm" id="quickAdd">${icon('plus')} Novo</button>
          <button class="btn ghost icon" title="Tema claro/escuro" onclick="App.toggleTheme()">${icon('moon')}</button>
        </div>
      </header>
      <section class="view" id="view"></section>
    </div>`;
    bindSearch();
    $('#quickAdd').onclick = quickAdd; if ($('#sugBtn')) $('#sugBtn').onclick = () => Cloud.sugerir();
    UI.icons();
  }

  function quickAdd() {
    const items = [
      ['obras.editar', 'hard-hat', 'Obra / serviço', () => Views.obras.edit()],
      ['os', 'clipboard-list', 'Ordem de serviço', () => Views.os.edit()],
      ['pendencias', 'alert-circle', 'Pendência', () => Views.pendencias.editPend()],
      ['pendencias', 'package-check', 'Entrega', () => Views.pendencias.editEntrega()],
      ['financeiro.editar', 'arrow-down-circle', 'Receita', () => Views.financeiro.edit(null, { tipo: 'receita' })],
      ['financeiro.editar', 'arrow-up-circle', 'Despesa', () => Views.financeiro.edit(null, { tipo: 'despesa' })],
      ['orcamentos', 'calculator', 'Orçamento', () => Views.orcamentos.novo()],
      ['contratos', 'file-signature', 'Contrato / proposta', () => Views.contratos.novo()],
      ['pessoas', 'user-plus', 'Pessoa', () => Views.pessoas.edit()],
      ['calendario', 'calendar-plus', 'Evento', () => Views.calendario.edit()]
    ].filter(i => Auth.can(i[0]));
    const m = UI.modal({ title: 'Criar novo', body: `<div class="grid g2">${items.map((i, k) => `<button class="btn" data-k="${k}" style="justify-content:flex-start;padding:12px">${icon(i[1])} ${i[2]}</button>`).join('')}</div>` });
    m.el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { m.close(); items[+b.dataset.k][3](); });
  }

  function bindSearch() {
    const inp = $('#gsearch'), box = $('#gresults');
    inp.addEventListener('input', () => {
      const q = inp.value.trim().toLowerCase();
      if (q.length < 2) { box.classList.remove('open'); return; }
      const res = [];
      const add = (c, ic, label, sub) => Store.all(c).forEach(x => { const t = (x.id + ' ' + label(x) + ' ' + (sub(x) || '')).toLowerCase(); if (t.includes(q)) res.push([x.id, ic, label(x), sub(x)]); });
      add('obras', 'hard-hat', x => x.nome, x => x.cidade + ' · ' + x.status);
      add('pessoas', 'user', x => x.nome, x => x.tipo);
      add('os', 'clipboard-list', x => x.titulo, x => x.status);
      add('pendencias', 'alert-circle', x => x.titulo, x => x.status);
      add('entregas', 'package-check', x => x.titulo, x => x.status);
      add('lancamentos', 'wallet', x => x.descricao, x => UI.money(x.valor));
      add('orcamentos', 'calculator', x => x.titulo, x => x.status);
      add('contratos', 'file-signature', x => x.titulo, x => x.status);
      add('arquivos', 'file', x => x.nome, x => x.pasta);
      add('medicoes', 'ruler', x => x.numero, x => UI.date(x.data));
      box.innerHTML = res.slice(0, 30).map(r => `<a data-goto="${r[0]}">${icon(r[1])}<span class="idlink">${r[0]}</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r[2])}</span><span class="tiny muted">${esc(r[3] || '')}</span></a>`).join('') || '<div class="empty">Nada encontrado</div>';
      box.classList.add('open'); UI.icons();
    });
    document.addEventListener('click', e => { if (!e.target.closest('.search')) box.classList.remove('open'); });
  }

  /* Clique em qualquer ID → abre o detalhe */
  function goto(id) {
    const p = id.split('-')[0];
    if (p === 'OB') location.hash = '#/obra/' + id;
    else if (p === 'PS') location.hash = '#/pessoa/' + id;
    else if (p === 'GR') location.hash = '#/chat/' + id;
    else if (p === 'AR') Store.openFile(id);
    else if (Open[p]) Open[p](id);
  }
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-goto]');
    if (g) { e.preventDefault(); e.stopPropagation(); $('#gresults') && $('#gresults').classList.remove('open'); goto(g.dataset.goto); }
  });

  function route() {
    const h = location.hash.replace(/^#\/?/, '') || 'dashboard';
    const [name, ...params] = h.split('/').map(decodeURIComponent);
    const map = { obra: 'obraDetalhe', pessoa: 'pessoaDetalhe' };
    const key = map[name] || name;
    const v = Views[key] || Views.dashboard;
    document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === (name === 'obra' ? 'obras' : name === 'pessoa' ? 'pessoas' : name)));
    document.getElementById('sidebar').classList.remove('open');
    const el = $('#view');
    if (v.perm && !Auth.can(v.perm)) { el.innerHTML = UI.empty('Você não tem permissão para acessar esta área.', 'lock'); UI.icons(); return; }
    el.innerHTML = '';
    try { v.render(el, ...params); } catch (err) { console.error(err); el.innerHTML = `<div class="alert err">${icon('alert-triangle')} Erro ao abrir a página: ${esc(err.message)}</div>`; }
    UI.icons();
    window.Enq && Enq.chip();
    window.scrollTo(0, 0);
  }
  function refresh() { const y = window.scrollY; route(); window.scrollTo(0, y); }

  function toggleTheme() {
    const r = document.documentElement; const t = r.dataset.theme === 'dark' ? 'light' : 'dark';
    r.dataset.theme = t; try { localStorage.setItem('vtn_theme', t); } catch (e) {}
    refresh();
  }

  function showLogin() {
    const w = document.createElement('div'); w.className = 'login-wrap';
    w.innerHTML = `<div class="login-art"><div class="brand"><div class="brand-logo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><circle cx="12" cy="3" r="1.2" fill="currentColor"/><circle cx="12" cy="21" r="1.2" fill="currentColor"/><circle cx="3" cy="12" r="1.2" fill="currentColor"/><circle cx="21" cy="12" r="1.2" fill="currentColor"/></svg></div><div><b>${esc(CONFIG.appName)}</b><span>${esc(CONFIG.appTagline)}</span></div></div>
      <div><h1 style="font-size:34px;color:#fff;max-width:440px;line-height:1.15">Obras, medições, caixa e contratos no mesmo lugar.</h1><p style="color:#9aa1ab;max-width:420px">Acompanhe progresso físico, financeiro, pendências e equipe de cada obra.</p></div><div class="tiny" style="color:#6b7280">${esc(Store.db.empresa.nome)}</div></div>
      <div class="login-form"><div class="box" id="authBox"></div></div>`;
    document.body.appendChild(w);
    Contas.montarLogin(w.querySelector('#authBox'), () => { w.remove(); start(); trocaObrigatoria(); });
  }

  function start() { if (window.Cloud && Cloud.ativo) Cloud.aplicarPapel(Auth.current()); renderShell(); route(); contarAprovacoes(); try { window.Mercado && Mercado.iniciar(); } catch (e) {} setTimeout(() => { try { window.Desktop && Desktop.oferecer(); } catch (e) {} }, 4000); }
  async function contarAprovacoes() {
    if (!(window.Cloud && Cloud.ativo) || (Auth.current() || {}).papel !== 'admin') return;
    const n = await Cloud.pendentes(); const b = document.getElementById('apBadge'); if (b) { b.textContent = n; b.hidden = !n; }
    if (n) UI.toast(n + ' alteração(ões) aguardando sua aprovação em Aprovações');
    setTimeout(contarAprovacoes, 120000);
  }
  /* Primeiro acesso: troca da senha temporária */
  function trocaObrigatoria() {
    const u = Auth.current(); if (!u || !u.trocarSenha) return;
    const m = UI.modal({ title: 'Crie sua senha', body: `<p class="muted">Este é o seu primeiro acesso. Crie uma senha pessoal (mínimo 8 caracteres).</p><div class="field"><label>Nova senha</label><input class="input" type="password" id="ns1" autocomplete="new-password"></div><div class="field mt"><label>Repita a nova senha</label><input class="input" type="password" id="ns2" autocomplete="new-password"></div><div id="nserr"></div>`, footer: `<button class="btn primary keep" id="nsok">Salvar senha</button>` });
    const bg = m.el.closest('.modal-bg') || m.el; bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-close]')) { e.stopPropagation(); e.preventDefault(); } }, true); document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('ns1')) e.stopPropagation(); }, true);
    m.$('#nsok').onclick = async () => {
      const a = m.$('#ns1').value, b = m.$('#ns2').value;
      if (a.length < 8) { m.$('#nserr').innerHTML = '<div class="alert err mt">Use pelo menos 8 caracteres.</div>'; return; }
      if (a !== b) { m.$('#nserr').innerHTML = '<div class="alert err mt">As senhas não conferem.</div>'; return; }
      await Auth.definirSenha(u, a, false); delete u.senha; u.senhaAlteradaEm = new Date().toISOString(); try { if (window.Cloud && Cloud.ativo) await Cloud.salvarSenha(u); else Store.save(); } catch (e) { m.$('#nserr').innerHTML = '<div class="alert err mt">Não foi possível salvar a senha agora. Tente de novo.</div>'; return; } m.close(); UI.toast('Senha criada. Bem-vindo(a) ao VTN Hub!');
    };
  }
  async function boot() {
    try { const t = localStorage.getItem('vtn_theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
    let online = false;
    if (window.Cloud && Cloud.disponivel()) { $('#app').innerHTML = Cloud.telaCarregando(); online = await Cloud.init(); }
    if (!online) Store.load();
    document.dispatchEvent(new Event('vtn:pronto'));
    window.addEventListener('hashchange', route);
    if (window.VTN_STANDALONE && online) {   // versão independente: o login já foi feito no Firebase
      const em = VTN_STANDALONE.email; const u = Store.all('usuarios').find(x => (x.email || '').toLowerCase() === em && x.ativo !== false);
      if (u) { try { localStorage.setItem(CONFIG.AUTH.sessionKey, u.id); } catch (e) {} Auth.init(); start(); }
      else $('#app').innerHTML = `<div style="display:grid;place-items:center;height:100vh;text-align:center;font-family:Inter,system-ui"><div><b>Login feito como ${UI.esc(em)}</b><p>Este e-mail ainda não está cadastrado nos usuários do VTN Hub. Peça ao Victor ou ao Ismael para cadastrar.</p><button class="btn" onclick="VTN_STANDALONE.sair()">Sair</button></div></div>`;
      return;
    }
    if (Auth.init()) { start(); trocaObrigatoria(); } else showLogin();
  }
  return { boot, route, refresh, renderShell, toggleTheme, goto, contarAprovacoes };
})();

document.addEventListener('DOMContentLoaded', App.boot);
