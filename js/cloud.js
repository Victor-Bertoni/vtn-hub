/* =========================================================
   MODO COMPARTILHADO (dados na pasta do OneDrive – ver js/pasta.js)
   - Dados num banco compartilhado e privado: todos os convidados
     da VTN veem a mesma informação, em tempo real.
   - Usar o app não consome créditos/tokens: é só leitura e escrita
     no banco do próprio app.
   - Fora do Claude (abrindo o index.html no Edge) o app continua
     funcionando no modo local, como antes.
   ========================================================= */
window.Cloud = (() => {
  const COL = 'vtn';                 // coleção do banco
  const LIM = 140000;                // caracteres por bloco (limite do banco: 256 KiB)
  let db = null, assets = null, downloads = null, user = null;
  let ultimo = {};                   // id do bloco -> texto já gravado/recebido
  let timer = null, gravando = false, pendente = false, unsub = null, refreshAdiado = false;
  let ultDocs = {}, inicio = 0, meId = '', senhasDocs = [], comments = null;
  const api = { ativo: false, nome: '', podeEditar: true, dbEditor: true };

  api.disponivel = () => !!(window.claude && typeof window.claude.use === 'function');
  api.telaCarregando = () => `<div style="display:grid;place-items:center;height:100vh;width:100%;font-family:Inter,system-ui,sans-serif;color:#334155"><div style="text-align:center"><div style="width:46px;height:46px;border-radius:12px;background:linear-gradient(135deg,#2563eb,#06b6d4);margin:0 auto 14px;animation:pulse 1.2s infinite"></div><b>Carregando o VTN Hub…</b><div style="font-size:12px;color:#64748b;margin-top:4px">conectando aos dados da VTN</div></div></div>`;

  /* ---------- divide o banco em blocos ---------- */
  function blocos(state) {
    const out = {}; const meta = {};
    Object.keys(state).forEach(k => {
      const v = state[k];
      if (!Array.isArray(v)) { meta[k] = v; return; }
      let parte = [], tam = 2, n = 0;
      const fecha = () => { out[k + '__' + n] = { coll: k, n, json: JSON.stringify(parte) }; n++; parte = []; tam = 2; };
      v.forEach(item => { const t = JSON.stringify(item).length + 1; if (tam + t > LIM && parte.length) fecha(); parte.push(item); tam += t; });
      fecha();
    });
    out._meta = { coll: '_meta', n: 0, json: JSON.stringify(meta) };
    return out;
  }
  /* senhas definidas por quem não é editor ficam em senhas/<conta> (cada um só grava a sua) */
  function comSenhas(state) {
    (state.usuarios || []).forEach(u => {
      if (u.papel === 'admin') return;
      const L = senhasDocs.filter(d => d.usId === u.id && (!u.claudeId || u.claudeId === d.docId) && (d.em || '') > (u.senhaRedefinidaEm || '')).sort((a, b) => (b.em || '').localeCompare(a.em || ''));
      if (L[0]) Object.assign(u, { salt: L[0].salt, senhaHash: L[0].senhaHash, trocarSenha: false, senhaAlteradaEm: L[0].em, contaClaude: L[0].docId });
    });
    return state;
  }
  async function lerSenhas() { try { const s = await db.collection('senhas').limit(500).get(); senhasDocs = s.docs.map(d => Object.assign({ docId: d.id }, d.data())); } catch (e) { senhasDocs = []; } }
  function montar(docs) {
    const state = {}; const grupos = {};
    docs.forEach(d => { if (!d || !d.coll) return; (grupos[d.coll] = grupos[d.coll] || []).push(d); });
    Object.entries(grupos).forEach(([k, arr]) => {
      if (k === '_meta') { try { Object.assign(state, JSON.parse(arr[0].json)); } catch (e) {} return; }
      state[k] = arr.sort((a, b) => a.n - b.n).flatMap(d => { try { return JSON.parse(d.json); } catch (e) { return []; } });
    });
    return state;
  }

  /* ---------- inicialização ---------- */
  api.init = async function () {
    try { db = await claude.use('db'); } catch (e) { db = null; }
    if (!db) return false;
    try {
      const ler = async () => { const snap = await Promise.race([db.collection(COL).limit(1000).get(), new Promise((_, r) => setTimeout(() => r(new Error('tempo')), 15000))]); ultimo = {}; ultDocs = {}; return montar(snap.docs.map(d => { const x = d.data(); ultimo[d.id] = x && x.json; ultDocs[d.id] = x; return x; })); };
      await lerSenhas();
      let state = await ler();
      // banco ainda sendo preparado: espera até 1 minuto antes de começar do zero
      for (let i = 0; i < 20 && !state.obras; i++) { const el = document.querySelector('#app b'); if (el) el.textContent = 'Preparando os dados da VTN…'; await new Promise(r => setTimeout(r, 3000)); state = await ler(); }
      api.ativo = true;
      if (!state.obras) { state = (window.Seed ? Seed.build() : {}); Store.setDb(state); api.agendar(0); }
      else Store.setDb(comSenhas(state));
    } catch (e) { console.error('Cloud.init', e); api.ativo = false; return false; }
    // quem pode editar: só o dono (Victor) e quem for convidado como Editor (Ismael)
    inicio = Date.now();
    try { const u0 = await claude.use('user'); api.dbEditor = u0 ? !!(await u0.canEdit()) : false; meId = (u0 && u0.id) ? (await u0.id()) || '' : ''; } catch (e) { api.dbEditor = false; }
    api.podeEditar = api.dbEditor;
    document.documentElement.classList.toggle('somente-leitura', !api.podeEditar);
    // extras (não bloqueiam a abertura)
    claude.use('user').then(u => { user = u; if (u && u.me) u.me().then(p => { api.nome = (p && p.name) || ''; const b = document.querySelector('.side-foot b'); if (b && api.nome) b.textContent = api.nome; const n = api.nome.toLowerCase().split(' ')[0]; const us = (Store.db.usuarios || []).find(x => n && x.nome.toLowerCase().startsWith(n)); const sp = document.querySelector('.side-foot .tiny'); if (sp) sp.textContent = api.podeEditar ? (us ? (PAPEIS[us.papel] || {}).nome || 'Editor' : 'Editor') : 'Somente visualização'; }).catch(() => {}); });
    claude.use('assets').then(a => { assets = a; });
    claude.use('downloads').then(d => { downloads = d; });
    claude.use('comments').then(c => { comments = c; }).catch(() => {});
    escutar();
    return true;
  };

  /* ---------- tempo real: mudanças feitas por outros sócios ---------- */
  function escutar() {
    if (unsub) return;
    unsub = db.collection(COL).limit(1000).onSnapshot(snap => {
      if (snap.metadata && snap.metadata.hasPendingWrites) return;
      let mudou = false;
      snap.docChanges().forEach(ch => { const x = ch.doc.data && ch.doc.data(); const txt = x && x.json; if (ch.type === 'removed') delete ultDocs[ch.doc.id]; else ultDocs[ch.doc.id] = x; if (ch.type === 'removed') { if (ultimo[ch.doc.id] !== undefined) { delete ultimo[ch.doc.id]; mudou = true; } } else if (ultimo[ch.doc.id] !== txt) { ultimo[ch.doc.id] = txt; mudou = true; } });
      if (!mudou || gravando) return;
      const state = comSenhas(montar(snap.docs.map(d => d.data())));
      if (!state.obras) return;
      Store.setDb(state);
      if (document.querySelector('.modal-bg')) { refreshAdiado = true; return; }
      try { App.renderShell(); App.route(); } catch (e) {}
      UI.toast('Dados atualizados por outro usuário da VTN');
    }, err => { console.warn('Cloud snapshot', err); unsub = null; setTimeout(escutar, 5000); });
    document.addEventListener('click', () => { if (refreshAdiado && !document.querySelector('.modal-bg')) { refreshAdiado = false; setTimeout(() => App.refresh(), 50); } }, true);
  }

  /* ---------- gravação (com espera curta para juntar várias edições) ---------- */
  api.agendar = function (ms = 900) {
    if (!api.podeEditar) {   // sem permissão de editar: vira pedido de aprovação (ou só desfaz)
      clearTimeout(timer);
      timer = setTimeout(() => {
        const base = comSenhas(montar(Object.values(ultDocs)));
        const d = diferenca(base, Store.db);
        Store.setDb(base);
        if (Date.now() - inicio < 6000 || !d.qtd) return;
        try { App.refresh(); } catch (e) {}
        pedirAprovacao(d);
      }, 50);
      return;
    }
    clearTimeout(timer); timer = setTimeout(gravar, ms);
  };
  /* ---------- pedidos de alteração (aprovados pelos administradores) ---------- */
  const RUIDO = ['enqSnap', 'enqHist', 'relAuto', 'relCentral', 'blobs', 'vtnModelosVersao'];
  function diferenca(a, b) {
    const out = { colecoes: {}, meta: {}, qtd: 0, resumo: [] };
    Object.keys(b).forEach(k => {
      if (RUIDO.includes(k)) return;
      if (Array.isArray(b[k])) {
        const A = new Map((a[k] || []).map(x => [x.id, x])), B = new Map(b[k].map(x => [x.id, x]));
        const up = [], del = [];
        B.forEach((v, id) => { if (!A.has(id) || JSON.stringify(A.get(id)) !== JSON.stringify(v)) up.push(v); });
        A.forEach((v, id) => { if (!B.has(id)) del.push(id); });
        if (up.length || del.length) { out.colecoes[k] = { up, del }; out.qtd += up.length + del.length;
          up.forEach(v => out.resumo.push(`${A.has(v.id) ? 'Alterar' : 'Incluir'} ${k} ${v.id || ''} ${v.titulo || v.nome || v.descricao || ''}`.trim()));
          del.forEach(id => out.resumo.push(`Excluir ${k} ${id}`)); }
      } else if (k !== 'seq' && JSON.stringify(a[k]) !== JSON.stringify(b[k])) { out.meta[k] = b[k]; out.qtd++; out.resumo.push('Alterar configuração: ' + k); }
    });
    if (out.qtd && JSON.stringify(a.seq) !== JSON.stringify(b.seq)) out.meta.seq = b.seq;
    return out;
  }
  /* Pedidos ficam em pedidos/<conta>/itens/<id>: cada pessoa (Colaborador ou acima) só grava os seus.
     As decisões ficam em decisoes/<chave>, que só os administradores (Editores) gravam. */
  async function enviarPedido(item) {
    if (!db) throw new Error('offline');
    if (!meId) { try { const u0 = await claude.use('user'); meId = (u0 && u0.id) ? (await u0.id()) || '' : ''; } catch (e) {} }
    if (!meId) throw new Error('sem conta');
    const u = (window.Auth && Auth.current()) || {};
    const id = 'SOL-' + Date.now().toString(36).toUpperCase();
    const doc = Object.assign({ id, autorId: u.id || '', autorNome: u.nome || api.nome || '', claudeId: meId, criadoEm: new Date().toISOString(), tela: location.hash }, item);
    await db.collection('pedidos').doc(meId).set({ autorNome: doc.autorNome, atualizadoEm: doc.criadoEm });
    await db.collection('pedidos/' + meId + '/itens').doc(id).set(doc);
    return doc;
  }
  api.enviarPedido = enviarPedido;
  /* quem só tem acesso de Visualizador não grava nada no banco: resta comentar na página */
  function semPermissao(texto) {
    const m = UI.modal({ title: 'Não foi possível enviar', body: `<p>Não foi possível gravar na pasta do banco de dados (o OneDrive pode estar sem permissão de edição para você), o que não permite enviar sugestões pelo app.</p><p class="tiny">Peça ao Victor para mudar seu convite para <b>Colaborador</b> no menu Compartilhar. Enquanto isso, você pode deixar sua sugestão como comentário nesta página.</p>${texto ? `<div class="field"><label>Sua sugestão (copie para o comentário)</label><textarea class="input" rows="3" readonly>${UI.esc(texto)}</textarea></div>` : ''}`,
      footer: `<button class="btn" data-close>Fechar</button>${comments && comments.openComposer ? '<button class="btn primary keep" id="cmok">Comentar na página</button>' : ''}` });
    const b = m.$('#cmok'); if (b) b.onclick = async () => { const alvo = document.querySelector('.content') || document.body; m.close(); try { await comments.openComposer({ element: alvo }); } catch (e) {} };
  }
  function pedirAprovacao(d) {
    const m = UI.modal({ title: 'Enviar alteração para aprovação', body: `<p>Você não pode alterar dados diretamente. Esta alteração será enviada para os administradores (Victor e Ismael) aprovarem:</p><ul class="tiny">${d.resumo.slice(0, 12).map(x => `<li>${UI.esc(x)}</li>`).join('')}${d.resumo.length > 12 ? `<li>… e mais ${d.resumo.length - 12}</li>` : ''}</ul><div class="field"><label for="apjust">Motivo / observação (opcional)</label><textarea class="input" id="apjust" rows="2"></textarea></div>`,
      footer: `<button class="btn" data-close>Descartar</button><button class="btn primary keep" id="apok">Enviar para aprovação</button>` });
    m.$('#apok').onclick = async () => {
      const motivo = m.$('#apjust').value.trim();
      try {
        await enviarPedido({ tipo: 'alteracao', motivo, resumo: d.resumo.slice(0, 50), json: JSON.stringify({ colecoes: d.colecoes, meta: d.meta }).slice(0, 240000) });
        m.close(); UI.toast('Enviado para aprovação dos administradores');
      } catch (e) { m.close(); semPermissao(motivo || d.resumo.slice(0, 5).join('; ')); }
    };
  }
  /* sugestão livre (qualquer pessoa da equipe) */
  api.sugerir = function () {
    const tela = (document.querySelector('.page-head h1') || {}).textContent || '';
    const m = UI.modal({ title: 'Sugerir uma mudança', body: `<p class="tiny muted">Sua sugestão vai para os administradores (Victor e Ismael). Nada muda no sistema sem a aprovação deles.</p>
      <div class="field"><label for="sgtipo">Assunto</label><select class="input" id="sgtipo">${['Melhoria no app', 'Correção de dado', 'Obra / serviço', 'Financeiro', 'Contrato / orçamento', 'Outro'].map(x => `<option>${x}</option>`).join('')}</select></div>
      <div class="field"><label for="sgtxt">O que você sugere?</label><textarea class="input" id="sgtxt" rows="4" placeholder="Descreva a mudança${tela ? ' (tela: ' + UI.esc(tela) + ')' : ''}"></textarea></div>`,
      footer: `<button class="btn" data-close>Cancelar</button><button class="btn primary keep" id="sgok">Enviar sugestão</button>` });
    m.$('#sgok').onclick = async () => {
      const texto = m.$('#sgtxt').value.trim(); if (!texto) { m.$('#sgtxt').focus(); return; }
      const assunto = m.$('#sgtipo').value;
      try { await enviarPedido({ tipo: 'sugestao', assunto, texto, resumo: [assunto + (tela ? ' · ' + tela : '')] }); m.close(); UI.toast('Sugestão enviada aos administradores'); try { App.contarAprovacoes && App.contarAprovacoes(); } catch (e) {} }
      catch (e) { m.close(); semPermissao(assunto + ': ' + texto); }
    };
  };
  api.solicitacoes = async () => {
    const out = [];
    const [ped, dec] = await Promise.all([db.collection('pedidos').limit(500).get(), db.collection('decisoes').limit(1000).get().catch(() => ({ docs: [] }))]);
    const D = {}; dec.docs.forEach(x => { D[x.id] = x.data(); });
    await Promise.all(ped.docs.map(async p => { try { const it = await db.collection('pedidos/' + p.id + '/itens').limit(500).get(); it.docs.forEach(x => { const v = x.data(); const chave = p.id + '__' + v.id; const d = D[chave] || {}; out.push(Object.assign({}, v, { chave, claudeId: p.id, status: d.status || 'pendente', decididoPor: d.decididoPor, decididoEm: d.decididoEm, obs: d.obs })); }); } catch (e) {} }));
    try { const old = await db.collection('solicitacoes').limit(500).get(); old.docs.forEach(x => out.push(Object.assign({ legado: true, tipo: 'alteracao' }, x.data()))); } catch (e) {}
    return out.sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
  };
  api.decidir = async (sol, aprovar, obs) => {
    const u = (window.Auth && Auth.current()) || {};
    if (aprovar && (sol.tipo || 'alteracao') === 'alteracao') {
      const d = JSON.parse(sol.json || '{}');
      Object.entries(d.colecoes || {}).forEach(([k, c]) => {
        Store.db[k] = Store.db[k] || [];
        (c.del || []).forEach(id => { Store.db[k] = Store.db[k].filter(x => x.id !== id); });
        (c.up || []).forEach(v => { const i = Store.db[k].findIndex(x => x.id === v.id); if (i >= 0) Store.db[k][i] = v; else Store.db[k].push(v); });
      });
      Object.entries(d.meta || {}).forEach(([k, v]) => { if (k === 'seq') { Store.db.seq = Store.db.seq || {}; Object.entries(v || {}).forEach(([p, n]) => { Store.db.seq[p] = Math.max(Store.db.seq[p] || 0, n); }); } else Store.db[k] = v; });
      Store.save();
    }
    if (aprovar && sol.tipo === 'conta' && sol.conta) {
      const c = sol.conta; const ja = (Store.db.usuarios || []).find(x => (x.email || '').toLowerCase() === (c.email || '').toLowerCase());
      if (!ja) { Store.db.usuarios = Store.db.usuarios || []; Store.db.usuarios.push(Object.assign({}, c, { id: Store.nextId('usuarios'), papel: 'leitor', ativo: true, status: 'ativo', claudeId: sol.claudeId, aprovadoEm: new Date().toISOString(), criadoEm: sol.criadoEm })); }
      else Object.assign(ja, { ativo: true, status: 'ativo', claudeId: ja.claudeId || sol.claudeId });
      await api.flush(); Store.save();
      if (window.VTN_STANDALONE && c.email) { try { await VTN_STANDALONE.liberar(c.email, 'leitor'); } catch (e) {} }
    }
    const dec = { status: aprovar ? 'aprovada' : 'recusada', decididoPor: u.nome || api.nome || '', decididoEm: new Date().toISOString(), obs: obs || '' };
    if (sol.legado) await db.collection('solicitacoes').doc(sol.id).set(Object.assign({}, sol, dec));
    else await db.collection('decisoes').doc(sol.chave).set(dec);
  };
  api.pendentes = async () => { try { return (await api.solicitacoes()).filter(x => x.status === 'pendente').length; } catch (e) { return 0; } };
  api.nomesClaude = async (ids) => { try { if (!user || !user.profiles) return {}; const ps = await user.profiles(ids.filter(Boolean)); const o = {}; ids.forEach(i => { o[i] = (ps && ps[i] && ps[i].name) || ''; }); return o; } catch (e) { return {}; } };
  api.meuId = () => meId;

  async function gravar() {
    if (!db || !api.ativo) return;
    if (gravando) { pendente = true; return; }
    gravando = true;
    try {
      const novos = blocos(Store.db);
      const ops = [];
      Object.entries(novos).forEach(([id, d]) => { if (ultimo[id] !== d.json) { ultimo[id] = d.json; ultDocs[id] = d; ops.push(db.collection(COL).doc(id).set(d)); } });
      Object.keys(ultimo).forEach(id => { if (!novos[id]) { delete ultimo[id]; delete ultDocs[id]; ops.push(db.collection(COL).doc(id).delete()); } });
      await Promise.all(ops);
      if (ops.length) { mostrarSalvo(); db.collection('sistema').doc('ultimaGravacao').set({ em: new Date().toISOString(), por: ((window.Auth && Auth.current()) || {}).nome || api.nome || '' }).catch(() => {}); }
    } catch (e) {
      console.error('Cloud.gravar', e);
      const code = e && e.code;
      UI.toast(code === 'permission_denied' || code === 'not_granted' ? 'Você está como visualizador: peça ao administrador acesso de edição para salvar.' : 'Não foi possível salvar online agora. Tentando de novo…', 'err');
      if (code !== 'permission_denied' && code !== 'not_granted') setTimeout(() => api.agendar(0), 5000);
    } finally { gravando = false; if (pendente) { pendente = false; api.agendar(300); } }
  }
  function mostrarSalvo() {
    let el = document.getElementById('cloudOk');
    if (!el) { el = document.createElement('div'); el.id = 'cloudOk'; el.className = 'cloud-ok'; document.body.appendChild(el); }
    el.textContent = '✓ Salvo online'; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 1600);
  }

  /* ---------- arquivos (anexos, relatórios guardados) ---------- */
  api.Files = {
    async put(id, blob) {
      if (/^RC-/.test(id)) { const html = await blob.text(); await db.collection('relatorios').doc(id).set({ html: html.slice(0, 240000) }); return; }
      if (!assets) throw new Error('Envio de arquivos indisponível para este usuário');
      const r = await assets.upload(blob);
      Store.db.blobs = Store.db.blobs || {}; Store.db.blobs[id] = r.id; Store.save();
    },
    async get(id) {
      if (/^RC-/.test(id)) { const s = await db.collection('relatorios').doc(id).get(); return s.exists ? new Blob([s.data().html], { type: 'text/html' }) : null; }
      const a = (Store.db.blobs || {})[id]; if (!a) return null;
      if (assets && assets.get) return assets.get(a);
      const r = await fetch('/_blob/' + a); return r.ok ? r.blob() : null;
    },
    async del(id) {
      try {
        if (/^RC-/.test(id)) await db.collection('relatorios').doc(id).delete();
        else { const a = (Store.db.blobs || {})[id]; if (a && assets) await assets.delete(a); if (Store.db.blobs) delete Store.db.blobs[id]; }
      } catch (e) {}
    },
    abrir(id, rec) {
      const a = (Store.db.blobs || {})[id];
      if (!a) { UI.toast('Este arquivo foi enviado no modo local (outro computador). Envie de novo aqui para todos verem.', 'err'); return; }
      if (assets && assets.url) { assets.url(a).then(u => { if (u) window.open(u, '_blank', 'noopener'); else UI.toast('Arquivo não encontrado.', 'err'); }); return; }
      const link = document.createElement('a'); link.href = new URL('/_blob/' + a, location.href).href; link.target = '_blank'; link.rel = 'noopener'; document.body.appendChild(link); link.click(); link.remove();
    }
  };

  /* ---------- downloads e impressão ---------- */
  api.baixar = async function (nome, blob) {
    if (!downloads) { UI.toast('Download indisponível neste acesso.', 'err'); return; }
    try { const r = await downloads.save({ filename: nome, data: blob }); if (r && r.status === 'saved') UI.toast('Arquivo salvo: ' + nome); }
    catch (e) { if (e && e.code !== 'declined' && e.code !== 'cancelled') UI.toast('Não foi possível salvar o arquivo.', 'err'); }
  };
  api.imprimir = function (html, titulo) {
    if (window.VTN_PASTA) { const w = window.open('', '_blank'); if (w) { const css = [...document.styleSheets].map(ss => { try { return [...ss.cssRules].map(r => r.cssText).join('\n'); } catch (e) { return ''; } }).join('\n'); w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${UI.esc(titulo || 'Documento')}</title><style>${css}</style></head><body style="background:#fff">${html}<script>setTimeout(()=>print(),500)<\/script></body></html>`); w.document.close(); return; } }
    const css = [...document.styleSheets].map(ss => { try { return [...ss.cssRules].map(r => r.cssText).join('\n'); } catch (e) { return ''; } }).join('\n');
    const pagina = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${UI.esc(titulo)}</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"><style>${css}</style><style>body{background:#fff;margin:0}.doc{border:0;max-width:none;padding:0;box-shadow:none}@page{margin:16mm}</style></head><body onload="setTimeout(function(){window.print()},400)"><div class="doc">${html}</div></body></html>`;
    UI.toast('Abra o arquivo baixado no navegador: a impressão / PDF abre sozinha.');
    api.baixar((titulo || 'documento').replace(/[^\wÀ-ú\- ]+/g, '').trim().slice(0, 70) + '.html', new Blob([pagina], { type: 'text/html' }));
  };

  /* depois do login: papel "Somente visualização" no app bloqueia edição mesmo para quem pode gravar no banco */
  api.aplicarPapel = function (u) {
    if (window.VTN_PASTA) api.dbEditor = !!u && u.papel === 'admin' && !VTN_PASTA.copia;   // modo consulta: tudo vira pedido   // pasta do OneDrive: o papel no app decide
    api.podeEditar = api.dbEditor && !!u && u.papel === 'admin';   // só Victor e Ismael alteram direto
    document.documentElement.classList.toggle('somente-leitura', !api.podeEditar);
  };
  /* grava só a lista de usuários (troca de senha), permitido a quem tem acesso de gravação no banco */
  api.salvarSenha = async function (u) {
    if (api.dbEditor) {
      const novos = blocos({ usuarios: Store.db.usuarios });
      for (const [id, d] of Object.entries(novos)) { if (id === '_meta') continue; ultimo[id] = d.json; ultDocs[id] = d; await db.collection(COL).doc(id).set(d); }
      mostrarSalvo(); return;
    }
    // Colaborador: grava só a própria senha (hash) em senhas/<sua conta>
    u = u || (window.Auth && Auth.current());
    if (!u || !meId) throw new Error('sem permissão');
    const d = { usId: u.id, nome: u.nome || '', salt: u.salt, senhaHash: u.senhaHash, em: new Date().toISOString() };
    await db.collection('senhas').doc(meId).set(d);
    senhasDocs = senhasDocs.filter(x => x.docId !== meId).concat([Object.assign({ docId: meId }, d)]);
  };
  /* envia já o que estiver pendente (usado antes de recarregar) */
  api.flush = async () => { clearTimeout(timer); if (api.podeEditar) await gravar(); };
  return api;
})();
