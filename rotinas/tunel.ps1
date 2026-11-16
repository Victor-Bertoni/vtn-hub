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
$script:procTunel = $null; $script:urlTunel = ''; $script:inicioLog = 0L; $script:quedasRapidas = 0; $script:esperarTunel = $null; $script:rodadasTunel = 0

if (-not ('VtnErroTunel' -as [type])) {
  Add-Type -TypeDefinition @"
public class VtnErroTunel {
  private System.Text.StringBuilder sb = new System.Text.StringBuilder();
  public void Ligar(System.Diagnostics.Process p) {
    p.ErrorDataReceived += (s, e) => { if (e.Data != null) { lock (sb) { sb.AppendLine(e.Data); if (sb.Length > 20000) sb.Remove(0, 10000); } } };
    p.BeginErrorReadLine();
  }
  public string Texto() { lock (sb) { return sb.ToString(); } }
}
"@
}
$script:errTunel = $null

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
  # fecha só o túnel deste servidor ou um que ficou órfão (o servidor que o abriu já fechou)
  if ($script:procTunel) { try { if (-not $script:procTunel.HasExited) { $script:procTunel.Kill() } } catch { } }
  $velhos = @(Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.ExecutablePath -eq $Cf -and ($_.ParentProcessId -eq $PID -or -not (Get-Process -Id $_.ParentProcessId -ErrorAction SilentlyContinue)) } |
    ForEach-Object { Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue })
  $velhos | Stop-Process -Force -ErrorAction SilentlyContinue
  if ($velhos) { $velhos | Wait-Process -Timeout 10 -ErrorAction SilentlyContinue }
  # o registro do túnel anterior pode continuar no arquivo (se ele ainda estava preso): só vale o que vier depois daqui
  try { [IO.File]::WriteAllText($CfLog, '') } catch { }
  $script:inicioLog = 0L; try { $script:inicioLog = (Get-Item -LiteralPath $CfLog -ErrorAction Stop).Length } catch { }
  $pi = New-Object Diagnostics.ProcessStartInfo
  $pi.FileName = $Cf
  $pi.Arguments = "tunnel --no-autoupdate --loglevel info --logfile `"$CfLog`" --url http://127.0.0.1:$Porta --http-host-header localhost:$Porta"
  $pi.UseShellExecute = $false; $pi.CreateNoWindow = $true; $pi.RedirectStandardError = $true
  $script:procTunel = [Diagnostics.Process]::Start($pi)
  # lê o que o cloudflared escreve no stderr numa linha separada (sem isso ele poderia travar) e guarda o fim para mostrar o motivo de uma queda
  $script:errTunel = New-Object VtnErroTunel; try { $script:errTunel.Ligar($script:procTunel) } catch { }
  $script:urlTunel = ''; $script:urlCandidato = ''
  Escrever-Log 'Túnel da Cloudflare iniciando...'
}

function Parar-Tunel {
  try { if ($script:procTunel -and -not $script:procTunel.HasExited) { $script:procTunel.Kill() } } catch { }
  $script:procTunel = $null; $script:urlTunel = ''; $script:urlCandidato = ''
}

# Chamar de tempos em tempos. Devolve $true quando aparece um endereço novo JÁ FUNCIONANDO.
# O endereço só é publicado depois de responder pela internet: se o app tentasse antes, o aparelho
# guardava "endereço não existe" e ficava preso no modo consulta mesmo com o PC ligado.
$script:urlCandidato = ''; $script:candidatoDesde = [datetime]::MinValue; $script:testeTunel = $null
Add-Type -AssemblyName System.Net.Http
$script:clienteHttp = New-Object Net.Http.HttpClient; $script:clienteHttp.Timeout = [TimeSpan]::FromSeconds(10)
function Vigiar-Tunel {
  if (-not $script:procTunel) { return $false }
  if ($script:procTunel.HasExited) {
    if ($script:esperarTunel -and (Get-Date) -lt $script:esperarTunel) { return $false }
    $vida = 999; try { $vida = ((Get-Date) - $script:procTunel.StartTime).TotalSeconds } catch { }
    $motivo = ''
    try { Start-Sleep -Milliseconds 300; $err = $script:errTunel.Texto(); $l = @($err -split "`r?`n" | Where-Object { $_ -match 'ERR|error|failed|429|Too Many' }); if ($l) { $motivo = ($l[-1] -replace '^\S+\s+', '').Trim() } } catch { }
    if ($vida -lt 60) { $script:quedasRapidas++ } else { $script:quedasRapidas = 0; $script:rodadasTunel = 0 }
    if ($script:quedasRapidas -ge 3) {
      # a Cloudflare limita quantos túneis grátis podem ser pedidos seguidos: esperar cada vez mais (2, 4, 8, até 15 min)
      $script:quedasRapidas = 0; $script:rodadasTunel++
      $min = [Math]::Min(15, [Math]::Pow(2, $script:rodadasTunel)); $script:esperarTunel = (Get-Date).AddMinutes($min)
      Escrever-Log ("Túnel fechou logo ao abrir 3 vezes seguidas{0}; tentando de novo em {1} min" -f $(if ($motivo) { " ($motivo)" } else { '' }), $min); return $false
    }
    if ($motivo) { Escrever-Log "Túnel fechou: $motivo" }
    Escrever-Log 'Túnel caiu; ligando de novo'; Iniciar-Tunel; return $false
  }
  if ($script:urlTunel) { return $false }
  if (-not $script:urlCandidato) {
    try {
      $fs = [IO.File]::Open($CfLog, 'Open', 'Read', 'ReadWrite')
      if ($script:inicioLog -gt 0 -and $script:inicioLog -le $fs.Length) { [void]$fs.Seek($script:inicioLog, 'Begin') }
      $sr = New-Object IO.StreamReader($fs); $t = $sr.ReadToEnd(); $sr.Close()
      $achados = [regex]::Matches($t, 'https://[a-z0-9-]+\.trycloudflare\.com') | Where-Object { $_.Value -ne 'https://api.trycloudflare.com' }
      if ($achados) { $script:urlCandidato = @($achados)[-1].Value + '/'; $script:candidatoDesde = Get-Date; Escrever-Log "Túnel aberto: $($script:urlCandidato) (testando...)" }
    } catch { }
    if (-not $script:urlCandidato) { return $false }
  }
  # teste sem travar: o próprio servidor precisa responder a esse pedido enquanto ele espera
  $ok = $false
  if ($script:testeTunel -and $script:testeTunel.IsCompleted) {
    try { $ok = ($script:testeTunel.Status -eq 'RanToCompletion') -and ($script:testeTunel.Result -match '"ok"\s*:\s*true') } catch { }
    $script:testeTunel = $null
  }
  if (-not $ok -and -not $script:testeTunel) { try { $script:testeTunel = $script:clienteHttp.GetStringAsync($script:urlCandidato + 'api/info?teste=' + [guid]::NewGuid().ToString('N')) } catch { } }
  if ($ok) {
    $script:urlTunel = $script:urlCandidato
    [IO.File]::WriteAllText($ArqEndereco, $script:urlTunel)
    Escrever-Log "Endereço da internet (testado): $($script:urlTunel)"
    return $true
  }
  if (((Get-Date) - $script:candidatoDesde).TotalMinutes -ge 3) { Escrever-Log 'Túnel não respondeu em 3 min; abrindo outro'; Iniciar-Tunel }
  return $false
}
