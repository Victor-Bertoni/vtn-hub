# =========================================================
#  VTN HUB – E-MAIL DO SERVIDOR (recuperação de senha dos administradores)
#  Usado por servidor.ps1, ligar_email.ps1 e redefinir_senha_admin.ps1 (não rodar sozinho).
#  Envia pelo Gmail (smtp.gmail.com:587) com uma "senha de app" do Google, guardada
#  protegida pelo Windows em %LOCALAPPDATA%\VTN_Hub\email_senha.bin (nunca no OneDrive/GitHub).
#  Senha nova de administrador fica em %LOCALAPPDATA%\VTN_Hub\senhas_admin.json (só o servidor lê/grava).
# =========================================================
$ArqEmailCfg = Join-Path $DirLocal 'email.json'
$ArqEmailSenha = Join-Path $DirLocal 'email_senha.bin'
$ArqSenhasAdmin = Join-Path $DirLocal 'senhas_admin.json'

function Email-Config { if (Test-Path $ArqEmailCfg) { try { return (Get-Content -Raw -Encoding UTF8 $ArqEmailCfg | ConvertFrom-Json) } catch { } }; return $null }
function Email-Ligado { return [bool]((Email-Config) -and (Test-Path $ArqEmailSenha)) }

function Enviar-Email([string]$para, [string]$assunto, [string]$html) {
  $cfg = Email-Config; if (-not $cfg) { throw 'e-mail do servidor não configurado (rode LIGAR EMAIL VTN HUB)' }
  $senha = $utf8sb.GetString((Protegido-Ler $ArqEmailSenha))
  $msg = New-Object Net.Mail.MailMessage
  $msg.From = New-Object Net.Mail.MailAddress($cfg.de, 'VTN Hub')
  $msg.To.Add($para); $msg.Subject = $assunto; $msg.Body = $html; $msg.IsBodyHtml = $true
  $msg.BodyEncoding = [Text.Encoding]::UTF8; $msg.SubjectEncoding = [Text.Encoding]::UTF8
  $smtp = New-Object Net.Mail.SmtpClient($(if ($cfg.host) { $cfg.host } else { 'smtp.gmail.com' }), $(if ($cfg.porta) { [int]$cfg.porta } else { 587 }))
  $smtp.EnableSsl = $true; $smtp.Credentials = New-Object Net.NetworkCredential($cfg.de, $senha)
  try { $smtp.Send($msg) } finally { $msg.Dispose(); $smtp.Dispose() }
}

# senha nova de administrador (vale se for mais nova que a do cadastro)
function Ler-SenhasAdmin { $o = @{}; if (Test-Path $ArqSenhasAdmin) { try { (Get-Content -Raw -Encoding UTF8 $ArqSenhasAdmin | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $o[$_.Name] = $_.Value } } catch { } }; return $o }
function Gravar-SenhaAdmin([string]$usId, [string]$senha) {
  $salt = -join ((Bytes-Aleatorios 8) | ForEach-Object { $_.ToString('x2') })
  $sha = [Security.Cryptography.SHA256]::Create()
  $hash = -join ($sha.ComputeHash($utf8sb.GetBytes("${salt}:$senha")) | ForEach-Object { $_.ToString('x2') })
  $todas = Ler-SenhasAdmin
  $todas[$usId] = [ordered]@{ salt = $salt; senhaHash = $hash; em = (Get-Date).ToUniversalTime().ToString('o') }
  [IO.File]::WriteAllText($ArqSenhasAdmin, ($todas | ConvertTo-Json -Depth 4 -Compress), $utf8sb)
}
