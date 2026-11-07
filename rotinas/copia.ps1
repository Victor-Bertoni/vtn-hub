# =========================================================
#  VTN HUB – CÓPIA DE CONSULTA NO GITHUB (para quando o PC estiver desligado)
#  Usado por servidor.ps1 e ligar_copia_github.ps1 (não rodar sozinho).
#  • Junta os documentos de BANCO DE DADOS\vtn e \sistema, compacta (gzip) e
#    criptografa (AES-256-CBC + HMAC-SHA256) com uma chave aleatória deste PC.
#  • Essa chave é guardada "embrulhada" com a senha de cada pessoa (PBKDF2-SHA256):
#    só quem sabe e-mail + senha do VTN Hub abre a cópia. A senha nunca é gravada.
#  • Publica no GitHub, ramo "consulta" (um único commit, substituído a cada envio,
#    para o repositório não crescer). O app lê de raw.githubusercontent.com.
#  • Junto vai endereco.json com o endereço atual do túnel (sem dados; só para o app achar o PC).
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
# Protegido pelo Windows (DPAPI). Grava no escopo do computador (LocalMachine): assim o servidor
# também lê quando liga antes de alguém entrar no Windows. Lê os dois escopos (arquivos antigos eram CurrentUser).
function Protegido-Ler([string]$arq) {
  if (-not (Test-Path $arq)) { return $null }
  $b = [IO.File]::ReadAllBytes($arq)
  foreach ($esc in @('LocalMachine', 'CurrentUser')) { try { return ,[Security.Cryptography.ProtectedData]::Unprotect($b, $null, $esc) } catch { } }
  return $null
}
function Protegido-Gravar([string]$arq, [byte[]]$b) { [IO.File]::WriteAllBytes($arq, [Security.Cryptography.ProtectedData]::Protect($b, $null, 'LocalMachine')) }

# ---------- pasta compartilhada dos servidores: OneDrive\00_VTN\_servidor ----------
# Fica FORA de "BANCO DE DADOS" (o app não lê essa pasta) e só existe para quem tem a pasta 00_VTN no OneDrive
# (Victor e Ismael). Guarda o que um servidor reserva precisa para assumir sem pedir nada a ninguém:
# sessões (ninguém precisa entrar de novo), chaves da cópia de consulta e o token do GitHub (embrulhados).
$DirComp = Join-Path (Split-Path $Banco -Parent) '_servidor'
$ArqSegredos = Join-Path $DirComp 'segredos.json'
function Comp-Ok { return (Test-Path -LiteralPath (Split-Path $Banco -Parent)) }
function Chave-Embrulho { $s = [Security.Cryptography.SHA256]::Create(); $a = $s.ComputeHash($utf8sb.GetBytes('VTN-Hub/servidor/a/' + $Repo)); $b = $s.ComputeHash($utf8sb.GetBytes('VTN-Hub/servidor/b/' + $Repo)); return ,[byte[]]($a + $b) }
function Embrulhar([byte[]]$b) { return (Cifrar (Chave-Embrulho) $b) }
function Desembrulhar($c) {
  try {
    $k = Chave-Embrulho; $iv = [Convert]::FromBase64String($c.iv); $ct = [Convert]::FromBase64String($c.ct)
    $h = [Security.Cryptography.HMACSHA256]::new([byte[]]$k[32..63])
    if ([Convert]::ToBase64String($h.ComputeHash([byte[]]($iv + $ct))) -ne $c.mac) { return $null }
    $aes = [Security.Cryptography.Aes]::Create(); $aes.Mode = 'CBC'; $aes.Padding = 'PKCS7'; $aes.Key = [byte[]]$k[0..31]; $aes.IV = $iv
    return ,$aes.CreateDecryptor().TransformFinalBlock($ct, 0, $ct.Length)
  } catch { return $null }
}
function Ler-Segredos { $o = @{}; if (Test-Path -LiteralPath $ArqSegredos) { try { (Get-Content -Raw -Encoding UTF8 -LiteralPath $ArqSegredos | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $o[$_.Name] = $_.Value } } catch { } }; return $o }
function Segredo-Compartilhado([string]$nome) { $s = Ler-Segredos; if ($s[$nome]) { return ,(Desembrulhar $s[$nome]) }; return $null }
# grava/atualiza um segredo na pasta compartilhada (só acrescenta ou troca o próprio item)
function Compartilhar-Segredo([string]$nome, [byte[]]$b) {
  if (-not $b -or -not (Comp-Ok)) { return }
  try {
    New-Item -ItemType Directory -Force -Path $DirComp | Out-Null
    $s = Ler-Segredos; $atual = if ($s[$nome]) { Desembrulhar $s[$nome] } else { $null }
    if ($atual -and ([Convert]::ToBase64String($atual) -eq [Convert]::ToBase64String($b))) { return }
    $s[$nome] = Embrulhar $b
    [IO.File]::WriteAllText($ArqSegredos, ($s | ConvertTo-Json -Depth 4 -Compress), $utf8sb)
  } catch { }
}

# chave dos dados da cópia de consulta: a mesma em todos os servidores (quem já entrou abre a cópia de qualquer um)
function Chave-Dados {
  $k = Protegido-Ler $ArqChave
  if (-not $k) { $k = Segredo-Compartilhado 'chave'; if ($k) { Protegido-Gravar $ArqChave $k } }
  if (-not $k) { $k = Bytes-Aleatorios 64; Protegido-Gravar $ArqChave $k }
  Compartilhar-Segredo 'chave' $k
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

# usuários do banco (pastas vtn\usuarios__*.json), para incluir na cópia só quem está ativo
function Usuarios-Ativos {
  $us = @()
  Get-ChildItem -LiteralPath (Join-Path $Banco 'vtn') -Filter 'usuarios__*.json' -ErrorAction SilentlyContinue | ForEach-Object { foreach ($x in ((Get-Content -Raw -Encoding UTF8 $_.FullName | ConvertFrom-Json).json | ConvertFrom-Json)) { $us += $x } }
  return $us
}
function Token-GitHub {
  $b = Protegido-Ler $ArqToken
  if (-not $b) { $b = Segredo-Compartilhado 'github'; if ($b) { try { Protegido-Gravar $ArqToken $b } catch { } } }   # computador novo: usa o token que já está na pasta compartilhada
  if ($b) { return $utf8sb.GetString($b) } else { return $null }
}
function Compartilhar-Token { $b = Protegido-Ler $ArqToken; if ($b) { Compartilhar-Segredo 'github' $b } }

# arquivos que todos os servidores usam juntos (passam para a pasta compartilhada; a cópia local antiga fica como está)
function Usar-PastaCompartilhada {
  if (-not (Comp-Ok)) { return }
  New-Item -ItemType Directory -Force -Path $DirComp | Out-Null
  foreach ($par in @(@('ArqChavesUs', 'chaves_usuarios.json'), @('ArqSessoes', 'sessoes.json'), @('ArqSenhasAdmin', 'senhas_admin.json'))) {
    $v = Get-Variable -Name $par[0] -Scope Script -ErrorAction SilentlyContinue; if (-not $v) { continue }
    $novo = Join-Path $DirComp $par[1]
    if ((Test-Path -LiteralPath $v.Value) -and $v.Value -ne $novo) {
      if (-not (Test-Path -LiteralPath $novo)) { Copy-Item -LiteralPath $v.Value -Destination $novo }
      else {   # junta: acrescenta o que só existe aqui (nunca tira nada do arquivo compartilhado)
        try {
          $a = Get-Content -Raw -Encoding UTF8 -LiteralPath $novo | ConvertFrom-Json; $b = Get-Content -Raw -Encoding UTF8 -LiteralPath $v.Value | ConvertFrom-Json; $mudou = $false
          foreach ($p in $b.PSObject.Properties) { if (-not ($a.PSObject.Properties.Name -contains $p.Name)) { $a | Add-Member -NotePropertyName $p.Name -NotePropertyValue $p.Value; $mudou = $true } }
          if ($mudou) { [IO.File]::WriteAllText($novo, ($a | ConvertTo-Json -Depth 6 -Compress), $utf8sb) }
        } catch { }
      }
    }
    Set-Variable -Name $par[0] -Scope Script -Value $novo
  }
}

# ---------- endereço do servidor ativo (ramo "consulta", endereco.json) ----------
# { url, em, vivoEm, pc, versao, pedido{para,em}, cedido{para,marca,em} }  — o app lê para achar o servidor
#   e para dizer à equipe se ele está ligado; os servidores reserva leem para saber quem está ativo.
$script:infoEndereco = @{}
function Cabecalho-GitHub([string]$tok) { return @{ Authorization = "Bearer $tok"; Accept = 'application/vnd.github+json'; 'User-Agent' = 'VTN-Hub-servidor'; 'X-GitHub-Api-Version' = '2022-11-28' } }
function Ler-Endereco {
  $tok = Token-GitHub; if (-not $tok) { return $null }
  try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $h = Cabecalho-GitHub $tok; $h.Accept = 'application/vnd.github.raw+json'; $h['Cache-Control'] = 'no-cache'
    $r = Invoke-WebRequest -UseBasicParsing -Uri "https://api.github.com/repos/$Repo/contents/endereco.json?ref=consulta" -Headers $h -TimeoutSec 20
    return ($utf8sb.GetString($r.RawContentStream.ToArray()) | ConvertFrom-Json)
  } catch { if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 404) { return [pscustomobject]@{ url = '' } }; return $null }
}
function Montar-Endereco($campos) {
  $o = [ordered]@{ url = ''; em = (Get-Date).ToUniversalTime().ToString('o'); vivoEm = (Get-Date).ToUniversalTime().ToString('o'); pc = $env:COMPUTERNAME }
  foreach ($k in $campos.Keys) { $o[$k] = $campos[$k] }
  return ($o | ConvertTo-Json -Depth 4 -Compress)
}
# troca só o endereco.json (mantém a cópia dados.json que já está lá). Um commit só, substituído a cada envio.
function Publicar-Endereco($campos) {
  $tok = Token-GitHub; if (-not $tok) { return 'sem token' }
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $h = Cabecalho-GitHub $tok
  $api = "https://api.github.com/repos/$Repo/git"
  function Postar2($url, $obj, $metodo = 'POST') { Invoke-RestMethod -Method $metodo -Uri $url -Headers $h -ContentType 'application/json; charset=utf-8' -Body $utf8sb.GetBytes(($obj | ConvertTo-Json -Depth 6 -Compress)) -TimeoutSec 30 }
  $base = $null; try { $ref = Invoke-RestMethod -Uri "$api/ref/heads/consulta" -Headers $h -TimeoutSec 20; $base = (Invoke-RestMethod -Uri "$api/commits/$($ref.object.sha)" -Headers $h -TimeoutSec 20).tree.sha } catch { }
  $end = Montar-Endereco $campos
  $blob = Postar2 "$api/blobs" @{ content = [Convert]::ToBase64String($utf8sb.GetBytes($end)); encoding = 'base64' }
  $t = @{ tree = @(@{ path = 'endereco.json'; mode = '100644'; type = 'blob'; sha = $blob.sha }) }; if ($base) { $t.base_tree = $base }
  $tree = Postar2 "$api/trees" $t
  $com = Postar2 "$api/commits" @{ message = 'Endereço do servidor'; tree = $tree.sha; parents = @() }
  try { Postar2 "$api/refs/heads/consulta" @{ sha = $com.sha; force = $true } 'PATCH' | Out-Null } catch { Postar2 "$api/refs" @{ ref = 'refs/heads/consulta'; sha = $com.sha } | Out-Null }
  return 'ok'
}

function Publicar-Copia([string]$banco, $usuariosAtivos, [string]$repo, [string]$endereco = '') {
  $tok = Token-GitHub; if (-not $tok) { return 'sem token' }
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $json = Montar-Copia $banco $usuariosAtivos
  $h = @{ Authorization = "Bearer $tok"; Accept = 'application/vnd.github+json'; 'User-Agent' = 'VTN-Hub-servidor'; 'X-GitHub-Api-Version' = '2022-11-28' }
  $api = "https://api.github.com/repos/$repo/git"
  function Postar($url, $obj, $metodo = 'POST') { Invoke-RestMethod -Method $metodo -Uri $url -Headers $h -ContentType 'application/json; charset=utf-8' -Body $utf8sb.GetBytes(($obj | ConvertTo-Json -Depth 5 -Compress)) -TimeoutSec 60 }
  $blob = Postar "$api/blobs" @{ content = [Convert]::ToBase64String($utf8sb.GetBytes($json)); encoding = 'base64' }
  # endereço atual do túnel (para o app achar o PC) + sinal de vida; campos extras vêm do servidor ($script:infoEndereco)
  if (-not $endereco) { $ae = Join-Path $DirLocal 'endereco.txt'; if (Test-Path $ae) { $endereco = (Get-Content -Raw $ae).Trim() } }
  $campos = @{}; if ($script:infoEndereco) { foreach ($k in $script:infoEndereco.Keys) { $campos[$k] = $script:infoEndereco[$k] } }
  $campos.url = $endereco
  $end = Montar-Endereco $campos
  $blob2 = Postar "$api/blobs" @{ content = [Convert]::ToBase64String($utf8sb.GetBytes($end)); encoding = 'base64' }
  $tree = Postar "$api/trees" @{ tree = @(@{ path = 'dados.json'; mode = '100644'; type = 'blob'; sha = $blob.sha }, @{ path = 'endereco.json'; mode = '100644'; type = 'blob'; sha = $blob2.sha }) }
  $com = Postar "$api/commits" @{ message = 'Cópia de consulta (criptografada)'; tree = $tree.sha; parents = @() }
  try { Postar "$api/refs/heads/consulta" @{ sha = $com.sha; force = $true } 'PATCH' | Out-Null }
  catch { Postar "$api/refs" @{ ref = 'refs/heads/consulta'; sha = $com.sha } | Out-Null }
  return 'ok'
}

# coloca o instalador de servidor na pasta compartilhada (00_VTN\_servidor): outro computador vira servidor com dois cliques
function Colocar-Instalador {
  if (-not (Comp-Ok)) { return }
  try {
    $orig = Join-Path $PSScriptRoot 'instalar_servidor.cmd'; if (-not (Test-Path $orig)) { return }
    New-Item -ItemType Directory -Force -Path $DirComp | Out-Null
    $dest = Join-Path $DirComp 'INSTALAR SERVIDOR VTN HUB.cmd'
    if (-not (Test-Path -LiteralPath $dest) -or ([IO.File]::ReadAllText($dest) -ne [IO.File]::ReadAllText($orig))) { Copy-Item -LiteralPath $orig -Destination $dest -Force }
  } catch { }
}
# arquivos protegidos antigos (só deste usuário) passam a valer também antes do login no Windows
function Migrar-Protegidos {
  Get-ChildItem -LiteralPath $DirLocal -Filter '*.bin' -ErrorAction SilentlyContinue | ForEach-Object {
    try { $b = [IO.File]::ReadAllBytes($_.FullName); try { [void][Security.Cryptography.ProtectedData]::Unprotect($b, $null, 'LocalMachine'); return } catch { }
      $p = [Security.Cryptography.ProtectedData]::Unprotect($b, $null, 'CurrentUser'); Copy-Item -LiteralPath $_.FullName -Destination ($_.FullName + '.usuario') -Force; Protegido-Gravar $_.FullName $p } catch { }
  }
}

