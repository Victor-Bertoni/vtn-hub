/* Configurações: empresa, usuários/papéis (login preparado), backup */
Views.config = {
  perm: 'config',
  render(el) {
    const { icon, esc } = UI; const e = Store.db.empresa;
    const us = Store.all('usuarios');
    el.innerHTML = `<div class="page-head"><div><h1>Configurações</h1><p>Empresa, usuários e privilégios, backup dos dados</p></div></div>
      <div class="grid g2">
        <div class="card"><div class="card-h"><h3>Dados da empresa</h3><button class="btn sm primary" id="se">${icon('save')} Salvar</button></div><div class="card-b" id="ef">${UI.fields(this.fe(), e)}</div></div>
        <div class="stack">
          <div class="card"><div class="card-h"><h3>Parâmetros fiscais</h3></div><div class="card-b"><p class="tiny muted" style="margin-top:0">Salário mínimo, INSS, IRRF e limites do Simples usados nos cálculos. Ao salvar, vale para todos na hora.</p><button class="btn primary keep" id="pmEdit">Revisar parâmetros</button></div></div>
          <div class="card"><div class="card-h"><h3>VTN Hub Desktop</h3></div><div class="card-b"><p class="tiny muted" style="margin-top:0">Pacote para Windows: atalho "VTN Hub" que abre o app numa janela própria (sem barra de navegador), sempre atualizado, e uma cópia offline para consulta.</p><button class="btn primary keep" id="dkBaixar">Baixar versão desktop</button></div></div>
          <div class="card"><div class="card-h"><h3>Mercado e notícias (rodapé)</h3></div><div class="card-b"><p class="tiny muted" style="margin-top:0">Chave grátis da <b>brapi.dev</b> para mostrar o Ibovespa e as ações das construtoras no rodapé. Sem chave aparecem só Petrobras, Vale, Itaú e Magalu, além de dólar, euro e bitcoin.</p><div class="row"><input class="input" id="brapi" placeholder="Cole a chave (token) da brapi" value="${esc(e.brapiToken || '')}" style="flex:1"><button class="btn sm primary" id="brapiOk">${icon('save')} Salvar</button></div></div></div>
          <div class="card"><div class="card-h"><h3>Login e acesso</h3>${CONFIG.AUTH.enabled ? UI.badge('Login ativo', 'ok') : UI.badge('Login desativado', 'warn')}</div><div class="card-b">
            <p class="muted" style="margin-top:0">Cada pessoa entra com e-mail e senha. Na tela de entrada é possível criar conta (você aprova aqui) e pedir nova senha (você redefine aqui e envia por e-mail). Ninguém vê a senha definitiva de ninguém.</p>
            <div class="alert info">${icon('info')}<div>As senhas ficam guardadas só como código (hash), nunca em texto. Os dados ficam na pasta <b>BANCO DE DADOS</b> do OneDrive (atual: ${UI.esc((window.VTN_PASTA && VTN_PASTA.nome) || "—")}) <button class="btn sm" onclick="VTN_PASTA && VTN_PASTA.trocar()">Trocar pasta</button>. Compartilhe a pasta no OneDrive com quem usa o app.</div></div>
            <div class="field mt"><label>Simular acesso como (testar privilégios)</label><select class="select" id="sim">${us.map(u => `<option value="${u.id}" ${u.id === Auth.current().id ? 'selected' : ''}>${esc(u.nome)} – ${esc((PAPEIS[u.papel] || {}).nome)}</option>`).join('')}</select></div></div></div>
          <div class="card"><div class="card-h"><h3>Backup dos dados</h3></div><div class="card-b stack">
            <p class="muted" style="margin:0">Os dados ficam salvos neste navegador. Faça backup com frequência e use o arquivo para levar para outro computador.</p>
            <div class="row"><button class="btn" id="bx">${icon('download')} Exportar backup (.json)</button><label class="btn">${icon('upload')} Importar backup<input type="file" id="bi" accept=".json" hidden></label></div>
            <div class="row"><button class="btn danger" id="rz">${icon('eraser')} Zerar dados (manter empresa e usuários)</button><button class="btn" id="rd">${icon('rotate-ccw')} Restaurar dados de exemplo</button>${Store.hasOld() ? `<button class="btn" id="rold">${icon('history')} Recuperar versão anterior do app</button>` : ''}</div>
            <p class="tiny muted" style="margin:0">Uso: ${UI.size(new Blob([Store.exportJSON()]).size)} de ~5 MB (dados). Arquivos enviados ficam no IndexedDB.</p></div></div>
        </div>
      </div>
      <div class="card mt"><div class="card-h"><h3>Usuários</h3><button class="btn sm primary" id="nu">${icon('user-plus')} Novo usuário</button></div>
        ${us.some(u => u.status === 'pendente' || u.pedidoSenha) ? `<div class="card-b"><div class="alert warn">${icon('bell')}<div>${us.filter(u => u.status === 'pendente').length} conta(s) aguardando aprovação · ${us.filter(u => u.pedidoSenha).length} pedido(s) de nova senha</div></div></div>` : ''}
        ${UI.table([{ h: 'ID', f: u => `<span class="idlink" data-u="${u.id}">${u.id}</span>` }, { h: 'Nome', f: u => esc(u.nome) }, { h: 'E-mail (login)', f: u => esc(u.email) }, { h: 'Telefone', f: u => esc(u.telefone || '—') },
          { h: 'Papel', f: u => UI.badge(u.funcao || (PAPEIS[u.papel] || {}).nome || u.papel, u.papel === 'admin' ? 'brand' : 'info') },
          { h: 'Situação', f: u => u.status === 'pendente' ? UI.badge('Aguardando aprovação', 'warn') : u.ativo ? (u.trocarSenha ? UI.badge('Senha temporária', 'info') : UI.badge('Ativo', 'ok')) : UI.badge('Inativo', '') },
          { h: 'Senha', f: u => u.pedidoSenha ? UI.badge('Pediu nova senha', 'err') : u.senhaAlteradaEm ? `<span class="tiny">trocada em ${UI.dateTime(u.senhaAlteradaEm.replace('Z', ''))}</span>` : u.senhaHash ? '<span class="tiny muted">protegida</span>' : '<span class="tiny muted">—</span>' },
          { h: '', f: u => `<div class="row" style="flex-wrap:nowrap">${u.status === 'pendente' ? `<button class="btn sm primary" data-ap="${u.id}">Aprovar</button>` : ''}<button class="btn sm" data-rs="${u.id}">Redefinir senha</button><button class="btn sm ghost" data-u="${u.id}">Editar</button></div>` }], us)}</div>
      <div class="card mt"><div class="card-h"><h3>Privilégios por papel</h3><span class="tiny muted">Edite em js/config.js → PAPEIS</span></div><div class="table-wrap"><table class="t perm-grid"><thead><tr><th>Permissão</th>${Object.values(PAPEIS).map(p => `<th>${esc(p.nome)}</th>`).join('')}</tr></thead><tbody>
        ${PERMISSOES.map(([k, l]) => `<tr><td>${esc(l)} <span class="tiny muted mono">${k}</span></td>${Object.values(PAPEIS).map(p => `<td>${p.perms.includes('*') || p.perms.includes(k) ? `<span style="color:var(--ok)">${icon('check')}</span>` : '<span class="muted">—</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
    if (UI.$('#pmEdit', el)) UI.$('#pmEdit', el).onclick = () => window.Parametros && Parametros.editor();
    if (UI.$('#dkBaixar', el)) UI.$('#dkBaixar', el).onclick = e => window.Desktop && Desktop.gerar(e.target);
    if (UI.$('#brapiOk', el)) UI.$('#brapiOk', el).onclick = () => { Store.db.empresa.brapiToken = UI.$('#brapi', el).value.trim(); Store.save(); UI.toast('Chave salva'); window.Mercado && Mercado.atualizar(); };
    UI.$('#se', el).onclick = () => { Object.assign(Store.db.empresa, UI.read(UI.$('#ef', el), this.fe())); Store.save(); UI.toast('Empresa salva'); App.renderShell(); App.route(); };
    UI.$('#sim', el).onchange = e => { Auth.switchTo(e.target.value); UI.toast('Agora você vê o app como: ' + Auth.current().nome); };
    UI.$('#bx', el).onclick = () => UI.download('backup-vtn-' + UI.today() + '.json', Store.exportJSON(), 'application/json');
    UI.$('#bi', el).onchange = async e => { try { Store.importJSON(await e.target.files[0].text()); UI.toast('Backup importado'); App.renderShell(); App.route(); } catch (err) { UI.toast('Arquivo inválido', 'err'); } };
    UI.$('#rz', el).onclick = async () => { if (await UI.confirm('Apagar todas as obras, pessoas, lançamentos etc.? Faça um backup antes.', 'Zerar')) { Store.reset(true); App.renderShell(); App.route(); } };
    UI.$('#rd', el).onclick = async () => { if (await UI.confirm('Substituir tudo pelos dados de exemplo (Jeferson e Rafael)?', 'Restaurar')) { Store.reset(false); App.renderShell(); App.route(); } };
    const ro = UI.$('#rold', el); if (ro) ro.onclick = async () => { if (await UI.confirm('Voltar para os dados da versão anterior (sem as obras 61, 74 e serviços)?', 'Recuperar')) { Store.restoreOld(); App.renderShell(); App.route(); } };
    UI.$('#nu', el).onclick = () => this.editUser();
    UI.$$('[data-u]', el).forEach(s => s.onclick = () => this.editUser(s.dataset.u));
    UI.$$('[data-ap]', el).forEach(b => b.onclick = () => Contas.aprovar(b.dataset.ap));
    UI.$$('[data-rs]', el).forEach(b => b.onclick = async () => { if (await UI.confirm('Gerar uma senha temporária nova para esta pessoa? A senha atual deixa de funcionar.', 'Redefinir')) Contas.redefinir(b.dataset.rs); });
  },
  fe() {
    return [{ k: 'nome', l: 'Razão social', full: 1 }, { k: 'fantasia', l: 'Nome fantasia' }, { k: 'cnpj', l: 'CNPJ' }, { k: 'endereco', l: 'Endereço', full: 1 },
      { k: 'cidade', l: 'Cidade/UF (contratos)' }, { k: 'foro', l: 'Foro' }, { k: 'representante', l: 'Representante legal (contratos)', full: 1 },
      { k: 'email', l: 'E-mail' }, { k: 'telefone', l: 'Telefone' }, { k: 'imposto', l: 'Imposto padrão (%)', t: 'number' }];
  },
  async editUser(id) {
    const u = id ? Store.get('usuarios', id) : { papel: 'engenheiro', ativo: true };
    const d = await UI.formModal({ title: id ? 'Usuário ' + id : 'Novo usuário', values: u, list: [{ k: 'nome', l: 'Nome', req: 1 }, { k: 'email', l: 'E-mail (login)', t: 'email', req: 1 }, { k: 'telefone', l: 'Telefone' }, { k: 'senha', l: id ? 'Nova senha (em branco = manter a atual)' : 'Senha temporária (em branco = gerar automática)', t: 'password' }, { k: 'trocar', l: 'Exigir troca da senha no próximo acesso', t: 'check', def: true },
      { k: 'papel', l: 'Papel', t: 'select', o: Object.entries(PAPEIS).map(([k, v]) => [k, v.nome]), blank: false }, { k: 'pessoaId', l: 'Vincular à pessoa', t: 'select', o: () => Store.all('pessoas').map(p => [p.id, p.nome]) }, { k: 'ativo', l: 'Ativo', t: 'check' }],
      onDelete: id && id !== Auth.current().id ? () => { Store.remove('usuarios', id); App.refresh(); } : null });
    if (!d) return; let senha = d.senha; const trocar = d.trocar; delete d.senha; delete d.trocar;
    if (!id && !senha) senha = Contas.temp();
    if (!id) { d.status = 'ativo'; Store.db.seq.US = Math.max(Store.db.seq.US || 0, ...Store.all('usuarios').map(u => parseInt(String(u.id).split('-')[1], 10) || 0)); }
    const rec = id ? Store.update('usuarios', id, d) : Store.insert('usuarios', d);
    if (window.VTN_STANDALONE && rec.email) { try { await VTN_STANDALONE[rec.ativo === false ? 'bloquear' : 'liberar'](rec.email, rec.papel === 'admin' ? 'admin' : 'leitor'); } catch (e) {} }
    if (senha) { await Auth.definirSenha(rec, senha, id ? trocar : true); delete rec.senha; Store.save(); Contas.mostrarSenha(rec, senha, id ? 'Senha alterada' : 'Usuário criado'); }
    App.refresh();
  }
};
Open.US = id => Views.config.editUser(id);
