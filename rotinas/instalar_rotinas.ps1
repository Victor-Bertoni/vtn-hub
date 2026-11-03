# =========================================================
#  VTN HUB – INSTALA TUDO NO COMPUTADOR DO VICTOR (servidor + rotinas)
#  Rode uma vez (botão direito › Executar com o PowerShell).
#  Cria no Agendador de Tarefas (pasta "VTN Hub"):
#    • Servidor                         liga junto com o Windows (escondido)
#    • Backup diário                    todo dia 18:00
#    • Vigia fontes oficiais            segunda 08:30
#    • CUB mensal                       todo dia 09:00 (só age quando falta o CUB do mês)
#  "Executar assim que possível": se o computador estava desligado
#  no horário, a rotina roda quando ele ligar.
#  Também cria o atalho "VTN Hub" na área de trabalho e no menu Iniciar
#  e, no fim, liga o endereço da internet para a equipe (ligar_internet.ps1)
#  e a cópia de consulta no GitHub (ligar_copia_github.ps1).
# =========================================================
$ErrorActionPreference = 'Stop'
$aqui = $PSScriptRoot
. (Join-Path $aqui 'config.ps1')
$ps = (Get-Command powershell.exe).Source
$conf = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 1)
$quem = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

function Criar($nome, $script, $gatilho, $config = $conf, [switch]$Escondido) {
  $janela = if ($Escondido) { '-WindowStyle Hidden ' } else { '' }
  $acao = New-ScheduledTaskAction -Execute $ps -Argument "$janela-NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $aqui $script)`"" -WorkingDirectory $aqui
  Register-ScheduledTask -TaskName $nome -TaskPath '\VTN Hub\' -Action $acao -Trigger $gatilho -Settings $config -Principal $quem -Force | Out-Null
  Write-Host "OK  $nome"
}

# ---------- 1. liberar a porta 8737 para o endereço da internet (pede "Sim" do Windows uma única vez) ----------
$Porta = 8737
$acl = (netsh http show urlacl url=http://+:$Porta/ | Out-String)
if ($acl -notmatch "$Porta") {
  Write-Host 'O Windows vai pedir permissão (uma vez só) para o VTN Hub receber acessos da equipe. Clique em "Sim".'
  try { Start-Process netsh -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList "http add urlacl url=http://+:$Porta/ user=`"$env:USERDOMAIN\$env:USERNAME`"" }
  catch { Write-Host 'Permissão não concedida: o VTN Hub vai funcionar só neste computador até rodar este instalador de novo.' }
}

# ---------- 2. servidor: liga com o Windows e fica ligado ----------
$confServ = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
Criar 'Servidor' 'servidor.ps1' (New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME") $confServ -Escondido
try { Stop-ScheduledTask -TaskPath '\VTN Hub\' -TaskName 'Servidor' -ErrorAction SilentlyContinue } catch { }
Start-ScheduledTask -TaskPath '\VTN Hub\' -TaskName 'Servidor'

# ---------- 3. rotinas ----------
Criar 'Backup diário' 'backup_diario.ps1' (New-ScheduledTaskTrigger -Daily -At 18:00)
Criar 'Vigia fontes oficiais' 'radar_semanal.ps1' (New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 08:30)
Criar 'CUB mensal' 'cub_mensal.ps1' (New-ScheduledTaskTrigger -Daily -At 09:00)

# ---------- 4. atalho "VTN Hub" (janela própria, sem cara de navegador) ----------
$nav = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
         "$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") |
       Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
$icone = Join-Path $Programa 'img\vtn.ico'
$sh = New-Object -ComObject WScript.Shell
foreach ($pasta in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) {
  $lnk = $sh.CreateShortcut((Join-Path $pasta 'VTN Hub.lnk'))
  if ($nav) { $lnk.TargetPath = $nav; $lnk.Arguments = "--app=http://localhost:$Porta/" } else { $lnk.TargetPath = "http://localhost:$Porta/" }
  if (Test-Path $icone) { $lnk.IconLocation = $icone }
  $lnk.Description = 'VTN Hub – gestão de obras'; $lnk.Save()
}
Write-Host 'OK  Atalho "VTN Hub" na área de trabalho e no menu Iniciar'

Write-Host ''
Write-Host 'Servidor e rotinas instalados. Veja em: Agendador de Tarefas › Biblioteca › VTN Hub.'
Write-Host 'Rodando o primeiro backup agora...'
& (Join-Path $aqui 'backup_diario.ps1')

Write-Host ''
Write-Host 'Agora, o endereço da internet para a equipe:'
& (Join-Path $aqui 'ligar_internet.ps1')

Write-Host ''
Write-Host 'Por fim, a cópia de consulta (para quando este computador estiver desligado):'
& (Join-Path $aqui 'ligar_copia_github.ps1')
