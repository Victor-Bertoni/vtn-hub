/* Lista de obras/serviços + cadastro */
Views.obras = {
  perm: 'obras.ver',
  state: { q: '', status: '', tipo: '', cidade: '', origem: '', modalidade: '', ano: '', ordem: 'padrao', modo: 'cards', limite: 30, graficos: true },
  ORDENS: [['padrao', 'Status e número'], ['valor', 'Maior contrato'], ['lucro', 'Maior lucro'], ['margem', 'Maior margem'], ['fisico', 'Mais avançadas'], ['prazo', 'Prazo mais próximo'], ['atraso', 'Mais atrasadas'], ['receber', 'Mais a receber'], ['recente', 'Mais recentes'], ['nome', 'Nome (A–Z)']],
  filtrar() {
    const s = this.state;
    const ordem = { 'Em execução': 0, 'Contratada': 1, 'Em entrega': 2, 'Em planejamento': 3, 'Orçamento': 4, 'Prospecção': 5, 'Paralisada': 6, 'Concluída': 7, 'Cancelada': 8 };
    let L = Store.all('obras').map(o => ({ o, m: Calc.obra(o) }));
    const q = s.q.toLowerCase();
    if (q) L = L.filter(({ o }) => (o.id + ' ' + o.numero + ' ' + o.nome + ' ' + o.cidade + ' ' + o.endereco + ' ' + o.cno + ' ' + o.art + ' ' + (o.clienteIds || []).map(c => (Store.get('pessoas', c) || {}).nome).join(' ')).toLowerCase().includes(q));
    ['status', 'tipo', 'cidade', 'origem', 'modalidade'].forEach(k => { if (s[k]) L = L.filter(({ o }) => (s[k] === '—' ? !o[k] : o[k] === s[k])); });
    if (s.ano) L = L.filter(({ o }) => (o.dataContrato || o.dataInicio || '').startsWith(s.ano));
    const by = { valor: x => -(+x.o.valorContrato || 0), lucro: x => -x.m.fin.lucro, margem: x => -x.m.fin.margem, fisico: x => -x.m.fisico, prazo: x => x.o.dataPrevTermino && !['Concluída', 'Cancelada'].includes(x.o.status) ? x.o.dataPrevTermino : '9999', atraso: x => -x.m.prazo.atraso, receber: x => -x.m.fin.receitaPendente, recente: x => -(new Date(x.o.dataContrato || x.o.criadoEm || 0).getTime() || 0), nome: x => x.o.nome.toLowerCase() }[s.ordem];
    L.sort(by ? (a, b) => { const A = by(a), B = by(b); return A > B ? 1 : A < B ? -1 : 0; } : (a, b) => (ordem[a.o.status] ?? 9) - (ordem[b.o.status] ?? 9) || (parseInt(b.o.numero, 10) || 0) - (parseInt(a.o.numero, 10) || 0));
    return L;
  },
  render(el) {
    const { esc, icon, money, moneyK, pct } = UI; const s = this.state;
    const L = this.filtrar(); const obras = L.map(x => x.o);
    const todas = Store.all('obras');
    const uniq = k => [...new Set(todas.map(o => o[k]).filter(Boolean))].sort();
    const anos = [...new Set(todas.map(o => (o.dataContrato || o.dataInicio || '').slice(0, 4)).filter(Boolean))].sort().reverse();
    const sel = (id, lbl, k, ops) => `<select class="select" id="${id}"><option value="">${lbl}</option>${ops.map(x => `<option ${x === s[k] ? 'selected' : ''}>${esc(x)}</option>`).join('')}${k !== 'status' && k !== 'tipo' && k !== 'ano' ? `<option ${s[k] === '—' ? 'selected' : ''} value="—">(não informado)</option>` : ''}</select>`;
    const T = { n: L.length, contrato: L.reduce((a, x) => a + (+x.o.valorContrato || 0), 0), rec: L.reduce((a, x) => a + x.m.fin.receitaPaga, 0), desp: L.reduce((a, x) => a + x.m.fin.despesaPaga, 0), aRec: L.reduce((a, x) => a + x.m.fin.receitaPendente, 0), atras: L.filter(x => x.m.prazo.atraso > 0 && !['Concluída', 'Cancelada'].includes(x.o.status)).length, pend: L.reduce((a, x) => a + x.m.pendAbertas, 0) };
    const ativas = L.filter(x => ['Em execução', 'Contratada', 'Em entrega', 'Em planejamento'].includes(x.o.status));
    const fisMed = ativas.length ? ativas.reduce((a, x) => a + x.m.fisico, 0) / ativas.length : 0;
    const filtros = ['q', 'status', 'tipo', 'cidade', 'origem', 'modalidade', 'ano'].filter(k => s[k]).length;
    const card = ({ o, m }) => {
      const cli = (o.clienteIds || []).map(id => (Store.get('pessoas', id) || {}).nome).filter(Boolean).join(', ');
      const nivelCls = { 'Executada': 'ok', 'Adiantada': 'ok', 'No prazo': 'ok', 'Atenção': 'warn', 'Atrasada': 'err' }[m.nivel] || '';
      return `<div class="card obra-card" data-goto="${o.id}">
        <div class="top"><div style="min-width:0"><div class="row" style="gap:6px"><span class="idlink">${o.id}</span><span class="badge">${esc(o.tipo)}</span>${o.cidade ? `<span class="badge">${icon('map-pin')} ${esc(o.cidade)}</span>` : ''}</div><h3 style="margin-top:8px">${esc(o.nome)}</h3><div class="tiny muted">${esc(cli || 'sem cliente')}${o.modalidade ? ' · ' + esc(o.modalidade) : ''}</div></div>${UI.badge(o.status)}</div>
        <div class="obra-rings">${this.ring(m.fisico, '#2563eb', 'Físico')}${this.ring(m.financeiroPct, '#16a34a', 'Recebido')}${m.previsto != null ? this.ring(m.previsto, '#94a3b8', 'Previsto') : ''}<div class="obra-nivel">${UI.badge(m.nivel, nivelCls)}${m.prazo.atraso > 0 && !['Concluída', 'Cancelada'].includes(o.status) ? `<span class="tiny" style="color:var(--err)">${m.prazo.atraso} dias de atraso</span>` : o.dataPrevTermino ? `<span class="tiny muted">até ${UI.date(o.dataPrevTermino)}</span>` : ''}</div></div>
        <div class="obra-meta">
          <div><span class="muted">Contrato</span><b>${money(o.valorContrato)}</b></div>
          <div><span class="muted">Lucro realizado</span><b style="color:${m.fin.lucro >= 0 ? 'var(--ok)' : 'var(--err)'}">${money(m.fin.lucro)}</b></div>
          <div><span class="muted">A receber</span><b>${money(m.fin.receitaPendente)}</b></div>
          <div><span class="muted">Pendências</span><b>${m.pendAbertas} ${m.pendCriticas ? `<span class="badge err">${m.pendCriticas} altas</span>` : ''}</b></div>
        </div></div>`;
    };
    el.innerHTML = `
      <div class="page-head"><div><h1>Obras e serviços</h1><p>${todas.length} registros · ${L.length} no filtro atual · código próprio OB-xxxx = número da pasta</p></div>
        <div class="row"><button class="btn" id="ogr">${icon(s.graficos ? 'eye-off' : 'bar-chart-3')} ${s.graficos ? 'Ocultar gráficos' : 'Mostrar gráficos'}</button>${Auth.can('obras.editar') ? `<button class="btn primary" onclick="Views.obras.edit()">${icon('plus')} Nova obra/serviço</button>` : ''}</div></div>
      <div class="grid g4 mb">
        ${Views.dashboard.kpi('', 'hard-hat', 'No filtro', T.n, `${ativas.length} ativas · físico médio ${pct(fisMed, 0)}`)}
        ${Views.dashboard.kpi('info', 'briefcase', 'Valor contratado', moneyK(T.contrato), `ticket médio ${moneyK(T.contrato / Math.max(1, L.filter(x => +x.o.valorContrato).length))}`)}
        ${Views.dashboard.kpi(T.rec - T.desp >= 0 ? 'ok' : 'err', 'trending-up', 'Lucro realizado', moneyK(T.rec - T.desp), `recebido ${moneyK(T.rec)} · margem ${pct(T.rec ? (T.rec - T.desp) / T.rec * 100 : 0)}`)}
        ${Views.dashboard.kpi(T.atras ? 'err' : 'violet', 'hand-coins', 'A receber', moneyK(T.aRec), `${T.atras} com prazo vencido · ${T.pend} pendências`)}
      </div>
      ${s.graficos ? `<div class="grid g3 mb">
        <div class="card"><div class="card-h"><h3>Por status</h3></div><div class="card-b"><div class="chart-box sm"><canvas id="obSt"></canvas></div></div></div>
        <div class="card"><div class="card-h"><h3>Valor por tipo</h3></div><div class="card-b"><div class="chart-box sm"><canvas id="obTp"></canvas></div></div></div>
        <div class="card"><div class="card-h"><h3>Cidades</h3></div><div class="card-b"><div class="chart-box sm"><canvas id="obCi"></canvas></div></div></div></div>` : ''}
      <div class="filterbar card"><div class="card-b">
        <div class="toolbar" style="margin:0">
          <div class="tfind-w" style="min-width:260px;flex:1">${icon('search')}<input class="input" id="oq" placeholder="Buscar por nome, cliente, cidade, nº, CNO, ART…" value="${esc(s.q)}"></div>
          ${sel('ost', 'Status', 'status', LISTAS.statusObra)}${sel('oti', 'Tipo', 'tipo', LISTAS.tipoObra)}${sel('oci', 'Cidade', 'cidade', uniq('cidade'))}
          ${sel('omo', 'Modalidade', 'modalidade', uniq('modalidade'))}${sel('oor', 'Origem', 'origem', LISTAS.origem)}${sel('oan', 'Ano', 'ano', anos)}
          <select class="select" id="oord">${this.ORDENS.map(o => `<option value="${o[0]}" ${o[0] === s.ordem ? 'selected' : ''}>↕ ${o[1]}</option>`).join('')}</select>
          ${filtros ? `<button class="btn sm ghost" id="olimpa">${icon('x')} Limpar (${filtros})</button>` : ''}
          <div class="seg" style="margin-left:auto"><button class="${s.modo === 'cards' ? 'on' : ''}" data-m="cards" title="Cartões">${icon('layout-grid')}</button><button class="${s.modo === 'lista' ? 'on' : ''}" data-m="lista" title="Lista completa">${icon('list')}</button></div>
        </div>
        <div class="row mt" style="gap:6px">${LISTAS.statusObra.map(st => { const n = todas.filter(o => o.status === st).length; return n ? `<button class="chip ${s.status === st ? 'on' : ''}" data-st="${st}">${st} <b>${n}</b></button>` : ''; }).join('')}</div>
      </div></div>
      ${!L.length ? UI.empty('Nenhuma obra encontrada com esses filtros.', 'hard-hat') : s.modo === 'cards' ? `<div class="grid g3">${L.slice(0, s.limite).map(card).join('')}</div>${L.length > s.limite ? `<div class="center mt"><button class="btn" id="omais">Mostrar mais (${L.length - s.limite})</button></div>` : ''}` :
        `<div class="card">${UI.table([
          { h: 'ID', f: x => UI.idLink(x.o.id) }, { h: 'Nome', f: x => `<span class="plink" data-goto="${x.o.id}">${esc(x.o.nome)}</span>` },
          { h: 'Cliente', f: x => (x.o.clienteIds || []).map(UI.pessoa).join(', ') || '—' }, { h: 'Tipo', f: x => esc(x.o.tipo) }, { h: 'Cidade', f: x => esc(x.o.cidade || '—') },
          { h: 'Status', f: x => UI.badge(x.o.status) }, { h: 'Nível', f: x => esc(x.m.nivel) },
          { h: 'Início', f: x => UI.date(x.o.dataInicio) }, { h: 'Término prev.', f: x => UI.date(x.o.dataPrevTermino) },
          { h: 'Atraso', num: 1, f: x => x.m.prazo.atraso > 0 && !['Concluída', 'Cancelada'].includes(x.o.status) ? `<span style="color:var(--err)">${x.m.prazo.atraso} dias</span>` : '—' },
          { h: 'Físico', f: x => UI.progress(x.m.fisico) }, { h: 'Contrato', num: 1, f: x => money(x.o.valorContrato) },
          { h: 'Recebido', num: 1, f: x => money(x.m.fin.receitaPaga) }, { h: 'Gasto', num: 1, f: x => money(x.m.fin.despesaPaga) },
          { h: 'Lucro', num: 1, f: x => `<span style="color:${x.m.fin.lucro >= 0 ? 'var(--ok)' : 'var(--err)'}">${money(x.m.fin.lucro)}</span>` },
          { h: 'Margem', num: 1, f: x => x.m.fin.receitaPaga ? pct(x.m.fin.margem) : '—' }, { h: 'A receber', num: 1, f: x => money(x.m.fin.receitaPendente) },
          { h: 'Pend.', num: 1, f: x => x.m.pendAbertas || '—' }, { h: 'Origem', f: x => esc(x.o.origem || '—') },
          { h: 'ISS', f: x => { if (!window.Conhecimento) return ''; const i = Conhecimento.issDe(x.o.cidade, x.o.tipo); return i.aliq != null ? `${i.item} · ${pct(i.aliq, 1)}` : i.item; } }
        ], L)}</div>`}`;
    const re = () => App.refresh();
    UI.$('#oq', el).oninput = e => { s.q = e.target.value; clearTimeout(this._t); this._t = setTimeout(() => { re(); const i = UI.$('#oq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 300); };
    [['ost', 'status'], ['oti', 'tipo'], ['oci', 'cidade'], ['omo', 'modalidade'], ['oor', 'origem'], ['oan', 'ano'], ['oord', 'ordem']].forEach(([id, k]) => UI.$('#' + id, el).onchange = e => { s[k] = e.target.value; s.limite = 30; re(); });
    UI.$$('[data-st]', el).forEach(b => b.onclick = () => { s.status = s.status === b.dataset.st ? '' : b.dataset.st; re(); });
    UI.$$('[data-m]', el).forEach(b => b.onclick = () => { s.modo = b.dataset.m; re(); });
    UI.$('#ogr', el).onclick = () => { s.graficos = !s.graficos; re(); };
    const lp = UI.$('#olimpa', el); if (lp) lp.onclick = () => { Object.assign(s, { q: '', status: '', tipo: '', cidade: '', origem: '', modalidade: '', ano: '' }); re(); };
    const mais = UI.$('#omais', el); if (mais) mais.onclick = () => { s.limite += 30; re(); };
    if (s.graficos) {
      const cnt = (fn, val) => { const m = {}; L.forEach(x => { const k = fn(x) || 'Não informado'; m[k] = (m[k] || 0) + (val ? val(x) : 1); }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
      const st = cnt(x => x.o.status), tp = cnt(x => x.o.tipo, x => +x.o.valorContrato || 0), ci = cnt(x => x.o.cidade).filter(x => x[0] !== 'Não informado').slice(0, 8);
      UI.chart('obSt', { type: 'doughnut', data: { labels: st.map(x => x[0]), datasets: [{ data: st.map(x => x[1]), backgroundColor: UI.PALETA }] }, options: { plugins: { legend: { position: 'right' } } } });
      UI.chart('obTp', { type: 'bar', data: { labels: tp.map(x => x[0]), datasets: [{ label: 'Contratado', data: tp.map(x => x[1]), backgroundColor: '#2563eb' }] }, options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => UI.money(c.raw) } } }, scales: { y: { ticks: { callback: UI.moneyTick } } } } });
      UI.chart('obCi', { type: 'bar', data: { labels: ci.map(x => x[0]), datasets: [{ label: 'Obras', data: ci.map(x => x[1]), backgroundColor: '#7c3aed' }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } } } });
    }
  },
  ring(v, cor, lbl) {
    const p = Math.max(0, Math.min(100, +v || 0)), r = 17, c = 2 * Math.PI * r;
    return `<div class="ring"><svg viewBox="0 0 44 44" width="46" height="46"><circle cx="22" cy="22" r="${r}" fill="none" stroke="var(--border)" stroke-width="5"/><circle cx="22" cy="22" r="${r}" fill="none" stroke="${cor}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(c * p / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 22 22)"/><text x="22" y="25.5" text-anchor="middle" font-size="10" font-weight="700" fill="currentColor">${Math.round(p)}%</text></svg><span>${lbl}</span></div>`;
  },

  fields() {
    const pessoas = () => Store.all('pessoas').map(p => [p.id, p.nome + ' (' + p.tipo + ')']);
    return [
      { k: 'numero', l: 'Nº da obra / pasta (gera o código OB-xxxx)', ph: 'ex.: 72' },
      { k: 'nome', l: 'Nome da obra / serviço', req: 1 },
      { k: 'tipo', l: 'Tipo', t: 'select', o: LISTAS.tipoObra, def: 'Obra' },
      { k: 'modalidade', l: 'Modalidade', t: 'select', o: LISTAS.modalidade },
      { k: 'status', l: 'Status', t: 'select', o: LISTAS.statusObra, def: 'Orçamento' },
      { k: 'origem', l: 'Como o cliente chegou (marketing)', t: 'select', o: LISTAS.origem },
      { k: 'fase', l: 'Fase (pasta)', t: 'select', o: ['00_COMERCIAL', '01_PLANEJAMENTO', '02_EXECUÇÃO', '03_ENTREGA'], def: '00_COMERCIAL' },
      { k: 'clienteIds', l: 'Cliente(s) — Ctrl+clique para vários', t: 'multi', o: pessoas, full: 1 },
      { k: 'rtId', l: 'Responsável técnico', t: 'select', o: pessoas },
      { k: 'gestorId', l: 'Gestor da obra', t: 'select', o: pessoas },
      { k: 'endereco', l: 'Endereço', full: 1 },
      { k: 'cidade', l: 'Cidade' }, { k: 'uf', l: 'UF', def: 'MG' },
      { k: 'cep', l: 'CEP' }, { k: 'area', l: 'Área construída (m²)', t: 'number' },
      { k: 'valorContrato', l: 'Valor do contrato (R$)', t: 'money' }, { k: 'custoPrevisto', l: 'Custo previsto/orçado (R$)', t: 'money' },
      { k: 'valorImovel', l: 'Valor do imóvel (CAIXA)', t: 'money' }, { k: 'valorFinanciado', l: 'Valor financiado da obra (CAIXA)', t: 'money' },
      { k: 'dataContrato', l: 'Data do contrato', t: 'date' }, { k: 'dataInicio', l: 'Início da obra', t: 'date' },
      { k: 'dataPrevTermino', l: 'Término previsto', t: 'date' }, { k: 'dataTermino', l: 'Término real', t: 'date' },
      { k: 'matricula', l: 'Matrícula do imóvel' }, { k: 'cno', l: 'CNO' },
      { k: 'art', l: 'ART / RRT' }, { k: 'alvaraVigencia', l: 'Vigência do alvará', t: 'date' },
      { k: 'descricao', l: 'Descrição / escopo', t: 'textarea', full: 1 }
    ];
  },
  async edit(id, preset = {}) {
    const o = id ? Store.get('obras', id) : Object.assign({ status: 'Orçamento', uf: 'MG', tipo: 'Obra' }, preset);
    const d = await UI.formModal({ title: id ? `Editar ${id}` : 'Nova obra / serviço', list: this.fields(), values: o, wide: true,
      onDelete: id && Auth.can('config') ? () => { Store.remove('obras', id); UI.toast('Obra excluída'); location.hash = '#/obras'; } : null });
    if (!d) return;
    if (id) { Store.update('obras', id, d); UI.toast('Obra atualizada'); if (window.Drive) Drive.criarPasta(Store.get('obras', id)); App.refresh(); return; }
    let newId;
    if (d.numero && /^\d+$/.test(d.numero)) {
      newId = 'OB-' + d.numero.padStart(4, '0');
      if (Store.get('obras', newId)) { UI.toast('Já existe ' + newId + '. Usando o próximo código livre.', 'err'); newId = null; }
      else Store.db.seq.OB = Math.max(Store.db.seq.OB || 0, +d.numero);
    }
    const n = Store.insert('obras', Object.assign(d, newId ? { id: newId } : {}, { equipe: [] }));
    if (!n.numero) Store.update('obras', n.id, { numero: String(+n.id.split('-')[1]) });
    UI.toast('Obra criada: ' + n.id);
    if (window.Drive) Drive.criarPasta(Store.get('obras', n.id)).then(c => { if (c) UI.toast('Pasta criada no drive: 00_SERVIÇOS › ' + c); });
    location.hash = '#/obra/' + n.id;
  }
};
