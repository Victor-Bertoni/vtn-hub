# =========================================================
#  VTN HUB – MONITOR DO SERVIDOR (ícone ao lado do relógio do Windows)
#  ● verde    servidor ligado neste computador e acessível pela internet
#  ● azul     este computador é reserva; outro está servindo e está tudo bem
#  ● amarelo  ligado, mas com algum aviso (OneDrive parado, na bateria, sem túnel…)
#  ● vermelho servidor desligado – o painel diz o que falta e tem botão para ligar
#  Clique no ícone: painel com cada item conferido e os botões de correção.
#  Confere a cada 20 s. Avisa em balão quando o estado muda.
#  Em computador sem servidor instalado, mostra o servidor ativo da empresa (pelo GitHub).
# =========================================================
$ErrorActionPreference = 'SilentlyContinue'
$aqui = $PSScriptRoot
. (Join-Path $aqui 'config.ps1')
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# um só monitor por usuário
$mtx = New-Object Threading.Mutex($false, 'Local\VTNHubMonitor')
if (-not $mtx.WaitOne(0)) { exit }

$Porta = 8737
$DirLocal = Join-Path $env:LOCALAPPDATA 'VTN_Hub'
$temServidor = Test-Path (Join-Path $Programa 'rotinas\servidor.ps1')
$script:estado = ''; $script:itens = @(); $script:resumo = 'Conferindo…'; $script:end = $null; $script:endLido = [datetime]::MinValue

function Bolinha([string]$cor) {
  $bmp = New-Object Drawing.Bitmap 32, 32; $g = [Drawing.Graphics]::FromImage($bmp); $g.SmoothingMode = 'AntiAlias'
  $c = @{ verde = [Drawing.Color]::FromArgb(22, 163, 74); azul = [Drawing.Color]::FromArgb(37, 99, 235); amarelo = [Drawing.Color]::FromArgb(245, 158, 11); vermelho = [Drawing.Color]::FromArgb(220, 38, 38); cinza = [Drawing.Color]::Gray }[$cor]
  $g.FillEllipse((New-Object Drawing.SolidBrush $c), 3, 3, 26, 26); $g.DrawEllipse((New-Object Drawing.Pen ([Drawing.Color]::White), 2), 3, 3, 26, 26)
  $f = New-Object Drawing.Font('Segoe UI', 11, [Drawing.FontStyle]::Bold); $g.DrawString('V', $f, [Drawing.Brushes]::White, 8, 5); $g.Dispose()
  return [Drawing.Icon]::FromHandle($bmp.GetHicon())
}
$icones = @{}; foreach ($c in 'verde', 'azul', 'amarelo', 'vermelho', 'cinza') { $icones[$c] = Bolinha $c }

function Info-Local { try { return Invoke-RestMethod "http://localhost:$Porta/api/info" -TimeoutSec 4 } catch { return $null } }
function Ler-Endereco {
  if (((Get-Date) - $script:endLido).TotalSeconds -lt 55 -and $script:end) { return $script:end }
  try { $r = Invoke-RestMethod "https://raw.githubusercontent.com/$Repo/consulta/endereco.json?t=$([DateTime]::UtcNow.Ticks)" -TimeoutSec 8; $script:end = $r; $script:endLido = Get-Date } catch { }
  return $script:end
}
function Min-Desde($iso) { try { return [int]((Get-Date).ToUniversalTime() - [datetime]::Parse("$iso", $null, 'RoundtripKind').ToUniversalTime()).TotalMinutes } catch { return 99999 } }
function Testar-Url([string]$u) { if (-not $u) { return $false }; try { return [bool](Invoke-RestMethod ($u.TrimEnd('/') + '/api/info') -TimeoutSec 8).ok } catch { return $false } }

# confere tudo e devolve itens: @{ ok; texto; acao }   (acao = nome do botão de correção)
function Conferir {
  $L = New-Object Collections.ArrayList
  $add = { param($ok, $texto, $acao) [void]$L.Add([pscustomobject]@{ ok = $ok; texto = $texto; acao = $acao }) }
  $net = $false; try { $null = Invoke-WebRequest 'https://api.github.com' -UseBasicParsing -TimeoutSec 6; $net = $true } catch { }
  $e = if ($net) { Ler-Endereco } else { $null }
  if ($temServidor) {
    $task = Get-ScheduledTask -TaskPath '\VTN Hub\' -TaskName 'Servidor'
    $info = Info-Local
    & $add ([bool]$task) $(if ($task) { "Tarefa do servidor instalada ($($task.State))" } else { 'Servidor não instalado neste computador' }) $(if (-not $task) { 'instalar' })
    & $add ([bool]$info) $(if ($info) { "Servidor respondendo neste computador (versão $($info.versao))" } else { 'Servidor DESLIGADO neste computador' }) $(if (-not $info) { 'ligar' })
    $od = [bool](Get-Process OneDrive); & $add $od $(if ($od) { 'OneDrive aberto (dados sincronizando)' } else { 'OneDrive FECHADO – os dados não sincronizam' }) $(if (-not $od) { 'onedrive' })
    $bk = Test-Path $Banco; & $add $bk $(if ($bk) { 'Pasta do banco encontrada no OneDrive' } else { "Pasta do banco não encontrada: $Banco" }) $(if (-not $bk) { 'onedrive' })
    $ac = ("$([Windows.Forms.SystemInformation]::PowerStatus.PowerLineStatus)" -ne 'Offline'); & $add $ac $(if ($ac) { 'Ligado na tomada' } else { 'Na BATERIA – ligue na tomada (na bateria ele dorme)' }) $null
    & $add $net $(if ($net) { 'Internet funcionando' } else { 'SEM INTERNET – a equipe não acessa de fora' }) $null
    $tok = Test-Path (Join-Path $DirLocal 'github_token.bin'); & $add $tok $(if ($tok) { 'Acesso ao GitHub configurado' } else { 'Sem acesso ao GitHub (endereço e cópia não são publicados)' }) $(if (-not $tok) { 'github' })
    if ($info) {
      if ($info.ativo) {
        $u = if ($e -and "$($e.pc)" -eq $env:COMPUTERNAME) { "$($e.url)" } else { '' }
        $ok = Testar-Url $u
        & $add $ok $(if ($ok) { "Acessível pela internet ($u)" } elseif ($u) { 'Túnel da internet publicado, mas não respondeu' } else { 'Túnel da internet ainda não abriu (aguarde 1–2 min)' }) $(if (-not $ok) { 'reiniciar' })
      } else {
        $m = if ($e) { Min-Desde $(if ($e.vivoEm) { $e.vivoEm } else { $e.em }) } else { 99999 }
        & $add ($m -lt 6) "Este computador é RESERVA. Servidor ativo: $($e.pc) (sinal há $m min)" $null
      }
    }
  } else {
    & $add $net $(if ($net) { 'Internet funcionando' } else { 'Sem internet neste computador' }) $null
  }
  # servidor ativo da empresa (visto pela internet)
  if ($e) {
    $m = Min-Desde $(if ($e.vivoEm) { $e.vivoEm } else { $e.em }); $ok = ($m -lt 6) -and (Testar-Url "$($e.url)")
    & $add $ok $(if ($ok) { "Servidor da VTN no ar: $($e.pc) (sinal há $m min)" } elseif ($m -lt 6) { "Servidor $($e.pc) deu sinal há $m min, mas não respondeu pela internet" } else { "Servidor da VTN FORA DO AR – último sinal de $($e.pc) há $(if ($m -ge 1440) { [int]($m / 1440) + ' dia(s)' } elseif ($m -ge 60) { [int]($m / 60) + ' h' } else { "$m min" })" }) $(if (-not $ok -and -not $temServidor) { 'remoto' })
  }
  return $L
}

function Cor($L) {
  if (-not $L.Count) { return 'cinza' }
  $empresa = $L | Where-Object { $_.texto -like 'Servidor da VTN*' -or $_.texto -like 'Servidor * deu sinal*' -or $_.texto -like '*FORA DO AR*' } | Select-Object -First 1
  if ($temServidor) {
    if ($L | Where-Object { -not $_.ok -and ($_.texto -like '*DESLIGADO*' -or $_.texto -like '*não instalado*') }) { if ($empresa -and $empresa.ok) { return 'amarelo' } else { return 'vermelho' } }
    if ($L | Where-Object { $_.texto -like '*RESERVA*' }) { if ($L | Where-Object { -not $_.ok }) { return 'amarelo' } else { return 'azul' } }
    if ($L | Where-Object { -not $_.ok }) { return 'amarelo' }
    return 'verde'
  }
  if ($empresa -and $empresa.ok) { return 'verde' } elseif ($empresa) { return 'vermelho' } else { return 'amarelo' }
}

$ni = New-Object Windows.Forms.NotifyIcon
$ni.Icon = $icones.cinza; $ni.Text = 'VTN Hub – conferindo…'; $ni.Visible = $true

function Acao([string]$a) {
  switch ($a) {
    'ligar' { Start-ScheduledTask -TaskPath '\VTN Hub\' -TaskName 'Servidor'; if (-not (Get-ScheduledTask -TaskPath '\VTN Hub\' -TaskName 'Servidor')) { Start-Process powershell.exe -WindowStyle Hidden -ArgumentList "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $Programa 'rotinas\servidor.ps1')`"" }; $ni.ShowBalloonTip(5000, 'VTN Hub', 'Ligando o servidor… em 1 minuto ele aparece aqui.', 'Info') }
    'reiniciar' { Stop-ScheduledTask -TaskPath '\VTN Hub\' -TaskName 'Servidor'; Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object { $_.CommandLine -like '*servidor.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }; Start-Sleep 2; Start-ScheduledTask -TaskPath '\VTN Hub\' -TaskName 'Servidor'; $ni.ShowBalloonTip(5000, 'VTN Hub', 'Servidor reiniciado. O túnel abre em 1–2 minutos.', 'Info') }
    'onedrive' { foreach ($p in @("$env:LOCALAPPDATA\Microsoft\OneDrive\OneDrive.exe", "$env:ProgramFiles\Microsoft OneDrive\OneDrive.exe")) { if (Test-Path $p) { Start-Process $p; break } } }
    'instalar' { $f = Get-ChildItem ([Environment]::GetFolderPath('Desktop')) -Filter 'INSTALAR*VTN*' | Select-Object -First 1; if ($f) { Start-Process $f.FullName } else { Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $Programa 'rotinas\instalar_rotinas.ps1')`"" } }
    'github' { Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $Programa 'rotinas\ligar_copia_github.ps1')`"" }
    'remoto' { [Windows.Forms.MessageBox]::Show("O servidor da VTN está desligado.`n`nPara ligar: ligue o computador $($script:end.pc) na tomada, entre no Windows e confira se o OneDrive abriu. O servidor liga sozinho em 1 minuto.`n`nSe houver servidor reserva, ele assume sozinho em até 10 minutos.", 'VTN Hub') | Out-Null }
    'app' { Start-Process "https://victor-bertoni.github.io/vtn-hub/" }
    'log' { if (Test-Path $Log) { Start-Process notepad.exe $Log } }
  }
}

function Painel {
  $f = New-Object Windows.Forms.Form; $f.Text = 'VTN Hub – servidor'; $f.Size = New-Object Drawing.Size(560, 460); $f.StartPosition = 'Manual'
  $wa = [Windows.Forms.Screen]::PrimaryScreen.WorkingArea; $f.Location = New-Object Drawing.Point(($wa.Right - 570), ($wa.Bottom - 470)); $f.TopMost = $true; $f.FormBorderStyle = 'FixedToolWindow'; $f.Font = New-Object Drawing.Font('Segoe UI', 9.5); $f.BackColor = 'White'
  $t = New-Object Windows.Forms.Label; $t.Text = $script:resumo; $t.Font = New-Object Drawing.Font('Segoe UI', 12, [Drawing.FontStyle]::Bold); $t.AutoSize = $false; $t.Size = New-Object Drawing.Size(520, 50); $t.Location = New-Object Drawing.Point(14, 10); $f.Controls.Add($t)
  $y = 66
  foreach ($i in $script:itens) {
    $l = New-Object Windows.Forms.Label; $l.Text = $(if ($i.ok) { '✔  ' } else { '✖  ' }) + $i.texto; $l.ForeColor = $(if ($i.ok) { [Drawing.Color]::FromArgb(21, 128, 61) } else { [Drawing.Color]::FromArgb(185, 28, 28) }); $l.AutoSize = $false; $l.Size = New-Object Drawing.Size(390, 36); $l.Location = New-Object Drawing.Point(14, $y); $f.Controls.Add($l)
    if ($i.acao) { $b = New-Object Windows.Forms.Button; $b.Text = @{ ligar = 'Ligar agora'; reiniciar = 'Reiniciar'; onedrive = 'Abrir OneDrive'; instalar = 'Instalar'; github = 'Configurar'; remoto = 'Como ligar' }[$i.acao]; $b.Size = New-Object Drawing.Size(120, 28); $b.Location = New-Object Drawing.Point(410, ($y - 2)); $b.Tag = $i.acao; $b.Add_Click({ param($s) Acao $s.Tag; $f.Close() }); $f.Controls.Add($b) }
    $y += 38
  }
  $b1 = New-Object Windows.Forms.Button; $b1.Text = 'Abrir o VTN Hub'; $b1.Size = New-Object Drawing.Size(150, 32); $b1.Location = New-Object Drawing.Point(14, ($f.ClientSize.Height - 46)); $b1.Add_Click({ Acao 'app' }); $f.Controls.Add($b1)
  if ($temServidor) { $b2 = New-Object Windows.Forms.Button; $b2.Text = 'Ver registro (log)'; $b2.Size = New-Object Drawing.Size(150, 32); $b2.Location = New-Object Drawing.Point(172, ($f.ClientSize.Height - 46)); $b2.Add_Click({ Acao 'log' }); $f.Controls.Add($b2) }
  $b3 = New-Object Windows.Forms.Button; $b3.Text = 'Conferir de novo'; $b3.Size = New-Object Drawing.Size(150, 32); $b3.Location = New-Object Drawing.Point(380, ($f.ClientSize.Height - 46)); $b3.Add_Click({ $script:endLido = [datetime]::MinValue; Atualizar; $f.Close(); Painel }); $f.Controls.Add($b3)
  $f.ShowDialog() | Out-Null
}

function Atualizar {
  $L = @(Conferir); $cor = Cor $L; $script:itens = $L
  $falta = @($L | Where-Object { -not $_.ok })
  $script:resumo = switch ($cor) {
    'verde' { if ($temServidor) { '● Servidor LIGADO neste computador' } else { '● Servidor da VTN no ar' } }
    'azul' { '● Este computador é reserva – servidor da VTN no ar' }
    'amarelo' { "● Atenção: $($falta.Count) item(ns) para conferir" }
    'vermelho' { '● Servidor DESLIGADO – veja o que falta' }
    default { 'Conferindo…' }
  }
  $ni.Icon = $icones[$cor]
  $dica = 'VTN Hub: ' + $(switch ($cor) { 'verde' { 'servidor ligado' } 'azul' { 'reserva; servidor no ar' } 'amarelo' { if ($falta.Count) { $falta[0].texto } else { 'conferindo o servidor da VTN' } } 'vermelho' { 'servidor DESLIGADO' } default { '…' } })
  $ni.Text = $dica.Substring(0, [Math]::Min(63, $dica.Length))
  if ($script:estado -and $script:estado -ne $cor) {
    $tipo = if ($cor -eq 'vermelho') { 'Error' } elseif ($cor -eq 'amarelo') { 'Warning' } else { 'Info' }
    $txt = if ($falta.Count) { ($falta | Select-Object -First 2 | ForEach-Object { $_.texto }) -join "`n" } else { 'Tudo certo.' }
    $ni.ShowBalloonTip(8000, $script:resumo.TrimStart('● '), $txt, $tipo)
  }
  $script:estado = $cor
}

$menu = New-Object Windows.Forms.ContextMenuStrip
[void]$menu.Items.Add('Ver situação do servidor', $null, { Painel })
[void]$menu.Items.Add('Abrir o VTN Hub', $null, { Acao 'app' })
if ($temServidor) { [void]$menu.Items.Add('Ligar / reiniciar o servidor', $null, { if (Info-Local) { Acao 'reiniciar' } else { Acao 'ligar' } }); [void]$menu.Items.Add('Ver registro (log)', $null, { Acao 'log' }) }
[void]$menu.Items.Add('-')
[void]$menu.Items.Add('Fechar o monitor', $null, { $ni.Visible = $false; [Windows.Forms.Application]::Exit() })
$ni.ContextMenuStrip = $menu
$ni.Add_MouseClick({ param($s, $ev) if ($ev.Button -eq 'Left') { Painel } })
$ni.Add_BalloonTipClicked({ Painel })

$timer = New-Object Windows.Forms.Timer; $timer.Interval = 20000; $timer.Add_Tick({ Atualizar }); $timer.Start()
Atualizar
[Windows.Forms.Application]::Run()
$ni.Dispose()
