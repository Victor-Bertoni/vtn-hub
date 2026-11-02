/* =========================================================
   CONTAS: criar conta, ver senha, recuperar senha, aprovar
   - Criar conta: a pessoa pede acesso; o administrador aprova.
   - Esqueci a senha: o pedido vai ao administrador, que gera uma
     senha temporária e envia por e-mail com um clique.
   - Ver senha: botão de olho em todo campo de senha.
   Senhas nunca ficam visíveis no banco (só o código/hash), por isso
   o administrador redefine, mas não "lê" a senha de ninguém.
   ========================================================= */
window.Contas = (() => {
  const { esc } = UI;
  const dig = t => { let d = String(t || '').replace(/\D/g, ''); if (d && !d.startsWith('55')) d = '55' + d; return d; };
  const admins = () => Store.all('usuarios').filter(u => u.papel === 'admin' && u.ativo && u.email);
  const admin = () => { const a = admins(); return a.length ? { nome: a.map(x => x.nome.split(' ')[0]).join(' e '), email: a.map(x => x.email).join(',') } : {}; };
  const mail = (to, assunto, corpo, cc) => `mailto:${to}?${cc ? 'cc=' + encodeURIComponent(cc) + '&' : ''}subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
  /* bloco de envio por e-mail: link + texto copiável (dentro do app o link de e-mail pode não abrir) */
  const envio = (to, assunto, corpo, rotulo, cc) => `<a class="btn primary keep" style="justify-content:center" target="_blank" rel="noopener" href="${mail(to, assunto, corpo, cc)}">✉️ ${esc(rotulo)}</a>
    <div class="tiny muted">Se o e-mail não abrir, copie e envie para <b style="user-select:all">${esc(to)}</b>:</div><textarea class="input mono" rows="5" readonly onclick="this.select()">${esc(corpo)}</textarea>`;
  const temp = () => { const a = 'ABCDEFGHJKMNPQRSTUVWXYZ'; const r = crypto.getRandomValues(new Uint32Array(3)); return 'Vtn-' + a[r[0] % a.length] + a[r[1] % a.length] + (1000 + r[2] % 9000); };
  const linkApp = () => { try { return (window.top === window ? location.href.split('#')[0] : document.referrer.split('#')[0]) || ''; } catch (e) { return ''; } };

  /* grava a lista de usuários (online: só quem tem permissão de gravação) */
  async function salvarUsuarios() {
    if (window.Cloud && Cloud.ativo) return Cloud.salvarSenha();
    Store.save();
  }

  /* ---------- olho para mostrar/ocultar senha ---------- */
  document.addEventListener('focusin', e => {
    const i = e.target; if (!(i instanceof HTMLInputElement) || i.dataset.eye || (i.type !== 'password')) return;
    i.dataset.eye = '1';
    const w = document.createElement('span'); w.className = 'pw-wrap'; i.parentNode.insertBefore(w, i); w.appendChild(i);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pw-eye'; b.title = 'Mostrar senha'; b.textContent = '👁';
    b.onmousedown = ev => ev.preventDefault();
    b.onclick = () => { const v = i.type === 'password'; i.type = v ? 'text' : 'password'; b.textContent = v ? '🙈' : '👁'; b.title = v ? 'Ocultar senha' : 'Mostrar senha'; i.focus(); };
    w.appendChild(b);
  });

  /* ---------- tela de entrada com 3 abas ---------- */
  function montarLogin(box, entrou) {
    let aba = 'entrar';
    const draw = () => {
      box.innerHTML = `<div class="auth-tabs"><button type="button" class="${aba === 'entrar' ? 'on' : ''}" data-a="entrar">Entrar</button><button type="button" class="${aba === 'criar' ? 'on' : ''}" data-a="criar">Criar conta</button><button type="button" class="${aba === 'esqueci' ? 'on' : ''}" data-a="esqueci">Esqueci a senha</button></div><div id="authBody"></div>`;
      box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { aba = b.dataset.a; draw(); });
      const c = box.querySelector('#authBody');
      if (aba === 'entrar') {
        c.innerHTML = `<form class="stack" id="lf"><h2>Entrar</h2><p class="muted" style="margin:0">Use seu e-mail e senha.</p>
          <div class="field"><label for="le">E-mail</label><input class="input" id="le" name="email" type="email" autocomplete="username" required></div>
          <div class="field"><label for="ls">Senha</label><input class="input" id="ls" name="senha" type="password" autocomplete="current-password" required></div>
          <div id="lerr"></div><button class="btn primary keep" style="justify-content:center">Entrar</button>
          <p class="tiny muted" style="margin:0">Primeiro acesso: use a senha temporária que você recebeu. O sistema vai pedir uma senha nova.</p></form>`;
        c.querySelector('#lf').onsubmit = async e => {
          e.preventDefault(); const em = c.querySelector('#le').value.trim(), se = c.querySelector('#ls').value;
          const u = Store.all('usuarios').find(x => (x.email || '').toLowerCase() === em.toLowerCase());
          if (u && u.status === 'pendente') { c.querySelector('#lerr').innerHTML = `<div class="alert warn">Sua conta ainda aguarda aprovação do administrador.</div>`; return; }
          if (!(await Auth.login(em, se))) { c.querySelector('#lerr').innerHTML = `<div class="alert err">E-mail ou senha inválidos. Se esqueceu, use a aba "Esqueci a senha".</div>`; return; }
          entrou();
        };
      }
      if (aba === 'criar') {
        c.innerHTML = `<form class="stack" id="cf"><h2>Criar conta</h2><p class="muted" style="margin:0">Preencha seus dados. O administrador da VTN aprova o acesso.</p>
          <div class="field"><label for="cn">Nome completo</label><input class="input" id="cn" required></div>
          <div class="field"><label for="ce">E-mail</label><input class="input" id="ce" type="email" required></div>
          <div class="field"><label for="ct">Telefone</label><input class="input" id="ct" placeholder="(31) 9 9999-9999"></div>
          <div class="field"><label for="cs1">Senha (mínimo 8 caracteres)</label><input class="input" id="cs1" type="password" autocomplete="new-password" required></div>
          <div class="field"><label for="cs2">Repita a senha</label><input class="input" id="cs2" type="password" autocomplete="new-password" required></div>
          <div id="cerr"></div><button class="btn primary keep" style="justify-content:center">Criar conta</button></form>`;
        c.querySelector('#cf').onsubmit = async e => {
          e.preventDefault();
          const nome = c.querySelector('#cn').value.trim(), email = c.querySelector('#ce').value.trim().toLowerCase(), tel = c.querySelector('#ct').value.trim(), a = c.querySelector('#cs1').value, b = c.querySelector('#cs2').value;
          const err = m => c.querySelector('#cerr').innerHTML = `<div class="alert err">${m}</div>`;
          if (a.length < 8) return err('A senha precisa ter pelo menos 8 caracteres.');
          if (a !== b) return err('As senhas não conferem.');
          if (Store.all('usuarios').some(u => (u.email || '').toLowerCase() === email)) return err('Já existe uma conta com este e-mail. Use "Entrar" ou "Esqueci a senha".');
          const ad = admin(); const msg = `Olá! Criei uma conta no VTN Hub e preciso de aprovação.\nNome: ${nome}\nE-mail: ${email}\nTelefone: ${tel}`;
          let gravou = false;
          try {
            Store.db.seq.US = Math.max(Store.db.seq.US || 0, ...Store.all('usuarios').map(u => parseInt(String(u.id).split('-')[1], 10) || 0));
            const primeiro = !Store.all('usuarios').length;   // pasta nova: o primeiro cadastro é o administrador
            const u = { id: Store.nextId('usuarios'), nome, email, telefone: tel, papel: primeiro ? 'admin' : 'leitor', ativo: primeiro, status: primeiro ? 'ativo' : 'pendente', solicitadoEm: new Date().toISOString(), criadoEm: new Date().toISOString() };
            await Auth.definirSenha(u, a, false); delete u.senha;
            if (window.Cloud && Cloud.ativo && !Cloud.dbEditor) { delete u.id; await Cloud.enviarPedido({ tipo: 'conta', autorNome: nome, conta: u, resumo: ['Nova conta: ' + nome + ' (' + email + ')'] }); gravou = true; }
            else { Store.db.usuarios.push(u); await salvarUsuarios(); gravou = true; }
          } catch (er) { Store.db.usuarios = Store.db.usuarios.filter(x => x.status !== 'pendente' || x.email !== email); }
          c.innerHTML = `<div class="stack"><h2>${gravou ? 'Conta criada ✔' : 'Pedido pronto'}</h2>
            <p class="muted" style="margin:0">${gravou ? 'Sua conta foi criada e aguarda a aprovação do administrador. Avise por e-mail para agilizar.' : 'Seu acesso atual não permite gravar a conta direto. Envie o pedido ao administrador: ele cria o seu acesso.'}</p>
            ${ad.email ? envio(ad.email, 'VTN Hub – pedido de acesso', msg, 'Avisar os administradores (' + (ad.nome || '') + ') por e-mail') : ''}
            <button class="btn" type="button" id="cvolta">Voltar para entrar</button></div>`;
          c.querySelector('#cvolta').onclick = () => { aba = 'entrar'; draw(); };
        };
      }
      if (aba === 'esqueci') {
        c.innerHTML = `<form class="stack" id="ef"><h2>Recuperar senha</h2><p class="muted" style="margin:0">Informe seu e-mail. O administrador gera uma senha temporária e envia no seu e-mail. No próximo acesso você cria uma senha nova.</p>
          <div class="field"><label for="ee">E-mail</label><input class="input" id="ee" type="email" required></div><div id="eerr"></div>
          <button class="btn primary keep" style="justify-content:center">Pedir nova senha</button></form>`;
        c.querySelector('#ef').onsubmit = async e => {
          e.preventDefault(); const email = c.querySelector('#ee').value.trim().toLowerCase();
          const u = Store.all('usuarios').find(x => (x.email || '').toLowerCase() === email);
          const ad = admin();
          if (u) { try { if (window.Cloud && Cloud.ativo && !Cloud.dbEditor) await Cloud.enviarPedido({ tipo: 'senha', autorId: u.id, autorNome: u.nome, resumo: ['Pedido de nova senha: ' + u.nome + ' (' + email + ')'] }); else { u.pedidoSenha = new Date().toISOString(); await salvarUsuarios(); } } catch (er) {} }
          const msg = `Olá! Esqueci minha senha do VTN Hub. Pode gerar uma senha temporária para mim?\nE-mail: ${email}`;
          c.innerHTML = `<div class="stack"><h2>Pedido enviado</h2><p class="muted" style="margin:0">${u ? 'Avise o administrador por e-mail. Ele vai te mandar uma senha temporária.' : 'Se este e-mail tiver conta, o administrador consegue redefinir a senha.'}</p>
            ${ad.email ? envio(ad.email, 'VTN Hub – esqueci minha senha', msg, 'Pedir aos administradores (' + (ad.nome || '') + ') por e-mail') : ''}
            <button class="btn" type="button" id="evolta">Voltar para entrar</button></div>`;
          c.querySelector('#evolta').onclick = () => { aba = 'entrar'; draw(); };
        };
      }
    };
    draw();
  }

  /* ---------- administrador: redefinir senha / aprovar ---------- */
  async function redefinir(id) {
    const u = Store.get('usuarios', id); if (!u) return;
    if (window.VTN_STANDALONE) { try { await VTN_STANDALONE.resetarSenha(u.email); UI.toast('Link de nova senha enviado para ' + u.email); } catch (e) { UI.toast('Não foi possível enviar: ' + (e.code || e.message), 'err'); } return; }
    const t = temp(); await Auth.definirSenha(u, t, true); delete u.senha; delete u.pedidoSenha; u.senhaRedefinidaEm = new Date().toISOString();
    try { await salvarUsuarios(); } catch (e) { UI.toast('Não foi possível salvar: você precisa de acesso de edição.', 'err'); return; }
    mostrarSenha(u, t, 'Senha redefinida');
  }
  async function aprovar(id, papel) {
    const u = Store.get('usuarios', id); if (!u) return;
    Object.assign(u, { ativo: true, status: 'ativo', papel: papel || u.papel || 'leitor', aprovadoEm: new Date().toISOString() });
    try { await salvarUsuarios(); } catch (e) { UI.toast('Não foi possível salvar.', 'err'); return; }
    if (window.VTN_STANDALONE) { try { await VTN_STANDALONE.liberar(u.email, u.papel === 'admin' ? 'admin' : 'leitor'); } catch (e) {} }
    UI.toast('Conta aprovada: ' + u.nome);
    const msg = `Olá, ${u.nome.split(' ')[0]}! Sua conta no VTN Hub foi aprovada.\nEntre com o e-mail ${u.email} e a senha que você criou.\n${linkApp()}`; UI.modal({ title: 'Conta aprovada', body: `<div class="stack"><p style="margin:0">Avise ${esc(u.nome)} por e-mail:</p>${envio(u.email, 'VTN Hub – conta aprovada', msg, 'Enviar aviso por e-mail', admins().map(x => x.email).filter(e => e !== u.email).join(','))}</div>` });
    App.refresh();
  }
  function mostrarSenha(u, t, titulo) {
    const msg = `Olá, ${u.nome.split(' ')[0]}! Sua senha temporária do VTN Hub:\nLogin: ${u.email}\nSenha: ${t}\nNo primeiro acesso o sistema pede para você criar uma senha nova.\n${linkApp()}`;
    UI.modal({ title: titulo, body: `<p>Senha temporária de <b>${esc(u.nome)}</b> (mostrada só agora):</p><div class="pw-show"><code style="user-select:all">${esc(t)}</code><button class="btn sm" type="button" id="cpw">Copiar</button></div><p class="tiny muted">No próximo acesso a pessoa cria uma senha nova. Ninguém consegue ver a senha definitiva, nem o administrador.</p>
      <div class="stack">${envio(u.email, 'VTN Hub – sua senha temporária', msg, 'Enviar por e-mail para ' + u.nome.split(' ')[0] + ' (cópia para os administradores)', admins().map(x => x.email).filter(e => e !== u.email).join(','))}</div>` });
    const b = document.getElementById('cpw'); if (b) b.onclick = () => navigator.clipboard.writeText(t).then(() => UI.toast('Senha copiada'), () => UI.toast('Selecione e copie a senha', 'err'));
  }
  return { montarLogin, redefinir, aprovar, mostrarSenha, temp, salvarUsuarios };
})();
