# =========================================================
#  VTN HUB – CONFIGURAÇÃO DAS ROTINAS (Windows, sem IA)
#  Ajuste aqui se alguma pasta mudar. Os outros scripts leem este arquivo.
# =========================================================
$OneDrive = if ($env:OneDrive) { $env:OneDrive } else { Join-Path $env:USERPROFILE 'OneDrive' }

# Pasta compartilhada com os dados do app (a mesma escolhida no VTN Hub)
$Banco = Join-Path $OneDrive '00_VTN\BANCO DE DADOS'

# Cópias de segurança (banco e programa), uma por dia – nunca são apagadas
$Backups = Join-Path $Banco 'backups'

# Cópia local do programa (para abrir sem internet)
$Programa = Join-Path ([Environment]::GetFolderPath('Desktop')) 'VTN_Gestao'

# Repositório do código no GitHub (usuario/repositorio) e site publicado
$Repo = 'Victor-Bertoni/vtn-hub'
$Ramo = 'main'

# Registro do que as rotinas fizeram
$Log = Join-Path $Backups 'rotinas_log.txt'

function Escrever-Log([string]$texto) {
  New-Item -ItemType Directory -Force -Path $Backups | Out-Null
  $linha = '{0:yyyy-MM-dd HH:mm:ss}  {1}' -f (Get-Date), $texto
  Write-Host $linha
  Add-Content -Path $Log -Value $linha -Encoding UTF8
}

# Grava um "documento" do app: <Banco>\<colecao>\<id>.json
function Gravar-Doc([string]$colecao, [string]$id, $objeto) {
  $dir = Join-Path $Banco $colecao
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $json = $objeto | ConvertTo-Json -Depth 50 -Compress
  [IO.File]::WriteAllText((Join-Path $dir "$id.json"), $json, (New-Object Text.UTF8Encoding $false))
}
function Ler-Doc([string]$colecao, [string]$id) {
  $f = Join-Path (Join-Path $Banco $colecao) "$id.json"
  if (Test-Path $f) { return (Get-Content -Raw -Encoding UTF8 $f | ConvertFrom-Json) } else { return $null }
}

# Aviso na tela (balão do Windows), sem bloquear
function Avisar([string]$titulo, [string]$texto) {
  try {
    Add-Type -AssemblyName System.Windows.Forms
    $n = New-Object System.Windows.Forms.NotifyIcon
    $n.Icon = [System.Drawing.SystemIcons]::Information
    $n.BalloonTipTitle = $titulo; $n.BalloonTipText = $texto; $n.Visible = $true
    $n.ShowBalloonTip(10000); Start-Sleep -Seconds 6; $n.Dispose()
  } catch { }
}
