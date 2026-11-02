/* Calendário: eventos + prazos automáticos (vencimentos, pendências, entregas, OS, medições, etapas) */
Views.calendario = {
  perm: 'calendario',
  st: { ano: null, mes: null, filtros: { evento: 1, vencimento: 1, recebimento: 1, pendencia: 1, entrega: 1, os: 1, medicao: 1, etapa: 0, feriado: 1, fiscal: 1 }, obra: '' },
  items() {
    const out = []; const ab = x => !['Concluída', 'Cancelada', 'Resolvida', 'Entregue', 'Aprovada'].includes(x.status);
    Store.all('eventos').forEach(e => out.push({ k: 'evento', data: e.data, hora: e.hora, titulo: e.titulo, tipo: e.tipo, cls: { 'Medição': 'medicao', 'Vencimento': 'vencimento', 'Entrega': 'entrega', 'Visita': 'visita', 'Reunião': 'reuniao' }[e.tipo] || 'outro', ref: e.id, obraId: e.obraId }));
    Store.where('lancamentos', l => l.status !== 'pago' && l.vencimento).forEach(l => out.push({ k: l.tipo === 'despesa' ? 'vencimento' : 'recebimento', data: l.vencimento, titulo: (l.tipo === 'despesa' ? 'Pagar: ' : 'Receber: ') + l.descricao + ' – ' + UI.money(l.valor), tipo: l.tipo === 'despesa' ? 'A pagar' : 'A receber', cls: l.tipo === 'despesa' ? 'vencimento' : 'recebimento', ref: l.id, obraId: l.obraId }));
    Store.where('pendencias', ab).filter(p => p.prazo).forEach(p => out.push({ k: 'pendencia', data: p.prazo, titulo: p.titulo, tipo: 'Pendência', cls: 'pendencia', ref: p.id, obraId: p.obraId }));
    Store.where('entregas', ab).filter(p => p.prazo).forEach(p => out.push({ k: 'entrega', data: p.prazo, titulo: p.titulo, tipo: 'Entrega', cls: 'entrega', ref: p.id, obraId: p.obraId }));
    Store.where('os', ab).filter(p => p.prazo).forEach(p => out.push({ k: 'os', data: p.prazo, titulo: p.titulo, tipo: 'OS', cls: 'os', ref: p.id, obraId: p.obraId }));
    Store.all('medicoes').forEach(m => out.push({ k: 'medicao', data: m.data, titulo: m.numero + ' – ' + ((Store.get('obras', m.obraId) || {}).nome || ''), tipo: 'Medição', cls: 'medicao', ref: m.id, obraId: m.obraId }));
    Store.where('etapas', e => e.fimPrev && (e.exec || 0) < 100).forEach(e => out.push({ k: 'etapa', data: e.fimPrev, titulo: 'Fim etapa: ' + e.nome, tipo: 'Etapa', cls: 'etapa', ref: e.id, obraId: e.obraId }));
    return out;
  },
  render(el) {
    const { icon, esc } = UI; const s = this.st;
    const now = new Date(); if (s.ano == null) { s.ano = now.getFullYear(); s.mes = now.getMonth(); }
    const first = new Date(s.ano, s.mes, 1), start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
    const days = []; for (let i = 0; i < 42; i++) { const d = new Date(start); d.setDate(start.getDate() + i); days.push(d); }
    const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const it = Views.agenda.itens(iso(days[0]), iso(days[41])).filter(i => s.filtros[i.k] && (!s.obra || !i.obraId || i.obraId === s.obra));
    const t = UI.today();
    const LBL = { evento: 'Eventos', feriado: 'Feriados', fiscal: 'Impostos', vencimento: 'A pagar', recebimento: 'A receber', pendencia: 'Pendências', entrega: 'Entregas', os: 'OS', medicao: 'Medições', etapa: 'Fim de etapas' };
    const mesItens = it.filter(i => i.data.slice(0, 7) === iso(first).slice(0, 7)).sort((a, b) => (a.data + (a.hora || '')).localeCompare(b.data + (b.hora || '')));
    el.innerHTML = `<div class="page-head"><div><h1>Calendário</h1><p>Eventos e todos os prazos das obras em um só lugar</p></div><button class="btn primary" onclick="Views.calendario.edit()">${icon('calendar-plus')} Novo evento</button></div>
      <div class="toolbar"><button class="btn icon" id="cp">${icon('chevron-left')}</button><h2 style="min-width:190px;text-align:center;text-transform:capitalize">${UI.MESES[s.mes]} ${s.ano}</h2><button class="btn icon" id="cn">${icon('chevron-right')}</button><button class="btn sm" id="ch">Hoje</button>
        <select class="select" id="cob"><option value="">Todas as obras</option>${Store.all('obras').map(o => `<option value="${o.id}" ${o.id === s.obra ? 'selected' : ''}>${o.id} · ${esc(o.nome)}</option>`).join('')}</select>
        <div class="row" style="margin-left:auto">${Object.keys(LBL).map(k => `<label class="check tiny"><input type="checkbox" data-fk="${k}" ${s.filtros[k] ? 'checked' : ''}> <span class="ev ${k === 'evento' ? 'outro' : k === 'fiscal' ? 'vencimento' : k}" style="display:inline-block;margin:0">${LBL[k]}</span></label>`).join('')}</div></div>
      <div class="grid g-2-1"><div class="card" style="overflow:hidden"><div class="cal">${['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => `<div class="dow">${d}</div>`).join('')}
        ${days.map(d => { const k = iso(d); const evs = it.filter(i => i.data === k); const hol = evs.some(e => e.k === 'feriado' && e.tipo !== 'Facultativo'); return `<div class="day ${d.getMonth() !== s.mes ? 'out' : ''} ${k === t ? 'today' : ''} ${hol ? 'holiday' : ''} ${d.getDay() === 0 || d.getDay() === 6 ? 'weekend' : ''}" data-day="${k}"><span class="n">${d.getDate()}</span>
          ${evs.slice(0, 4).map(e => `<span class="ev ${e.cls}" ${e.ref ? `data-goto="${e.ref}"` : ''} title="${esc(e.titulo)}">${e.hora ? e.hora + ' ' : ''}${esc(e.titulo)}</span>`).join('')}${evs.length > 4 ? `<span class="tiny muted">+${evs.length - 4} mais</span>` : ''}</div>`; }).join('')}</div></div>
        <div class="card"><div class="card-h"><h3>Agenda do mês</h3><span class="badge">${mesItens.length}</span></div><div class="card-b" style="max-height:720px;overflow:auto">${mesItens.length ? `<div class="timeline">${mesItens.map(e => `<div class="tl"><div class="d">${UI.date(e.data)} ${e.hora || ''} ${e.obraId ? '· ' + e.obraId : ''}</div><div><span class="ev ${e.cls}" style="display:inline-block">${esc(e.tipo)}</span> ${e.ref ? `<span class="plink" data-goto="${e.ref}">${esc(e.titulo)}</span>` : esc(e.titulo)}</div></div>`).join('')}</div>` : UI.empty('Nada neste mês.', 'calendar')}</div></div></div>`;
    const mv = n => { s.mes += n; if (s.mes < 0) { s.mes = 11; s.ano--; } if (s.mes > 11) { s.mes = 0; s.ano++; } App.refresh(); };
    UI.$('#cp', el).onclick = () => mv(-1); UI.$('#cn', el).onclick = () => mv(1);
    UI.$('#ch', el).onclick = () => { s.ano = now.getFullYear(); s.mes = now.getMonth(); App.refresh(); };
    UI.$('#cob', el).onchange = e => { s.obra = e.target.value; App.refresh(); };
    UI.$$('[data-fk]', el).forEach(c => c.onchange = () => { s.filtros[c.dataset.fk] = c.checked ? 1 : 0; App.refresh(); });
    UI.$$('[data-day]', el).forEach(d => d.onclick = e => { if (!e.target.closest('[data-goto]')) this.edit(null, { data: d.dataset.day }); });
  },
  async edit(id, preset = {}) {
    const e = id ? Store.get('eventos', id) : Object.assign({ data: UI.today(), tipo: 'Reunião' }, preset);
    const list = [{ k: 'titulo', l: 'Título', req: 1, full: 1 }, { k: 'tipo', l: 'Tipo', t: 'select', o: LISTAS.tipoEvento }, { k: 'obraId', l: 'Obra', t: 'select', o: () => Store.all('obras').map(o => [o.id, o.id + ' · ' + o.nome]) },
      { k: 'data', l: 'Data', t: 'date', req: 1 }, { k: 'hora', l: 'Hora', t: 'time' }, { k: 'participantes', l: 'Participantes', t: 'multi', o: () => Store.all('pessoas').map(p => [p.id, p.nome]), full: 1 }, { k: 'descricao', l: 'Descrição / local', t: 'textarea', full: 1 }];
    const d = await UI.formModal({ title: id ? 'Evento ' + id : 'Novo evento', list, values: e, onDelete: id ? () => { Store.remove('eventos', id); App.refresh(); } : null });
    if (!d) return; id ? Store.update('eventos', id, d) : Store.insert('eventos', d); UI.toast('Evento salvo'); App.refresh();
  }
};
Open.EV = id => Views.calendario.edit(id);
