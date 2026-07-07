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
- **The graph is LadybugDB** — embedded, in-process, Cypher. One on-disk store for graph + chunks + vectors + app metadata. No Neo4j server, no Postgres, no pgvector, no Redis/BullMQ (background work runs in `worker_threads` / an Electron `utilityProcess`).
- **AI runs through the GitHub Copilot SDK only in v1**, and always behind the `AiProvider` abstraction — never call the SDK directly from feature code. `AgentProvider` (Copilot, network) is split from `EmbeddingProvider` (local, offline). OpenAI/Anthropic are future providers behind the same interface.
- **Embeddings are local** (bundled ONNX / `transformers.js`). Never send text to a remote embedding API.
- **Zero external connectivity except the Copilot SDK.** No cloud DB, object storage, cloud STT, telemetry, or CDN fetches. Notes, documents, search, and the graph view must work fully offline; only entity extraction and the assistant may touch the network.
- **Content files on disk are the source of truth; LadybugDB is a rebuildable projection.** Preserve the ability to wipe and re-project the graph from disk.
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

No build/lint/test commands exist yet. Once tooling lands (`package.json`, Electron scaffold), document here: how to run in dev (`npm run electron:dev`), package (`electron-builder`), and run tests (including a single test).
