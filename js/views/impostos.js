/* Impostos, obrigações (federais, estaduais, municipais, trabalhistas, conselho), Simples Nacional, retenções e feriados */
Views.impostos = {
  perm: 'financeiro.ver',
  st: { tab: 'painel', esfera: '', ano: new Date().getFullYear() },
  render(el, tab) {
    const { icon, money, pct, esc, date } = UI; const s = this.st; if (tab) s.tab = tab;
    Store.db.fiscalCfg = Object.assign({ anexo: 'III', cidade: 'BH', issItabirito: 2, issBH: 2.5, retencaoINSS: 11, baseSoNF: true, inicioControle: '2026-10-01' }, Store.db.fiscalCfg || {});
    const cfg = Store.db.fiscalCfg;
    const hoje = UI.today(), ym = hoje.slice(0, 7);
    const mesAnt = (() => { const d = new Date(ym + '-01T12:00:00'); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();
    const das = Fiscal.dasMes(mesAnt);
    const prox = Fiscal.ocorrencias(hoje, Fiscal.addDays(hoje, 60)).filter(o => o.status !== 'pago');
    const atras = Fiscal.ocorrencias(Fiscal.addDays(hoje, -120), Fiscal.addDays(hoje, -1)).filter(o => o.status === 'atrasado');
    const pagosAno = Store.where('lancamentos', l => l.tipo === 'despesa' && l.categoria === 'Impostos' && l.status === 'pago' && (l.dataPagamento || l.data || '').startsWith(String(s.ano)));
    const T = [['painel', 'Painel fiscal', 'gauge'], ['obrig', 'Obrigações e vencimentos', 'calendar-clock'], ['simples', 'Simples Nacional', 'percent'], ['retencoes', 'Retenções por obra', 'receipt'], ['feriados', 'Feriados', 'party-popper'], ['reforma', 'Reforma tributária', 'scale'], ['cfg', 'Configurar', 'settings-2']];
    el.innerHTML = `
      <div class="hero"><div><div class="hero-kicker">${icon('landmark')} Fiscal & tributário</div><h1>Impostos e obrigações</h1><p>Federal, estadual, municipal (prefeituras BH e Itabirito), trabalhista e CREA — com vencimentos ajustados aos feriados.</p></div>
        <div class="hero-side"><div><span>Próximo vencimento</span><b>${prox[0] ? esc(prox[0].obrig.nome.split('–')[0]) : '—'}</b><small>${prox[0] ? date(prox[0].data) : ''}</small></div><div><span>DAS estimado (${Calc.mesLabel(mesAnt)})</span><b>${money(das.das)}</b><small>alíquota efetiva ${pct(das.efetiva, 2)}</small></div></div></div>
      <div class="pill-tabs">${T.map(t => `<button class="${t[0] === s.tab ? 'active' : ''}" data-t="${t[0]}">${icon(t[2])} ${t[1]}</button>`).join('')}</div>
      <div id="ic"></div>`;
    UI.$$('[data-t]', el).forEach(b => b.onclick = () => { s.tab = b.dataset.t; App.refresh(); });
    const c = UI.$('#ic', el);
    this['t_' + s.tab](c, { das, prox, atras, pagosAno, cfg, mesAnt });
  },

  t_painel(c, { das, prox, atras, pagosAno, cfg }) {
    const { icon, money, pct, esc, date } = UI; const s = this.st;
    const porEsfera = {}; pagosAno.forEach(l => { const e = l.esfera || 'Federal'; porEsfera[e] = (porEsfera[e] || 0) + l.valor; });
    const meses = []; for (let i = 11; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); meses.push(d.toISOString().slice(0, 7)); }
    const serie = meses.map(m => Fiscal.dasMes(m));
    const kpi = (cls, ic, l, v, sub) => `<div class="card kpi ${cls}"><div class="ico">${icon(ic)}</div><div class="lbl">${l}</div><div class="val">${v}</div><div class="sub">${sub}</div></div>`;
    c.innerHTML = `<div class="grid g4">
        ${kpi('', 'percent', 'Alíquota efetiva do Simples', pct(das.efetiva, 2), `Anexo ${cfg.anexo} · faixa ${das.faixa} · nominal ${pct(das.nominal, 1)}`)}
        ${kpi('info', 'trending-up', 'RBT12 (receita 12 meses)', money(das.rbt12), `Limite do Simples: R$ 4,8 mi · ${pct(das.rbt12 / 4800000 * 100, 1)} usado`)}
        ${kpi('violet', 'landmark', 'DAS estimado do mês', money(das.das), `Federal ${money(das.federal)} · ISS ${money(das.municipal)}`)}
        ${kpi(atras.length ? 'err' : 'ok', 'alarm-clock', 'Obrigações em atraso', atras.length, `${prox.length} vencendo nos próximos 60 dias`)}
        ${kpi('', 'receipt', 'Impostos pagos em ' + s.ano, money(pagosAno.reduce((a, l) => a + l.valor, 0)), Object.entries(porEsfera).map(([k, v]) => k + ' ' + money(v)).join(' · ') || 'Lance os impostos no caixa (categoria Impostos)')}
        ${kpi('info', 'file-text', 'Receita com NF (mês anterior)', money(das.receita), 'Base de cálculo do DAS')}
        ${kpi('warn', 'building-2', 'ISS municipal embutido no DAS', money(das.municipal), `${pct(das.rep.ISS, 1)} do DAS (repartição)`)}
        ${kpi('ok', 'shield-check', 'CPP (INSS patronal) no DAS', money(das.repValores.CPP || 0), cfg.anexo === 'IV' ? 'Anexo IV: INSS patronal pago à parte (20% folha)' : 'Incluída no DAS')}
      </div>
      <div class="grid g-2-1 mt">
        <div class="card"><div class="card-h"><h3>DAS estimado × receita – 12 meses</h3><span class="tiny muted">Estimativa pela receita recebida com NF</span></div><div class="card-b"><div class="chart-box"><canvas id="chDas"></canvas></div></div></div>
        <div class="card"><div class="card-h"><h3>Repartição do DAS</h3></div><div class="card-b"><div class="chart-box"><canvas id="chRep"></canvas></div></div></div>
      </div>
      <div class="grid g2 mt">
        <div class="card"><div class="card-h"><h3>Próximos vencimentos</h3><button class="btn sm" onclick="Views.impostos.st.tab='obrig';App.refresh()">Ver todos</button></div><div class="card-b p0">${this.listaOc(prox.slice(0, 10))}</div></div>
        <div class="card"><div class="card-h"><h3>Em atraso / não marcados como pagos</h3></div><div class="card-b p0">${atras.length ? this.listaOc(atras) : UI.empty('Nenhuma obrigação em atraso.', 'check-circle')}</div></div>
      </div>`;
    this.bindOc(c);
    UI.chart('chDas', { type: 'bar', data: { labels: serie.map(x => Calc.mesLabel(x.ym)), datasets: [{ label: 'Receita c/ NF', data: serie.map(x => x.receita), backgroundColor: 'rgba(37,99,235,.25)', borderRadius: 6, yAxisID: 'y' }, { label: 'DAS estimado', data: serie.map(x => x.das), type: 'line', borderColor: '#2563eb', backgroundColor: '#2563eb', tension: .35, yAxisID: 'y2' }] },
      options: { scales: { y: { ticks: { callback: UI.moneyTick } }, y2: { position: 'right', grid: { display: false }, ticks: { callback: UI.moneyTick } } } } });
    UI.chart('chRep', { type: 'doughnut', data: { labels: Object.keys(das.rep), datasets: [{ data: Object.values(das.rep), backgroundColor: UI.PALETA, borderWidth: 0 }] }, options: { cutout: '64%', plugins: { tooltip: { callbacks: { label: c => c.label + ': ' + UI.pct(c.raw, 2) } } } } });
  },
  listaOc(list) {
    const { esc, date, icon } = UI;
    if (!list.length) return UI.empty('Nada no período.', 'calendar');
    return `<div class="table-wrap"><table class="t"><thead><tr><th>Vencimento</th><th>Obrigação</th><th>Esfera</th><th>Competência</th><th>Status</th><th></th></tr></thead><tbody>
      ${list.map(o => `<tr><td class="nowrap"><b>${date(o.data)}</b><div class="tiny muted">${UI.daysBetween(UI.today(), o.data) >= 0 ? 'em ' + UI.daysBetween(UI.today(), o.data) + ' dias' : Math.abs(UI.daysBetween(UI.today(), o.data)) + ' dias atrás'}</div></td>
        <td><b>${esc(o.obrig.nome)}</b><div class="tiny muted">${esc(o.obrig.desc || '')}</div></td><td>${UI.badge(o.obrig.esfera, Fiscal.ESFERA_COR[o.obrig.esfera])}</td><td>${esc(o.competencia)}</td>
        <td>${o.status === 'pago' ? UI.badge('Pago', 'ok') : o.status === 'atrasado' ? UI.badge('Atrasado', 'err') : o.status === 'historico' ? UI.badge('Antes do controle', '') : UI.badge('Pendente', 'warn')}</td>
        <td class="nowrap">${o.status === 'pago' ? `<button class="btn sm ghost" data-unpay="${o.key}">Desfazer</button>` : `<button class="btn sm" data-pay="${o.key}">${icon('check')} Pago</button>`}</td></tr>`).join('')}</tbody></table></div>`;
  },
  bindOc(c) {
    UI.$$('[data-pay]', c).forEach(b => b.onclick = async () => {
      const o = Fiscal.ocorrencias('2000-01-01', '2100-01-01').find(x => x.key === b.dataset.pay);
      const d = await UI.formModal({ title: 'Registrar pagamento – ' + o.obrig.nome, list: [{ k: 'valor', l: 'Valor pago (R$) – deixe 0 se for só declaração', t: 'money' }, { k: 'data', l: 'Data do pagamento', t: 'date', def: UI.today() }, { k: 'lancar', l: 'Lançar como despesa no caixa (categoria Impostos)', t: 'check', def: true }] });
      if (!d) return;
      Fiscal.marcar(b.dataset.pay, 'pago');
      if (d.lancar && d.valor > 0) Store.insert('lancamentos', { tipo: 'despesa', categoria: 'Impostos', esfera: o.obrig.esfera, descricao: o.obrig.nome + ' – comp. ' + o.competencia, valor: d.valor, data: d.data, vencimento: o.data, dataPagamento: d.data, status: 'pago', obraId: null, pessoaId: null, nf: false, arquivoIds: [], forma: 'Boleto', obs: 'Lançado pela agenda fiscal' });
      UI.toast('Obrigação marcada como paga'); App.refresh();
    });
    UI.$$('[data-unpay]', c).forEach(b => b.onclick = () => { Fiscal.marcar(b.dataset.unpay, null); App.refresh(); });
  },

  t_obrig(c) {
    const { icon, esc } = UI; const s = this.st;
    const de = s.ano + '-01-01', ate = s.ano + '-12-31';
    let oc = Fiscal.ocorrencias(de, ate); if (s.esfera) oc = oc.filter(o => o.obrig.esfera === s.esfera);
    const esferas = ['Federal', 'Estadual', 'Municipal', 'Trabalhista', 'Conselho'];
    c.innerHTML = `<div class="toolbar"><button class="btn icon" id="ya">${icon('chevron-left')}</button><b>${s.ano}</b><button class="btn icon" id="yb">${icon('chevron-right')}</button>
        <button class="btn sm ${!s.esfera ? 'primary' : ''}" data-e="">Todas</button>${esferas.map(e => `<button class="btn sm ${s.esfera === e ? 'primary' : ''}" data-e="${e}">${e}</button>`).join('')}
        <div style="margin-left:auto" class="row"><button class="btn sm" id="ocsv">${icon('download')} CSV</button><button class="btn sm primary" id="onew">${icon('plus')} Nova obrigação</button></div></div>
      <div class="card">${this.listaOc(oc)}</div>
      <div class="card mt"><div class="card-h"><h3>Cadastro de obrigações (regras de vencimento)</h3><span class="tiny muted">Clique para editar · "antecipa/prorroga" = ajuste quando cai em fim de semana ou feriado</span></div>
        ${UI.table([{ h: 'Obrigação', f: o => `<span class="plink" data-oe="${o.id}">${esc(o.nome)}</span>` }, { h: 'Esfera', f: o => UI.badge(o.esfera, Fiscal.ESFERA_COR[o.esfera]) }, { h: 'Periodicidade', f: o => o.tipo === 'anual' ? `Anual – ${String(o.dia).padStart(2, '0')}/${String(o.mes).padStart(2, '0')}` : `Mensal – dia ${o.dia}` }, { h: 'Ajuste', k: 'ajuste' }], Fiscal.obrigacoes())}</div>`;
    this.bindOc(c);
    UI.$('#ya', c).onclick = () => { s.ano--; App.refresh(); }; UI.$('#yb', c).onclick = () => { s.ano++; App.refresh(); };
    UI.$$('[data-e]', c).forEach(b => b.onclick = () => { s.esfera = b.dataset.e; App.refresh(); });
    UI.$('#ocsv', c).onclick = () => UI.csv('obrigacoes-' + s.ano + '.csv', ['Vencimento', 'Obrigação', 'Esfera', 'Competência', 'Status'], oc.map(o => [o.data, o.obrig.nome, o.obrig.esfera, o.competencia, o.status]));
    UI.$('#onew', c).onclick = () => this.editObrig();
    UI.$$('[data-oe]', c).forEach(b => b.onclick = () => this.editObrig(b.dataset.oe));
  },
  async editObrig(id) {
    if (!Store.db.obrigacoes || !Store.db.obrigacoes.length) Store.db.obrigacoes = JSON.parse(JSON.stringify(Fiscal.OBRIGACOES_PADRAO));
    const L = Store.db.obrigacoes; const o = id ? L.find(x => x.id === id) : { tipo: 'mensal', dia: 20, esfera: 'Federal', ajuste: 'antecipa' };
    const d = await UI.formModal({ title: id ? 'Editar obrigação' : 'Nova obrigação', values: o, list: [{ k: 'nome', l: 'Nome', req: 1, full: 1 }, { k: 'esfera', l: 'Esfera', t: 'select', o: ['Federal', 'Estadual', 'Municipal', 'Trabalhista', 'Conselho'], blank: false },
      { k: 'tipo', l: 'Periodicidade', t: 'select', o: [['mensal', 'Mensal'], ['anual', 'Anual']], blank: false }, { k: 'dia', l: 'Dia do vencimento', t: 'number' }, { k: 'mes', l: 'Mês (se anual)', t: 'number' },
      { k: 'ajuste', l: 'Se cair em feriado/fim de semana', t: 'select', o: [['antecipa', 'Antecipa'], ['prorroga', 'Prorroga'], ['nenhum', 'Mantém']], blank: false }, { k: 'desc', l: 'Descrição', t: 'textarea', full: 1, rows: 2 }],
      onDelete: id ? () => { Store.db.obrigacoes = L.filter(x => x.id !== id); Store.save(); App.refresh(); } : null });
    if (!d) return;
    if (id) Object.assign(o, d); else L.push(Object.assign(d, { id: 'ob' + Date.now() }));
    Store.save(); App.refresh();
  },

  t_simples(c, { cfg }) {
    const { money, pct, esc } = UI;
    const meses = []; for (let i = 11; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); meses.push(d.toISOString().slice(0, 7)); }
    const rows = meses.map(m => Fiscal.dasMes(m)).reverse();
    c.innerHTML = `<div class="grid g-2-1"><div class="card"><div class="card-h"><h3>Apuração estimada mês a mês</h3><span class="tiny muted">${esc(Fiscal.ANEXOS[cfg.anexo].nome)}</span></div>
        ${UI.table([{ h: 'Competência', f: r => Calc.mesLabel(r.ym) }, { h: 'Receita', num: 1, f: r => money(r.receita) }, { h: 'RBT12', num: 1, f: r => money(r.rbt12) }, { h: 'Faixa', num: 1, f: r => r.faixa }, { h: 'Alíq. efetiva', num: 1, f: r => pct(r.efetiva, 2) },
          { h: 'DAS', num: 1, f: r => `<b>${money(r.das)}</b>` }, { h: 'Federal', num: 1, f: r => money(r.federal) }, { h: 'ISS (municipal)', num: 1, f: r => money(r.municipal) }], rows,
          { foot: ['Total 12m', money(rows.reduce((a, r) => a + r.receita, 0)), '', '', '', money(rows.reduce((a, r) => a + r.das, 0)), money(rows.reduce((a, r) => a + r.federal, 0)), money(rows.reduce((a, r) => a + r.municipal, 0))] })}</div>
      <div class="stack"><div class="card"><div class="card-h"><h3>Simulador</h3></div><div class="card-b" id="sim">${UI.fields([{ k: 'rbt', l: 'Receita bruta 12 meses (RBT12)', t: 'money', def: rows[0].rbt12 }, { k: 'rec', l: 'Faturamento do mês', t: 'money', def: rows[0].receita || 10000 }, { k: 'anx', l: 'Anexo', t: 'select', o: [['III', 'Anexo III'], ['IV', 'Anexo IV'], ['V', 'Anexo V']], def: cfg.anexo, blank: false }, { k: 'folha', l: 'Folha + pró-labore 12m (Fator R)', t: 'money', def: 0 }])}<div id="simr" class="mt"></div></div></div>
      <div class="card"><div class="card-h"><h3>Tabela do anexo</h3></div>${UI.table([{ h: 'Faixa', f: (f, i) => '' }, { h: 'Até', num: 1, f: f => money(f[0]) }, { h: 'Nominal', num: 1, f: f => pct(f[1], 2) }, { h: 'Dedução', num: 1, f: f => money(f[2]) }], Fiscal.ANEXOS[cfg.anexo].faixas)}</div></div></div>`;
    const sim = UI.$('#sim', c);
    const calc = () => {
      const v = UI.read(sim, [{ k: 'rbt', t: 'money' }, { k: 'rec', t: 'money' }, { k: 'anx' }, { k: 'folha', t: 'money' }]);
      const fr = v.rbt ? v.folha / v.rbt * 100 : 0;
      const r = Fiscal.simples(v.rbt, v.anx); const das = v.rec * r.efetiva / 100;
      const alt = v.anx !== 'IV' ? Fiscal.simples(v.rbt, fr >= 28 ? 'III' : 'V') : null;
      UI.$('#simr', c).innerHTML = `<div class="alert info"><div><b>DAS: ${money(das)}</b> · efetiva ${pct(r.efetiva, 2)} (faixa ${r.faixa})<br>${Object.entries(r.rep).map(([k, p]) => `${k} ${money(das * p / 100)}`).join(' · ')}
        ${v.folha ? `<br>Fator R: <b>${pct(fr, 1)}</b> → ${fr >= 28 ? 'Anexo III' : 'Anexo V'} (efetiva ${pct(alt.efetiva, 2)})` : ''}${v.anx === 'IV' ? '<br>Anexo IV: some o INSS patronal (20% sobre folha) e verifique a retenção de 11% nas notas de obra.' : ''}</div></div>`;
    };
    sim.addEventListener('input', calc); sim.addEventListener('change', calc); calc();
  },

  t_retencoes(c, { cfg }) {
    const { money, esc, pct } = UI;
    const obras = Store.where('obras', o => ['Em execução', 'Contratada', 'Em entrega'].includes(o.status));
    const rows = obras.map(o => {
      const rec = Store.where('lancamentos', l => l.obraId === o.id && l.tipo === 'receita' && l.nf && l.status === 'pago').reduce((a, l) => a + l.valor, 0);
      const mun = window.Conhecimento ? Conhecimento.issDe(o.cidade, o.tipo) : {}; const issAliq = mun.aliq != null ? mun.aliq : (o.cidade === 'Itabirito' ? cfg.issItabirito : cfg.issBH);
      const obra = o.tipo === 'Obra';
      return { o, rec, iss: rec * issAliq / 100, issAliq, inss: obra ? rec * cfg.retencaoINSS / 100 : 0 };
    });
    c.innerHTML = `<div class="alert warn mb">${UI.icon('info')}<div>Estimativa de retenções nas notas: ISS retido pelo tomador (quando exigido pela prefeitura) e INSS de 11% em cessão de mão de obra/empreitada (obras). As alíquotas ficam em <b>Configurar</b>. Confirme cada caso com a contabilidade.</div></div>
      <div class="card">${UI.table([{ h: 'Obra', f: r => `${UI.idLink(r.o.id)} ${esc(r.o.nome)}` }, { h: 'Cidade', f: r => esc(r.o.cidade || '—') }, { h: 'Item ISS', f: r => window.Conhecimento ? Conhecimento.issDe(r.o.cidade, r.o.tipo).item : '' }, { h: 'Faturado c/ NF', num: 1, f: r => money(r.rec) },
        { h: 'ISS', num: 1, f: r => `${money(r.iss)} <span class="tiny muted">(${pct(r.issAliq, 1)})</span>` }, { h: 'INSS 11% (obra)', num: 1, f: r => r.inss ? money(r.inss) : '—' }, { h: 'Líquido estimado', num: 1, f: r => money(r.rec - r.iss - r.inss) }], rows,
        { foot: ['Total', '', money(rows.reduce((a, r) => a + r.rec, 0)), money(rows.reduce((a, r) => a + r.iss, 0)), money(rows.reduce((a, r) => a + r.inss, 0)), money(rows.reduce((a, r) => a + r.rec - r.iss - r.inss, 0))] })}</div>`;
  },

  t_feriados(c) {
    const { esc, date, icon } = UI; const s = this.st;
    const F = Fiscal.feriados(s.ano); const wd = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    const uteis = Fiscal.diasUteis(s.ano + '-01-01', s.ano + '-12-31');
    c.innerHTML = `<div class="toolbar"><button class="btn icon" id="ya">${icon('chevron-left')}</button><b>${s.ano}</b><button class="btn icon" id="yb">${icon('chevron-right')}</button>
        <span class="badge info">${uteis} dias úteis em ${s.ano} (${Store.db.fiscalCfg.cidade})</span><span class="badge">Páscoa ${date(Fiscal.pascoa(s.ano))}</span>
        <button class="btn sm primary" id="fnew" style="margin-left:auto">${icon('plus')} Feriado local / ponto facultativo</button></div>
      <div class="grid g3">${['Nacional', 'Municipal BH', 'Municipal Itabirito', 'Facultativo', 'Estadual', 'Municipal'].filter(e => F.some(f => f.esfera === e)).map(e => `<div class="card"><div class="card-h"><h3>${e === 'Nacional' ? 'Nacionais' : e === 'Facultativo' ? 'Pontos facultativos' : e}</h3>${UI.badge(String(F.filter(f => f.esfera === e).length), Fiscal.ESFERA_COR[e])}</div><div class="card-b p0">
        ${F.filter(f => f.esfera === e).map(f => `<div class="hol"><div class="hol-d"><b>${f.data.slice(8)}</b><span>${UI.MES_AB[+f.data.slice(5, 7) - 1]}</span></div><div><b>${esc(f.nome)}</b><div class="tiny muted">${wd[new Date(f.data + 'T12:00:00').getDay()]}${f.data < UI.today() ? ' · passou' : ' · em ' + UI.daysBetween(UI.today(), f.data) + ' dias'}</div></div></div>`).join('')}</div></div>`).join('')}</div>
      <p class="tiny muted mt">Estadual (MG): não há feriado estadual além dos nacionais (21/04 é nacional). Municipais de Itabirito e BH conforme calendários locais — confira os decretos de cada ano. Corpus Christi é feriado em BH e ponto facultativo em outros municípios.</p>`;
    UI.$('#ya', c).onclick = () => { s.ano--; App.refresh(); }; UI.$('#yb', c).onclick = () => { s.ano++; App.refresh(); };
    UI.$('#fnew', c).onclick = async () => {
      const d = await UI.formModal({ title: 'Novo feriado / ponto facultativo', list: [{ k: 'data', l: 'Data', t: 'date', req: 1 }, { k: 'nome', l: 'Nome', req: 1 }, { k: 'esfera', l: 'Tipo', t: 'select', o: ['Municipal', 'Municipal BH', 'Municipal Itabirito', 'Estadual', 'Facultativo'], blank: false }, { k: 'anual', l: 'Repete todo ano', t: 'check' }] });
      if (d) { Store.db.feriadosExtra = [...(Store.db.feriadosExtra || []), d]; Store.save(); Fiscal.limparCache(); App.refresh(); }
    };
  },

  t_reforma(c) {
    const { icon } = UI;
    const fases = [['2026', 'Ano de teste', 'CBS 0,9% + IBS 0,1% destacados nos documentos fiscais apenas de forma informativa (sem cobrança). Campos na NFS-e obrigatórios para parte dos emissores desde 01/10/2026 e ampliação em 01/12/2026.'],
      ['2027', 'CBS em vigor · Simples obrigado', 'CBS passa a ser cobrada e PIS/COFINS são extintos. Empresas do Simples Nacional devem preencher os campos de IBS/CBS a partir de 01/01/2027 (notas sem os campos podem ser rejeitadas).'],
      ['2029–2032', 'Transição do IBS', 'ICMS e ISS reduzidos gradualmente enquanto o IBS sobe.'],
      ['2033', 'Novo sistema completo', 'ICMS e ISS extintos; IBS/CBS plenos. O Simples continua, com opção de recolher IBS/CBS por fora do DAS.']];
    c.innerHTML = `<div class="card"><div class="card-h"><h3>Linha do tempo da reforma tributária (EC 132/2023 · LC 214/2025)</h3></div><div class="card-b"><div class="timeline">
      ${fases.map(f => `<div class="tl"><div class="d">${f[0]}</div><div><b>${f[1]}</b><div class="muted">${f[2]}</div></div></div>`).join('')}</div>
      <div class="alert info mt">${icon('info')}<div><b>Para a VTN (Simples Nacional, serviços de engenharia e obras):</b> em 2026 nada muda no DAS. Prepare o emissor de NFS-e para os campos de IBS/CBS até 01/01/2027 e avalie com a contabilidade, em 2027, se vale recolher IBS/CBS fora do Simples (gera crédito para clientes PJ).</div></div></div></div>`;
  },

  t_cfg(c, { cfg }) {
    const list = [{ k: 'anexo', l: 'Anexo do Simples usado nas estimativas', t: 'select', o: [['III', 'Anexo III'], ['IV', 'Anexo IV'], ['V', 'Anexo V']], blank: false },
      { k: 'cidade', l: 'Cidade para dias úteis/feriados', t: 'select', o: [['BH', 'Belo Horizonte'], ['Itabirito', 'Itabirito']], blank: false },
      { k: 'issBH', l: 'ISS padrão – BH (%) (usado quando a cidade/tipo não está na tabela oficial)', t: 'number' }, { k: 'issItabirito', l: 'ISS padrão – Itabirito (%)', t: 'number' },
      { k: 'retencaoINSS', l: 'Retenção INSS em obras (%)', t: 'number' }, { k: 'inicioControle', l: 'Controlar obrigações a partir de', t: 'date' }, { k: 'baseSoNF', l: 'DAS calculado só sobre receitas com NF', t: 'check' }];
    c.innerHTML = `<div class="card" style="max-width:720px"><div class="card-h"><h3>Parâmetros fiscais</h3><button class="btn sm primary" id="fs">Salvar</button></div><div class="card-b" id="ff">${UI.fields(list, cfg)}
      <div class="row mt"><button class="btn sm" id="fr">Restaurar obrigações padrão</button></div></div></div>`;
    UI.$('#fs', c).onclick = () => { Object.assign(Store.db.fiscalCfg, UI.read(UI.$('#ff', c), list)); Store.save(); Fiscal.limparCache(); UI.toast('Parâmetros salvos'); App.refresh(); };
    UI.$('#fr', c).onclick = () => { Store.db.obrigacoes = []; Store.save(); UI.toast('Obrigações restauradas'); };
  }
};
