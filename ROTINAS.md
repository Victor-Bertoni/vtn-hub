# VTN Hub — como tudo funciona (sem IA)

Este documento explica o sistema inteiro para quem for manter: uma pessoa ou outra IA.
Nada aqui depende de IA. Serviços usados: **GitHub** (guarda o código), **OneDrive** (guarda e faz
cópia dos dados), **Windows do Victor** (servidor + rotinas) e **túnel gratuito da Cloudflare**
(`cloudflared`, "quick tunnel", **sem conta**) para a internet chegar no computador do Victor.

**Como a equipe usa:** sempre o mesmo endereço, **https://victor-bertoni.github.io/vtn-hub/** (no celular, o
app VTN Hub, que abre esse endereço). O app procura o PC sozinho: o servidor abre o túnel
(`https://<nome>.trycloudflare.com`, muda quando o PC reinicia) e publica o endereço atual no GitHub
(ramo `consulta`, `endereco.json`). Achou o PC → funciona completo, com login do VTN Hub. Não achou →
**modo consulta** (seção 6). Ninguém escolhe pasta, ninguém entra no OneDrive, no Claude nem em outro serviço.
**Limite:** editar direto só com o computador do Victor ligado e com internet; o túnel gratuito da Cloudflare
não tem garantia de disponibilidade.

---

## 1. Peças

| Peça | Onde fica | O que faz |
|---|---|---|
| Programa (código) | GitHub: repositório `vtn-hub` | HTML + CSS + JavaScript puro. Sem build, sem dependências para instalar. |
| Servidor | `rotinas\servidor.ps1` no Windows do Victor (`http://localhost:8737`) | Liga com o Windows (tarefa "Servidor", escondida). Entrega o app, confere login e papel **no próprio servidor**, lê/grava a pasta do banco. A cada 1 min confere o GitHub e baixa a versão nova. Nada é apagado: "excluir" move para `lixeira\`. |
| Endereço da internet | túnel da Cloudflare (`rotinas\tunel.ps1`, aberto pelo servidor) | `https://<nome>.trycloudflare.com` → porta 8737 do PC; endereço publicado no GitHub para o app achar. O servidor só aceita chamadas do site do GitHub Pages e do próprio PC (CORS). |
| Site no GitHub Pages | `https://victor-bertoni.github.io/vtn-hub/` | Cópia do código; abre o **modo consulta** (ver seção 6). |
| App no computador | "Instalar" pelo Edge/Chrome (PWA) | Ícone na área de trabalho, janela própria, funciona sem internet (última versão guardada). |
| Banco de dados | OneDrive: `00_VTN\BANCO DE DADOS` | Pasta compartilhada; cada "documento" é um arquivo `.json`. O OneDrive sincroniza entre os computadores. |
| Rotinas | Windows do Victor: Agendador de Tarefas › `VTN Hub` | Scripts PowerShell em `rotinas\` (backup, vigia de leis, CUB). |

## 2. Banco de dados (pasta do OneDrive)

```
BANCO DE DADOS\
  vtn\                 dados do app em blocos: <coleção>__<n>.json  {coll, n, json}
                       e _meta.json (empresa, configurações, sequências de ID)
  sistema\             versao.json, parametros.json (valores fiscais), radar.json (vigia),
                       cub.json (CUB do mês), cub_aviso.json, ultimaGravacao.json …
  pedidos\<conta>\itens\SOL-*.json   pedidos/sugestões de quem não é administrador
  decisoes\            aprovações/recusas dos administradores
  senhas\              senha (hash) de quem trocou a própria senha
  relatorios\          relatórios guardados (HTML)
  arquivos\            anexos enviados pelo app
  cub\                 PDFs da tabela CUB baixados pela rotina
  radar_cache\         última versão de cada página oficial (para comparar)
  backups\             cópias diárias: banco_AAAA-MM-DD.zip, vtn_banco_AAAA-MM-DD.json,
                       programa_AAAA-MM-DD.zip, rotinas_log.txt  (nunca apagadas)
```

* Montar o banco num arquivo só: para cada coleção, juntar o array `json` dos blocos em ordem de `n`;
  `_meta.json` é um objeto mesclado na raiz. A rotina `backup_diario.ps1` faz isso todo dia
  (`backups\vtn_banco_atual.json`). Esse arquivo pode ser importado em **Configurações › Backup**.
* Quem pode alterar: os papéis do app (`admin` = Victor e Ismael). Os demais veem tudo e mandam
  **pedidos** que um administrador aprova em **Aprovações** (nada muda sem aprovação).
* O app confere o servidor a cada 4 s: mudanças de outra pessoa aparecem sozinhas.
* Regras do servidor (valem mesmo que alguém mexa no navegador): sem login não se lê nada (só dá para
  pedir conta ou nova senha); administrador grava tudo; os demais só gravam os próprios pedidos
  (`pedidos\<id da conta>`) e a própria senha (`senhas\<id da conta>.json`), e só anexam arquivo novo.
  Sessões ficam 30 dias em `%LOCALAPPDATA%\VTN_Hub\sessoes.json` (fora do OneDrive).

## 3. Rotinas automáticas (Windows do Victor)

Instalação: `rotinas\instalar_rotinas.ps1` (botão direito › Executar com o PowerShell). Ele libera a
porta 8737 (o Windows pede "Sim" uma vez), cria as tarefas, o atalho **VTN Hub** e roda `ligar_internet.ps1`.
Pastas e repositório ficam em `rotinas\config.ps1`.

| Tarefa | Quando | Script | O que faz |
|---|---|---|---|
| Servidor | ao entrar no Windows (reinicia sozinho se cair) | `servidor.ps1` | app + banco + login; atualiza o programa do GitHub (confere a cada 1 min) |
| Backup diário | todo dia 18:00* | `backup_diario.ps1` | zip do banco, banco em arquivo único, baixa o programa do GitHub (zip) e atualiza `Desktop\VTN_Gestao` |
| Vigia fontes oficiais | segunda 08:30* | `radar_semanal.ps1` | abre as páginas oficiais (Receita/Simples, NFS-e, INSS, IRPF, MCMV, PBH, Itabirito, Sinduscon), compara com a semana anterior e registra o que mudou em `sistema\radar.json` + aviso na tela |
| CUB mensal | todo dia 09:00* | `cub_mensal.ps1` | quando sai a tabela nova do Sinduscon-MG, baixa o PDF para `cub\`, grava `sistema\cub_aviso.json` e abre o PDF |

\* "Executar assim que possível": se o computador estava desligado, roda quando ligar.
Registro de tudo: `BANCO DE DADOS\backups\rotinas_log.txt`.

**O que precisa de uma pessoa (não há IA):**
1. Quando o vigia avisar que uma fonte mudou: abrir o link, ver se mudou algum valor e
   atualizar em **Configurações › Parâmetros fiscais** (salário mínimo, INSS, IRRF, limites do
   Simples, lei nova). Vale para todos na hora.
2. Quando sair o CUB: abrir o PDF e digitar em **Composições e CUB › CUB/m² › Atualizar CUB**.
3. Preços de insumos: **Composições e CUB › Insumos** (todas as composições recalculam).

## 4. Atualizar o programa (obrigatório e automático)

1. Alterar os arquivos no repositório (pelo site do GitHub, GitHub Desktop ou outra IA).
2. Em `js/config.js`, mudar `APP_VERSION` (ex.: `2026.12.01-0900`) e em `versao.json` o campo
   `versao` para o mesmo valor (e `publicadoEm` com a data/hora).
3. Salvar no ramo `main`. O GitHub Pages publica em ~1 minuto.
4. Todos os apps abertos conferem `versao.json` a cada 10 min: aparece a barra "Nova versão",
   com prazo de 1 hora; depois disso a tela recarrega sozinha, voltando onde a pessoa estava.
   Quem abrir depois já recebe a versão nova.

## 5. Mapa do código

| Arquivo | Função |
|---|---|
| `index.html` | página única; ordem de carregamento dos scripts |
| `js/pasta.js` | **acesso ao banco**: pelo servidor (`api/…`, tela de login) ou, sem servidor, direto na pasta (File System Access); expõe `window.claude.use('db'|'user'|'assets'|'downloads')` — nome histórico mantido para não mexer no resto |
| `js/cloud.js` | sincronização do app com o banco (blocos, tempo real, pedidos, aprovações, senhas, anexos) |
| `js/store.js` | dados em memória (`Store.db`), inserir/alterar/remover, IDs |
| `js/app.js` | login, menu, rotas `#/tela` |
| `js/contas.js` | criar conta, esqueci a senha, aprovar, redefinir |
| `js/parametros.js` | parâmetros fiscais (lidos de `sistema/parametros`) e aviso do vigia |
| `js/enquadramento.js`, `js/fiscal.js` | Simples Nacional, faixas, Fator R, ME/EPP, obrigações |
| `js/mercado.js` | rodapé de cotações (AwesomeAPI, brapi) e notícias (Google News via rss2json), direto do navegador |
| `js/desktop.js`, `sw.js`, `manifest.webmanifest` | app instalável (PWA) e atualização obrigatória |
| `js/views/*.js` | uma tela por arquivo (obras, financeiro, orçamentos, composições, contratos…) |
| `js/composicoes_seed.js` | base de composições, insumos e CUB (dados da VTN de 2024–2026) |
| `rotinas/*.ps1` | servidor e rotinas do Windows (salvar em UTF-8 **com BOM**) |

Regras para quem for alterar:
* Não colocar dados de clientes, CPFs ou senhas no código (o repositório é público). Dados ficam só na pasta do OneDrive.
* Não apagar arquivos da pasta do banco nem backups.
* Testar abrindo `index.html?teste=opfs` (usa uma pasta de teste do próprio navegador).

## 6. Computador do Victor desligado: cópia de consulta

* O servidor publica no GitHub, ramo **`consulta`**, o arquivo `dados.json` com o banco (pastas `vtn` e `sistema`)
  **compactado e criptografado** (AES-256-CBC + HMAC-SHA256). Envia 2 min depois de cada alteração
  (no máximo a cada 5 min) e a cada 6 h. É sempre um único commit, substituído — o repositório não cresce.
* A chave dos dados fica só no PC (`%LOCALAPPDATA%\VTN_Hub\chave_consulta.bin`, protegida pelo Windows) e vai
  "embrulhada" na cópia com a **senha de cada pessoa** (PBKDF2-SHA256, 600 mil rodadas), gerada quando ela
  entra no VTN Hub com o PC ligado. Ninguém mais abre a cópia; quem for desativado sai da próxima cópia.
* Quando o servidor não responde, o app mostra **Modo consulta**: e-mail + senha → abre a última cópia
  (também guardada no aparelho, para abrir sem internet). Faixa laranja no topo. Todos ficam como
  leitores: alterações viram **pedidos guardados no aparelho** e são enviados sozinhos quando o servidor volta;
  Victor/Ismael aprovam em Aprovações. Anexos não abrem nesse modo.
* Ligar (uma vez): `rotinas\ligar_copia_github.ps1` — pede um token do GitHub (fine-grained, só o repositório
  vtn-hub, Contents: Read and write), guardado protegido pelo Windows em `%LOCALAPPDATA%\VTN_Hub\github_token.bin`.
  Se o token vencer, rodar de novo. Código: `rotinas\copia.ps1` (PC) e `js/pasta.js` (app).
* Sincronização manual: com autorização do Victor, uma IA ou pessoa pode rodar `Publicar-Copia` ou mexer nos dados
  pelo próprio app; nada depende de IA para funcionar.

## 6c. Sem conexão e conflitos (validador)

* **Servidor fora do ar** (PC desligado, sem internet, túnel caiu): administradores continuam editando; cada alteração
  fica guardada **no aparelho** (`localStorage: vtn_offline_diff`, sobrevive a fechar o app) e sincroniza sozinha quando
  o servidor volta (o app recarrega sozinho ao perceber). Os demais: alterações viram pedidos, também guardados e enviados depois.
* **Validador** (`js/cloud.js`: `mesclar` + `validador`), em toda gravação e na sincronização:
  registros diferentes e campos diferentes do mesmo registro → junta sozinho; mesmo campo mudado pelos dois → tela
  "Validador" (manter o meu / o da outra pessoa); mesmo código criado pelos dois (ex.: OS-0011) → renumera o meu e
  corrige as referências; mesmo nº de proposta → próximo nº livre; mesma obra/nº de pasta → pergunta (juntar ou
  renumerar); um excluiu e o outro alterou → pergunta.
* Pedidos aprovados depois (Aprovações) aplicam o que foi pedido sobre os dados atuais.

## 6b. Senha esquecida

* **Administradores (Victor e Ismael):** "Esqueci a senha" envia por e-mail um link (30 min, uso único) para criar
  a senha nova, sem depender do outro administrador. O servidor envia pelo Gmail com "senha de app"
  (ligar uma vez: `LIGAR EMAIL VTN HUB` na área de trabalho → `rotinas\ligar_email.ps1`).
  A senha nova fica em `%LOCALAPPDATA%\VTN_Hub\senhas_admin.json` (só o servidor lê) e desconecta os aparelhos.
* **Emergência (sem e-mail):** `REDEFINIR SENHA ADMIN` na área de trabalho do computador servidor
  (`rotinas\redefinir_senha_admin.ps1`): escolhe o administrador e digita a senha nova.
* **Demais usuários:** "Esqueci a senha" vira pedido; Victor ou Ismael geram uma senha temporária em Aprovações.

## 7. App Android (APK)

* Projeto em `android/` (Java puro, sem bibliotecas): uma janela que abre o endereço do VTN Hub.
  Na 1ª vez pede o endereço (colar o que o Victor envia); "Configurações › Trocar endereço do servidor" muda depois.
* `js/android.js` faz a ponte: arquivos gerados vão para `Downloads/VTN Hub` e abrem; impressão/PDF pelo Android;
  links de fora abrem no navegador.
* O **GitHub monta o APK sozinho** (`.github/workflows/android.yml`) quando `android/` muda, ou em
  Actions › Android › Run workflow. Link fixo:
  `https://github.com/Victor-Bertoni/vtn-hub/releases/download/android/VTN-Hub.apk`
  (a tela de login no Chrome do Android mostra o botão "Baixar o app").
* O conteúdo vem do servidor, então o APK quase nunca precisa ser refeito: as atualizações do app chegam sozinhas.
* Opcional: em Settings › Secrets and variables › Actions, a variável `VTN_URL` já preenche o endereço no APK;
  os secrets `VTN_KEYSTORE_B64`/`VTN_KEYSTORE_SENHA` fixam a assinatura (sem eles, cada APK novo exige
  desinstalar o anterior).

## 7b. Servidor principal e reservas (desde 2026-11-06)

* Só **um** computador fica **ativo** por vez; os outros com a pasta 00_VTN no OneDrive ficam de **reserva**.
* `endereco.json` (ramo `consulta`) traz `url`, `pc`, `vivoEm` (sinal de vida a cada 2 min), `pedido` e `cedido` (troca).
* Ordem: `BANCO DE DADOS\sistema\servidores.json` (Configurações › Servidores). Estado de cada um:
  `BANCO DE DADOS\sistema\servidores\<computador>.json`.
* Ativo sem sinal há 5 min → a reserva assume (a 2ª espera +2 min). Principal de volta → pede a vez; o ativo para de gravar,
  grava `_troca.json`; o principal assume quando o OneDrive trouxe a marca e ficou 60 s quieto.
* `OneDrive\00_VTN\_servidor` (fora do banco, o app não lê): sessões, senhas novas de admin, chaves da cópia e token do GitHub
  (embrulhados) para a reserva assumir sem pedir nada; e **INSTALAR SERVIDOR VTN HUB.cmd** para pôr outro computador como servidor.
* `energia_e_inicio.ps1` (administrador): na tomada não dorme/hiberna e a tampa fechada não faz nada; a tarefa Servidor liga
  junto com o Windows mesmo sem ninguém entrar (S4U, sem guardar senha).
* O app confere a cada 20 s; se o servidor cair no meio do uso, procura o ativo e continua (sem perder o login).

## 8. Instalação

**Computador do Victor (uma vez):** rodar `INSTALAR VTN HUB` (área de trabalho) ou `rotinas\instalar_rotinas.ps1`.
No fim ele roda `ligar_copia_github.ps1`, que pede o token do GitHub (publica endereço + cópia). O túnel abre sozinho.

**Demais pessoas:** abrir https://victor-bertoni.github.io/vtn-hub/ (ou instalar o APK), entrar com e-mail e senha do VTN Hub (conta nova: "Criar conta",
Victor ou Ismael aprovam). No computador, "Instalar VTN Hub" no menu do navegador cria o ícone.

**Se o computador do Victor for trocado:** instalar OneDrive, copiar `Desktop\VTN_Gestao`, rodar o instalador.
