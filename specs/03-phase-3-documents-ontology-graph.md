# Spec 03 — Phase 3: Documents + Ontology + Graph (the big phase)

**Status: Planned.** Source of truth: VISION.md §4.3, §5, §7; docs/ONTOLOGY.md §14, §15. This is the infrastructure cliff — several capabilities come online together. It introduces the **first and only network egress** (the Copilot SDK) for entity extraction.

## Goal

Populate the knowledge graph from real content. Documents and Phase-2 notes flow through a fully local ingestion pipeline; the ontology lights up in LadybugDB; hybrid search and a graph view arrive.

## Sub-phases

- **3a — Local pipeline foundation**: in-process job queue (Node `worker_threads` / Electron `utilityProcess`) backed by a SQLite `jobs` table; the `AiProvider` abstraction (`AgentProvider` = Copilot SDK, `EmbeddingProvider` = local model); bundled local embedding model (ONNX / transformers.js); LadybugDB vector index configured.
- **3b — Document ingestion**: local parsers — `mammoth` (docx), `pdfjs`/`pdf-parse` (pdf), built-in (txt/md). `documents/` in the working folder; a chunk-highlighted viewer.
- **3c — Chunking + local embeddings**: unified `Chunk` service (note + document paragraphs); semantic chunking on heading boundaries; local embeddings; hybrid search fusing FTS + LadybugDB vector similarity.
- **3d — Entity extraction + graph projection**: `AgentProvider.extract()` (Copilot SDK) returns typed entities + graph nodes; concept dedup via local vector similarity; a projection step writes ontology nodes/relationships into LadybugDB; review-status workflow; stored extraction outputs persisted in SQLite for offline re-projection.
- **3e — Graph view**: force-directed visualization + saved Cypher queries + concept-neighborhood exploration.
- **3f — Retroactive note extraction**: re-process Phase 1–2 notes through extraction.

## Dependencies added

Local embedding runtime (e.g. `onnxruntime-node` or `@xenova/transformers`), doc parsers (`mammoth`, `pdfjs-dist`), the GitHub Copilot SDK client, a force-directed graph component (e.g. `react-force-graph`).

## Data-model / schema changes

- LadybugDB: define the **node/rel tables** for the Minimum Viable Ontology (docs/ONTOLOGY.md §15) — LadybugDB is a structured property graph and requires explicit `CREATE NODE TABLE` / `CREATE REL TABLE`. Add the **vector index** over chunk/concept embeddings.
- SQLite: `documents`, `chunks` (metadata), `extraction_outputs`, `jobs`, `ai_invocations`, entity review-status tables.
- Working folder: `documents/` (original + extracted text).

## Ontology touchpoints

Projects the MVN node set (docs/ONTOLOGY.md §15): `Concept, Person, Organization, Project, Document, Note, Chunk, Event, Task, Decision, PersonFact, Problem/Attempt/Resolution/Runbook, Source, ExtractionJob, AiInvocation` and the v1 relationships. Gating: only `accepted|edited` entities project. `Rebuild graph` wipes + re-projects from working folder + SQLite, offline.

## Confirm-at-build-time

- **LadybugDB vector-index API** (create/query) and multi-label/constraint behavior for the pinned version.
- **Copilot SDK** package/API and auth flow (GitHub sign-in); whether it exposes embeddings (use local regardless).

## Acceptance criteria

- Import a docx/pdf → chunks appear with page/section anchors; searchable.
- Hybrid search returns relevant chunks across notes + documents (FTS + vector fused), fully offline.
- Extraction (Copilot SDK) produces reviewable entities; accepting them projects nodes/edges into LadybugDB; sensitivity defaults respected (docs/ONTOLOGY.md §9.4).
- Graph view shows concept clusters; clicking a concept reveals connected content; `Rebuild graph` reproduces an equivalent graph with no network calls.
- Only extraction/assistant calls touch the network; everything else works offline.

## Test plan

- Vitest: parsers → chunks; local embedding determinism; hybrid fusion ranking; projection idempotency (rebuild equals original); gating rules; extraction-output persistence enables offline rebuild.
- Manual: end-to-end ingest of several notes + documents; verify graph + hybrid search + offline rebuild.

## Risks

Native/ONNX model size vs. app bundle; LadybugDB schema migration discipline; Copilot auth/offline degradation (app must stay fully usable minus AI — VISION.md §11).
