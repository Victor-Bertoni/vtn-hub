/* =========================================================
   CENTRAL DE RELATÓRIOS
   Financeiro, marketing/comercial, operacional, fiscal e
   executivo. Cada relatório pode ser "enviado" para a central
   (arquivo permanente no navegador) – manualmente ou de forma
   automática (fechamento mensal e alertas de enquadramento).
   ========================================================= */
Views.relatorios = {
  perm: 'relatorios',
  st: { tab: 'central', tipo: 'executivo', obra: '', de: '', ate: '', cat: '', q: '' },
  CATS: {
    executivo: { nome: 'Executivo', icon: 'crown', cor: '#119a09', desc: 'Resumo do mês para os sócios' },
    financeiro: { nome: 'Financeiro', icon: 'wallet', cor: '#16a34a', desc: 'DRE, caixa, recebíveis e rentabilidade' },
    marketing: { nome: 'Marketing e comercial', icon: 'megaphone', cor: '#db2777', desc: 'Funil, conversão, canais e clientes' },
    operacional: { nome: 'Operacional', icon: 'hard-hat', cor: '#2563eb', desc: 'Obras, medições, pendências e agenda' },
    fiscal: { nome: 'Fiscal e enquadramento', icon: 'landmark', cor: '#7c3aed', desc: 'Impostos, obrigações, porte e Simples' }
  },
  /* [id, nome, categoria, descrição] */
  TIPOS: [
    ['executivo', 'Resumo executivo do mês', 'executivo', 'Receita, lucro, caixa, obras, comercial e alertas em uma página.'],
    ['financeiro', 'Financeiro / DRE por período', 'financeiro', 'Receitas e despesas por categoria, resultado mensal.'],
    ['fluxo', 'Fluxo de caixa e projeção', 'financeiro', '12 meses realizados + 6 meses a receber/pagar.'],
    ['rentabilidade', 'Rentabilidade por obra', 'financeiro', 'Ranking de lucro e margem de cada obra.'],
    ['recebiveis', 'Contas a receber e a pagar', 'financeiro', 'Em aberto, com dias de atraso.'],
    ['carteira', 'Carteira de obras', 'financeiro', 'Todas as obras com físico, contrato, recebido e lucro.'],
    ['cno', 'Movimentação CNO (receitas NF × despesas)', 'financeiro', 'Texto pronto para a contabilidade.'],
    ['marketing', 'Marketing e vendas', 'marketing', 'Leads, conversão, ticket médio, canais, cidades e serviços.'],
    ['funil', 'Funil comercial e orçamentos', 'marketing', 'Quantidade e valor por etapa do funil.'],
    ['clientes', 'Base de clientes', 'marketing', 'Top clientes, recorrência e distribuição por cidade.'],
    ['obra', 'Relatório completo da obra', 'operacional', 'Indicadores, etapas, medições, financeiro e pendências.'],
    ['pendencias', 'Pendências, entregas e OS', 'operacional', 'Tudo que está em aberto e com quem.'],
    ['medicoes', 'Medições e evolução', 'operacional', 'Medições CAIXA e avanço acumulado.'],
    ['agenda', 'Agenda 30 dias + feriados', 'operacional', 'Compromissos, vencimentos e feriados.'],
    ['enquadramento', 'Enquadramento e Simples', 'fiscal', 'Porte ME/EPP, faixa, Fator R, projeção e o que muda.'],
    ['impostos', 'Impostos e obrigações (ano)', 'fiscal', 'DAS estimado mês a mês e calendário de obrigações.']
  ],
  catDe(t) { return (this.TIPOS.find(x => x[0] === t) || [])[2] || 'executivo'; },
  nomeDe(t) { return (this.TIPOS.find(x => x[0] === t) || [])[1] || t; },

  render(el, tab) {
    const { icon, esc } = UI; const s = this.st; if (tab) s.tab = tab;
    const R = Central.lista(); const d30 = Fiscal.addDays(UI.today(), -30);
    const T = [['central', 'Central', 'layout-grid'], ['arquivo', `Enviados (${R.length})`, 'inbox'], ['gerar', 'Visualizar e imprimir', 'printer'], ['auto', 'Envio automático', 'bot']];
    el.innerHTML = `
      <div class="hero hero-rel"><div><div class="hero-kicker">${icon('file-bar-chart')} Central de relatórios</div><h1>Todos os relatórios em um só lugar</h1>
        <p>Financeiro, marketing, operacional, fiscal e executivo – gere, envie para a central, imprima ou baixe. O fechamento do mês chega aqui sozinho.</p></div>
        <div class="hero-side"><div><span>Na central</span><b>${R.length}</b><small>relatórios guardados</small></div>
          <div><span>Últimos 30 dias</span><b>${R.filter(r => r.data >= d30).length}</b><small>${R.filter(r => r.origem === 'automático').length} automáticos</small></div>
          <div><span>Último envio</span><b>${R[0] ? UI.date(R[0].data.slice(0, 10)) : '—'}</b><small>${R[0] ? esc(this.nomeDe(R[0].tipo)) : ''}</small></div></div></div>
      <div class="pill-tabs">${T.map(t => `<button class="${t[0] === s.tab ? 'active' : ''}" data-t="${t[0]}">${icon(t[2])} ${t[1]}</button>`).join('')}
        <button class="btn sm primary" id="pac" style="margin-left:auto">${icon('send')} Enviar pacote do mês</button></div>
      <div id="rc"></div>`;
    UI.$$('[data-t]', el).forEach(b => b.onclick = () => { s.tab = b.dataset.t; App.refresh(); });
    UI.$('#pac', el).onclick = async () => { const n = await Central.pacote(UI.today().slice(0, 7), 'manual'); UI.toast(n + ' relatórios enviados para a central'); s.tab = 'arquivo'; App.refresh(); };
    this['t_' + s.tab](UI.$('#rc', el));
  },

  t_central(c) {
    const { icon, esc } = UI; const R = Central.lista();
    c.innerHTML = Object.entries(this.CATS).map(([k, cat]) => `<div class="rel-sec"><div class="rel-sec-h"><div class="rel-ico" style="--c:${cat.cor}">${icon(cat.icon)}</div><div><h2>${cat.nome}</h2><p class="muted tiny">${cat.desc} · ${R.filter(r => r.categoria === k).length} na central</p></div></div>
      <div class="grid g3">${this.TIPOS.filter(t => t[2] === k).map(t => { const ult = R.find(r => r.tipo === t[0]); return `<div class="card rel-card" style="--c:${cat.cor}"><div class="card-b">
        <h3>${esc(t[1])}</h3><p class="muted tiny">${esc(t[3])}</p>
        <div class="tiny muted">${ult ? 'Último: ' + UI.date(ult.data.slice(0, 10)) + ' · ' + esc(ult.origem) : 'Ainda não enviado'}</div>
        <div class="row mt"><button class="btn sm" data-ver="${t[0]}">${icon('eye')} Visualizar</button><button class="btn sm primary" data-env="${t[0]}">${icon('send')} Enviar à central</button></div></div></div>`; }).join('')}</div></div>`).join('');
    UI.$$('[data-ver]', c).forEach(b => b.onclick = () => { this.st.tipo = b.dataset.ver; this.st.tab = 'gerar'; App.refresh(); });
    UI.$$('[data-env]', c).forEach(b => b.onclick = async () => { await Central.enviar(b.dataset.env, { origem: 'manual', obra: this.st.obra, de: this.st.de, ate: this.st.ate }); UI.toast('Enviado para a central: ' + this.nomeDe(b.dataset.env)); App.refresh(); });
  },

  t_arquivo(c) {
    const { icon, esc } = UI; const s = this.st;
    const R = Central.lista().filter(r => (!s.cat || r.categoria === s.cat) && (!s.q || (r.titulo + ' ' + r.periodo).toLowerCase().includes(s.q.toLowerCase())));
    c.innerHTML = `<div class="toolbar"><input class="input" id="aq" placeholder="Buscar na central…" value="${esc(s.q)}" style="min-width:240px">
      <button class="btn sm ${!s.cat ? 'primary' : ''}" data-c="">Todos</button>${Object.entries(this.CATS).map(([k, v]) => `<button class="btn sm ${s.cat === k ? 'primary' : ''}" data-c="${k}">${icon(v.icon)} ${v.nome}</button>`).join('')}</div>
      ${R.length ? `<div class="stack">${R.map(r => { const cat = this.CATS[r.categoria] || this.CATS.executivo; return `<div class="card rel-row" style="--c:${cat.cor}"><div class="rel-ico" style="--c:${cat.cor}">${icon(cat.icon)}</div>
        <div style="flex:1;min-width:0"><b>${esc(r.titulo)}</b><div class="tiny muted">${UI.dateTime(r.data)} · ${esc(cat.nome)} · ${esc(r.periodo)} · ${UI.badge(r.origem, r.origem === 'automático' ? 'violet' : '')}</div></div>
        <div class="row"><button class="btn sm" data-a="ver" data-id="${r.id}">${icon('eye')} Abrir</button><button class="btn sm" data-a="pr" data-id="${r.id}">${icon('printer')}</button><button class="btn sm" data-a="dl" data-id="${r.id}">${icon('download')}</button><button class="btn sm ghost" data-a="rm" data-id="${r.id}">${icon('trash-2')}</button></div></div>`; }).join('')}</div>`
        : UI.empty('Nenhum relatório na central com esse filtro. Use "Enviar à central" ou "Enviar pacote do mês".', 'inbox')}`;
    UI.$('#aq', c).onchange = e => { s.q = e.target.value; App.refresh(); };
    UI.$$('[data-c]', c).forEach(b => b.onclick = () => { s.cat = b.dataset.c; App.refresh(); });
    UI.$$('[data-a]', c).forEach(b => b.onclick = async () => {
      const id = b.dataset.id, r = Central.lista().find(x => x.id === id); const html = await Central.html(id);
      if (b.dataset.a === 'ver') { const m = UI.modal({ title: r.titulo, wide: true, body: `<iframe class="rel-frame"></iframe>`, footer: `<button class="btn" data-close>Fechar</button><button class="btn primary" id="mpr">${icon('printer')} Imprimir / PDF</button>` }); m.el.querySelector('iframe').srcdoc = Central.pagina(html, r.titulo); m.el.querySelector('#mpr').onclick = () => UI.print(html, r.titulo); UI.icons(); }
      if (b.dataset.a === 'pr') UI.print(html, r.titulo);
      if (b.dataset.a === 'dl') UI.download(r.titulo.replace(/[^\w\-À-ú ]+/g, '').slice(0, 80) + '.html', Central.pagina(html, r.titulo), 'text/html');
      if (b.dataset.a === 'rm' && await UI.confirm('Remover este relatório da central?', 'Remover')) { Central.remover(id); App.refresh(); }
    });
  },

  t_gerar(c) {
    const { icon, esc } = UI; const s = this.st;
    if (!s.obra) s.obra = (Store.all('obras')[0] || {}).id || '';
    c.innerHTML = `<div class="toolbar"><select class="select" id="rt">${Object.entries(this.CATS).map(([k, v]) => `<optgroup label="${v.nome}">${this.TIPOS.filter(t => t[2] === k).map(t => `<option value="${t[0]}" ${t[0] === s.tipo ? 'selected' : ''}>${t[1]}</option>`).join('')}</optgroup>`).join('')}</select>
        <select class="select" id="ro"><option value="">Todas as obras</option>${Store.all('obras').map(o => `<option value="${o.id}" ${o.id === s.obra ? 'selected' : ''}>${o.id} · ${esc(o.nome)}</option>`).join('')}</select>
        <label class="tiny muted">De</label><input type="date" class="input" id="rde" value="${s.de}"><label class="tiny muted">até</label><input type="date" class="input" id="rate" value="${s.ate}">
        <button class="btn primary" id="renv" style="margin-left:auto">${icon('send')} Enviar à central</button><button class="btn" id="rp">${icon('printer')} Imprimir / PDF</button><button class="btn" id="rh">${icon('download')} Baixar</button></div>
      <div class="doc" id="rdoc">${this.html()}</div>`;
    const re = () => App.refresh();
    UI.$('#rt', c).onchange = e => { s.tipo = e.target.value; re(); };
    UI.$('#ro', c).onchange = e => { s.obra = e.target.value; re(); };
    UI.$('#rde', c).onchange = e => { s.de = e.target.value; re(); };
    UI.$('#rate', c).onchange = e => { s.ate = e.target.value; re(); };
    UI.$('#renv', c).onclick = async () => { await Central.enviar(s.tipo, { origem: 'manual', obra: s.obra, de: s.de, ate: s.ate }); UI.toast('Enviado para a central'); };
    UI.$('#rp', c).onclick = () => UI.print(UI.$('#rdoc').innerHTML, 'Relatório');
    UI.$('#rh', c).onclick = () => UI.download('relatorio-' + s.tipo + '.html', Central.pagina(UI.$('#rdoc').innerHTML, this.nomeDe(s.tipo)), 'text/html');
  },

  t_auto(c) {
    const { icon, esc } = UI; const a = Central.cfg();
    c.innerHTML = `<div class="grid g2"><div class="card"><div class="card-h"><h3>Envio automático para a central</h3></div><div class="card-b stack">
      <label class="check"><input type="checkbox" id="au1" ${a.mensal ? 'checked' : ''}> Fechamento mensal: no 1º acesso de cada mês, gerar os relatórios do mês anterior</label>
      <div class="tiny muted">Relatórios do fechamento:</div>
      <div class="grid g2">${this.TIPOS.filter(t => t[0] !== 'obra').map(t => `<label class="check"><input type="checkbox" data-tp="${t[0]}" ${a.tipos.includes(t[0]) ? 'checked' : ''}> ${esc(t[1])}</label>`).join('')}</div>
      <label class="check"><input type="checkbox" id="au2" ${a.enquadramento ? 'checked' : ''}> Gerar relatório sempre que o enquadramento (porte, faixa, anexo) mudar</label>
      <button class="btn primary" id="ausv">${icon('save')} Salvar</button></div></div>
      <div class="card"><div class="card-h"><h3>Como funciona</h3></div><div class="card-b tiny"><ul>
        <li>"Enviar à central" congela o relatório como está naquele momento – fica guardado mesmo que os dados mudem depois.</li>
        <li>Os relatórios ficam guardados neste navegador (Edge). Use Configurações → Exportar backup para levar a outro computador.</li>
        <li>Cada relatório pode ser aberto, impresso em PDF ou baixado como página para mandar por e-mail/WhatsApp.</li>
        <li>Último fechamento automático: <b>${esc(a.ultimo || 'nenhum ainda')}</b>.</li></ul></div></div></div>`;
    UI.$('#ausv', c).onclick = () => { Central.salvarCfg({ mensal: UI.$('#au1', c).checked, enquadramento: UI.$('#au2', c).checked, tipos: UI.$$('[data-tp]', c).filter(x => x.checked).map(x => x.dataset.tp) }); UI.toast('Envio automático salvo'); };
  },

  obra(id) { UI.print(this.html({ tipo: 'obra', obra: id }), 'Relatório ' + id); },
  html(o) {
    const s = Object.assign({}, this.st, o || {});
    return this.CSS + '<div class="rp">' + this.corpo(s) + this.rfoot() + '</div>';
  },
  conv(O) { const fech = O.filter(o => !['Prospecção', 'Orçamento'].includes(o.status)); const g = fech.filter(o => o.status !== 'Cancelada').length; return fech.length ? g / fech.length * 100 : 0; },
  CSS: '<style>.rp{font-family:Inter,\'Segoe UI\',Arial,sans-serif;color:#0f172a;font-size:12.5px;line-height:1.55;counter-reset:sec}.rp-top{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;background:#fff;color:#0f172a;padding:0 0 12px;margin-bottom:22px;border-bottom:3px solid #18c20e;position:relative}.rp-top:after{content:\'\';position:absolute;left:0;right:0;bottom:-7px;height:1px;background:#b9efb3}.rp-logo-img{height:64px;display:block}.rp-brand{display:flex;gap:12px;align-items:center}.rp-logo{width:46px;height:46px;flex:none;border-radius:11px;background:linear-gradient(135deg,#18c20e,#7be06f);display:grid;place-items:center;font-weight:800;font-size:14px;color:#fff;letter-spacing:.5px}.rp-brand b{display:block;font-size:11px;letter-spacing:.02em;color:#0f172a}.rp-brand span{display:block;font-size:9.5px;color:#64748b;line-height:1.45}.rp-meta{text-align:right;display:flex;flex-direction:column;justify-content:center;gap:2px;font-size:10px;color:#475569;white-space:nowrap}.rp-kind{font-size:12px;font-weight:800;letter-spacing:.09em;color:#119a09}.rp-no{font-family:Consolas,monospace;color:#0f172a}.doc .rp h1,.rp h1{font-family:inherit;font-size:21px;text-align:left;margin:0;letter-spacing:-.015em;color:#0f172a}.rp h1:after{content:\'\';display:block;width:56px;height:3px;background:#18c20e;border-radius:3px;margin:9px 0 14px}.doc .rp h2,.rp h2{counter-increment:sec;font-family:inherit;font-size:11.5px;text-transform:uppercase;letter-spacing:.07em;color:#1e293b;margin:24px 0 9px;padding-bottom:6px;border-bottom:1px solid #e2e8f0}.rp h2:before{content:counter(sec,decimal-leading-zero) \'  \';color:#18c20e;font-weight:800}.doc .rp table,.rp table{width:100%;border-collapse:collapse;margin:6px 0 12px;font-family:inherit;font-size:11.2px}.doc .rp th,.rp th{background:#f1f5f9;color:#334155;font-weight:700;text-transform:uppercase;font-size:9.5px;letter-spacing:.05em;text-align:left;padding:7px 8px;border:0;border-bottom:2px solid #cbd5e1;-webkit-print-color-adjust:exact;print-color-adjust:exact}.doc .rp td,.rp td{padding:6px 8px;border:0;border-bottom:1px solid #e9eef5;vertical-align:top}.rp tbody tr:nth-child(even) td{background:#f8fafc;-webkit-print-color-adjust:exact;print-color-adjust:exact}.doc .rp td.n,.rp td.n,.doc .rp th.n,.rp th.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.rp tfoot td{font-weight:800;border-top:2px solid #0f172a!important;background:#fff!important}.rp .neg{color:#b91c1c}.rp .pos{color:#15803d}.rk{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:10px 0 6px}.rk div{border:1px solid #e2e8f0;border-top:3px solid #18c20e;border-radius:10px;padding:9px 11px;background:#fff}.rk div:nth-child(2){border-top-color:#2563eb}.rk div:nth-child(3){border-top-color:#16a34a}.rk div:nth-child(4){border-top-color:#7c3aed}.rk span{display:block;font-size:9.5px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;font-weight:700}.rk b{display:block;font-size:16.5px;color:#0f172a;margin-top:2px;font-variant-numeric:tabular-nums;letter-spacing:-.01em}.rk small{font-size:10px;color:#64748b}.rp .hl{background:#effdf0;border:1px solid #b9efb3;border-left:4px solid #18c20e;border-radius:10px;padding:10px 14px;margin:10px 0;-webkit-print-color-adjust:exact;print-color-adjust:exact}.rp .hl b{color:#0f6b09}.rp .hl ul{margin:6px 0 0;padding-left:18px}.rbars{font-size:11px;margin:8px 0}.rb{display:grid;grid-template-columns:200px 1fr 110px;gap:10px;align-items:center;margin:5px 0}.rb span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#334155}.rb div{background:#eef2f7;border-radius:99px;height:10px;overflow:hidden}.rb i{display:block;height:100%;border-radius:99px;-webkit-print-color-adjust:exact;print-color-adjust:exact}.rb b{text-align:right;font-variant-numeric:tabular-nums}.rcols{margin:6px 0 10px;-webkit-print-color-adjust:exact;print-color-adjust:exact}.rp .tiny{font-size:10px;color:#64748b}.rp-foot{margin-top:30px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:12px;font-size:9px;color:#64748b}.rp .sig{margin-top:44px;display:grid;grid-template-columns:1fr 1fr;gap:36px;font-size:11px;text-align:center}.rp .sig div{border-top:1px solid #334155;padding-top:6px}@media print{.rp h2{break-after:avoid}.rp table,.rk,.rcols,.rbars,.hl{break-inside:avoid}.rp-top{border-radius:0}}@media(max-width:640px){.rk{grid-template-columns:1fr 1fr}.rb{grid-template-columns:100px 1fr 80px}.rp-top{flex-direction:column}.rp-meta{text-align:left}}</style>',
  rhead(tipo, sub) {
    const e = Store.db.empresa, { esc } = UI; const agora = new Date();
    const no = 'VTN-' + agora.getFullYear() + String(agora.getMonth() + 1).padStart(2, '0') + String(agora.getDate()).padStart(2, '0') + '-' + String(agora.getHours()).padStart(2, '0') + String(agora.getMinutes()).padStart(2, '0');
    return `<div class="rp-top"><div class="rp-brand">${window.VTN_LOGO ? `<img class="rp-logo-img" src="${VTN_LOGO}" alt="VTN">` : '<div class="rp-logo">VTN</div>'}<div><b>${esc(e.nome)}</b><span>CNPJ ${esc(e.cnpj)}${e.crea ? ' · ' + esc(e.crea) : ''}</span><span>${esc(e.endereco || '')}</span><span>${esc(e.telefone || '')} · ${esc(e.email || '')}</span></div></div>
      <div class="rp-meta"><span class="rp-kind">${esc(tipo)}</span><span>${esc(sub || '')}</span><span>Emitido em ${UI.date(UI.today())} às ${agora.toTimeString().slice(0, 5)}</span><span class="rp-no">Nº ${no}</span></div></div>`;
  },
  rfoot() { const e = Store.db.empresa; return `<div class="rp-foot"><span>${UI.esc(e.fantasia || e.nome)} · ${UI.esc(e.representante || '')}</span><span>Documento gerado pelo VTN Hub · uso interno · valores fiscais são estimativas a confirmar com a contabilidade</span></div>`; },
  corpo(s) {
    const { esc, money, pct, date } = UI;
    const periodo = s.de || s.ate ? `Período: ${date(s.de) || 'início'} a ${date(s.ate) || 'hoje'}` : 'Período: todo o histórico';
    const isN = c => /^[−-]?\s*(R\$\s?)?[−-]?[\d.]+(,\d+)?\s*(%|dias|x)?$/.test(UI.strip(c));
    const cellCls = c => { const t = UI.strip(c); return isN(c) ? (/^[−-]/.test(t) || /R\$\s?[−-]/.test(t) ? 'n neg' : 'n') : ''; };
    const tbl = (h, rows, foot) => `<table><thead><tr>${h.map((x, i) => `<th class="${rows[0] && isN(rows[0][i]) ? 'n' : ''}">${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td class="${cellCls(c)}">${c}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${h.length}">Nenhum registro.</td></tr>`}</tbody>${foot ? `<tfoot><tr>${foot.map(c => `<td class="${isN(c) ? 'n' : ''}">${c}</td>`).join('')}</tr></tfoot>` : ''}</table>`;
    const soma = (rows, i) => rows.reduce((a, r) => a + (UI.parseNum(UI.strip(r[i])) || 0), 0);
    const kp = arr => `<div class="rk">${arr.map(x => `<div><span>${x[0]}</span><b>${x[1]}</b>${x[2] ? `<small>${x[2]}</small>` : ''}</div>`).join('')}</div>`;
    const bars = (items, cor = '#119a09', fmt = money) => { const mx = Math.max(1, ...items.map(i => i[1])); return `<div class="rbars">${items.map(i => `<div class="rb"><span>${esc(i[0])}</span><div><i style="width:${(i[1] / mx * 100).toFixed(1)}%;background:${cor}"></i></div><b>${fmt(i[1])}</b></div>`).join('') || '<p>—</p>'}</div>`; };
    const cols = (labels, series, h = 170) => { const vals = series.flatMap(x => x.vals.map(v => Math.max(0, v))); const mx = Math.max(1, ...vals) * 1.12; const W = 680, L = 52, bw = (W - L) / Math.max(1, labels.length); const n = series.length;
      const fmtA = v => v >= 1000 ? 'R$ ' + UI.num(Math.round(v / 100) / 10) + 'k' : UI.num(Math.round(v));
      const lbl = v => !v ? '' : v >= 1000 ? UI.num(Math.round(v / 100) / 10) + 'k' : UI.num(Math.round(v));
      return `<svg class="rcols" viewBox="0 0 ${W} ${h + 40}" width="100%" font-family="Inter,Arial,sans-serif">${[0, 0.25, 0.5, 0.75, 1].map(f => `<line x1="${L}" x2="${W}" y1="${h - h * f / 1.12}" y2="${h - h * f / 1.12}" stroke="${f ? '#e2e8f0' : '#94a3b8'}" stroke-dasharray="${f ? '3 3' : ''}"/><text x="${L - 6}" y="${h - h * f / 1.12 + 3}" font-size="9" text-anchor="end" fill="#64748b">${fmtA(mx / 1.12 * f)}</text>`).join('')}
        ${labels.map((l, i) => series.map((s2, j) => { const v = Math.max(0, s2.vals[i] || 0); const bh = v / mx * h; const w = Math.min(34, (bw - 10) / n); const x = L + i * bw + (bw - w * n) / 2 + j * w; return `<rect x="${x}" y="${h - bh}" width="${w - 2}" height="${bh}" rx="3" fill="${s2.cor}"/>${n === 1 && v ? `<text x="${x + (w - 2) / 2}" y="${h - bh - 4}" font-size="8.5" text-anchor="middle" fill="#334155">${lbl(v)}</text>` : ''}`; }).join('') + `<text x="${L + i * bw + bw / 2}" y="${h + 14}" font-size="9.5" text-anchor="middle" fill="#475569">${UI.esc(l)}</text>`).join('')}
        ${series.map((s2, j) => `<rect x="${L + j * 130}" y="${h + 26}" width="10" height="10" rx="3" fill="${s2.cor}"/><text x="${L + j * 130 + 15}" y="${h + 35}" font-size="10" fill="#334155">${UI.esc(s2.nome)}</text>`).join('')}</svg>`; };
    const inP = d => (!s.de || d >= s.de) && (!s.ate || d <= s.ate);
    const o = Store.get('obras', s.obra);
    if (s.tipo === 'obra') {
      if (!o) return '<p>Selecione uma obra.</p>';
      const m = Calc.obra(o);
      const ets = Store.where('etapas', e => e.obraId === o.id).sort((a, b) => a.ordem - b.ordem);
      const meds = Store.where('medicoes', x => x.obraId === o.id).sort((a, b) => a.data.localeCompare(b.data));
      const ls = Store.where('lancamentos', l => l.obraId === o.id && inP(l.dataPagamento || l.vencimento || l.data)).sort((a, b) => (a.dataPagamento || a.data).localeCompare(b.dataPagamento || b.data));
      const pend = Store.where('pendencias', p => p.obraId === o.id && p.status !== 'Resolvida');
      const ent = Store.where('entregas', e => e.obraId === o.id);
      return `${this.rhead('RELATÓRIO DE OBRA', o.id + ' · emitido em ' + date(UI.today()))}
        <h1>${esc(o.nome)}</h1>
        <table><tbody><tr><th>Cliente(s)</th><td>${(o.clienteIds || []).map(id => esc((Store.get('pessoas', id) || {}).nome)).join(', ')}</td><th>Status</th><td>${esc(o.status)}</td></tr>
          <tr><th>Endereço</th><td>${esc(o.endereco || '')} – ${esc(o.cidade || '')}/${esc(o.uf || '')}</td><th>Modalidade</th><td>${esc(o.modalidade || '')}</td></tr>
          <tr><th>Resp. técnico</th><td>${esc((Store.get('pessoas', o.rtId) || {}).nome || '')}</td><th>Período</th><td>${date(o.dataInicio)} → ${date(o.dataPrevTermino)}</td></tr></tbody></table>
        ${kp([['Avanço físico', pct(m.fisico), m.previsto != null ? 'previsto ' + pct(m.previsto) : ''], ['Contrato', money(o.valorContrato)], ['Recebido', money(m.fin.receitaPaga), pct(m.financeiroPct) + ' do contrato'], ['Lucro', money(m.fin.lucro), 'margem ' + pct(m.fin.margem)]])}
        <h2>Indicadores</h2>
        <table><tbody><tr><th>Avanço físico</th><td>${pct(m.fisico)}</td><th>Previsto hoje</th><td>${m.previsto != null ? pct(m.previsto) : '—'}</td><th>Nível</th><td>${m.nivel}</td></tr>
          <tr><th>Contrato</th><td>${money(o.valorContrato)}</td><th>Recebido</th><td>${money(m.fin.receitaPaga)} (${pct(m.financeiroPct)})</td><th>A receber</th><td>${money(m.fin.receitaPendente)}</td></tr>
          <tr><th>Despesas</th><td>${money(m.fin.despesaPaga)}</td><th>Lucro</th><td>${money(m.fin.lucro)}</td><th>Margem</th><td>${pct(m.fin.margem)}</td></tr>
          <tr><th>Prazo decorrido</th><td>${pct(m.prazo.pct, 0)}</td><th>Atraso</th><td>${m.prazo.atraso} dias</td><th>Pendências</th><td>${m.pendAbertas} abertas</td></tr></tbody></table>
        <h2>Etapas</h2>${tbl(['#', 'Etapa', 'Valor', 'Previsto', 'Executado'], ets.map(e => [e.ordem, esc(e.nome), money(e.valor), date(e.fimPrev), pct(e.exec, 0)]))}
        ${meds.length ? `<h2>Medições</h2>${tbl(['Nº', 'Data', 'Acumulado', 'Valor liberado', 'Status'], meds.map(x => [esc(x.numero), date(x.data), pct(x.acumulado), money(x.valorLiberado), esc(x.status)]))}` : ''}
        <h2>Financeiro (${periodo})</h2>${tbl(['Data', 'Tipo', 'Descrição', 'Status', 'Valor'], ls.map(l => [date(l.dataPagamento || l.vencimento), l.tipo === 'receita' ? 'Receita' : 'Despesa', esc(l.descricao), l.status === 'pago' ? 'Pago' : 'Pendente', (l.tipo === 'receita' ? '' : '− ') + money(l.valor)]))}
        <h2>Pendências abertas</h2>${tbl(['ID', 'Pendência', 'Responsável', 'Prioridade', 'Prazo'], pend.map(p => [p.id, esc(p.titulo), esc((Store.get('pessoas', p.responsavelId) || {}).nome || ''), p.prioridade, date(p.prazo)]))}
        <h2>Entregas</h2>${tbl(['Entrega', 'Prazo', 'Status'], ent.map(e => [esc(e.titulo), date(e.prazo), esc(e.status)]))}
        <div class="sig"><div>${esc((Store.get('pessoas', o.rtId) || {}).nome || 'Responsável técnico')}<br>${esc((Store.get('pessoas', o.rtId) || {}).registro || '')}</div><div>${esc(Store.db.empresa.nome)}</div></div>`;
    }
    if (s.tipo === 'carteira') {
      const obras = Store.all('obras'); const g = Calc.global();
      const st = {}; obras.forEach(x => { st[x.status] = (st[x.status] || 0) + 1; });
      const linhas = obras.map(x => { const m = Calc.obra(x); return [x.id, esc(x.nome), esc(x.status), pct(m.fisico, 0), money(x.valorContrato), money(m.fin.receitaPaga), money(m.fin.despesaPaga), money(m.fin.lucro), m.pendAbertas]; });
      return `${this.rhead('CARTEIRA DE OBRAS', 'posição em ' + date(UI.today()))}<h1>Carteira de obras e serviços</h1>
        ${kp([['Obras cadastradas', obras.length, g.ativas + ' ativas'], ['Carteira contratada', money(g.carteira)], ['Recebido', money(g.fin.receitaPaga), 'a receber ' + money(g.fin.receitaPendente)], ['Lucro realizado', money(g.fin.lucro), 'margem ' + pct(g.fin.margem)]])}
        <h2>Obras por status</h2>${bars(Object.entries(st).sort((a, b) => b[1] - a[1]), '#2563eb', v => v + '')}
        <h2>Detalhamento</h2>${tbl(['ID', 'Obra', 'Status', 'Físico', 'Contrato', 'Recebido', 'Gasto', 'Lucro', 'Pend.'], linhas, ['Total', '', '', '', money(soma(linhas, 4)), money(soma(linhas, 5)), money(soma(linhas, 6)), money(soma(linhas, 7)), soma(linhas, 8)])}`;
    }
    if (s.tipo === 'financeiro') {
      const f = Calc.fin(s.obra || null, { de: s.de, ate: s.ate });
      const ls = Store.where('lancamentos', l => (!s.obra || l.obraId === s.obra) && l.status === 'pago' && inP(l.dataPagamento || l.data));
      const cat = tipo => { const mm = {}; ls.filter(l => l.tipo === tipo).forEach(l => mm[l.categoria] = (mm[l.categoria] || 0) + l.valor); return Object.entries(mm); };
      const fx = Calc.fluxoMensal(s.obra || null, 0).filter(x => (!s.de || x.mes >= s.de.slice(0, 7)) && (!s.ate || x.mes <= s.ate.slice(0, 7)));
      const cR = cat('receita').sort((a, b) => b[1] - a[1]), cD = cat('despesa').sort((a, b) => b[1] - a[1]);
      const ult = fx[fx.length - 1], pen = fx[fx.length - 2];
      return `${this.rhead('RELATÓRIO FINANCEIRO', periodo.replace('Período: ', ''))}<h1>Financeiro ${o ? '– ' + esc(o.nome) : '– VTN Engenharia'}</h1>
        ${kp([['Receitas recebidas', money(f.receitaPaga)], ['Despesas pagas', money(f.despesaPaga)], ['Resultado', money(f.lucro), 'margem ' + pct(f.margem)], ['Projetado', money(f.lucroProjetado), 'a receber ' + money(f.receitaPendente)]])}
        <div class="hl"><b>Destaques</b><ul>
          <li>Margem realizada de <b>${pct(f.margem)}</b>${f.margem >= 25 ? ' – saudável para serviços de engenharia' : f.margem >= 10 ? ' – atenção aos custos' : ' – abaixo do ideal'}.</li>
          ${cD[0] ? `<li>Maior despesa: <b>${esc(cD[0][0])}</b> (${money(cD[0][1])}, ${pct(cD[0][1] / Math.max(1, f.despesaPaga) * 100, 0)} do total).</li>` : ''}
          ${cR[0] ? `<li>Principal fonte de receita: <b>${esc(cR[0][0])}</b> (${pct(cR[0][1] / Math.max(1, f.receitaPaga) * 100, 0)}).</li>` : ''}
          ${ult && pen ? `<li>Último mês (${Calc.mesLabel(ult.mes)}): resultado ${money(ult.saldo)} contra ${money(pen.saldo)} no mês anterior.</li>` : ''}
          ${f.receitaPendente ? `<li>Há <b>${money(f.receitaPendente)}</b> a receber e ${money(f.despesaPendente)} a pagar.</li>` : ''}</ul></div>
        <h2>Evolução mensal</h2>${cols(fx.slice(-12).map(x => Calc.mesLabel(x.mes).slice(0, 3)), [{ nome: 'Receitas', cor: '#16a34a', vals: fx.slice(-12).map(x => x.receita) }, { nome: 'Despesas', cor: '#dc2626', vals: fx.slice(-12).map(x => x.despesa) }])}
        <h2>Receitas por categoria</h2>${bars(cR, '#16a34a')}${tbl(['Categoria', 'Valor', '% do total'], cR.map(c => [esc(c[0]), money(c[1]), pct(c[1] / Math.max(1, f.receitaPaga) * 100)]), ['Total', money(f.receitaPaga), '100,0%'])}
        <h2>Despesas por categoria</h2>${bars(cD, '#dc2626')}${tbl(['Categoria', 'Valor', '% do total'], cD.map(c => [esc(c[0]), money(c[1]), pct(c[1] / Math.max(1, f.despesaPaga) * 100)]), ['Total', money(f.despesaPaga), '100,0%'])}
        <h2>Demonstrativo mensal</h2>${tbl(['Mês', 'Receitas', 'Despesas', 'Resultado', 'Acumulado'], fx.map(x => [Calc.mesLabel(x.mes), money(x.receita), money(x.despesa), money(x.saldo), money(x.acumulado)]), ['Total', money(fx.reduce((a, x) => a + x.receita, 0)), money(fx.reduce((a, x) => a + x.despesa, 0)), money(fx.reduce((a, x) => a + x.saldo, 0)), ''])}`;
    }
    if (s.tipo === 'pendencias') {
      const P = Store.where('pendencias', p => (!s.obra || p.obraId === s.obra) && p.status !== 'Resolvida');
      const E = Store.where('entregas', e => (!s.obra || e.obraId === s.obra) && !['Entregue', 'Aprovada'].includes(e.status));
      const OS = Store.where('os', x => (!s.obra || x.obraId === s.obra) && !['Concluída', 'Cancelada'].includes(x.status));
      const nm = id => esc((Store.get('pessoas', id) || {}).nome || '');
      return `${this.rhead('PENDÊNCIAS E ENTREGAS', date(UI.today()))}<h1>Pendências ${o ? '– ' + esc(o.nome) : ''}</h1>
        <h2>Pendências abertas (${P.length})</h2>${tbl(['ID', 'Obra', 'Pendência', 'Responsável', 'Prioridade', 'Prazo'], P.map(p => [p.id, p.obraId || '', esc(p.titulo), nm(p.responsavelId), p.prioridade, date(p.prazo)]))}
        <h2>Entregas pendentes (${E.length})</h2>${tbl(['ID', 'Obra', 'Entrega', 'Responsável', 'Prazo', 'Status'], E.map(e => [e.id, e.obraId || '', esc(e.titulo), nm(e.responsavelId), date(e.prazo), e.status]))}
        <h2>Ordens de serviço abertas (${OS.length})</h2>${tbl(['ID', 'Obra', 'Serviço', 'Responsável', 'Prazo', 'Status'], OS.map(x => [x.id, x.obraId || '', esc(x.titulo), nm(x.responsavelId), date(x.prazo), x.status]))}`;
    }
    if (s.tipo === 'medicoes') {
      const M = Store.where('medicoes', x => !s.obra || x.obraId === s.obra).sort((a, b) => a.data.localeCompare(b.data));
      return `${this.rhead('MEDIÇÕES', date(UI.today()))}<h1>Medições ${o ? '– ' + esc(o.nome) : ''}</h1>${tbl(['Obra', 'Nº', 'Data', 'Acumulado', 'Aferido', 'Valor liberado', 'Situação', 'Status'], M.map(x => [x.obraId, esc(x.numero), date(x.data), pct(x.acumulado), pct(x.aferido || 0), money(x.valorLiberado), esc(x.situacao || ''), esc(x.status)]))}`;
    }
    if (s.tipo === 'cno') {
      const ls = Store.where('lancamentos', l => (!s.obra || l.obraId === s.obra) && l.status === 'pago' && l.nf && inP(l.dataPagamento || l.data));
      const ms = [...new Set(ls.map(l => (l.dataPagamento || l.data).slice(0, 7)))].sort();
      let tr = 0, td = 0;
      const linhas = ms.map(mm => { const r = ls.filter(l => l.tipo === 'receita' && (l.dataPagamento || l.data).startsWith(mm)).reduce((a, l) => a + l.valor, 0); const d = ls.filter(l => l.tipo === 'despesa' && (l.dataPagamento || l.data).startsWith(mm)).reduce((a, l) => a + l.valor, 0); tr += r; td += d;
        return `<p>Em ${Calc.mesLabel(mm)}, ${r ? `foram recebidos ${money(r)}` : 'não houve recebimentos com emissão de nota fiscal'}, ${d ? `com despesas no CNO de ${money(d)}` : 'sem despesas registradas no CNO'}.</p>`; }).join('');
      return `${this.rhead('MOVIMENTAÇÃO FINANCEIRA – CNO', periodo)}<h1>${o ? esc(o.nome) : 'Todas as obras'}</h1>
        <p>Informamos que, no período ${ms.length ? 'de ' + Calc.mesLabel(ms[0]) + ' a ' + Calc.mesLabel(ms[ms.length - 1]) : ''}, a obra vinculada ao Cadastro Nacional de Obras (CNO) apresentou a seguinte movimentação financeira:</p>${linhas}
        <p>Dessa forma, o total de recebimentos com nota fiscal no período corresponde a <b>${money(tr)}</b>, enquanto o total de despesas registradas no CNO da obra soma <b>${money(td)}</b>. Diferença: ${money(tr - td)} · imposto estimado (${Store.db.empresa.imposto || 6}%): ${money((tr - td) * (Store.db.empresa.imposto || 6) / 100)}.</p>`;
    }
    if (s.tipo === 'impostos') {
      const y = (s.de || UI.today()).slice(0, 4);
      const oc = Fiscal.ocorrencias(y + '-01-01', y + '-12-31');
      const meses = []; for (let m = 1; m <= 12; m++) meses.push(y + '-' + String(m).padStart(2, '0'));
      const das = meses.map(m => Fiscal.dasMes(m));
      return `${this.rhead('IMPOSTOS E OBRIGAÇÕES', y)}<h1>Impostos e obrigações – ${y}</h1>
        ${kp([['DAS estimado no ano', money(das.reduce((a, d) => a + d.das, 0))], ['Receita do ano', money(das.reduce((a, d) => a + d.receita, 0))], ['Obrigações no ano', oc.length], ['Pendentes / atrasadas', oc.filter(x => x.status === 'pendente' || x.status === 'atrasado').length]])}
        <h2>DAS estimado por mês</h2>${cols(das.map(d => Calc.mesLabel(d.ym).slice(0, 3)), [{ nome: 'DAS', cor: '#7c3aed', vals: das.map(d => d.das) }])}
        <h2>Simples Nacional (estimativa)</h2>${tbl(['Competência', 'Receita', 'RBT12', 'Alíq. efetiva', 'DAS', 'Federal', 'ISS'], das.map(d => [Calc.mesLabel(d.ym), money(d.receita), money(d.rbt12), pct(d.efetiva, 2), money(d.das), money(d.federal), money(d.municipal)]))}
        <h2>Calendário de obrigações</h2>${tbl(['Vencimento', 'Obrigação', 'Esfera', 'Competência', 'Status'], oc.map(o => [date(o.data), esc(o.obrig.nome), o.obrig.esfera, o.competencia, o.status]))}
        <h2>Feriados</h2>${tbl(['Data', 'Feriado', 'Tipo'], Fiscal.feriados(+y).map(f => [date(f.data), esc(f.nome), f.esfera]))}
        <p class="tiny">Valores estimados pelo app – confirmar com a contabilidade.</p>`;
    }
    if (s.tipo === 'funil') {
      const O = Store.all('obras'); const st = {}; O.forEach(o => { st[o.status] = st[o.status] || [0, 0]; st[o.status][0]++; st[o.status][1] += +o.valorContrato || 0; });
      return `${this.rhead('FUNIL COMERCIAL', date(UI.today()))}<h1>Funil comercial e carteira</h1>${tbl(['Status', 'Quantidade', 'Valor contratado'], Object.entries(st).map(([k, v]) => [k, v[0], money(v[1])]))}
        <h2>Orçamentos</h2>${tbl(['ID', 'Título', 'Cliente', 'Data', 'Status', 'Total'], Store.all('orcamentos').map(o => [o.id, esc(o.titulo), esc(clientesDe(o).map(c => (Store.get('pessoas', c) || {}).nome).filter(Boolean).join(', ')), date(o.data), o.status, money(Calc.orcTotal(o).total)]))}`;
    }
    if (s.tipo === 'recebiveis') {
      const L = Store.where('lancamentos', l => l.status !== 'pago' && (!s.obra || l.obraId === s.obra));
      const linha = l => [l.id, l.obraId || 'Geral', esc(l.descricao), esc((Store.get('pessoas', l.pessoaId) || {}).nome || ''), date(l.vencimento), l.vencimento && l.vencimento < UI.today() ? UI.daysBetween(l.vencimento, UI.today()) + ' dias' : '—', money(l.valor)];
      const R = L.filter(l => l.tipo === 'receita'), P = L.filter(l => l.tipo === 'despesa');
      const hoje = UI.today(), faixa = l => !l.vencimento || l.vencimento >= hoje ? 'A vencer' : UI.daysBetween(l.vencimento, hoje) <= 30 ? '1–30 dias' : UI.daysBetween(l.vencimento, hoje) <= 60 ? '31–60 dias' : UI.daysBetween(l.vencimento, hoje) <= 90 ? '61–90 dias' : '+90 dias';
      const ag = ['A vencer', '1–30 dias', '31–60 dias', '61–90 dias', '+90 dias'].map(k => [k, R.filter(l => faixa(l) === k).reduce((a, l) => a + l.valor, 0)]);
      const tR = R.reduce((a, l) => a + l.valor, 0), tP = P.reduce((a, l) => a + l.valor, 0);
      return `${this.rhead('CONTAS A RECEBER E A PAGAR', date(UI.today()))}<h1>Contas em aberto ${o ? '– ' + esc(o.nome) : ''}</h1>
        ${kp([['A receber', money(tR), R.length + ' títulos'], ['A pagar', money(tP), P.length + ' títulos'], ['Saldo previsto', money(tR - tP)], ['Vencido a receber', money(ag.slice(1).reduce((a, x) => a + x[1], 0))]])}
        <h2>Idade dos recebíveis (aging)</h2>${bars(ag, '#7c3aed')}
        <h2>A receber – ${money(R.reduce((a, l) => a + l.valor, 0))}</h2>${tbl(['ID', 'Obra', 'Descrição', 'Pagador', 'Vencimento', 'Atraso', 'Valor'], R.map(linha))}
        <h2>A pagar – ${money(P.reduce((a, l) => a + l.valor, 0))}</h2>${tbl(['ID', 'Obra', 'Descrição', 'Favorecido', 'Vencimento', 'Atraso', 'Valor'], P.map(linha))}`;
    }
    if (s.tipo === 'agenda') {
      const it = Views.agenda.itens(UI.today(), Fiscal.addDays(UI.today(), 30));
      return `${this.rhead('AGENDA', date(UI.today()))}<h1>Agenda – próximos 30 dias</h1>${tbl(['Data', 'Hora', 'Tipo', 'Descrição', 'Obra'], it.map(i => [date(i.data), i.hora || '', esc(i.tipo), esc(i.titulo), i.obraId || '']))}`;
    }
    const mesRef = s.de ? s.de.slice(0, 7) : UI.today().slice(0, 7);
    const noMes = d => (d || '').startsWith(mesRef);

    if (s.tipo === 'executivo') {
      const g = Calc.global(); const f = Calc.fin(null, { de: mesRef + '-01', ate: mesRef + '-31' });
      const fx = Calc.fluxoMensal(null, 12); const e = Enq.estado(); const O = Store.all('obras');
      const novos = O.filter(o => noMes(o.dataContrato || (o.criadoEm || '').slice(0, 10)));
      const orc = Store.all('orcamentos'); const al = Enq.alertas(e);
      const atrasadas = Store.where('pendencias', p => p.status !== 'Resolvida' && p.prazo && p.prazo < UI.today()).length;
      const top = O.map(o => [o, Calc.obra(o)]).filter(x => x[1].fin.receitaPaga > 0).sort((a, b) => b[1].fin.lucro - a[1].fin.lucro).slice(0, 6);
      return `${this.rhead('RESUMO EXECUTIVO', Calc.mesLabel(mesRef) + ' · emitido em ' + date(UI.today()))}<h1>Resumo executivo – ${Calc.mesLabel(mesRef)}</h1>
        ${kp([['Receita do mês', money(f.receitaPaga)], ['Despesa do mês', money(f.despesaPaga)], ['Resultado do mês', money(f.lucro), pct(f.margem)], ['A receber (total)', money(g.fin.receitaPendente)]])}
        ${kp([['Obras ativas', g.ativas], ['Pendências abertas', g.pendAbertas, atrasadas + ' atrasadas'], ['Novas obras/serviços', novos.length], ['Porte / Simples', e.catAtual + ' · Anexo ' + e.anexo, 'alíq. efetiva ' + pct(e.efetiva, 2)]])}
        <h2>Receitas × despesas – 12 meses</h2>${cols(fx.map(x => Calc.mesLabel(x.mes).slice(0, 3)), [{ nome: 'Receitas', cor: '#16a34a', vals: fx.map(x => x.receita) }, { nome: 'Despesas', cor: '#dc2626', vals: fx.map(x => x.despesa) }])}
        <h2>Obras que mais deram lucro</h2>${tbl(['Obra', 'Recebido', 'Gasto', 'Lucro', 'Margem'], top.map(([o, m]) => [esc(o.nome), money(m.fin.receitaPaga), money(m.fin.despesaPaga), money(m.fin.lucro), pct(m.fin.margem)]))}
        <h2>Comercial</h2>${kp([['Orçamentos enviados', orc.filter(o => o.status === 'Enviado').length], ['Orçamentos aprovados', orc.filter(o => o.status === 'Aprovado').length], ['Leads em aberto', O.filter(o => ['Prospecção', 'Orçamento'].includes(o.status)).length], ['Taxa de conversão', pct(this.conv(O))]])}
        <h2>Alertas de enquadramento e fiscal</h2>${al.length ? '<ul>' + al.map(a => `<li>${esc(a[2])}</li>`).join('') + '</ul>' : '<p>Nenhum alerta.</p>'}`;
    }
    if (s.tipo === 'fluxo') {
      const fx = Calc.fluxoMensal(null, 12); const fut = [];
      for (let i = 0; i < 6; i++) { const m = Enq.addM(UI.today().slice(0, 7), i); const L = Store.where('lancamentos', l => l.status !== 'pago' && (l.vencimento || '').startsWith(m)); fut.push({ m, r: L.filter(l => l.tipo === 'receita').reduce((a, l) => a + l.valor, 0), d: L.filter(l => l.tipo === 'despesa').reduce((a, l) => a + l.valor, 0) }); }
      const saldoReal = fx.reduce((a, x) => a + x.saldo, 0);
      return `${this.rhead('FLUXO DE CAIXA', date(UI.today()))}<h1>Fluxo de caixa e projeção</h1>
        ${kp([['Resultado 12 meses', money(saldoReal)], ['Média mensal de receita', money(fx.reduce((a, x) => a + x.receita, 0) / 12)], ['Média mensal de despesa', money(fx.reduce((a, x) => a + x.despesa, 0) / 12)], ['Entradas previstas 6 meses', money(fut.reduce((a, x) => a + x.r, 0))]])}
        ${cols(fx.map(x => Calc.mesLabel(x.mes).slice(0, 3)), [{ nome: 'Receitas', cor: '#16a34a', vals: fx.map(x => x.receita) }, { nome: 'Despesas', cor: '#dc2626', vals: fx.map(x => x.despesa) }])}
        <h2>Realizado</h2>${tbl(['Mês', 'Receitas', 'Despesas', 'Resultado', 'Acumulado'], fx.map(x => [Calc.mesLabel(x.mes), money(x.receita), money(x.despesa), money(x.saldo), money(x.acumulado)]))}
        <h2>Previsto (lançamentos em aberto)</h2>${tbl(['Mês', 'A receber', 'A pagar', 'Saldo previsto'], fut.map(x => [Calc.mesLabel(x.m), money(x.r), money(x.d), money(x.r - x.d)]))}`;
    }
    if (s.tipo === 'rentabilidade') {
      const L = Store.all('obras').map(o => [o, Calc.obra(o)]).filter(x => x[1].fin.receitaPaga || x[1].fin.despesaPaga).sort((a, b) => b[1].fin.lucro - a[1].fin.lucro);
      const tot = L.reduce((a, x) => a + x[1].fin.lucro, 0);
      return `${this.rhead('RENTABILIDADE POR OBRA', date(UI.today()))}<h1>Rentabilidade por obra</h1>
        ${kp([['Obras com movimento', L.length], ['Lucro total', money(tot)], ['Margem média', pct(L.reduce((a, x) => a + x[1].fin.margem, 0) / Math.max(1, L.length))], ['Obras com prejuízo', L.filter(x => x[1].fin.lucro < 0).length]])}
        <h2>Top 10 em lucro</h2>${bars(L.slice(0, 10).map(x => [x[0].nome.slice(0, 38), Math.max(0, x[1].fin.lucro)]), '#16a34a')}
        ${tbl(['Obra', 'Tipo', 'Recebido', 'Gasto', 'Lucro', 'Margem'], L.map(([o, m]) => [esc(o.nome), esc(o.tipo), money(m.fin.receitaPaga), money(m.fin.despesaPaga), money(m.fin.lucro), pct(m.fin.margem)]))}`;
    }
    if (s.tipo === 'marketing') {
      const O = Store.all('obras'); const orc = Store.all('orcamentos');
      const ganhos = O.filter(o => !['Prospecção', 'Orçamento', 'Cancelada'].includes(o.status));
      const ticket = ganhos.filter(o => +o.valorContrato).reduce((a, o) => a + +o.valorContrato, 0) / Math.max(1, ganhos.filter(o => +o.valorContrato).length);
      const grp = (arr, fn, val) => { const m = {}; arr.forEach(o => { const k = fn(o) || 'Não informado'; m[k] = (m[k] || 0) + (val ? val(o) : 1); }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
      const meses = []; for (let i = 11; i >= 0; i--) meses.push(Enq.addM(UI.today().slice(0, 7), -i));
      const porMes = meses.map(m => O.filter(o => (o.dataContrato || (o.criadoEm || '')).startsWith(m)).length);
      const gastoMkt = Store.where('lancamentos', l => l.tipo === 'despesa' && /marketing|an[uú]ncio|publicidade/i.test(l.categoria + ' ' + l.descricao)).reduce((a, l) => a + l.valor, 0);
      const recebido = Calc.global().fin.receitaPaga;
      return `${this.rhead('MARKETING E VENDAS', date(UI.today()))}<h1>Marketing e vendas</h1>
        ${kp([['Leads (prospecção + orçamento)', O.filter(o => ['Prospecção', 'Orçamento'].includes(o.status)).length], ['Fechados (contratados até concluídos)', ganhos.length], ['Taxa de conversão', pct(this.conv(O))], ['Ticket médio', money(ticket)]])}
        ${kp([['Orçamentos enviados', orc.length], ['Aprovados', orc.filter(o => o.status === 'Aprovado').length, pct(orc.filter(o => o.status === 'Aprovado').length / Math.max(1, orc.length) * 100) + ' de aprovação'], ['Investimento em marketing', money(gastoMkt), gastoMkt ? 'ROI ' + UI.num(recebido / gastoMkt) + 'x' : 'lance despesas como "Marketing / anúncios"'], ['Cancelados / perdidos', O.filter(o => o.status === 'Cancelada').length]])}
        <h2>Novos negócios por mês (12 meses)</h2>${cols(meses.map(m => Calc.mesLabel(m).slice(0, 3)), [{ nome: 'Obras/serviços novos', cor: '#db2777', vals: porMes }])}
        <h2>Canais de origem dos clientes</h2>${bars(grp(O, o => o.origem), '#db2777', v => v + '')}
        <p class="tiny">Para medir os canais, preencha "Como o cliente chegou" no cadastro de cada obra.</p>
        <h2>Serviços mais vendidos</h2>${bars(grp(O, o => o.tipo), '#2563eb', v => v + '')}
        <h2>Valor contratado por tipo</h2>${bars(grp(ganhos, o => o.tipo, o => +o.valorContrato || 0), '#16a34a')}
        <h2>Onde estão os clientes (cidades)</h2>${bars(grp(O.filter(o => o.cidade), o => o.cidade).slice(0, 12), '#7c3aed', v => v + '')}`;
    }
    if (s.tipo === 'clientes') {
      const C = Store.where('pessoas', p => p.tipo === 'Cliente').map(p => { const ob = Store.where('obras', o => (o.clienteIds || []).includes(p.id)); const rec = ob.reduce((a, o) => a + Calc.fin(o.id).receitaPaga, 0); return { p, ob, rec }; }).sort((a, b) => b.rec - a.rec);
      const recorr = C.filter(x => x.ob.length > 1);
      return `${this.rhead('BASE DE CLIENTES', date(UI.today()))}<h1>Base de clientes</h1>
        ${kp([['Clientes cadastrados', C.length], ['Clientes recorrentes', recorr.length, pct(recorr.length / Math.max(1, C.length) * 100)], ['Receita dos 10 maiores', money(C.slice(0, 10).reduce((a, x) => a + x.rec, 0))], ['Clientes com obra ativa', C.filter(x => x.ob.some(o => ['Contratada', 'Em planejamento', 'Em execução', 'Em entrega'].includes(o.status))).length]])}
        <h2>Top 10 clientes por receita</h2>${bars(C.slice(0, 10).map(x => [x.p.nome.slice(0, 34), x.rec]), '#db2777')}
        ${tbl(['ID', 'Cliente', 'Telefone', 'Obras', 'Recebido'], C.slice(0, 60).map(x => [x.p.id, esc(x.p.nome), esc(x.p.telefone || ''), x.ob.length, money(x.rec)]))}`;
    }
    if (s.tipo === 'enquadramento') {
      const e = Enq.estado(); const al = Enq.alertas(e);
      return `${this.rhead('ENQUADRAMENTO E SIMPLES NACIONAL', date(UI.today()))}<h1>Enquadramento – ${Calc.mesLabel(e.ym)}</h1>
        ${kp([['Porte em ' + e.Y, e.catAtual, 'receita ' + (e.Y - 1) + ': ' + money(e.anoAnt)], ['Previsão ' + (e.Y + 1), e.catProx, 'ano projetado ' + money(e.projAno)], ['Simples', 'Anexo ' + e.anexo + ' · ' + e.faixa + 'ª faixa', 'efetiva ' + pct(e.efetiva, 2)], ['Fator R', e.informouFolha ? pct(e.fatorR, 1) : 'sem folha informada', 'pró-labore mín. ' + money(e.proLaboreMin)]])}
        ${tbl(['Limite', 'Receita do ano', 'Limite', '% usado'], [['Microempresa', money(e.acumAno), money(Enq.ME), pct(e.pctME, 1)], ['Sublimite ISS', money(e.acumAno), money(Enq.SUB), pct(e.pctSUB, 1)], ['Teto do Simples', money(e.acumAno), money(Enq.EPP), pct(e.pctEPP, 1)]])}
        <h2>RBT12 – real e projetada</h2>${cols(e.serie.slice(24, 37).map(x => Calc.mesLabel(x.ym).slice(0, 3)), [{ nome: 'RBT12', cor: '#7c3aed', vals: e.serie.slice(24, 37).map(x => e.rbt12De(x.ym)) }])}
        <h2>Alertas</h2>${al.length ? '<ul>' + al.map(a => `<li>${esc(a[2])}</li>`).join('') + '</ul>' : '<p>Nenhuma mudança prevista.</p>'}
        ${al.map(a => Enq.MUDANCAS[a[3]]).filter((m, i, arr) => m && arr.indexOf(m) === i).map(m => `<h2>O que muda: ${esc(m.titulo)}</h2><ul>${m.itens.map(i => `<li>${esc(i)}</li>`).join('')}</ul><p class="tiny">Base: ${esc(m.fonte)}</p>`).join('')}
        <p class="tiny">Projeção pela média dos últimos meses (regime de caixa). Confirmar com a contabilidade.</p>`;
    }
    return '';
  }
};

/* ---------- Central: arquivo permanente dos relatórios enviados ---------- */
window.Central = (() => {
  const agora = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 19);
  const meta = () => (Store.db.relCentral = Store.db.relCentral || []);
  function cfg() { return Object.assign({ mensal: true, enquadramento: true, tipos: ['executivo', 'financeiro', 'fluxo', 'marketing', 'enquadramento'], ultimo: '' }, Store.db.relAuto || {}); }
  function salvarCfg(p) { Store.db.relAuto = Object.assign(cfg(), p); Store.save(); }
  function lista() { return meta().slice().sort((a, b) => b.data.localeCompare(a.data)); }
  function pagina(html, titulo) { return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${UI.esc(titulo)}</title><style>body{margin:0;background:#eef2f7;padding:24px 12px}.page{max-width:900px;margin:0 auto;background:#fff;padding:36px 40px;border-radius:14px;box-shadow:0 10px 30px -12px rgba(15,23,42,.25)}@media print{body{background:#fff;padding:0}.page{box-shadow:none;padding:0;max-width:none}}@media(max-width:640px){.page{padding:18px}}</style></head><body><div class="page">${html}</div></body></html>`; }
  /** Gera o relatório e guarda (metadados no banco, HTML no IndexedDB) */
  async function enviar(tipo, o = {}) {
    const V = Views.relatorios; const ref = o.ref || (o.de ? o.de.slice(0, 7) : UI.today().slice(0, 7));
    const p = { tipo, obra: o.obra || '', de: o.de || (o.ref ? ref + '-01' : ''), ate: o.ate || (o.ref ? ref + '-31' : '') };
    if (tipo === 'obra' && !p.obra) p.obra = (Store.all('obras')[0] || {}).id;
    const html = V.html(p);
    Store.db.seq.RC = (Store.db.seq.RC || 0) + 1;
    const id = 'RC-' + String(Store.db.seq.RC).padStart(4, '0');
    const obra = p.obra && ['obra', 'pendencias', 'medicoes', 'financeiro', 'recebiveis', 'cno'].includes(tipo) ? Store.get('obras', p.obra) : null;
    const periodo = o.ref ? Calc.mesLabel(ref) : p.de || p.ate ? `${UI.date(p.de) || 'início'} a ${UI.date(p.ate) || 'hoje'}` : 'posição em ' + UI.date(UI.today());
    const rec = { id, tipo, categoria: V.catDe(tipo), titulo: o.titulo || (V.nomeDe(tipo) + (obra ? ' – ' + obra.nome : '') + (o.ref ? ' – ' + Calc.mesLabel(ref) : '')), periodo, ref, data: agora(), origem: o.origem || 'manual', bytes: html.length };
    try { await Store.Files.put(id, new Blob([html], { type: 'text/html' })); } catch (e) { rec.html = html; }
    meta().push(rec); Store.save(); return rec;
  }
  async function html(id) { const r = meta().find(x => x.id === id); if (!r) return ''; if (r.html) return r.html; try { const b = await Store.Files.get(id); return b ? await b.text() : '<p>Relatório não encontrado neste navegador.</p>'; } catch (e) { return '<p>Erro ao abrir.</p>'; } }
  function remover(id) { Store.db.relCentral = meta().filter(x => x.id !== id); Store.Files.del(id); Store.save(); }
  async function pacote(ref, origem) { let n = 0; for (const t of cfg().tipos) { await enviar(t, { ref, origem }); n++; } return n; }
  /** Fechamento automático: no 1º acesso do mês gera os relatórios do mês anterior */
  async function auto() {
    const c = cfg(); if (!c.mensal) return;
    const ant = Enq.addM(UI.today().slice(0, 7), -1);
    if (c.ultimo === ant) return;
    if (meta().some(r => r.ref === ant && r.origem === 'automático')) { salvarCfg({ ultimo: ant }); return; }
    const n = await pacote(ant, 'automático'); salvarCfg({ ultimo: ant });
    UI.toast(`Fechamento de ${Calc.mesLabel(ant)}: ${n} relatórios enviados para a Central de relatórios`, 'ok');
  }
  return { agora, lista, enviar, html, remover, pacote, auto, cfg, salvarCfg, pagina };
})();
