# =========================================================
#  VTN HUB – ENDEREÇO DA INTERNET PARA A EQUIPE (Tailscale Funnel, gratuito)
#  Só o Victor precisa de conta no Tailscale (entra com o Google).
#  A equipe só abre o endereço no navegador e entra com e-mail e senha do VTN Hub.
#  Pode rodar de novo quando quiser: ele só confere e mostra o endereço.
#  Para desligar o acesso pela internet:  tailscale funnel --https=443 off
# =========================================================
. (Join-Path $PSScriptRoot 'config.ps1')
$Porta = 8737
$ts = @("$env:ProgramFiles\Tailscale\tailscale.exe", "${env:ProgramFiles(x86)}\Tailscale\tailscale.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1

# 1. instalar o Tailscale, se faltar
if (-not $ts) {
  Write-Host 'Instalando o Tailscale (programa gratuito que dá um endereço seguro https para este computador)...'
  $ok = $false
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    winget install --id Tailscale.Tailscale -e --silent --accept-source-agreements --accept-package-agreements
    $ts = "$env:ProgramFiles\Tailscale\tailscale.exe"; $ok = Test-Path $ts
  }
  if (-not $ok) {
    Write-Host 'Não deu para instalar sozinho. Vou abrir a página do Tailscale: baixe, instale e rode este arquivo de novo.'
    Start-Process 'https://tailscale.com/download/windows'; Read-Host 'Enter para fechar'; exit
  }
}

# 2. entrar na conta do Tailscale (abre o navegador; o Victor entra com a conta dele)
$st = & $ts status --json 2>$null | Out-String | ConvertFrom-Json -ErrorAction SilentlyContinue
if (-not $st -or $st.BackendState -ne 'Running') {
  Write-Host 'Vai abrir o navegador para você entrar no Tailscale (pode usar sua conta Google). Depois volte aqui.'
  & $ts up
  $st = & $ts status --json | Out-String | ConvertFrom-Json
}

# 3. publicar a porta do VTN Hub na internet (https). Na 1ª vez o Tailscale pode mostrar um link
#    para "habilitar Funnel" na conta: abra o link, confirme, e rode este arquivo de novo.
& $ts funnel --bg $Porta
if ($LASTEXITCODE -ne 0) { Write-Host 'Abra o link mostrado acima para habilitar o Funnel e rode este arquivo de novo.'; Read-Host 'Enter para fechar'; exit }

# 4. mostrar e guardar o endereço
$nome = "$($st.Self.DNSName)".TrimEnd('.')
$url = "https://$nome/"
Gravar-Doc 'sistema' 'endereco' @{ url = $url; atualizadoEm = (Get-Date).ToString('s') }
$txt = Join-Path ([Environment]::GetFolderPath('Desktop')) 'VTN Hub - endereço para a equipe.txt'
[IO.File]::WriteAllText($txt, "Endereço do VTN Hub para a equipe:`r`n$url`r`n`r`nAbrir no navegador (computador ou celular) e entrar com o e-mail e a senha do VTN Hub.`r`nNo computador: menu do navegador › Instalar VTN Hub, para ter o ícone.`r`nFunciona enquanto o computador do Victor estiver ligado.", (New-Object Text.UTF8Encoding $true))
try { Set-Clipboard -Value $url } catch { }
Escrever-Log "Endereço da internet: $url"
Write-Host ''
Write-Host "PRONTO. Endereço para a equipe: $url" -ForegroundColor Green
Write-Host '(já copiado; também salvo na área de trabalho em "VTN Hub - endereço para a equipe.txt")'
Read-Host 'Enter para fechar'
