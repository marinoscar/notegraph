# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

`notegraph` is pre-code: the vision and data model are specified, but no source, `package.json`, or build/test tooling exists yet. The two canonical seed documents define what to build:

- **[`VISION.md`](./VISION.md)** — north-star vision and the value-first, 5-phase build plan.
- **[`docs/ONTOLOGY.md`](./docs/ONTOLOGY.md)** — the knowledge-graph ontology specification (the data model's north star). Peer document to VISION.

Read both before writing code or planning a phase. When the ontology and code disagree, the ontology wins — update `docs/ONTOLOGY.md` first, then the schema/projection, then tests.

## What notegraph is

A **local-first personal knowledge graph desktop app**: your notes, documents, and work become a searchable, connected, ontology-grounded graph that lives entirely on your machine. It is a sibling of [`marinoscar/knotes`](https://github.com/marinoscar/knotes) — same ontology and philosophy, different delivery.

## Hard architectural constraints (from VISION.md)

These are load-bearing. Do not violate them without an explicit decision recorded in `VISION.md`:

- **Delivery is an Electron desktop app** (Windows/macOS/Linux). Main process owns the graph, filesystem, ingestion pipeline, local embedding model, and AI client; the React renderer is UI-only and talks to main over IPC. No server backend.
- **Three local stores, kept separate** (VISION.md §5.1a):
  - **Working folder** — user-configurable in Settings; holds content (markdown notes, imported documents, agent-work inbox). This is the **source of truth**, and the user picks the location so their data is durable/referenceable. Never bury content in an opaque path.
  - **SQLite file** — app settings and non-content metadata: preferences, the working-folder path, groups/tags, the job queue, the `AiInvocation` usage log, and stored extraction outputs. Anything that is "settings or metadata for the app" goes here, **not** in LadybugDB.
  - **LadybugDB** — embedded, in-process, Cypher; holds only the derived graph + chunks + vectors. It is a **rebuildable projection** of the working folder + SQLite; it must never hold unique source-of-truth data.
- No Neo4j server, no Postgres, no pgvector, no Redis/BullMQ (background work runs in `worker_threads` / an Electron `utilityProcess` with a SQLite-backed job queue).
- **AI runs through the GitHub Copilot SDK only in v1**, and always behind the `AiProvider` abstraction — never call the SDK directly from feature code. `AgentProvider` (Copilot, network) is split from `EmbeddingProvider` (local, offline). OpenAI/Anthropic are future providers behind the same interface.
- **Embeddings are local** (bundled ONNX / `transformers.js`). Never send text to a remote embedding API.
- **Zero external connectivity except the Copilot SDK.** No cloud DB, object storage, cloud STT, telemetry, or CDN fetches, and **no data is ever uploaded for storage** — all persistence is local (working folder + SQLite + LadybugDB). Notes, documents, search, and the graph view must work fully offline; only entity extraction and the assistant may touch the network.
- **Working folder + SQLite are the source of truth; LadybugDB is a rebuildable projection.** Persist extraction outputs in SQLite so `Rebuild graph` re-projects fully offline (no Copilot re-calls). Preserve the ability to wipe and rebuild LadybugDB at any time.
- **Single local user.** No OAuth/JWT/RBAC; the only external identity is the GitHub account used for Copilot. Still scope records by `ownerId` for forward-compatibility with the shared ontology.

## Build phases (see VISION.md §4)

Ship phase by phase; each phase must be a working, installable app before the next begins.

1. **Desktop shell + Notes** — Electron scaffold, markdown editor, local files, LadybugDB init, local full-text search.
2. **Organization** — hierarchical groups, polymorphic tags. Still fully offline.
3. **Documents + Ontology + Graph** — local doc parsing, unified chunks, local embeddings + LadybugDB vector index (hybrid search), Copilot-SDK entity extraction → graph projection, graph view.
4. **AI over the corpus** — conversational KG assistant (Copilot SDK agentic engine), summaries, rewrite, quote reuse, near-duplicate detection.
5. **Agent work capture** — coding-agent session summaries (local inbox) → Problem/Attempt/Resolution/Runbook nodes.

Deferred to later versions: local audio (via `whisper.cpp`), native OpenAI/Anthropic providers, multi-device sync.

## Two moving-target facts to verify at build time

Both are new in 2025–2026 — confirm against the versions you pin rather than assuming:

- **LadybugDB's vector-index API** (creation/query) and multi-label/constraint support.
- **The GitHub Copilot SDK surface** (models at runtime; whether it exposes embeddings — notegraph uses local embeddings regardless).

## Commands

Phase 1 (Desktop Shell + Notes) is implemented — an electron-vite + React 18 + MUI 6 app.

- `npm install` — install deps (native modules: `better-sqlite3`, `@ladybugdb/core`).
- `npm run dev` — launch the app in development (needs a display).
- `npm run build` — bundle main/preload/renderer to `out/`.
- `npm run package` — build + `electron-builder` installer to `dist/` (rebuilds native modules for Electron's ABI).
- `npm run typecheck` — `tsc` for both the node (main/preload) and web (renderer) project refs.
- `npm test` — Vitest unit tests for main-process services (`npx vitest run test/notes.test.ts` for a single file).

## Layout

- `src/main/` — Electron main: `db/` (better-sqlite3 Store + migrations), `services/` (notes, workspace, ladybug), `ipc/`. Owns all disk/DB access.
- `src/preload/` — `contextBridge` exposing the typed `window.notegraph` API.
- `src/renderer/` — React + MUI UI (pages, components, CodeMirror editor).
- `src/shared/` — cross-process types, ontology constants, IPC contract (`api.ts`).
- `specs/` — per-phase build specs (00 overview + 01–05); `01` is the implemented one.
- Three stores at runtime: the user's **working folder** (`notes/*.md`, source of truth), `userData/notegraph.sqlite` (settings/index/FTS/versions), `userData/notegraph.ladybug` (graph; opened in Phase 1, populated in Phase 3).
