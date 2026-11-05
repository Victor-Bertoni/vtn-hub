/* Detalhe completo da obra: resumo, etapas, medições/CAIXA, financeiro, OS,
   pendências, entregas, documentos, revisões, diário */
Views.obraDetalhe = {
  perm: 'obras.ver',
  render(el, id, tab = 'resumo') {
    const o = Store.get('obras', id);
    if (!o) { el.innerHTML = UI.empty('Obra não encontrada: ' + id, 'search-x'); return; }
    const { esc, icon, money, pct } = UI;
    const m = Calc.obra(o);
    const cnt = c => Store.where(c, x => x.obraId === id).length;
    const TABS = [
      ['resumo', 'Resumo', 'layout-dashboard'], ['etapas', 'Etapas e cronograma', 'gantt-chart', cnt('etapas')],
      ['medicoes', 'Medições / CAIXA', 'ruler', cnt('medicoes')], ['financeiro', 'Financeiro', 'wallet', cnt('lancamentos'), 'financeiro.ver'],
      ['os', 'Ordens de serviço', 'clipboard-list', cnt('os')], ['pendencias', 'Pendências e entregas', 'list-checks', m.pendAbertas + m.entregasPend],
      ['documentos', 'Documentos', 'folder-open', cnt('arquivos')], ['revisoes', 'Revisões', 'git-branch', cnt('revisoes')], ['diario', 'Diário de obra', 'notebook-pen', cnt('diario')]
    ].filter(t => !t[4] || Auth.can(t[4]));
    const cli = (o.clienteIds || []).map(UI.pessoa).join(', ');
    el.innerHTML = `
      <div class="crumbs"><a href="#/obras">Obras</a> / ${o.id}</div>
      <div class="page-head"><div><div class="row"><span class="idlink">${o.id}</span>${UI.badge(o.status)}<span class="badge">${esc(o.tipo)}</span><span class="badge">${esc(o.modalidade || '')}</span><span class="badge brand">${esc(o.fase || '')}</span></div>
        <h1 style="margin-top:8px">${esc(o.nome)}</h1><p>${cli} · ${esc(o.endereco || '')} ${o.cidade ? '– ' + esc(o.cidade) + '/' + esc(o.uf || '') : ''}</p></div>
        <div class="row">
          ${Auth.can('relatorios') ? `<button class="btn" onclick="Views.relatorios.obra('${id}')">${icon('printer')} Relatório</button>` : ''}
          ${Auth.can('contratos') ? `<button class="btn" onclick="Views.propostas.novo({obraId:'${id}'})">${icon('send')} Proposta</button><button class="btn" onclick="Views.contratos.novo({obraId:'${id}'})">${icon('file-signature')} Contrato</button>` : ''}
          ${Auth.can('orcamentos') ? `<button class="btn" onclick="Views.orcamentos.novo({obraId:'${id}'})">${icon('calculator')} Orçamento</button>` : ''}
          ${Auth.can('obras.editar') ? `<button class="btn primary" onclick="Views.obras.edit('${id}')">${icon('pencil')} Editar</button>` : ''}
        </div></div>
      <div class="tabs">${TABS.map(t => `<button class="${t[0] === tab ? 'active' : ''}" onclick="location.hash='#/obra/${id}/${t[0]}'">${icon(t[2])} ${t[1]} ${t[3] ? `<span class="badge">${t[3]}</span>` : ''}</button>`).join('')}</div>
      <div id="tabc"></div>`;
    const c = UI.$('#tabc', el);
    (this['tab_' + tab] || this.tab_resumo).call(this, c, o, m);
  },

  /* ---------------- RESUMO ---------------- */
  tab_resumo(c, o, m) {
    const { esc, icon, money, pct, date } = UI;
    const kpi = (lbl, val, sub, cls = '') => `<div class="card kpi ${cls}"><div class="lbl">${lbl}</div><div class="val">${val}</div><div class="sub">${sub}</div></div>`;
    const nivelCls = { 'Executada': 'ok', 'Adiantada': 'ok', 'No prazo': 'ok', 'Atenção': 'warn', 'Atrasada': 'err' }[m.nivel] || '';
    const eq = (o.equipe || []);
    const diario = Store.where('diario', d => d.obraId === o.id).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 4);
    const grupo = Store.where('grupos', g => g.obraId === o.id)[0];
    c.innerHTML = `
      <div class="grid g4">
        ${kpi('Avanço físico', pct(m.fisico), m.previsto != null ? `Previsto hoje ${pct(m.previsto)} · IDP ${m.idp ? m.idp.toFixed(2).replace('.', ',') : '—'}` : 'Cadastre etapas com datas')}
        ${kpi('Nível de execução', `<span class="badge ${nivelCls}" style="font-size:15px;padding:4px 10px">${m.nivel}</span>`, !o.dataPrevTermino ? 'Sem prazo definido — informe as datas em Editar' : `Prazo decorrido ${pct(m.prazo.pct, 0)} · ${m.prazo.atraso ? `<b style="color:var(--err)">${m.prazo.atraso} dias de atraso</b>` : (m.prazo.restantes >= 0 ? m.prazo.restantes + ' dias restantes' : 'encerrado')}`)}
        ${kpi('Recebido do contrato', pct(m.financeiroPct), `${money(m.recebidoContrato)} de ${money(o.valorContrato)} · saldo ${money(m.saldoContrato)}`)}
        ${kpi('Lucro realizado', `<span style="color:${m.fin.lucro >= 0 ? 'var(--ok)' : 'var(--err)'}">${money(m.fin.lucro)}</span>`, `Margem ${pct(m.fin.margem)} · projetado ${money(m.fin.lucroProjetado)}`)}
        ${kpi('Despesas pagas', money(m.fin.despesaPaga), `A pagar ${money(m.fin.despesaPendente)}${o.area ? ' · ' + money(m.custoM2) + '/m²' : ''}${o.custoPrevisto ? ' · ' + pct(m.fin.despesaPaga / o.custoPrevisto * 100, 0) + ' do orçado' : ''}`)}
        ${kpi('A receber', money(m.fin.receitaPendente), m.fin.atrasadoReceber ? `<span style="color:var(--err)">Vencido ${money(m.fin.atrasadoReceber)}</span>` : 'Nada vencido')}
        ${kpi('Pendências abertas', m.pendAbertas, `${m.pendCriticas} altas/críticas · ${m.pendAtrasadas} atrasadas`, m.pendAtrasadas ? 'err' : '')}
        ${kpi('Entregas', `${m.entregasOk}/${m.entregasOk + m.entregasPend}`, `${m.entregasPend} pendentes · ${m.osAbertas} OS abertas`)}
      </div>
      <div class="grid g-2-1 mt">
        <div class="card"><div class="card-h"><h3>Curva de evolução (S)</h3><div class="legend-inline"><span><i style="background:#94a3b8"></i>Previsto</span><span><i style="background:#2563eb"></i>Medido</span><span><i style="background:#16a34a"></i>Financeiro</span></div></div><div class="card-b"><div class="chart-box"><canvas id="chCurva"></canvas></div></div></div>
        <div class="card"><div class="card-h"><h3>Dados da obra</h3></div><div class="card-b"><dl class="dl">
          <dt>Código</dt><dd>${o.id} (pasta nº ${esc(o.numero || '')})</dd>
          <dt>Cliente(s)</dt><dd>${(o.clienteIds || []).map(UI.pessoa).join('<br>') || '—'}</dd>
          <dt>Resp. técnico</dt><dd>${UI.pessoa(o.rtId)}</dd><dt>Gestor</dt><dd>${UI.pessoa(o.gestorId)}</dd>
          <dt>Contrato</dt><dd>${money(o.valorContrato)} · ${date(o.dataContrato)}</dd>
          ${o.valorImovel ? `<dt>Valor imóvel</dt><dd>${money(o.valorImovel)}</dd>` : ''}${o.valorFinanciado ? `<dt>Financiado obra</dt><dd>${money(o.valorFinanciado)}</dd>` : ''}
          <dt>Período</dt><dd>${date(o.dataInicio)} → ${date(o.dataPrevTermino)}${o.dataTermino ? ' (real ' + date(o.dataTermino) + ')' : ''}</dd>
          ${o.area ? `<dt>Área</dt><dd>${UI.num(o.area)} m²${o.areaTerreno ? ' · terreno ' + UI.num(o.areaTerreno) + ' m²' : ''}</dd>` : ''}
          ${o.matricula ? `<dt>Matrícula</dt><dd>${esc(o.matricula)} ${o.cartorio ? '· ' + esc(o.cartorio) : ''}</dd>` : ''}
          ${o.cno ? `<dt>CNO</dt><dd>${esc(o.cno)}</dd>` : ''}${o.art ? `<dt>ART/RRT</dt><dd>${esc(o.art)}</dd>` : ''}
          ${o.alvaraVigencia ? `<dt>Alvará</dt><dd>${o.alvaraEmissao ? date(o.alvaraEmissao) + ' → ' : 'até '}${date(o.alvaraVigencia)}</dd>` : ''}
          ${o.coordenadas ? `<dt>Coordenadas</dt><dd>${esc(o.coordenadas)}</dd>` : ''}
        </dl>${o.descricao ? `<p class="muted mt">${esc(o.descricao)}</p>` : ''}</div></div>
      </div>
      <div class="grid g2 mt">
        <div class="card"><div class="card-h"><h3>Pessoas envolvidas</h3>${Auth.can('obras.editar') ? `<button class="btn sm" id="addEq">${icon('user-plus')} Adicionar</button>` : ''}</div><div class="card-b p0">
          ${UI.table([{ h: 'Pessoa', f: e => UI.pessoa(e.pessoaId) }, { h: 'Papel', f: e => esc(e.papel) }, { h: 'Contato', f: e => { const p = Store.get('pessoas', e.pessoaId) || {}; return `<span class="tiny muted">${esc(p.email || '')} ${esc(p.telefone || '')}</span>`; } },
            { h: '', f: (e) => Auth.can('obras.editar') ? `<button class="btn ghost sm" data-rmeq="${e.pessoaId}">${icon('x')}</button>` : '' }],
            [...(o.clienteIds || []).map(p => ({ pessoaId: p, papel: 'Cliente', fixo: 1 })), ...eq], { emptyMsg: 'Ninguém vinculado.' })}
        </div></div>
        <div class="card"><div class="card-h"><h3>Últimos registros do diário</h3><div class="row">${grupo ? `<a class="btn sm" href="#/chat/${grupo.id}">${icon('messages-square')} Chat da obra</a>` : `<button class="btn sm" id="mkChat">${icon('messages-square')} Criar chat</button>`}<a class="btn sm" href="#/obra/${o.id}/diario">Ver diário</a></div></div><div class="card-b">
          ${diario.length ? `<div class="timeline">${diario.map(d => `<div class="tl"><div class="d">${date(d.data)} · ${esc(d.clima || '')} · ${d.efetivo || 0} pessoas</div><div>${esc(d.texto)}</div></div>`).join('')}</div>` : UI.empty('Sem registros.', 'notebook-pen')}
        </div></div>
      </div>`;
    this.curva(o, 'chCurva');
    const ae = UI.$('#addEq', c);
    if (ae) ae.onclick = async () => {
      const d = await UI.formModal({ title: 'Vincular pessoa', list: [{ k: 'pessoaId', l: 'Pessoa', t: 'select', o: () => Store.all('pessoas').map(p => [p.id, p.nome + ' – ' + p.tipo]), req: 1 }, { k: 'papel', l: 'Papel na obra', req: 1, ph: 'ex.: Mestre de obras' }] });
      if (d) { Store.update('obras', o.id, { equipe: [...(o.equipe || []), d] }); App.refresh(); }
    };
    UI.$$('[data-rmeq]', c).forEach(b => b.onclick = () => {
      const pid = b.dataset.rmeq;
      if ((o.clienteIds || []).includes(pid)) { UI.toast('Clientes são editados em "Editar obra".'); return; }
      Store.update('obras', o.id, { equipe: o.equipe.filter(e => e.pessoaId !== pid) }); App.refresh();
    });
    const mk = UI.$('#mkChat', c);
    if (mk) mk.onclick = () => { const g = Store.insert('grupos', { nome: o.id + ' – ' + o.nome, obraId: o.id, membros: [...new Set([...(o.clienteIds || []), ...(o.equipe || []).map(e => e.pessoaId)])] }); location.hash = '#/chat/' + g.id; };
  },

  curva(o, canvas) {
    const ets = Store.where('etapas', e => e.obraId === o.id);
    const meds = Store.where('medicoes', x => x.obraId === o.id).sort((a, b) => a.data.localeCompare(b.data));
    if (!o.dataInicio || !o.dataPrevTermino) return;
    const pts = []; let d = new Date(o.dataInicio + 'T12:00:00');
    const fim = new Date(Math.max(new Date(o.dataPrevTermino), new Date(meds.length ? meds[meds.length - 1].data : o.dataPrevTermino), new Date(Math.min(Date.now(), new Date(o.dataPrevTermino).getTime() + 90 * 864e5))) );
    while (d <= fim) { pts.push(d.toISOString().slice(0, 10)); d.setMonth(d.getMonth() + 1); }
    const labels = pts.map(p => UI.MES_AB[+p.slice(5, 7) - 1] + '/' + p.slice(2, 4));
    const prev = pts.map(p => ets.length ? Calc.previsto(o.id, p) : Math.min(100, UI.daysBetween(o.dataInicio, p) / Math.max(1, UI.daysBetween(o.dataInicio, o.dataPrevTermino)) * 100));
    const med = pts.map(p => { if (p > UI.today()) return null; const ms = meds.filter(x => x.data <= p); return ms.length ? ms[ms.length - 1].acumulado : (p <= UI.today() ? (meds.length ? 0 : null) : null); });
    if (!meds.length) { med[0] = 0; const t = UI.today(); const k = pts.findIndex(p => p > t); const idx = k < 0 ? pts.length - 1 : Math.max(0, k - 1); med[idx] = Calc.fisico(o.id); }
    const contrato = +o.valorContrato || 0;
    const lanc = Store.where('lancamentos', l => l.obraId === o.id && l.tipo === 'receita' && l.status === 'pago');
    const finc = pts.map(p => p > UI.today() || !contrato ? null : lanc.filter(l => !l.extraContrato && (l.dataPagamento || l.data) <= p).reduce((a, l) => a + l.valor, 0) / contrato * 100);
    UI.chart(canvas, { type: 'line', data: { labels, datasets: [
      { label: 'Previsto', data: prev, borderColor: '#94a3b8', borderDash: [5, 4], pointRadius: 0, tension: .3 },
      { label: 'Medido', data: med, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.12)', fill: true, spanGaps: true, tension: .3 },
      { label: 'Financeiro recebido', data: finc, borderColor: '#16a34a', pointRadius: 2, tension: .3 }
    ] }, options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.dataset.label + ': ' + UI.pct(c.raw) } } }, scales: { y: { min: 0, max: 110, ticks: { callback: v => v + '%' } } } } });
  },

  /* ---------------- ETAPAS ---------------- */
  tab_etapas(c, o) {
    const { esc, icon, money, pct, date } = UI;
    const ets = Store.where('etapas', e => e.obraId === o.id).sort((a, b) => a.ordem - b.ordem);
    const tot = ets.reduce((a, e) => a + (+e.valor || 0), 0);
    const ed = Auth.can('obras.editar');
    // Gantt
    const ds = ets.flatMap(e => [e.inicioPrev, e.fimPrev, e.inicioReal, e.fimReal]).filter(Boolean).sort();
    let gantt = '';
    if (ds.length) {
      const a = ds[0], b = ds[ds.length - 1], span = Math.max(1, UI.daysBetween(a, b));
      const x = d => UI.daysBetween(a, d) / span * 100;
      const months = []; let dm = new Date(a.slice(0, 7) + '-01T12:00:00');
      while (dm.toISOString().slice(0, 10) <= b) { const iso = dm.toISOString().slice(0, 10); if (iso >= a) months.push(iso); dm.setMonth(dm.getMonth() + 1); }
      const t = UI.today();
      gantt = `<div class="gantt"><div class="g-head"><div class="g-lbl tiny muted" style="padding:6px 10px">Etapa</div><div class="g-months">${months.map(mm => `<span style="left:${x(mm)}%">${UI.MES_AB[+mm.slice(5, 7) - 1]}/${mm.slice(2, 4)}</span>`).join('')}</div></div>
        ${ets.map(e => `<div class="g-row"><div class="g-lbl"><b>${e.ordem}.</b> ${esc(e.nome)}</div><div class="g-track">
          ${t >= a && t <= b ? `<div class="g-today" style="left:${x(t)}%" title="Hoje"></div>` : ''}
          ${e.inicioPrev && e.fimPrev ? `<div class="g-bar" title="${date(e.inicioPrev)} → ${date(e.fimPrev)} · ${pct(e.exec, 0)}" style="left:${x(e.inicioPrev)}%;width:${Math.max(.8, x(e.fimPrev) - x(e.inicioPrev))}%"><i style="width:${e.exec || 0}%"></i></div>` : ''}
        </div></div>`).join('')}</div>`;
    }
    c.innerHTML = `
      <div class="toolbar">${ed ? `<button class="btn primary" onclick="Views.obraDetalhe.editEtapa(null,'${o.id}')">${icon('plus')} Nova etapa</button>` : ''}
        <span class="muted tiny">Avanço físico ponderado: <b>${pct(Calc.fisico(o.id))}</b> · Total etapas ${money(tot)} ${o.valorContrato && Math.abs(tot - o.valorContrato) > 1 ? `<span class="badge warn">difere do contrato (${money(o.valorContrato)})</span>` : ''}</span></div>
      ${o.fisicoPorMedicao ? `<div class="alert info mb">${icon('info')}<div>Nesta obra o avanço físico vem da última medição PLS (aba Medições / CAIXA). As etapas abaixo são os serviços de engenharia contratados.</div></div>` : ''}
      <div class="card"><div class="card-b p0">${UI.table([
        { h: '#', f: e => e.ordem }, { h: 'ID', f: e => UI.idLink(e.id) }, { h: 'Etapa', f: e => esc(e.nome) },
        { h: 'Material', num: 1, f: e => money(e.material) }, { h: 'Mão de obra', num: 1, f: e => money(e.maoObra) }, { h: 'Total', num: 1, f: e => money(e.valor) },
        { h: '% obra', num: 1, f: e => pct(tot ? e.valor / tot * 100 : 0) },
        { h: 'Previsto', f: e => `<span class="tiny">${date(e.inicioPrev)} → ${date(e.fimPrev)}</span>` },
        { h: 'Executado', f: e => ed ? `<div class="row" style="flex-wrap:nowrap"><input type="range" min="0" max="100" step="5" value="${e.exec || 0}" data-exec="${e.id}" style="width:90px"><b style="min-width:38px">${e.exec || 0}%</b></div>` : UI.progress(e.exec) },
        { h: 'Situação', f: e => { const late = (e.exec || 0) < 100 && e.fimPrev && e.fimPrev < UI.today(); return (e.exec >= 100 ? UI.badge('Concluída') : late ? UI.badge('Atrasada', 'err') : e.exec > 0 ? UI.badge('Em execução') : UI.badge('Pendente')); } }
      ], ets, { foot: ['', '', 'Total', money(ets.reduce((a, e) => a + (+e.material || 0), 0)), money(ets.reduce((a, e) => a + (+e.maoObra || 0), 0)), money(tot), '100%', '', pct(Calc.fisico(o.id)), ''], emptyMsg: 'Cadastre as etapas da obra para medir o progresso.' })}</div></div>
      <div class="card mt"><div class="card-h"><h3>Cronograma (Gantt)</h3><span class="tiny muted">Barra = período previsto · preenchimento = % executado · linha vermelha = hoje</span></div><div class="card-b">${gantt || UI.empty('Sem datas.')}</div></div>`;
    UI.$$('[data-exec]', c).forEach(r => {
      r.oninput = () => r.nextElementSibling.textContent = r.value + '%';
      r.onchange = () => { const v = +r.value; const e = Store.get('etapas', r.dataset.exec); Store.update('etapas', e.id, { exec: v, inicioReal: e.inicioReal || (v > 0 ? UI.today() : ''), fimReal: v >= 100 ? (e.fimReal || UI.today()) : '' }); App.refresh(); };
    });
    UI.$$('tbody tr', c).forEach((tr, i) => tr.ondblclick = () => ed && this.editEtapa(ets[i].id));
  },
  async editEtapa(id, obraId) {
    const e = id ? Store.get('etapas', id) : { obraId, ordem: Store.where('etapas', x => x.obraId === obraId).length + 1, exec: 0 };
    const list = [
      { k: 'ordem', l: 'Ordem', t: 'number' }, { k: 'nome', l: 'Etapa', req: 1 },
      { k: 'material', l: 'Valor material (R$)', t: 'money' }, { k: 'maoObra', l: 'Valor mão de obra (R$)', t: 'money' },
      { k: 'inicioPrev', l: 'Início previsto', t: 'date' }, { k: 'fimPrev', l: 'Fim previsto', t: 'date' },
      { k: 'inicioReal', l: 'Início real', t: 'date' }, { k: 'fimReal', l: 'Fim real', t: 'date' },
      { k: 'exec', l: '% executado', t: 'number' }, { k: 'obs', l: 'Observações', t: 'textarea', full: 1 }
    ];
    const d = await UI.formModal({ title: id ? 'Etapa ' + id : 'Nova etapa', list, values: e, onDelete: id ? () => { Store.remove('etapas', id); App.refresh(); } : null });
    if (!d) return;
    d.valor = (+d.material || 0) + (+d.maoObra || 0) || (+e.valor || 0);
    id ? Store.update('etapas', id, d) : Store.insert('etapas', Object.assign(d, { obraId }));
    App.refresh();
  },

  /* ---------------- MEDIÇÕES / CAIXA ---------------- */
  tab_medicoes(c, o) {
    const { esc, icon, money, pct, date } = UI;
    const meds = Store.where('medicoes', x => x.obraId === o.id).sort((a, b) => a.data.localeCompare(b.data));
    const ed = Auth.can('obras.editar');
    const base = +o.valorFinanciado || +o.valorContrato || 0;
    const inc = Store.db.incidencias[o.id] || CAIXA_SERVICOS.map(() => 0);
    const somaInc = inc.reduce((a, b) => a + (+b || 0), 0);
    const ets = Store.where('etapas', e => e.obraId === o.id).sort((a, b) => a.ordem - b.ordem);
    const tot = ets.reduce((a, e) => a + (+e.valor || 0), 0);
    let ac = 0;
    c.innerHTML = `
      <div class="grid g-2-1">
        <div class="card"><div class="card-h"><h3>Medições (PLS / boletins)</h3>${ed ? `<button class="btn sm primary" onclick="Views.obraDetalhe.editMedicao(null,'${o.id}')">${icon('plus')} Nova medição</button>` : ''}</div><div class="card-b p0">
          ${UI.table([
            { h: 'ID', f: x => UI.idLink(x.id) }, { h: 'Nº', f: x => `<b class="nowrap">${esc(x.numero)}</b>` }, { h: 'Data', f: x => date(x.data) },
            { h: 'Acumulado', f: x => UI.progress(x.acumulado) }, { h: 'Na etapa', num: 1, f: (x) => { const i = meds.indexOf(x); return pct(x.acumulado - (i > 0 ? meds[i - 1].acumulado : 0)); } },
            { h: 'Valor liberado', num: 1, f: x => money(x.valorLiberado) }, { h: 'Situação', f: x => UI.badge(x.situacao || 'Normal') }, { h: 'Status', f: x => UI.badge(x.status) }
          ], meds, { foot: ['', '', '', meds.length ? pct(meds[meds.length - 1].acumulado) : '', '', money(meds.reduce((a, x) => a + (+x.valorLiberado || 0), 0)), '', ''], emptyMsg: 'Nenhuma medição registrada.' })}
        </div></div>
        <div class="card"><div class="card-h"><h3>Evolução das medições</h3></div><div class="card-b"><div class="chart-box"><canvas id="chMed"></canvas></div></div></div>
      </div>

      <div class="card mt"><div class="card-h"><div><h3>PCI CAIXA — incidência por serviço</h3>${o.pci ? `<div class="tiny"><b>PCI completo preenchido</b> – as PLS usam as incidências dele.</div>` : ''}<div class="tiny muted">Limites mín./máx. da tabela CAIXA · base ${money(base)} (${o.valorFinanciado ? 'valor financiado' : 'valor do contrato'})</div></div>
        <div class="row"><button class="btn sm" onclick="PCI.editar('${o.id}')">${icon('file-spreadsheet')} Abrir PCI completo (formato CAIXA)</button><span class="badge ${Math.abs(somaInc - 100) < .05 ? 'ok' : 'err'}">Soma ${pct(somaInc, 2)}</span>${ed ? `<button class="btn sm primary" id="savInc">${icon('save')} Salvar incidências</button>` : ''}</div></div>
        <div class="card-b p0"><div class="table-wrap"><table class="t"><thead><tr><th>#</th><th>Serviço</th><th class="num">% mín</th><th class="num">% máx</th><th class="num">Incidência %</th><th class="num">Valor (R$)</th><th>Limite</th></tr></thead><tbody>
          ${CAIXA_SERVICOS.map((s, i) => { const v = +inc[i] || 0; const ok = v >= s[1] - 1e-9 && v <= s[2] + 1e-9; return `<tr><td>${i + 1}</td><td>${esc(s[0])}</td><td class="num">${pct(s[1], 2)}</td><td class="num">${pct(s[2], 2)}</td>
            <td class="num">${ed ? `<input class="input" style="width:90px;text-align:right" type="number" step="0.01" data-inc="${i}" value="${v}">` : pct(v, 2)}</td><td class="num">${money(v / 100 * base)}</td>
            <td>${v === 0 && s[1] === 0 ? '<span class="badge">—</span>' : ok ? '<span class="badge ok">Dentro</span>' : `<span class="badge err">${v < s[1] ? 'Abaixo' : 'Acima'}</span>`}</td></tr>`; }).join('')}
        </tbody><tfoot><tr><td></td><td>Total</td><td></td><td></td><td class="num">${pct(somaInc, 2)}</td><td class="num">${money(somaInc / 100 * base)}</td><td></td></tr></tfoot></table></div></div></div>

      <div class="card mt"><div class="card-h"><h3>Cronograma de desembolso por etapa</h3><span class="tiny muted">% de cada etapa sobre o total × base CAIXA</span></div><div class="card-b p0">
        ${UI.table([{ h: 'Etapa', f: e => e.ordem + '. ' + esc(e.nome) }, { h: '%', num: 1, f: e => pct(tot ? e.valor / tot * 100 : 0, 2) },
          { h: 'Valor medição', num: 1, f: e => money(tot ? e.valor / tot * base : 0) }, { h: 'Acumulado', num: 1, f: e => { ac += tot ? e.valor / tot * base : 0; return money(ac); } },
          { h: 'Acum. %', num: 1, f: e => pct(base ? ac / base * 100 : 0, 1) }], ets, { emptyMsg: 'Cadastre etapas para simular o desembolso.' })}
      </div></div>`;
    UI.chart('chMed', { type: 'bar', data: { labels: meds.map(x => x.numero), datasets: [
      { label: 'Acumulado %', data: meds.map(x => x.acumulado), type: 'line', borderColor: '#2563eb', yAxisID: 'p', tension: .3 },
      { label: 'Valor liberado', data: meds.map(x => x.valorLiberado), backgroundColor: '#7c3aed', borderRadius: 4, yAxisID: 'v' }
    ] }, options: { scales: { p: { position: 'right', min: 0, max: 100, ticks: { callback: v => v + '%' }, grid: { display: false } }, v: { ticks: { callback: UI.moneyTick } } } } });
    const sv = UI.$('#savInc', c);
    if (sv) sv.onclick = () => { Store.db.incidencias[o.id] = UI.$$('[data-inc]', c).map(i => +i.value || 0); Store.save(); UI.toast('Incidências salvas'); App.refresh(); };
    UI.$$('[data-inc]', c).forEach(i => i.oninput = () => { const s = UI.$$('[data-inc]', c).reduce((a, x) => a + (+x.value || 0), 0); UI.$('.card-h .badge', i.closest('.card')).textContent = 'Soma ' + UI.pct(s, 2); });
  },
  async editMedicao(id, obraId) {
    // obra com PCI: a medição é a PLS no formato CAIXA (execução por serviço)
    { const ob = Store.get('obras', obraId || (Store.get('medicoes', id) || {}).obraId); if (window.PCI && ob && ob.pci) return PCI.editarPLS(id, ob.id); }
    const x = id ? Store.get('medicoes', id) : { obraId, data: UI.today(), status: 'Prévia', situacao: 'Normal', numero: 'PLS ' + String(Store.where('medicoes', m => m.obraId === obraId).length).padStart(2, '0') };
    const list = [{ k: 'numero', l: 'Número (ex.: PLS 10, BM 03)', req: 1 }, { k: 'data', l: 'Data do levantamento', t: 'date', req: 1 },
      { k: 'acumulado', l: '% acumulado medido', t: 'number', req: 1 }, { k: 'aferido', l: '% aferido (vistoria CAIXA)', t: 'number' },
      { k: 'valorLiberado', l: 'Valor liberado (R$)', t: 'money' }, { k: 'status', l: 'Status', t: 'select', o: ['Prévia', 'Assinada', 'Enviada', 'Paga'] },
      { k: 'situacao', l: 'Situação x cronograma', t: 'select', o: ['Normal', 'Adiantada', 'Atrasada'] }, { k: 'obs', l: 'Observações', t: 'textarea', full: 1 }];
    const d = await UI.formModal({ title: id ? 'Medição ' + id : 'Nova medição', list, values: x, onDelete: id ? () => { Store.remove('medicoes', id); App.refresh(); } : null,
      extra: !id ? `<label class="check mt"><input type="checkbox" id="mkRec" checked> Criar recebimento pendente com o valor liberado</label>` : '' });
    if (!d) return;
    const mkRec = !id && document.getElementById('mkRec');
    if (id) Store.update('medicoes', id, d); else {
      const n = Store.insert('medicoes', Object.assign(d, { obraId }));
      const o = Store.get('obras', obraId);
      if (d.valorLiberado > 0) Store.insert('lancamentos', { tipo: 'receita', categoria: 'Recebimento etapa com NF', descricao: 'Liberação ' + d.numero, valor: d.valorLiberado, data: d.data, vencimento: d.data, status: 'pendente', obraId, pessoaId: (o.clienteIds || [])[0], nf: true, forma: 'Financiamento CAIXA', arquivoIds: [], medicaoId: n.id });
    }
    App.refresh();
  },

  /* ---------------- FINANCEIRO / OS / PENDÊNCIAS ---------------- */
  tab_financeiro(c, o, m) { Views.financeiro.blocoObra(c, o, m); },
  tab_os(c, o) { Views.os.blocoObra(c, o); },
  tab_pendencias(c, o) { Views.pendencias.blocoObra(c, o); },

  /* ---------------- DOCUMENTOS ---------------- */
  tab_documentos(c, o) {
    const { esc, icon, size } = UI;
    const arqs = Store.where('arquivos', a => a.obraId === o.id);
    const pastas = [...new Set([...LISTAS.pastas, ...arqs.map(a => a.pasta)])];
    const tree = {};
    arqs.forEach(a => (tree[a.pasta] = tree[a.pasta] || []).push(a));
    const usadas = Object.keys(tree).sort();
    const sq = this._docq || '';
    const show = usadas.filter(p => !sq || p.toLowerCase().includes(sq) || tree[p].some(a => a.nome.toLowerCase().includes(sq)));
    const ext = n => (n.split('.').pop() || '').toLowerCase();
    const ic = n => ({ pdf: 'file-text', jpeg: 'image', jpg: 'image', png: 'image', mp4: 'video', xlsx: 'sheet', xlsb: 'sheet', ods: 'sheet', docx: 'file-type', doc: 'file-type', dwg: 'drafting-compass', zip: 'file-archive' })[ext(n)] || 'file';
    c.innerHTML = `
      <div class="grid g-2-1">
        <div class="card"><div class="card-h"><h3>Estrutura de pastas</h3><input class="input" id="dq" placeholder="Filtrar arquivos…" value="${esc(sq)}" style="max-width:240px"></div>
          <div class="tree">${show.length ? show.map(p => { const fs = tree[p].filter(a => !sq || a.nome.toLowerCase().includes(sq) || p.toLowerCase().includes(sq)); return `<div class="folder"><div class="fh" data-fold>${icon('folder')} ${esc(p)} <span class="badge">${fs.length}</span></div>
            <div class="files" ${sq ? '' : 'hidden'}>${fs.slice(0, 300).map(a => `<div class="file">${icon(ic(a.nome))}<span class="nm" title="${esc(a.nome)}">${esc(a.nome)}</span>
              <span class="tiny muted">${a.tamanho ? size(a.tamanho) : ''}</span>${a.temBlob ? '<span class="badge ok">no app</span>' : '<span class="badge" title="' + esc(a.origem || '') + '">no PC</span>'}
              <button class="btn ghost sm" data-goto="${a.id}" title="Abrir">${icon('external-link')}</button>${Auth.can('arquivos') ? `<button class="btn ghost sm" data-del="${a.id}" title="Excluir">${icon('trash-2')}</button>` : ''}</div>`).join('')}</div></div>`; }).join('') : UI.empty('Nenhum arquivo.', 'folder')}</div></div>
        <div class="stack">
          ${Auth.can('arquivos') ? `<div class="card"><div class="card-h"><h3>Enviar arquivos</h3></div><div class="card-b stack">
            <div class="field"><label>Pasta de destino</label><select class="select" id="dpasta">${pastas.map(p => `<option>${esc(p)}</option>`).join('')}</select></div>
            <div class="field"><label>Ou nova subpasta</label><input class="input" id="dnova" placeholder="ex.: MEDIÇÕES/31-10-26"></div>
            <div class="drop" id="drop">${icon('upload-cloud')}<div>Arraste arquivos aqui ou clique para escolher</div><div class="tiny">Fotos, PDFs, planilhas, DWG… ficam salvos neste navegador</div></div>
            <input type="file" id="dfile" multiple hidden></div></div>` : ''}
          <div class="card"><div class="card-b"><dl class="dl"><dt>Arquivos</dt><dd>${arqs.length}</dd><dt>No app</dt><dd>${arqs.filter(a => a.temBlob).length}</dd><dt>Tamanho total</dt><dd>${size(arqs.reduce((s, a) => s + (a.tamanho || 0), 0))}</dd><dt>Pastas</dt><dd>${usadas.length}</dd></dl>
            <p class="tiny muted mt">"no PC" = arquivo da estrutura importada das suas pastas. Envie o arquivo aqui para poder abri-lo de dentro do app.</p></div></div>
        </div>
      </div>`;
    UI.$$('[data-fold]', c).forEach(h => h.onclick = () => { const f = h.nextElementSibling; f.hidden = !f.hidden; });
    UI.$('#dq', c).oninput = e => { this._docq = e.target.value.toLowerCase(); clearTimeout(this._dt); this._dt = setTimeout(() => { App.refresh(); const i = UI.$('#dq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 300); };
    UI.$$('[data-del]', c).forEach(b => b.onclick = async () => { if (await UI.confirm('Excluir este arquivo do app?')) { Store.remove('arquivos', b.dataset.del); App.refresh(); } });
    const drop = UI.$('#drop', c);
    if (drop) {
      const inp = UI.$('#dfile', c);
      const go = async files => { const pasta = UI.$('#dnova', c).value.trim() || UI.$('#dpasta', c).value; await Store.uploadFiles(files, { obraId: o.id, pasta }); UI.toast(files.length + ' arquivo(s) enviado(s)'); App.refresh(); };
      drop.onclick = () => inp.click(); inp.onchange = () => inp.files.length && go([...inp.files]);
      drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); }; drop.ondragleave = () => drop.classList.remove('over');
      drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); e.dataTransfer.files.length && go([...e.dataTransfer.files]); };
    }
  },

  /* ---------------- REVISÕES ---------------- */
  tab_revisoes(c, o) {
    const { esc, icon, date } = UI;
    const rv = Store.where('revisoes', r => r.obraId === o.id).sort((a, b) => (a.disciplina + b.data).localeCompare(b.disciplina + a.data));
    const by = {}; rv.forEach(r => (by[r.disciplina] = by[r.disciplina] || []).push(r));
    c.innerHTML = `<div class="toolbar">${Auth.can('obras.editar') ? `<button class="btn primary" onclick="Views.obraDetalhe.editRevisao(null,'${o.id}')">${icon('plus')} Nova revisão</button>` : ''}<span class="tiny muted">Controle de versões (R0, R1, R2…) de projetos, propostas e contratos</span></div>
      ${Object.keys(by).length ? `<div class="grid g2">${Object.entries(by).map(([d, l]) => `<div class="card"><div class="card-h"><h3>${esc(d)}</h3><span class="badge">${l.length} revisões</span></div><div class="card-b"><div class="timeline">
        ${l.sort((a, b) => b.data.localeCompare(a.data)).map(r => `<div class="tl"><div class="d">${date(r.data)} · ${esc(r.autor || '')}</div><div class="row"><span class="idlink" data-goto="${r.id}">${esc(r.rev)}</span>${UI.badge(r.status)}</div><div class="mt" style="margin-top:4px">${esc(r.descricao)}</div></div>`).join('')}
      </div></div></div>`).join('')}</div>` : UI.empty('Nenhuma revisão registrada.', 'git-branch')}`;
  },
  async editRevisao(id, obraId) {
    const r = id ? Store.get('revisoes', id) : { obraId, data: UI.today(), status: 'Em elaboração' };
    const list = [{ k: 'disciplina', l: 'Disciplina', t: 'select', o: LISTAS.disciplinas, req: 1 }, { k: 'rev', l: 'Revisão (R0, R1…)', req: 1 },
      { k: 'data', l: 'Data', t: 'date' }, { k: 'status', l: 'Status', t: 'select', o: LISTAS.statusRev }, { k: 'autor', l: 'Autor' },
      { k: 'descricao', l: 'O que mudou', t: 'textarea', full: 1 }];
    const d = await UI.formModal({ title: id ? 'Revisão ' + id : 'Nova revisão', list, values: r, onDelete: id ? () => { Store.remove('revisoes', id); App.refresh(); } : null });
    if (!d) return;
    if (!id && d.status === 'Aprovada') Store.where('revisoes', x => x.obraId === obraId && x.disciplina === d.disciplina && x.status === 'Aprovada').forEach(x => Store.update('revisoes', x.id, { status: 'Substituída' }));
    id ? Store.update('revisoes', id, d) : Store.insert('revisoes', Object.assign(d, { obraId, arquivoIds: [] }));
    App.refresh();
  },

  /* ---------------- DIÁRIO ---------------- */
  tab_diario(c, o) {
    const { esc, icon, date } = UI;
    const ds = Store.where('diario', d => d.obraId === o.id).sort((a, b) => b.data.localeCompare(a.data));
    c.innerHTML = `<div class="toolbar">${Auth.can('obras.editar') ? `<button class="btn primary" onclick="Views.obraDetalhe.editDiario(null,'${o.id}')">${icon('plus')} Novo registro</button>` : ''}</div>
      <div class="card"><div class="card-b">${ds.length ? `<div class="timeline">${ds.map(d => `<div class="tl"><div class="d">${date(d.data)} · ${esc(d.clima || '')} · efetivo ${d.efetivo || 0} · ${Store.get('pessoas', d.autorId) ? esc(Store.get('pessoas', d.autorId).nome) : ''} <span class="idlink" data-goto="${d.id}">${d.id}</span>${(d.fotoIds || []).length ? ` · ${icon('camera')} ${d.fotoIds.length} foto(s)` : ''}</div><div>${esc(d.texto)}</div>${d.ocorrencias ? `<div class="tiny" style="color:var(--err)">Ocorrência: ${esc(d.ocorrencias)}</div>` : ''}</div>`).join('')}</div>` : UI.empty('Diário vazio.', 'notebook-pen')}</div></div>`;
  },
  async editDiario(id, obraId) {
    const x = id ? Store.get('diario', id) : { obraId, data: UI.today(), autorId: Auth.current().pessoaId };
    const list = [{ k: 'data', l: 'Data', t: 'date', req: 1 }, { k: 'clima', l: 'Clima', t: 'select', o: ['Ensolarado', 'Nublado', 'Chuvoso', 'Chuva forte (parado)', '-'] },
      { k: 'efetivo', l: 'Efetivo (pessoas)', t: 'number' }, { k: 'autorId', l: 'Autor', t: 'select', o: () => Store.all('pessoas').map(p => [p.id, p.nome]) },
      { k: 'texto', l: 'Serviços executados / ocorrências', t: 'textarea', full: 1, req: 1, rows: 6 }];
    const d = await UI.formModal({ title: id ? 'Diário ' + id : 'Registro do diário', list, values: x, onDelete: id ? () => { Store.remove('diario', id); App.refresh(); } : null });
    if (!d) return;
    id ? Store.update('diario', id, d) : Store.insert('diario', Object.assign(d, { obraId }));
    App.refresh();
  }
};
Open.ET = id => Views.obraDetalhe.editEtapa(id);
Open.MD = id => Views.obraDetalhe.editMedicao(id);
Open.RV = id => Views.obraDetalhe.editRevisao(id);
Open.DI = id => Views.obraDetalhe.editDiario(id);
