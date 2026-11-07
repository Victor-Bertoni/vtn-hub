/* =========================================================
   EQUIPE E RH – funcionários, bater ponto, folha de ponto, holerite,
   custo de mão de obra por obra, provisões (férias/13º/FGTS) e
   documentos de segurança (ASO, NR-18, NR-35, EPI).
   • Bater ponto: página "Bater ponto" (qualquer pessoa logada, celular ou PC).
     Quem não é administrador: a marcação vira pedido e entra quando Victor/Ismael aprovam.
   • Holerite CLT: INSS e IRRF pelas tabelas da Central de conhecimento; horas extras
     50%/100% e DSR; faltas; VT 6%; adiantamento. Diarista: dias × diária.
     Autônomo (RPA): valor − INSS 11% − IRRF.
   • "Gerar despesa": lança "Mão de obra" rateado pelas obras onde a pessoa bateu ponto.
   Valores de folha são estimativas gerenciais – confirmar com a contabilidade.
   ========================================================= */
(() => {
  const VINC = ['CLT', 'Diarista', 'Autônomo (RPA)', 'PJ / Empreiteiro', 'Estagiário', 'Sócio'];
  const TIPOS_PONTO = [['entrada', 'Entrada'], ['intervalo', 'Saída almoço'], ['retorno', 'Volta almoço'], ['saida', 'Saída']];
  const hoje = () => UI.today();
  const mesDe = d => (d || '').slice(0, 7);
  const addMes = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  const diasDoMes = ym => { const [y, m] = ym.split('-').map(Number); const n = new Date(y, m, 0).getDate(); return Array.from({ length: n }, (_, i) => ym + '-' + String(i + 1).padStart(2, '0')); };
  const dow = d => new Date(d + 'T12:00:00').getDay();
  const feriadosSet = y => { try { return new Set(Fiscal.feriados(+y).filter(f => f.esfera !== 'Ponto facultativo').map(f => f.data)); } catch (e) { return new Set(); } };
  const min = h => { const [a, b] = String(h || '0:0').split(':').map(Number); return (a || 0) * 60 + (b || 0); };
  const hm = m => (m < 0 ? '−' : '') + Math.floor(Math.abs(m) / 60) + 'h' + String(Math.round(Math.abs(m) % 60)).padStart(2, '0');
  const K = () => window.Conhecimento || { calcINSS: () => 0, calcIRRF: () => 0 };
  const r2 = v => Math.round((+v || 0) * 100) / 100;
  const ehFunc = p => ['Funcionário', 'Prestador/Empreiteiro'].includes(p.tipo) || (p.rh && p.rh.ativo);
  const rhDe = p => Object.assign({ vinculo: p.tipo === 'Prestador/Empreiteiro' ? 'Diarista' : 'CLT', cargo: '', admissao: '', salario: 0, diaria: 0, horasMes: 220, jornada: 8, sabado: 4, vt: 0, optaVT: false, dependentes: 0, encargos: 70, pix: '', ativo: true }, p.rh || {});
  const funcionarios = (todos) => Store.all('pessoas').filter(p => ehFunc(p) && (todos || rhDe(p).ativo !== false));
  const minhaPessoa = () => { const u = (window.Auth && Auth.current()) || {}; return u.pessoaId || ''; };
  const custoHora = p => { const r = rhDe(p); if (r.vinculo === 'CLT' || r.vinculo === 'Estagiário') return (+r.salario || 0) * (1 + (+r.encargos || 0) / 100) / (+r.horasMes || 220); return (+r.diaria || 0) / (+r.jornada || 8) || (+r.valorHora || 0); };

  /* ---------- cálculo da folha de ponto do mês ---------- */
  function folhaPonto(pessoaId, ym) {
    const p = Store.get('pessoas', pessoaId) || {}; const r = rhDe(p); const fer = feriadosSet(ym.slice(0, 4));
    const marcas = Store.where('ponto', x => x.pessoaId === pessoaId && mesDe(x.data) === ym);
    const dias = diasDoMes(ym).map(d => {
      const M = marcas.filter(x => x.data === d).sort((a, b) => a.hora.localeCompare(b.hora));
      let trab = 0; for (let i = 0; i + 1 < M.length; i += 2) trab += Math.max(0, min(M[i + 1].hora) - min(M[i].hora));
      const w = dow(d), domFer = w === 0 || fer.has(d);
      const previsto = domFer ? 0 : w === 6 ? (+r.sabado || 0) * 60 : (+r.jornada || 8) * 60;
      const extra = trab - previsto > 10 ? trab - previsto : 0;   // tolerância de 10 min por dia (CLT art. 58 §1º)
      const falta = !M.length && previsto > 0 && d < hoje() && (!r.admissao || d >= r.admissao) && r.vinculo === 'CLT';
      const obras = {}; M.forEach(x => { if (x.obraId) obras[x.obraId] = 1; });
      return { d, w, M, trab, previsto, extra50: domFer ? 0 : extra, extra100: domFer ? trab : 0, falta, impar: M.length % 2 === 1, domFer, obras: Object.keys(obras) };
    });
    const tot = k => dias.reduce((a, x) => a + (typeof x[k] === 'boolean' ? (x[k] ? 1 : 0) : x[k]), 0);
    // horas por obra (para ratear o custo)
    const porObra = {}; dias.forEach(x => { for (let i = 0; i + 1 < x.M.length; i += 2) { const ob = x.M[i].obraId || x.M[i + 1].obraId || ''; porObra[ob] = (porObra[ob] || 0) + Math.max(0, min(x.M[i + 1].hora) - min(x.M[i].hora)); } });
    return { p, r, dias, trab: tot('trab'), previsto: tot('previsto'), h50: tot('extra50'), h100: tot('extra100'), faltas: tot('falta'), diasTrab: dias.filter(x => x.trab > 0).length, impares: tot('impar'), porObra, domFer: dias.filter(x => x.domFer).length, uteis: dias.filter(x => !x.domFer).length };
  }

  /* ---------- holerite ---------- */
  function calcHolerite(pessoaId, ym, aj = {}) {
    const fp = folhaPonto(pessoaId, ym); const r = fp.r; const L = []; const add = (desc, ref, prov, desc2) => L.push([desc, ref, r2(prov), r2(desc2)]);
    let fgts = 0;
    if (r.vinculo === 'CLT' || r.vinculo === 'Estagiário') {
      const s = +r.salario || 0, vh = s / (+r.horasMes || 220);
      add('Salário base', (+r.horasMes || 220) + 'h', s, 0);
      const h50 = aj.h50 != null ? +aj.h50 : fp.h50 / 60, h100 = aj.h100 != null ? +aj.h100 : fp.h100 / 60;
      const he = h50 * vh * 1.5 + h100 * vh * 2;
      if (h50) add('Horas extras 50%', UI.num(h50) + 'h', h50 * vh * 1.5, 0);
      if (h100) add('Horas extras 100% (dom./feriado)', UI.num(h100) + 'h', h100 * vh * 2, 0);
      const dsr = he && fp.uteis ? he / fp.uteis * fp.domFer : 0; if (dsr) add('DSR sobre horas extras', fp.domFer + ' d', dsr, 0);
      if (+aj.adicional) add(aj.adicionalDesc || 'Adicional', '', +aj.adicional, 0);
      if (+aj.outrosProv) add(aj.outrosProvDesc || 'Outros proventos', '', +aj.outrosProv, 0);
      const faltas = aj.faltas != null ? +aj.faltas : fp.faltas; const dFalta = faltas ? s / 30 * faltas : 0; if (dFalta) add('Faltas', faltas + ' d', 0, dFalta);
      const bruto = L.reduce((a, x) => a + x[2], 0) - dFalta;
      const inss = r.vinculo === 'Estagiário' ? 0 : K().calcINSS(bruto); if (inss) add('INSS', '', 0, inss);
      const ir = r.vinculo === 'Estagiário' ? 0 : K().calcIRRF(bruto, inss, +r.dependentes || 0); if (ir > 0.01) add('IRRF', (+r.dependentes || 0) + ' dep.', 0, ir);
      if (r.optaVT) { const vt = Math.min(s * 0.06, +r.vt || s * 0.06); add('Vale-transporte (6%)', '', 0, vt); }
      fgts = r.vinculo === 'CLT' ? bruto * 0.08 : 0;
    } else if (r.vinculo === 'Diarista') {
      const dias = aj.dias != null ? +aj.dias : fp.diasTrab; add('Diárias', dias + ' d × ' + UI.money(r.diaria), dias * (+r.diaria || 0), 0);
      const h = (aj.h50 != null ? +aj.h50 : fp.h50 / 60); if (h) add('Horas a mais', UI.num(h) + 'h', h * (+r.diaria || 0) / (+r.jornada || 8), 0);
      if (+aj.outrosProv) add(aj.outrosProvDesc || 'Outros', '', +aj.outrosProv, 0);
    } else if (r.vinculo === 'Autônomo (RPA)') {
      const dias = aj.dias != null ? +aj.dias : fp.diasTrab; const v = aj.valor != null ? +aj.valor : dias * (+r.diaria || 0);
      add('Serviços prestados (RPA)', dias + ' d', v, 0); const inss = Math.min(v, (K().INSS || {}).teto || 1e9) * 0.11; add('INSS autônomo 11%', '', 0, inss);
      const ir = K().calcIRRF(v, inss, 0); if (ir > 0.01) add('IRRF', '', 0, ir);
    } else {
      const v = aj.valor != null ? +aj.valor : (+r.salario || (+r.diaria || 0) * fp.diasTrab); add('Pagamento do período', '', v, 0);
    }
    if (+aj.adiantamento) add('Adiantamento', '', 0, +aj.adiantamento);
    if (+aj.outrosDesc) add(aj.outrosDescDesc || 'Outros descontos', '', 0, +aj.outrosDesc);
    const prov = L.reduce((a, x) => a + x[2], 0), desc = L.reduce((a, x) => a + x[3], 0);
    return { fp, linhas: L, proventos: r2(prov), descontos: r2(desc), liquido: r2(prov - desc), fgts: r2(fgts), base: r2(prov - (L.find(x => x[0] === 'Faltas') || [0, 0, 0, 0])[3]) };
  }
  function htmlHolerite(f, so1) {
    const { esc, money } = UI; const p = Store.get('pessoas', f.pessoaId) || {}; const r = rhDe(p); const e = Store.db.empresa;
    const via = (t) => `<div style="border:1px solid #334155;border-radius:8px;padding:12px 14px;margin-bottom:14px;font-size:11.5px;break-inside:avoid">
      <div style="display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #cbd5e1;padding-bottom:6px;margin-bottom:6px"><div><b>${esc(e.nome)}</b><br>CNPJ ${esc(e.cnpj || '')}</div><div style="text-align:right"><b>RECIBO DE PAGAMENTO${r.vinculo === 'CLT' ? ' DE SALÁRIO' : ''}</b><br>Referência: ${Calc.mesLabel(f.mes)} · ${t}</div></div>
      <div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:6px"><div><b>${esc(p.nome || '')}</b>${p.cpf ? ' · CPF ' + esc(p.cpf) : ''}<br>${esc(r.cargo || '')} · ${esc(r.vinculo)}${r.admissao ? ' · admissão ' + UI.date(r.admissao) : ''}</div><div style="text-align:right">${f.id}</div></div>
      <table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f1f5f9"><th style="text-align:left;padding:4px">Descrição</th><th style="padding:4px">Ref.</th><th style="text-align:right;padding:4px">Proventos</th><th style="text-align:right;padding:4px">Descontos</th></tr></thead>
      <tbody>${f.linhas.map(l => `<tr><td style="padding:3px 4px;border-bottom:1px solid #eef2f7">${esc(l[0])}</td><td style="text-align:center;border-bottom:1px solid #eef2f7">${esc(l[1])}</td><td style="text-align:right;border-bottom:1px solid #eef2f7">${l[2] ? money(l[2]) : ''}</td><td style="text-align:right;border-bottom:1px solid #eef2f7">${l[3] ? money(l[3]) : ''}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="2" style="padding:4px"><b>Totais</b></td><td style="text-align:right"><b>${money(f.proventos)}</b></td><td style="text-align:right"><b>${money(f.descontos)}</b></td></tr>
      <tr><td colspan="2" style="padding:4px">${f.fgts ? 'FGTS do mês (depósito da empresa): ' + money(f.fgts) + ' · base ' + money(f.base) : ''}</td><td colspan="2" style="text-align:right;font-size:13px;padding:4px;background:#effdf0"><b>Líquido a receber: ${money(f.liquido)}</b></td></tr></tfoot></table>
      ${r.pix ? `<div class="tiny" style="margin-top:4px">PIX: ${esc(r.pix)}</div>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:26px;text-align:center"><div style="border-top:1px solid #334155;padding-top:4px">${esc(e.nome)}</div><div style="border-top:1px solid #334155;padding-top:4px">Declaro ter recebido a importância líquida acima<br>${esc(p.nome || '')} · ___/___/______</div></div></div>`;
    return so1 ? via('prévia') : via('via da empresa') + via('via do funcionário');
  }
  function htmlFolhaPonto(fp, ym) {
    const { esc } = UI; const sem = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']; const e = Store.db.empresa;
    return `${UI.docHeader('FOLHA DE PONTO', Calc.mesLabel(ym))}<h1>Folha de ponto – ${esc(fp.p.nome || '')}</h1><p>${esc(fp.r.cargo || '')} · ${esc(fp.r.vinculo)} · jornada ${fp.r.jornada}h (sáb. ${fp.r.sabado}h) · ${esc(e.nome)}</p>
      <table><thead><tr><th>Dia</th><th>Marcações</th><th>Obra</th><th>Trabalhado</th><th>Extra 50%</th><th>Extra 100%</th><th>Obs.</th></tr></thead><tbody>${fp.dias.map(x => `<tr${x.domFer ? ' style="background:#f8fafc"' : ''}><td>${x.d.slice(8)} ${sem[x.w]}</td><td>${x.M.map(m => m.hora).join(' · ')}</td><td>${x.obras.join(', ')}</td><td>${x.trab ? hm(x.trab) : ''}</td><td>${x.extra50 ? hm(x.extra50) : ''}</td><td>${x.extra100 ? hm(x.extra100) : ''}</td><td>${x.falta ? 'Falta' : x.impar ? 'Marcação ímpar' : x.domFer && !x.trab ? (x.w === 0 ? 'Domingo' : 'Feriado') : ''}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="3"><b>Totais</b> · ${fp.diasTrab} dias trabalhados · ${fp.faltas} faltas</td><td><b>${hm(fp.trab)}</b></td><td><b>${hm(fp.h50)}</b></td><td><b>${hm(fp.h100)}</b></td><td></td></tr></tfoot></table>
      <div class="sig"><div>${esc(fp.p.nome || 'Funcionário')}</div><div>${esc(e.nome)}</div></div>`;
  }

  /* ---------- tela Equipe e RH ---------- */
  Views.rh = {
    perm: 'pessoas',
    st: { tab: 'func', mes: addMes(UI.today().slice(0, 7), 0), pessoa: '', todos: false },
    render(el) {
      const { icon } = UI; const s = this.st; const F = funcionarios();
      const T = [['func', 'Funcionários', 'users'], ['ponto', 'Folha de ponto', 'clock'], ['lote', 'Lançar ponto em lote', 'list-plus'], ['folha', 'Folha e holerites', 'file-text'], ['custo', 'Custo por obra', 'pie-chart'], ['prov', 'Férias, 13º e alertas', 'calendar-clock']];
      const fs = F.map(p => folhaPonto(p.id, s.mes));
      const folha = Store.where('folha', x => x.mes === s.mes);
      el.innerHTML = `<div class="page-head"><div><h1>Equipe e RH</h1><p>Funcionários, ponto, holerites e custo da mão de obra</p></div><div class="row"><a class="btn" href="#/ponto">${icon('fingerprint')} Bater ponto</a><button class="btn primary" id="rhNovo">${icon('user-plus')} Novo funcionário</button></div></div>
        <div class="grid g4">
          <div class="card kpi"><div class="ico">${icon('users')}</div><div class="lbl">Equipe ativa</div><div class="val">${F.length}</div><div class="sub">${F.filter(p => rhDe(p).vinculo === 'CLT').length} CLT · ${F.filter(p => rhDe(p).vinculo === 'Diarista').length} diaristas · ${F.filter(p => !['CLT', 'Diarista'].includes(rhDe(p).vinculo)).length} outros</div></div>
          <div class="card kpi info"><div class="ico">${icon('clock')}</div><div class="lbl">Horas no mês</div><div class="val">${hm(fs.reduce((a, f) => a + f.trab, 0))}</div><div class="sub">extras ${hm(fs.reduce((a, f) => a + f.h50 + f.h100, 0))} · ${fs.reduce((a, f) => a + f.faltas, 0)} faltas</div></div>
          <div class="card kpi err"><div class="ico">${icon('wallet')}</div><div class="lbl">Folha do mês (líquido)</div><div class="val">${UI.moneyK(folha.reduce((a, f) => a + (+f.liquido || 0), 0))}</div><div class="sub">${folha.length} holerites · ${folha.filter(f => f.status === 'Pago').length} pagos</div></div>
          <div class="card kpi violet"><div class="ico">${icon('hard-hat')}</div><div class="lbl">Custo estimado da mão de obra</div><div class="val">${UI.moneyK(fs.reduce((a, f) => a + f.trab / 60 * custoHora(f.p), 0))}</div><div class="sub">horas × custo-hora com encargos</div></div>
        </div>
        <div class="toolbar mt"><label class="tiny muted">Mês</label><input type="month" class="input" id="rhMes" value="${s.mes}"></div>
        <div class="tabs">${T.map(t => `<button class="${t[0] === s.tab ? 'active' : ''}" data-t="${t[0]}">${icon(t[2])} ${t[1]}</button>`).join('')}</div>
        <div id="rhc"></div>`;
      UI.$('#rhMes', el).onchange = e => { s.mes = e.target.value || s.mes; App.refresh(); };
      UI.$('#rhNovo', el).onclick = () => this.editFunc();
      UI.$$('[data-t]', el).forEach(b => b.onclick = () => { s.tab = b.dataset.t; App.refresh(); });
      this['t_' + s.tab](UI.$('#rhc', el), F);
    },
    t_func(c) {
      const { esc, money, icon } = UI; const s = this.st; const F = funcionarios(s.todos);
      c.innerHTML = `<div class="card"><div class="card-h"><h3>Funcionários e prestadores</h3><label class="check"><input type="checkbox" id="rhTodos" ${s.todos ? 'checked' : ''}> Mostrar desligados</label></div>${UI.table([
        { h: 'ID', f: p => UI.idLink(p.id) }, { h: 'Nome', f: p => `<span class="plink" data-ed="${p.id}">${esc(p.nome)}</span><div class="tiny muted">${esc(rhDe(p).cargo || p.tipo)}</div>` },
        { h: 'Vínculo', f: p => UI.badge(rhDe(p).vinculo, rhDe(p).vinculo === 'CLT' ? 'info' : '') }, { h: 'Admissão', f: p => UI.date(rhDe(p).admissao) },
        { h: 'Salário / diária', f: p => { const r = rhDe(p); return r.vinculo === 'CLT' || r.vinculo === 'Estagiário' ? money(r.salario) : r.diaria ? money(r.diaria) + '/dia' : '—'; } },
        { h: 'Custo-hora', f: p => money(custoHora(p)) }, { h: 'Telefone', f: p => esc(p.telefone || '') },
        { h: 'Documentos', f: p => this.docsBadges(p) || '<span class="tiny" style="color:var(--ok)">em dia</span>' },
        { h: '', f: p => `<div class="row" style="flex-wrap:nowrap"><button class="btn sm" data-fp="${p.id}" title="Folha de ponto">${icon('clock')}</button><button class="btn sm" data-ho="${p.id}" title="Holerite do mês">${icon('file-text')}</button><button class="btn sm" data-ed="${p.id}">${icon('pencil')}</button></div>` }
      ], F, { emptyMsg: 'Nenhum funcionário. Cadastre em "Novo funcionário" ou marque o tipo Funcionário em Clientes e equipe.' })}</div>`;
      UI.$('#rhTodos', c).onchange = e => { s.todos = e.target.checked; App.refresh(); };
      UI.$$('[data-ed]', c).forEach(b => b.onclick = () => this.editFunc(b.dataset.ed));
      UI.$$('[data-fp]', c).forEach(b => b.onclick = () => { s.pessoa = b.dataset.fp; s.tab = 'ponto'; App.refresh(); });
      UI.$$('[data-ho]', c).forEach(b => b.onclick = () => this.holerite(b.dataset.ho, s.mes));
    },
    docsBadges(p) {
      const r = rhDe(p); const h = hoje(); const out = [];
      [['aso', 'ASO'], ['nr18', 'NR-18'], ['nr35', 'NR-35']].forEach(([k, n]) => { if (r[k]) { const d = UI.daysBetween(h, r[k]); if (d < 0) out.push(UI.badge(n + ' vencido', 'err')); else if (d <= 30) out.push(UI.badge(n + ' vence em ' + d + 'd', 'warn')); } });
      if (r.epiEm && UI.daysBetween(r.epiEm, h) > 180) out.push(UI.badge('EPI há +6 meses', 'warn'));
      return out.join(' ');
    },
    async editFunc(id) {
      const p0 = id ? Store.get('pessoas', id) : { tipo: 'Funcionário' }; const r = rhDe(p0);
      const v = Object.assign({ nome: p0.nome, cpf: p0.cpf, telefone: p0.telefone, email: p0.email, tipo: p0.tipo }, r);
      const d = await UI.formModal({ title: id ? 'Funcionário ' + id : 'Novo funcionário', wide: true, values: v, list: [
        { k: 'nome', l: 'Nome completo', req: 1, full: 1 }, { k: 'cpf', l: 'CPF' }, { k: 'telefone', l: 'Telefone' }, { k: 'email', l: 'E-mail', t: 'email' },
        { k: 'tipo', l: 'Cadastro como', t: 'select', o: ['Funcionário', 'Prestador/Empreiteiro'], blank: false }, { k: 'vinculo', l: 'Vínculo', t: 'select', o: VINC, blank: false }, { k: 'cargo', l: 'Cargo / função' },
        { k: 'admissao', l: 'Admissão', t: 'date' }, { k: 'demissao', l: 'Desligamento', t: 'date' }, { k: 'salario', l: 'Salário mensal (CLT)', t: 'money' }, { k: 'diaria', l: 'Diária (diarista/autônomo)', t: 'money' },
        { k: 'horasMes', l: 'Horas/mês (CLT)', t: 'number' }, { k: 'jornada', l: 'Jornada seg–sex (h/dia)', t: 'number' }, { k: 'sabado', l: 'Jornada sábado (h)', t: 'number' },
        { k: 'encargos', l: 'Encargos sobre salário (%) p/ custo', t: 'number' }, { k: 'dependentes', l: 'Dependentes (IRRF)', t: 'number' }, { k: 'optaVT', l: 'Optante vale-transporte (desconta 6%)', t: 'check' }, { k: 'vt', l: 'Valor do VT no mês', t: 'money' },
        { k: 'pix', l: 'PIX / dados bancários', full: 1 }, { k: 'aso', l: 'ASO válido até', t: 'date' }, { k: 'nr18', l: 'NR-18 válido até', t: 'date' }, { k: 'nr35', l: 'NR-35 (altura) válido até', t: 'date' }, { k: 'epiEm', l: 'Última entrega de EPI', t: 'date' },
        { k: 'ativo', l: 'Ativo na equipe', t: 'check' }, { k: 'obsRh', l: 'Observações', t: 'textarea', full: 1, rows: 2 }
      ] });
      if (!d) return;
      const base = { nome: d.nome, cpf: d.cpf, telefone: d.telefone, email: d.email, tipo: d.tipo };
      ['nome', 'cpf', 'telefone', 'email', 'tipo'].forEach(k => delete d[k]);
      if (d.demissao) d.ativo = false;
      const rec = id ? Store.update('pessoas', id, Object.assign(base, { rh: Object.assign({}, p0.rh || {}, d) })) : Store.insert('pessoas', Object.assign(base, { rh: d }));
      UI.toast('Salvo: ' + rec.id); App.refresh();
    },
    t_ponto(c, F) {
      const { esc, icon } = UI; const s = this.st; if (!s.pessoa || !Store.get('pessoas', s.pessoa)) s.pessoa = (F[0] || {}).id || '';
      if (!s.pessoa) { c.innerHTML = UI.empty('Cadastre funcionários primeiro.', 'users'); return; }
      const fp = folhaPonto(s.pessoa, s.mes); const sem = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
      c.innerHTML = `<div class="toolbar"><select class="select" id="rhP">${F.map(p => `<option value="${p.id}" ${p.id === s.pessoa ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select>
          <button class="btn" id="rhAdd">${icon('plus')} Marcação</button><button class="btn" id="rhPr">${icon('printer')} Imprimir folha de ponto</button><button class="btn primary" id="rhHo">${icon('file-text')} Holerite</button></div>
        <div class="grid g4 mb">${[['Trabalhado', hm(fp.trab), 'previsto ' + hm(fp.previsto)], ['Extras 50%', hm(fp.h50), ''], ['Extras 100%', hm(fp.h100), 'domingos e feriados'], ['Faltas', fp.faltas, fp.impares ? fp.impares + ' dias com marcação ímpar' : 'marcações completas']].map(k => `<div class="card kpi"><div class="lbl">${k[0]}</div><div class="val">${k[1]}</div><div class="sub">${k[2]}</div></div>`).join('')}</div>
        <div class="card">${UI.table([{ h: 'Dia', f: x => `<b>${x.d.slice(8)}</b> <span class="muted">${sem[x.w]}</span>` }, { h: 'Marcações', f: x => x.M.map(m => `<span class="chip" data-mk="${m.id}" title="${esc((TIPOS_PONTO.find(t => t[0] === m.tipo) || [])[1] || '')}${m.obraId ? ' · ' + m.obraId : ''}${m.lat ? ' · com localização' : ''}">${m.hora}${m.lat ? ' 📍' : ''}</span>`).join(' ') || '<span class="muted tiny">—</span>' },
          { h: 'Obra', f: x => x.obras.map(o => UI.idLink(o)).join(' ') }, { h: 'Trabalhado', f: x => x.trab ? hm(x.trab) : '' }, { h: 'Extra', f: x => (x.extra50 ? hm(x.extra50) + ' (50%)' : '') + (x.extra100 ? hm(x.extra100) + ' (100%)' : '') },
          { h: 'Situação', f: x => x.falta ? UI.badge('Falta', 'err') : x.impar ? UI.badge('Ímpar', 'warn') : x.domFer && !x.trab ? '<span class="tiny muted">descanso</span>' : '' }, { h: '', f: x => `<button class="btn sm ghost" data-dia="${x.d}">${icon('plus')}</button>` }], fp.dias)}</div>`;
      UI.$('#rhP', c).onchange = e => { s.pessoa = e.target.value; App.refresh(); };
      UI.$('#rhAdd', c).onclick = () => this.marcar(s.pessoa, hoje());
      UI.$$('[data-dia]', c).forEach(b => b.onclick = () => this.marcar(s.pessoa, b.dataset.dia));
      UI.$$('[data-mk]', c).forEach(b => b.onclick = () => this.marcar(s.pessoa, null, b.dataset.mk));
      UI.$('#rhPr', c).onclick = () => UI.print(htmlFolhaPonto(fp, s.mes), 'Folha de ponto ' + fp.p.nome);
      UI.$('#rhHo', c).onclick = () => this.holerite(s.pessoa, s.mes);
    },
    async marcar(pessoaId, data, id) {
      const m = id ? Store.get('ponto', id) : { pessoaId, data, hora: new Date().toTimeString().slice(0, 5), tipo: 'entrada', obraId: '' };
      const d = await UI.formModal({ title: id ? 'Marcação ' + id : 'Nova marcação de ponto', values: m, list: [
        { k: 'pessoaId', l: 'Funcionário', t: 'select', o: () => funcionarios(true).map(p => [p.id, p.nome]), req: 1 }, { k: 'data', l: 'Data', t: 'date', req: 1 }, { k: 'hora', l: 'Hora', t: 'time', req: 1 },
        { k: 'tipo', l: 'Tipo', t: 'select', o: TIPOS_PONTO, blank: false }, { k: 'obraId', l: 'Obra', t: 'select', o: () => Store.all('obras').filter(o => !['Concluída', 'Cancelada'].includes(o.status)).map(o => [o.id, o.id + ' · ' + o.nome]) },
        { k: 'obs', l: 'Justificativa (ajuste manual)', full: 1 }], onDelete: id ? () => { Store.remove('ponto', id); App.refresh(); } : null });
      if (!d) return; d.origem = id ? (m.origem || 'manual') : 'manual'; d.por = (Auth.current() || {}).nome || '';
      if (id) Store.update('ponto', id, d); else Store.insert('ponto', d); UI.toast('Ponto salvo'); App.refresh();
    },
    t_lote(c, F) {
      const { esc, icon } = UI;
      c.innerHTML = `<div class="card"><div class="card-h"><h3>Lançar o dia da equipe de uma vez</h3></div><div class="card-b">
        <div class="grid g4"><div class="field"><label>Data</label><input type="date" class="input" id="lzD" value="${hoje()}"></div><div class="field"><label>Obra</label><select class="select" id="lzO"><option value=""></option>${Store.all('obras').filter(o => !['Concluída', 'Cancelada'].includes(o.status)).map(o => `<option value="${o.id}">${o.id} · ${esc(o.nome)}</option>`).join('')}</select></div>
          <div class="field"><label>Entrada / almoço / volta / saída</label><div class="row" style="gap:4px"><input type="time" class="input" id="lz1" value="07:00"><input type="time" class="input" id="lz2" value="11:00"><input type="time" class="input" id="lz3" value="12:00"><input type="time" class="input" id="lz4" value="16:00"></div></div></div>
        <div class="tiny muted mt">Quem trabalhou</div><div class="grid g3">${F.map(p => `<label class="check"><input type="checkbox" data-lz="${p.id}" checked> ${esc(p.nome)} <span class="tiny muted">${esc(rhDe(p).vinculo)}</span></label>`).join('')}</div>
        <button class="btn primary mt" id="lzOk">${icon('check')} Lançar marcações</button><p class="tiny muted">Deixe "almoço" e "volta" vazios para lançar só entrada e saída.</p></div></div>`;
      UI.$('#lzOk', c).onclick = () => {
        const d = UI.$('#lzD', c).value, ob = UI.$('#lzO', c).value; const hs = ['lz1', 'lz2', 'lz3', 'lz4'].map(k => UI.$('#' + k, c).value); const tipos = ['entrada', 'intervalo', 'retorno', 'saida'];
        const ps = UI.$$('[data-lz]', c).filter(x => x.checked).map(x => x.dataset.lz); let n = 0;
        ps.forEach(pid => hs.forEach((h, i) => { if (!h) return; if (Store.where('ponto', x => x.pessoaId === pid && x.data === d && x.hora === h).length) return; Store.insert('ponto', { pessoaId: pid, data: d, hora: h, tipo: tipos[i], obraId: ob, origem: 'lote', por: (Auth.current() || {}).nome || '' }); n++; }));
        UI.toast(n + ' marcações lançadas'); this.st.tab = 'ponto'; App.refresh();
      };
    },
    t_folha(c, F) {
      const { esc, money, icon } = UI; const s = this.st; const ja = Store.where('folha', x => x.mes === s.mes);
      const linhas = F.map(p => { const f = ja.find(x => x.pessoaId === p.id); const h = f || calcHolerite(p.id, s.mes); return { p, f, h }; });
      c.innerHTML = `<div class="toolbar"><button class="btn primary" id="fhTodos">${icon('calculator')} Calcular e salvar todos do mês</button><button class="btn" id="fhPrint">${icon('printer')} Imprimir holerites salvos</button><button class="btn" id="fhLanc">${icon('wallet')} Gerar despesas dos holerites fechados</button></div>
        <div class="card">${UI.table([{ h: 'Funcionário', f: x => `<b>${esc(x.p.nome)}</b><div class="tiny muted">${esc(rhDe(x.p).vinculo)}</div>` }, { h: 'Proventos', f: x => money(x.h.proventos) }, { h: 'Descontos', f: x => money(x.h.descontos) }, { h: 'Líquido', f: x => '<b>' + money(x.h.liquido) + '</b>' }, { h: 'FGTS', f: x => money(x.h.fgts) },
          { h: 'Situação', f: x => x.f ? UI.badge(x.f.status, x.f.status === 'Pago' ? 'ok' : x.f.status === 'Fechado' ? 'info' : '') + (x.f.lancamentoIds && x.f.lancamentoIds.length ? ' ' + UI.badge('despesa lançada', 'violet') : '') : '<span class="tiny muted">não salvo</span>' },
          { h: '', f: x => `<button class="btn sm" data-ho="${x.p.id}">${icon('file-text')} Abrir</button>` }], linhas, { emptyMsg: 'Sem funcionários.' })}</div>
        <p class="tiny muted">CLT: INSS e IRRF pelas tabelas da Central de conhecimento (Configurações › Parâmetros fiscais), horas extras pela folha de ponto. Estimativa gerencial – a folha oficial é da contabilidade.</p>`;
      UI.$$('[data-ho]', c).forEach(b => b.onclick = () => this.holerite(b.dataset.ho, s.mes));
      UI.$('#fhTodos', c).onclick = () => { let n = 0; F.forEach(p => { if (ja.find(x => x.pessoaId === p.id)) return; const h = calcHolerite(p.id, s.mes); if (!h.proventos) return; Store.insert('folha', { pessoaId: p.id, mes: s.mes, vinculo: rhDe(p).vinculo, linhas: h.linhas, proventos: h.proventos, descontos: h.descontos, liquido: h.liquido, fgts: h.fgts, base: h.base, porObra: h.fp.porObra, ajustes: {}, status: 'Rascunho' }); n++; }); UI.toast(n + ' holerites salvos como rascunho'); App.refresh(); };
      UI.$('#fhPrint', c).onclick = () => { const L = Store.where('folha', x => x.mes === s.mes); if (!L.length) return UI.toast('Nenhum holerite salvo neste mês'); UI.print(L.map(htmlHolerite).join('<div style="page-break-after:always"></div>'), 'Holerites ' + s.mes); };
      UI.$('#fhLanc', c).onclick = () => { let n = 0; Store.where('folha', x => x.mes === s.mes && x.status !== 'Rascunho' && !(x.lancamentoIds || []).length).forEach(f => { this.gerarDespesa(f.id, true); n++; }); UI.toast(n ? n + ' holerites viraram despesa de mão de obra' : 'Feche os holerites antes (status Fechado ou Pago)'); App.refresh(); };
    },
    async holerite(pessoaId, mes) {
      const { esc, money, icon } = UI; let f = Store.where('folha', x => x.pessoaId === pessoaId && x.mes === mes)[0];
      const aj = Object.assign({}, (f && f.ajustes) || {}); const p = Store.get('pessoas', pessoaId); const r = rhDe(p);
      const desenha = m => { const h = calcHolerite(pessoaId, mes, aj); m.$('#hoDoc').innerHTML = htmlHolerite(Object.assign({ id: (f && f.id) || 'prévia', pessoaId, mes }, h), true); return h; };
      const campos = r.vinculo === 'CLT' || r.vinculo === 'Estagiário' ? [['h50', 'Horas extras 50% (h)'], ['h100', 'Horas extras 100% (h)'], ['faltas', 'Faltas (dias)'], ['adicional', 'Adicional (R$)'], ['adicionalDesc', 'Nome do adicional'], ['outrosProv', 'Outros proventos (R$)'], ['adiantamento', 'Adiantamento (R$)'], ['outrosDesc', 'Outros descontos (R$)'], ['outrosDescDesc', 'Nome do desconto']]
        : [['dias', 'Dias trabalhados'], ['valor', 'Valor (R$) – se fixo'], ['h50', 'Horas a mais (h)'], ['outrosProv', 'Outros proventos (R$)'], ['adiantamento', 'Adiantamento (R$)'], ['outrosDesc', 'Outros descontos (R$)']];
      const fp = folhaPonto(pessoaId, mes);
      const m = UI.modal({ title: `Holerite – ${esc(p.nome)} – ${Calc.mesLabel(mes)}`, wide: true, body: `<div class="alert info">${icon('clock')}<div>Pela folha de ponto: ${fp.diasTrab} dias, ${hm(fp.trab)} trabalhadas, extras ${hm(fp.h50)} (50%) e ${hm(fp.h100)} (100%), ${fp.faltas} faltas. Deixe em branco para usar o ponto; preencha para ajustar.</div></div>
        <div class="grid g3">${campos.map(([k, l]) => `<div class="field"><label>${l}</label><input class="input" data-aj="${k}" ${/Desc$/.test(k) ? '' : 'type="number" step="any"'} value="${aj[k] != null ? esc(aj[k]) : ''}"></div>`).join('')}</div>
        <div class="field"><label>Situação</label><select class="select" id="hoSt">${['Rascunho', 'Fechado', 'Pago'].map(x => `<option ${(f && f.status) === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
        <div id="hoDoc" class="doc" style="margin-top:10px"></div>`,
        footer: `<button class="btn" data-close>Fechar</button>${f && !(f.lancamentoIds || []).length ? `<button class="btn" id="hoLanc">${icon('wallet')} Gerar despesa</button>` : ''}<button class="btn" id="hoPr">${icon('printer')} Imprimir</button><button class="btn primary" id="hoOk">${icon('save')} Salvar</button>` });
      desenha(m);
      m.el.querySelectorAll('[data-aj]').forEach(i => i.oninput = () => { const k = i.dataset.aj; if (i.value === '') delete aj[k]; else aj[k] = /Desc$/.test(k) ? i.value : +i.value; desenha(m); });
      const salvar = () => { const h = calcHolerite(pessoaId, mes, aj); const dados = { pessoaId, mes, vinculo: r.vinculo, linhas: h.linhas, proventos: h.proventos, descontos: h.descontos, liquido: h.liquido, fgts: h.fgts, base: h.base, porObra: h.fp.porObra, ajustes: aj, status: m.$('#hoSt').value };
        f = f ? Store.update('folha', f.id, dados) : Store.insert('folha', dados); return f; };
      m.$('#hoOk').onclick = () => { salvar(); UI.toast('Holerite salvo'); m.close(); App.refresh(); };
      m.$('#hoPr').onclick = () => { const x = salvar(); UI.print(htmlHolerite(x), 'Holerite ' + p.nome); };
      const hl = m.$('#hoLanc'); if (hl) hl.onclick = () => { const x = salvar(); if (x.status === 'Rascunho') Store.update('folha', x.id, { status: 'Fechado' }); this.gerarDespesa(x.id); m.close(); App.refresh(); };
    },
    // despesa "Mão de obra" rateada pelas obras onde a pessoa bateu ponto
    gerarDespesa(folhaId, silencioso) {
      const f = Store.get('folha', folhaId); if (!f) return; const p = Store.get('pessoas', f.pessoaId) || {};
      const po = f.porObra || {}; const tot = Object.values(po).reduce((a, v) => a + v, 0); const venc = addMes(f.mes, 1) + '-05';
      const partes = tot ? Object.entries(po).map(([ob, v]) => [ob, f.liquido * v / tot]) : [['', f.liquido]];
      const ids = partes.filter(x => x[1] > 0.009).map(([ob, v]) => Store.insert('lancamentos', { tipo: 'despesa', categoria: 'Mão de obra', descricao: `Folha ${Calc.mesLabel(f.mes)} – ${p.nome}${partes.length > 1 ? ' (rateio por horas)' : ''}`, valor: r2(v), obraId: ob || '', pessoaId: f.pessoaId, data: f.mes + '-01', vencimento: venc, status: f.status === 'Pago' ? 'pago' : 'pendente', dataPagamento: f.status === 'Pago' ? venc : '', folhaId: f.id, arquivoIds: [] }).id);
      Store.update('folha', f.id, { lancamentoIds: ids }); if (!silencioso) UI.toast('Despesa de mão de obra lançada (' + ids.length + ' lançamento' + (ids.length > 1 ? 's' : '') + ')');
    },
    t_custo(c, F) {
      const { esc, money } = UI; const s = this.st; const G = Views.relatorios.graf;
      const porObra = {}, porPessoa = []; F.forEach(p => { const fp = folhaPonto(p.id, s.mes); const ch = custoHora(p); let tot = 0; Object.entries(fp.porObra).forEach(([ob, mn]) => { const v = mn / 60 * ch; porObra[ob || ''] = porObra[ob || ''] || { h: 0, v: 0 }; porObra[ob || ''].h += mn; porObra[ob || ''].v += v; tot += v; }); if (fp.trab) porPessoa.push([p.nome, tot, fp.trab]); });
      const L = Object.entries(porObra).sort((a, b) => b[1].v - a[1].v);
      // 6 meses
      const meses = []; for (let i = 5; i >= 0; i--) meses.push(addMes(s.mes, -i));
      const serie = meses.map(mm => F.reduce((a, p) => a + folhaPonto(p.id, mm).trab / 60 * custoHora(p), 0));
      c.innerHTML = `<div class="grid g2"><div class="card"><div class="card-h"><h3>Custo da mão de obra por obra – ${Calc.mesLabel(s.mes)}</h3></div><div class="card-b">${G.donut(L.map(([ob, v]) => [ob ? ((Store.get('obras', ob) || {}).nome || ob).slice(0, 30) : 'Sem obra', v.v]), money, 'Custo') || UI.empty('Sem ponto lançado neste mês.', 'clock')}</div></div>
        <div class="card"><div class="card-h"><h3>Últimos 6 meses</h3></div><div class="card-b">${G.linha(meses.map(m => Calc.mesLabel(m).slice(0, 3)), [{ nome: 'Custo estimado da mão de obra', cor: '#dc2626', vals: serie }])}</div></div></div>
        <div class="grid g2 mt"><div class="card">${UI.table([{ h: 'Obra', f: x => x[0] ? UI.idLink(x[0]) + ' ' + esc((Store.get('obras', x[0]) || {}).nome || '') : 'Sem obra' }, { h: 'Horas', f: x => hm(x[1].h) }, { h: 'Custo', f: x => money(x[1].v) }], L, { emptyMsg: 'Sem horas no mês.' })}</div>
        <div class="card">${UI.table([{ h: 'Funcionário', f: x => esc(x[0]) }, { h: 'Horas', f: x => hm(x[2]) }, { h: 'Custo', f: x => money(x[1]) }], porPessoa.sort((a, b) => b[1] - a[1]), { emptyMsg: 'Sem horas no mês.' })}</div></div>
        <p class="tiny muted">Custo-hora: CLT = salário × (1 + encargos%) ÷ horas/mês; diarista = diária ÷ jornada.</p>`;
    },
    t_prov(c, F) {
      const { esc, money, date } = UI; const h = hoje(); const clt = F.filter(p => rhDe(p).vinculo === 'CLT');
      const L = clt.map(p => { const r = rhDe(p); const s = +r.salario || 0; const meses = r.admissao ? Math.max(0, Math.floor(UI.daysBetween(r.admissao, h) / 30.44)) : 0;
        const periodo = r.admissao ? Math.floor(meses / 12) : 0; const proxFerias = r.admissao ? (() => { const d = new Date(r.admissao + 'T12:00:00'); d.setFullYear(d.getFullYear() + periodo + 1); return d.toISOString().slice(0, 10); })() : '';
        const limite = proxFerias ? (() => { const d = new Date(proxFerias + 'T12:00:00'); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10); })() : '';
        const exp45 = r.admissao ? Fiscal.addDays(r.admissao, 44) : '', exp90 = r.admissao ? Fiscal.addDays(r.admissao, 89) : '';
        return { p, s, ferias: s / 12 * 4 / 3, dec: s / 12, fgts: s * 0.08 + (s / 12 * 4 / 3 + s / 12) * 0.08, meses, proxFerias, limite, exp: exp90 >= h ? (exp45 >= h ? 'experiência 1º prazo até ' + date(exp45) : 'experiência 2º prazo até ' + date(exp90)) : '' }; });
      const al = []; F.forEach(p => { const b = this.docsBadges(p); if (b) al.push([p, b]); });
      L.forEach(x => { if (x.exp) al.push([x.p, UI.badge(x.exp, 'info')]); if (x.limite && UI.daysBetween(h, x.limite) <= 60) al.push([x.p, UI.badge('férias devem ser tiradas até ' + date(x.limite), 'warn')]); });
      c.innerHTML = `<div class="grid g4 mb">${[['Provisão de férias + 1/3 (mês)', money(L.reduce((a, x) => a + x.ferias, 0))], ['Provisão de 13º (mês)', money(L.reduce((a, x) => a + x.dec, 0))], ['FGTS (mês, com provisões)', money(L.reduce((a, x) => a + x.fgts, 0))], ['Reservar por mês', money(L.reduce((a, x) => a + x.ferias + x.dec + x.fgts, 0))]].map(k => `<div class="card kpi"><div class="lbl">${k[0]}</div><div class="val">${k[1]}</div></div>`).join('')}</div>
        <div class="card mb"><div class="card-h"><h3>Alertas da equipe</h3></div><div class="card-b">${al.length ? al.map(([p, b]) => `<div class="row" style="justify-content:space-between;border-bottom:1px solid var(--line);padding:6px 0"><b>${esc(p.nome)}</b><span>${b}</span></div>`).join('') : '<span class="tiny" style="color:var(--ok)">Nada vencendo: ASO, NRs, EPI, experiência e férias em dia.</span>'}</div></div>
        <div class="card">${UI.table([{ h: 'Funcionário', f: x => esc(x.p.nome) }, { h: 'Salário', f: x => money(x.s) }, { h: 'Tempo de casa', f: x => x.meses + ' meses' }, { h: 'Próx. período de férias', f: x => date(x.proxFerias) }, { h: 'Férias + 1/3 /mês', f: x => money(x.ferias) }, { h: '13º /mês', f: x => money(x.dec) }, { h: 'FGTS /mês', f: x => money(x.fgts) }], L, { emptyMsg: 'Nenhum funcionário CLT.' })}</div>`;
    }
  };

  /* ---------- Bater ponto (qualquer pessoa logada) ---------- */
  Views.ponto = {
    st: { pessoa: '' },
    render(el) {
      const { esc, icon } = UI; const s = this.st; const adm = Auth.can('pessoas');
      const eu = minhaPessoa(); if (!s.pessoa) s.pessoa = eu || (adm ? (funcionarios()[0] || {}).id : '') || '';
      const p = Store.get('pessoas', s.pessoa);
      const hojeM = s.pessoa ? Store.where('ponto', x => x.pessoaId === s.pessoa && x.data === hoje()).sort((a, b) => a.hora.localeCompare(b.hora)) : [];
      const prox = TIPOS_PONTO[hojeM.length % 4];
      const ultObra = (Store.where('ponto', x => x.pessoaId === s.pessoa && x.obraId).sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora))[0] || {}).obraId || '';
      const fp = s.pessoa ? folhaPonto(s.pessoa, hoje().slice(0, 7)) : null;
      el.innerHTML = `<div class="page-head"><div><h1>Bater ponto</h1><p>${esc(Store.db.empresa.fantasia || Store.db.empresa.nome || '')}</p></div>${adm ? '<a class="btn" href="#/rh">Equipe e RH</a>' : ''}</div>
        <div class="grid g2"><div class="card"><div class="card-b" style="text-align:center">
          ${adm || !eu ? `<div class="field" style="text-align:left"><label>Funcionário</label><select class="select" id="ptP">${!s.pessoa ? '<option value=""></option>' : ''}${funcionarios().map(x => `<option value="${x.id}" ${x.id === s.pessoa ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</select></div>` : `<h3 style="margin:0">${esc(p ? p.nome : '')}</h3>`}
          ${!s.pessoa ? `<div class="alert warn mt">${icon('info')}<div>Seu login ainda não está ligado a um funcionário. Peça ao administrador para vincular em Configurações › Usuários › "Vincular à pessoa".</div></div>` : ''}
          <div id="ptRel" style="font-size:54px;font-weight:800;letter-spacing:-.02em;margin:14px 0 2px;font-variant-numeric:tabular-nums">${new Date().toTimeString().slice(0, 8)}</div><div class="muted">${UI.dateLong ? UI.dateLong(hoje()) : UI.date(hoje())}</div>
          <div class="field mt" style="text-align:left"><label>Obra</label><select class="select" id="ptO"><option value="">Escritório / sem obra</option>${Store.all('obras').filter(o => !['Concluída', 'Cancelada', 'Prospecção', 'Orçamento'].includes(o.status)).map(o => `<option value="${o.id}" ${o.id === ultObra ? 'selected' : ''}>${o.id} · ${esc(o.nome)}</option>`).join('')}</select></div>
          <div class="grid g2 mt">${TIPOS_PONTO.map(t => `<button class="btn ${t[0] === prox[0] ? 'primary' : ''}" style="padding:16px;font-size:15px;justify-content:center" data-bp="${t[0]}" ${!s.pessoa ? 'disabled' : ''}>${icon(t[0] === 'entrada' ? 'log-in' : t[0] === 'saida' ? 'log-out' : t[0] === 'intervalo' ? 'coffee' : 'undo-2')} ${t[1]}</button>`).join('')}</div>
          <label class="check mt" style="justify-content:center"><input type="checkbox" id="ptGeo" checked> Registrar a localização</label>
          ${Auth.current().papel !== 'admin' ? '<p class="tiny muted">A marcação vai para aprovação dos administradores.</p>' : ''}
        </div></div>
        <div class="stack"><div class="card"><div class="card-h"><h3>Hoje</h3></div><div class="card-b">${hojeM.length ? hojeM.map(m => `<div class="row" style="justify-content:space-between;border-bottom:1px solid var(--line);padding:6px 0"><b>${m.hora}</b><span>${esc((TIPOS_PONTO.find(t => t[0] === m.tipo) || [])[1] || m.tipo)}</span><span class="tiny muted">${m.obraId || ''}${m.lat ? ' 📍' : ''}</span></div>`).join('') : '<span class="muted">Nenhuma marcação hoje.</span>'}</div></div>
          ${fp ? `<div class="card"><div class="card-h"><h3>Meu mês</h3></div><div class="card-b"><div class="grid g3">${[['Trabalhado', hm(fp.trab)], ['Extras', hm(fp.h50 + fp.h100)], ['Dias', fp.diasTrab]].map(k => `<div><div class="tiny muted">${k[0]}</div><b style="font-size:20px">${k[1]}</b></div>`).join('')}</div></div></div>` : ''}</div></div>`;
      clearInterval(this._t); this._t = setInterval(() => { const r = document.getElementById('ptRel'); if (!r) return clearInterval(this._t); r.textContent = new Date().toTimeString().slice(0, 8); }, 1000);
      const sp = UI.$('#ptP', el); if (sp) sp.onchange = e => { s.pessoa = e.target.value; App.refresh(); };
      UI.$$('[data-bp]', el).forEach(b => b.onclick = async () => {
        b.disabled = true; const reg = { pessoaId: s.pessoa, data: hoje(), hora: new Date().toTimeString().slice(0, 5), tipo: b.dataset.bp, obraId: UI.$('#ptO', el).value, origem: 'app', por: (Auth.current() || {}).nome || '' };
        if (UI.$('#ptGeo', el).checked && navigator.geolocation) { try { const pos = await new Promise((ok, err) => navigator.geolocation.getCurrentPosition(ok, err, { timeout: 8000, maximumAge: 60000 })); reg.lat = +pos.coords.latitude.toFixed(6); reg.lng = +pos.coords.longitude.toFixed(6); reg.precisao = Math.round(pos.coords.accuracy); } catch (e) {} }
        Store.insert('ponto', reg); UI.toast(`Ponto registrado: ${reg.hora} – ${(TIPOS_PONTO.find(t => t[0] === reg.tipo) || [])[1]}`); App.refresh();
      });
    }
  };
})();
