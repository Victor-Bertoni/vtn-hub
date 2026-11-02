/* =========================================================
   PARÂMETROS FISCAIS AUTOMÁTICOS
   O Radar fiscal (tarefa agendada na nuvem, toda segunda) grava em
   sistema/parametros os valores novos (salário mínimo, INSS, IRRF,
   ISS, faixas do Simples, MCMV, leis novas). O app aplica na hora,
   para todos, sem ninguém precisar responder nem ligar computador.
   ========================================================= */
window.Parametros = (() => {
  let atual = null;
  // só estes caminhos podem ser trocados pelo documento
  const PERMITIDOS = ['Conhecimento.SALARIO_MINIMO', 'Conhecimento.INSS', 'Conhecimento.IRRF', 'Conhecimento.MCMV', 'Conhecimento.ISS_MUN', 'Conhecimento.LIMITES',
    'Fiscal.ANEXOS.III.faixas', 'Fiscal.ANEXOS.IV.faixas', 'Fiscal.ANEXOS.V.faixas', 'Fiscal.ANEXOS.III.reparticao', 'Fiscal.ANEXOS.IV.reparticao', 'Fiscal.ANEXOS.V.reparticao'];
  function setPath(path, v) {
    const p = path.split('.'); let o = window[p[0]]; if (!o) return false;
    for (let i = 1; i < p.length - 1; i++) { if (o[p[i]] == null) return false; o = o[p[i]]; }
    o[p[p.length - 1]] = v; return true;
  }
  function aplicar(d, avisar) {
    if (!d || !d.versao) return;
    const novo = !atual || atual.versao !== d.versao; atual = d;
    Object.entries(d.set || {}).forEach(([k, v]) => { if (PERMITIDOS.includes(k)) { try { setPath(k, JSON.parse(JSON.stringify(v), (kk, x) => typeof x === 'number' && x >= 1e14 ? Infinity : x)); } catch (e) {} } });
    if (window.Conhecimento) {
      if (d.atualizadoEm) Conhecimento.ATUALIZADO = d.atualizadoEm.slice(0, 10);
      (d.leisNovas || []).slice().reverse().forEach(l => { if (l && l.norma && !Conhecimento.LEIS.some(x => x.norma === l.norma)) Conhecimento.LEIS.unshift(Object.assign({ ok: true, auto: true }, l)); });
      if (Array.isArray(d.alertas)) d.alertas.forEach(a => { if (a && a.titulo && !(Conhecimento.ALERTAS || []).some(x => x.titulo === a.titulo)) (Conhecimento.ALERTAS = Conhecimento.ALERTAS || []).unshift(a); });
    }
    try { window.Fiscal && Fiscal.limparCache && Fiscal.limparCache(); } catch (e) {}
    if (novo && avisar && (d.mudancas || []).length) {
      try { UI.toast('Parâmetros fiscais atualizados automaticamente: ' + d.mudancas.slice(0, 2).join('; ') + (d.mudancas.length > 2 ? '…' : '')); } catch (e) {}
      try { if (!document.querySelector('.modal-bg')) App.refresh(); } catch (e) {}
    }
  }
  document.addEventListener('vtn:pronto', async () => {
    try {
      const db = window.claude && await claude.use('db'); if (!db) return;
      const ref = db.collection('sistema').doc('parametros');
      try { const s = await ref.get(); if (s && s.exists) aplicar(s.data(), false); } catch (e) {}
      ref.onSnapshot(s => { const d = s && s.data && s.data(); if (d) aplicar(d, true); }, () => {});
    } catch (e) {}
  });
  /* ---------- editor (administradores): troca valores para todos, sem IA ---------- */
  async function salvar(novoSet, mudancas, leisNovas) {
    const db = window.claude && await claude.use('db'); if (!db) throw new Error('offline');
    const ref = db.collection('sistema').doc('parametros'); const s = await ref.get(); const ant = (s && s.exists && s.data()) || {};
    const doc = Object.assign({}, ant, { versao: new Date().toISOString(), atualizadoEm: new Date().toISOString(), mudancas, set: Object.assign({}, ant.set || {}, novoSet), leisNovas: (ant.leisNovas || []).concat(leisNovas || []), historico: (ant.historico || []).concat([{ em: new Date().toISOString(), por: ((window.Auth && Auth.current()) || {}).nome || '', mudancas }]).slice(-50) });
    await ref.set(doc); aplicar(doc, true);
  }
  function editor() {
    const K = window.Conhecimento || {}; const L = K.LIMITES || {}; const j = v => JSON.stringify(v);
    const m = UI.modal({ title: 'Parâmetros fiscais (valem para todos na hora)', wide: true, body: `
      <p class="tiny muted">Use quando uma lei, portaria ou tabela oficial mudar. O "Vigia de fontes oficiais" avisa aqui quando alguma página oficial mudou.</p>
      <div id="pmRadar"></div>
      <div class="grid g4" style="gap:10px">
        <div class="field"><label>Salário mínimo (R$)</label><input class="input" id="pmSM" type="number" step="0.01" value="${K.SALARIO_MINIMO || ''}"></div>
        <div class="field"><label>Limite ME (R$)</label><input class="input" id="pmME" type="number" value="${L.ME || 360000}"></div>
        <div class="field"><label>Sublimite (R$)</label><input class="input" id="pmSUB" type="number" value="${L.SUB || 3600000}"></div>
        <div class="field"><label>Teto EPP / Simples (R$)</label><input class="input" id="pmEPP" type="number" value="${L.EPP || 4800000}"></div></div>
      <div class="field"><label>INSS – teto e faixas [até, alíquota %, parcela a deduzir]</label><textarea class="input mono" id="pmINSS" rows="2">${UI.esc(j(K.INSS || {}))}</textarea></div>
      <div class="field"><label>IRRF – faixas [até, alíquota %, deduzir], dependente e desconto simplificado (use 1e15 na última faixa)</label><textarea class="input mono" id="pmIRRF" rows="2">${UI.esc(j(Object.assign({}, K.IRRF || {}, { faixas: ((K.IRRF || {}).faixas || []).map(f => [f[0] === Infinity ? 1e15 : f[0], f[1], f[2]]) })))}</textarea></div>
      <div class="grid g2" style="gap:10px"><div class="field"><label>Lei/norma nova (opcional)</label><input class="input" id="pmNorma" placeholder="Ex.: Portaria Interministerial MPS/MF nº 1, de 10/01/2027"></div><div class="field"><label>Resumo / impacto</label><input class="input" id="pmResumo"></div></div>
      <div class="field"><label>O que mudou (aparece para todos)</label><input class="input" id="pmMud" placeholder="Ex.: Salário mínimo 1.621 → 1.700 a partir de 01/01/2027"></div>`,
      footer: `<button class="btn" data-close>Cancelar</button><button class="btn primary keep" id="pmOk">Salvar e aplicar para todos</button>` });
    (async () => { try { const db = await claude.use('db'); const r = await db.collection('sistema').doc('radar').get(); const it = (r.exists && r.data().itens) || []; const box = m.$('#pmRadar'); if (box && it.length) box.innerHTML = `<div class="alert warn mb"><div><b>Vigia de fontes oficiais</b><ul class="tiny" style="margin:4px 0 0">${it.slice(0, 8).map(x => `<li>${UI.esc(x.nome)} – mudou em ${new Date(x.mudouEm).toLocaleDateString('pt-BR')}${x.url ? ` · <a href="${UI.esc(x.url)}" target="_blank" rel="noopener">abrir</a>` : ''}${x.trecho ? `<div class="muted">${UI.esc(x.trecho.slice(0, 220))}</div>` : ''}</li>`).join('')}</ul></div></div>`; } catch (e) {} })();
    m.$('#pmOk').onclick = async () => {
      try {
        const set = { 'Conhecimento.SALARIO_MINIMO': +m.$('#pmSM').value, 'Conhecimento.LIMITES': { ME: +m.$('#pmME').value, EPP: +m.$('#pmEPP').value, SUB: +m.$('#pmSUB').value }, 'Conhecimento.INSS': JSON.parse(m.$('#pmINSS').value), 'Conhecimento.IRRF': JSON.parse(m.$('#pmIRRF').value) };
        if (set['Conhecimento.IRRF'].faixas) set['Conhecimento.IRRF'].faixas = set['Conhecimento.IRRF'].faixas.map(f => [f[0] >= 1e14 ? Infinity : f[0], f[1], f[2]]);
        const mud = m.$('#pmMud').value.trim() || 'Parâmetros fiscais revisados';
        const norma = m.$('#pmNorma').value.trim();
        const doc = JSON.parse(JSON.stringify(set, (k, v) => v === Infinity ? 1e15 : v));
        await salvar(doc, [mud], norma ? [{ tema: 'Atualização', norma, resumo: m.$('#pmResumo').value.trim(), impacto: '' }] : []);
        m.close(); UI.toast('Parâmetros atualizados para todos');
      } catch (e) { UI.toast('Confira os campos (formato das faixas) e tente de novo.', 'err'); }
    };
  }
  /* aviso aos administradores quando o vigia (script sem IA) detectar mudança numa fonte oficial */
  document.addEventListener('vtn:pronto', async () => {
    try { const db = window.claude && await claude.use('db'); if (!db) return;
      db.collection('sistema').doc('radar').onSnapshot(s => { const d = s && s.data && s.data(); if (!d || !(d.itens || []).length) return; if (((window.Auth && Auth.current()) || {}).papel !== 'admin') return;
        let visto = ''; try { visto = localStorage.getItem('vtn_radar_visto') || ''; } catch (e) {}
        const novos = d.itens.filter(x => (x.mudouEm || '') > visto); if (!novos.length) return;
        try { localStorage.setItem('vtn_radar_visto', d.itens.map(x => x.mudouEm || '').sort().pop()); } catch (e) {}
        try { UI.toast('Fonte oficial mudou: ' + novos.map(x => x.nome).slice(0, 2).join(', ') + ' – confira em Configurações › Parâmetros fiscais', 'warn'); } catch (e) {}
      }, () => {});
    } catch (e) {}
  });
  return { info: () => atual, aplicar, editor, salvar };
})();
