/* =========================================================
   ATUALIZAÇÕES SEM PERDER NADA
   - Quando sai uma versão nova, todos recebem um aviso com prazo
     de 1 hora para atualizar (botão "Atualizar agora").
   - Ao atualizar, a pessoa volta exatamente onde estava: mesma
     tela, mesma rolagem e rascunhos de formulários abertos.
   - Nada fica sem salvar: as gravações pendentes são enviadas antes.
   ========================================================= */
window.Atualizacao = (() => {
  const PRAZO_MIN = 60, K_ULT = 'vtn_ultima_tela', K_RASC = 'vtn_rascunho';
  let alvo = null, prazo = 0, tick = null;
  const ls = { get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }, del: k => { try { localStorage.removeItem(k); } catch (e) {} } };

  /* ---- guarda onde a pessoa está ---- */
  function lembrar() { ls.set(K_ULT, { hash: location.hash, y: window.scrollY, t: Date.now() }); }
  function rascunho() {
    const m = document.querySelector('.modal-bg .modal'); if (!m) { ls.del(K_RASC); return; }
    const campos = [...m.querySelectorAll('input,select,textarea')].map(el => [el.name || el.id || '', el.type === 'checkbox' ? el.checked : el.value]).filter(x => x[0]);
    ls.set(K_RASC, { titulo: (m.querySelector('.modal-h h3,.modal-h b,.modal-h') || {}).textContent || '', hash: location.hash, campos, t: Date.now() });
  }
  window.addEventListener('hashchange', lembrar);
  let st; window.addEventListener('scroll', () => { clearTimeout(st); st = setTimeout(lembrar, 400); }, { passive: true });
  document.addEventListener('input', () => { clearTimeout(st); st = setTimeout(rascunho, 600); }, true);
  window.addEventListener('pagehide', () => { lembrar(); rascunho(); });

  /* ---- ao abrir: volta à última tela e oferece o rascunho ---- */
  function restaurar() {
    const u = ls.get(K_ULT);
    if (u && u.hash && (!location.hash || location.hash === '#' || location.hash === '#/dashboard') && Date.now() - u.t < 12 * 3600e3) {
      if (location.hash !== u.hash) location.hash = u.hash;
      setTimeout(() => window.scrollTo(0, u.y || 0), 300);
    }
    const r = ls.get(K_RASC);
    if (r && r.campos && r.campos.length && Date.now() - r.t < 12 * 3600e3) {
      setTimeout(() => {
        const bar = document.createElement('div'); bar.className = 'upd-bar rasc';
        bar.innerHTML = `<span>📝 Você tinha um formulário aberto (${UI.esc(r.titulo.trim().slice(0, 60))}). Os valores digitados foram guardados.</span><button class="btn sm" id="rcVer">Ver valores</button><button class="btn sm ghost" id="rcX">Descartar</button>`;
        document.body.appendChild(bar);
        bar.querySelector('#rcX').onclick = () => { ls.del(K_RASC); bar.remove(); };
        bar.querySelector('#rcVer').onclick = () => { UI.modal({ title: 'Rascunho recuperado', body: `<p class="muted">Copie o que precisar e abra o formulário de novo.</p><table class="t">${r.campos.filter(c => c[1] !== '' && c[1] !== false).map(c => `<tr><td class="tiny muted">${UI.esc(c[0])}</td><td>${UI.esc(String(c[1]))}</td></tr>`).join('')}</table>` }); };
      }, 1200);
    }
  }

  /* ---- aviso de versão nova ---- */
  const K_TENT = 'vtn_upd_tentado';
  // já está na versão (ou acima) que motivou a última atualização: limpa
  try { const t = ls.get(K_TENT); if (t && t <= CONFIG.APP_VERSION) ls.del(K_TENT); } catch (e) {}
  function aviso(info) {
    // já recarregou para esta versão e ainda veio a antiga (cópia em cache): não insiste com a mensagem;
    // tenta de novo em silêncio uma vez por sessão
    if (ls.get(K_TENT) === info.versao) {
      let ja = false; try { ja = sessionStorage.getItem(K_TENT) === info.versao; sessionStorage.setItem(K_TENT, info.versao); } catch (e) {}
      if (!ja && !document.querySelector('.modal-bg')) { alvo = info.versao; setTimeout(() => atualizar(false), 1500); }
      return;
    }
    alvo = info.versao; prazo = (info.publicadoEm ? new Date(info.publicadoEm).getTime() : Date.now()) + (info.prazoMin || PRAZO_MIN) * 60e3;
    let bar = document.getElementById('updBar');
    if (!bar) { bar = document.createElement('div'); bar.id = 'updBar'; bar.className = 'upd-bar'; document.body.appendChild(bar); }
    const pinta = () => {
      const rest = Math.max(0, prazo - Date.now()), min = Math.ceil(rest / 60e3);
      bar.innerHTML = `<span>🔄 <b>Nova versão do VTN Hub disponível.</b> ${info.mensagem ? UI.esc(info.mensagem) + ' · ' : ''}Atualize até <b>${new Date(prazo).toTimeString().slice(0, 5)}</b> (${min} min). Você volta exatamente onde está, sem perder nada.</span><button class="btn sm primary keep" id="updOk">Atualizar agora</button>`;
      bar.querySelector('#updOk').onclick = atualizar;
      if (rest <= 0) atualizar(true);
    };
    pinta(); clearInterval(tick); tick = setInterval(pinta, 30000);
  }
  async function atualizar(automatico) {
    if (automatico && document.querySelector('.modal-bg')) { prazo = Date.now() + 5 * 60e3; UI.toast('Atualização adiada 5 min porque há um formulário aberto.'); return; }
    lembrar(); rascunho();
    if (alvo) ls.set(K_TENT, alvo);
    const bar = document.getElementById('updBar'); if (bar) bar.remove();   // a mensagem some na hora
    try { if (window.Cloud && Cloud.ativo && Cloud.flush) await Cloud.flush(); } catch (e) {}
    try { const rs = await navigator.serviceWorker?.getRegistrations?.(); for (const r of rs || []) await r.update(); } catch (e) {}
    location.reload();
  }

  /* ---- liga tudo depois que os dados carregam ---- */
  document.addEventListener('vtn:pronto', async () => {
    setTimeout(restaurar, 200);
    if (!(window.Cloud && Cloud.ativo)) return;
    const db = await claude.use('db'); if (!db) return;
    const ref = db.collection('sistema').doc('versao');
    try {
      const s = await ref.get(); const atual = s.exists ? s.data() : null;
      // um editor abrindo a versão nova registra a publicação para todos
      if (Cloud.podeEditar && (!atual || (atual.versao || '') < CONFIG.APP_VERSION)) await ref.set({ versao: CONFIG.APP_VERSION, publicadoEm: new Date().toISOString(), prazoMin: PRAZO_MIN, mensagem: '' });
    } catch (e) {}
    ref.onSnapshot(s => { const v = s.exists && s.data(); if (v && v.versao && v.versao > CONFIG.APP_VERSION) aviso(v); }, () => {});
  });

  /* o próprio Claude também recarrega páginas abertas: guarda o estado antes */
  try { window.claude && window.claude.hot && window.claude.hot.snapshot && window.claude.hot.snapshot(() => { lembrar(); rascunho(); return {}; }); } catch (e) {}
  return { atualizar, aviso };
})();
