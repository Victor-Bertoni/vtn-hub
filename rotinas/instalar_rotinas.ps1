# =========================================================
#  VTN HUB – INSTALA AS ROTINAS NO AGENDADOR DE TAREFAS DO WINDOWS
#  Rode uma vez (botão direito › Executar com o PowerShell).
#  Cria 3 tarefas, todas visíveis na tela quando rodam:
#    • VTN Hub – Backup diário        todo dia 18:00
#    • VTN Hub – Vigia fontes oficiais segunda 08:30
#    • VTN Hub – CUB mensal            todo dia 09:00 (só age quando falta o CUB do mês)
#  "Executar assim que possível": se o computador estava desligado
#  no horário, a rotina roda quando ele ligar.
# =========================================================
$ErrorActionPreference = 'Stop'
$aqui = $PSScriptRoot
$ps = (Get-Command powershell.exe).Source
$conf = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 1)
$quem = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

function Criar($nome, $script, $gatilho) {
  $acao = New-ScheduledTaskAction -Execute $ps -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $aqui $script)`"" -WorkingDirectory $aqui
  Register-ScheduledTask -TaskName $nome -TaskPath '\VTN Hub\' -Action $acao -Trigger $gatilho -Settings $conf -Principal $quem -Force | Out-Null
  Write-Host "OK  $nome"
}
Criar 'Backup diário' 'backup_diario.ps1' (New-ScheduledTaskTrigger -Daily -At 18:00)
Criar 'Vigia fontes oficiais' 'radar_semanal.ps1' (New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 08:30)
Criar 'CUB mensal' 'cub_mensal.ps1' (New-ScheduledTaskTrigger -Daily -At 09:00)
Write-Host ''
Write-Host 'Rotinas instaladas. Veja em: Agendador de Tarefas › Biblioteca › VTN Hub.'
Write-Host 'Rodando o primeiro backup agora...'
& (Join-Path $aqui 'backup_diario.ps1')
