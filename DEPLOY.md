# Deploying notegraph

notegraph is a cross-platform **desktop app** (Electron). These installers pull
everything from the git repo, check dependencies, install them where possible,
build the app, and launch it.

notegraph is **fully local** — your notes live on your machine and nothing but a
future opt-in AI feature ever leaves it. Because it's a desktop GUI app, install
and run it on a machine **with a graphical desktop** (not a headless server).

- **Repository:** https://github.com/marinoscar/notegraph
- **Scripts:** [`install.sh`](./install.sh) (Linux) · [`install.ps1`](./install.ps1) (Windows)

---

## Linux — one command

```bash
curl -fsSL https://raw.githubusercontent.com/marinoscar/notegraph/main/install.sh | bash
```

That's it. The script will:

1. Detect your package manager (`apt`, `dnf`, `pacman`, or `zypper`) and install
   dependencies it can: **git**, a **C/C++ build toolchain**, the **Electron GUI
   runtime libraries** (GTK, NSS, ALSA, …), and **Node.js ≥ 18** (via NodeSource
   on Debian/Ubuntu, or your distro's package otherwise).
2. Clone the repo to `~/notegraph`.
3. Run `npm install` and `npm run build`.
4. Add a **“notegraph” application-menu entry** and launch the app.

If some system packages need root, the script uses `sudo` when available. If it
can't auto-install something, it prints exactly what to install and continues.

### Options (set before the command)

```bash
# Install somewhere else, use a different branch, and don't auto-launch:
NOTEGRAPH_HOME="$HOME/apps/notegraph" NOTEGRAPH_BRANCH=main NOTEGRAPH_NO_START=1 \
  bash -c "curl -fsSL https://raw.githubusercontent.com/marinoscar/notegraph/main/install.sh | bash"
```

| Variable | Default | Meaning |
|---|---|---|
| `NOTEGRAPH_HOME` | `~/notegraph` | Clone/install directory |
| `NOTEGRAPH_BRANCH` | `main` | Git branch to build |
| `NOTEGRAPH_REPO` | public repo URL | Git URL to clone |
| `NOTEGRAPH_NO_START` | _(unset)_ | Set to `1` to build but not launch |

### Prefer to read before you run?

```bash
curl -fsSL https://raw.githubusercontent.com/marinoscar/notegraph/main/install.sh -o install.sh
less install.sh          # review it
bash install.sh
```

---

## Windows — one command

Open **PowerShell** and run:

```powershell
irm https://raw.githubusercontent.com/marinoscar/notegraph/main/install.ps1 | iex
```

The script will:

1. Ensure **git** and **Node.js LTS** are installed (via **winget** if they're
   missing), and warn if the Visual C++ Build Tools are absent (only needed if a
   native module has to compile from source — normally the prebuilt binaries are
   used).
2. Clone the repo to `%USERPROFILE%\notegraph`.
3. Run `npm install` and `npm run build`.
4. Create a **Start Menu shortcut** and launch the app.

> If git or Node.js were just installed, PowerShell may need a fresh window to
> pick them up on `PATH`. If the script says a tool isn't found, open a new
> PowerShell window and run the one-liner again.

### Options (set before the command)

```powershell
$env:NOTEGRAPH_HOME = "C:\apps\notegraph"
$env:NOTEGRAPH_NO_START = "1"
irm https://raw.githubusercontent.com/marinoscar/notegraph/main/install.ps1 | iex
```

| Variable | Default | Meaning |
|---|---|---|
| `$env:NOTEGRAPH_HOME` | `%USERPROFILE%\notegraph` | Clone/install directory |
| `$env:NOTEGRAPH_BRANCH` | `main` | Git branch to build |
| `$env:NOTEGRAPH_REPO` | public repo URL | Git URL to clone |
| `$env:NOTEGRAPH_NO_START` | _(unset)_ | Set to `1` to build but not launch |

### Prefer to read before you run?

```powershell
irm https://raw.githubusercontent.com/marinoscar/notegraph/main/install.ps1 -OutFile install.ps1
notepad install.ps1      # review it
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

---

## Manual install (any OS)

If you'd rather do it by hand:

```bash
git clone https://github.com/marinoscar/notegraph.git
cd notegraph
npm install
npm run build
npm start          # launches the app
```

**Prerequisites:** Node.js ≥ 18 and git. On Linux you also need the Electron GUI
runtime libraries (GTK, NSS, ALSA, GBM …) — the installer lists the exact package
names for your distro. On Windows/macOS those ship with the OS.

---

## Updating

Re-running the installer updates an existing checkout in place (it fetches the
branch, hard-resets to it, reinstalls, and rebuilds). Or manually:

```bash
cd ~/notegraph        # or %USERPROFILE%\notegraph on Windows
git pull
npm install
npm run build
npm start
```

---

## Running / everyday use

- **Linux:** launch **notegraph** from your application menu, or `cd ~/notegraph && npm start`.
- **Windows:** launch **notegraph** from the Start Menu, or `cd $HOME\notegraph; npm start`.

On first launch you'll pick a **working folder** — that's where your notes are
stored as markdown files. Choose somewhere you back up; you can change it later
in Settings.

---

## Building a distributable installer (optional)

`npm start` runs the app from a build. To produce a native installer (`.AppImage`
on Linux, `.dmg` on macOS, `.exe`/NSIS on Windows) for sharing:

```bash
npm run package     # output in dist/
```

electron-builder rebuilds the native modules for Electron and emits an installer
for the platform you run it on.

---

## Troubleshooting

- **“No graphical display detected” (Linux)** — notegraph is a desktop GUI app;
  run it from a real desktop session, not over a plain SSH shell or on a headless
  server.
- **A native module fails to build during `npm install`** — install a C/C++
  toolchain: Linux `build-essential python3` (Debian/Ubuntu) or the equivalent;
  Windows `winget install --id Microsoft.VisualStudio.2022.BuildTools -e`.
- **git / node “not found” right after install (Windows)** — open a new
  PowerShell window so the updated `PATH` is loaded, then re-run.
- **Corporate proxy / offline** — set `HTTPS_PROXY`/`HTTP_PROXY` before running so
  git and npm can reach the registry. The app itself needs no network after it's
  built.
- **Running as root on Linux** — Electron's sandbox needs a non-root user; install
  and run as your normal user.
