/* =========================================================
   FORNECEDORES – quanto se compra de cada um, a pagar, notas, cotações
   ganhas, avaliação (qualidade, prazo, preço, atendimento), documentos com
   validade (contrato, garantia, certidões) e histórico completo.
   Dados extras ficam em pessoa.forn = { categoria, condicao, prazoEntrega, banco,
   contato, avaliacoes:[{data,obraId,qual,prazo,preco,atend,coment,por}], docs:[{nome,tipo,validade,arquivoId}] }
   ========================================================= */
(() => {
  const TIPOS = ['Fornecedor', 'Prestador/Empreiteiro'];
  const hoje = () => UI.today();
  const dig = s => String(s || '').replace(/\D/g, '');
  const fDe = p => Object.assign({ categoria: '', condicao: '', prazoEntrega: '', banco: '', contato: '', avaliacoes: [], docs: [] }, p.forn || {});
  const nota = p => { const a = fDe(p).avaliacoes; if (!a.length) return null; const m = a.map(x => ([x.qual, x.prazo, x.preco, x.atend].filter(v => +v).reduce((s, v, i, arr) => s + v / arr.length, 0))); return m.reduce((s, v) => s + v, 0) / m.length; };
  const estrelas = n => n == null ? '<span class="tiny muted">sem avaliação</span>' : `<span style="color:#f59e0b;letter-spacing:1px">${'★'.repeat(Math.round(n))}${'☆'.repeat(5 - Math.round(n))}</span> <span class="tiny">${UI.num(Math.round(n * 10) / 10)}</span>`;
  function lista() {
    const ids = new Set(Store.all('lancamentos').filter(l => l.tipo === 'despesa' && l.pessoaId).map(l => l.pessoaId));
    return Store.all('pessoas').filter(p => TIPOS.includes(p.tipo) || (ids.has(p.id) && !['Cliente', 'Funcionário', 'Sócio'].includes(p.tipo)));
  }
  function stats(p, de) {
    const L = Store.where('lancamentos', l => l.tipo === 'despesa' && l.pessoaId === p.id);
    const pagos = L.filter(l => l.status === 'pago' && (!de || (l.dataPagamento || l.data || '') >= de));
    const aberto = L.filter(l => l.status !== 'pago');
    const C = Store.all('compras').filter(c => (c.fornecedores || []).some(f => f.pessoaId === p.id));
    const ganhas = C.filter(c => c.escolhido != null && ((c.fornecedores || [])[c.escolhido] || {}).pessoaId === p.id);
    const ult = L.map(l => l.dataPagamento || l.data || '').sort().pop() || '';
    return { L, pagos, total: pagos.reduce((a, l) => a + (+l.valor || 0), 0), aPagar: aberto.reduce((a, l) => a + (+l.valor || 0), 0), vencido: aberto.filter(l => l.vencimento && l.vencimento < hoje()).reduce((a, l) => a + (+l.valor || 0), 0),
      n: pagos.length, comNF: pagos.filter(l => l.nf).length, ult, obras: [...new Set(L.map(l => l.obraId).filter(Boolean))], cats: [...new Set(L.map(l => l.categoria))], cot: C.length, ganhas: ganhas.length };
  }
  const docsAlerta = p => fDe(p).docs.filter(d => d.validade && UI.daysBetween(hoje(), d.validade) <= 30);

  Views.fornecedores = {
    perm: 'financeiro.ver',
    st: { q: '', ord: 'total', periodo: '12' },
    render(el) {
      const { esc, money, icon, date } = UI; const s = this.st; const G = Views.relatorios.graf;
      const de = s.periodo ? Fiscal.addDays(hoje(), -Math.round(+s.periodo * 30.44)) : '';
      const F = lista().map(p => ({ p, k: stats(p, de), n: nota(p) })).filter(x => !s.q || (x.p.nome + ' ' + (x.p.cpf || '') + ' ' + fDe(x.p).categoria).toLowerCase().includes(s.q.toLowerCase()));
      const ord = { total: (a, b) => b.k.total - a.k.total, aPagar: (a, b) => b.k.aPagar - a.k.aPagar, nota: (a, b) => (b.n || 0) - (a.n || 0), nome: (a, b) => a.p.nome.localeCompare(b.p.nome), ult: (a, b) => b.k.ult.localeCompare(a.k.ult) }[s.ord];
      F.sort(ord);
      const tot = F.reduce((a, x) => a + x.k.total, 0); const top3 = F.slice().sort((a, b) => b.k.total - a.k.total).slice(0, 3).reduce((a, x) => a + x.k.total, 0);
      const meses = []; for (let i = 11; i >= 0; i--) meses.push(Enq.addM(hoje().slice(0, 7), -i));
      const porMes = meses.map(m => Store.where('lancamentos', l => l.tipo === 'despesa' && l.status === 'pago' && l.pessoaId && (l.dataPagamento || l.data || '').startsWith(m)).reduce((a, l) => a + (+l.valor || 0), 0));
      const alertas = F.flatMap(x => docsAlerta(x.p).map(d => [x.p, d]));
      el.innerHTML = `<div class="page-head"><div><h1>Fornecedores</h1><p>Compras, contas, notas, avaliações e documentos de cada fornecedor e empreiteiro</p></div>${Auth.can('pessoas') ? `<button class="btn primary" id="foNovo">${icon('plus')} Novo fornecedor</button>` : ''}</div>
        <div class="grid g4">
          <div class="card kpi"><div class="ico">${icon('truck')}</div><div class="lbl">Fornecedores com compra</div><div class="val">${F.filter(x => x.k.n).length}</div><div class="sub">${F.length} cadastrados</div></div>
          <div class="card kpi err"><div class="ico">${icon('shopping-bag')}</div><div class="lbl">Comprado ${s.periodo ? 'em ' + s.periodo + ' meses' : '(tudo)'}</div><div class="val">${UI.moneyK(tot)}</div><div class="sub">top 3 = ${UI.pct(tot ? top3 / tot * 100 : 0, 0)} do total</div></div>
          <div class="card kpi violet"><div class="ico">${icon('receipt')}</div><div class="lbl">A pagar</div><div class="val">${UI.moneyK(F.reduce((a, x) => a + x.k.aPagar, 0))}</div><div class="sub" style="${F.some(x => x.k.vencido) ? 'color:var(--err)' : ''}">vencido ${money(F.reduce((a, x) => a + x.k.vencido, 0))}</div></div>
          <div class="card kpi info"><div class="ico">${icon('file-check')}</div><div class="lbl">Compras com nota fiscal</div><div class="val">${UI.pct(F.reduce((a, x) => a + x.k.n, 0) ? F.reduce((a, x) => a + x.k.comNF, 0) / F.reduce((a, x) => a + x.k.n, 0) * 100 : 0, 0)}</div><div class="sub">${F.reduce((a, x) => a + x.k.n - x.k.comNF, 0)} pagamentos sem NF</div></div>
        </div>
        ${alertas.length ? `<div class="alert warn mt">${icon('file-warning')}<div>${alertas.map(([p, d]) => `<b>${esc(p.nome)}</b>: ${esc(d.nome || d.tipo)} ${d.validade < hoje() ? 'vencido em' : 'vence em'} ${date(d.validade)}`).join(' · ')}</div></div>` : ''}
        <div class="grid g2 mt"><div class="card"><div class="card-h"><h3>Para quem vai o dinheiro</h3></div><div class="card-b">${G.donut(F.filter(x => x.k.total > 0).sort((a, b) => b.k.total - a.k.total).map(x => [x.p.nome.slice(0, 30), x.k.total]), money, 'Comprado') || UI.empty('Sem compras no período.', 'truck')}</div></div>
          <div class="card"><div class="card-h"><h3>Compras com fornecedores – 12 meses</h3></div><div class="card-b">${G.linha(meses.map(m => Calc.mesLabel(m).slice(0, 3)), [{ nome: 'Pago a fornecedores', cor: '#dc2626', vals: porMes }])}</div></div></div>
        <div class="toolbar mt"><input class="input" id="foQ" placeholder="Buscar nome, CNPJ, categoria…" value="${esc(s.q)}" style="min-width:240px">
          <select class="select" id="foP">${[['3', '3 meses'], ['6', '6 meses'], ['12', '12 meses'], ['', 'Todo o período']].map(o => `<option value="${o[0]}" ${o[0] === s.periodo ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>
          <select class="select" id="foO">${[['total', 'Maior valor comprado'], ['aPagar', 'Maior valor a pagar'], ['nota', 'Melhor avaliação'], ['ult', 'Compra mais recente'], ['nome', 'Nome']].map(o => `<option value="${o[0]}" ${o[0] === s.ord ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></div>
        <div class="card">${UI.table([{ h: 'Fornecedor', f: x => `<span class="plink" data-fo="${x.p.id}">${esc(x.p.nome)}</span><div class="tiny muted">${esc(fDe(x.p).categoria || x.k.cats.slice(0, 2).join(', '))}${x.p.cpf ? ' · ' + esc(x.p.cpf) : ''}</div>` },
          { h: 'Comprado', f: x => money(x.k.total) }, { h: 'Pagamentos', f: x => x.k.n }, { h: 'A pagar', f: x => x.k.aPagar ? `<span style="${x.k.vencido ? 'color:var(--err)' : ''}">${money(x.k.aPagar)}</span>` : '—' }, { h: 'Com NF', f: x => x.k.n ? UI.pct(x.k.comNF / x.k.n * 100, 0) : '—' },
          { h: 'Cotações', f: x => x.k.cot ? `${x.k.ganhas}/${x.k.cot} ganhas` : '—' }, { h: 'Obras', f: x => x.k.obras.length }, { h: 'Última', f: x => date(x.k.ult) }, { h: 'Avaliação', f: x => estrelas(x.n) }], F, { emptyMsg: 'Nenhum fornecedor. Cadastre em "Novo fornecedor" ou em Clientes e equipe (tipo Fornecedor).' })}</div>`;
      UI.$('#foQ', el).onchange = e => { s.q = e.target.value; App.refresh(); };
      UI.$('#foP', el).onchange = e => { s.periodo = e.target.value; App.refresh(); };
      UI.$('#foO', el).onchange = e => { s.ord = e.target.value; App.refresh(); };
      const nb = UI.$('#foNovo', el); if (nb) nb.onclick = () => this.editar();
      UI.$$('[data-fo]', el).forEach(b => b.onclick = () => this.abrir(b.dataset.fo));
    },
    async editar(id) {
      const p = id ? Store.get('pessoas', id) : { tipo: 'Fornecedor' }; const f = fDe(p);
      const d = await UI.formModal({ title: id ? 'Fornecedor ' + id : 'Novo fornecedor', wide: true, values: Object.assign({ nome: p.nome, cpf: p.cpf, telefone: p.telefone, email: p.email, tipo: p.tipo, endereco: p.endereco }, f), list: [
        { k: 'nome', l: 'Razão social / nome', req: 1, full: 1 }, { k: 'cpf', l: 'CNPJ / CPF' }, { k: 'tipo', l: 'Tipo', t: 'select', o: TIPOS, blank: false }, { k: 'categoria', l: 'O que fornece (material, elétrica, locação…)' },
        { k: 'contato', l: 'Pessoa de contato' }, { k: 'telefone', l: 'Telefone' }, { k: 'email', l: 'E-mail', t: 'email' }, { k: 'endereco', l: 'Endereço', full: 1 },
        { k: 'condicao', l: 'Condição de pagamento (ex.: 30/60, à vista 5%)' }, { k: 'prazoEntrega', l: 'Prazo de entrega habitual' }, { k: 'banco', l: 'PIX / banco', full: 1 }] });
      if (!d) return; const base = { nome: d.nome, cpf: d.cpf, telefone: d.telefone, email: d.email, tipo: d.tipo, endereco: d.endereco }; ['nome', 'cpf', 'telefone', 'email', 'tipo', 'endereco'].forEach(k => delete d[k]);
      const r = id ? Store.update('pessoas', id, Object.assign(base, { forn: Object.assign(f, d) })) : Store.insert('pessoas', Object.assign(base, { forn: Object.assign(f, d) }));
      UI.toast('Salvo: ' + r.id); App.refresh(); return r;
    },
    abrir(id) {
      const { esc, money, date, icon } = UI; const p = Store.get('pessoas', id); const f = fDe(p); const k = stats(p, ''); const G = Views.relatorios.graf;
      const cat = {}; k.pagos.forEach(l => cat[l.categoria] = (cat[l.categoria] || 0) + (+l.valor || 0));
      const m = UI.modal({ title: esc(p.nome), wide: true, body: `
        <div class="grid g4 mb">${[['Comprado (total)', money(k.total)], ['A pagar', money(k.aPagar)], ['Pagamentos', k.n + ' · ' + (k.n ? UI.pct(k.comNF / k.n * 100, 0) : '0%') + ' com NF'], ['Avaliação', estrelas(nota(p))]].map(x => `<div class="card kpi"><div class="lbl">${x[0]}</div><div class="val" style="font-size:18px">${x[1]}</div></div>`).join('')}</div>
        <div class="grid g2"><div><div class="tiny muted">Dados</div><div>${esc(p.cpf || '')} · ${esc(p.telefone || '')} · ${esc(p.email || '')}</div><div class="tiny">${esc(f.categoria)} · contato ${esc(f.contato || '—')} · pagamento ${esc(f.condicao || '—')} · entrega ${esc(f.prazoEntrega || '—')}</div><div class="tiny">PIX/banco: ${esc(f.banco || '—')}</div>
          <div class="mt">${G.donut(Object.entries(cat).sort((a, b) => b[1] - a[1]), money, 'Por categoria')}</div></div>
          <div><div class="row" style="justify-content:space-between"><b>Avaliações</b><button class="btn sm" id="foAv">${icon('star')} Avaliar</button></div>
            ${f.avaliacoes.length ? f.avaliacoes.slice().reverse().slice(0, 6).map(a => `<div style="border-bottom:1px solid var(--line);padding:5px 0"><div class="tiny">${date(a.data)} · ${esc(a.obraId || '')} · ${esc(a.por || '')}</div><div class="tiny">Qualidade ${a.qual || '-'} · Prazo ${a.prazo || '-'} · Preço ${a.preco || '-'} · Atendimento ${a.atend || '-'}</div>${a.coment ? `<div>${esc(a.coment)}</div>` : ''}</div>`).join('') : '<p class="tiny muted">Nenhuma avaliação ainda.</p>'}
            <div class="row mt" style="justify-content:space-between"><b>Documentos (contrato, garantia, certidões)</b><label class="btn sm">${icon('upload')} Enviar<input type="file" id="foDoc" hidden multiple></label></div>
            ${f.docs.length ? f.docs.map((d, i) => `<div class="file">${icon('paperclip')}<span class="nm">${esc(d.nome)} <span class="tiny muted">${esc(d.tipo || '')}${d.validade ? ' · válido até ' + date(d.validade) : ''}</span></span>${d.validade && d.validade < hoje() ? UI.badge('vencido', 'err') : ''}${d.arquivoId ? `<button class="btn ghost sm" data-ab="${d.arquivoId}">${icon('external-link')}</button>` : ''}</div>`).join('') : '<p class="tiny muted">Nenhum documento.</p>'}</div></div>
        <h3 class="mt">Histórico de pagamentos</h3>${UI.table([{ h: 'ID', f: l => UI.idLink(l.id) }, { h: 'Data', f: l => date(l.dataPagamento || l.vencimento || l.data) }, { h: 'Descrição', f: l => esc(l.descricao) + (l.nf ? ' · <b>NF</b> ' + esc(l.nfNumero || '') : '') }, { h: 'Obra', f: l => l.obraId ? UI.idLink(l.obraId) : 'Geral' }, { h: 'Situação', f: l => l.status === 'pago' ? UI.badge('Pago', 'ok') : UI.badge(l.vencimento && l.vencimento < hoje() ? 'Vencido' : 'A pagar', l.vencimento && l.vencimento < hoje() ? 'err' : 'warn') }, { h: 'Valor', f: l => money(l.valor) }], k.L.slice().sort((a, b) => (b.dataPagamento || b.vencimento || b.data || '').localeCompare(a.dataPagamento || a.vencimento || a.data || '')), { emptyMsg: 'Sem lançamentos.' })}`,
        footer: `<button class="btn" data-close>Fechar</button>${Auth.can('pessoas') ? `<button class="btn" id="foEd">${icon('pencil')} Editar dados</button>` : ''}${Auth.can('financeiro.editar') ? `<button class="btn primary" id="foDesp">${icon('plus')} Nova despesa</button>` : ''}` });
      const ed = m.$('#foEd'); if (ed) ed.onclick = async () => { m.close(); await this.editar(id); this.abrir(id); };
      const dp = m.$('#foDesp'); if (dp) dp.onclick = () => { m.close(); Views.financeiro.edit(null, { tipo: 'despesa', pessoaId: id, categoria: (k.cats[0] || '') }); };
      m.el.querySelectorAll('[data-ab]').forEach(b => b.onclick = () => Store.openFile(b.dataset.ab));
      m.$('#foAv').onclick = async () => {
        const n = [['5', '5 – ótimo'], ['4', '4 – bom'], ['3', '3 – regular'], ['2', '2 – ruim'], ['1', '1 – péssimo']];
        const d = await UI.formModal({ title: 'Avaliar ' + esc(p.nome), values: { data: hoje() }, list: [{ k: 'obraId', l: 'Obra', t: 'select', o: () => Store.all('obras').map(o => [o.id, o.id + ' · ' + o.nome]) }, { k: 'data', l: 'Data', t: 'date' },
          { k: 'qual', l: 'Qualidade', t: 'select', o: n }, { k: 'prazo', l: 'Prazo de entrega', t: 'select', o: n }, { k: 'preco', l: 'Preço', t: 'select', o: n }, { k: 'atend', l: 'Atendimento', t: 'select', o: n }, { k: 'coment', l: 'Comentário', t: 'textarea', full: 1 }] });
        if (!d) return; ['qual', 'prazo', 'preco', 'atend'].forEach(x => d[x] = +d[x] || 0); d.por = (Auth.current() || {}).nome || '';
        f.avaliacoes.push(d); Store.update('pessoas', id, { forn: f }); m.close(); this.abrir(id); UI.toast('Avaliação salva');
      };
      m.$('#foDoc').onchange = async e => {
        const fs = [...e.target.files]; if (!fs.length) return;
        const info = await UI.formModal({ title: 'Documento do fornecedor', values: { tipo: 'Contrato' }, list: [{ k: 'tipo', l: 'Tipo', t: 'select', o: ['Contrato', 'Garantia', 'Certidão negativa', 'Proposta', 'Nota fiscal', 'Outro'], blank: false }, { k: 'validade', l: 'Válido até', t: 'date' }] });
        if (!info) return; const up = await Store.uploadFiles(fs, { pessoaId: id, pasta: 'FORNECEDORES' });
        up.forEach(a => f.docs.push({ nome: a.nome, tipo: info.tipo, validade: info.validade || '', arquivoId: a.id })); Store.update('pessoas', id, { forn: f }); m.close(); this.abrir(id); UI.toast('Documento guardado');
      };
    }
  };
})();
