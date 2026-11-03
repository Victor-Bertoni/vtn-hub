# =========================================================
#  VTN HUB – LIGAR O E-MAIL DO SERVIDOR (uma vez)
#  Para o link de "Esqueci a senha" dos administradores chegar por e-mail.
#  Usa uma conta Gmail com "senha de app" (o Google exige verificação em 2 etapas ligada).
#  A senha de app fica guardada protegida pelo Windows neste computador.
# =========================================================
. (Join-Path $PSScriptRoot 'config.ps1')
. (Join-Path $PSScriptRoot 'copia.ps1')
. (Join-Path $PSScriptRoot 'email.ps1')
Write-Host 'E-MAIL DO VTN HUB (recuperação de senha dos administradores)' -ForegroundColor Cyan
Write-Host ''
$de = (Read-Host 'Gmail que vai enviar os e-mails [Enter = victorhugobertoni@gmail.com]').Trim()
if (-not $de) { $de = 'victorhugobertoni@gmail.com' }
Write-Host ''
Write-Host 'Vai abrir a página do Google "Senhas de app". Entre na conta, dê o nome "VTN Hub" e clique em Criar.'
Write-Host 'Copie a senha de 16 letras que aparece e cole aqui (botão direito). Nada aparece enquanto cola; é normal.' -ForegroundColor Yellow
Start-Process 'https://myaccount.google.com/apppasswords'
$seg = Read-Host 'Senha de app' -AsSecureString
$senha = ([Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($seg))) -replace '\s', ''
if (-not $senha) { Write-Host 'Nada colado. Rode de novo quando quiser.'; Start-Sleep 10; exit }
[IO.File]::WriteAllText($ArqEmailCfg, (@{ de = $de; host = 'smtp.gmail.com'; porta = 587 } | ConvertTo-Json -Compress), $utf8sb)
Protegido-Gravar $ArqEmailSenha $utf8sb.GetBytes($senha)
try {
  Enviar-Email $de 'VTN Hub – e-mail ligado' '<p>O servidor do VTN Hub já consegue enviar e-mails de recuperação de senha.</p>'
  Write-Host ''; Write-Host "PRONTO. E-mail de teste enviado para $de." -ForegroundColor Green
  Escrever-Log "E-mail do servidor ligado ($de)"
  try { Stop-ScheduledTask -TaskPath '\VTN Hub\' -TaskName 'Servidor' -ErrorAction SilentlyContinue; Start-Sleep 2; Start-ScheduledTask -TaskPath '\VTN Hub\' -TaskName 'Servidor' } catch { }
} catch {
  Write-Host "Não foi possível enviar: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host 'Confira a senha de app (16 letras) e se a verificação em 2 etapas do Google está ligada. Rode de novo.'
}
Start-Sleep 15
