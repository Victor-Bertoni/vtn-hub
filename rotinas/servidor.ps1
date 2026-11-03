# =========================================================
#  VTN HUB – SERVIDOR LOCAL (sem IA, sem internet para os dados)
#  Liga sozinho quando o Windows inicia (Agendador de Tarefas).
#  • Serve o app em http://localhost:8737 (programa da pasta VTN_Gestao)
#  • Lê e grava o banco direto na pasta BANCO DE DADOS do OneDrive,
#    sem perguntar nada (o OneDrive sincroniza com os outros).
#  • A cada 30 min confere no GitHub se há versão nova do programa e
#    atualiza sozinho (atualização obrigatória).
#  Nada é apagado: o que o app "exclui" vai para BANCO DE DADOS\lixeira.
# =========================================================
$ErrorActionPreference = 'Continue'
. (Join-Path $PSScriptRoot 'config.ps1')
. (Join-Path $PSScriptRoot 'copia.ps1')   # cópia de consulta no GitHub (PC desligado)
. (Join-Path $PSScriptRoot 'tunel.ps1')   # endereço da internet (Cloudflare, sem conta)
$OrigemSite = 'https://' + ($Repo.Split('/')[0]).ToLower() + '.github.io'   # site do GitHub Pages pode chamar este servidor
$enderecoNovo = $false; $ultimaVigia = [datetime]::MinValue
$ultimaGravacao = [datetime]::MinValue; $ultimoEnvio = [datetime]::MinValue; $copiaPendente = $true
$Porta = 8737
$utf8 = New-Object Text.UTF8Encoding $false
$tipos = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.json'='application/json; charset=utf-8';
  '.webmanifest'='application/manifest+json'; '.png'='image/png'; '.ico'='image/x-icon'; '.svg'='image/svg+xml'; '.pdf'='application/pdf'; '.md'='text/plain; charset=utf-8' }

function Caminho-Seguro([string]$base, [string]$rel) {
  $rel = ($rel -replace '/', '\').TrimStart('\')
  if ($rel -match '(^|\\)\.\.(\\|$)' -or $rel -match ':') { return $null }
  $full = [IO.Path]::GetFullPath((Join-Path $base $rel))
  if (-not $full.StartsWith([IO.Path]::GetFullPath($base), [StringComparison]::OrdinalIgnoreCase)) { return $null }
  return $full
}
function Responder($ctx, [int]$status, [string]$tipo, [byte[]]$corpo) {
  try {
    $r = $ctx.Response; $r.StatusCode = $status; $r.ContentType = $tipo
    $r.Headers['Cache-Control'] = 'no-store'
    $o = $ctx.Request.Headers['Origin']
    if ($o -and ($o -eq $OrigemSite -or $o -like 'http://localhost*')) { $r.Headers['Access-Control-Allow-Origin'] = $o; $r.Headers['Vary'] = 'Origin'; $r.Headers['Access-Control-Expose-Headers'] = 'X-Mod' }
    if ($corpo) { $r.ContentLength64 = $corpo.Length; $r.OutputStream.Write($corpo, 0, $corpo.Length) }
    $r.OutputStream.Close()
  } catch { }
}
function Json($ctx, $obj, [int]$status = 200) { Responder $ctx $status 'application/json; charset=utf-8' $utf8.GetBytes(($obj | ConvertTo-Json -Depth 5 -Compress)) }
function Texto($ctx, [string]$t, [int]$status = 200) { Responder $ctx $status 'application/json; charset=utf-8' $utf8.GetBytes($t) }
function Ler-Corpo($req) { $ms = New-Object IO.MemoryStream; $req.InputStream.CopyTo($ms); return $ms.ToArray() }
function Mover-Lixeira([string]$arq, [string]$rel) {
  $dest = Join-Path (Join-Path $Banco 'lixeira') ((Get-Date -Format 'yyyy-MM-dd_HHmmss') + '_' + ($rel -replace '[\\/:]', '_'))
  New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
  Move-Item -LiteralPath $arq -Destination $dest -Force
}

# ---------- login no servidor (quem não entrou não vê nenhum dado) ----------
$sessoes = @{}   # token -> @{ id; nome; papel; validade }
$cacheUs = $null; $cacheUsEm = [datetime]::MinValue
function Usuarios {
  if ($script:cacheUs -and ((Get-Date) - $script:cacheUsEm).TotalSeconds -lt 5) { return $script:cacheUs }
  $lista = @()
  Get-ChildItem -LiteralPath (Join-Path $Banco 'vtn') -Filter 'usuarios__*.json' -ErrorAction SilentlyContinue | Sort-Object Name | ForEach-Object {
    $d = Get-Content -Raw -Encoding UTF8 $_.FullName | ConvertFrom-Json; $lista += @($d.json | ConvertFrom-Json) }
  # senha trocada por quem não é administrador (senhas\<conta>.json) vale se for mais nova
  $senhas = @(Get-ChildItem -LiteralPath (Join-Path $Banco 'senhas') -Filter '*.json' -ErrorAction SilentlyContinue | ForEach-Object { Get-Content -Raw -Encoding UTF8 $_.FullName | ConvertFrom-Json })
  foreach ($u in $lista) {
    $s = $senhas | Where-Object { $_.usId -eq $u.id -and "$($_.em)" -gt "$($u.senhaRedefinidaEm)" } | Sort-Object em -Descending | Select-Object -First 1
    if ($s -and $u.papel -ne 'admin') { $u | Add-Member -Force salt $s.salt; $u | Add-Member -Force senhaHash $s.senhaHash }
  }
  $script:cacheUs = $lista; $script:cacheUsEm = Get-Date
  return $lista
}
function Hash([string]$texto) { $sha = [Security.Cryptography.SHA256]::Create(); (($sha.ComputeHash($utf8.GetBytes($texto)) | ForEach-Object { $_.ToString('x2') }) -join '') }
function Sessao($req) {
  $t = $req.Headers['X-VTN-Token']; if (-not $t) { $t = $req.QueryString['t'] }
  if ($t -and $sessoes.ContainsKey($t) -and $sessoes[$t].validade -gt (Get-Date)) { return $sessoes[$t] }

  return $null
}
function Pode-Gravar($s, [string]$col, [string]$id, [string]$arq) {
  $col = $col -replace '\\', '/'
  if (-not $s) {                                                        # sem login: só criar pedido novo (conta / nova senha)
    return (($col -eq 'pedidos' -or $col -like 'pedidos/anon_*') -and -not (Test-Path -LiteralPath $arq))
  }
  if ($s.papel -eq 'admin') { return $true }
  # demais: só os próprios pedidos e a própria senha
  if ($col -eq 'senhas') { return ($id -eq $s.id) }
  if ($col -eq 'pedidos') { return ($id -eq $s.id) }
  return ($col -like "pedidos/$($s.id)/*")
}
# sessões guardadas neste computador (não vão para o OneDrive): ninguém precisa entrar de novo quando o PC reinicia
$ArqSessoes = Join-Path $env:LOCALAPPDATA 'VTN_Hub\sessoes.json'
function Gravar-Sessoes {
  try { New-Item -ItemType Directory -Force -Path (Split-Path $ArqSessoes) | Out-Null
    $o = @{}; foreach ($k in $sessoes.Keys) { $v = $sessoes[$k]; $o[$k] = @{ id = $v.id; nome = $v.nome; papel = $v.papel; validade = $v.validade.ToString('o') } }
    [IO.File]::WriteAllText($ArqSessoes, ($o | ConvertTo-Json -Depth 4 -Compress), $utf8) } catch { }
}
function Ler-Sessoes {
  try { if (Test-Path $ArqSessoes) { $o = Get-Content -Raw -Encoding UTF8 $ArqSessoes | ConvertFrom-Json
      foreach ($p in $o.PSObject.Properties) { $v = [datetime]::Parse($p.Value.validade, $null, 'RoundtripKind'); if ($v -gt (Get-Date)) { $sessoes[$p.Name] = @{ id = $p.Value.id; nome = $p.Value.nome; papel = $p.Value.papel; validade = $v } } } } } catch { }
}
# o papel vem sempre do cadastro atual (se o admin desativar alguém, o acesso cai na hora)
function Conferir-Sessao($s) {
  if (-not $s) { return $null }
  $u = Usuarios | Where-Object { $_.id -eq $s.id } | Select-Object -First 1
  if (-not $u -or $u.ativo -eq $false) { return $null }
  $s.papel = $u.papel; return $s
}

# ---------- atualização do programa pelo GitHub ----------
$ultimaConferencia = [datetime]::MinValue
function Atualizar-Programa {
  if ($Repo -like 'COLE_AQUI*') { return }
  try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $remoto = (Invoke-WebRequest -UseBasicParsing -Uri "https://raw.githubusercontent.com/$Repo/$Ramo/versao.json" -TimeoutSec 20).Content | ConvertFrom-Json
    $localArq = Join-Path $Programa 'versao.json'
    $local = if (Test-Path $localArq) { Get-Content -Raw $localArq | ConvertFrom-Json } else { $null }
    if (-not $local -or $remoto.versao -gt $local.versao) {
      $zip = Join-Path $env:TEMP 'vtn_programa.zip'; $ext = Join-Path $env:TEMP 'vtn_programa'
      Invoke-WebRequest -UseBasicParsing -Uri "https://github.com/$Repo/archive/refs/heads/$Ramo.zip" -OutFile $zip -TimeoutSec 120
      Expand-Archive -Path $zip -DestinationPath $ext -Force
      $raiz = Get-ChildItem $ext -Directory | Select-Object -First 1
      New-Item -ItemType Directory -Force -Path $Programa | Out-Null
      Copy-Item -Recurse -Force (Join-Path $raiz.FullName '*') $Programa
      Escrever-Log "Programa atualizado do GitHub para a versão $($remoto.versao)"
      if ($script:l -and $script:l.IsListening) { Escrever-Log 'Reiniciando o servidor com a versão nova'; $script:l.Stop(); Start-Process powershell.exe -WindowStyle Hidden -ArgumentList "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""; exit }
    }
  } catch { }
}

Atualizar-Programa
Ler-Sessoes
# "+" aceita outros nomes além de localhost (precisa da liberação feita pelo instalar_rotinas.ps1); o túnel já chega como localhost
$l = New-Object Net.HttpListener
$l.Prefixes.Add("http://+:$Porta/")
try { $l.Start() } catch {
  $l = New-Object Net.HttpListener; $l.Prefixes.Add("http://localhost:$Porta/")
  try { $l.Start(); Escrever-Log "Aviso: servidor só em localhost (rode instalar_rotinas.ps1 de novo para liberar o acesso pela internet)." }
  catch { Escrever-Log "Servidor já está rodando ou a porta $Porta está ocupada."; exit }
}
Escrever-Log "Servidor do VTN Hub ligado em http://localhost:$Porta (banco: $Banco)"
Iniciar-Tunel

while ($l.IsListening) {
  $tarefa = $l.GetContextAsync()
  while (-not $tarefa.AsyncWaitHandle.WaitOne(1000)) {
    if (((Get-Date) - $ultimaConferencia).TotalMinutes -ge 30) { $ultimaConferencia = Get-Date; Atualizar-Programa }
    # túnel: confere a cada 5 s; endereço novo é publicado na hora
    $agora = Get-Date
    if (($agora - $ultimaVigia).TotalSeconds -ge 5) { $ultimaVigia = $agora; if (Vigiar-Tunel) { $enderecoNovo = $true } }
    # cópia de consulta: 2 min depois da última alteração (no máximo a cada 5 min) e, de todo jeito, a cada 6 h
    if ($enderecoNovo -or (($copiaPendente -or $ultimaGravacao -gt $ultimoEnvio) -and ($agora - $ultimaGravacao).TotalMinutes -ge 2 -and ($agora - $ultimoEnvio).TotalMinutes -ge 5) -or ($agora - $ultimoEnvio).TotalHours -ge 6) {
      $ultimoEnvio = $agora; $enderecoNovo = $false
      try { $r = Publicar-Copia $Banco (Usuarios) $Repo $script:urlTunel; if ($r -eq 'ok') { $copiaPendente = $false; Escrever-Log 'Cópia de consulta e endereço publicados no GitHub' } }
      catch { Escrever-Log "Aviso: cópia de consulta não publicada: $($_.Exception.Message)" }
    }
  }
  $ctx = $tarefa.Result; $req = $ctx.Request
  try {
    $rota = $req.Url.AbsolutePath; $q = $req.QueryString
    if ($req.HttpMethod -eq 'OPTIONS') {   # pré-checagem do navegador (site do GitHub chamando o servidor)
      $ctx.Response.Headers['Access-Control-Allow-Methods'] = 'GET, PUT, POST, DELETE, OPTIONS'
      $ctx.Response.Headers['Access-Control-Allow-Headers'] = 'X-VTN-Token, Content-Type'
      $ctx.Response.Headers['Access-Control-Max-Age'] = '600'
      Responder $ctx 204 'text/plain' $null; continue
    }
    if ($rota -eq '/api/info') { Json $ctx @{ ok = $true; pasta = (Split-Path $Banco -Leaf) }; continue }
    if ($rota -eq '/api/login' -and $req.HttpMethod -eq 'POST') {
      $c = $utf8.GetString((Ler-Corpo $req)) | ConvertFrom-Json
      $u = Usuarios | Where-Object { "$($_.email)".ToLower() -eq "$($c.email)".Trim().ToLower() -and $_.ativo -ne $false } | Select-Object -First 1
      if ($u -and $u.senhaHash -and (Hash ("$($u.salt):$($c.senha)")) -eq $u.senhaHash) {
        $tok = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
        $sessoes[$tok] = @{ id = $u.id; nome = $u.nome; papel = $u.papel; validade = (Get-Date).AddDays(30) }
        Gravar-Sessoes; Escrever-Log "Login: $($u.nome)"
        try { if (Registrar-ChaveUsuario $u "$($c.senha)") { $copiaPendente = $true } } catch { Escrever-Log "Aviso: chave da cópia de $($u.nome): $($_.Exception.Message)" }
        Json $ctx @{ ok = $true; token = $tok; id = $u.id; nome = $u.nome; papel = $u.papel }
      } else { Start-Sleep -Milliseconds 800; Json $ctx @{ ok = $false; erro = 'E-mail ou senha inválidos (ou conta aguardando aprovação).' } 401 }
      continue
    }
    if ($rota -eq '/api/sair') { $t = $req.Headers['X-VTN-Token']; if ($t) { $sessoes.Remove($t); Gravar-Sessoes }; Json $ctx @{ ok = $true }; continue }
    $sessao = Conferir-Sessao (Sessao $req)
    $anonimoPedido = (-not $sessao -and $rota -eq '/api/doc' -and $req.HttpMethod -eq 'PUT' -and "$($q['p'])" -like 'pedidos*')
    if ($rota -like '/api/*' -and -not $sessao -and -not $anonimoPedido) { Json $ctx @{ erro = 'login' } 401; continue }
    if ($rota -eq '/api/doc' -and $req.HttpMethod -ne 'GET' -and (-not $sessao -or $sessao.papel -ne 'admin')) {
      $d0 = Caminho-Seguro $Banco $q['p']; $a0 = if ($d0) { Join-Path $d0 "$($q['id']).json" } else { '' }
      if ($req.HttpMethod -eq 'DELETE' -or -not (Pode-Gravar $sessao "$($q['p'])" "$($q['id'])" $a0)) { Json $ctx @{ erro = 'sem permissao' } 403; continue }
    }
    if ($rota -eq '/api/arquivo' -and $req.HttpMethod -ne 'GET' -and $sessao.papel -ne 'admin') {   # demais: só anexar arquivo novo, nunca trocar nem apagar
      $a0 = Caminho-Seguro $Banco $(if ($q['caminho']) { $q['caminho'] } else { 'arquivos\' + $q['id'] })
      if ($req.HttpMethod -ne 'PUT' -or -not $a0 -or (Test-Path -LiteralPath $a0)) { Json $ctx @{ erro = 'sem permissao' } 403; continue }
    }

    if ($rota -eq '/api/lista') {                       # documentos de uma coleção: id + data de modificação
      $dir = Caminho-Seguro $Banco $q['p']; $itens = @()
      if ($dir -and (Test-Path $dir)) { $itens = @(Get-ChildItem -LiteralPath $dir -File -Filter '*.json' | Where-Object { $_.Name -notlike '~*' } | ForEach-Object { @{ id = $_.BaseName; mod = [int64]($_.LastWriteTimeUtc - [datetime]'1970-01-01').TotalMilliseconds } }) }
      Json $ctx @{ itens = $itens }; continue
    }
    if ($req.HttpMethod -ne 'GET' -and $rota -like '/api/*' -and $rota -ne '/api/login' -and $rota -ne '/api/sair') { $ultimaGravacao = Get-Date }
    if ($rota -eq '/api/doc') {
      $dir = Caminho-Seguro $Banco $q['p']; $id = $q['id']
      if (-not $dir -or -not $id -or $id -match '[\\/:]') { Json $ctx @{ erro = 'caminho' } 400; continue }
      $arq = Join-Path $dir "$id.json"
      switch ($req.HttpMethod) {
        'GET'    { if (Test-Path -LiteralPath $arq) { $ctx.Response.Headers['X-Mod'] = [string][int64]((Get-Item -LiteralPath $arq).LastWriteTimeUtc - [datetime]'1970-01-01').TotalMilliseconds; Texto $ctx ([IO.File]::ReadAllText($arq, $utf8)) } else { Json $ctx @{ erro = 'nao existe' } 404 } }
        'PUT'    { New-Item -ItemType Directory -Force -Path $dir | Out-Null; [IO.File]::WriteAllBytes($arq, (Ler-Corpo $req)); Json $ctx @{ ok = $true } }
        'DELETE' { if (Test-Path -LiteralPath $arq) { Mover-Lixeira $arq ($q['p'] + '\' + $id + '.json') }; Json $ctx @{ ok = $true } }
        default  { Json $ctx @{ erro = 'metodo' } 405 }
      }
      continue
    }
    if ($rota -eq '/api/arquivo') {                     # anexos (subpasta "arquivos" ou outro caminho dentro do banco)
      $rel = if ($q['caminho']) { $q['caminho'] } else { 'arquivos\' + $q['id'] }
      $arq = Caminho-Seguro $Banco $rel
      if (-not $arq) { Json $ctx @{ erro = 'caminho' } 400; continue }
      switch ($req.HttpMethod) {
        'GET'    { if (Test-Path -LiteralPath $arq) { $ext = [IO.Path]::GetExtension($arq).ToLower(); $t = if ($q['tipo']) { $q['tipo'] } elseif ($tipos[$ext]) { $tipos[$ext] } else { 'application/octet-stream' }; Responder $ctx 200 $t ([IO.File]::ReadAllBytes($arq)) } else { Json $ctx @{ erro = 'nao existe' } 404 } }
        'PUT'    { New-Item -ItemType Directory -Force -Path (Split-Path $arq) | Out-Null; [IO.File]::WriteAllBytes($arq, (Ler-Corpo $req)); Json $ctx @{ ok = $true } }
        'DELETE' { if (Test-Path -LiteralPath $arq) { Mover-Lixeira $arq $rel }; Json $ctx @{ ok = $true } }
      }
      continue
    }
    # ---------- arquivos do programa ----------
    $rel = [Uri]::UnescapeDataString($rota); if ($rel -eq '/' -or $rel -eq '') { $rel = '/index.html' }
    $arq = Caminho-Seguro $Programa $rel
    if ($arq -and (Test-Path -LiteralPath $arq -PathType Leaf)) {
      $ext = [IO.Path]::GetExtension($arq).ToLower(); $t = if ($tipos[$ext]) { $tipos[$ext] } else { 'application/octet-stream' }
      Responder $ctx 200 $t ([IO.File]::ReadAllBytes($arq))
    } else { Responder $ctx 404 'text/plain; charset=utf-8' $utf8.GetBytes('não encontrado') }
  } catch { try { Json $ctx @{ erro = $_.Exception.Message } 500 } catch { } }
}
