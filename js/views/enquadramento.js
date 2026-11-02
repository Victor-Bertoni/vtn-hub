/* Enquadramento em tempo real: ME/EPP, faixa do Simples, Fator R, sublimite e teto */
Views.enquadramento = {
  perm: 'financeiro.ver',
  st: { tab: 'painel', extraMensal: 0, extraUnico: 0 },
  T: [['painel', 'Painel ao vivo', 'activity'], ['mudancas', 'O que muda', 'git-compare'], ['simulador', 'Simulador', 'sliders-horizontal'], ['historico', 'Histórico de mudanças', 'history'], ['cfg', 'Dados do Fator R', 'settings-2']],
  render(el, tab) {
    const { icon, money, pct, esc } = UI; const s = this.st; if (tab) s.tab = tab;
    const e = Enq.estado();
    const al = Enq.alertas(e);
    el.innerHTML = `
      <div class="hero hero-enq"><div><div class="hero-kicker"><span class="live-dot"></span> Ao vivo · recalculado a cada lançamento</div><h1>Enquadramento e incentivos</h1>
        <p>Porte (ME/EPP), faixa e anexo do Simples Nacional, Fator R, sublimite e teto – com o que muda em cada passagem.</p></div>
        <div class="hero-side">
          <div><span>Porte em ${e.Y}</span><b>${e.catAtual}</b><small>receita ${e.Y - 1}: ${UI.moneyK(e.anoAnt)}</small></div>
          <div><span>Previsão ${e.Y + 1}</span><b>${esc(e.catProx)}</b><small>ano projetado ${UI.moneyK(e.projAno)}</small></div>
          <div><span>Simples agora</span><b>Anexo ${e.anexo} · ${e.faixa}ª faixa</b><small>alíquota efetiva ${pct(e.efetiva, 2)}</small></div>
        </div></div>
      <div class="pill-tabs">${this.T.map(t => `<button class="${t[0] === s.tab ? 'active' : ''}" data-t="${t[0]}">${icon(t[2])} ${t[1]}</button>`).join('')}</div>
      <div id="ec"></div>`;
    UI.$$('[data-t]', el).forEach(b => b.onclick = () => { s.tab = b.dataset.t; App.refresh(); });
    this['t_' + s.tab](UI.$('#ec', el), e, al);
  },

  meter(lbl, val, lim, sub, cor) {
    const p = Math.min(100, val / lim * 100);
    const c = cor || (p >= 100 ? 'var(--err)' : p >= 80 ? 'var(--warn)' : 'var(--ok)');
    return `<div class="meter"><div class="row between"><b>${lbl}</b><span class="tiny muted">${UI.money(val)} de ${UI.money(lim)}</span></div>
      <div class="meter-bar"><i style="width:${p.toFixed(1)}%;background:${c}"></i><em style="left:80%"></em></div>
      <div class="row between tiny"><span style="color:${c};font-weight:700">${UI.pct(val / lim * 100, 1)}</span><span class="muted">${sub}</span></div></div>`;
  },

  t_painel(c, e, al) {
    const { money, pct, icon, esc } = UI;
    const gauge = Math.min(60, e.fatorR);
    c.innerHTML = `
      ${al.length ? `<div class="stack mb">${al.map(a => `<div class="alert ${a[0]}" data-mud="${a[3]}" style="cursor:pointer">${icon(a[1])}<div><b>${esc(a[2])}</b> <span class="tiny">· ver o que muda →</span></div></div>`).join('')}</div>` : `<div class="alert ok mb">${icon('shield-check')} Nenhuma mudança de categoria prevista para os próximos 12 meses.</div>`}
      <div class="grid g4 mb">
        ${Views.dashboard.kpi('', 'calendar-range', `Receita ${e.Y} (acumulada)`, UI.moneyK(e.acumAno), `${pct(e.pctME, 0)} do limite de ME`)}
        ${Views.dashboard.kpi('info', 'repeat', 'RBT12 (12 meses anteriores)', UI.moneyK(e.r12), `faixa ${e.faixa} vai até ${UI.moneyK(e.limFaixa)}`)}
        ${Views.dashboard.kpi(e.informouFolha ? (e.fatorR >= 28 ? 'ok' : 'err') : 'violet', 'percent', 'Fator R', e.informouFolha ? pct(e.fatorR, 1) : '—', e.informouFolha ? (e.fatorR >= 28 ? 'Anexo III garantido' : 'Anexo V – revisar pró-labore') : 'informe o pró-labore')}
        ${Views.dashboard.kpi('', 'receipt', 'Alíquota efetiva', pct(e.efetiva, 2), `em 12 meses: ${pct(e.efet12, 2)}`)}
      </div>
      <div class="grid g-2-1 mb">
        <div class="card"><div class="card-h"><h3>RBT12 real e projetada × limites</h3><span class="legend-inline"><span><i style="background:#2563eb"></i>real</span><span><i style="background:#94a3b8"></i>projeção</span></span></div><div class="card-b"><div class="chart-box"><canvas id="eqc"></canvas></div>
          <p class="tiny muted" style="margin:8px 0 0">Projeção = média dos últimos ${e.cfg.mesesMedia} meses fechados (${money(e.media)}/mês) ou o que já está lançado a receber, o que for maior. Regime de caixa (receitas pagas).</p></div></div>
        <div class="card"><div class="card-h"><h3>Limites do ano ${e.Y}</h3></div><div class="card-b stack">
          ${this.meter('Microempresa (ME)', e.acumAno, Enq.ME, e.catAtual === 'ME' ? (e.cruzaME ? 'passa em ' + Calc.mesLabel(e.cruzaME) : 'dentro do limite') : 'já é EPP')}
          ${this.meter('Sublimite ISS no DAS', e.acumAno, Enq.SUB, 'R$ 3,6 milhões')}
          ${this.meter('Teto do Simples', e.acumAno, Enq.EPP, 'R$ 4,8 milhões')}
          <div class="meter"><div class="row between"><b>Fator R</b><span class="tiny muted">mínimo 28% para o Anexo III</span></div>
            <div class="meter-bar"><i style="width:${(gauge / 60 * 100).toFixed(1)}%;background:${e.fatorR >= 28 ? 'var(--ok)' : 'var(--err)'}"></i><em style="left:${28 / 60 * 100}%"></em></div>
            <div class="row between tiny"><span>${e.informouFolha ? pct(e.fatorR, 1) : 'sem dados de folha'}</span><span class="muted">pró-labore mínimo ${money(e.proLaboreMin)}/mês</span></div></div>
        </div></div>
      </div>
      <div class="card"><div class="card-h"><h3>Faixas do Anexo ${e.anexo} – onde a VTN está</h3><span class="tiny muted">${esc(Fiscal.ANEXOS[e.anexo].nome)}</span></div><div class="card-b p0 table-wrap">
        <table class="t"><thead><tr><th>Faixa</th><th>RBT12 até</th><th class="num">Nominal</th><th class="num">Dedução</th><th class="num">Efetiva no topo</th><th></th></tr></thead><tbody>
        ${e.faixas.map((f, i) => { const ef = Fiscal.simples(f[0], e.anexo).efetiva; const at = i + 1 === e.faixa; return `<tr class="${at ? 'row-hl' : ''}"><td><b>${i + 1}ª</b></td><td>${money(f[0])}</td><td class="num">${pct(f[1], 1)}</td><td class="num">${money(f[2])}</td><td class="num">${pct(ef, 2)}</td><td>${at ? UI.badge('VTN agora · ' + pct(e.efetiva, 2), 'brand') : e.mudaFaixa && e.mudaFaixa.faixa === i + 1 ? UI.badge('próxima · ' + Calc.mesLabel(e.mudaFaixa.ym), 'warn') : ''}</td></tr>`; }).join('')}
        </tbody></table></div></div>`;
    UI.$$('[data-mud]', c).forEach(a => a.onclick = () => { this.st.tab = 'mudancas'; this.st.foco = a.dataset.mud; App.refresh(); });
    const meses = e.serie.slice(12, 37);
    UI.chart('eqc', { type: 'line', data: { labels: meses.map(x => Calc.mesLabel(x.ym)), datasets: [
      { label: 'RBT12 real', data: meses.map(x => x.ym <= e.ym ? e.rbt12De(x.ym) : null), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.12)', fill: true, tension: .35, pointRadius: 0, borderWidth: 2.5 },
      { label: 'RBT12 projetada', data: meses.map(x => x.ym >= e.ym ? e.rbt12De(x.ym) : null), borderColor: '#94a3b8', borderDash: [6, 5], tension: .35, pointRadius: 0, borderWidth: 2 },
      { label: 'Limite ME / 2ª faixa (R$ 360 mil)', data: meses.map(() => 360000), borderColor: '#dc2626', borderWidth: 1, pointRadius: 0, borderDash: [2, 3] },
      { label: '1ª faixa (R$ 180 mil)', data: meses.map(() => 180000), borderColor: '#d97706', borderWidth: 1, pointRadius: 0, borderDash: [2, 3] },
      { label: '3ª faixa (R$ 720 mil)', data: meses.map(() => 720000), borderColor: '#7c3aed', borderWidth: 1, pointRadius: 0, borderDash: [2, 3] }
    ] }, options: { scales: { y: { ticks: { callback: UI.moneyTick } } }, plugins: { legend: { display: false } } } });
  },

  t_mudancas(c, e) {
    const { icon, esc, money, pct } = UI; const foco = this.st.foco;
    const ativo = k => ({ me_epp: e.catAtual === 'ME' && e.catProx !== 'ME', faixa: !!e.mudaFaixa, fator_r: e.informouFolha && e.fatorR < 31, sublimite: e.pctSUB >= 80, teto: e.pctEPP >= 80 })[k];
    c.innerHTML = `<div class="alert info mb">${icon('info')}<div>Cada cartão mostra a regra, o que muda na prática e a base legal. Os marcados <b>"previsto para a VTN"</b> são os que a projeção atual indica. Limites de R$ 360 mil e R$ 4,8 milhões, construção civil no Anexo IV e exclusão no mês seguinte quando o excesso passa de 20% foram conferidos no <a href="https://www8.receita.fazenda.gov.br/simplesnacional/arquivos/manual/perguntaosn.pdf" target="_blank" rel="noopener"><u>Perguntas e Respostas do Simples (Receita/CGSN, 09/10/2026)</u></a>.</div></div>
      <div class="grid g2">${Object.entries(Enq.MUDANCAS).map(([k, m]) => `<div class="card mud ${ativo(k) ? 'on' : ''} ${foco === k ? 'foco' : ''}"><div class="card-b">
        <div class="row between"><div class="row"><div class="ico-big">${icon(m.icon)}</div><h3>${esc(m.titulo)}</h3></div>${ativo(k) ? UI.badge('previsto para a VTN', 'warn') : UI.badge('não previsto', 'ok')}</div>
        <ul class="mud-list">${m.itens.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
        <div class="tiny muted">Base: ${esc(m.fonte)}</div></div></div>`).join('')}</div>
      <div class="card mt"><div class="card-h"><h3>Se a VTN sair do Simples – comparação estimada (12 meses projetados)</h3></div><div class="card-b" id="cmp"></div></div>`;
    const R = Math.max(e.projAno, e.r12), folha = e.folha12;
    const das = R * Fiscal.simples(R, e.anexo).efetiva / 100;
    const presS = R * 0.32, irpj = presS * 0.15 + Math.max(0, presS - 240000) * 0.10, csll = presS * 0.09, pis = R * 0.0065, cof = R * 0.03, iss = R * e.cfg.iss / 100, cpp = folha * 0.20;
    const lp = irpj + csll + pis + cof + iss + cpp;
    UI.$("#cmp", c).innerHTML = `<div class="grid g2" style="align-items:start"><table class="t"><tbody><tr><th colspan="2">Simples Nacional (Anexo ${e.anexo})</th></tr><tr><td>DAS sobre ${money(R)}</td><td class="num">${money(das)}</td></tr>${e.anexo === 'IV' ? `<tr><td>INSS patronal (20% da folha)</td><td class="num">${money(cpp)}</td></tr>` : ''}<tr><td><b>Total</b></td><td class="num"><b>${money(das + (e.anexo === 'IV' ? cpp : 0))}</b></td></tr></tbody></table>
      <table class="t"><tbody><tr><th colspan="2">Lucro Presumido (serviços, presunção 32%)</th></tr><tr><td>IRPJ 15% + adicional 10%</td><td class="num">${money(irpj)}</td></tr><tr><td>CSLL 9%</td><td class="num">${money(csll)}</td></tr><tr><td>PIS 0,65% + COFINS 3%</td><td class="num">${money(pis + cof)}</td></tr><tr><td>ISS ${pct(e.cfg.iss, 1)}</td><td class="num">${money(iss)}</td></tr><tr><td>INSS patronal 20% da folha</td><td class="num">${money(cpp)}</td></tr><tr><td><b>Total</b></td><td class="num"><b>${money(lp)}</b></td></tr></tbody></table></div>
      <p class="tiny muted">Estimativa simplificada: não inclui RAT/terceiros, a regra da LC 224/2025 nem CBS/IBS. Use para conversar com o contador.</p>`;
  },

  t_simulador(c) {
    const { money, pct, icon, esc } = UI; const s = this.st;
    c.innerHTML = `<div class="grid g-2-1"><div class="card"><div class="card-h"><h3>E se…?</h3></div><div class="card-b">
      <div class="field"><label>Faturamento extra por mês: <b id="lv1">${money(s.extraMensal)}</b></label><input type="range" id="sv1" min="0" max="100000" step="1000" value="${s.extraMensal}" style="width:100%"></div>
      <div class="field mt"><label>Contrato fechado agora (valor único): <b id="lv2">${money(s.extraUnico)}</b></label><input type="range" id="sv2" min="0" max="1000000" step="5000" value="${s.extraUnico}" style="width:100%"></div>
      <div id="sres" class="mt"></div></div></div>
      <div class="card"><div class="card-h"><h3>Como ler</h3></div><div class="card-b tiny"><p>Mova as barras para ver, na hora, se a VTN muda de porte, de faixa ou de anexo, e quanto a alíquota efetiva muda.</p><p>O simulador não grava nada.</p></div></div></div>`;
    const go = () => {
      const base = Enq.estado(), e = Enq.estado({ extraMensal: s.extraMensal, extraUnico: s.extraUnico });
      UI.$('#lv1', c).textContent = money(s.extraMensal); UI.$('#lv2', c).textContent = money(s.extraUnico);
      const lin = (l, a, b, f) => `<tr><td>${l}</td><td class="num">${f(a)}</td><td class="num"><b style="color:${a === b ? 'inherit' : 'var(--brand)'}">${f(b)}</b></td></tr>`;
      UI.$('#sres', c).innerHTML = `<table class="t"><thead><tr><th></th><th class="num">Hoje</th><th class="num">Simulado</th></tr></thead><tbody>
        ${lin('Receita projetada do ano', base.projAno, e.projAno, money)}${lin('Porte no ano que vem', base.catProx, e.catProx, esc)}
        ${lin('RBT12 em 12 meses', base.rbt12De(Enq.addM(base.ym, 12)), e.rbt12De(Enq.addM(e.ym, 12)), money)}
        ${lin('Alíquota efetiva em 12 meses', base.efet12, e.efet12, v => pct(v, 2))}
        ${lin('Situação no Simples', Enq.STATUS_TXT[base.simplesStatus], Enq.STATUS_TXT[e.simplesStatus], esc)}
        ${lin('Pró-labore mínimo (Fator R)', base.proLaboreMin, e.proLaboreMin, money)}</tbody></table>
        ${Enq.alertas(e).map(a => `<div class="alert ${a[0]} mt">${icon(a[1])}<div>${esc(a[2])}</div></div>`).join('')}`;
      UI.icons();
    };
    UI.$('#sv1', c).oninput = ev => { s.extraMensal = +ev.target.value; go(); };
    UI.$('#sv2', c).oninput = ev => { s.extraUnico = +ev.target.value; go(); };
    go();
  },

  t_historico(c) {
    const { esc, money, dateTime, icon } = UI; const H = Store.db.enqHist || [];
    c.innerHTML = `<div class="card"><div class="card-h"><h3>Mudanças detectadas automaticamente</h3><span class="tiny muted">cada mudança também gera um relatório na Central de relatórios</span></div><div class="card-b">
      ${H.length ? `<div class="timeline">${H.map(h => `<div class="tl"><b>${esc(h.texto)}</b><div class="d">${dateTime(h.data)} · receita do ano ${money(h.acumAno)} · RBT12 ${money(h.rbt12)}</div></div>`).join('')}</div>` : UI.empty('Nenhuma mudança registrada ainda. O app vigia a cada lançamento.', 'history')}</div></div>`;
  },

  t_cfg(c, e) {
    const k = Enq.cfg();
    c.innerHTML = `<div class="grid g2"><div class="card"><div class="card-h"><h3>Dados para o Fator R e a projeção</h3></div><div class="card-b">
      ${UI.fields(this.CF = [{ k: 'proLabore', l: 'Pró-labore mensal total dos sócios', t: 'money', def: k.proLabore }, { k: 'folha', l: 'Salários + encargos mensais (CLT, FGTS, INSS patronal)', t: 'money', def: k.folha },
        { k: 'mesesMedia', l: 'Meses para a média da projeção', t: 'select', o: [['3', '3 meses'], ['6', '6 meses'], ['12', '12 meses']], def: String(k.mesesMedia), blank: false },
        { k: 'incluirAReceber', l: 'Considerar contas a receber já lançadas', t: 'select', o: [['1', 'Sim'], ['0', 'Não']], def: k.incluirAReceber ? '1' : '0', blank: false }])}
      <button class="btn primary mt" id="esv">${UI.icon('save')} Salvar</button>
      <p class="tiny muted">Lançamentos de despesa com categoria ou descrição "pró-labore", "folha", "salário", "FGTS" ou "INSS" também entram no Fator R automaticamente (${UI.money(e.folhaLanc)} nos últimos 12 meses). O anexo principal é definido em Impostos → Configurar.</p></div></div>
      <div class="card"><div class="card-h"><h3>Regras usadas</h3></div><div class="card-b tiny"><ul>
        <li>Porte do ano = receita bruta do ano anterior (ME até R$ 360 mil; EPP até R$ 4,8 mi).</li><li>Faixa do DAS = RBT12, receita dos 12 meses anteriores ao mês.</li>
        <li>Fator R = folha 12 meses ÷ RBT12; ≥ 28% → Anexo III.</li><li>Sublimite R$ 3,6 mi (ISS fora do DAS) e teto R$ 4,8 mi, com a regra dos 20%.</li>
        <li>Empresa em início de atividade: limite proporcional de R$ 30 mil (ME) ou R$ 400 mil (EPP) por mês de atividade no ano.</li></ul></div></div></div>`;
    UI.$('#esv', c).onclick = () => { const v = UI.read(c, this.CF); Enq.salvarCfg({ proLabore: +v.proLabore || 0, folha: +v.folha || 0, mesesMedia: +v.mesesMedia, incluirAReceber: v.incluirAReceber === '1' }); UI.toast('Salvo – enquadramento recalculado'); App.refresh(); };
  }
};
