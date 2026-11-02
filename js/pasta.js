/* =========================================================
   VTN HUB – BANCO DE DADOS NA PASTA DO ONEDRIVE (sem servidor, sem IA)
   O app grava e lê arquivos .json numa pasta do computador que o
   OneDrive sincroniza entre todos (ex.: OneDrive\00_VTN\BANCO DE DADOS).
   Funciona no Edge e no Chrome (File System Access API).

   Este arquivo imita a interface que o app já usava (window.claude.use),
   então o resto do programa não precisa mudar:
     use('db')        → coleções/documentos = pastas/arquivos .json
     use('user')      → identificação deste computador
     use('assets')    → anexos na subpasta "arquivos"
     use('downloads') → download normal do navegador
   Mudanças feitas por outras pessoas chegam pelo OneDrive e o app
   percebe sozinho (verifica a pasta a cada 4 segundos).
   ========================================================= */
(() => {
  if (window.claude && window.claude.use) return;          // rodando dentro do Claude: não interfere
  const suportado = 'showDirectoryPicker' in window;
  const IDB = 'vtn_pasta', LSID = 'vtn_pasta_id';
  let raiz = null, prontoRes, nomePasta = '', modo = 'pasta', meuId = '';
  const LST = 'vtn_token';
  const APK = 'https://github.com/Victor-Bertoni/vtn-hub/releases/download/android/VTN-Hub.apk';
  let token = ''; try { token = localStorage.getItem(LST) || ''; } catch (e) {}
  let expirou = false;
  const api = async (rota, opc = {}) => {
    const r = await fetch('api/' + rota, Object.assign({ cache: 'no-store' }, opc, { headers: Object.assign({ 'X-VTN-Token': token }, opc.headers || {}) }));
    if (r.status === 401 && modo === 'http' && token && !expirou) { expirou = true; try { localStorage.removeItem(LST); localStorage.removeItem('vtn_session'); } catch (e) {} alert('Sua sessão no VTN Hub expirou. Entre de novo.'); location.reload(); }
    return r;
  };
  const pronto = new Promise(r => { prontoRes = r; });
  window.VTN_PASTA = { pronto, get nome() { return nomePasta; }, trocar: () => escolher(true), suportado, get servidor() { return modo === 'http'; },
    sair() { try { api('sair'); localStorage.removeItem(LST); } catch (e) {} },
    async abrir(caminho) {   // abre um arquivo da pasta (ex.: cub\tabela.pdf)
      await pronto;
      if (modo === 'http') { const r = await api('arquivo?caminho=' + encodeURIComponent(caminho)); if (r.ok) window.open(URL.createObjectURL(await r.blob()), '_blank'); return; }
      const s = String(caminho).split(/[\\/]/).filter(Boolean); let d = raiz;
      for (const x of s.slice(0, -1)) d = await d.getDirectoryHandle(x);
      const f = await (await d.getFileHandle(s[s.length - 1])).getFile(); window.open(URL.createObjectURL(f), '_blank');
    } };

  /* ---------- guarda o "atalho" da pasta no navegador ---------- */
  const idb = () => new Promise((ok, err) => { const r = indexedDB.open(IDB, 1); r.onupgradeneeded = () => r.result.createObjectStore('h'); r.onsuccess = () => ok(r.result); r.onerror = () => err(r.error); });
  async function guardar(h) { const d = await idb(); await new Promise(ok => { const t = d.transaction('h', 'readwrite'); t.objectStore('h').put(h, 'raiz'); t.oncomplete = ok; }); }
  async function lerGuardado() { try { const d = await idb(); return await new Promise(ok => { const t = d.transaction('h', 'readonly'); const r = t.objectStore('h').get('raiz'); r.onsuccess = () => ok(r.result || null); r.onerror = () => ok(null); }); } catch (e) { return null; } }

  /* ---------- tela de conexão ---------- */
  function tela(html) {
    let el = document.getElementById('pastaTela');
    if (!el) { el = document.createElement('div'); el.id = 'pastaTela'; el.style.cssText = 'position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:linear-gradient(135deg,#0b1530,#1d4ed8);font-family:Inter,system-ui,sans-serif;color:#0f172a;padding:16px'; document.body.appendChild(el); }
    el.innerHTML = `<div style="background:#fff;border-radius:16px;max-width:520px;width:100%;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.35)">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><div style="width:40px;height:40px;border-radius:10px;background:#2563eb;display:grid;place-items:center;color:#fff;font-weight:800">V</div><div><b style="font-size:18px">VTN Hub</b><div style="font-size:12px;color:#64748b">Gestão de obras e engenharia</div></div></div>${html}</div>`;
    return el;
  }
  const fechar = () => { const el = document.getElementById('pastaTela'); if (el) el.remove(); };
  async function escolher(trocar) {
    try {
      const h = await window.showDirectoryPicker({ id: 'vtn-banco', mode: 'readwrite' });
      // aceita a própria pasta "BANCO DE DADOS" ou uma pasta acima que a contenha
      let alvo = h; try { alvo = await h.getDirectoryHandle('BANCO DE DADOS'); } catch (e) {}
      await guardar(alvo); raiz = alvo; nomePasta = alvo.name; fechar();
      if (trocar) location.reload(); else prontoRes(raiz);
    } catch (e) { if (e && e.name !== 'AbortError') alert('Não foi possível abrir a pasta: ' + e.message); }
  }
  /* ---------- modo servidor (computador do Victor): login no servidor, sem escolher pasta ---------- */
  async function hash(txt) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  async function pedidoAnonimo(item) {
    const uid = 'anon_' + Math.random().toString(36).slice(2, 10), id = 'SOL-' + Date.now().toString(36).toUpperCase();
    const doc = Object.assign({ id, criadoEm: new Date().toISOString(), claudeId: uid, tela: 'login' }, item);
    await api('doc?p=pedidos&id=' + uid, { method: 'PUT', body: JSON.stringify({ autorNome: doc.autorNome, atualizadoEm: doc.criadoEm }) });
    const r = await api('doc?p=' + encodeURIComponent('pedidos/' + uid + '/itens') + '&id=' + id, { method: 'PUT', body: JSON.stringify(doc) });
    if (!r.ok) throw new Error('falhou');
  }
  function telaLogin(msg) {
    const el = tela(`<div id="lgBox"><h2 style="margin:6px 0">Entrar</h2>${msg ? `<p style="color:#b91c1c;font-size:13px">${msg}</p>` : ''}
      <form id="lgF" style="display:grid;gap:10px"><input id="lgE" type="email" placeholder="E-mail" required autocomplete="username" style="padding:11px;border:1px solid #cbd5e1;border-radius:10px;font-size:15px">
      <input id="lgS" type="password" placeholder="Senha" required autocomplete="current-password" style="padding:11px;border:1px solid #cbd5e1;border-radius:10px;font-size:15px">
      <button id="lgOk" type="submit" style="background:#2563eb;color:#fff;border:0;border-radius:10px;padding:12px;font-weight:700;cursor:pointer">Entrar</button></form>
      <div style="display:flex;justify-content:space-between;margin-top:12px;font-size:13px"><a href="#" id="lgCriar">Criar conta</a><a href="#" id="lgEsq">Esqueci a senha</a></div>${/Android/i.test(navigator.userAgent) && !window.VTNAndroid ? `<a href="${APK}" style="display:block;margin-top:14px;text-align:center;background:#0f172a;color:#fff;border-radius:10px;padding:10px;font-size:14px;text-decoration:none">📱 Baixar o app VTN Hub para Android</a>` : ''}</div>`);
    el.querySelector('#lgF').onsubmit = async e => {
      e.preventDefault(); const bt = el.querySelector('#lgOk'); bt.disabled = true; bt.textContent = 'Entrando…';
      try {
        const r = await fetch('api/login', { method: 'POST', body: JSON.stringify({ email: el.querySelector('#lgE').value, senha: el.querySelector('#lgS').value }) }); const j = await r.json();
        if (!j.ok) return telaLogin(j.erro || 'Não foi possível entrar.');
        token = j.token; meuId = j.id; try { localStorage.setItem(LST, token); localStorage.setItem('vtn_session', j.id); localStorage.setItem('vtn_srv_id', j.id); } catch (er) {}
        fechar(); modo = 'http'; nomePasta = 'servidor da VTN'; prontoRes(true);
      } catch (er) { telaLogin('O computador servidor da VTN não respondeu. Ele precisa estar ligado.'); }
    };
    el.querySelector('#lgCriar').onclick = e => { e.preventDefault(); const b = el.querySelector('#lgBox');
      b.innerHTML = `<h2 style="margin:6px 0">Criar conta</h2><p style="color:#64748b;font-size:13px">Victor ou Ismael aprovam o acesso.</p><form id="cf" style="display:grid;gap:8px">${['Nome completo|cn|text', 'E-mail|ce|email', 'Telefone|ct|tel', 'Senha (mínimo 8)|cs|password'].map(x => { const [l, i, t] = x.split('|'); return `<input id="${i}" type="${t}" placeholder="${l}" ${i !== 'ct' ? 'required' : ''} style="padding:10px;border:1px solid #cbd5e1;border-radius:10px">`; }).join('')}<button style="background:#2563eb;color:#fff;border:0;border-radius:10px;padding:11px;font-weight:700">Pedir acesso</button></form><a href="#" id="volta" style="font-size:13px">Voltar</a>`;
      b.querySelector('#volta').onclick = ev => { ev.preventDefault(); telaLogin(); };
      b.querySelector('#cf').onsubmit = async ev => { ev.preventDefault(); const v = id => b.querySelector('#' + id).value.trim(); if (v('cs').length < 8) return alert('A senha precisa ter pelo menos 8 caracteres.');
        const salt = [...crypto.getRandomValues(new Uint8Array(8))].map(x => x.toString(16).padStart(2, '0')).join('');
        const conta = { nome: v('cn'), email: v('ce').toLowerCase(), telefone: v('ct'), papel: 'leitor', ativo: false, status: 'pendente', salt, senhaHash: await hash(salt + ':' + v('cs')), trocarSenha: false, solicitadoEm: new Date().toISOString() };
        try { await pedidoAnonimo({ tipo: 'conta', autorNome: conta.nome, conta, resumo: ['Nova conta: ' + conta.nome + ' (' + conta.email + ')'] }); telaLogin('Pedido enviado. Assim que Victor ou Ismael aprovarem, entre com seu e-mail e senha.'); } catch (er) { alert('Não foi possível enviar agora.'); } };
    };
    el.querySelector('#lgEsq').onclick = async e => { e.preventDefault(); const em = (el.querySelector('#lgE').value || prompt('Seu e-mail:') || '').trim().toLowerCase(); if (!em) return;
      try { await pedidoAnonimo({ tipo: 'senha', autorNome: em, email: em, resumo: ['Pedido de nova senha: ' + em] }); telaLogin('Pedido enviado. Victor ou Ismael vão gerar uma senha temporária para você.'); } catch (er) { alert('Não foi possível enviar agora.'); } };
  }
  async function iniciar() {
    try {   // o app está sendo servido pelo servidor da VTN?
      const r = await fetch('api/info', { cache: 'no-store' });
      if (r.ok && (await r.json()).ok) {
        modo = 'http'; nomePasta = 'servidor da VTN';
        if (token && (await api('lista?p=sistema')).ok) { try { meuId = localStorage.getItem('vtn_srv_id') || meuId; } catch (e) {} prontoRes(true); return; }
        try { localStorage.removeItem('vtn_session'); } catch (e) {}
        telaLogin(); return;
      }
    } catch (e) {}
    if (window.VTNAndroid) {   // app do celular sem resposta do servidor
      const el = tela(`<h2 style="margin:6px 0">Sem conexão com o VTN Hub</h2><p style="color:#475569">O computador do Victor precisa estar ligado e com internet. Confira também a internet do celular.</p>
        <button id="pastaOk" style="background:#2563eb;color:#fff;border:0;border-radius:10px;padding:12px 18px;font-weight:700;width:100%">Tentar de novo</button>
        <button id="pastaOutra" style="background:none;border:0;color:#2563eb;margin-top:10px;width:100%">Trocar o endereço</button>`);
      el.querySelector('#pastaOk').onclick = () => location.reload();
      el.querySelector('#pastaOutra').onclick = () => window.VTNAndroid.trocarEndereco();
      return;
    }
    if (/[?&]teste=opfs/.test(location.search) && navigator.storage && navigator.storage.getDirectory) { raiz = await navigator.storage.getDirectory(); nomePasta = 'teste (navegador)'; prontoRes(raiz); return; }   // só para testes automáticos
    if (!suportado) { tela(`<h2 style="margin:6px 0">Use o Edge ou o Chrome no computador</h2><p style="color:#475569">O VTN Hub guarda os dados na pasta do OneDrive e precisa do Microsoft Edge ou do Google Chrome no Windows para acessá-la.</p>`); return; }
    const h = await lerGuardado();
    if (h) {
      let p = 'prompt'; try { p = await h.queryPermission({ mode: 'readwrite' }); } catch (e) {}
      if (p === 'granted') { raiz = h; nomePasta = h.name; prontoRes(raiz); return; }
      const el = tela(`<h2 style="margin:6px 0">Bem-vindo de volta</h2><p style="color:#475569">Clique para liberar o acesso à pasta <b>${h.name}</b> do OneDrive.</p>
        <button id="pastaOk" style="background:#2563eb;color:#fff;border:0;border-radius:10px;padding:12px 18px;font-weight:700;cursor:pointer;width:100%">Abrir o VTN Hub</button>
        <button id="pastaOutra" style="background:none;border:0;color:#2563eb;margin-top:10px;cursor:pointer;width:100%">Usar outra pasta</button>`);
      el.querySelector('#pastaOk').onclick = async () => { try { if ((await h.requestPermission({ mode: 'readwrite' })) === 'granted') { raiz = h; nomePasta = h.name; fechar(); prontoRes(raiz); } } catch (e) { escolher(); } };
      el.querySelector('#pastaOutra').onclick = () => escolher();
      return;
    }
    const el = tela(`<h2 style="margin:6px 0">Conecte a pasta do banco de dados</h2>
      <p style="color:#475569;font-size:14px">Os dados do VTN Hub ficam no OneDrive, na pasta <b>00_VTN › BANCO DE DADOS</b> (compartilhada pelo Victor). Isso é feito só uma vez neste computador.</p>
      <ol style="color:#475569;font-size:13px;padding-left:18px"><li>O OneDrive precisa estar instalado e a pasta compartilhada aparecendo no Explorador de Arquivos.</li><li>Clique no botão, escolha a pasta <b>BANCO DE DADOS</b> e confirme "Ver arquivos" / "Salvar alterações".</li></ol>
      <button id="pastaOk" style="background:#2563eb;color:#fff;border:0;border-radius:10px;padding:12px 18px;font-weight:700;cursor:pointer;width:100%">Escolher a pasta BANCO DE DADOS</button>`);
    el.querySelector('#pastaOk').onclick = () => escolher();
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', iniciar) : iniciar();

  /* ---------- arquivos ---------- */
  const seg = p => String(p).split('/').filter(Boolean);
  async function dir(path, criar) { let d = raiz; for (const s of seg(path)) d = await d.getDirectoryHandle(s, { create: !!criar }); return d; }
  const cache = {};   // modo servidor: guarda o último conteúdo de cada documento
  async function lerDoc(col, id) {
    if (modo === 'http') { const r = await api('doc?p=' + encodeURIComponent(col) + '&id=' + encodeURIComponent(id)); if (!r.ok) return null; const t = await r.text(); return { data: t ? JSON.parse(t) : null, mod: +(r.headers.get('X-Mod') || 0) || t.length }; }
    try { const f = await (await (await dir(col)).getFileHandle(id + '.json')).getFile(); const t = await f.text(); return { data: t ? JSON.parse(t) : null, mod: f.lastModified }; }
    catch (e) { return null; }
  }
  async function gravarDoc(col, id, data) {
    if (modo === 'http') { const r = await api('doc?p=' + encodeURIComponent(col) + '&id=' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(data) }); if (!r.ok) { const e = new Error('sem permissão'); e.code = r.status === 403 ? 'permission_denied' : 'erro'; throw e; } return; }
    const d = await dir(col, true); const fh = await d.getFileHandle(id + '.json', { create: true });
    const w = await fh.createWritable(); await w.write(JSON.stringify(data)); await w.close();
  }
  async function apagarDoc(col, id) { if (modo === 'http') { await api('doc?p=' + encodeURIComponent(col) + '&id=' + encodeURIComponent(id), { method: 'DELETE' }); return; } try { await (await dir(col)).removeEntry(id + '.json'); } catch (e) {} }
  async function listar(col, limite) {
    if (modo === 'http') {
      const r = await api('lista?p=' + encodeURIComponent(col)); if (!r.ok) return [];
      const itens = ((await r.json()).itens || []).slice(0, limite || 100000); const out = [];
      await Promise.all(itens.map(async it => { const k = col + '/' + it.id; if (!cache[k] || cache[k].mod !== it.mod) { const d = await lerDoc(col, it.id); if (d) cache[k] = { data: d.data, mod: it.mod }; } if (cache[k]) out.push({ id: it.id, data: cache[k].data, mod: it.mod }); }));
      return out;
    }
    const out = []; let d; try { d = await dir(col); } catch (e) { return out; }
    for await (const [nome, h] of d.entries()) {
      if (h.kind !== 'file' || !nome.endsWith('.json') || nome.startsWith('~') || nome.startsWith('.')) continue;
      try { const f = await h.getFile(); const t = await f.text(); out.push({ id: nome.slice(0, -5), data: t ? JSON.parse(t) : null, mod: f.lastModified }); } catch (e) {}
      if (limite && out.length >= limite) break;
    }
    return out;
  }
  const snapDoc = (id, x) => ({ id, exists: !!(x && x.data), data: () => x && x.data ? JSON.parse(JSON.stringify(x.data)) : undefined, metadata: { hasPendingWrites: false } });

  /* ---------- vigia (OneDrive trouxe mudança de outra pessoa) ---------- */
  const vigias = new Set();
  setInterval(() => { if ((raiz || modo === 'http') && !document.hidden) vigias.forEach(v => v().catch(() => {})); }, 4000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && raiz) vigias.forEach(v => v().catch(() => {})); });

  function colecao(col, limite) {
    return {
      limit(n) { return colecao(col, n); },
      async get() { await pronto; const L = await listar(col, limite); return { docs: L.map(x => snapDoc(x.id, x)), empty: !L.length, size: L.length }; },
      doc(id) { return documento(col, id); },
      onSnapshot(cb, erro) {
        let ant = null, parar = false;
        const ver = async () => {
          if (parar) return; await pronto;
          const L = await listar(col, limite); const atual = new Map(L.map(x => [x.id, x]));
          const mudancas = [];
          if (!ant) L.forEach(x => mudancas.push({ type: 'added', doc: snapDoc(x.id, x) }));
          else {
            atual.forEach((x, id) => { const a = ant.get(id); if (!a) mudancas.push({ type: 'added', doc: snapDoc(id, x) }); else if (a.mod !== x.mod) mudancas.push({ type: 'modified', doc: snapDoc(id, x) }); });
            ant.forEach((x, id) => { if (!atual.has(id)) mudancas.push({ type: 'removed', doc: snapDoc(id, null) }); });
          }
          const primeira = !ant; ant = atual;
          if (primeira || mudancas.length) cb({ docs: L.map(x => snapDoc(x.id, x)), docChanges: () => mudancas, metadata: { hasPendingWrites: false }, empty: !L.length, size: L.length });
        };
        vigias.add(ver); ver().catch(e => erro && erro(e));
        return () => { parar = true; vigias.delete(ver); };
      }
    };
  }
  function documento(col, id) {
    return {
      async get() { await pronto; return snapDoc(id, await lerDoc(col, id)); },
      async set(d) { await pronto; await gravarDoc(col, id, d); },
      async update(p) { await pronto; const a = (await lerDoc(col, id)) || { data: {} }; await gravarDoc(col, id, Object.assign({}, a.data, p)); },
      async delete() { await pronto; await apagarDoc(col, id); },
      collection(sub) { return colecao(col + '/' + id + '/' + sub); },
      onSnapshot(cb, erro) {
        let modAnt, parar = false;
        const ver = async () => { if (parar) return; await pronto; const x = await lerDoc(col, id); const m = x ? x.mod : 0; if (m !== modAnt) { modAnt = m; cb(snapDoc(id, x)); } };
        vigias.add(ver); ver().catch(e => erro && erro(e));
        return () => { parar = true; vigias.delete(ver); };
      }
    };
  }
  const db = { collection: p => { const s = seg(p); return s.length % 2 ? colecao(s.join('/')) : null; }, doc: p => { const s = seg(p); return documento(s.slice(0, -1).join('/'), s[s.length - 1]); } };

  /* ---------- quem está usando este computador ---------- */
  meuId = ''; try { meuId = localStorage.getItem(LSID) || ''; if (!meuId) { meuId = 'u_' + Math.random().toString(36).slice(2, 12); localStorage.setItem(LSID, meuId); } } catch (e) { meuId = 'u_local'; }
  const user = {
    async canEdit() { return true; },               // o papel no app (admin × leitor) decide o que cada um altera
    async id() { return meuId; },
    async me() { const u = window.Auth && Auth.current && Auth.current(); return { id: meuId, name: (u && u.nome) || '' }; },
    async profiles(ids) { const o = {}; for (const i of ids || []) { const p = await lerDoc('pedidos', i); o[i] = { name: (p && p.data && p.data.autorNome) || '' }; } return o; },
    isOwner: () => false
  };

  /* ---------- anexos na subpasta "arquivos" ---------- */
  const tipos = {};
  const assets = {
    async upload(blob) {
      await pronto; const id = 'A' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      if (modo === 'http') { const r = await api('arquivo?id=' + id, { method: 'PUT', body: blob }); if (!r.ok) throw new Error('envio'); await gravarDoc('arquivos/_tipos', id, { type: blob.type || 'application/octet-stream', size: blob.size }); return { id, url: '', sizeBytes: blob.size, contentType: blob.type }; }
      const d = await dir('arquivos', true); const fh = await d.getFileHandle(id, { create: true }); const w = await fh.createWritable(); await w.write(blob); await w.close();
      await gravarDoc('arquivos/_tipos', id, { type: blob.type || 'application/octet-stream', size: blob.size });
      return { id, url: '', sizeBytes: blob.size, contentType: blob.type };
    },
    async get(id) {
      await pronto; if (modo === 'http') { const t = ((await lerDoc('arquivos/_tipos', id)) || {}).data || {}; const r = await api('arquivo?id=' + id + (t.type ? '&tipo=' + encodeURIComponent(t.type) : '')); return r.ok ? r.blob() : null; }
      try { const f = await (await (await dir('arquivos')).getFileHandle(id)).getFile(); const t = tipos[id] || ((await lerDoc('arquivos/_tipos', id)) || {}).data || {}; return new Blob([await f.arrayBuffer()], { type: t.type || f.type || 'application/octet-stream' }); } catch (e) { return null; }
    },
    async url(id) { const b = await assets.get(id); return b ? URL.createObjectURL(b) : ''; },
    async delete(id) { if (modo === 'http') { await api('arquivo?id=' + id, { method: 'DELETE' }); return; } try { await (await dir('arquivos')).removeEntry(id); } catch (e) {} },
    async list() { return { assets: [], usage: {} }; }
  };

  /* ---------- downloads ---------- */
  const downloads = {
    async save({ filename, data }) {
      const blob = data instanceof Blob ? data : new Blob([data]);
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); return { status: 'saved' };
    }
  };

  const caps = { db, user, assets, downloads };
  window.claude = { use: async nome => { if (nome === 'db' || nome === 'assets') await pronto; return caps[nome] || null; } };
})();
