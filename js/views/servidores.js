/* =========================================================
   VTN HUB – SERVIDORES (principal e reservas)
   • Selo no topo: qual computador está servindo e se está tudo bem.
   • Card em Configurações: lista dos computadores servidores (estado gravado por cada um em
     BANCO DE DADOS\sistema\servidores\<computador>.json), ordem de prioridade e quem pode ser servidor
     (sistema\servidores.json). O primeiro da lista é o principal; os outros assumem se ele sumir.
   ========================================================= */
window.Servidores = {
  lista: [], cfg: null, lidoEm: 0,
  P() { return window.VTN_PASTA; },
  async ler(forcar) {
    const P = this.P(); if (!P || !P.servidor) return;
    if (!forcar && Date.now() - this.lidoEm < 30000) return;
    try {
      const l = await P.get('lista?p=' + encodeURIComponent('sistema/servidores'));
      const ids = (l.itens || []).map(x => x.id).filter(id => id && id[0] !== '_');
      this.lista = (await Promise.all(ids.map(id => P.get('doc?p=' + encodeURIComponent('sistema/servidores') + '&id=' + encodeURIComponent(id)).catch(() => null)))).filter(Boolean);
      this.cfg = await P.get('doc?p=sistema&id=servidores').catch(() => null);
      this.lidoEm = Date.now();
    } catch (e) {}
  },
  // fila igual à do servidor: ordem escolhida, depois quem entrou primeiro
  fila() {
    const fora = (this.cfg && this.cfg.desligados) || [], f = [];
    ((this.cfg && this.cfg.ordem) || []).forEach(x => { if (x && !f.includes(x)) f.push(x); });
    this.lista.slice().sort((a, b) => String(a.registradoEm).localeCompare(String(b.registradoEm))).forEach(s => { if (!f.includes(s.pc)) f.push(s.pc); });
    return { ordem: f, fora };
  },
  min(iso) { return iso ? (Date.now() - new Date(iso).getTime()) / 60000 : 1e9; },
  chip() {
    const el = document.getElementById('srvChip'), P = this.P(); if (!el || !P) return;
    if (P.copia) { el.style.display = ''; el.innerHTML = '● Modo consulta'; el.style.background = '#fef3c7'; el.style.color = '#92400e'; el.title = 'Servidor fora do ar: ' + P.situacao().txt.replace(/<[^>]+>/g, ''); return; }
    if (!P.servidor) { el.style.display = 'none'; return; }
    const i = P.infoServidor || {}, e = P.endereco || {};
    const remoto = !!P.base; el.style.display = '';
    el.innerHTML = `● ${UI.esc(i.pc || e.pc || 'Servidor')}`;
    el.style.background = '#dcfce7'; el.style.color = '#166534';
    el.title = `Servidor ativo: ${i.pc || e.pc || '?'}${i.desde ? ' · ligado ' + P.haQuanto(i.desde) : ''}${remoto ? ' · pela internet' : ' · neste computador'}${e.onedrive === false ? ' · ATENÇÃO: OneDrive parado nesse computador' : ''}${e.tomada === false ? ' · na bateria' : ''}`;
    if (e.onedrive === false || e.tomada === false) { el.style.background = '#fef3c7'; el.style.color = '#92400e'; el.innerHTML += ' ⚠'; }
  },
  iniciarChip() { const go = async () => { try { const P = this.P(); if (P && P.servidor && P.lerEndereco && (!P.endereco || Date.now() - (this._end || 0) > 120000)) { this._end = Date.now(); await P.lerEndereco(); } } catch (e) {} this.chip(); }; go(); clearInterval(this._t); this._t = setInterval(go, 30000); },
  async card(box) {
    if (!box) return; const P = this.P(); const { esc, badge, icon } = UI; const adm = (Auth.current() || {}).papel === 'admin';
    if (!P || !P.servidor) { box.innerHTML = `<div class="card mt"><div class="card-h"><h3>Servidores</h3></div><div class="card-b"><div class="alert warn">${icon('info')}<div>${P && P.copia ? P.situacao().txt : 'Sem servidor conectado.'}</div></div></div></div>`; return; }
    box.innerHTML = `<div class="card mt"><div class="card-h"><h3>Servidores</h3><span class="tiny muted">carregando…</span></div></div>`;
    await this.ler(true); await P.lerEndereco().catch(() => {});
    const { ordem, fora } = this.fila(), por = {}; this.lista.forEach(s => por[s.pc] = s);
    const todos = ordem.concat(this.lista.map(s => s.pc).filter(x => !ordem.includes(x)));
    const e = P.endereco || {};
    const linha = (pc, i) => {
      const s = por[pc] || { pc }, m = this.min(s.vivoEm), desl = fora.includes(pc);
      const est = s.ativo && m < 6 ? badge('Ativo', 'ok') : s.papel === 'passando a vez' ? badge('Passando a vez', 'warn') : m < 6 ? badge('Reserva pronta', 'info') : badge(s.vivoEm ? 'Desligado' : 'Nunca ligou', 'err');
      const pos = desl ? '<span class="muted">não é servidor</span>' : (ordem.indexOf(pc) === 0 ? '<b>Principal</b>' : 'Reserva ' + ordem.indexOf(pc));
      const avisos = [s.onedrive === false ? badge('OneDrive parado', 'err') : '', s.tomada === false ? badge('Na bateria', 'warn') : '', s.semLogin ? badge('Windows sem ninguém conectado', 'warn') : '', s.github === false ? badge('Sem acesso ao GitHub', 'err') : ''].join(' ');
      return `<tr><td><b>${esc(pc)}</b><div class="tiny muted">${esc(s.usuario || '')}</div></td><td>${pos}</td><td>${est}</td><td>${s.vivoEm ? P.haQuanto(s.vivoEm) : '—'}</td><td class="tiny">${esc(s.versao || '')}</td><td>${avisos || '<span class="tiny" style="color:var(--ok)">tudo certo</span>'}</td>
        <td>${adm ? `<div class="row" style="flex-wrap:nowrap"><button class="btn sm ghost" data-sv="${esc(pc)}" data-d="-1" title="Subir na fila">↑</button><button class="btn sm ghost" data-sv="${esc(pc)}" data-d="1" title="Descer na fila">↓</button><button class="btn sm" data-sl="${esc(pc)}">${desl ? 'Usar como servidor' : 'Não usar'}</button></div>` : ''}</td></tr>`;
    };
    box.innerHTML = `<div class="card mt"><div class="card-h"><h3>Servidores</h3><button class="btn sm" id="svAt">${icon('refresh-cw')} Atualizar</button></div><div class="card-b">
      <div class="alert ${e.url && this.min(e.vivoEm || e.em) < 6 ? 'ok' : 'warn'}">${icon('server')}<div>Servindo agora: <b>${esc(e.pc || (P.infoServidor || {}).pc || '?')}</b>${e.desde ? ', ligado ' + P.haQuanto(e.desde) : ''} · último sinal ${P.haQuanto(e.vivoEm || e.em) || '?'}.
        ${e.pedido ? `<br>O principal (${esc(e.pedido.para)}) pediu a vez; a troca acontece quando o OneDrive terminar de sincronizar.` : ''}</div></div>
      <p class="tiny muted">O primeiro da lista é o <b>principal</b>. Se ele ficar 5 minutos sem sinal (desligado, dormindo ou sem internet), a próxima reserva ligada assume sozinha; quando o principal volta, ele retoma depois que o OneDrive trouxer tudo. Só um computador grava por vez.</p>
      <div class="table-wrap"><table class="t"><thead><tr><th>Computador</th><th>Fila</th><th>Estado</th><th>Último sinal</th><th>Versão</th><th>Avisos</th><th></th></tr></thead><tbody>${todos.map(linha).join('') || '<tr><td colspan="7" class="muted">Nenhum servidor registrado ainda.</td></tr>'}</tbody></table></div>
      <details class="mt"><summary><b>Como colocar outro computador como servidor</b></summary><ol class="tiny" style="line-height:1.6">
        <li>No computador (Windows), entre no <b>OneDrive</b> com a conta que tem a pasta <b>00_VTN</b> e espere sincronizar.</li>
        <li>Abra <b>OneDrive › 00_VTN › _servidor</b> e dê dois cliques em <b>INSTALAR SERVIDOR VTN HUB</b> (o Windows pode pedir "Sim").</li>
        <li>Pronto: ele aparece aqui como reserva. O token do GitHub e as senhas de acesso já vêm da pasta _servidor; ninguém precisa digitar nada.</li>
        <li>Para o servidor funcionar com a <b>tela bloqueada</b> e com o <b>notebook fechado</b>, deixe-o na tomada: o instalador já desliga a suspensão e a ação da tampa na tomada.</li></ol></details>
    </div></div>`;
    UI.$('#svAt', box).onclick = () => this.card(box);
    UI.$$('[data-sv]', box).forEach(b => b.onclick = () => { const o = ordem.filter(x => !fora.includes(x)); const i = o.indexOf(b.dataset.sv), j = i + Number(b.dataset.d); if (i < 0 || j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; this.salvar(o.concat(fora), fora, box); });
    UI.$$('[data-sl]', box).forEach(b => b.onclick = () => { const pc = b.dataset.sl; const f = fora.includes(pc) ? fora.filter(x => x !== pc) : fora.concat(pc); this.salvar(ordem, f, box); });
  },
  async salvar(ordem, desligados, box) {
    if (!desligados.length || ordem.some(x => !desligados.includes(x))) {} else return UI.toast('Precisa ficar pelo menos um servidor', 'err');
    try { await this.P().put('doc?p=sistema&id=servidores', { ordem, desligados, atualizadoEm: new Date().toISOString(), por: (Auth.current() || {}).nome || '' }); UI.toast('Fila de servidores salva (vale em até 1 minuto, depois que o OneDrive sincronizar)'); this.card(box); }
    catch (e) { UI.toast('Não foi possível salvar: ' + e.message, 'err'); }
  }
};
