# notegraph installer for Windows (PowerShell).
#
# One-liner (Windows PowerShell / PowerShell 7):
#   irm https://raw.githubusercontent.com/marinoscar/notegraph/main/install.ps1 | iex
#
# What it does: checks/install dependencies (via winget when available),
# clones (or updates) the repo, installs npm packages, builds the app, and
# launches it. Everything comes from the git repo. notegraph is fully local.
#
# Configuration via environment variables (set before running):
#   $env:NOTEGRAPH_HOME     install/clone directory   (default: $HOME\notegraph)
#   $env:NOTEGRAPH_BRANCH   git branch to use         (default: main)
#   $env:NOTEGRAPH_REPO     git URL                    (default: the public repo)
#   $env:NOTEGRAPH_NO_START set to 1 to build but not launch

$ErrorActionPreference = 'Stop'

$RepoUrl  = if ($env:NOTEGRAPH_REPO)   { $env:NOTEGRAPH_REPO }   else { 'https://github.com/marinoscar/notegraph.git' }
$Branch   = if ($env:NOTEGRAPH_BRANCH) { $env:NOTEGRAPH_BRANCH } else { 'main' }
$Dest     = if ($env:NOTEGRAPH_HOME)   { $env:NOTEGRAPH_HOME }   else { Join-Path $HOME 'notegraph' }
$MinNode  = 18

function Log  ($m) { Write-Host "==> $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "==> warning: $m" -ForegroundColor Yellow }
function Die  ($m) { Write-Host "==> error: $m" -ForegroundColor Red; exit 1 }
function Have ($c) { [bool](Get-Command $c -ErrorAction SilentlyContinue) }

function Update-PathFromRegistry {
  $machine = [System.Environment]::GetEnvironmentVariable('Path', 'Machine')
  $user    = [System.Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = ($machine, $user | Where-Object { $_ }) -join ';'
}

function Winget-Install ($id) {
  if (-not (Have winget)) { return $false }
  Log "Installing $id via winget"
  winget install --id $id -e --source winget `
    --accept-package-agreements --accept-source-agreements | Out-Host
  Update-PathFromRegistry
  return $true
}

# ---- 1. git ------------------------------------------------------------------
Log "Checking dependencies"
if (-not (Have git)) {
  if (-not (Winget-Install 'Git.Git')) {
    Die "git not found and winget is unavailable. Install Git from https://git-scm.com and re-run."
  }
}
if (-not (Have git)) { Die "git still not on PATH. Open a new terminal and re-run." }

# ---- 2. Node.js + npm --------------------------------------------------------
function NodeMajor {
  try { [int](node -p "process.versions.node.split('.')[0]") } catch { 0 }
}
if ((Have node) -and (NodeMajor) -ge $MinNode) {
  Log "Node.js $(node -v) found"
} else {
  if (-not (Winget-Install 'OpenJS.NodeJS.LTS')) {
    Die "Node.js (>= $MinNode) not found and winget is unavailable. Install from https://nodejs.org and re-run."
  }
}
if (-not (Have node)) { Die "Node.js not on PATH. Open a new terminal and re-run." }
if (-not (Have npm))  { Die "npm not found (should ship with Node.js)." }
if ((NodeMajor) -lt $MinNode) { Warn "Node $(node -v) is older than $MinNode; the build may fail." }

# Native modules ship prebuilt binaries; a source rebuild would need the
# Visual Studio C++ Build Tools. Only warn — do not force a heavy install.
if (-not (Have cl)) {
  Warn "Visual C++ Build Tools not detected. If 'npm install' fails to build a native module, install them with:"
  Warn "  winget install --id Microsoft.VisualStudio.2022.BuildTools -e"
}

# ---- 3. clone or update ------------------------------------------------------
if (Test-Path (Join-Path $Dest '.git')) {
  Log "Updating existing checkout in $Dest"
  git -C $Dest fetch --depth 1 origin $Branch
  git -C $Dest checkout $Branch
  git -C $Dest reset --hard "origin/$Branch"
} elseif (Test-Path $Dest) {
  Die "$Dest exists but is not a git checkout. Move it or set `$env:NOTEGRAPH_HOME."
} else {
  Log "Cloning $RepoUrl (branch $Branch) into $Dest"
  git clone --branch $Branch --depth 1 $RepoUrl $Dest
}
Set-Location $Dest

# ---- 4. install + build ------------------------------------------------------
Log "Installing npm dependencies (this can take a few minutes)"
npm install
if ($LASTEXITCODE -ne 0) { Die "npm install failed." }

Log "Building the app"
npm run build
if ($LASTEXITCODE -ne 0) { Die "npm run build failed." }

# ---- 5. Start Menu shortcut --------------------------------------------------
try {
  $startMenu = [Environment]::GetFolderPath('Programs')
  $lnkPath   = Join-Path $startMenu 'notegraph.lnk'
  $ws        = New-Object -ComObject WScript.Shell
  $lnk       = $ws.CreateShortcut($lnkPath)
  $lnk.TargetPath       = 'cmd.exe'
  $lnk.Arguments        = "/c cd /d `"$Dest`" && npm start"
  $lnk.WorkingDirectory = $Dest
  $lnk.Description       = 'Local-first personal knowledge graph'
  $lnk.Save()
  Log "Created Start Menu shortcut (notegraph)"
} catch { Warn "Could not create Start Menu shortcut: $_" }

Log "notegraph installed in $Dest"
Write-Host "    Start it any time with:  cd `"$Dest`"; npm start"

# ---- 6. launch ---------------------------------------------------------------
if ($env:NOTEGRAPH_NO_START -eq '1') { return }
Log "Launching notegraph…"
npm start
