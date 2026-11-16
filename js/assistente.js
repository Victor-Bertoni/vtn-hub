/* =========================================================
   ASSISTENTE DE PESQUISA (chat flutuante) – SEM IA, SEM CLAUDE, SEM INTERNET
   Entende perguntas em português por regras (palavras-chave + datas + nomes de obras,
   pessoas, categorias e materiais) e responde com os dados do próprio VTN Hub.
   Exemplos: "quanto gastei de cimento na obra 61 em outubro?", "quanto falta receber do
   Jeferson?", "contas a pagar essa semana", "telefone do Ronald", "como está a obra 64?",
   "onde está o alvará da obra 76?", "pendências do Ismael", "horas do João em novembro",
   "INCC 12 meses", "saldo do caixa", "maiores fornecedores este ano".
   Respeita as permissões: valores financeiros só para quem pode ver o financeiro.
   ========================================================= */
(() => {
  const N = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9.,/\- ]/g, ' ').replace(/\s+/g, ' ').trim();
  const STOP = new Set('a o as os de da do das dos e em no na nos nas um uma uns umas para pra por com sem que qual quais quanto quanta quantos quantas quem onde como esta estao esse essa este isso isto meu minha me mim eu voce ja ainda tem tenho foi foram sao ser ver mostrar mostra lista listar me fala diga sobre ate desde entre total valor valores r$ reais mes ano dia dias semana hoje ontem amanha obra obras pessoa cliente'.split(' '));
  const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const hoje = () => UI.today();
  const addD = (d, n) => Fiscal.addDays(d, n);
  const ultimoDia = ym => { const [a, m] = ym.split('-').map(Number); return ym + '-' + String(new Date(a, m, 0).getDate()).padStart(2, '0'); };
  const podeFin = () => Auth.can('financeiro.ver');
  const { esc } = UI;
  const money = v => UI.money(v);

  /* ---------- entendimento ---------- */
  function periodo(t) {
    const h = hoje(), y = +h.slice(0, 4), ym = h.slice(0, 7);
    let m;
    if (/\bhoje\b/.test(t)) return { de: h, ate: h, txt: 'hoje' };
    if (/\bontem\b/.test(t)) return { de: addD(h, -1), ate: addD(h, -1), txt: 'ontem' };
    if (/\bamanha\b/.test(t)) return { de: addD(h, 1), ate: addD(h, 1), txt: 'amanhã', futuro: true };
    if (/semana passada/.test(t)) { const w = new Date(h + 'T12:00:00').getDay(); const ini = addD(h, -w - 7); return { de: ini, ate: addD(ini, 6), txt: 'semana passada' }; }
    if (/(essa|esta|nessa|nesta) semana|da semana/.test(t)) { const w = new Date(h + 'T12:00:00').getDay(); return { de: addD(h, -w), ate: addD(h, 6 - w), txt: 'esta semana' }; }
    if (/proxim[oa]s? (\d+) dias/.test(t)) { m = t.match(/proxim[oa]s? (\d+) dias/); return { de: h, ate: addD(h, +m[1]), txt: 'próximos ' + m[1] + ' dias', futuro: true }; }
    if ((m = t.match(/ultim[oa]s? (\d+) (dias|meses|mes)/))) { const n = +m[1]; return m[2] === 'dias' ? { de: addD(h, -n), ate: h, txt: 'últimos ' + n + ' dias' } : { de: Enq.addM(ym, -n + 1) + '-01', ate: h, txt: 'últimos ' + n + ' meses' }; }
    if (/mes passado/.test(t)) { const p = Enq.addM(ym, -1); return { de: p + '-01', ate: ultimoDia(p), txt: Calc.mesLabel(p) }; }
    if (/(esse|este|nesse|neste|deste|desse) mes|no mes\b|do mes\b/.test(t)) return { de: ym + '-01', ate: ultimoDia(ym), txt: Calc.mesLabel(ym) };
    if (/ano passado/.test(t)) return { de: (y - 1) + '-01-01', ate: (y - 1) + '-12-31', txt: String(y - 1) };
    if (/(esse|este|nesse|neste|deste|desse) ano|no ano\b|do ano\b/.test(t)) return { de: y + '-01-01', ate: y + '-12-31', txt: String(y) };
    for (let i = 0; i < 12; i++) { const r = new RegExp('\\b(' + MESES[i] + '|' + MESES[i].slice(0, 3) + ')\\b(?:\\s*(?:de|/)?\\s*(20\\d\\d))?'); if ((m = t.match(r))) { const a = m[2] ? +m[2] : (i + 1 > +ym.slice(5) ? y - 1 : y); const mm = a + '-' + String(i + 1).padStart(2, '0'); return { de: mm + '-01', ate: ultimoDia(mm), txt: Calc.mesLabel(mm) }; } }
    if ((m = t.match(/\b(20\d\d)\b/))) return { de: m[1] + '-01-01', ate: m[1] + '-12-31', txt: m[1] };
    if ((m = t.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s*(?:a|ate|-)\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/))) { const yy = v => v ? (v.length === 2 ? '20' + v : v) : String(y); const d1 = yy(m[3]) + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0'), d2 = yy(m[6]) + '-' + m[5].padStart(2, '0') + '-' + m[4].padStart(2, '0'); return { de: d1, ate: d2, txt: UI.date(d1) + ' a ' + UI.date(d2) }; }
    return null;
  }
  function acharObra(t) {
    let m = t.match(/\bob-?0*(\d{1,4})\b/) || t.match(/\bobra\s*(?:n[ºo.]?\s*)?0*(\d{1,4})\b/);
    if (m) { const id = 'OB-' + m[1].padStart(4, '0'); const o = Store.get('obras', id) || Store.all('obras').find(x => String(x.numero || '') === m[1] || (x.pasta || '').startsWith(m[1].padStart(2, '0') + ' ')); if (o) return o; }
    const pal = t.split(' ').filter(w => w.length >= 4 && !STOP.has(w));
    let best = null, bs = 0;
    Store.all('obras').forEach(o => { const nome = N(o.nome + ' ' + (o.cidade || '')); const s = pal.filter(w => nome.split(' ').includes(w)).length; if (s > bs) { bs = s; best = o; } });
    return bs ? best : null;
  }
  function acharPessoa(t, excluir) {
    const pal = t.split(' ').filter(w => w.length >= 3 && !STOP.has(w) && !(excluir || []).includes(w));
    let best = null, bs = 0;
    Store.all('pessoas').forEach(p => { const nm = N(p.nome).split(' '); const s = pal.filter(w => nm.includes(w)).length * 2 + (nm[0] && pal.includes(nm[0]) ? 1 : 0); if (s > bs) { bs = s; best = p; } });
    return bs >= 2 ? best : null;
  }
  function acharCategoria(t) { const L = (LISTAS.catDespesa || []).concat(LISTAS.catReceita || []); const pal = ' ' + t + ' '; return L.find(c => { const w = N(c).split(/[ /()]+/).filter(x => x.length >= 3 && !STOP.has(x)); return w.length && w.every(x => pal.includes(' ' + x)); }) || null; }
  // termo livre (material, serviço): palavras que sobraram
  function termos(t, usados) { return [...new Set(t.split(' '))].filter(w => w.length >= 4 && !STOP.has(w) && !usados.some(u => u.includes(w)) && !/^\d+$/.test(w) && !MESES.includes(w) && !/^(venc|atras|pag|receb|gast|cont|pend|lucr|marg|resul|fatur|deve|essa|esta|nessa|nesta|dess|dest|proxim|ultim|passad|quant|quan|mostr|list|todo|toda|cade|onde)/.test(w)
    && !['gastei', 'gasto', 'gastos', 'paguei', 'pago', 'pagar', 'pagos', 'recebi', 'receber', 'recebido', 'recebidos', 'despesa', 'despesas', 'receita', 'receitas', 'conta', 'contas', 'falta', 'faltam', 'devendo', 'deve', 'vencer', 'vencido', 'vencidos', 'vencendo', 'vence', 'quanto', 'passado', 'passada', 'proximo', 'proxima', 'proximos', 'ultimos', 'ultimo', 'semana', 'comprei', 'compras', 'compra', 'custo', 'custou', 'saiu', 'entrou', 'faturei', 'faturamento', 'empresa', 'geral', 'todas', 'todos', 'aberto', 'abertas', 'abertos', 'telefone', 'contato', 'email', 'whatsapp', 'endereco', 'status', 'andamento', 'avanco', 'fisico', 'pendencias', 'pendencia', 'arquivo', 'arquivos', 'documento', 'documentos'].includes(w)); }

  /* ---------- respostas ---------- */
  const lnk = id => UI.idLink(id);
  const tabela = (h, rows) => rows.length ? `<table class="as-t"><thead><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '';
  const filtroTxt = (o, p, per, extra) => [o ? 'obra ' + esc(o.nome) : '', p ? esc(p.nome) : '', extra || '', per ? per.txt : ''].filter(Boolean).join(' · ');
  function lancs(tipo, { o, p, per, cat, termo, status }) {
    return Store.where('lancamentos', l => l.tipo === tipo && (!status || (status === 'pago' ? l.status === 'pago' : l.status !== 'pago')) && (!o || l.obraId === o.id) && (!p || l.pessoaId === p.id) && (!cat || l.categoria === cat)
      && (!termo.length || termo.every(w => N(l.descricao + ' ' + l.categoria + ' ' + (l.obs || '')).includes(w)))
      && (!per || (() => { const d = status === 'pago' ? (l.dataPagamento || l.data || '') : (l.vencimento || l.data || ''); return d >= per.de && d <= per.ate; })()));
  }
  function respFin(tipo, status, ctx) {
    if (!podeFin()) return 'Você não tem permissão para ver valores financeiros.';
    const L = lancs(tipo, Object.assign({ status }, ctx)).sort((a, b) => b.valor - a.valor); const tot = L.reduce((a, l) => a + (+l.valor || 0), 0);
    const nome = tipo === 'despesa' ? (status === 'pago' ? 'Gasto' : 'A pagar') : (status === 'pago' ? 'Recebido' : 'A receber');
    const venc = status !== 'pago' ? L.filter(l => (l.vencimento || '') < hoje()).reduce((a, l) => a + l.valor, 0) : 0;
    const f = filtroTxt(ctx.o, ctx.p, ctx.per, [ctx.cat, ctx.termo.join(' ')].filter(Boolean).join(' '));
    if (!L.length) return `${nome}: <b>${money(0)}</b>${f ? ' (' + f + ')' : ''}. Não achei lançamentos com esse filtro.`;
    const grp = {}; L.forEach(l => { const k = ctx.o ? l.categoria : ((Store.get('obras', l.obraId) || {}).nome || 'Geral'); grp[k] = (grp[k] || 0) + l.valor; });
    const top = Object.entries(grp).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return `<div class="as-big">${money(tot)}</div><div class="tiny muted">${nome}${f ? ' · ' + f : ''} · ${L.length} lançamento(s)${venc ? ` · <b style="color:var(--err)">vencido ${money(venc)}</b>` : ''}</div>
      ${top.length > 1 ? `<div class="mt tiny"><b>Por ${ctx.o ? 'categoria' : 'obra'}:</b> ${top.map(x => esc(x[0]) + ' ' + money(x[1])).join(' · ')}</div>` : ''}
      ${tabela(['', 'Data', 'Descrição', 'Valor'], L.slice(0, 8).map(l => [lnk(l.id), UI.date(status === 'pago' ? (l.dataPagamento || l.data) : l.vencimento), esc(l.descricao), money(l.valor)]))}${L.length > 8 ? `<div class="tiny muted">… e mais ${L.length - 8}. <a href="#/financeiro">Abrir o Caixa</a></div>` : ''}`;
  }
  function respObra(o) {
    const m = Calc.obra(o); const pend = Store.where('pendencias', p => p.obraId === o.id && p.status !== 'Resolvida');
    const meds = Store.where('medicoes', x => x.obraId === o.id).sort((a, b) => (a.data || '').localeCompare(b.data || '')); const u = meds[meds.length - 1];
    return `<b class="plink" data-goto="${o.id}">${esc(o.nome)}</b> <span class="tiny muted">${o.id} · ${esc(o.status)}</span>
      <div class="as-grid"><div><span>Avanço físico</span><b>${UI.pct(m.fisico, 0)}</b>${m.previsto != null ? `<small>previsto ${UI.pct(m.previsto, 0)}</small>` : ''}</div>
      ${podeFin() ? `<div><span>Contrato</span><b>${UI.moneyK(o.valorContrato)}</b><small>recebido ${UI.pct(m.financeiroPct, 0)}</small></div><div><span>Lucro</span><b>${UI.moneyK(m.fin.lucro)}</b><small>margem ${UI.pct(m.fin.margem, 0)}</small></div>` : ''}
      <div><span>Pendências</span><b>${pend.length}</b><small>${m.prazo.atraso > 0 ? m.prazo.atraso + ' dias de atraso' : 'no prazo'}</small></div></div>
      ${u ? `<div class="tiny">Última medição: ${esc(u.numero || '')} em ${UI.date(u.data)} · acumulado ${UI.pct(+u.acumulado || 0, 1)}${u.situacao ? ' · ' + esc(u.situacao) : ''}</div>` : ''}
      ${pend.slice(0, 4).map(p => `<div class="tiny">• ${lnk(p.id)} ${esc(p.titulo)}${p.prazo ? ' – ' + UI.date(p.prazo) : ''}</div>`).join('')}`;
  }
  function respPessoa(p, t) {
    const fin = podeFin(); const L = Store.where('lancamentos', l => l.pessoaId === p.id); const obras = Store.where('obras', o => (o.clienteIds || []).includes(p.id));
    const rec = L.filter(l => l.tipo === 'receita'), des = L.filter(l => l.tipo === 'despesa');
    return `<b class="plink" data-goto="${p.id}">${esc(p.nome)}</b> <span class="tiny muted">${p.id} · ${esc(p.tipo || '')}</span>
      <div class="tiny mt">${p.telefone ? `📞 <a href="tel:${esc(p.telefone)}">${esc(p.telefone)}</a> · <a href="https://wa.me/55${String(p.telefone).replace(/\D/g, '').replace(/^55/, '')}" target="_blank" rel="noopener">WhatsApp</a>` : 'sem telefone'}${p.email ? ` · ✉️ <a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : ''}</div>
      ${/cpf|cnpj|document/.test(t) && p.cpf ? `<div class="tiny">CPF/CNPJ: ${esc(p.cpf)}</div>` : ''}${p.endereco && /endereco|mora|onde fica/.test(t) ? `<div class="tiny">${esc(p.endereco)}</div>` : ''}
      ${obras.length ? `<div class="tiny mt">Obras: ${obras.map(o => lnk(o.id) + ' ' + esc(o.nome)).join(', ')}</div>` : ''}
      ${fin && rec.length ? `<div class="tiny">Pagou ${money(rec.filter(l => l.status === 'pago').reduce((a, l) => a + l.valor, 0))} · <b>falta receber ${money(rec.filter(l => l.status !== 'pago').reduce((a, l) => a + l.valor, 0))}</b></div>` : ''}
      ${fin && des.length ? `<div class="tiny">Recebeu da VTN ${money(des.filter(l => l.status === 'pago').reduce((a, l) => a + l.valor, 0))} · a pagar ${money(des.filter(l => l.status !== 'pago').reduce((a, l) => a + l.valor, 0))}</div>` : ''}`;
  }
  function respArquivos(t, o) {
    const pal = [...new Set(termos(t, o ? [N(o.nome)] : []).concat(t.match(/\b(art|alvara|nf|pci|pls|cno|rrt|habite)\b/g) || []))];
    const A = Store.where('arquivos', a => (!o || a.obraId === o.id) && (!pal.length || pal.every(w => N(a.nome + ' ' + (a.pasta || '') + ' ' + (a.caminho || '') + ' ' + (a.tipoDoc || '')).includes(w)))).sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    if (!A.length) return `Não achei arquivos${pal.length ? ' com "' + esc(pal.join(' ')) + '"' : ''}${o ? ' na obra ' + esc(o.nome) : ''}.`;
    return `${A.length} arquivo(s)${o ? ' na obra ' + esc(o.nome) : ''}:${tabela(['', 'Arquivo', 'Pasta'], A.slice(0, 10).map(a => [lnk(a.id), esc(a.nome), `<span class="tiny muted">${esc((a.caminho || a.pasta || '').split(/[\\/]/).slice(-3, -1).join(' › '))}</span>`]))}`;
  }
  function respPend(o, p, per) {
    const P = Store.where('pendencias', x => x.status !== 'Resolvida' && (!o || x.obraId === o.id) && (!p || x.responsavelId === p.id) && (!per || !x.prazo || (x.prazo >= per.de && x.prazo <= per.ate)));
    const atr = P.filter(x => x.prazo && x.prazo < hoje());
    return `<b>${P.length}</b> pendência(s) abertas${filtroTxt(o, p, per) ? ' · ' + filtroTxt(o, p, per) : ''}${atr.length ? ` · <b style="color:var(--err)">${atr.length} atrasadas</b>` : ''}${tabela(['', 'Pendência', 'Prazo'], P.sort((a, b) => (a.prazo || '9').localeCompare(b.prazo || '9')).slice(0, 10).map(x => [lnk(x.id), esc(x.titulo), UI.date(x.prazo)]))}`;
  }
  function respAgenda(per) {
    const de = per ? per.de : hoje(), ate = per ? per.ate : addD(hoje(), 7); let it = []; try { it = Views.agenda.itens(de, ate); } catch (e) {}
    return it.length ? `Agenda ${UI.date(de)} a ${UI.date(ate)}:${tabela(['Data', 'O quê', 'Obra'], it.slice(0, 15).map(i => [UI.date(i.data) + (i.hora ? ' ' + i.hora : ''), esc(i.titulo), i.obraId ? lnk(i.obraId) : '']))}` : `Nada na agenda de ${UI.date(de)} a ${UI.date(ate)}.`;
  }
  function respCaixa() {
    if (!podeFin()) return 'Você não tem permissão para ver o caixa.';
    const k = Views.financeiro.indiceCaixa(null);
    return `<div class="as-big">${money(k.saldo)}</div><div class="tiny muted">saldo em caixa hoje</div><div class="as-grid"><div><span>Pagar em 30 dias</span><b>${UI.moneyK(k.pagar30)}</b></div><div><span>Receber em 30 dias</span><b>${UI.moneyK(k.receber30)}</b></div><div><span>Menor saldo (90 d)</span><b>${UI.moneyK(k.minimo[1])}</b><small>${UI.date(k.minimo[0])}</small></div><div><span>Fôlego</span><b>${k.folego == null ? '—' : UI.num(Math.round(k.folego * 10) / 10) + ' meses'}</b></div></div><a href="#/gastos">Abrir o painel de caixa</a>`;
  }
  function respIndice(t) {
    const I = window.Indices; if (!I || !I.dados) { I && I.atualizar(false); return 'Buscando os índices no Banco Central… pergunte de novo em alguns segundos.'; }
    const k = /incc ?m\b/.test(t) ? 'inccm' : /incc/.test(t) ? 'inccdi' : /ipca/.test(t) ? 'ipca' : /igp/.test(t) ? 'igpm' : /inpc/.test(t) ? 'inpc' : /selic/.test(t) ? 'selic' : /salario minimo/.test(t) ? 'salmin' : /cub/.test(t) ? 'cub' : 'inccdi';
    if (k === 'cub') { const H = I.cubHist(); const u = H[H.length - 1]; return u ? `CUB/m² R8-N Sinduscon-MG ${Calc.mesLabel(u[0])}: <b>${money(u[1])}</b>${H.length > 12 ? ' · 12 meses ' + UI.pct((u[1] / H[H.length - 13][1] - 1) * 100, 2) : ''}` : 'CUB ainda não carregado.'; }
    const u = I.ultimo(k); const nome = I.SERIES[k][1]; if (!u) return 'Sem dados de ' + nome + '.';
    if (k === 'salmin') return `${nome}: <b>${money(u[1])}</b> (${Calc.mesLabel(u[0])})`;
    if (k === 'selic') return `${nome}: <b>${UI.pct(u[1], 2)}</b> ao ano`;
    const a12 = I.acumulado(k, Enq.addM(u[0], -12)), aa = I.acumulado(k, (+u[0].slice(0, 4) - 1) + '-12');
    return `${nome} – ${Calc.mesLabel(u[0])}: <b>${UI.pct(u[1], 2)}</b> no mês · 12 meses <b>${a12 ? UI.pct(a12.pct, 2) : '—'}</b> · no ano ${aa ? UI.pct(aa.pct, 2) : '—'} <div class="tiny muted">Fonte: Banco Central (SGS)</div>`;
  }
  function respPonto(p, per) {
    if (!Views.rh) return 'Módulo de RH indisponível.';
    const ym = per ? per.de.slice(0, 7) : hoje().slice(0, 7); const M = Store.where('ponto', x => x.pessoaId === p.id && (x.data || '').startsWith(ym));
    const dias = [...new Set(M.map(x => x.data))].length;
    return `${esc(p.nome)} – ${Calc.mesLabel(ym)}: <b>${dias} dias</b> com ponto, ${M.length} marcações. <a href="#/rh">Abrir a folha de ponto</a>`;
  }
  function respObras(t) {
    const O = Store.all('obras'); const st = {}; O.forEach(o => st[o.status] = (st[o.status] || 0) + 1);
    const alvo = Object.keys(st).find(s => t.includes(N(s)));
    const L = alvo ? O.filter(o => o.status === alvo) : O.filter(o => ['Contratada', 'Em execução', 'Em entrega'].includes(o.status));
    return `${Object.entries(st).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${esc(k)}: <b>${v}</b>`).join(' · ')}${tabela(['', 'Obra', 'Status'], L.slice(0, 12).map(o => [lnk(o.id), esc(o.nome), esc(o.status)]))}`;
  }
  function respTop(tipo, per) {
    if (!podeFin()) return 'Você não tem permissão para ver valores financeiros.';
    const L = Store.where('lancamentos', l => l.tipo === tipo && l.status === 'pago' && l.pessoaId && (!per || ((l.dataPagamento || l.data || '') >= per.de && (l.dataPagamento || l.data || '') <= per.ate)));
    const g = {}; L.forEach(l => g[l.pessoaId] = (g[l.pessoaId] || 0) + l.valor);
    return `${tipo === 'despesa' ? 'Maiores fornecedores' : 'Clientes que mais pagaram'}${per ? ' · ' + per.txt : ''}:${tabela(['Nome', 'Valor'], Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, v]) => [UI.pessoa(id), money(v)]))}`;
  }
  // busca geral (o que não casar com nenhuma pergunta conhecida)
  const PAGINAS = (() => { try { return [['holerite folha pagamento salario', 'rh', 'Equipe e RH'], ['ponto bater', 'ponto', 'Bater ponto'], ['nota fiscal nf xml', 'notas', 'Notas fiscais'], ['fornecedor', 'fornecedores', 'Fornecedores'], ['gasto caixa grafico', 'gastos', 'Gastos e painel de caixa'], ['vistoria checklist', 'vistorias', 'Vistorias'], ['cronograma curva', 'cronograma', 'Cronograma físico-financeiro'], ['reajuste incc indice', 'reajuste', 'Reajuste de contrato'], ['relatorio', 'relatorios', 'Central de relatórios'], ['orcamento', 'orcamentos', 'Orçamentos'], ['contrato recibo termo', 'contratos', 'Contratos'], ['proposta', 'propostas', 'Propostas'], ['pci pls caixa', 'caixa', 'PCI e PLS CAIXA'], ['imposto das simples', 'impostos', 'Impostos'], ['compra cotacao', 'compras', 'Compras e cotações'], ['servidor', 'config', 'Configurações › Servidores']]; } catch (e) { return []; } })();
  function buscaGeral(t) {
    const pal = t.split(' ').filter(w => w.length >= 3 && !STOP.has(w)); if (!pal.length) return null;
    const res = [];
    const add = (c, label, sub) => Store.all(c).forEach(x => { const txt = N(x.id + ' ' + label(x) + ' ' + (sub(x) || '')); const s = pal.filter(w => txt.includes(w)).length; if (s) res.push([s / pal.length, x.id, label(x), sub(x)]); });
    add('obras', x => x.nome, x => x.status + ' ' + (x.cidade || '')); add('pessoas', x => x.nome, x => x.tipo); add('pendencias', x => x.titulo, x => x.status); add('os', x => x.titulo, x => x.status);
    add('orcamentos', x => x.titulo || '', x => x.status); add('contratos', x => x.titulo || '', x => x.status); add('compras', x => x.titulo || '', x => x.status); add('arquivos', x => x.nome, x => x.pasta || '');
    if (podeFin()) add('lancamentos', x => x.descricao, x => x.categoria + ' ' + UI.money(x.valor));
    res.sort((a, b) => b[0] - a[0]); const pag = PAGINAS.filter(p => pal.some(w => p[0].includes(w)));
    if (!res.length && !pag.length) return null;
    return `${pag.length ? `<div class="tiny">Páginas: ${pag.map(p => `<a href="#/${p[1]}">${esc(p[2])}</a>`).join(' · ')}</div>` : ''}${res.length ? `Encontrei ${res.length} resultado(s):${tabela(['', 'Nome', ''], res.slice(0, 12).map(r => [lnk(r[1]), esc(r[2]), `<span class="tiny muted">${esc(r[3] || '')}</span>`]))}` : ''}`;
  }
  const AJUDA = `Pergunte com as suas palavras. Exemplos:<ul class="tiny" style="margin:6px 0;padding-left:18px">
    <li>quanto gastei de cimento na obra 61 em outubro?</li><li>quanto falta receber do Jeferson?</li><li>contas a pagar essa semana</li><li>saldo do caixa</li>
    <li>como está a obra 64?</li><li>telefone do Ronald</li><li>onde está o alvará da obra 76?</li><li>pendências atrasadas</li><li>agenda de amanhã</li><li>INCC 12 meses · CUB · salário mínimo</li><li>maiores fornecedores este ano</li><li>obras em execução</li></ul>Funciona sem internet e sem IA: usa só os dados do VTN Hub.`;

  function responder(q) {
    const t = N(q); if (!t) return AJUDA;
    if (/^(ajuda|help|oi|ola|bom dia|boa tarde|boa noite|o que voce faz|como usar)\b/.test(t)) return AJUDA;
    const per = periodo(t); let o = acharObra(t); let p = acharPessoa(t, []);
    // o mesmo nome pode ser obra e pessoa ("Jeferson"): sem a palavra "obra", vale a pessoa
    if (o && p && !/\bobra\b|\bob-?\d/.test(t)) o = null; else if (o && p && N(o.nome).split(' ').some(w => N(p.nome).split(' ')[0] === w)) p = null;
    const cat = acharCategoria(t);
    const usados = [o ? N(o.nome) : '', p ? N(p.nome) : '', cat ? N(cat) : ''];
    const termo = termos(t, usados.filter(Boolean)).filter(w => !(per && N(per.txt).includes(w)));
    const ctx = { o, p, per, cat, termo };
    if (/\b(incc|ipca|igp|inpc|selic|cub|salario minimo|indice)\b/.test(t)) return respIndice(t);
    if (/\b(saldo|caixa|quanto tenho|dinheiro em caixa)\b/.test(t) && !/(gast|pag|receb)/.test(t)) return respCaixa();
    if (/(maiores|maior|top|quem mais|ranking).*(fornecedor|gasto|compra)/.test(t)) return respTop('despesa', per);
    if (/(maiores|maior|top|quem mais|ranking).*(cliente|pagou|receita)/.test(t)) return respTop('receita', per);
    if (/(a pagar|pagar|vence|vencendo|vencid|boleto|conta)/.test(t) && !/(paguei|pago\b|gastei)/.test(t)) return respFin('despesa', 'aberto', Object.assign({}, ctx, { per: per || (/(vencid|atrasad)/.test(t) ? { de: '2000-01-01', ate: addD(hoje(), -1), txt: 'vencidas' } : null) }));
    if (/(a receber|receber|falta receber|deve|devendo|em aberto|atrasad)/.test(t) && /(receb|deve|devendo|cliente|parcela)/.test(t)) return respFin('receita', 'aberto', ctx);
    if (/(gast|paguei|pago\b|despesa|custo|custou|comprei|compra|saiu)/.test(t)) return respFin('despesa', 'pago', ctx);
    if (/(recebi|recebido|receita|entrou|faturei|faturamento|faturou)/.test(t)) return respFin('receita', 'pago', ctx);
    if (/(lucro|margem|resultado)/.test(t)) { if (!podeFin()) return 'Sem permissão para ver o financeiro.'; const f = Calc.fin(o ? o.id : null, per ? { de: per.de, ate: per.ate } : {}); return `Lucro${filtroTxt(o, null, per) ? ' · ' + filtroTxt(o, null, per) : ''}: <div class="as-big">${money(f.lucro)}</div><div class="tiny">recebido ${money(f.receitaPaga)} · gasto ${money(f.despesaPaga)} · margem ${UI.pct(f.margem, 1)}</div>`; }
    if (/(pendenc|pendente|problema)/.test(t)) return respPend(o, p, per);
    if (/(ponto|horas|hora extra|trabalhou|faltou|falta[s]? do)/.test(t) && p) return respPonto(p, per);
    if (/(agenda|compromisso|reuniao|visita|vistoria marcada)/.test(t)) return respAgenda(per);
    if (/(arquivo|documento|pdf|planta|projeto|alvara|\bart\b|\bnf\b|nota fiscal|onde esta|cadê|cade)/.test(t) && !/(quanto|valor)/.test(t)) return respArquivos(t, o);
    if (/(quantas obras|obras em|lista de obras|obras ativas|obras concluidas|obras paradas|obras)/.test(t) && !o) return respObras(t);
    if (o && (/(como esta|status|andamento|avanco|fisico|situacao|medicao|pls|resumo)/.test(t) || !p)) return respObra(o);
    if (p) return respPessoa(p, t);
    return buscaGeral(t) || 'Não entendi. ' + AJUDA;
  }

  /* ---------- janela flutuante ---------- */
  const HIST = 'vtn_assist_hist';
  let hist = []; try { hist = JSON.parse(sessionStorage.getItem(HIST) || '[]'); } catch (e) {}
  function montar() {
    if (document.getElementById('asBtn') || !window.Store || !Store.db) return;
    const b = document.createElement('button'); b.id = 'asBtn'; b.className = 'as-btn'; b.title = 'Pesquisar (Ctrl + K)'; b.innerHTML = UI.icon('message-circle-question') + '<span>Perguntar</span>';
    const p = document.createElement('div'); p.id = 'asPainel'; p.className = 'as-painel';
    p.innerHTML = `<div class="as-h"><b>${UI.icon('sparkles')} Pesquisa VTN</b><span class="tiny muted">sem IA · dados do app</span><button class="btn ghost icon sm" id="asLimpa" title="Limpar">${UI.icon('eraser')}</button><button class="btn ghost icon sm" id="asFecha">${UI.icon('x')}</button></div>
      <div class="as-msgs" id="asMsgs"></div>
      <div class="as-sug" id="asSug">${['saldo do caixa', 'contas a pagar essa semana', 'pendências atrasadas', 'obras em execução', 'INCC 12 meses', 'agenda de amanhã'].map(s => `<button class="chip" data-s="${s}">${s}</button>`).join('')}</div>
      <form class="as-f" id="asF"><input class="input" id="asQ" placeholder="Pergunte… ex.: quanto gastei na obra 61 este mês?" autocomplete="off">${('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) ? `<button type="button" class="btn icon" id="asMic" title="Falar">${UI.icon('mic')}</button>` : ''}<button class="btn primary icon">${UI.icon('send')}</button></form>`;
    document.body.appendChild(b); document.body.appendChild(p); UI.icons();
    const msgs = p.querySelector('#asMsgs'), q = p.querySelector('#asQ');
    const pinta = () => { msgs.innerHTML = hist.length ? hist.map(h => `<div class="as-eu">${esc(h.q)}</div><div class="as-ele">${h.r}</div>`).join('') : `<div class="as-ele">${AJUDA}</div>`; msgs.scrollTop = msgs.scrollHeight; UI.icons(); };
    const perguntar = txt => { txt = (txt || '').trim(); if (!txt) return; let r; try { r = responder(txt); } catch (e) { console.error(e); r = 'Não consegui responder isso: ' + esc(e.message); } hist.push({ q: txt, r }); hist = hist.slice(-30); try { sessionStorage.setItem(HIST, JSON.stringify(hist)); } catch (e) {} pinta(); q.value = ''; };
    const abre = v => { p.classList.toggle('open', v); b.classList.toggle('hide', v); if (v) { pinta(); setTimeout(() => q.focus(), 50); } };
    b.onclick = () => abre(true); p.querySelector('#asFecha').onclick = () => abre(false);
    p.querySelector('#asLimpa').onclick = () => { hist = []; try { sessionStorage.removeItem(HIST); } catch (e) {} pinta(); };
    p.querySelector('#asF').onsubmit = e => { e.preventDefault(); perguntar(q.value); };
    p.querySelectorAll('[data-s]').forEach(c => c.onclick = () => perguntar(c.dataset.s));
    msgs.addEventListener('click', e => { if (e.target.closest('a[href^="#/"], [data-goto]') && window.innerWidth < 700) abre(false); });
    const mic = p.querySelector('#asMic'); if (mic) mic.onclick = () => { const R = window.SpeechRecognition || window.webkitSpeechRecognition; const r = new R(); r.lang = 'pt-BR'; r.onresult = ev => perguntar(ev.results[0][0].transcript); r.onerror = () => UI.toast('Não consegui ouvir', 'err'); mic.classList.add('primary'); r.onend = () => mic.classList.remove('primary'); r.start(); };
    document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); abre(!p.classList.contains('open')); } if (e.key === 'Escape' && p.classList.contains('open')) abre(false); });
  }
  document.addEventListener('vtn:pronto', () => setTimeout(montar, 500));
  window.Assistente = { responder, montar };
})();
