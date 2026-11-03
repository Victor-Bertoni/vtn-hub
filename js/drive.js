/* =========================================================
   VTN HUB – PASTAS DAS OBRAS NO DRIVE (OneDrive\00_VTN\00_SERVIÇOS)
   Tudo passa pelo servidor do computador do Victor e só administradores gravam.
   • Obra nova  -> cria "NN - NOME" com 01_COMERCIAL, 02_EXECUÇÃO e 03_ENTREGA
   • Documentos (orçamento, proposta, contrato, recibo, termo) -> PDF na fase certa
   • Anexos enviados no app -> mesma pasta (campo "pasta" do anexo) dentro da obra
   Nunca substitui nem apaga: arquivo repetido vira "(2)", "(3)"...
   ========================================================= */
window.Drive = (() => {
  const pode = () => !!(window.VTN_PASTA && VTN_PASTA.servidor && VTN_PASTA.enviar) && ((window.Auth && Auth.current && Auth.current()) || {}).papel === 'admin';
  // só o nº oficial da pasta (OB-0072 / numero "72"); OB-I05 etc. não têm pasta numerada
  const numeroDa = ob => !ob ? 0 : (/^\d+$/.test(String(ob.numero || '').trim()) ? parseInt(ob.numero, 10) : parseInt((/^OB-(\d+)$/.exec(ob.id) || [])[1], 10) || 0);
  // fase de cada tipo de documento
  const FASE = { 'Orçamento': 'COMERCIAL', Proposta: 'COMERCIAL', Contrato: 'COMERCIAL', Recibo: 'EXECUÇÃO', Termo: 'ENTREGA', 'Declaração': 'ENTREGA' };
  const paginaCompleta = (corpo, titulo) => {
    const css = [...document.styleSheets].map(ss => { try { return [...ss.cssRules].map(r => r.cssText).join('\n'); } catch (e) { return ''; } }).join('\n');
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${UI.esc(titulo || 'Documento')}</title><style>${css}</style><style>body{background:#fff;margin:0}.doc{border:0;max-width:none;padding:0;box-shadow:none}@page{margin:16mm}</style></head><body><div class="doc">${corpo}</div></body></html>`;
  };
  const nomeArquivo = (...partes) => partes.filter(Boolean).join('_').replace(/[^\wÀ-ú\- ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 120);

  async function criarPasta(ob) {
    const n = numeroDa(ob); if (!n || !pode()) return null;
    try { const r = await VTN_PASTA.enviar('criar-pasta-obra', { numero: n, nome: ob.nome || '' }); return r.caminho; } catch (e) { UI.toast('Pasta da obra no drive: ' + e.message, 'err'); return null; }
  }
  /* documento em HTML -> PDF na pasta da obra. avisar=false: silencioso quando não dá */
  async function salvarDoc(obraId, { corpo, titulo, arquivo, categoria, avisar = true }) {
    const ob = Store.get('obras', obraId); const n = numeroDa(ob);
    const falha = m => { if (avisar) UI.toast(m, 'err'); return null; };
    if (!ob) return falha('Vincule o documento a uma obra para salvar na pasta dela.');
    if (!n) return falha('A obra precisa ter o nº da pasta (ex.: 72).');
    if (!(window.VTN_PASTA && VTN_PASTA.servidor)) return falha('Para salvar na pasta da obra, o computador do Victor precisa estar ligado.');
    if (!pode()) return falha('Só administradores salvam na pasta da obra.');
    try {
      const r = await VTN_PASTA.enviar('salvar-na-obra', { numero: n, nome: ob.nome || '', arquivo: arquivo || nomeArquivo(categoria, titulo, new Date().toISOString().slice(0, 10)), html: paginaCompleta(corpo, titulo), fase: FASE[categoria] || 'COMERCIAL' });
      UI.toast('Salvo na pasta da obra: ' + r.caminho); return r.caminho;
    } catch (e) { return falha('Não foi possível salvar na pasta da obra: ' + e.message); }
  }
  /* anexo enviado no app -> mesma pasta dentro da obra no drive */
  async function anexar(rec, blob) {
    const ob = rec && Store.get('obras', rec.obraId); const n = numeroDa(ob);
    if (!n || !pode() || !blob) return null;
    const pasta = String(rec.pasta || '').trim(); const sub = /^\(raiz\)$/i.test(pasta) ? '' : pasta;
    const q = new URLSearchParams({ numero: n, nome: ob.nome || '', arquivo: rec.nome || 'arquivo', fase: '', sub });
    try { const r = await VTN_PASTA.enviarArquivo('obra-arquivo?' + q.toString(), blob); return r.caminho; } catch (e) { UI.toast('Anexo não foi para a pasta da obra: ' + e.message, 'err'); return null; }
  }
  return { numeroDa, criarPasta, salvarDoc, anexar, FASE };
})();
