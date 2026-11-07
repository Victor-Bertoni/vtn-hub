/* =========================================================
   PENDÊNCIAS COM COMPROVAÇÃO
   Cada pendência guarda um histórico de andamento (evidencias): situação (Sanado,
   Em andamento, Não sanado), texto e documentos (nota fiscal, foto, laudo, e-mail,
   PDF…) para justificar. Registrar "Sanado" resolve a pendência; "Em andamento"
   muda o status; "Não sanado" reabre. Os arquivos vão para a pasta PENDENCIAS da obra.
   ========================================================= */
(() => {
  const SIT = [['Sanado', 'ok', 'check-circle-2'], ['Em andamento', 'warn', 'loader'], ['Não sanado', 'err', 'x-circle']];
  const evid = p => p.evidencias || [];
  window.PendEvid = {
    selo(p) {
      const E = evid(p); const n = E.reduce((a, e) => a + (e.arquivoIds || []).length, 0);
      if (!E.length) return p.status === 'Resolvida' ? UI.badge('sem comprovação', 'warn') : '<span class="tiny muted">—</span>';
      const u = E[E.length - 1]; const s = SIT.find(x => x[0] === u.situacao) || SIT[1];
      return `${UI.badge(u.situacao, s[1])}${n ? ` <span class="tiny" title="${n} documento(s)">📎${n}</span>` : ''}`;
    }
  };
  Views.pendencias.editPend = function (id, preset = {}) {
    const { esc, icon, date } = UI;
    let p = id ? JSON.parse(JSON.stringify(Store.get('pendencias', id))) : Object.assign({ status: 'Aberta', prioridade: 'Média' }, preset);
    const list = [{ k: 'titulo', l: 'Pendência', req: 1, full: 1 }, { k: 'obraId', l: 'Obra', t: 'select', o: () => Store.all('obras').map(o => [o.id, o.id + ' · ' + o.nome]) },
      { k: 'responsavelId', l: 'Responsável', t: 'select', o: () => Store.all('pessoas').map(x => [x.id, x.nome]) },
      { k: 'prioridade', l: 'Prioridade', t: 'select', o: LISTAS.prioridade }, { k: 'status', l: 'Status', t: 'select', o: LISTAS.statusPend },
      { k: 'prazo', l: 'Prazo', t: 'date' }, { k: 'descricao', l: 'Detalhes', t: 'textarea', full: 1 }];
    const hist = () => evid(p).length ? `<div class="timeline">${evid(p).slice().reverse().map(e => { const s = SIT.find(x => x[0] === e.situacao) || SIT[1]; return `<div class="tl"><div class="d">${date(e.data)} · ${UI.badge(e.situacao, s[1])} · ${esc(e.por || '')}</div><div>${esc(e.texto || '')}</div>${(e.arquivoIds || []).map(a => { const r = Store.get('arquivos', a) || {}; return `<button class="btn sm ghost" data-ab="${a}">${icon(/\.(png|jpe?g|webp|heic)$/i.test(r.nome || '') ? 'image' : 'paperclip')} ${esc(r.nome || a)}</button>`; }).join('')}</div>`; }).join('')}</div>` : '<p class="tiny muted">Nenhum andamento registrado ainda.</p>';
    const m = UI.modal({ title: id ? 'Pendência ' + id : 'Nova pendência', wide: true, body: `<div id="peF">${UI.fields(list, p)}</div>
      <h3 class="mt">${icon('file-check')} Andamento e comprovação</h3>
      <div class="card"><div class="card-b"><div class="grid g3"><div class="field"><label>Situação</label><select class="select" id="peSit">${SIT.map(x => `<option>${x[0]}</option>`).join('')}</select></div><div class="field"><label>Data</label><input type="date" class="input" id="peDt" value="${UI.today()}"></div>
        <div class="field"><label>Documentos (NF, fotos, laudo, PDF…)</label><input type="file" class="input" id="peArq" multiple></div></div>
        <div class="field"><label>O que foi feito / justificativa</label><textarea class="input" id="peTx" rows="2" placeholder="Ex.: material trocado pelo fornecedor, NF 1234 anexada"></textarea></div>
        <div class="row" style="justify-content:space-between"><span class="tiny muted">"Sanado" resolve a pendência · "Em andamento" muda o status · "Não sanado" reabre.</span><button class="btn" id="peAdd">${icon('plus')} Registrar andamento</button></div>
        <div class="mt" style="border:2px dashed var(--line);border-radius:12px;padding:10px;text-align:center" id="peDrop" class="tiny muted">${icon('upload')} Ou arraste os arquivos aqui</div></div></div>
      <div id="peH" class="mt">${hist()}</div>`,
      footer: `${id ? `<button class="btn danger" id="peDel" style="margin-right:auto">${icon('trash-2')} Excluir</button>` : ''}<button class="btn" data-close>Cancelar</button><button class="btn primary" id="peOk">${icon('save')} Salvar</button>` });
    let soltos = [];
    const dz = m.$('#peDrop'); dz.ondragover = e => { e.preventDefault(); dz.style.borderColor = 'var(--brand)'; }; dz.ondragleave = () => dz.style.borderColor = '';
    dz.ondrop = e => { e.preventDefault(); dz.style.borderColor = ''; soltos = soltos.concat([...e.dataTransfer.files]); dz.innerHTML = soltos.map(f => esc(f.name)).join(' · '); };
    const ligar = () => m.el.querySelectorAll('[data-ab]').forEach(b => b.onclick = () => Store.openFile(b.dataset.ab));
    ligar();
    const garantir = () => {   // pendência nova precisa existir antes de anexar
      const d = UI.read(m.$('#peF'), list); if (!d.titulo) { UI.toast('Preencha o nome da pendência', 'err'); return null; }
      Object.assign(p, d); if (!id) { const r = Store.insert('pendencias', p); id = r.id; p = JSON.parse(JSON.stringify(r)); } else Store.update('pendencias', id, d);
      return id;
    };
    m.$('#peAdd').onclick = async () => {
      if (!garantir()) return;
      const files = [...m.$('#peArq').files].concat(soltos); const sit = m.$('#peSit').value, tx = m.$('#peTx').value.trim();
      if (!files.length && !tx) return UI.toast('Escreva o que foi feito ou anexe um documento', 'err');
      const b = m.$('#peAdd'); b.disabled = true; b.textContent = 'Enviando…';
      const up = files.length ? await Store.uploadFiles(files, { obraId: p.obraId || null, pasta: 'PENDENCIAS', pendenciaId: id }) : [];
      const e = { data: m.$('#peDt').value || UI.today(), situacao: sit, texto: tx, arquivoIds: up.map(a => a.id), por: (Auth.current() || {}).nome || '', em: new Date().toISOString() };
      p.evidencias = evid(p).concat(e);
      const st = sit === 'Sanado' ? { status: 'Resolvida', resolvidaEm: e.data } : sit === 'Em andamento' ? { status: 'Em andamento', resolvidaEm: '' } : { status: 'Aberta', resolvidaEm: '' };
      Object.assign(p, st); Store.update('pendencias', id, Object.assign({ evidencias: p.evidencias }, st));
      const sel = m.el.querySelector('[name="status"]'); if (sel) sel.value = st.status;
      m.$('#peH').innerHTML = hist(); ligar(); m.$('#peArq').value = ''; m.$('#peTx').value = ''; soltos = []; dz.innerHTML = 'Ou arraste os arquivos aqui';
      b.disabled = false; b.innerHTML = 'Registrar andamento'; UI.toast('Andamento registrado' + (up.length ? ' com ' + up.length + ' documento(s)' : ''));
    };
    m.$('#peOk').onclick = () => { if (!garantir()) return; UI.toast('Salvo: ' + id); m.close(); App.renderShell(); App.route(); };
    const del = m.$('#peDel'); if (del) del.onclick = async () => { if (await UI.confirm('Excluir esta pendência?', 'Excluir')) { Store.remove('pendencias', id); m.close(); App.refresh(); } };
  };
})();
