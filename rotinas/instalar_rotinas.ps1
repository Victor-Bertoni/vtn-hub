# =========================================================
#  VTN HUB – INSTALA E LIGA TUDO NO COMPUTADOR DO VICTOR (sem perguntas)
#  Dois cliques em "INSTALAR VTN HUB" (área de trabalho). Pode rodar de novo quando quiser.
#  Cria/atualiza no Agendador de Tarefas (pasta "VTN Hub"):
#    • Servidor                         liga junto com o Windows (escondido) e abre o túnel da Cloudflare
#    • Backup diário                    todo dia 18:00
#    • Vigia fontes oficiais            segunda 08:30
#    • CUB mensal                       todo dia 09:00 (só age quando falta o CUB do mês)
#  "Executar assim que possível": se o computador estava desligado no horário, roda quando ligar.
#  Cria o atalho "VTN Hub", reinicia o servidor com a versão atual e, se faltar,
#  liga a publicação no GitHub (ligar_copia_github.ps1: endereço + cópia de consulta).
# =========================================================
$ErrorActionPreference = 'Continue'
$aqui = $PSScriptRoot
. (Join-Path $aqui 'config.ps1')
. (Join-Path $aqui 'copia.ps1')
$Porta = 8737
$ps = (Get-Command powershell.exe).Source
$conf = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 1)
$quem = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
Write-Host ''
Write-Host 'VTN HUB – instalando e ligando (não precisa responder nada)' -ForegroundColor Cyan
Write-Host ''

function Criar($nome, $script, $gatilho, $config = $conf, [switch]$Escondido) {
  $janela = if ($Escondido) { '-WindowStyle Hidden ' } else { '' }
  $acao = New-ScheduledTaskAction -Execute $ps -Argument "$janela-NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $aqui $script)`"" -WorkingDirectory $aqui
  Register-ScheduledTask -TaskName $nome -TaskPath '\VTN Hub\' -Action $acao -Trigger $gatilho -Settings $config -Principal $quem -Force | Out-Null
  Write-Host "OK  tarefa: $nome"
}

# ---------- 1. tarefas ----------
$confServ = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
Criar 'Servidor' 'servidor.ps1' (New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME") $confServ -Escondido
Criar 'Backup diário' 'backup_diario.ps1' (New-ScheduledTaskTrigger -Daily -At 18:00)
Criar 'Vigia fontes oficiais' 'radar_semanal.ps1' (New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 08:30)
Criar 'CUB mensal' 'cub_mensal.ps1' (New-ScheduledTaskTrigger -Daily -At 09:00)

# ---------- 2. atalho "VTN Hub" (janela própria, sem cara de navegador) ----------
$nav = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
         "$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") |
       Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
$icone = Join-Path $Programa 'img\vtn.ico'
try {
  $sh = New-Object -ComObject WScript.Shell
  foreach ($pasta in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) {
    $lnk = $sh.CreateShortcut((Join-Path $pasta 'VTN Hub.lnk'))
    if ($nav) { $lnk.TargetPath = $nav; $lnk.Arguments = "--app=http://localhost:$Porta/" } else { $lnk.TargetPath = "http://localhost:$Porta/" }
    if (Test-Path $icone) { $lnk.IconLocation = $icone }
    $lnk.Description = 'VTN Hub – gestão de obras'; $lnk.Save()
  }
  Write-Host 'OK  atalho "VTN Hub" na área de trabalho e no menu Iniciar'
} catch { Write-Host "Aviso: atalho não criado ($($_.Exception.Message))" }

# ---------- 3. reiniciar o servidor com a versão atual ----------
Write-Host 'Reiniciando o servidor...'
$inicio = Get-Date
try { Stop-ScheduledTask -TaskPath '\VTN Hub\' -TaskName 'Servidor' -ErrorAction SilentlyContinue } catch { }
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -like '*servidor.ps1*' -and $_.ProcessId -ne $PID } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2
Start-ScheduledTask -TaskPath '\VTN Hub\' -TaskName 'Servidor'

$ok = $false
for ($i = 0; $i -lt 30; $i++) { Start-Sleep -Seconds 2; try { if ((Invoke-RestMethod "http://localhost:$Porta/api/info" -TimeoutSec 3).ok) { $ok = $true; break } } catch { } }
if ($ok) { Write-Host 'OK  servidor ligado (http://localhost:8737)' -ForegroundColor Green } else { Write-Host 'Aviso: o servidor ainda não respondeu (veja BANCO DE DADOS\backups\rotinas_log.txt)' -ForegroundColor Yellow }

$ae = Join-Path $DirLocal 'endereco.txt'
Write-Host 'Abrindo o túnel da Cloudflare (até 1 minuto)...'
$url = ''
for ($i = 0; $i -lt 45; $i++) { Start-Sleep -Seconds 2; if ((Test-Path $ae) -and (Get-Item $ae).LastWriteTime -gt $inicio) { $url = (Get-Content -Raw $ae).Trim(); break } }
if ($url) { Write-Host "OK  túnel aberto: $url" -ForegroundColor Green } else { Write-Host 'Aviso: o túnel ainda não abriu; o servidor tenta de novo sozinho.' -ForegroundColor Yellow }

# ---------- 4. publicação no GitHub (endereço + cópia de consulta) ----------
if (-not (Token-GitHub)) {
  Write-Host ''
  & (Join-Path $aqui 'ligar_copia_github.ps1') -SemPausa
} else {
  try { Publicar-Copia $Banco (Usuarios-Ativos) $Repo $url | Out-Null; Write-Host 'OK  endereço e cópia publicados no GitHub' -ForegroundColor Green }
  catch { Write-Host "Aviso: não publicou no GitHub agora: $($_.Exception.Message)" -ForegroundColor Yellow }
}

Write-Host ''
Write-Host 'PRONTO. A equipe usa: https://victor-bertoni.github.io/vtn-hub/ (no celular, o app VTN Hub)' -ForegroundColor Green
Escrever-Log 'Instalação/reinício concluído'
Start-Sleep -Seconds 20
