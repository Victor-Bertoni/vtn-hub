# =========================================================
#  VTN HUB – REDEFINIR SENHA DE ADMINISTRADOR (emergência, no computador servidor)
#  Para quando o e-mail não chegar. Só funciona neste computador (quem tem acesso a ele
#  já tem acesso aos dados). Grava a senha nova protegida em %LOCALAPPDATA%\VTN_Hub.
# =========================================================
. (Join-Path $PSScriptRoot 'config.ps1')
. (Join-Path $PSScriptRoot 'copia.ps1')
. (Join-Path $PSScriptRoot 'email.ps1')
Usar-PastaCompartilhada   # vale em todos os servidores (principal e reservas)
Write-Host 'REDEFINIR SENHA DE ADMINISTRADOR DO VTN HUB' -ForegroundColor Cyan
$adms = @(Usuarios-Ativos | Where-Object { $_.papel -eq 'admin' })
for ($i = 0; $i -lt $adms.Count; $i++) { Write-Host ("  {0}) {1} <{2}>" -f ($i + 1), $adms[$i].nome, $adms[$i].email) }
$n = Read-Host 'Número do administrador'
$u = $adms[[int]$n - 1]; if (-not $u) { Write-Host 'Opção inválida.'; Start-Sleep 8; exit }
$s1 = Read-Host 'Nova senha (mínimo 8)' -AsSecureString; $s2 = Read-Host 'Repita a nova senha' -AsSecureString
$p1 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s1))
$p2 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s2))
if ($p1 -ne $p2) { Write-Host 'As senhas não conferem.' -ForegroundColor Red; Start-Sleep 8; exit }
if ($p1.Length -lt 8) { Write-Host 'A senha precisa ter pelo menos 8 caracteres.' -ForegroundColor Red; Start-Sleep 8; exit }
Gravar-SenhaAdmin $u.id $p1
Escrever-Log "Senha de administrador redefinida no computador servidor: $($u.nome)"
Write-Host "PRONTO. $($u.nome) já pode entrar com a senha nova." -ForegroundColor Green
Start-Sleep 10
