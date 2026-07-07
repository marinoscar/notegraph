#!/usr/bin/env bash
#
# notegraph installer for Linux.
#
# One-liner:
#   curl -fsSL https://raw.githubusercontent.com/marinoscar/notegraph/main/install.sh | bash
#
# What it does: checks/install dependencies, clones (or updates) the repo,
# installs npm packages, builds the app, and launches it. Everything comes
# from the git repo. notegraph is fully local — nothing but a future opt-in
# AI feature ever leaves your machine.
#
# Configuration via environment variables:
#   NOTEGRAPH_HOME    install/clone directory   (default: $HOME/notegraph)
#   NOTEGRAPH_BRANCH  git branch to use         (default: main)
#   NOTEGRAPH_REPO    git URL                    (default: the public repo)
#   NOTEGRAPH_NO_START=1   build but do not launch the app
#
set -euo pipefail

REPO_URL="${NOTEGRAPH_REPO:-https://github.com/marinoscar/notegraph.git}"
BRANCH="${NOTEGRAPH_BRANCH:-main}"
DEST="${NOTEGRAPH_HOME:-$HOME/notegraph}"
MIN_NODE_MAJOR=18

# ---- logging -----------------------------------------------------------------
if [ -t 1 ]; then B=$'\033[1m'; G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[31m'; N=$'\033[0m'; else B=; G=; Y=; R=; N=; fi
log()  { printf '%s\n' "${G}==>${N} ${B}$*${N}"; }
warn() { printf '%s\n' "${Y}==> warning:${N} $*" >&2; }
die()  { printf '%s\n' "${R}==> error:${N} $*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

# ---- privilege + package manager --------------------------------------------
SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  if have sudo; then SUDO="sudo"; fi
fi

PKG=""
if   have apt-get; then PKG="apt"
elif have dnf;     then PKG="dnf"
elif have pacman;  then PKG="pacman"
elif have zypper;  then PKG="zypper"
fi

pkg_install() {
  # pkg_install <pkg...> — best effort; warns (does not fail) if it can't.
  [ "$#" -gt 0 ] || return 0
  if [ -z "$PKG" ] || { [ -z "$SUDO" ] && [ "$(id -u)" -ne 0 ]; }; then
    warn "cannot auto-install ($*). Install these manually, then re-run."
    return 0
  fi
  case "$PKG" in
    apt)    $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y "$@" || warn "apt-get failed for: $*" ;;
    dnf)    $SUDO dnf install -y "$@" || warn "dnf failed for: $*" ;;
    pacman) $SUDO pacman -S --noconfirm --needed "$@" || warn "pacman failed for: $*" ;;
    zypper) $SUDO zypper install -y "$@" || warn "zypper failed for: $*" ;;
  esac
}

# ---- 1. system dependencies --------------------------------------------------
log "Checking system dependencies (package manager: ${PKG:-none})"

if [ "$PKG" = "apt" ]; then $SUDO apt-get update -qq || true; fi

have git || { log "Installing git"; pkg_install git; }
have git || die "git is required but could not be installed."

# Build toolchain (only needed if a native module must compile from source).
case "$PKG" in
  apt)    pkg_install build-essential python3 ;;
  dnf)    pkg_install gcc gcc-c++ make python3 ;;
  pacman) pkg_install base-devel python ;;
  zypper) pkg_install gcc gcc-c++ make python3 ;;
esac

# Electron GUI runtime libraries.
case "$PKG" in
  apt)
    pkg_install libgtk-3-0 libnss3 libgbm1 libxshmfence1 libxdamage1 \
                libatk-bridge2.0-0 libatspi2.0-0 libcups2 libxrandr2 \
                libxcomposite1 libxfixes3
    # ALSA lib is libasound2 (pre-24.04) or libasound2t64 (24.04+).
    pkg_install libasound2t64 || pkg_install libasound2 ;;
  dnf)    pkg_install gtk3 nss alsa-lib libXScrnSaver mesa-libgbm libdrm ;;
  pacman) pkg_install gtk3 nss alsa-lib libxss mesa ;;
  zypper) pkg_install gtk3 mozilla-nss libasound2 libgbm1 ;;
esac

# ---- 2. Node.js + npm --------------------------------------------------------
node_major() { node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0; }

if have node && [ "$(node_major)" -ge "$MIN_NODE_MAJOR" ]; then
  log "Node.js $(node -v) found"
else
  log "Installing Node.js (>= ${MIN_NODE_MAJOR})"
  if [ "$PKG" = "apt" ] && [ -n "$SUDO" ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO -E bash - || warn "NodeSource setup failed"
    pkg_install nodejs
  else
    pkg_install nodejs npm
  fi
fi

have node || die "Node.js is required. Install Node >= ${MIN_NODE_MAJOR} (https://nodejs.org) and re-run."
have npm  || die "npm is required (usually bundled with Node.js)."
[ "$(node_major)" -ge "$MIN_NODE_MAJOR" ] || warn "Node $(node -v) is older than ${MIN_NODE_MAJOR}; the build may fail."

# ---- 3. clone or update ------------------------------------------------------
if [ -d "$DEST/.git" ]; then
  log "Updating existing checkout in $DEST"
  git -C "$DEST" fetch --depth 1 origin "$BRANCH"
  git -C "$DEST" checkout "$BRANCH"
  git -C "$DEST" reset --hard "origin/$BRANCH"
else
  [ -e "$DEST" ] && die "$DEST exists but is not a git checkout. Move it or set NOTEGRAPH_HOME."
  log "Cloning $REPO_URL (branch $BRANCH) into $DEST"
  git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$DEST"
fi
cd "$DEST"

# ---- 4. install + build ------------------------------------------------------
log "Installing npm dependencies (this can take a few minutes)"
npm install

log "Building the app"
npm run build

# ---- 5. launcher -------------------------------------------------------------
if [ -d "$HOME/.local/share/applications" ] || mkdir -p "$HOME/.local/share/applications" 2>/dev/null; then
  cat > "$HOME/.local/share/applications/notegraph.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=notegraph
Comment=Local-first personal knowledge graph
Exec=bash -lc 'cd "$DEST" && npm start'
Terminal=false
Categories=Office;Utility;
EOF
  log "Created application menu entry (notegraph)"
fi

log "notegraph installed in $DEST"
echo "    Start it any time with:  cd \"$DEST\" && npm start"

# ---- 6. launch ---------------------------------------------------------------
if [ "${NOTEGRAPH_NO_START:-0}" = "1" ]; then
  exit 0
fi
if [ -z "${DISPLAY:-}" ] && [ -z "${WAYLAND_DISPLAY:-}" ]; then
  warn "No graphical display detected — not launching. Run 'cd \"$DEST\" && npm start' from a desktop session."
  exit 0
fi
log "Launching notegraph…"
exec npm start
