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
  /* ---------- cópia de consulta (PC do Victor desligado) ----------
     O servidor publica no GitHub (ramo "consulta") o banco criptografado (AES + HMAC).
     A chave só abre com o e-mail e a senha de cada pessoa no VTN Hub (PBKDF2). */
  const COPIA_URL = 'https://raw.githubusercontent.com/Victor-Bertoni/vtn-hub/consulta/dados.json';
  const SAIDA = 'vtn_saida', COPIA_CACHE = 'vtn_copia_enc';
  let copia = null;   // { docs: { vtn: {id: data}, sistema: {...} }, geradoEm }
  const b64 = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));
  const junta = (a, b) => { const r = new Uint8Array(a.length + b.length); r.set(a); r.set(b, a.length); return r; };
  async function sha256hex(t) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map(x => x.toString(16).padStart(2, '0')).join(''); }
  async function derivar(senha, salt, iter) {
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, k, 512));
  }
  async function abrirCaixa(k64, c) {   // {iv, ct, mac} em base64; k64 = 32 bytes AES + 32 bytes HMAC
    const iv = b64(c.iv), ct = b64(c.ct);
    const hk = await crypto.subtle.importKey('raw', k64.slice(32), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    if (!(await crypto.subtle.verify('HMAC', hk, b64(c.mac), junta(iv, ct)))) throw new Error('senha');
    const ak = await crypto.subtle.importKey('raw', k64.slice(0, 32), 'AES-CBC', false, ['decrypt']);
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, ak, ct));
  }
  const DK_LS = 'vtn_copia_dk';
  async function baixarPacote() {
    let txt = '';
    try { const r = await fetch(COPIA_URL + '?t=' + Date.now(), { cache: 'no-store' }); if (r.ok) { txt = await r.text(); try { localStorage.setItem(COPIA_CACHE, txt); } catch (e) {} } } catch (e) {}
    if (!txt) { try { txt = localStorage.getItem(COPIA_CACHE) || ''; } catch (e) {} }   // sem internet: última cópia guardada neste aparelho
    if (!txt) throw new Error('sem copia');
    return JSON.parse(txt);
  }
  async function decifrarPacote(pac, dk) {
    let bruto = await abrirCaixa(dk, pac.dados);
    bruto = new Uint8Array(await new Response(new Blob([bruto]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    return { docs: JSON.parse(new TextDecoder().decode(bruto)), geradoEm: pac.geradoEm, dk };
  }
  async function abrirCopia(email, senha) {
    const pac = await baixarPacote();
    const ch = pac.chaves[await sha256hex('vtn:' + email.trim().toLowerCase())];
    if (!ch) throw new Error('sem chave');
    const dk = await abrirCaixa(await derivar(senha, b64(ch.salt), pac.iter), ch);
    return decifrarPacote(pac, dk);
  }
  // abre de novo sem pedir senha (chave lembrada neste aparelho; "Sair" apaga)
  async function abrirCopiaLembrada() {
    let dkTxt = '', uid = ''; try { dkTxt = localStorage.getItem(DK_LS) || ''; uid = localStorage.getItem('vtn_srv_id') || ''; } catch (e) {}
    if (!dkTxt || !uid) return false;
    try { copia = await decifrarPacote(await baixarPacote(), b64(dkTxt)); } catch (e) { try { localStorage.removeItem(DK_LS); } catch (x) {} return false; }
    meuId = uid; try { localStorage.setItem('vtn_session', uid); } catch (e) {}
    entrarCopia(); return true;
  }
  function entrarCopia() {
    modo = 'copia'; nomePasta = 'cópia de consulta'; fechar(); faixaCopia(); prontoRes(true);
    setInterval(async () => {   // busca a cópia nova sozinho a cada 2 min
      if (document.hidden || !copia) return;
      try { const pac = await baixarPacote(); if (pac.geradoEm !== copia.geradoEm) { copia = await decifrarPacote(pac, copia.dk); const q = document.querySelector('#faixaCopia b'); if (q) q.textContent = new Date(copia.geradoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); } } catch (e) {}
    }, 120000);
  }
  const saida = () => { try { return JSON.parse(localStorage.getItem(SAIDA) || '[]'); } catch (e) { return []; } };
  async function enviarSaida() {   // pedidos feitos com o PC desligado: entram quando o servidor volta
    const L = saida(); if (!L.length) return; const resto = [];
    for (const x of L) { try { const r = await api('doc?p=' + encodeURIComponent(x.col) + '&id=' + encodeURIComponent(x.id), { method: 'PUT', body: JSON.stringify(x.data) }); if (!r.ok) resto.push(x); } catch (e) { resto.push(x); } }
    try { localStorage.setItem(SAIDA, JSON.stringify(resto)); } catch (e) {}
    const n = L.length - resto.length; if (n) setTimeout(() => { try { UI.toast(n + ' pedido(s) feitos com o computador desligado foram enviados aos administradores'); } catch (e) {} }, 4000);
  }
  function faixaCopia() {
    const quando = () => copia && copia.geradoEm ? new Date(copia.geradoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '?';
    const f = document.createElement('div'); f.id = 'faixaCopia';
    f.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9998;background:#f59e0b;color:#1c1917;font:600 12px/1.35 Inter,system-ui,sans-serif;padding:6px 12px;text-align:center';
    const pintar = () => { const st = situacaoServidor(); f.style.background = st.cor; f.innerHTML = `<b>Modo consulta</b> (dados de <b>${quando()}</b>). ${st.txt} Alterações viram pedidos e são enviadas quando o servidor voltar. <a href="#" id="fcTenta" style="color:#1c1917">Tentar agora</a>`; f.querySelector('#fcTenta').onclick = e => { e.preventDefault(); tentar(true); }; document.body.style.paddingTop = f.offsetHeight + 'px'; };
    document.body.appendChild(f); pintar();
    let tentando = false;
    async function tentar(forcar) {   // servidor voltou? entra sozinho
      if (tentando) return; tentando = true;
      try {
        if ((await acharServidor(forcar)) !== null) {
          if (!document.querySelector('.modal-bg')) { location.reload(); return; }
          f.style.background = '#22c55e'; f.innerHTML = `O servidor${infoSrv && infoSrv.pc ? ' <b>' + infoSrv.pc + '</b>' : ''} voltou. <a href="#" style="color:#052e16" onclick="location.reload();return false">Toque para atualizar</a>`; return;
        }
        pintar();
      } catch (e) {} finally { tentando = false; }
    }
    setInterval(() => { if (!document.hidden) tentar(false); }, 20000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tentar(true); });
  }
  function telaCopia(msg) {
    const el = tela(`<h2 style="margin:6px 0">Modo consulta</h2><p style="color:#475569;font-size:14px">${situacaoServidor().txt}</p><p style="color:#475569;font-size:14px">Entre com seu e-mail e senha do VTN Hub para ver a última cópia dos dados. Quando o servidor voltar, o app sai da cópia sozinho.</p>${msg ? `<p style="color:#b91c1c;font-size:13px">${msg}</p>` : ''}
      <form id="cpF" style="display:grid;gap:10px"><input id="cpE" type="email" placeholder="E-mail" required autocomplete="username" style="padding:11px;border:1px solid #cbd5e1;border-radius:10px;font-size:15px">
      <input id="cpS" type="password" placeholder="Senha" required autocomplete="current-password" style="padding:11px;border:1px solid #cbd5e1;border-radius:10px;font-size:15px">
      <button id="cpOk" type="submit" style="background:#2563eb;color:#fff;border:0;border-radius:10px;padding:12px;font-weight:700;cursor:pointer">Abrir cópia</button></form>
      <div style="display:flex;justify-content:space-between;gap:10px;margin-top:12px;font-size:13px"><a href="#" id="cpTenta">Tentar conectar de novo</a>${window.VTNAndroid ? '<a href="#" id="cpEnd">Trocar o endereço</a>' : (suportado && /github\.io$/.test(location.hostname) ? '<a href="#" id="cpPasta">Usar a pasta do OneDrive</a>' : '')}</div>`);
    el.querySelector('#cpTenta').onclick = e => { e.preventDefault(); location.reload(); };
    const ce = el.querySelector('#cpEnd'); if (ce) ce.onclick = e => { e.preventDefault(); window.VTNAndroid.trocarEndereco(); };
    const cp = el.querySelector('#cpPasta'); if (cp) cp.onclick = e => { e.preventDefault(); modoPasta(); };
    el.querySelector('#cpF').onsubmit = async e => {
      e.preventDefault(); const bt = el.querySelector('#cpOk'); bt.disabled = true; bt.textContent = 'Abrindo…';
      const email = el.querySelector('#cpE').value, senha = el.querySelector('#cpS').value;
      try { copia = await abrirCopia(email, senha); }
      catch (er) { return telaCopia(er.message === 'sem copia' ? 'Ainda não há cópia publicada (ou sem internet).' : er.message === 'sem chave' ? 'Este e-mail ainda não tem cópia: entre uma vez no VTN Hub com o computador do Victor ligado.' : 'E-mail ou senha inválidos.'); }
      const us = Object.keys(copia.docs.vtn || {}).filter(k => k.startsWith('usuarios__')).flatMap(k => { try { return JSON.parse(copia.docs.vtn[k].json); } catch (x) { return []; } });
      const u = us.find(x => (x.email || '').toLowerCase() === email.trim().toLowerCase());
      if (!u) return telaCopia('Conta não encontrada na cópia.');
      meuId = u.id; try { localStorage.setItem('vtn_session', u.id); localStorage.setItem('vtn_srv_id', u.id); localStorage.setItem(DK_LS, btoa(String.fromCharCode(...copia.dk))); } catch (er) {}
      entrarCopia();
    };
  }
  /* ---------- onde está o servidor? ----------
     1) o próprio endereço (app aberto pelo PC: localhost)  2) o endereço do túnel publicado no GitHub
     (o PC abre um túnel da Cloudflare e publica o endereço atual; o site e o APK acham sozinhos) */
  let BASE = '';
  const ENDERECO_API = 'https://api.github.com/repos/Victor-Bertoni/vtn-hub/contents/endereco.json?ref=consulta';
  const ENDERECO_RAW = 'https://raw.githubusercontent.com/Victor-Bertoni/vtn-hub/consulta/endereco.json';
  let infoSrv = null;    // /api/info do servidor em uso { pc, versao, desde, ativo }
  let infoEnd = null;    // endereco.json publicado { url, vivoEm, pc, versao, onedrive, tomada }
  let endLidoEm = 0, endPelaApi = false;
  async function testarServidor(u) {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 8000);
    try { const r = await fetch(u + 'api/info', { cache: 'no-store', signal: c.signal }); if (!r.ok) return false; const j = await r.json(); if (!j.ok || j.ativo === false) return false; infoSrv = j; return true; } catch (e) { return false; } finally { clearTimeout(t); }
  }
  // lê o endereço publicado (alterna a API do GitHub e o raw para não estourar o limite de consultas)
  async function enderecoPublicado(forcar) {
    if (!forcar && infoEnd && Date.now() - endLidoEm < 55000) return infoEnd.url || '';
    const ordem = endPelaApi ? ['raw', 'api'] : ['api', 'raw']; endPelaApi = !endPelaApi;
    for (const via of ordem) {
      try {
        const r = via === 'api' ? await fetch(ENDERECO_API, { cache: 'no-store', headers: { Accept: 'application/vnd.github.raw+json' } }) : await fetch(ENDERECO_RAW + '?t=' + Date.now(), { cache: 'no-store' });
        if (r.ok) { infoEnd = await r.json(); endLidoEm = Date.now(); return infoEnd.url || ''; }
      } catch (e) {}
    }
    return infoEnd ? (infoEnd.url || '') : '';
  }
  async function acharServidor(forcar) {
    if (await testarServidor('')) return '';
    let ult = ''; try { ult = localStorage.getItem('vtn_srv_url') || ''; } catch (e) {}
    if (ult && await testarServidor(ult)) return ult;
    const pub = await enderecoPublicado(forcar);
    if (pub && pub !== ult && await testarServidor(pub)) { try { localStorage.setItem('vtn_srv_url', pub); } catch (e) {} return pub; }
    return null;
  }
  // texto para a equipe: o servidor está ligado? qual computador? desde quando?
  const haQuanto = iso => { const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); if (!(m >= 0)) return ''; if (m < 1) return 'agora há pouco'; if (m < 60) return 'há ' + m + ' min'; const h = Math.round(m / 60); if (h < 48) return 'há ' + h + ' h'; return 'há ' + Math.round(h / 24) + ' dias'; };
  function situacaoServidor() {
    const e = infoEnd; if (!e) return { cor: '#f59e0b', txt: 'Não consegui consultar onde está o servidor (sem internet?).' };
    const pc = e.pc ? `o servidor <b>${e.pc}</b>` : 'o servidor';
    const sinal = e.vivoEm || e.em; const min = sinal ? (Date.now() - new Date(sinal).getTime()) / 60000 : 1e9;
    if (!e.url) return { cor: '#f59e0b', txt: `Nenhum computador está servindo agora (último sinal de ${pc} ${haQuanto(sinal) || '?'}).` };
    if (min >= 6) return { cor: '#f59e0b', txt: `${pc[0].toUpperCase() + pc.slice(1)} deu o último sinal ${haQuanto(sinal)}: está desligado, dormindo (tampa fechada / suspensão) ou sem internet. Se houver servidor reserva, ele assume sozinho em poucos minutos.` };
    return { cor: '#fbbf24', txt: `${pc[0].toUpperCase() + pc.slice(1)} está ligado (sinal ${haQuanto(sinal)}), mas ainda não respondeu a este aparelho. Tentando de novo a cada 20 s…` };
  }
  let token = ''; try { token = localStorage.getItem(LST) || ''; } catch (e) {}
  let expirou = false;
  // servidor caiu ou virou reserva no meio do uso: procura o servidor ativo (outro computador) e continua
  let trocando = null, faixaQueda = null;
  function avisoQueda(txt, cor) {
    if (!txt) { if (faixaQueda) { faixaQueda.remove(); faixaQueda = null; document.body.style.paddingTop = ''; } return; }
    if (!faixaQueda) { faixaQueda = document.createElement('div'); faixaQueda.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9998;color:#1c1917;font:600 12px/1.35 Inter,system-ui,sans-serif;padding:6px 12px;text-align:center'; document.body.appendChild(faixaQueda); }
    faixaQueda.style.background = cor || '#fbbf24'; faixaQueda.innerHTML = txt; document.body.style.paddingTop = faixaQueda.offsetHeight + 'px';
  }
  function reconectar() {
    if (trocando) return trocando;
    trocando = (async () => {
      const ini = Date.now();
      avisoQueda('O servidor parou de responder. Procurando o servidor ativo…');
      while (true) {
        const achado = await acharServidor(true);
        if (achado !== null) {
          const mudou = achado !== BASE; BASE = achado; avisoQueda('');
          try { if (mudou && window.UI) UI.toast('Conectado ao servidor ' + ((infoSrv && infoSrv.pc) || '')); } catch (e) {}
          return true;
        }
        const st = situacaoServidor();
        avisoQueda(st.txt + (Date.now() - ini > 90000 ? ' <a href="#" onclick="location.reload();return false" style="color:#1c1917">Abrir a cópia de consulta</a>' : ''), st.cor);
        await new Promise(r => setTimeout(r, 20000));
      }
    })().finally(() => { trocando = null; });
    return trocando;
  }
  const api = async (rota, opc = {}, repetida) => {
    let r;
    try { r = await fetch(BASE + 'api/' + rota, Object.assign({ cache: 'no-store' }, opc, { headers: Object.assign({ 'X-VTN-Token': token }, opc.headers || {}) })); }
    catch (e) { if (modo === 'http' && !repetida) { await reconectar(); return api(rota, opc, true); } throw e; }
    if (r.status === 503 && modo === 'http' && !repetida) { let j = {}; try { j = await r.clone().json(); } catch (e) {} if (j.erro === 'reserva') { await reconectar(); return api(rota, opc, true); } }
    if (r.status === 401 && modo === 'http' && token && !expirou) { expirou = true; try { localStorage.removeItem(LST); localStorage.removeItem('vtn_session'); } catch (e) {} alert('Sua sessão no VTN Hub expirou. Entre de novo.'); location.reload(); }
    return r;
  };
  const pronto = new Promise(r => { prontoRes = r; });
  window.VTN_PASTA = { pronto, get nome() { return nomePasta; }, get base() { return BASE; }, get infoServidor() { return infoSrv; }, get endereco() { return infoEnd; }, situacao: situacaoServidor, haQuanto, async lerEndereco() { await enderecoPublicado(true); return infoEnd; },
    async put(rota, obj) { const r = await api(rota, { method: 'PUT', body: JSON.stringify(obj) }); let j = {}; try { j = await r.json(); } catch (e) {} if (!r.ok || !j.ok) throw new Error(j.erro || ('HTTP ' + r.status)); return j; },
    async bin(rota) { const r = await api(rota); if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); },
    async get(rota) { const r = await api(rota); let j = {}; try { j = await r.json(); } catch (e) {} if (!r.ok) throw new Error(j.erro || ('HTTP ' + r.status)); return j; }, trocar: () => escolher(true), suportado, get servidor() { return modo === 'http'; }, get copia() { return modo === 'copia'; },
    async enviarArquivo(rota, blob) { const r = await api(rota, { method: 'PUT', body: blob }); let j = {}; try { j = await r.json(); } catch (e) {} if (!r.ok || !j.ok) throw new Error(j.erro || ('HTTP ' + r.status)); return j; },
    async enviar(rota, dados) { const r = await api(rota, { method: 'POST', body: JSON.stringify(dados) }); let j = {}; try { j = await r.json(); } catch (e) {} if (!r.ok || !j.ok) throw new Error(j.erro || ('HTTP ' + r.status)); return j; },
    sair() { try { if (modo === 'http') api('sair'); localStorage.removeItem(LST); localStorage.removeItem(DK_LS); } catch (e) {} },
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
        const r = await fetch(BASE + 'api/login', { method: 'POST', body: JSON.stringify({ email: el.querySelector('#lgE').value, senha: el.querySelector('#lgS').value }) }); const j = await r.json();
        if (!j.ok) return telaLogin(j.erro || 'Não foi possível entrar.');
        token = j.token; meuId = j.id; try { localStorage.setItem(LST, token); localStorage.setItem('vtn_session', j.id); localStorage.setItem('vtn_srv_id', j.id); } catch (er) {}
        fechar(); modo = 'http'; nomePasta = 'servidor da VTN'; prontoRes(true); enviarSaida();
        // já guarda a chave da cópia de consulta neste aparelho (para abrir direto se o servidor cair depois)
        { const em = el.querySelector('#lgE').value, se = el.querySelector('#lgS').value; setTimeout(async () => { try { const c = await abrirCopia(em, se); localStorage.setItem(DK_LS, btoa(String.fromCharCode(...c.dk))); } catch (er) {} }, 1500); }
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
      // administrador: link de nova senha por e-mail (não depende de outro administrador)
      try { const r = await fetch(BASE + 'api/esqueci', { method: 'POST', body: JSON.stringify({ email: em }) }); const j = await r.json(); if (j.modo === 'email') return telaLogin('Enviamos um link para o seu e-mail para criar a nova senha (vale 30 minutos). Confira também a caixa de spam.'); if (j.ok === false) return telaLogin(j.erro || 'Não foi possível enviar o e-mail agora.'); } catch (er) {}
      try { await pedidoAnonimo({ tipo: 'senha', autorNome: em, email: em, resumo: ['Pedido de nova senha: ' + em] }); telaLogin('Pedido enviado. Victor ou Ismael vão gerar uma senha temporária para você.'); } catch (er) { alert('Não foi possível enviar agora.'); } };
  }
  /* link do e-mail "Esqueci a senha" (administradores) */
  function telaNovaSenha(tok, msg) {
    const el = tela(`<h2 style="margin:6px 0">Criar nova senha</h2>${msg ? `<p style="color:#b91c1c;font-size:13px">${msg}</p>` : ''}
      <form id="nsF" style="display:grid;gap:10px"><input id="ns1" type="password" placeholder="Nova senha (mínimo 8)" required autocomplete="new-password" style="padding:11px;border:1px solid #cbd5e1;border-radius:10px;font-size:15px">
      <input id="ns2" type="password" placeholder="Repita a nova senha" required autocomplete="new-password" style="padding:11px;border:1px solid #cbd5e1;border-radius:10px;font-size:15px">
      <button id="nsOk" type="submit" style="background:#2563eb;color:#fff;border:0;border-radius:10px;padding:12px;font-weight:700;cursor:pointer">Salvar nova senha</button></form>`);
    el.querySelector('#nsF').onsubmit = async e => {
      e.preventDefault(); const a = el.querySelector('#ns1').value, b = el.querySelector('#ns2').value;
      if (a !== b) return telaNovaSenha(tok, 'As senhas não conferem.'); if (a.length < 8) return telaNovaSenha(tok, 'A senha precisa ter pelo menos 8 caracteres.');
      try { const r = await fetch(BASE + 'api/redefinir', { method: 'POST', body: JSON.stringify({ token: tok, senha: a }) }); const j = await r.json(); if (!j.ok) return telaNovaSenha(tok, j.erro || 'Não foi possível salvar.'); }
      catch (er) { return telaNovaSenha(tok, 'O computador servidor da VTN não respondeu.'); }
      history.replaceState(null, '', location.pathname + location.hash); token = ''; try { localStorage.removeItem(LST); localStorage.removeItem(DK_LS); } catch (er) {}
      telaLogin('Senha nova salva. Entre com ela.');
    };
  }
  async function iniciar() {
    try {   // acha o servidor da VTN (no próprio PC ou pelo túnel publicado no GitHub)
      const achado = await acharServidor();
      if (achado !== null) {
        BASE = achado; modo = 'http'; nomePasta = 'servidor da VTN';
        const tokRedef = new URLSearchParams(location.search).get('redefinir');
        if (tokRedef) { telaNovaSenha(tokRedef); return; }
        if (token && (await api('lista?p=sistema')).ok) { try { meuId = localStorage.getItem('vtn_srv_id') || meuId; } catch (e) {} prontoRes(true); enviarSaida(); return; }
        try { localStorage.removeItem('vtn_session'); } catch (e) {}
        telaLogin(); return;
      }
    } catch (e) {}
    if (/[?&]teste=opfs/.test(location.search) && navigator.storage && navigator.storage.getDirectory) { raiz = await navigator.storage.getDirectory(); nomePasta = 'teste (navegador)'; prontoRes(raiz); return; }   // só para testes automáticos
    if (await abrirCopiaLembrada()) return;
    telaCopia();
    const vigia = setInterval(async () => { if (modo !== 'pasta') { clearInterval(vigia); return; } if (document.hidden) return; if ((await acharServidor(false)) !== null && modo === 'pasta') location.reload(); }, 20000);   // sem servidor: cópia de consulta (a pasta do OneDrive fica como opção no site do GitHub)
  }
  async function modoPasta() {
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
    if (modo === 'copia') { const d = ((copia.docs || {})[col] || {})[id] || (saida().find(x => x.col === col && x.id === id) || {}).data; return d ? { data: d, mod: Date.parse(copia.geradoEm) || 1 } : null; }
    if (modo === 'http') { const r = await api('doc?p=' + encodeURIComponent(col) + '&id=' + encodeURIComponent(id)); if (!r.ok) return null; const t = await r.text(); return { data: t ? JSON.parse(t) : null, mod: +(r.headers.get('X-Mod') || 0) || t.length }; }
    try { const f = await (await (await dir(col)).getFileHandle(id + '.json')).getFile(); const t = await f.text(); return { data: t ? JSON.parse(t) : null, mod: f.lastModified }; }
    catch (e) { return null; }
  }
  async function gravarDoc(col, id, data) {
    if (modo === 'copia') { if (!/^pedidos(\/|$)/.test(col)) { const e = new Error('modo consulta'); e.code = 'permission_denied'; throw e; } const L = saida().filter(x => !(x.col === col && x.id === id)); L.push({ col, id, data }); try { localStorage.setItem(SAIDA, JSON.stringify(L)); } catch (e) {} return; }
    if (modo === 'http') { const r = await api('doc?p=' + encodeURIComponent(col) + '&id=' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(data) }); if (!r.ok) { const e = new Error('sem permissão'); e.code = r.status === 403 ? 'permission_denied' : 'erro'; throw e; } return; }
    const d = await dir(col, true); const fh = await d.getFileHandle(id + '.json', { create: true });
    const w = await fh.createWritable(); await w.write(JSON.stringify(data)); await w.close();
  }
  async function apagarDoc(col, id) { if (modo === 'copia') return; if (modo === 'http') { await api('doc?p=' + encodeURIComponent(col) + '&id=' + encodeURIComponent(id), { method: 'DELETE' }); return; } try { await (await dir(col)).removeEntry(id + '.json'); } catch (e) {} }
  async function listar(col, limite) {
    if (modo === 'copia') { const o = Object.assign({}, (copia.docs || {})[col] || {}); saida().filter(x => x.col === col).forEach(x => { o[x.id] = x.data; }); return Object.entries(o).slice(0, limite || 100000).map(([id, data]) => ({ id, data, mod: Date.parse(copia.geradoEm) || 1 })); }
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
  setInterval(() => { if ((raiz || modo === 'http' || modo === 'copia') && !document.hidden) vigias.forEach(v => v().catch(() => {})); }, 4000);
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
      await pronto; if (modo === 'copia') throw new Error('Anexos só com o computador do Victor ligado.'); const id = 'A' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      if (modo === 'http') { const r = await api('arquivo?id=' + id, { method: 'PUT', body: blob }); if (!r.ok) throw new Error('envio'); await gravarDoc('arquivos/_tipos', id, { type: blob.type || 'application/octet-stream', size: blob.size }); return { id, url: '', sizeBytes: blob.size, contentType: blob.type }; }
      const d = await dir('arquivos', true); const fh = await d.getFileHandle(id, { create: true }); const w = await fh.createWritable(); await w.write(blob); await w.close();
      await gravarDoc('arquivos/_tipos', id, { type: blob.type || 'application/octet-stream', size: blob.size });
      return { id, url: '', sizeBytes: blob.size, contentType: blob.type };
    },
    async get(id) {
      await pronto; if (modo === 'copia') return null; if (modo === 'http') { const t = ((await lerDoc('arquivos/_tipos', id)) || {}).data || {}; const r = await api('arquivo?id=' + id + (t.type ? '&tipo=' + encodeURIComponent(t.type) : '')); return r.ok ? r.blob() : null; }
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
