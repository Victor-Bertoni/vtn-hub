# =========================================================
#  VTN HUB – VIGIA DAS FONTES OFICIAIS (toda segunda, sem IA)
#  Abre cada página oficial, compara com a da semana anterior e,
#  se o texto mudou, registra no app (Configurações › Parâmetros
#  fiscais mostra a lista) e avisa na tela. Quem confere e atualiza
#  os valores no app é um administrador.
# =========================================================
$ErrorActionPreference = 'Continue'
. (Join-Path $PSScriptRoot 'config.ps1')
$Host.UI.RawUI.WindowTitle = 'VTN Hub – vigia das fontes oficiais'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Fontes = @(
  @{ nome = 'Receita – notícias do Simples Nacional'; url = 'https://www8.receita.fazenda.gov.br/SimplesNacional/Noticias/NoticiaCompleta.aspx' },
  @{ nome = 'Simples – Perguntas e Respostas';         url = 'https://www8.receita.fazenda.gov.br/simplesnacional/arquivos/manual/perguntaosn.pdf' },
  @{ nome = 'NFS-e Nacional – notícias';                url = 'https://www.gov.br/nfse/pt-br/noticias' },
  @{ nome = 'Previdência – tabela de contribuição';     url = 'https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-contribuicao-mensal' },
  @{ nome = 'Receita – tabelas do IRPF';                url = 'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas' },
  @{ nome = 'Ministério das Cidades – MCMV';            url = 'https://www.gov.br/cidades/pt-br/assuntos/habitacao/minha-casa-minha-vida' },
  @{ nome = 'PBH – Diário Oficial do Município';        url = 'https://dom-web.pbh.gov.br/' },
  @{ nome = 'PBH – códigos de tributação do ISS';       url = 'https://bhissdigital.pbh.gov.br/atde/pages/codigoTributacaoMunicipal.jsf' },
  @{ nome = 'Itabirito – Diário Oficial';               url = 'https://itabirito.atende.net/diariooficial/edicao' },
  @{ nome = 'Itabirito – ISS Digital';                  url = 'https://itabirito.mg.gov.br/servico/iss-digital/' },
  @{ nome = 'Sinduscon-MG – CUB';                       url = 'https://sinduscon-mg.org.br/cub/' }
)

$cache = Join-Path $Banco 'radar_cache'
New-Item -ItemType Directory -Force -Path $cache | Out-Null
$radar = Ler-Doc 'sistema' 'radar'
$itens = @(); if ($radar -and $radar.itens) { $itens = @($radar.itens) }
$mudaram = @()
Escrever-Log '=== Vigia das fontes oficiais ==='

foreach ($f in $Fontes) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing -Uri $f.url -TimeoutSec 60 -UserAgent 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) VTN-Hub'
    $bruto = if ($r.Content -is [byte[]]) { [BitConverter]::ToString((New-Object Security.Cryptography.SHA256Managed).ComputeHash($r.Content)) } else { $r.Content }
    # tira scripts, estilos e tags; normaliza espaços
    $txt = $bruto -replace '(?s)<script.*?</script>', ' ' -replace '(?s)<style.*?</style>', ' ' -replace '<[^>]+>', "`n" -replace '&nbsp;', ' '
    $linhas = $txt -split "`n" | ForEach-Object { ($_ -replace '\s+', ' ').Trim() } | Where-Object { $_.Length -gt 25 -and $_ -notmatch '\d{2}:\d{2}:\d{2}' }
    $novo = ($linhas -join "`n")
    $arq = Join-Path $cache (($f.nome -replace '[^\w]+', '_') + '.txt')
    if (Test-Path $arq) {
      $velho = Get-Content -Raw -Encoding UTF8 $arq
      if ($velho -ne $novo) {
        $antes = $velho -split "`n"
        $trecho = ($linhas | Where-Object { $antes -notcontains $_ } | Select-Object -First 4) -join ' | '
        $mudaram += $f.nome
        $itens = @(@{ nome = $f.nome; url = $f.url; mudouEm = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'); trecho = $trecho }) + $itens
        Escrever-Log "MUDOU: $($f.nome)"
      } else { Escrever-Log "sem mudança: $($f.nome)" }
    } else { Escrever-Log "primeira leitura guardada: $($f.nome)" }
    [IO.File]::WriteAllText($arq, $novo, (New-Object Text.UTF8Encoding $false))
  } catch { Escrever-Log "não abriu: $($f.nome) – $($_.Exception.Message)" }
}

Gravar-Doc 'sistema' 'radar' @{ atualizadoEm = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'); itens = @($itens | Select-Object -First 30) }
if ($mudaram.Count) { Avisar 'VTN Hub – fontes oficiais mudaram' (($mudaram -join ', ') + '. Confira no app: Configurações › Parâmetros fiscais.') }
else { Avisar 'VTN Hub' 'Fontes oficiais conferidas: nenhuma mudança nesta semana.' }
Escrever-Log '=== Vigia concluído ==='
Start-Sleep -Seconds 5
