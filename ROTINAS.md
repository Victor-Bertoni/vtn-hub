# VTN Hub — como tudo funciona (sem IA, sem servidor)

Este documento explica o sistema inteiro para quem for manter: uma pessoa ou outra IA.
Nada aqui depende de IA. Os únicos serviços externos são **GitHub** (guarda e publica o
código), **OneDrive** (guarda e sincroniza os dados) e o **Windows do Victor** (roda as rotinas).

---

## 1. Peças

| Peça | Onde fica | O que faz |
|---|---|---|
| Programa (código) | GitHub: repositório `vtn-hub` | HTML + CSS + JavaScript puro. Sem build, sem dependências para instalar. |
| Site | GitHub Pages: `https://victor-bertoni.github.io/vtn-hub/` | Publicado automaticamente a cada alteração no ramo `main`. |
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
* O app confere a pasta a cada 4 s: mudanças de outra pessoa aparecem sozinhas assim que o
  OneDrive sincroniza.

## 3. Rotinas automáticas (Windows do Victor)

Instalação: `rotinas\instalar_rotinas.ps1` (botão direito › Executar com o PowerShell). Ajuste antes
`rotinas\config.ps1` (pasta do banco e nome do repositório no GitHub).

| Tarefa | Quando | Script | O que faz |
|---|---|---|---|
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
| `js/pasta.js` | **banco na pasta do OneDrive** (File System Access); expõe `window.claude.use('db'|'user'|'assets'|'downloads')` — nome histórico mantido para não mexer no resto |
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
| `rotinas/*.ps1` | rotinas do Windows |

Regras para quem for alterar:
* Não colocar dados de clientes, CPFs ou senhas no código (o repositório é público). Dados ficam só na pasta do OneDrive.
* Não apagar arquivos da pasta do banco nem backups.
* Testar abrindo `index.html?teste=opfs` (usa uma pasta de teste do próprio navegador).

## 6. Primeira instalação num computador novo

1. Ter o OneDrive com a pasta `BANCO DE DADOS` compartilhada pelo Victor ("Adicionar atalho a Meus arquivos").
2. Abrir o site no Edge ou Chrome, clicar **Escolher a pasta BANCO DE DADOS** e permitir.
3. Entrar com e-mail e senha do VTN Hub (Victor/Ismael aprovam contas novas).
4. Clicar **Instalar** (ícone ⊕ na barra de endereço) para ter o app na área de trabalho.
