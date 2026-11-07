# =========================================================
#  VTN HUB – CUB/m² MENSAL (Sinduscon-MG, sem IA)
#  Procura no site do Sinduscon-MG a tabela do mês mais recente,
#  baixa o PDF para BANCO DE DADOS\cub\ e avisa o app.
#  O app lê o PDF sozinho (pdf.js) e grava o CUB do mês para todos assim que um
#  administrador abrir o VTN Hub. Se a leitura falhar, dá para digitar em
#  Composições e CUB › CUB/m² › "Atualizar CUB".
# =========================================================
$ErrorActionPreference = 'Continue'
. (Join-Path $PSScriptRoot 'config.ps1')
$Host.UI.RawUI.WindowTitle = 'VTN Hub – CUB mensal'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$meses = 'janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'
$pasta = Join-Path $Banco 'cub'; New-Item -ItemType Directory -Force -Path $pasta | Out-Null
$atual = Ler-Doc 'sistema' 'cub'
Escrever-Log '=== CUB mensal ==='
$achou = $false
foreach ($voltar in 1, 2) {
  $ref = (Get-Date).AddMonths(-$voltar); $pub = $ref.AddMonths(1)
  $mesRef = '{0:yyyy-MM}' -f $ref
  if ($atual -and $atual.mes -and $atual.mes -ge $mesRef) { Escrever-Log "CUB de $($atual.mes) já está no app."; $achou = $true; break }
  $nome = 'tabela_cub_{0}_{1}.pdf' -f $meses[$ref.Month - 1], $ref.Year
  foreach ($p in @($pub, $ref)) {
    $url = 'https://sinduscon-mg.org.br/wp-content/uploads/{0:yyyy}/{0:MM}/{1}' -f $p, $nome
    try {
      $dest = Join-Path $pasta $nome
      Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $dest -TimeoutSec 60
      Escrever-Log "Tabela encontrada: $url"
      Gravar-Doc 'sistema' 'cub_aviso' @{ mes = $mesRef; url = $url; arquivo = "cub\$nome"; em = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ') }
      Avisar 'VTN Hub – CUB novo' "Saiu o CUB de $mesRef. O VTN Hub lê a tabela e atualiza sozinho."
      $achou = $true; break
    } catch { }
  }
  if ($achou) { break }
}
if (-not $achou) { Escrever-Log 'Tabela do CUB ainda não publicada – tento de novo amanhã.' }
# histórico: baixa as tabelas dos últimos 36 meses que ainda não estão na pasta (o app lê e monta a série do CUB para reajustes)
foreach ($voltar in 2..36) {
  $ref = (Get-Date).AddMonths(-$voltar); $nome = 'tabela_cub_{0}_{1}.pdf' -f $meses[$ref.Month - 1], $ref.Year
  $dest = Join-Path $pasta $nome; if (Test-Path $dest) { continue }
  foreach ($p in @($ref.AddMonths(1), $ref, $ref.AddMonths(2))) {
    try { Invoke-WebRequest -UseBasicParsing -Uri ('https://sinduscon-mg.org.br/wp-content/uploads/{0:yyyy}/{0:MM}/{1}' -f $p, $nome) -OutFile $dest -TimeoutSec 60; Escrever-Log "CUB histórico baixado: $nome"; break } catch { Remove-Item -LiteralPath $dest -ErrorAction SilentlyContinue }
  }
}
Escrever-Log '=== CUB concluído ==='
Start-Sleep -Seconds 5
