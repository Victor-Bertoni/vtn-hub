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
  let raiz = null, prontoRes, nomePasta = '';
  const pronto = new Promise(r => { prontoRes = r; });
  window.VTN_PASTA = { pronto, get nome() { return nomePasta; }, trocar: () => escolher(true), suportado,
    async abrir(caminho) {   // abre um arquivo da pasta (ex.: cub\tabela.pdf)
      await pronto; const s = String(caminho).split(/[\\/]/).filter(Boolean); let d = raiz;
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
  async function iniciar() {
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
  async function lerDoc(col, id) {
    try { const f = await (await (await dir(col)).getFileHandle(id + '.json')).getFile(); const t = await f.text(); return { data: t ? JSON.parse(t) : null, mod: f.lastModified }; }
    catch (e) { return null; }
  }
  async function gravarDoc(col, id, data) {
    const d = await dir(col, true); const fh = await d.getFileHandle(id + '.json', { create: true });
    const w = await fh.createWritable(); await w.write(JSON.stringify(data)); await w.close();
  }
  async function apagarDoc(col, id) { try { await (await dir(col)).removeEntry(id + '.json'); } catch (e) {} }
  async function listar(col, limite) {
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
  setInterval(() => { if (raiz && !document.hidden) vigias.forEach(v => v().catch(() => {})); }, 4000);
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
  let meuId = ''; try { meuId = localStorage.getItem(LSID) || ''; if (!meuId) { meuId = 'u_' + Math.random().toString(36).slice(2, 12); localStorage.setItem(LSID, meuId); } } catch (e) { meuId = 'u_local'; }
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
      const d = await dir('arquivos', true); const fh = await d.getFileHandle(id, { create: true }); const w = await fh.createWritable(); await w.write(blob); await w.close();
      await gravarDoc('arquivos/_tipos', id, { type: blob.type || 'application/octet-stream', size: blob.size });
      return { id, url: '', sizeBytes: blob.size, contentType: blob.type };
    },
    async get(id) {
      await pronto; try { const f = await (await (await dir('arquivos')).getFileHandle(id)).getFile(); const t = tipos[id] || ((await lerDoc('arquivos/_tipos', id)) || {}).data || {}; return new Blob([await f.arrayBuffer()], { type: t.type || f.type || 'application/octet-stream' }); } catch (e) { return null; }
    },
    async url(id) { const b = await assets.get(id); return b ? URL.createObjectURL(b) : ''; },
    async delete(id) { try { await (await dir('arquivos')).removeEntry(id); } catch (e) {} },
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
