# =========================================================
#  VTN HUB – ENDEREÇO DA INTERNET
#  Não usa mais o Tailscale: o servidor abre sozinho um túnel gratuito da Cloudflare
#  (sem conta) e publica o endereço no GitHub. A equipe usa sempre o site
#  https://victor-bertoni.github.io/vtn-hub/ (ou o APK), que acha este computador sozinho.
#  Este arquivo só confere o endereço atual e liga a publicação no GitHub, se faltar.
# =========================================================
. (Join-Path $PSScriptRoot 'config.ps1')
. (Join-Path $PSScriptRoot 'copia.ps1')
$ae = Join-Path $DirLocal 'endereco.txt'
if (Test-Path $ae) { Write-Host "Endereço atual do túnel: $((Get-Content -Raw $ae).Trim())" -ForegroundColor Green } else { Write-Host 'O túnel ainda não abriu (o servidor liga sozinho com o Windows).' }
Write-Host 'A equipe usa: https://victor-bertoni.github.io/vtn-hub/  (no celular, o app VTN Hub com esse mesmo endereço)'
if (-not (Token-GitHub)) { Write-Host ''; Write-Host 'Falta ligar a publicação no GitHub:'; & (Join-Path $PSScriptRoot 'ligar_copia_github.ps1') } else { Read-Host 'Enter para fechar' }
