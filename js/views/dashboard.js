/* Painel de gestão — visão geral, financeiro, operacional, comercial e fiscal */
Views.dashboard = {
  perm: 'dashboard',
  st: { tab: 'geral' },
  spark(vals, cor = '#2563eb') {
    if (!vals.length) return '';
    const w = 120, h = 34, mx = Math.max(...vals, 1), mn = Math.min(...vals, 0);
    const pts = vals.map((v, i) => `${(i / Math.max(1, vals.length - 1) * w).toFixed(1)},${(h - (v - mn) / Math.max(1, mx - mn) * (h - 4) - 2).toFixed(1)}`).join(' ');
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${cor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  },
  render(el, tab) {
    const { icon, esc } = UI; const s = this.st; if (tab) s.tab = tab;
    const u = Auth.current(); const h = new Date().getHours();
    const hoje = UI.today();
    const proxFer = (() => { for (let y = +hoje.slice(0, 4); y <= +hoje.slice(0, 4) + 1; y++) { const f = Fiscal.feriados(y).find(f => f.data > hoje && f.esfera !== 'Facultativo'); if (f) return f; } })();
    const proxImp = Fiscal.ocorrencias(hoje, Fiscal.addDays(hoje, 45)).find(o => o.status !== 'pago');
    const g = Calc.global();
    const T = [['geral', 'Visão geral', 'layout-dashboard'], ['fin', 'Financeiro', 'wallet'], ['ope', 'Operacional', 'hard-hat'], ['com', 'Comercial', 'target'], ['fis', 'Fiscal', 'landmark']];
    el.innerHTML = `
      <div class="hero"><div><div class="hero-kicker">${icon('sparkles')} ${esc(Store.db.empresa.fantasia || 'VTN')}</div><h1>${h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'}, ${esc(u.nome.split(' ')[0])}</h1>
        <p>${UI.dateLong(hoje)} · ${g.ativas} obras ativas · ${g.pendAbertas} pendências abertas</p></div>
        <div class="hero-side">
          <div><span>Próximo imposto</span><b>${proxImp ? esc(proxImp.obrig.nome.split('(')[0].split('–')[0]) : '—'}</b><small>${proxImp ? UI.date(proxImp.data) + ' · ' + proxImp.obrig.esfera : ''}</small></div>
          <div><span>Próximo feriado</span><b>${proxFer ? esc(proxFer.nome) : '—'}</b><small>${proxFer ? UI.date(proxFer.data) : ''}</small></div>
          <div><span>Caixa realizado</span><b>${UI.moneyK(g.fin.lucro)}</b><small>margem ${UI.pct(g.fin.margem)}</small></div>
        </div></div>
      <div class="pill-tabs">${T.map(t => `<button class="${t[0] === s.tab ? 'active' : ''}" data-t="${t[0]}">${icon(t[2])} ${t[1]}</button>`).join('')}
        <a class="btn sm" style="margin-left:auto" href="#/relatorios">${icon('file-bar-chart')} Relatórios</a></div>
      <div id="dc"></div>`;
    UI.$$('[data-t]', el).forEach(b => b.onclick = () => { s.tab = b.dataset.t; App.refresh(); });
    this['t_' + s.tab](UI.$('#dc', el), g);
  },
  // cards extras: caixa, CAIXA/PLS, compras, diário, comercial e mês atual
  maisCards() {
    const { pct } = UI; const moneyK = v => UI.money(v).replace(/,\d\d$/, ''); const out = []; const hoje = UI.today(), mes = hoje.slice(0, 7);
    try { if (Auth.can('financeiro.ver') && Views.financeiro.indiceCaixa) { const k = Views.financeiro.indiceCaixa(null); out.push(this.kpi(k.minimo[1] < 0 ? 'err' : k.imediata != null && k.imediata < 1 ? 'warn' : 'ok', 'gauge', 'Índice de caixa', k.imediata == null ? '—' : UI.num(k.imediata, 2) + 'x', `Fôlego ${k.folego == null ? '—' : UI.num(k.folego, 1) + ' meses'} · menor saldo 90 d ${moneyK(k.minimo[1])}`)); } } catch (e) {}
    try { const O = Store.all('obras').filter(o => o.pci && ['Contratada', 'Em execução'].includes(o.status)); if (O.length) { let risco = 0; O.forEach(o => { const ms = Store.where('medicoes', m => m.obraId === o.id).sort((a, b) => (a.data || '').localeCompare(b.data || '')); const u = ms[ms.length - 1]; if (u && /risco|Atrasada|Paralisada|atenção/i.test(u.situacao || '')) risco++; }); out.push(this.kpi(risco ? 'warn' : 'ok', 'landmark', 'Obras CAIXA', O.length, risco ? `${risco} em atenção/risco na última PLS` : 'Todas normais na última PLS')); } } catch (e) {}
    try { const C = Store.all('compras'); if (C.length) { const ab = C.filter(c => ['Cotando', 'Aprovado', 'Comprado'].includes(c.status)).length; const VC = Views.compras; const econ = C.filter(c => c.escolhido != null && c.status !== 'Cancelado').reduce((a, c) => { const t = VC.totais(c).filter(v => v > 0); return a + (t.length > 1 ? Math.max(...t) - VC.totais(c)[c.escolhido] : 0); }, 0); out.push(this.kpi('info', 'shopping-cart', 'Compras em andamento', ab, `Economia nas cotações ${moneyK(econ)}`)); } } catch (e) {}
    try { const D = Store.where('diario', d => (d.data || '').startsWith(mes)); out.push(this.kpi('', 'notebook-pen', 'Diário de obra no mês', D.length + ' dias', `${D.reduce((a, d) => a + (d.fotos || []).length, 0)} fotos · ${new Set(D.map(d => d.obraId)).size} obras`)); } catch (e) {}
    try { const O = Store.all('obras'); const fech = O.filter(o => !['Prospecção', 'Orçamento'].includes(o.status)); const g = fech.filter(o => o.status !== 'Cancelada').length; const orc = Store.all('orcamentos'); out.push(this.kpi('violet', 'target', 'Conversão comercial', pct(fech.length ? g / fech.length * 100 : 0, 0), `${O.filter(o => ['Prospecção', 'Orçamento'].includes(o.status)).length} oportunidades · ${orc.filter(o => o.status === 'Enviado').length} orçamentos enviados`)); } catch (e) {}
    try { if (Auth.can('financeiro.ver')) { const f = Calc.fin(null, { de: mes + '-01', ate: mes + '-31' }); out.push(this.kpi(f.lucro >= 0 ? 'ok' : 'err', 'calendar-check', 'Resultado do mês', moneyK(f.lucro), `Entrou ${moneyK(f.receitaPaga)} · saiu ${moneyK(f.despesaPaga)}`)); } } catch (e) {}
    try { const I = window.Indices; if (I && I.dados) { const m12 = Enq.addM(UI.today().slice(0, 7), -13); const a = k => { const r = I.acumulado(k, m12); return r ? UI.pct(r.pct, 2) : '—'; }; out.push(this.kpi('info', 'line-chart', 'Índices 12 meses (Banco Central)', a('inccdi'), `INCC-DI · IPCA ${a('ipca')} · IGP-M ${a('igpm')} · salário mínimo ${UI.money((I.ultimo('salmin') || [0, 0])[1])}`)); } } catch (e) {}
    return out.join('');
  },
  kpi(cls, ic, lbl, val, sub, spark) {
    return `<div class="card kpi ${cls}"><div class="ico">${UI.icon(ic)}</div><div class="lbl">${lbl}</div><div class="val">${val}</div><div class="sub">${sub}</div>${spark || ''}</div>`;
  },

  /* ---------------- VISÃO GERAL ---------------- */
  t_geral(c, g) {
    const { money, moneyK, pct, icon, esc, date } = UI;
    const fx = Calc.fluxoMensal(null, 12);
    const hoje = UI.today(), em15 = Fiscal.addDays(hoje, 15);
    const prox = Views.agenda.itens(hoje, em15).slice(0, 10);
    const alertas = [];
    Store.where('pendencias', p => p.status !== 'Resolvida' && p.prazo && p.prazo < hoje).forEach(p => alertas.push(['err', 'alert-circle', `Pendência atrasada: ${p.titulo}`, p.id]));
    Store.where('lancamentos', l => Calc.isAtrasado(l)).forEach(l => alertas.push(['warn', 'wallet', `${l.tipo === 'receita' ? 'Recebimento' : 'Pagamento'} vencido: ${l.descricao} (${money(l.valor)})`, l.id]));
    Fiscal.ocorrencias(Fiscal.addDays(hoje, -60), Fiscal.addDays(hoje, 7)).filter(o => o.status === 'atrasado' || o.status === 'pendente').forEach(o => alertas.push([o.data < hoje ? 'err' : 'warn', 'landmark', `${o.obrig.nome} – ${o.data < hoje ? 'venceu' : 'vence'} ${date(o.data)}`, null]));
    Store.all('obras').forEach(o => { const pz = Calc.prazo(o); if (pz.atraso > 0) alertas.push(['err', 'clock', `${o.nome}: ${pz.atraso} dias além do prazo`, o.id]); });
    (window.Enq ? Enq.alertas() : []).forEach(a => alertas.unshift([a[0], a[1], a[2], null]));
    (window.Ferramentas ? Ferramentas.alertas() : []).forEach(a => alertas.unshift(a));
    (window.Conhecimento ? Conhecimento.ALERTAS : []).filter(a => UI.daysBetween(hoje, a.data) <= 90 && UI.daysBetween(a.data, hoje) <= 30).forEach(a => alertas.unshift([a.nivel, 'siren', a.titulo, null]));
    const ativas = Store.where('obras', o => ['Em execução', 'Contratada', 'Em entrega'].includes(o.status)).sort((a, b) => (+b.valorContrato || 0) - (+a.valorContrato || 0)).slice(0, 8);
    c.innerHTML = `<div class="grid g4">
        ${this.kpi('', 'hard-hat', 'Obras ativas', g.ativas, `${g.obras} cadastradas · físico médio ${pct(g.fisicoMedio, 0)}`)}
        ${this.kpi('info', 'briefcase', 'Carteira contratada', moneyK(g.carteira), `Saldo a faturar ${moneyK(g.saldoCarteira)}`)}
        ${this.kpi('ok', 'arrow-down-circle', 'Receita recebida', moneyK(g.fin.receitaPaga), `Com NF ${moneyK(g.fin.receitaNF)}`, this.spark(fx.map(x => x.receita), '#16a34a'))}
        ${this.kpi('err', 'arrow-up-circle', 'Despesas pagas', moneyK(g.fin.despesaPaga), `A pagar ${moneyK(g.fin.despesaPendente)}`, this.spark(fx.map(x => x.despesa), '#dc2626'))}
        ${this.kpi(g.fin.lucro >= 0 ? 'ok' : 'err', 'trending-up', 'Lucro realizado', moneyK(g.fin.lucro), `Margem ${pct(g.fin.margem)} · projetado ${moneyK(g.fin.lucroProjetado)}`, this.spark(fx.map(x => x.acumulado), '#2563eb'))}
        ${this.kpi('violet', 'hand-coins', 'A receber', moneyK(g.fin.receitaPendente), g.fin.atrasadoReceber ? `<span style="color:var(--err)">Vencido ${money(g.fin.atrasadoReceber)}</span>` : 'Nada vencido')}
        ${this.kpi(g.pendAtrasadas ? 'err' : '', 'list-checks', 'Pendências abertas', g.pendAbertas, `${g.pendAtrasadas} atrasadas · ${g.entregasPend} entregas pendentes`)}
        ${this.kpi('info', 'clipboard-list', 'OS abertas', g.osAbertas, `Ticket médio ${moneyK(g.ticketMedio)}`)}
        ${this.maisCards()}
      </div>
      <div class="grid g-2-1 mt">
        <div class="card"><div class="card-h"><h3>Fluxo de caixa – 12 meses</h3><span class="tiny muted">pago/recebido</span></div><div class="card-b"><div class="chart-box"><canvas id="chFluxo"></canvas></div></div></div>
        <div class="card"><div class="card-h"><h3>Alertas</h3><span class="badge ${alertas.length ? 'err' : 'ok'}">${alertas.length}</span></div><div class="card-b stack" style="max-height:320px;overflow:auto">
          ${alertas.length ? alertas.slice(0, 14).map(a => `<div class="alert ${a[0]}" ${a[3] ? `data-goto="${a[3]}" style="cursor:pointer"` : ''}>${icon(a[1])}<div>${esc(a[2])}</div></div>`).join('') : `<div class="alert ok">${icon('check-circle')} Tudo em dia.</div>`}</div></div>
      </div>
      <div class="grid g3 mt">
        <div class="card"><div class="card-h"><h3>Receita do ano × limite ME</h3><a class="btn sm" href="#/enquadramento">Enquadramento</a></div><div class="card-b"><div class="chart-box sm"><canvas id="chAno"></canvas></div></div></div>
        <div class="card"><div class="card-h"><h3>Receita por tipo de serviço</h3></div><div class="card-b"><div class="chart-box sm"><canvas id="chTipo"></canvas></div></div></div>
        <div class="card"><div class="card-h"><h3>Maiores clientes</h3><a class="btn sm" href="#/pessoas">Clientes</a></div><div class="card-b"><div class="chart-box sm"><canvas id="chCli"></canvas></div></div></div>
      </div>
      <div class="grid g-2-1 mt">
        <div class="card"><div class="card-h"><h3>Obras ativas – saúde</h3><a class="btn sm" href="#/obras">Ver todas</a></div>${UI.table([
          { h: 'Obra', f: o => `${UI.idLink(o.id)} <span class="plink" data-goto="${o.id}">${esc(o.nome)}</span>` }, { h: 'Status', f: o => UI.badge(o.status) },
          { h: 'Físico', f: o => UI.progress(Calc.fisico(o.id)) }, { h: 'Recebido', f: o => UI.progress(Calc.obra(o).financeiroPct, 'ok') },
          { h: 'Nível', f: o => { const m = Calc.obra(o); return UI.badge(m.nivel, { 'Executada': 'ok', 'Adiantada': 'ok', 'No prazo': 'ok', 'Atenção': 'warn', 'Atrasada': 'err' }[m.nivel] || ''); } },
          { h: 'Contrato', num: 1, f: o => moneyK(o.valorContrato) }], ativas)}</div>
        <div class="card"><div class="card-h"><h3>Próximos 15 dias</h3><a class="btn sm" href="#/agenda">Agenda</a></div><div class="card-b">
          ${prox.length ? `<div class="timeline">${prox.map(e => `<div class="tl"><div class="d">${date(e.data)} ${e.hora || ''}</div><div><span class="ev ${e.cls}" style="display:inline-block">${esc(e.tipo)}</span> ${e.ref ? `<span class="plink" data-goto="${e.ref}">${esc(e.titulo)}</span>` : esc(e.titulo)}</div></div>`).join('')}</div>` : UI.empty('Sem compromissos.', 'calendar')}</div></div>
      </div>`;
    const Y = hoje.slice(0, 4); const mesesY = []; for (let m = 1; m <= +hoje.slice(5, 7); m++) mesesY.push(Y + '-' + String(m).padStart(2, '0'));
    let acY = 0; const serieY = mesesY.map(m => (acY += Store.where('lancamentos', l => l.tipo === 'receita' && l.status === 'pago' && (l.dataPagamento || l.data || '').startsWith(m)).reduce((a, l) => a + l.valor, 0)));
    UI.chart('chAno', { type: 'line', data: { labels: mesesY.map(m => Calc.mesLabel(m).slice(0, 3)), datasets: [
      { label: 'Receita acumulada ' + Y, data: serieY, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.14)', fill: true },
      { label: 'Limite ME (R$ 360 mil)', data: mesesY.map(() => 360000), borderColor: '#dc2626', borderDash: [5, 5], borderWidth: 1.5 }] },
      options: { scales: { y: { beginAtZero: true, ticks: { callback: UI.moneyTick } } }, plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ': ' + money(c.raw) } } } } });
    const porTipo = {}; Store.where('lancamentos', l => l.tipo === 'receita' && l.status === 'pago').forEach(l => { const o = l.obraId && Store.get('obras', l.obraId); const k = o ? o.tipo : 'Sem obra'; porTipo[k] = (porTipo[k] || 0) + l.valor; });
    const pt = Object.entries(porTipo).sort((a, b) => b[1] - a[1]);
    UI.chart('chTipo', { type: 'doughnut', data: { labels: pt.map(x => x[0]), datasets: [{ data: pt.map(x => x[1]), backgroundColor: UI.PALETA }] }, options: { plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: c => c.label + ': ' + money(c.raw) } } } } });
    const porCli = {}; Store.where('lancamentos', l => l.tipo === 'receita' && l.status === 'pago').forEach(l => { const o = l.obraId && Store.get('obras', l.obraId); const pid = l.pessoaId || (o && (o.clienteIds || [])[0]); if (!pid) return; porCli[pid] = (porCli[pid] || 0) + l.valor; });
    const pc = Object.entries(porCli).sort((a, b) => b[1] - a[1]).slice(0, 7);
    UI.chart('chCli', { type: 'bar', data: { labels: pc.map(x => ((Store.get('pessoas', x[0]) || {}).nome || x[0]).split(' ').slice(0, 2).join(' ')), datasets: [{ label: 'Recebido', data: pc.map(x => x[1]), backgroundColor: '#db2777' }] }, options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => money(c.raw) } } }, scales: { x: { ticks: { callback: UI.moneyTick } } } } });
    UI.chart('chFluxo', { type: 'bar', data: { labels: fx.map(x => Calc.mesLabel(x.mes)), datasets: [
      { label: 'Receitas', data: fx.map(x => x.receita), backgroundColor: '#16a34a', borderRadius: 6 },
      { label: 'Despesas', data: fx.map(x => x.despesa), backgroundColor: '#ef4444', borderRadius: 6 },
      { label: 'Saldo acumulado', data: fx.map(x => x.acumulado), type: 'line', borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.12)', fill: true, tension: .35 }] },
      options: { scales: { y: { ticks: { callback: UI.moneyTick } } }, plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ': ' + money(c.raw) } } } } });
  },

  /* ---------------- FINANCEIRO ---------------- */
  t_fin(c, g) {
    const { money, moneyK, pct, esc } = UI; const hoje = UI.today();
    const fx = Calc.fluxoMensal(null, 12); const L = Store.all('lancamentos');
    const mesesComMov = fx.length || 1;
    const burn = fx.reduce((a, x) => a + x.despesa, 0) / mesesComMov, recMed = fx.reduce((a, x) => a + x.receita, 0) / mesesComMov;
    const pend = L.filter(l => l.tipo === 'receita' && l.status !== 'pago');
    const aging = [['A vencer / sem data', l => !l.vencimento || l.vencimento >= hoje], ['1–30 dias', l => l.vencimento && UI.daysBetween(l.vencimento, hoje) >= 1 && UI.daysBetween(l.vencimento, hoje) <= 30], ['31–60 dias', l => l.vencimento && UI.daysBetween(l.vencimento, hoje) > 30 && UI.daysBetween(l.vencimento, hoje) <= 60], ['61–90 dias', l => l.vencimento && UI.daysBetween(l.vencimento, hoje) > 60 && UI.daysBetween(l.vencimento, hoje) <= 90], ['+90 dias', l => l.vencimento && UI.daysBetween(l.vencimento, hoje) > 90]]
      .map(([n, f]) => [n, pend.filter(f).reduce((a, l) => a + l.valor, 0)]);
    const prev = [30, 60, 90].map(d => { const ate = Fiscal.addDays(hoje, d); const r = L.filter(l => l.status !== 'pago' && l.tipo === 'receita' && l.vencimento && l.vencimento <= ate).reduce((a, l) => a + l.valor, 0); const p = L.filter(l => l.status !== 'pago' && l.tipo === 'despesa' && l.vencimento && l.vencimento <= ate).reduce((a, l) => a + l.valor, 0); return [d, r, p]; });
    const porObra = Store.all('obras').map(o => ({ o, f: Calc.fin(o.id) })).filter(x => x.f.receitaPaga || x.f.despesaPaga).sort((a, b) => b.f.lucro - a.f.lucro).slice(0, 10);
    const cliRec = {}; L.filter(l => l.tipo === 'receita' && l.status === 'pago').forEach(l => { const o = Store.get('obras', l.obraId); const k = o ? o.id : 'Geral'; cliRec[k] = (cliRec[k] || 0) + l.valor; });
    const topCli = Object.entries(cliRec).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const catR = Calc.porCategoria('receita'), catD = Calc.porCategoria('despesa');
    c.innerHTML = `<div class="grid g4">
        ${this.kpi('ok', 'arrow-down-circle', 'Receita média mensal', moneyK(recMed), `${mesesComMov} meses com movimento`)}
        ${this.kpi('err', 'flame', 'Burn rate (despesa média/mês)', moneyK(burn), burn ? `Cobertura do caixa: ${(g.fin.lucro / burn).toFixed(1).replace('.', ',')} meses` : '—')}
        ${this.kpi('violet', 'hourglass', 'Recebíveis em aberto', moneyK(pend.reduce((a, l) => a + l.valor, 0)), `${pend.length} lançamentos`)}
        ${this.kpi('info', 'receipt', '% receita com NF', pct(g.fin.receitaPaga ? g.fin.receitaNF / g.fin.receitaPaga * 100 : 0), `Sem NF ${moneyK(g.fin.receitaPaga - g.fin.receitaNF)}`)}
        ${prev.map(([d, r, p]) => this.kpi(r - p >= 0 ? 'ok' : 'err', 'calendar-range', `Previsão de caixa ${d} dias`, moneyK(g.fin.lucro + r - p), `Entra ${moneyK(r)} · sai ${moneyK(p)}`)).join('')}
        ${this.kpi('', 'scale', 'Resultado projetado', moneyK(g.fin.lucroProjetado), 'Realizado + a receber − a pagar')}
      </div>
      <div class="grid g2 mt">
        <div class="card"><div class="card-h"><h3>Lucro por obra (top 10)</h3></div><div class="card-b"><div class="chart-box"><canvas id="chLo"></canvas></div></div></div>
        <div class="card"><div class="card-h"><h3>Aging de recebíveis</h3></div><div class="card-b"><div class="chart-box"><canvas id="chAg"></canvas></div></div></div>
        <div class="card"><div class="card-h"><h3>Receitas por categoria</h3></div><div class="card-b"><div class="chart-box sm"><canvas id="chCr"></canvas></div></div></div>
        <div class="card"><div class="card-h"><h3>Despesas por categoria</h3></div><div class="card-b"><div class="chart-box sm"><canvas id="chCd"></canvas></div></div></div>
      </div>
      <div class="card mt"><div class="card-h"><h3>Maiores receitas por obra/cliente</h3></div>${UI.table([{ h: '#', f: (r) => topCli.indexOf(r) + 1 }, { h: 'Obra', f: r => r[0] === 'Geral' ? 'Lançamentos gerais' : `${UI.idLink(r[0])} ${esc((Store.get('obras', r[0]) || {}).nome || '')}` }, { h: 'Recebido', num: 1, f: r => money(r[1]) }, { h: '% do total', num: 1, f: r => pct(r[1] / Math.max(1, g.fin.receitaPaga) * 100) }], topCli)}</div>`;
    UI.chart('chLo', { type: 'bar', data: { labels: porObra.map(x => x.o.id), datasets: [{ label: 'Lucro', data: porObra.map(x => x.f.lucro), backgroundColor: porObra.map(x => x.f.lucro >= 0 ? '#16a34a' : '#ef4444'), borderRadius: 6 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ticks: { callback: UI.moneyTick } } } } });
    UI.chart('chAg', { type: 'bar', data: { labels: aging.map(a => a[0]), datasets: [{ label: 'Valor', data: aging.map(a => a[1]), backgroundColor: ['#2563eb', '#f59e0b', '#f97316', '#ef4444', '#991b1b'], borderRadius: 6 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: UI.moneyTick } } } } });
    UI.chart('chCr', { type: 'doughnut', data: { labels: catR.map(x => x[0]), datasets: [{ data: catR.map(x => x[1]), backgroundColor: UI.PALETA, borderWidth: 0 }] }, options: { cutout: '62%', plugins: { legend: { position: 'right' } } } });
    UI.chart('chCd', { type: 'doughnut', data: { labels: catD.map(x => x[0]), datasets: [{ data: catD.map(x => x[1]), backgroundColor: UI.PALETA, borderWidth: 0 }] }, options: { cutout: '62%', plugins: { legend: { position: 'right' } } } });
  },

  /* ---------------- OPERACIONAL ---------------- */
  t_ope(c, g) {
    const { pct, esc } = UI; const hoje = UI.today();
    const O = Store.all('obras');
    const cnt = (arr, f) => { const m = {}; arr.forEach(x => { const k = f(x) || '—'; m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
    const porStatus = cnt(O, o => o.status), porTipo = cnt(O, o => o.tipo), porCidade = cnt(O, o => o.cidade).slice(0, 8);
    const E = Store.all('entregas'); const ent = E.filter(e => ['Entregue', 'Aprovada'].includes(e.status) && e.prazo && e.dataEntrega);
    const noPrazo = ent.filter(e => e.dataEntrega <= e.prazo).length;
    const P = Store.where('pendencias', p => p.status !== 'Resolvida');
    const OSab = Store.where('os', x => !['Concluída', 'Cancelada'].includes(x.status));
    const carga = {}; [...P, ...OSab].forEach(x => { const n = (Store.get('pessoas', x.responsavelId) || {}).nome || 'Sem responsável'; carga[n] = (carga[n] || 0) + 1; });
    const cargaL = Object.entries(carga).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const ativas = O.filter(o => ['Em execução', 'Contratada', 'Em entrega'].includes(o.status));
    const idps = ativas.map(o => Calc.obra(o).idp).filter(x => x != null);
    const conc = O.filter(o => o.status === 'Concluída' && o.dataInicio && o.dataTermino);
    const durMed = conc.length ? conc.reduce((a, o) => a + UI.daysBetween(o.dataInicio, o.dataTermino), 0) / conc.length : 0;
    c.innerHTML = `<div class="grid g4">
        ${this.kpi('', 'activity', 'IDP médio (físico ÷ previsto)', idps.length ? (idps.reduce((a, b) => a + b, 0) / idps.length).toFixed(2).replace('.', ',') : '—', '≥ 1 = no prazo ou adiantado')}
        ${this.kpi('ok', 'package-check', 'Entregas no prazo', pct(ent.length ? noPrazo / ent.length * 100 : 0, 0), `${noPrazo} de ${ent.length} entregas`)}
        ${this.kpi('info', 'timer', 'Duração média (concluídas)', Math.round(durMed) + ' dias', `${conc.length} obras/serviços concluídos`)}
        ${this.kpi(P.filter(p => p.prazo && p.prazo < hoje).length ? 'err' : '', 'alert-triangle', 'Pendências críticas/altas', P.filter(p => ['Alta', 'Crítica'].includes(p.prioridade)).length, `${P.length} abertas no total`)}
      </div>
      <div class="grid g3 mt">
        <div class="card"><div class="card-h"><h3>Obras por status</h3></div><div class="card-b"><div class="chart-box sm"><canvas id="chSt"></canvas></div></div></div>
        <div class="card"><div class="card-h"><h3>Por tipo de serviço</h3></div><div class="card-b"><div class="chart-box sm"><canvas id="chTp"></canvas></div></div></div>
        <div class="card"><div class="card-h"><h3>Por cidade</h3></div><div class="card-b"><div class="chart-box sm"><canvas id="chCi"></canvas></div></div></div>
      </div>
      <div class="grid g2 mt">
        <div class="card"><div class="card-h"><h3>Avanço físico real × previsto</h3></div><div class="card-b"><div class="chart-box"><canvas id="chFis"></canvas></div></div></div>
        <div class="card"><div class="card-h"><h3>Carga por responsável (OS + pendências)</h3></div><div class="card-b"><div class="chart-box"><canvas id="chCg"></canvas></div></div></div>
      </div>`;
    const donut = (id, d) => UI.chart(id, { type: 'doughnut', data: { labels: d.map(x => x[0]), datasets: [{ data: d.map(x => x[1]), backgroundColor: UI.PALETA, borderWidth: 0 }] }, options: { cutout: '60%', plugins: { legend: { position: 'right' } } } });
    donut('chSt', porStatus); donut('chTp', porTipo);
    UI.chart('chCi', { type: 'bar', data: { labels: porCidade.map(x => x[0]), datasets: [{ data: porCidade.map(x => x[1]), backgroundColor: '#2563eb', borderRadius: 6 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } } } });
    UI.chart('chFis', { type: 'bar', data: { labels: ativas.map(o => o.id), datasets: [{ label: 'Real', data: ativas.map(o => Calc.fisico(o.id)), backgroundColor: '#2563eb', borderRadius: 6 }, { label: 'Previsto', data: ativas.map(o => Calc.previsto(o.id) ?? 0), backgroundColor: '#cbd5e1', borderRadius: 6 }] }, options: { scales: { y: { max: 100, ticks: { callback: v => v + '%' } } } } });
    UI.chart('chCg', { type: 'bar', data: { labels: cargaL.map(x => x[0].split(' ').slice(0, 2).join(' ')), datasets: [{ label: 'Itens abertos', data: cargaL.map(x => x[1]), backgroundColor: '#7c3aed', borderRadius: 6 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } } } });
  },

  /* ---------------- COMERCIAL ---------------- */
  t_com(c, g) {
    const { money, moneyK, pct, esc } = UI;
    const O = Store.all('obras');
    const etapas = [['Prospecção', ['Prospecção']], ['Orçamento', ['Orçamento']], ['Contratada', ['Contratada', 'Em planejamento']], ['Em execução', ['Em execução', 'Em entrega']], ['Concluída', ['Concluída']]];
    const funil = etapas.map(([n, st]) => [n, O.filter(o => st.includes(o.status)).length, O.filter(o => st.includes(o.status)).reduce((a, o) => a + (+o.valorContrato || 0), 0)]);
    const perdidas = O.filter(o => o.status === 'Cancelada').length;
    const ganhas = O.filter(o => ['Contratada', 'Em planejamento', 'Em execução', 'Em entrega', 'Concluída'].includes(o.status)).length;
    const conv = ganhas + perdidas ? ganhas / (ganhas + perdidas) * 100 : 0;
    const orcs = Store.all('orcamentos'); const pipe = orcs.filter(o => ['Enviado', 'Rascunho'].includes(o.status)).reduce((a, o) => a + Calc.orcTotal(o).total, 0);
    const porMes = {}; O.forEach(o => { const m = (o.dataInicio || o.criadoEm || '').slice(0, 7); if (m >= Fiscal.addDays(UI.today(), -365).slice(0, 7)) porMes[m] = (porMes[m] || 0) + 1; });
    const mesesL = Object.keys(porMes).sort();
    const tiposVal = {}; Store.where('lancamentos', l => l.tipo === 'receita' && l.status === 'pago').forEach(l => { const o = Store.get('obras', l.obraId); const k = o ? o.tipo : 'Geral'; tiposVal[k] = (tiposVal[k] || 0) + l.valor; });
    const mx = Math.max(...funil.map(f => f[1]), 1);
    c.innerHTML = `<div class="grid g4">
        ${this.kpi('ok', 'target', 'Taxa de conversão', pct(conv, 0), `${ganhas} ganhos · ${perdidas} perdidos`)}
        ${this.kpi('info', 'filter', 'Pipeline (orçamentos abertos)', moneyK(pipe), `${orcs.filter(o => ['Enviado', 'Rascunho'].includes(o.status)).length} orçamentos`)}
        ${this.kpi('violet', 'users', 'Leads em prospecção', funil[0][1], `${funil[1][1]} com proposta enviada`)}
        ${this.kpi('', 'badge-dollar-sign', 'Ticket médio (contratos)', moneyK(g.ticketMedio), `${O.filter(o => o.valorContrato).length} com valor definido`)}
      </div>
      <div class="grid g-2-1 mt">
        <div class="card"><div class="card-h"><h3>Funil comercial</h3><span class="tiny muted">quantidade e valor por etapa</span></div><div class="card-b"><div class="funnel">${funil.map((f, i) => `<div class="fn-row"><div class="fn-lbl">${f[0]}</div><div class="fn-bar"><i style="width:${Math.max(6, f[1] / mx * 100)}%;background:${UI.PALETA[i]}">${f[1]}</i></div><div class="fn-val">${moneyK(f[2])}</div></div>`).join('')}
          <div class="fn-row"><div class="fn-lbl">Perdidas</div><div class="fn-bar"><i style="width:${Math.max(6, perdidas / mx * 100)}%;background:#94a3b8">${perdidas}</i></div><div class="fn-val"></div></div></div></div></div>
        <div class="card"><div class="card-h"><h3>Receita por tipo de serviço</h3></div><div class="card-b"><div class="chart-box sm"><canvas id="chTv"></canvas></div></div></div>
      </div>
      <div class="card mt"><div class="card-h"><h3>Novos serviços por mês (12 meses)</h3></div><div class="card-b"><div class="chart-box sm"><canvas id="chNm"></canvas></div></div></div>`;
    UI.chart('chTv', { type: 'doughnut', data: { labels: Object.keys(tiposVal), datasets: [{ data: Object.values(tiposVal), backgroundColor: UI.PALETA, borderWidth: 0 }] }, options: { cutout: '60%', plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: c => c.label + ': ' + money(c.raw) } } } } });
    UI.chart('chNm', { type: 'bar', data: { labels: mesesL.map(Calc.mesLabel), datasets: [{ label: 'Novos', data: mesesL.map(m => porMes[m]), backgroundColor: '#2563eb', borderRadius: 6 }] }, options: { plugins: { legend: { display: false } } } });
  },

  /* ---------------- FISCAL ---------------- */
  t_fis() { this.st.tab = 'geral'; Views.impostos.st.tab = 'painel'; location.hash = '#/impostos'; }
};
