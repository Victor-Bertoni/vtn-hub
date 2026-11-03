# =========================================================
#  VTN HUB – TÚNEL DA CLOUDFLARE (endereço da internet, sem conta e sem Tailscale)
#  Usado por servidor.ps1 (não rodar sozinho).
#  • Baixa o cloudflared oficial (github.com/cloudflare/cloudflared) para %LOCALAPPDATA%\VTN_Hub
#  • Abre um "quick tunnel": https://<nome>.trycloudflare.com  ->  http://localhost:8737
#  • O endereço muda quando o túnel reinicia; o servidor publica o endereço atual no GitHub
#    (ramo "consulta", arquivo endereco.json) e o app acha o PC sozinho.
#  Desligar: parar a tarefa "VTN Hub › Servidor" (o túnel fecha junto).
# =========================================================
$Cf = Join-Path $DirLocal 'cloudflared.exe'
$CfLog = Join-Path $DirLocal 'tunel.log'
$ArqEndereco = Join-Path $DirLocal 'endereco.txt'
$script:procTunel = $null; $script:urlTunel = ''

function Baixar-Cloudflared {
  if (Test-Path $Cf) { return $true }
  try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile "$Cf.baixando" -TimeoutSec 300
    Move-Item -LiteralPath "$Cf.baixando" -Destination $Cf -Force
    Escrever-Log 'cloudflared (túnel da Cloudflare) baixado'
    return $true
  } catch { Escrever-Log "Aviso: não foi possível baixar o cloudflared: $($_.Exception.Message)"; return $false }
}

function Iniciar-Tunel {
  if (-not (Baixar-Cloudflared)) { return }
  # fecha um túnel antigo deste mesmo programa (de uma execução anterior do servidor)
  Get-Process cloudflared -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $Cf } | Stop-Process -Force -ErrorAction SilentlyContinue
  [IO.File]::WriteAllText($CfLog, '')
  $pi = New-Object Diagnostics.ProcessStartInfo
  $pi.FileName = $Cf
  $pi.Arguments = "tunnel --no-autoupdate --loglevel info --logfile `"$CfLog`" --url http://localhost:$Porta --http-host-header localhost:$Porta"
  $pi.UseShellExecute = $false; $pi.CreateNoWindow = $true
  $script:procTunel = [Diagnostics.Process]::Start($pi)
  $script:urlTunel = ''
  Escrever-Log 'Túnel da Cloudflare iniciando...'
}

# Chamar de tempos em tempos. Devolve $true quando aparece um endereço novo.
function Vigiar-Tunel {
  if (-not $script:procTunel) { return $false }
  if ($script:procTunel.HasExited) { Escrever-Log 'Túnel caiu; ligando de novo'; Iniciar-Tunel; return $false }
  if ($script:urlTunel) { return $false }
  try {
    $fs = [IO.File]::Open($CfLog, 'Open', 'Read', 'ReadWrite'); $sr = New-Object IO.StreamReader($fs); $t = $sr.ReadToEnd(); $sr.Close()
    if ($t -match 'https://[a-z0-9-]+\.trycloudflare\.com') {
      $script:urlTunel = $Matches[0] + '/'
      [IO.File]::WriteAllText($ArqEndereco, $script:urlTunel)
      Escrever-Log "Endereço da internet: $($script:urlTunel)"
      return $true
    }
  } catch { }
  return $false
}
