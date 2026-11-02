/* =========================================================
   VTN HUB – AJUSTES PARA O APP ANDROID (APK)
   Só age quando o app roda dentro do APK do VTN Hub, que expõe
   window.VTNAndroid (ponte Java ↔ página). No navegador não faz nada.
   • arquivos gerados (blob:) → salvos em Downloads e abertos
   • janela de impressão (window.open + document.write) → impressão / PDF do Android
   • links de fora (notícias, sites oficiais) → abrem no navegador do celular
   ========================================================= */
(() => {
  const A = window.VTNAndroid;
  if (!A) return;
  document.documentElement.classList.add('app-android');

  const paraBase64 = blob => new Promise((ok, err) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = err; r.readAsDataURL(blob); });
  async function salvarUrl(url, nome) {
    try {
      const blob = await (await fetch(url)).blob();
      const tipo = blob.type || 'application/octet-stream';
      const ext = { 'application/pdf': '.pdf', 'text/html': '.html', 'application/json': '.json', 'text/csv': '.csv', 'image/png': '.png', 'image/jpeg': '.jpg', 'application/zip': '.zip' }[tipo.split(';')[0]] || '';
      if (!nome) nome = 'vtn_' + new Date().toISOString().slice(0, 19).replace(/\D/g, '') + ext;
      if (/^text\/html/.test(tipo) && !/\.html?$/i.test(nome)) nome += '.html';
      A.salvar(await paraBase64(blob), nome, tipo);
    } catch (e) { alert('Não foi possível salvar o arquivo: ' + e.message); }
  }
  const externo = u => /^https?:/i.test(u) && new URL(u, location.href).origin !== location.origin;

  // <a href="blob:..."> (com ou sem download) e links externos
  const clickOrig = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    const h = this.getAttribute('href') || '';
    if (/^(blob|data):/.test(h)) { salvarUrl(this.href, this.getAttribute('download') || ''); return; }
    if (externo(this.href)) { A.abrirExterno(this.href); return; }
    return clickOrig.call(this);
  };
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    const h = a.getAttribute('href') || '';
    if (/^(blob|data):/.test(h)) { e.preventDefault(); salvarUrl(a.href, a.getAttribute('download') || ''); }
    else if (externo(a.href)) { e.preventDefault(); A.abrirExterno(a.href); }
  }, true);

  // window.open: blob → salvar; site externo → navegador; janela vazia → impressão
  window.open = function (url) {
    url = url ? String(url) : '';
    if (/^(blob|data):/.test(url)) { salvarUrl(url, ''); return null; }
    if (url && externo(new URL(url, location.href).href)) { A.abrirExterno(new URL(url, location.href).href); return null; }
    if (url) { location.href = url; return window; }
    let html = '';
    const doc = { write: t => { html += t; }, writeln: t => { html += t + '\n'; }, open() {}, close() {
      const titulo = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || 'VTN Hub';
      A.imprimir(html.replace(/<script[\s\S]*?<\/script>/gi, ''), titulo, location.href);
    } };
    return { document: doc, print() {}, close() {}, focus() {} };
  };
  window.print = () => A.imprimir('<!doctype html>' + document.documentElement.outerHTML.replace(/<script[\s\S]*?<\/script>/gi, ''), document.title || 'VTN Hub', location.href);
})();
