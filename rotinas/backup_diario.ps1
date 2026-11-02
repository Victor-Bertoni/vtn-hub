# =========================================================
#  VTN HUB – BACKUP DIÁRIO (roda sozinho pelo Agendador de Tarefas)
#  1. Copia o banco (pasta BANCO DE DADOS) para backups\banco_AAAA-MM-DD.zip
#  2. Gera backups\vtn_banco_AAAA-MM-DD.json (banco num arquivo só, para
#     importar em Configurações › Backup) e atualiza vtn_banco_atual.json
#  3. Baixa o programa do GitHub para backups\programa_AAAA-MM-DD.zip
#     e atualiza a cópia local na Área de Trabalho (VTN_Gestao)
#  Nada é apagado: só cria/atualiza arquivos.
# =========================================================
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'config.ps1')
$Host.UI.RawUI.WindowTitle = 'VTN Hub – backup diário'
$hoje = Get-Date -Format 'yyyy-MM-dd'
New-Item -ItemType Directory -Force -Path $Backups | Out-Null
Escrever-Log '=== Backup diário iniciado ==='

# ---------- 1. banco (zip da pasta, sem a subpasta de backups) ----------
try {
  $tmp = Join-Path $env:TEMP "vtn_banco_$hoje"
  if (-not (Test-Path $tmp)) { New-Item -ItemType Directory -Path $tmp | Out-Null }
  Get-ChildItem -Path $Banco -Force | Where-Object { $_.Name -ne 'backups' } | ForEach-Object { Copy-Item -Recurse -Force $_.FullName $tmp }
  $zip = Join-Path $Backups "banco_$hoje.zip"
  Compress-Archive -Path (Join-Path $tmp '*') -DestinationPath $zip -Force
  Escrever-Log "Banco copiado: $zip"
} catch { Escrever-Log "ERRO no backup do banco: $($_.Exception.Message)" }

# ---------- 2. banco num arquivo só (.json) ----------
try {
  $docs = Get-ChildItem -Path (Join-Path $Banco 'vtn') -Filter '*.json' | ForEach-Object { Get-Content -Raw -Encoding UTF8 $_.FullName | ConvertFrom-Json }
  $meta = ($docs | Where-Object { $_.coll -eq '_meta' } | Select-Object -First 1).json
  $partes = @()
  if ($meta -and $meta.Trim().Length -gt 2) { $partes += $meta.Trim().TrimStart('{').TrimEnd('}') }
  $docs | Where-Object { $_.coll -ne '_meta' } | Group-Object coll | ForEach-Object {
    $blocos = $_.Group | Sort-Object { [int]$_.n } | ForEach-Object { $_.json.Trim().TrimStart('[').TrimEnd(']') } | Where-Object { $_.Trim() }
    $partes += ('"' + $_.Name + '":[' + ($blocos -join ',') + ']')
  }
  $dados = '{' + ($partes -join ',') + '}'
  $pacote = '{"app":"VTN Hub","em":"' + (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ') + '","dados":' + $dados + '}'
  $utf8 = New-Object Text.UTF8Encoding $false
  [IO.File]::WriteAllText((Join-Path $Backups "vtn_banco_$hoje.json"), $pacote, $utf8)
  [IO.File]::WriteAllText((Join-Path $Backups 'vtn_banco_atual.json'), $pacote, $utf8)
  Escrever-Log "Banco em arquivo único: vtn_banco_$hoje.json"
} catch { Escrever-Log "ERRO ao montar o banco único: $($_.Exception.Message)" }

# ---------- 3. programa (GitHub) ----------
if ($Repo -notlike 'COLE_AQUI*') {
  try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $zipProg = Join-Path $Backups "programa_$hoje.zip"
    Invoke-WebRequest -UseBasicParsing -Uri "https://github.com/$Repo/archive/refs/heads/$Ramo.zip" -OutFile $zipProg
    Escrever-Log "Programa baixado do GitHub: $zipProg"
    $ext = Join-Path $env:TEMP "vtn_prog_$hoje"
    Expand-Archive -Path $zipProg -DestinationPath $ext -Force
    $raiz = Get-ChildItem $ext -Directory | Select-Object -First 1
    New-Item -ItemType Directory -Force -Path $Programa | Out-Null
    Copy-Item -Recurse -Force (Join-Path $raiz.FullName '*') $Programa
    Escrever-Log "Cópia local do programa atualizada: $Programa"
  } catch { Escrever-Log "ERRO ao baixar o programa: $($_.Exception.Message)" }
} else { Escrever-Log 'Programa: repositório do GitHub ainda não configurado em config.ps1' }

Escrever-Log '=== Backup diário concluído ==='
Avisar 'VTN Hub' "Backup de $hoje concluído (banco e programa)."
Start-Sleep -Seconds 5
