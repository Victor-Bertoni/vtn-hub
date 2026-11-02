/* Agenda: próximos dias com compromissos, prazos, obrigações fiscais e feriados */
Views.agenda = {
  perm: 'calendario',
  st: { dias: 30 },
  itens(de, ate) {
    const ev = Views.calendario.items().filter(e => e.data >= de && e.data <= ate);
    const ob = Fiscal.ocorrencias(de, ate).map(o => ({ k: 'fiscal', data: o.data, titulo: o.obrig.nome + ' (comp. ' + o.competencia + ')', tipo: o.obrig.esfera, cls: o.status === 'pago' ? 'recebimento' : 'vencimento', ref: null, fiscal: o }));
    const fer = []; for (let y = +de.slice(0, 4); y <= +ate.slice(0, 4); y++) Fiscal.feriados(y).filter(f => f.data >= de && f.data <= ate).forEach(f => fer.push({ k: 'feriado', data: f.data, titulo: f.nome, tipo: f.esfera, cls: 'feriado' }));
    return [...fer, ...ob, ...ev].sort((a, b) => (a.data + (a.hora || '')).localeCompare(b.data + (b.hora || '')));
  },
  render(el) {
    const { icon, esc, date } = UI; const s = this.st;
    const hoje = UI.today(), ate = Fiscal.addDays(hoje, s.dias);
    const it = this.itens(hoje, ate);
    const dias = {}; it.forEach(i => (dias[i.data] = dias[i.data] || []).push(i));
    const wd = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const proxFer = (() => { for (let y = +hoje.slice(0, 4); y <= +hoje.slice(0, 4) + 1; y++) { const f = Fiscal.feriados(y).find(f => f.data > hoje && f.esfera !== 'Facultativo'); if (f) return f; } })();
    const uteis = Fiscal.diasUteis(hoje, ate);
    const cont = k => it.filter(i => i.k === k || (k === 'prazos' && ['pendencia', 'entrega', 'os', 'vencimento', 'recebimento'].includes(i.k))).length;
    el.innerHTML = `
      <div class="hero"><div><div class="hero-kicker">${icon('calendar-heart')} Agenda</div><h1>${wd[new Date(hoje + 'T12:00:00').getDay()]}, ${UI.dateLong(hoje)}</h1><p>Compromissos, prazos das obras, vencimentos de impostos e feriados dos próximos ${s.dias} dias.</p></div>
        <div class="hero-side"><div><span>Próximo feriado</span><b>${proxFer ? esc(proxFer.nome) : '—'}</b><small>${proxFer ? date(proxFer.data) + ' · ' + proxFer.esfera : ''}</small></div><div><span>Dias úteis no período</span><b>${uteis}</b><small>${Store.db.fiscalCfg ? Store.db.fiscalCfg.cidade : 'BH'}</small></div></div></div>
      <div class="toolbar">${[7, 15, 30, 60, 90].map(d => `<button class="btn sm ${s.dias === d ? 'primary' : ''}" data-d="${d}">${d} dias</button>`).join('')}
        <span class="badge warn">${cont('fiscal')} obrigações fiscais</span><span class="badge info">${cont('prazos')} prazos de obras/financeiro</span><span class="badge brand">${cont('evento')} compromissos</span><span class="badge violet">${cont('feriado')} feriados</span>
        <div class="row" style="margin-left:auto"><a class="btn sm" href="#/calendario">${icon('calendar-days')} Calendário</a><button class="btn sm primary" onclick="Views.calendario.edit()">${icon('plus')} Compromisso</button></div></div>
      <div class="agenda">${Object.keys(dias).length ? Object.entries(dias).map(([d, l]) => { const fer = l.some(x => x.k === 'feriado' && x.tipo !== 'Facultativo'); const util = Fiscal.diaUtil(d);
        return `<div class="ag-day ${d === hoje ? 'today' : ''} ${!util ? 'off' : ''}"><div class="ag-date"><b>${d.slice(8)}</b><span>${UI.MES_AB[+d.slice(5, 7) - 1]}</span><small>${wd[new Date(d + 'T12:00:00').getDay()].slice(0, 3)}</small>${fer ? '<em>feriado</em>' : ''}</div>
          <div class="ag-items">${l.map(i => `<div class="ag-item ${i.cls}" ${i.ref ? `data-goto="${i.ref}"` : ''}><span class="ev ${i.cls}" style="display:inline-block;margin:0">${esc(i.tipo)}</span><span class="ag-t">${i.hora ? `<b>${i.hora}</b> ` : ''}${esc(i.titulo)}</span>${i.obraId ? `<span class="idlink">${i.obraId}</span>` : ''}</div>`).join('')}</div></div>`; }).join('') : UI.empty('Nada nos próximos dias.', 'calendar')}</div>`;
    UI.$$('[data-d]', el).forEach(b => b.onclick = () => { s.dias = +b.dataset.d; App.refresh(); });
  }
};
