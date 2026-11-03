# =========================================================
#  VTN HUB – LIGAR A CÓPIA DE CONSULTA NO GITHUB (uma vez)
#  Para a equipe consultar os dados quando o computador do Victor estiver desligado.
#  Precisa de um "token" do GitHub que só pode alterar o repositório vtn-hub.
#  O token fica guardado protegido pelo Windows neste computador (não vai para o OneDrive nem para o GitHub).
# =========================================================
. (Join-Path $PSScriptRoot 'config.ps1')
. (Join-Path $PSScriptRoot 'copia.ps1')

Write-Host ''
Write-Host 'PUBLICAÇÃO NO GITHUB: endereço para a equipe + cópia de consulta (para quando este computador estiver desligado)' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Vai abrir a página do GitHub para criar uma chave de acesso (token). Preencha assim:'
Write-Host '  1. Token name: VTN Hub copia'
Write-Host '  2. Expiration: escolha o maior prazo (ou "No expiration", se aparecer)'
Write-Host "  3. Repository access: Only select repositories  ->  $Repo"
Write-Host '  4. Permissions › Repository permissions › Contents: Read and write'
Write-Host '  5. Clique em "Generate token" e copie o código (começa com github_pat_)'
Write-Host ''
Start-Process 'https://github.com/settings/personal-access-tokens/new'
$seg = Read-Host 'Cole aqui o token e aperte Enter' -AsSecureString
$tok = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($seg)).Trim()
if (-not $tok) { Write-Host 'Nada colado. Rode este arquivo de novo quando quiser.'; Read-Host 'Enter para fechar'; exit }

try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $r = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo" -Headers @{ Authorization = "Bearer $tok"; 'User-Agent' = 'VTN-Hub-servidor' } -TimeoutSec 30
  if (-not $r.permissions.push) { throw 'o token não tem permissão de escrita (Contents: Read and write) no vtn-hub' }
} catch { Write-Host "Token não aceito: $($_.Exception.Message)" -ForegroundColor Red; Read-Host 'Enter para fechar'; exit }

Protegido-Gravar $ArqToken $utf8sb.GetBytes($tok)
Write-Host 'Token guardado. Publicando a primeira cópia...'

# usuários atuais do banco (para incluir só quem está ativo)
$us = @(); Get-ChildItem -LiteralPath (Join-Path $Banco 'vtn') -Filter 'usuarios__*.json' -ErrorAction SilentlyContinue | ForEach-Object { $us += @((Get-Content -Raw -Encoding UTF8 $_.FullName | ConvertFrom-Json).json | ConvertFrom-Json) }
try {
  Publicar-Copia $Banco $us $Repo | Out-Null
  Escrever-Log 'Cópia de consulta ligada e publicada no GitHub'
  $n = (Ler-ChavesUsuarios).Count
  Write-Host ''
  Write-Host 'PRONTO. Endereço e cópia de consulta ligados.' -ForegroundColor Green
  Write-Host 'A equipe usa: https://victor-bertoni.github.io/vtn-hub/  (no celular, o app VTN Hub com esse mesmo endereço)' -ForegroundColor Green
  Write-Host 'O servidor atualiza a cópia sozinho (alguns minutos depois de cada alteração).'
  Write-Host "Pessoas que já podem abrir a cópia: $n. Cada pessoa passa a poder abrir depois de entrar uma vez no VTN Hub com este computador ligado."
} catch { Write-Host "Não foi possível publicar agora: $($_.Exception.Message)" -ForegroundColor Red }
# reinicia o servidor para ele começar a manter a cópia atualizada
try { Stop-ScheduledTask -TaskPath '\VTN Hub\' -TaskName 'Servidor' -ErrorAction SilentlyContinue; Start-Sleep 2; Start-ScheduledTask -TaskPath '\VTN Hub\' -TaskName 'Servidor' } catch { }
Read-Host 'Enter para fechar'
