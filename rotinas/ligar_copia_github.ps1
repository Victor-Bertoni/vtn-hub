# =========================================================
#  VTN HUB – LIGAR A PUBLICAÇÃO NO GITHUB (uma vez)
#  Publica o endereço do túnel (para o site e o app acharem este PC) e a cópia
#  de consulta criptografada (para quando este PC estiver desligado).
#  Precisa de um "token" do GitHub que só pode alterar o repositório vtn-hub.
#  Não precisa colar nada: depois de gerar o token, clique no ícone de copiar —
#  esta janela pega o código da área de transferência sozinha e depois a limpa.
#  O token fica guardado protegido pelo Windows neste computador
#  (%LOCALAPPDATA%\VTN_Hub\github_token.bin) e, embrulhado, em OneDrive\00_VTN\_servidor (fora do banco)
#  para os servidores reserva. Nunca vai para o GitHub.
# =========================================================
param([switch]$SemPausa)
. (Join-Path $PSScriptRoot 'config.ps1')
. (Join-Path $PSScriptRoot 'copia.ps1')
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Testar-Token([string]$t) {
  try { $r = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo" -Headers @{ Authorization = "Bearer $t"; 'User-Agent' = 'VTN-Hub-servidor' } -TimeoutSec 30; return [bool]$r.permissions.push } catch { return $false }
}

Write-Host 'PUBLICAÇÃO NO GITHUB (endereço para a equipe + cópia para quando este PC estiver desligado)' -ForegroundColor Cyan
Write-Host 'Abrindo o GitHub. Na página, confira:'
Write-Host "   Token name: VTN Hub copia  |  Repository access: Only select repositories -> $Repo"
Write-Host '   Permissions > Contents: Read and write'
Write-Host 'Depois clique em  "Generate token"  e no  ícone de copiar  ao lado do código (github_pat_...).' -ForegroundColor Yellow
Write-Host 'Esta janela pega o código sozinha. (Espera até 15 minutos.)'
Start-Process 'https://github.com/settings/personal-access-tokens/new'

$tok = ''; $fim = (Get-Date).AddMinutes(15); $visto = ''
while ((Get-Date) -lt $fim) {
  Start-Sleep -Seconds 2
  $c = ''; try { $c = "$(Get-Clipboard -Raw)".Trim() } catch { }
  if ($c -and $c -ne $visto -and $c -match '^(github_pat_|ghp_)[A-Za-z0-9_]{20,}$') {
    $visto = $c
    if (Testar-Token $c) { $tok = $c; break }
    Write-Host 'Esse token não tem permissão de escrita no vtn-hub (Contents: Read and write). Gere outro e copie de novo.' -ForegroundColor Red
  }
}
try { Set-Clipboard -Value ' ' } catch { }   # não deixa o token na área de transferência
if (-not $tok) { Write-Host 'Não recebi o token. Rode "INSTALAR VTN HUB" de novo quando quiser.' -ForegroundColor Yellow; if (-not $SemPausa) { Start-Sleep 15 }; return }

Protegido-Gravar $ArqToken $utf8sb.GetBytes($tok)
Write-Host 'OK  token guardado (protegido pelo Windows)' -ForegroundColor Green
Compartilhar-Token   # os servidores reserva (outros computadores com a pasta 00_VTN) usam o mesmo acesso
Escrever-Log 'Publicação no GitHub ligada (o servidor ativo publica endereço + cópia de consulta)'
Write-Host 'OK  o servidor publica o endereço e a cópia de consulta em instantes' -ForegroundColor Green
Write-Host 'Cada pessoa passa a abrir a cópia (servidor desligado) depois de entrar uma vez com o servidor ligado.'
# reinicia o servidor para ele manter endereço e cópia atualizados
try { Stop-ScheduledTask -TaskPath '\VTN Hub\' -TaskName 'Servidor' -ErrorAction SilentlyContinue; Start-Sleep 2; Start-ScheduledTask -TaskPath '\VTN Hub\' -TaskName 'Servidor' } catch { }
if (-not $SemPausa) { Start-Sleep 15 }
