/* =========================================================
   STORE — camada de dados.
   Hoje salva no navegador (localStorage) e os arquivos enviados
   no IndexedDB. Para usar um servidor no futuro, mantenha estes
   nomes de função e troque o corpo por fetch(CONFIG.API.baseUrl...).
   ========================================================= */
window.Store = (() => {
  const KEY = 'vtn_gestao_db_v4';   // v4 = fiscal, agenda, novos modelos
  const OLD_KEY = 'vtn_gestao_db_v3';
  let db = null;
  const listeners = [];

  function load() {
    try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; }
    // cópia do banco online baixada para a pasta (dados_vtn.js): usa quando for mais nova que a do navegador
    const B = window.VTN_BANCO_ONLINE;
    if (B && B.dados && B.dados.obras && (!db || !db._bancoOnlineEm || db._bancoOnlineEm < B.em)) { db = B.dados; db._bancoOnlineEm = B.em; try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }
    if (!db || !db.obras) { db = Seed.build(); save(); }
    return norm();
  }
  /** Usado pelo modo online: recebe o banco vindo da nuvem */
  function setDb(d) { db = d; return norm(); }
  function norm() {
    // garante coleções novas em versões futuras
    ['usuarios','pessoas','obras','etapas','medicoes','lancamentos','os','pendencias','entregas','revisoes','arquivos','eventos','grupos','mensagens','orcamentos','contratos','diario','catalogo','modelosContrato']
      .forEach(c => { if (!Array.isArray(db[c])) db[c] = []; });
    db.incidencias = db.incidencias || {};
    db.seq = db.seq || {};
    return db;
  }
  function save() {
    if (window.Cloud && Cloud.ativo) Cloud.agendar();
    else {
      try { localStorage.setItem(KEY, JSON.stringify(db)); }
      catch (e) { console.error(e); window.UI && UI.toast('Não foi possível salvar: armazenamento do navegador cheio.', 'err'); }
    }
    listeners.forEach(f => f());
  }
  const PREFIX = { usuarios:'US', pessoas:'PS', obras:'OB', etapas:'ET', medicoes:'MD', lancamentos:'FN', os:'OS', pendencias:'PD', entregas:'EN', revisoes:'RV', arquivos:'AR', eventos:'EV', grupos:'GR', mensagens:'MS', orcamentos:'ORC', contratos:'CT', diario:'DI', catalogo:'SV', insumos:'IN', composicoes:'CP' };
  function nextId(coll) {
    const p = PREFIX[coll] || 'ID';
    db.seq[p] = (db.seq[p] || 0) + 1;
    return p + '-' + String(db.seq[p]).padStart(4, '0');
  }
  const all = c => db[c];
  const get = (c, id) => db[c].find(x => x.id === id) || null;
  const where = (c, fn) => db[c].filter(fn);
  function insert(c, obj) {
    const o = Object.assign({ id: obj.id || nextId(c), criadoEm: new Date().toISOString() }, obj);
    db[c].push(o); save(); return o;
  }
  function update(c, id, patch) {
    const o = get(c, id); if (!o) return null;
    Object.assign(o, patch, { atualizadoEm: new Date().toISOString() }); save(); return o;
  }
  function remove(c, id) {
    const i = db[c].findIndex(x => x.id === id);
    if (i >= 0) { const [o] = db[c].splice(i, 1); if (c === 'arquivos' && o.temBlob) Files.del(id); save(); }
  }
  /** Busca uma entidade por ID em qualquer coleção (para links clicáveis) */
  function findAny(id) {
    for (const c of Object.keys(PREFIX)) { const o = db[c] && db[c].find(x => x.id === id); if (o) return { coll: c, item: o }; }
    return null;
  }

  /* -------- Arquivos binários (IndexedDB) -------- */
  const LocalFiles = (() => {
    let dbp = null;
    function open() {
      if (dbp) return dbp;
      dbp = new Promise((res, rej) => {
        const r = indexedDB.open('vtn_gestao_files', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('blobs');
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      });
      return dbp;
    }
    async function tx(mode, fn) {
      const d = await open();
      return new Promise((res, rej) => { const t = d.transaction('blobs', mode); const s = t.objectStore('blobs'); const r = fn(s); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); });
    }
    return {
      put: (id, blob) => tx('readwrite', s => s.put(blob, id)),
      get: (id) => tx('readonly', s => s.get(id)),
      del: (id) => tx('readwrite', s => s.delete(id)).catch(() => {})
    };
  })();
  /* No modo online os arquivos vão para a nuvem do app (Cloud.Files) */
  const Files = {
    put: (id, blob) => (window.Cloud && Cloud.ativo ? Cloud.Files.put(id, blob) : LocalFiles.put(id, blob)),
    get: (id) => (window.Cloud && Cloud.ativo ? Cloud.Files.get(id) : LocalFiles.get(id)),
    del: (id) => (window.Cloud && Cloud.ativo ? Cloud.Files.del(id) : LocalFiles.del(id))
  };

  /** Salva arquivos enviados e devolve os registros criados */
  async function uploadFiles(fileList, meta) {
    const out = [];
    for (const f of fileList) {
      const rec = insert('arquivos', Object.assign({ nome: f.name, tamanho: f.size, mime: f.type, data: new Date().toISOString().slice(0, 10), temBlob: true, origem: 'Enviado no app' }, meta));
      try { await Files.put(rec.id, f); } catch (e) { rec.temBlob = false; rec.origem = 'Falha ao gravar'; save(); }
      out.push(rec);
    }
    return out;
  }
  async function openFile(id) {
    const rec = get('arquivos', id);
    if (!rec) return;
    if (!rec.temBlob) { UI.toast('Este arquivo está no seu computador (estrutura importada). Envie-o aqui para abrir pelo app.'); return; }
    if (window.Cloud && Cloud.ativo) return Cloud.Files.abrir(id, rec);
    const blob = await Files.get(id);
    if (!blob) { UI.toast('Arquivo não encontrado neste navegador.', 'err'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.target = '_blank';
    if (!/^(image|application\/pdf|text|video)/.test(blob.type)) a.download = rec.nome;
    a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  /* -------- Backup -------- */
  function hasOld() { try { return !!localStorage.getItem(OLD_KEY); } catch (e) { return false; } }
  function restoreOld() { db = JSON.parse(localStorage.getItem(OLD_KEY)); save(); load(); }
  function exportJSON() { return JSON.stringify(db, null, 2); }
  function importJSON(txt) { const d = JSON.parse(txt); if (!d.obras) throw new Error('Arquivo inválido'); db = d; save(); load(); }
  function reset(empty) {
    if (empty) {
      const keep = { empresa: db.empresa, usuarios: db.usuarios, catalogo: db.catalogo, modelosContrato: db.modelosContrato, seq: { US: db.seq.US, SV: db.seq.SV } };
      db = Object.assign({ versao: 1, incidencias: {} }, keep);
      load(); save();
    } else { db = Seed.build(); save(); }
  }

  return { load, setDb, save, all, get, where, insert, update, remove, findAny, nextId, uploadFiles, openFile, Files, exportJSON, importJSON, reset, hasOld, restoreOld, on: f => listeners.push(f), get db() { return db; } };
})();
