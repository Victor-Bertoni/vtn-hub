# =========================================================
#  VTN HUB – CÓPIA DE CONSULTA NO GITHUB (para quando o PC estiver desligado)
#  Usado por servidor.ps1 e ligar_copia_github.ps1 (não rodar sozinho).
#  • Junta os documentos de BANCO DE DADOS\vtn e \sistema, compacta (gzip) e
#    criptografa (AES-256-CBC + HMAC-SHA256) com uma chave aleatória deste PC.
#  • Essa chave é guardada "embrulhada" com a senha de cada pessoa (PBKDF2-SHA256):
#    só quem sabe e-mail + senha do VTN Hub abre a cópia. A senha nunca é gravada.
#  • Publica no GitHub, ramo "consulta" (um único commit, substituído a cada envio,
#    para o repositório não crescer). O app lê de raw.githubusercontent.com.
#  Arquivos locais (fora do OneDrive): %LOCALAPPDATA%\VTN_Hub\
#    chave_consulta.bin  chave dos dados (protegida pelo Windows / DPAPI)
#    chaves_usuarios.json chave embrulhada por pessoa (gerada quando ela entra no VTN Hub)
#    github_token.bin    token do GitHub (protegido pelo Windows / DPAPI)
# =========================================================
Add-Type -AssemblyName System.Security
$DirLocal = Join-Path $env:LOCALAPPDATA 'VTN_Hub'
New-Item -ItemType Directory -Force -Path $DirLocal | Out-Null
$ArqChave = Join-Path $DirLocal 'chave_consulta.bin'
$ArqChavesUs = Join-Path $DirLocal 'chaves_usuarios.json'
$ArqToken = Join-Path $DirLocal 'github_token.bin'
$IterCopia = 600000
$utf8sb = New-Object Text.UTF8Encoding $false

function Bytes-Aleatorios([int]$n) { $b = New-Object byte[] $n; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); return ,$b }
function Protegido-Ler([string]$arq) { if (-not (Test-Path $arq)) { return $null }; return ,[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($arq), $null, 'CurrentUser') }
function Protegido-Gravar([string]$arq, [byte[]]$b) { [IO.File]::WriteAllBytes($arq, [Security.Cryptography.ProtectedData]::Protect($b, $null, 'CurrentUser')) }

function Chave-Dados {
  $k = Protegido-Ler $ArqChave
  if (-not $k) { $k = Bytes-Aleatorios 64; Protegido-Gravar $ArqChave $k }
  return ,$k
}
function Derivar([string]$senha, [byte[]]$salt) {
  $d = New-Object Security.Cryptography.Rfc2898DeriveBytes($senha, $salt, $IterCopia, [Security.Cryptography.HashAlgorithmName]::SHA256)
  return ,$d.GetBytes(64)
}
# k64 = 32 bytes AES + 32 bytes HMAC. Devolve @{ iv; ct; mac } em base64 (mac = HMAC(iv || ct))
function Cifrar([byte[]]$k64, [byte[]]$dados) {
  $aes = [Security.Cryptography.Aes]::Create(); $aes.Mode = 'CBC'; $aes.Padding = 'PKCS7'
  $aes.Key = [byte[]]$k64[0..31]; $iv = Bytes-Aleatorios 16; $aes.IV = $iv
  $ct = $aes.CreateEncryptor().TransformFinalBlock($dados, 0, $dados.Length)
  $h = [Security.Cryptography.HMACSHA256]::new([byte[]]$k64[32..63])
  $mac = $h.ComputeHash([byte[]]($iv + $ct))
  return [ordered]@{ iv = [Convert]::ToBase64String($iv); ct = [Convert]::ToBase64String($ct); mac = [Convert]::ToBase64String($mac) }
}
function Sha256Hex([string]$t) { $s = [Security.Cryptography.SHA256]::Create(); (($s.ComputeHash($utf8sb.GetBytes($t)) | ForEach-Object { $_.ToString('x2') }) -join '') }

function Ler-ChavesUsuarios {
  $o = @{}
  if (Test-Path $ArqChavesUs) { try { (Get-Content -Raw -Encoding UTF8 $ArqChavesUs | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $o[$_.Name] = $_.Value } } catch { } }
  return $o
}
# Chamado no login (o servidor recebe a senha só nesse momento): embrulha a chave dos dados com a senha da pessoa.
function Registrar-ChaveUsuario($u, [string]$senha) {
  $h = Sha256Hex ('vtn:' + "$($u.email)".Trim().ToLower())
  $todas = Ler-ChavesUsuarios
  if ($todas[$h] -and $todas[$h].ver -eq "$($u.senhaHash)") { return $false }   # já embrulhada com esta senha
  $salt = Bytes-Aleatorios 16
  $c = Cifrar (Derivar $senha $salt) (Chave-Dados)
  $c['salt'] = [Convert]::ToBase64String($salt); $c['ver'] = "$($u.senhaHash)"; $c['id'] = "$($u.id)"
  $todas[$h] = $c
  [IO.File]::WriteAllText($ArqChavesUs, ($todas | ConvertTo-Json -Depth 4 -Compress), $utf8sb)
  return $true
}

function Montar-Copia([string]$banco, $usuariosAtivos) {
  $sb = New-Object Text.StringBuilder
  [void]$sb.Append('{')
  $primeiraCol = $true
  foreach ($col in @('vtn', 'sistema')) {
    $dir = Join-Path $banco $col
    if (-not $primeiraCol) { [void]$sb.Append(',') }; $primeiraCol = $false
    [void]$sb.Append('"' + $col + '":{')
    $prim = $true
    Get-ChildItem -LiteralPath $dir -File -Filter '*.json' -ErrorAction SilentlyContinue | Where-Object { $_.Name -notlike '~*' } | ForEach-Object {
      $txt = [IO.File]::ReadAllText($_.FullName, $utf8sb).Trim()
      if (-not $txt) { return }
      if (-not $prim) { [void]$sb.Append(',') }; $prim = $false
      [void]$sb.Append('"' + $_.BaseName.Replace('"', '') + '":' + $txt)
    }
    [void]$sb.Append('}')
  }
  [void]$sb.Append('}')
  # gzip
  $ms = New-Object IO.MemoryStream
  $gz = New-Object IO.Compression.GZipStream($ms, [IO.Compression.CompressionMode]::Compress)
  $b = $utf8sb.GetBytes($sb.ToString()); $gz.Write($b, 0, $b.Length); $gz.Close()
  $dados = Cifrar (Chave-Dados) $ms.ToArray()
  # só pessoas ativas no cadastro atual
  $ativos = @{}; foreach ($u in $usuariosAtivos) { if ($u.ativo -ne $false -and $u.email) { $ativos[(Sha256Hex ('vtn:' + "$($u.email)".Trim().ToLower()))] = $true } }
  $ch = [ordered]@{}
  $todas = Ler-ChavesUsuarios
  foreach ($k in $todas.Keys) { if ($ativos[$k]) { $v = $todas[$k]; $ch[$k] = [ordered]@{ salt = $v.salt; iv = $v.iv; ct = $v.ct; mac = $v.mac } } }
  $pac = [ordered]@{ v = 1; geradoEm = (Get-Date).ToUniversalTime().ToString('o'); iter = $IterCopia; chaves = $ch; dados = $dados }
  return ($pac | ConvertTo-Json -Depth 5 -Compress)
}

function Token-GitHub { $b = Protegido-Ler $ArqToken; if ($b) { return $utf8sb.GetString($b) } else { return $null } }

function Publicar-Copia([string]$banco, $usuariosAtivos, [string]$repo) {
  $tok = Token-GitHub; if (-not $tok) { return 'sem token' }
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $json = Montar-Copia $banco $usuariosAtivos
  $h = @{ Authorization = "Bearer $tok"; Accept = 'application/vnd.github+json'; 'User-Agent' = 'VTN-Hub-servidor'; 'X-GitHub-Api-Version' = '2022-11-28' }
  $api = "https://api.github.com/repos/$repo/git"
  function Postar($url, $obj, $metodo = 'POST') { Invoke-RestMethod -Method $metodo -Uri $url -Headers $h -ContentType 'application/json; charset=utf-8' -Body $utf8sb.GetBytes(($obj | ConvertTo-Json -Depth 5 -Compress)) -TimeoutSec 60 }
  $blob = Postar "$api/blobs" @{ content = [Convert]::ToBase64String($utf8sb.GetBytes($json)); encoding = 'base64' }
  $tree = Postar "$api/trees" @{ tree = @(@{ path = 'dados.json'; mode = '100644'; type = 'blob'; sha = $blob.sha }) }
  $com = Postar "$api/commits" @{ message = 'Cópia de consulta (criptografada)'; tree = $tree.sha; parents = @() }
  try { Postar "$api/refs/heads/consulta" @{ sha = $com.sha; force = $true } 'PATCH' | Out-Null }
  catch { Postar "$api/refs" @{ ref = 'refs/heads/consulta'; sha = $com.sha } | Out-Null }
  return 'ok'
}
