/* =========================================================
   NOTAS FISCAIS – emitidas (receitas) e recebidas (despesas), quem está sem nota,
   impostos retidos e importação direta de arquivos:
   • XML de NF-e, NFS-e ABRASF (BH e outras prefeituras) e NFS-e Nacional: lê número,
     data, emitente, tomador, CNPJ, valor, ISS/INSS retidos e descrição; acha o lançamento
     (mesmo valor / número / CNPJ) ou cria a receita/despesa; cadastra o fornecedor se faltar.
   • PDF ou foto da nota: guarda o arquivo e liga ao lançamento escolhido.
   Os arquivos vão para a pasta "NOTAS FISCAIS" da obra no drive (como os outros anexos).
   ========================================================= */
(() => {
  const dig = s => String(s || '').replace(/\D/g, '');
  const hoje = () => UI.today();
  const valorNF = l => +l.nfValor || +l.valor || 0;

  /* ---------- leitura do XML ---------- */
  function lerXML(txt) {
    const doc = new DOMParser().parseFromString(txt, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('XML inválido');
    const all = (el, n) => [...(el || doc).getElementsByTagNameNS('*', n)];
    const um = (el, ...ns) => { for (const n of ns) { const x = all(el, n)[0]; if (x && x.textContent.trim()) return x.textContent.trim(); } return ''; };
    const bloco = (...ns) => { for (const n of ns) { const x = all(doc, n)[0]; if (x) return x; } return null; };
    const emit = bloco('emit', 'PrestadorServico', 'Prestador', 'prest'), toma = bloco('dest', 'TomadorServico', 'Tomador', 'toma');
    const ehNFe = !!all(doc, 'infNFe').length;
    const id = (all(doc, 'infNFe')[0] || all(doc, 'infNFSe')[0] || {}).getAttribute ? ((all(doc, 'infNFe')[0] || all(doc, 'infNFSe')[0]).getAttribute('Id') || '') : '';
    const n = {
      modelo: ehNFe ? 'NF-e' : all(doc, 'infNFSe').length || all(doc, 'NFSe').length ? 'NFS-e Nacional' : 'NFS-e',
      numero: um(doc, 'nNF', 'nNFSe', 'Numero', 'NumeroNfse', 'nDFSe'),
      emissao: (um(doc, 'dhEmi', 'dEmi', 'DataEmissao', 'dhProc', 'DataEmissaoNfse') || '').slice(0, 10),
      emitCnpj: dig(um(emit, 'CNPJ', 'Cnpj', 'CPF', 'Cpf')), emitNome: um(emit, 'xNome', 'RazaoSocial', 'xFant', 'NomeFantasia'),
      tomaCnpj: dig(um(toma, 'CNPJ', 'Cnpj', 'CPF', 'Cpf')), tomaNome: um(toma, 'xNome', 'RazaoSocial'),
      valor: +um(doc, 'vNF', 'ValorLiquidoNfse', 'vLiq', 'ValorServicos', 'vServ') || 0,
      bruto: +um(doc, 'vNF', 'ValorServicos', 'vServ') || 0,
      iss: +um(doc, 'ValorIss', 'vISSQN', 'vISS') || 0,
      issRetido: um(doc, 'IssRetido') === '1' || ['2', '3'].includes(um(doc, 'tpRetISSQN')),
      inss: +um(doc, 'ValorInss', 'vRetCP', 'vINSS') || 0,
      chave: (um(doc, 'chNFe') || id.replace(/^(NFe|NFS)/, '') || um(doc, 'CodigoVerificacao')).trim(),
      desc: (all(doc, 'xProd').map(x => x.textContent.trim()).slice(0, 6).join('; ') || um(doc, 'Discriminacao', 'xDescServ', 'xServ')).slice(0, 400)
    };
    if (!n.numero && !n.valor) throw new Error('não parece uma nota fiscal');
    return n;
  }
  function sentido(n) { const meu = dig(Store.db.empresa.cnpj); return meu && n.emitCnpj === meu ? 'emitida' : 'recebida'; }
  function acharLanc(n) {
    const tipo = sentido(n) === 'emitida' ? 'receita' : 'despesa';
    const pes = Store.all('pessoas').find(p => dig(p.cpf) && dig(p.cpf) === (tipo === 'despesa' ? n.emitCnpj : n.tomaCnpj));
    const L = Store.where('lancamentos', l => l.tipo === tipo);
    return L.find(l => n.chave && l.nfChave === n.chave) || L.find(l => n.numero && l.nfNumero && dig(l.nfNumero) === dig(n.numero) && (!pes || l.pessoaId === pes.id))
      || L.filter(l => Math.abs((+l.valor || 0) - n.valor) < 0.02 || Math.abs((+l.valor || 0) - n.bruto) < 0.02).sort((a, b) => ((pes && b.pessoaId === pes.id) - (pes && a.pessoaId === pes.id)) || (!b.nf - !a.nf))[0] || null;
  }

  Views.notas = {
    perm: 'financeiro.ver',
    st: { tab: 'visao', ano: UI.today().slice(0, 4) },
    render(el) {
      const { icon, money } = UI; const s = this.st; const G = Views.relatorios.graf;
      const doAno = l => (l.nfEmissao || l.dataPagamento || l.data || '').startsWith(s.ano);
      const E = Store.where('lancamentos', l => l.tipo === 'receita' && l.nf && doAno(l)), R = Store.where('lancamentos', l => l.tipo === 'despesa' && l.nf && doAno(l));
      const recAno = Store.where('lancamentos', l => l.tipo === 'receita' && l.status === 'pago' && (l.dataPagamento || l.data || '').startsWith(s.ano));
      const despAno = Store.where('lancamentos', l => l.tipo === 'despesa' && l.status === 'pago' && (l.dataPagamento || l.data || '').startsWith(s.ano) && !['Pró-labore', 'Distribuição de lucros', 'Impostos'].includes(l.categoria));
      const semNF = despAno.filter(l => !l.nf);
      const T = [['visao', 'Visão geral', 'layout-grid'], ['emitidas', `Emitidas (${E.length})`, 'file-output'], ['recebidas', `Recebidas (${R.length})`, 'file-input'], ['sem', `Sem nota (${semNF.length + recAno.filter(l => !l.nf).length})`, 'file-x'], ['importar', 'Importar XML / PDF', 'upload']];
      const anos = [...new Set(Store.all('lancamentos').map(l => (l.nfEmissao || l.dataPagamento || l.data || '').slice(0, 4)).filter(Boolean))].sort().reverse();
      el.innerHTML = `<div class="page-head"><div><h1>Notas fiscais</h1><p>Notas emitidas e recebidas, o que está sem nota e os impostos retidos</p></div><div class="row"><select class="select" id="nfAno">${(anos.length ? anos : [s.ano]).map(a => `<option ${a === s.ano ? 'selected' : ''}>${a}</option>`).join('')}</select><button class="btn primary" id="nfImp">${icon('upload')} Importar notas</button></div></div>
        <div class="grid g4">
          <div class="card kpi ok"><div class="ico">${icon('file-output')}</div><div class="lbl">Notas emitidas em ${s.ano}</div><div class="val">${UI.moneyK(E.reduce((a, l) => a + valorNF(l), 0))}</div><div class="sub">${E.length} notas · ${UI.pct(recAno.reduce((a, l) => a + l.valor, 0) ? recAno.filter(l => l.nf).reduce((a, l) => a + l.valor, 0) / recAno.reduce((a, l) => a + l.valor, 0) * 100 : 0, 0)} da receita com NF</div></div>
          <div class="card kpi err"><div class="ico">${icon('file-input')}</div><div class="lbl">Notas recebidas em ${s.ano}</div><div class="val">${UI.moneyK(R.reduce((a, l) => a + valorNF(l), 0))}</div><div class="sub">${R.length} notas de fornecedores</div></div>
          <div class="card kpi warn"><div class="ico">${icon('file-x')}</div><div class="lbl">Gastos pagos sem nota</div><div class="val">${UI.moneyK(semNF.reduce((a, l) => a + l.valor, 0))}</div><div class="sub">${semNF.length} pagamentos · ${UI.pct(despAno.reduce((a, l) => a + l.valor, 0) ? semNF.reduce((a, l) => a + l.valor, 0) / despAno.reduce((a, l) => a + l.valor, 0) * 100 : 0, 0)} dos gastos</div></div>
          <div class="card kpi violet"><div class="ico">${icon('landmark')}</div><div class="lbl">Retido nas notas emitidas</div><div class="val">${money(E.reduce((a, l) => a + (l.issRetido ? +l.nfIss || 0 : 0) + (+l.nfInss || 0), 0))}</div><div class="sub">ISS ${money(E.reduce((a, l) => a + (l.issRetido ? +l.nfIss || 0 : 0), 0))} · INSS ${money(E.reduce((a, l) => a + (+l.nfInss || 0), 0))}</div></div>
        </div>
        <div class="tabs mt">${T.map(t => `<button class="${t[0] === s.tab ? 'active' : ''}" data-t="${t[0]}">${icon(t[2])} ${t[1]}</button>`).join('')}</div><div id="nfc"></div>`;
      UI.$('#nfAno', el).onchange = e => { s.ano = e.target.value; App.refresh(); };
      UI.$('#nfImp', el).onclick = () => { s.tab = 'importar'; App.refresh(); };
      UI.$$('[data-t]', el).forEach(b => b.onclick = () => { s.tab = b.dataset.t; App.refresh(); });
      const c = UI.$('#nfc', el);
      if (s.tab === 'visao') {
        const meses = Array.from({ length: 12 }, (_, i) => s.ano + '-' + String(i + 1).padStart(2, '0'));
        const mesNF = l => (l.nfEmissao || l.dataPagamento || l.data || '').slice(0, 7);
        const porEmit = {}; R.forEach(l => { const k = l.nfEmitente || (Store.get('pessoas', l.pessoaId) || {}).nome || 'Não informado'; porEmit[k] = (porEmit[k] || 0) + valorNF(l); });
        const porToma = {}; E.forEach(l => { const k = l.nfTomador || (Store.get('pessoas', l.pessoaId) || {}).nome || 'Não informado'; porToma[k] = (porToma[k] || 0) + valorNF(l); });
        c.innerHTML = `<div class="card"><div class="card-h"><h3>Notas por mês – ${s.ano}</h3></div><div class="card-b">${G.linha(meses.map(m => Calc.mesLabel(m).slice(0, 3)), [{ nome: 'Emitidas', cor: '#16a34a', vals: meses.map(m => E.filter(l => mesNF(l) === m).reduce((a, l) => a + valorNF(l), 0)) }, { nome: 'Recebidas', cor: '#dc2626', vals: meses.map(m => R.filter(l => mesNF(l) === m).reduce((a, l) => a + valorNF(l), 0)) }, { nome: 'Gastos sem nota', cor: '#f59e0b', vals: meses.map(m => semNF.filter(l => (l.dataPagamento || l.data || '').startsWith(m)).reduce((a, l) => a + l.valor, 0)) }])}</div></div>
          <div class="grid g2 mt"><div class="card"><div class="card-h"><h3>Quem mais emitiu nota para a VTN</h3></div><div class="card-b">${G.donut(Object.entries(porEmit).sort((a, b) => b[1] - a[1]), money, 'Recebidas') || UI.empty('Nenhuma nota recebida.', 'file-input')}</div></div>
          <div class="card"><div class="card-h"><h3>Para quem a VTN emitiu</h3></div><div class="card-b">${G.donut(Object.entries(porToma).sort((a, b) => b[1] - a[1]), money, 'Emitidas') || UI.empty('Nenhuma nota emitida.', 'file-output')}</div></div></div>`;
      } else if (s.tab === 'emitidas' || s.tab === 'recebidas') {
        c.innerHTML = `<div class="card">${this.tabela(s.tab === 'emitidas' ? E : R)}</div>`; this.bind(c);
      } else if (s.tab === 'sem') {
        const recSem = recAno.filter(l => !l.nf);
        c.innerHTML = `<div class="alert info">${icon('info')}<div>Pagamentos e recebimentos sem nota fiscal. Use <b>Anexar nota</b> para enviar o PDF/XML e marcar a nota, ou abra o lançamento para ajustar.</div></div>
          <div class="card mt"><div class="card-h"><h3>Gastos pagos sem nota (${semNF.length})</h3></div>${this.tabela(semNF.sort((a, b) => b.valor - a.valor), true)}</div>
          <div class="card mt"><div class="card-h"><h3>Recebimentos sem nota emitida (${recSem.length})</h3></div>${this.tabela(recSem.sort((a, b) => b.valor - a.valor), true)}</div>`; this.bind(c);
      } else this.importar(c);
    },
    tabela(L, anexar) {
      const { esc, money, date, icon } = UI;
      return UI.table([{ h: 'ID', f: l => UI.idLink(l.id) }, { h: 'Nota', f: l => l.nf ? `<b>${esc(l.nfModelo || 'NF')} ${esc(l.nfNumero || '')}</b><div class="tiny muted">${date(l.nfEmissao || '')}${l.nfChave ? ' · ' + esc(l.nfChave.slice(0, 14)) + '…' : ''}</div>` : '<span class="tiny muted">sem nota</span>' },
        { h: 'Emitente / descrição', f: l => `${esc(l.nfEmitente || (Store.get('pessoas', l.pessoaId) || {}).nome || '')}<div class="tiny muted">${esc(l.descricao)}</div>` }, { h: 'Obra', f: l => l.obraId ? UI.idLink(l.obraId) : 'Geral' },
        { h: 'Retenções', f: l => [l.issRetido && +l.nfIss ? 'ISS ' + money(l.nfIss) : '', +l.nfInss ? 'INSS ' + money(l.nfInss) : ''].filter(Boolean).join(' · ') || '—' },
        { h: 'Arquivo', f: l => (l.arquivoIds || []).length ? (l.arquivoIds || []).map(a => `<button class="btn sm ghost" data-ab="${a}" title="${esc((Store.get('arquivos', a) || {}).nome || '')}">${icon('paperclip')}</button>`).join('') : '<span class="tiny" style="color:var(--warn)">sem arquivo</span>' },
        { h: 'Valor', f: l => money(valorNF(l)) }, { h: '', f: l => `<div class="row" style="flex-wrap:nowrap"><label class="btn sm">${icon('upload')} ${anexar ? 'Anexar nota' : 'Arquivo'}<input type="file" hidden data-anx="${l.id}" accept=".xml,.pdf,image/*" multiple></label><button class="btn sm ghost" data-ed="${l.id}">${icon('pencil')}</button></div>` }
      ], L, { emptyMsg: 'Nada por aqui.' });
    },
    bind(c) {
      UI.$$('[data-ab]', c).forEach(b => b.onclick = () => Store.openFile(b.dataset.ab));
      UI.$$('[data-ed]', c).forEach(b => b.onclick = () => Views.financeiro.edit(b.dataset.ed));
      UI.$$('[data-anx]', c).forEach(i => i.onchange = () => this.anexar(i.dataset.anx, [...i.files]));
    },
    // anexa arquivos de nota a um lançamento (XML preenche os dados da nota)
    async anexar(lancId, files) {
      const l = Store.get('lancamentos', lancId); if (!l || !files.length) return;
      const patch = {}; let leuXml = false;
      for (const f of files) { if (/\.xml$/i.test(f.name)) { try { Object.assign(patch, this.campos(lerXML(await f.text()))); leuXml = true; } catch (e) { UI.toast(f.name + ': ' + e.message, 'err'); } } }
      const ehNF = leuXml || await UI.confirm('Esse arquivo é a NOTA FISCAL? (Cancelar = é só comprovante, recibo ou boleto)', 'É nota fiscal');
      if (ehNF) { patch.nf = true; if (!patch.nfNumero && !l.nfNumero) { const n = prompt('Número da nota fiscal (opcional):', ''); if (n) patch.nfNumero = n.trim(); } }
      const up = await Store.uploadFiles(files, { obraId: l.obraId || null, pasta: ehNF ? 'NOTAS FISCAIS' : (l.tipo === 'receita' ? 'COMPROVANTES_PG_CLIENTE' : 'COMPROVANTES'), lancamentoId: l.id, nf: ehNF });
      patch.arquivoIds = [...(l.arquivoIds || []), ...up.map(a => a.id)];
      Store.update('lancamentos', l.id, patch); UI.toast((ehNF ? 'Nota anexada a ' : 'Comprovante anexado a ') + l.id); App.refresh();
    },
    campos(n) { return { nf: true, nfModelo: n.modelo, nfNumero: n.numero, nfEmissao: n.emissao, nfChave: n.chave, nfEmitente: n.emitNome, nfCnpj: n.emitCnpj, nfTomador: n.tomaNome, nfValor: n.valor, nfIss: n.iss, issRetido: n.issRetido, nfInss: n.inss }; },
    importar(c) {
      const { icon } = UI;
      c.innerHTML = `<div class="card"><div class="card-b" style="text-align:center;padding:30px;border:2px dashed var(--line);border-radius:14px" id="nfDrop">
          ${icon('file-up')}<h3>Arraste aqui os XML ou PDF das notas</h3><p class="muted">XML de NF-e, NFS-e (prefeitura) e NFS-e Nacional são lidos sozinhos. PDF e foto: você escolhe o lançamento.</p>
          <label class="btn primary">${icon('upload')} Escolher arquivos<input type="file" id="nfArq" hidden multiple accept=".xml,.pdf,image/*"></label></div></div><div id="nfPrev" class="mt"></div>`;
      const go = fs => this.previa(UI.$('#nfPrev', c), [...fs]);
      UI.$('#nfArq', c).onchange = e => go(e.target.files);
      const dz = UI.$('#nfDrop', c); dz.ondragover = e => { e.preventDefault(); dz.style.borderColor = 'var(--brand)'; }; dz.ondragleave = () => dz.style.borderColor = ''; dz.ondrop = e => { e.preventDefault(); dz.style.borderColor = ''; go(e.dataTransfer.files); };
    },
    async previa(box, files) {
      const { esc, money, date, icon } = UI; const itens = [];
      const xmls = files.filter(f => /\.xml$/i.test(f.name)), outros = files.filter(f => !/\.xml$/i.test(f.name));
      for (const f of xmls) { try { const n = lerXML(await f.text()); const pdf = outros.find(o => n.numero && o.name.includes(n.numero)); itens.push({ f, pdf, n, sent: sentido(n), lanc: acharLanc(n) }); } catch (e) { itens.push({ f, erro: e.message }); } }
      outros.filter(o => !itens.some(i => i.pdf === o)).forEach(f => itens.push({ f, semXml: true }));
      const opcLanc = (tipo, sel) => `<option value="">— criar ${tipo === 'receita' ? 'receita' : 'despesa'} nova —</option>` + Store.where('lancamentos', l => !tipo || l.tipo === tipo).sort((a, b) => (b.dataPagamento || b.vencimento || b.data || '').localeCompare(a.dataPagamento || a.vencimento || a.data || '')).slice(0, 400).map(l => `<option value="${l.id}" ${l.id === sel ? 'selected' : ''}>${l.id} · ${esc(l.descricao).slice(0, 40)} · ${money(l.valor)}${l.nf ? ' · já tem NF' : ''}</option>`).join('');
      const obras = '<option value="">Geral (sem obra)</option>' + Store.all('obras').filter(o => !['Cancelada'].includes(o.status)).map(o => `<option value="${o.id}">${o.id} · ${esc(o.nome)}</option>`).join('');
      box.innerHTML = `<div class="card">${UI.table([{ h: 'Arquivo', f: x => `<b>${esc(x.f.name)}</b>${x.pdf ? `<div class="tiny muted">+ ${esc(x.pdf.name)}</div>` : ''}` },
          { h: 'Nota', f: x => x.erro ? UI.badge(x.erro, 'err') : x.semXml ? '<span class="tiny muted">PDF/foto – escolha o lançamento</span>' : `<b>${esc(x.n.modelo)} ${esc(x.n.numero)}</b> · ${date(x.n.emissao)}<div class="tiny">${esc(x.sent === 'emitida' ? 'para ' + x.n.tomaNome : 'de ' + x.n.emitNome)} · ${money(x.n.valor)}${x.n.issRetido ? ' · ISS retido ' + money(x.n.iss) : ''}${x.n.inss ? ' · INSS ' + money(x.n.inss) : ''}</div><div class="tiny muted">${esc(x.n.desc.slice(0, 90))}</div>` },
          { h: 'Tipo', f: x => x.n ? UI.badge(x.sent === 'emitida' ? 'Emitida (receita)' : 'Recebida (despesa)', x.sent === 'emitida' ? 'ok' : 'err') : '' },
          { h: 'Ligar ao lançamento', f: x => x.erro ? '' : `<select class="select" data-lc="${itens.indexOf(x)}">${opcLanc(x.n ? (x.sent === 'emitida' ? 'receita' : 'despesa') : '', x.lanc && x.lanc.id)}</select>${x.lanc ? `<div class="tiny" style="color:var(--ok)">achado: ${x.lanc.id}</div>` : ''}` },
          { h: 'Obra (se criar)', f: x => x.erro ? '' : `<select class="select" data-ob="${itens.indexOf(x)}">${obras}</select>` }], itens)}
        <div class="card-b row" style="justify-content:flex-end"><button class="btn primary" id="nfOk">${icon('check')} Guardar ${itens.filter(x => !x.erro).length} nota(s)</button></div></div>`;
      UI.$('#nfOk', box).onclick = async () => {
        let n = 0;
        for (const [i, x] of itens.entries()) {
          if (x.erro) continue; const sel = box.querySelector(`[data-lc="${i}"]`).value, ob = box.querySelector(`[data-ob="${i}"]`).value;
          let l = sel ? Store.get('lancamentos', sel) : null;
          if (!l) {
            if (!x.n) { UI.toast(x.f.name + ': escolha o lançamento para o PDF/foto', 'err'); continue; }
            const tipo = x.sent === 'emitida' ? 'receita' : 'despesa'; const cnpj = tipo === 'despesa' ? x.n.emitCnpj : x.n.tomaCnpj, nome = tipo === 'despesa' ? x.n.emitNome : x.n.tomaNome;
            let p = Store.all('pessoas').find(pp => dig(pp.cpf) && dig(pp.cpf) === cnpj);
            if (!p && nome) p = Store.insert('pessoas', { nome, cpf: cnpj, tipo: tipo === 'despesa' ? 'Fornecedor' : 'Cliente', origem: 'nota fiscal' });
            l = Store.insert('lancamentos', { tipo, categoria: tipo === 'receita' ? 'Recebimento etapa com NF' : (x.n.modelo === 'NF-e' ? 'Material' : 'Projetos/Terceiros'), descricao: `${x.n.modelo} ${x.n.numero} – ${(x.n.desc || nome || '').slice(0, 80)}`, valor: x.n.valor, obraId: ob, pessoaId: p ? p.id : '', data: x.n.emissao || hoje(), vencimento: x.n.emissao || hoje(), status: 'pendente', arquivoIds: [] });
          }
          const fs = [x.f]; if (x.pdf) fs.push(x.pdf);
          const up = await Store.uploadFiles(fs, { obraId: l.obraId || ob || null, pasta: 'NOTAS FISCAIS', lancamentoId: l.id, nf: true });
          Store.update('lancamentos', l.id, Object.assign(x.n ? this.campos(x.n) : { nf: true }, { arquivoIds: [...(l.arquivoIds || []), ...up.map(a => a.id)] })); n++;
        }
        UI.toast(n + ' nota(s) guardada(s)'); this.st.tab = 'visao'; App.refresh();
      };
    }
  };
  window.NotasFiscais = { lerXML, sentido };
})();
