# notegraph — Build Specs Overview

These specs turn `VISION.md` and `docs/ONTOLOGY.md` into an executable, phase-by-phase build plan. One spec per phase. **Ship phase by phase**: a phase must be a working, installable app before the next begins (VISION.md §12.1).

| Spec | Phase | Status |
|---|---|---|
| [01](./01-phase-1-desktop-shell-notes.md) | Desktop Shell + Notes | **Implemented** |
| [02](./02-phase-2-organization.md) | Organization (groups, tags, richer search) | Planned |
| [03](./03-phase-3-documents-ontology-graph.md) | Documents + Ontology + Graph | Planned |
| [04](./04-phase-4-ai-over-corpus.md) | AI Over the Corpus (Copilot SDK) | Planned |
| [05](./05-phase-5-agent-work-capture.md) | Agent Work Capture | Planned |

## Cross-cutting architecture (all phases)

- **Delivery**: Electron desktop app (Windows / macOS / Linux). Main process (Node) owns all disk/DB/network; renderer (React + MUI) is UI-only and talks over a typed `contextBridge` preload API (`window.notegraph`). `contextIsolation: true`, `nodeIntegration: false`.
- **Three local stores** (VISION.md §5.1a):
  - **Working folder** (user-configurable) — content, the source of truth: `notes/`, later `documents/`, `inbox/`.
  - **SQLite** (`userData/notegraph.sqlite`) — settings + non-content metadata + search index + version history + (Phase 3) stored extraction outputs. A rebuildable projection of the working folder.
  - **LadybugDB** (`userData/notegraph.ladybug`) — the knowledge graph + chunks + vector index. Rebuildable from the working folder + SQLite. Opened in Phase 1; populated in Phase 3.
- **Local-only guarantee**: the GitHub Copilot SDK (Phase 3+) is the only thing that ever leaves the device. No cloud DB/storage/STT/telemetry. Everything else is offline.
- **AI abstraction** (Phase 3+): all AI goes through an `AiProvider` split into `AgentProvider` (network; v1 = Copilot SDK) and `EmbeddingProvider` (local; v1 = bundled ONNX model). Never call the SDK directly from feature code.
- **Ontology is the north star**: new node/relationship types land in `docs/ONTOLOGY.md` first, then the LadybugDB schema, then the projection step, then tests.

## Tech stack

electron-vite (dev/build) · electron-builder (packaging) · TypeScript · React 18 · MUI 6 · CodeMirror 6 (`@uiw/react-codemirror`) · better-sqlite3 (native) · `@ladybugdb/core` (native) · gray-matter · zod. Later: bundled local embedding model (ONNX / transformers.js), local doc parsers (mammoth / pdfjs), GitHub Copilot SDK.

## Confirm-at-build-time (moving targets, new in 2025–2026)

- **LadybugDB vector-index API** — confirm the exact create/query API and multi-label/constraint support for the pinned `@ladybugdb/core` version (Phase 3).
- **GitHub Copilot SDK surface** — confirm the package/API and whether it exposes embeddings (notegraph uses local embeddings regardless) (Phase 3).
- **Native modules under Electron** — `better-sqlite3` and `@ladybugdb/core` are native (N-API). They must load under Electron's ABI; electron-builder rebuilds them at package time. Verified loading under Electron ABI 148 during Phase 1.
