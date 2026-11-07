# =========================================================
#  VTN HUB – SERVIDOR SEMPRE LIGADO (roda como administrador; chamado pelo instalar_rotinas.ps1)
#  • Na tomada: o computador não dorme, não hiberna e fechar a tampa não faz nada.
#    (Na bateria continua como o Windows estava, para não esquentar dentro da mochila.)
#  • Tela bloqueada não atrapalha: o servidor continua rodando.
#  • A tarefa "Servidor" passa a ligar junto com o Windows, mesmo antes de alguém entrar
#    (útil depois de atualização do Windows), sem guardar senha nenhuma (tipo S4U).
# =========================================================
param([string]$Usuario, [string]$Pasta)
$ErrorActionPreference = 'Continue'
Write-Host 'VTN HUB – deixando o servidor sempre ligado' -ForegroundColor Cyan
powercfg /change standby-timeout-ac 0 | Out-Null
powercfg /change hibernate-timeout-ac 0 | Out-Null
powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0 | Out-Null
powercfg /setactive SCHEME_CURRENT | Out-Null
Write-Host 'OK  na tomada: sem suspensão, sem hibernar, tampa fechada = continua ligado'
try {
  $ps = (Get-Command powershell.exe).Source
  $acao = New-ScheduledTaskAction -Execute $ps -Argument "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $Pasta 'servidor.ps1')`"" -WorkingDirectory $Pasta
  $t1 = New-ScheduledTaskTrigger -AtStartup; $t1.Delay = 'PT1M'
  $t2 = New-ScheduledTaskTrigger -AtLogOn -User $Usuario
  $conf = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
  $quem = New-ScheduledTaskPrincipal -UserId $Usuario -LogonType S4U -RunLevel Limited
  Register-ScheduledTask -TaskName 'Servidor' -TaskPath '\VTN Hub\' -Action $acao -Trigger @($t1, $t2) -Settings $conf -Principal $quem -Force -ErrorAction Stop | Out-Null
  Write-Host 'OK  o servidor liga junto com o Windows, mesmo sem ninguém entrar' -ForegroundColor Green
  'ok' | Set-Content -Path (Join-Path $env:TEMP 'vtn_s4u_ok.txt')
} catch { Write-Host "Aviso: não deu para ligar antes do login ($($_.Exception.Message)). Continua ligando quando você entra no Windows." -ForegroundColor Yellow }
Start-Sleep -Seconds 4
