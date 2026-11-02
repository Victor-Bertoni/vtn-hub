/* =========================================================
   VTN HUB COMO APLICATIVO (PWA) + ATUALIZAÇÃO OBRIGATÓRIA
   - Instala pelo Edge/Chrome: ícone na área de trabalho e no menu
     Iniciar, janela própria, sem barra de navegador.
   - O programa vem do GitHub Pages. A cada 10 minutos o app confere
     o arquivo versao.json do site; se houver versão nova, avisa e
     atualiza sozinho em até 1 hora (sem perder o que estava aberto).
   ========================================================= */
window.Desktop = (() => {
  let pedido = null;
  const instalado = () => window.matchMedia && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: window-controls-overlay)').matches);
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); pedido = e; });
  window.addEventListener('appinstalled', () => { try { UI.toast('VTN Hub instalado. Use o ícone da área de trabalho.'); } catch (e) {} });

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  async function instalar() {
    if (instalado()) { UI.toast('O VTN Hub já está instalado neste computador.'); return true; }
    if (pedido) { pedido.prompt(); const r = await pedido.userChoice.catch(() => ({})); pedido = null; return r && r.outcome === 'accepted'; }
    UI.modal({ title: 'Instalar o VTN Hub', body: `<p>No Edge ou no Chrome: clique no ícone <b>Instalar</b> (⊕) no fim da barra de endereço, ou no menu <b>⋯ › Aplicativos › Instalar este site como aplicativo</b>.</p><p class="tiny muted">Depois disso o VTN Hub abre pelo ícone da área de trabalho, numa janela própria.</p>`, footer: '<button class="btn primary" data-close>Entendi</button>' });
    return false;
  }
  function oferecer(forcar) {
    if (instalado()) return;
    let visto = ''; try { visto = localStorage.getItem('vtn_pwa_oferecido') || ''; } catch (e) {}
    if (!forcar && visto) return;
    if (document.querySelector('.modal-bg')) { setTimeout(() => oferecer(forcar), 8000); return; }
    try { localStorage.setItem('vtn_pwa_oferecido', '1'); } catch (e) {}
    const m = UI.modal({ title: 'Instale o VTN Hub no computador', body: `<p>Instale como aplicativo: ícone na área de trabalho e no menu Iniciar, janela própria (sem cara de navegador) e atualização automática.</p>`,
      footer: '<button class="btn" data-close>Agora não</button><button class="btn primary keep" id="pwaOk">Instalar</button>' });
    m.$('#pwaOk').onclick = async () => { m.close(); await instalar(); };
  }

  /* atualização obrigatória: compara a versão em uso com a publicada no GitHub */
  async function conferirVersao() {
    if (location.protocol !== 'https:') return;
    try {
      const r = await fetch('versao.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return;
      const v = await r.json();
      if (v && v.versao && v.versao > CONFIG.APP_VERSION && window.Atualizacao) Atualizacao.aviso({ versao: v.versao, publicadoEm: v.publicadoEm || new Date().toISOString(), prazoMin: v.prazoMin || 60, mensagem: v.mensagem || '' });
    } catch (e) {}
  }
  document.addEventListener('vtn:pronto', () => { conferirVersao(); setInterval(conferirVersao, 10 * 60e3); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) conferirVersao(); });

  return { oferecer, instalar, gerar: instalar, instalado };
})();
