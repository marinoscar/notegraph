# notegraph

A local-first personal knowledge graph on your desktop. Your notes, documents, and work become searchable, connected, and reusable — grounded in a rigorous personal ontology, stored in an embedded graph database, and kept entirely on your machine.

- **Desktop app** (Electron) — Windows, macOS, Linux
- **Embedded graph** — [LadybugDB](https://ladybugdb.com/), in-process, no server
- **AI via the GitHub Copilot SDK** — pluggable to other providers later
- **Offline-first** — the only thing that ever leaves your device is a Copilot SDK request

## Install

Run on a machine with a graphical desktop.

**Linux:**

```bash
curl -fsSL https://raw.githubusercontent.com/marinoscar/notegraph/main/install.sh | bash
```

**Windows (PowerShell):**

```powershell
irm https://raw.githubusercontent.com/marinoscar/notegraph/main/install.ps1 | iex
```

These check dependencies, clone the repo, build, and launch the app. See [`DEPLOY.md`](./DEPLOY.md) for options, manual install, and troubleshooting.

## Docs

See [`VISION.md`](./VISION.md) for the north-star vision and phased build plan, and [`docs/ONTOLOGY.md`](./docs/ONTOLOGY.md) for the knowledge-graph ontology.
