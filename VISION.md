# notegraph

> *A local-first personal knowledge graph on your desktop, where everything you write, read, and work through becomes searchable, connected, reusable, and grounded in a rigorous personal ontology — without leaving your machine.*

**Repository**: `github.com/marinoscar/notegraph`
**Delivery**: cross-platform **Electron desktop app** (Windows, macOS, Linux)

**Peer documents**:
- `docs/ONTOLOGY.md` — the canonical ontology specification (standards-aligned knowledge graph profile). The ontology is the **north star** for the data model; this VISION.md describes how to build toward it.

**Lineage**: notegraph is a sibling of [`marinoscar/knotes`](https://github.com/marinoscar/knotes) and reuses its knowledge-graph vision and ontology. It differs deliberately on four axes: it is a **desktop app** (Electron), its AI runs through the **GitHub Copilot SDK** (pluggable to other providers later), its graph lives in an **embedded LadybugDB** database, and it has **no external connectivity other than the Copilot SDK**. Where knotes is a cloud-connected web app, notegraph is **offline-first and private-by-default**.

---

## 1. Vision

notegraph is a personal knowledge workspace that turns your **notes, documents, and work** into a single connected corpus that is:

- **Searchable** — lexically, semantically, and structurally
- **Connected** — people, concepts, organizations, projects, decisions, problems, and reusable knowledge link across everything you capture
- **Reusable** — find what you wrote about X six months ago and quote it into a new document; remember what you tried last time a problem occurred
- **Auditable** — every piece of generated knowledge points back to source evidence (document offset, note paragraph, agent step, command output)
- **Governed** — facts have sensitivity, review status, and provenance; user-curated knowledge wins over AI extraction
- **Local** — the corpus, the graph, the embeddings, and the search index all live on your device; the only thing that ever leaves the machine is a Copilot SDK request, and only when you invoke an AI feature

The conceptual ancestor is Vannevar Bush's 1945 *Memex* — a personal device for augmenting memory through associative trails. notegraph extends that idea to include **the full loop of human and AI-assisted work**: not just what you read or wrote, but what you decided, did, solved, and reused — and it does so as an app you install, not a service you log into.

### 1.1 Why Local-First and Desktop

knotes proved the knowledge-graph vision as a cloud web app. notegraph asks a different question: *what if the entire corpus never left your machine?*

- **Privacy by construction.** Your notes and documents are never uploaded to object storage, never transcribed by a cloud service, never embedded by a remote API. The graph engine is embedded in the app process.
- **Works offline.** Capture, organize, search, and explore the graph with no network at all. AI features (extraction, the assistant) are the only network-dependent surface, and they use exactly one egress: the Copilot SDK.
- **No servers to operate.** No Postgres, no Neo4j server, no Redis, no S3 bucket, no reverse proxy, no VPS. The app *is* the backend.
- **Runs everywhere.** One Electron codebase ships to Windows, macOS, and Linux.

### 1.2 North Star

The ontology defined in `docs/ONTOLOGY.md` is the north star for what notegraph *will eventually be*. This VISION.md describes the **value-first build path** to get there incrementally.

The killer property: **everything you've ever written, read, decided, or solved connects to everything else — privately, on your machine.** You should be able to ask: *"What have I written and read about agentic systems across all my projects? Which decisions came out of that work? What problems did I hit, and how did I solve them?"* — and get a graph-traversed answer with paragraph-level and command-level provenance, computed entirely locally.

### 1.3 notegraph vs. knotes

The two projects share an ontology and a philosophy; they differ in delivery and infrastructure:

| Dimension | knotes | **notegraph** |
|---|---|---|
| Delivery | React SPA + NestJS API on a VPS (`knotes.marin.cr`) | **Electron desktop app** (Windows / macOS / Linux) |
| Where data lives | Postgres + Neo4j server + AWS S3 (cloud) | **All local**: LadybugDB file + content files on disk |
| Graph engine | Neo4j Community 5 (server / container) | **LadybugDB** (embedded, in-process, Cypher) |
| Vector / semantic search | OpenAI `text-embedding-3-small` + pgvector | **Bundled local embedding model** + LadybugDB vector index |
| AI connectivity | Multi-provider cloud (OpenAI / Anthropic / OpenAI-compatible) + Whisper | **GitHub Copilot SDK only (v1)**; pluggable to OpenAI / Anthropic later |
| Network posture | Cloud-connected by design | **No external connectivity except the Copilot SDK**; offline-capable |
| Capture surfaces | Speech + Text + Work (audio-heavy, cloud STT) | **Text / notes + Documents + Work** first; local audio deferred |
| Background infra | Redis + BullMQ + worker services | **In-process pipeline** (worker threads / Electron `utilityProcess`); no Redis |
| Auth | Google OAuth + JWT + RBAC | **Single local user**; GitHub auth only to reach Copilot |
| System of record | Postgres authoritative; Neo4j is a projection | **Content files on disk** authoritative; LadybugDB is a rebuildable projection |

---

## 2. Core Concept Model

The unifying primitive is the **Chunk** — a unit of content with provenance and meaning:

- **Provenance**: where it came from (note paragraph, document page + offset, agent step, command output)
- **Content**: the text itself, plus a locally-computed embedding, plus extracted entities

Multiple ingestion paths converge on chunks:

```
Notes          → user-authored markdown              → Paragraphs   (= chunks)
Documents      → local docx/pdf/txt/md parser         → Paragraphs   (= chunks)
Agent work     → markdown summaries (via skill)        → Decisions,   (= ontology nodes
                                                         attempts,       directly, not chunks)
                                                         resolutions
```

Three retrieval modes operate over the resulting graph, and — because LadybugDB is an embedded property-graph store with a vector index — **all three run against a single local engine**:

- **Lexical** — full-text search over chunk text
- **Semantic** — vector similarity over locally-computed embeddings, using LadybugDB's vector index
- **Structural** — Cypher traversal in LadybugDB

Hybrid queries combine all three. Every result carries evidence pointers back to source chunks. No part of retrieval touches the network.

### 2.1 Content vs. Knowledge

A core principle from the ontology (§3.2 of `ONTOLOGY.md`): **content is evidence, not knowledge by itself.** A note is evidence. A document is evidence. An agent execution summary is evidence. The knowledge graph is built from people, concepts, decisions, actions, tasks, problems, resolutions, code changes, and relationships extracted or curated from that evidence.

Every generated knowledge node points back via `SUPPORTED_BY` to the source chunk that justifies it. This is the foundation for trust, review, and auditability.

---

## 3. Killer Workflows

These are the concrete use cases that justify the system. Each threads multiple features and earns its place on the roadmap.

### 3.1 Build a Knowledge Corpus

1. Write notes in a markdown editor with autosave + version history
2. Import documents (proposals, reports, memos in docx/pdf/txt/md) — parsed **locally**
3. The app chunks, embeds (locally), and extracts entities into the ontology
4. Organize into hierarchical groups (Client → Project → Workstream)
5. Tag liberally; tags are polymorphic across all content types
6. The graph grows automatically as content is added — all on your machine

### 3.2 Reuse What You've Written

1. Ask: *"What have I written about ontology governance in energy-sector contexts?"*
2. The app runs hybrid retrieval: local semantic + lexical + graph traversal
3. Returns paragraphs with full context, sortable by recency and relevance
4. Click any result to jump to the source note or document at that exact offset
5. One-click "insert as quote" into a document being authored

### 3.3 Remember How You Fixed It

1. Hit an issue you've seen before (deployment failing, a tricky migration, a config gotcha)
2. Ask notegraph: *"How did I fix this last time?"*
3. The graph returns prior `Problem` nodes with matching symptoms, the `Attempts` that failed, the `Resolution` that worked, and the `Runbook` to follow
4. If a coding agent (Copilot, Claude Code, or another) encountered the same error, its `AgentRun` summary surfaces too — what files it touched, what commands worked

### 3.4 Bootstrap an Agent Task

1. Before starting a coding-agent session, query: *"What similar work have I done? What patterns apply?"*
2. notegraph returns relevant `ReusablePattern` nodes, prior `AgentRun` summaries, applicable `Runbook` procedures, and files commonly involved
3. Hand that context pack to the agent at session start
4. After the session, the agent emits its own work summary back into the graph (Phase 5)

### 3.5 Explore the Graph

1. Open the graph view
2. See concept clusters from your corpus
3. Click a concept → see all chunks, decisions, and problems mentioning it
4. See related concepts, the people who discuss them, the documents that contain them
5. Save useful Cypher queries for repeated use

---

## 4. Feature Set By Phase

notegraph is built in five value-first phases. Each phase ships independently and produces real daily-driver utility. The riskiest infrastructure work (documents, embeddings, extraction, graph projection) happens *after* the simpler features have proven their value.

### 4.1 Phase 1 — Desktop Shell + Notes

**Goal**: a working, installable notegraph desktop app that replaces your plain-text note tool.

**In scope**:
- Electron scaffold: main process + renderer + IPC, cross-platform packaging (Windows / macOS / Linux)
- Notes module: markdown editor (CodeMirror 6), autosave, version history
- Local file storage: notes persist as markdown files in the app data directory
- LadybugDB initialized as the embedded store (opens a database file on disk)
- Local full-text search over notes
- **Ontology metadata on every note from day one** (zero cost now, expensive retrofit later): `ownerId` (a local user id), `ontologyVersion`, `reviewStatus` (default `accepted`, since user-authored), `sensitivity` (default `business`, user-editable), `createdAt`, `updatedAt`, `lastConfirmedAt`

**Out of scope**: documents, embeddings/semantic search, entity extraction, the graph view, any AI.

**Network**: none. Phase 1 is fully offline.

### 4.2 Phase 2 — Organization

**Goal**: a daily-driver knowledge-capture surface. Notes searchable, organized, tagged.

**In scope**:
- Groups: hierarchical folders (Client → Project → Workstream)
- Tags: polymorphic, color-coded, applied to notes (extends to documents in Phase 3)
- Richer local search across notes and groups

**Network**: none. Still 100% offline.

### 4.3 Phase 3 — Documents + Ontology + Graph (the big phase)

**Goal**: populate the knowledge graph from real content. Documents and Phase-2 notes flow through a **fully local** ingestion pipeline; the ontology lights up. This is the infrastructure cliff — several capabilities come online together because the chain doesn't make sense in pieces.

**Sub-phases**:
- **3a — Local pipeline foundation**: an in-process job queue (worker threads / Electron `utilityProcess`, replacing Redis/BullMQ); the `AiProvider` abstraction (see §7); the bundled local embedding model; LadybugDB vector index configured.
- **3b — Document ingestion**: local parsers for docx (`mammoth`), pdf (`pdf-parse` / `pdfjs`), txt, md. Documents module with a chunk-highlighted viewer. Page/section anchors for notes.
- **3c — Chunking + local embeddings**: unified `Chunk` service (note paragraphs + document paragraphs); semantic chunking with heading-boundary overlap; **local embedding pipeline** (ONNX / `transformers.js`, fully offline); hybrid search fusing full-text + LadybugDB vector similarity.
- **3d — Entity extraction + graph projection**: an extraction step (Copilot SDK — the only network-touching step) returns typed entities (`Concept`, `Person`, `Organization`, `Project`, `Event`) and graph nodes; concept dedup (embedding-similar concepts merge to canonical); a projection step writes ontology v1 nodes + relationships into LadybugDB; PersonFact sensitivity defaults (§10.3); review-status workflow (`unreviewed` → `accepted` / `edited` / `rejected` / `merged`).
- **3e — Graph view**: force-directed visualization, saved Cypher queries, concept-neighborhood exploration.
- **3f — Retroactive note extraction**: re-process Phase 2 notes through extraction so they contribute concepts, people, and organizations to the graph.

**Ontology v1 node coverage** (see `ONTOLOGY.md §15`, "Minimum Viable Ontology"):

```
Agent, Person, Organization, Project, Group, Tag
Concept
Document, Note, Chunk
Event, Meeting
Task, Decision, Deliverable
PersonFact
Problem, Attempt, Resolution, Runbook, Step
Source, ExtractionJob, AiInvocation
```

**Network**: only the extraction step (3d) calls out, and only through the Copilot SDK. Everything else — parsing, chunking, embedding, projection, search, the graph view — is local.

### 4.4 Phase 4 — AI Over the Corpus (Copilot SDK)

**Goal**: the corpus actively serves you. The graph isn't just queryable — it's generative. This phase leans into the Copilot SDK's strength: it is an **agentic** engine, not just a completions endpoint.

**Delivered**:
- **Conversational KG assistant** — a streaming, tool-calling agent (built on the Copilot SDK) that answers natural-language questions grounded in your local knowledge graph. The agent searches the graph, retrieves entity neighborhoods, surfaces evidence (source snippets + clickable entity cards linking into the graph view), and — with confirmation — applies reversible graph mutations.
- AI summaries, action items, and topic extraction per note/document
- Rewrite / tighten / reframe tools for notes
- Cross-content quote extraction ("insert what I wrote last quarter about X")
- "Did I already write this?" near-duplicate detection via local embedding similarity

All of these use the `AiProvider` abstraction (§7); local embedding similarity needs no network at all, and only the generative calls use the Copilot SDK.

### 4.5 Phase 5 — Agent Work Capture

**Goal**: AI-agent work becomes first-class knowledge. Every meaningful coding-agent session contributes Problem/Attempt/Resolution/Runbook/ReusablePattern nodes to the graph.

**In scope**:
- A capture **skill** (`notegraph-capture`) produces a structured markdown summary at session end (template maps 1:1 to ontology nodes)
- A Stop hook auto-invokes the skill
- The skill writes to a **local inbox folder** (`~/.notegraph/inbox/*.agent-work.md`) — no cloud upload
- An `AgentWorkProcessor` (in-process) parses the markdown and creates `AgentRun`, `Problem`, `Attempt`, `Resolution`, `Runbook`, `CodeChange`, `CommandRun`, `ReusablePattern` nodes
- UI to browse `AgentRun` history and derived runbooks
- "Find similar prior work" query (Scenarios 4 and 9 in `ONTOLOGY.md §13`)

This is deliberately **distilled markdown, not raw trace ingestion** — the agent is the best summarizer of its own work, and a local inbox keeps the whole loop on-device.

### 4.6 Deferred (later versions)

- **Local audio capture** — recording + local transcription via `whisper.cpp` (WASM or native), keeping the local-only guarantee. Deferred from v1 because knotes' audio path depended on cloud STT, which notegraph forbids.
- **Additional AI providers** — native OpenAI and native Anthropic providers behind the `AiProvider` interface (see §7); a fully-offline local-model provider (e.g., Ollama) for AI features with zero egress.
- **Multi-device sync** — optional, user-controlled sync of the local corpus across machines.

### 4.7 Non-Goals

Out of scope across all phases (unless explicitly added later):

- ❌ Any cloud backend, server-side database, or object storage
- ❌ **Any external network call other than the GitHub Copilot SDK** (v1's single, hard constraint)
- ❌ Cloud speech-to-text or cloud embeddings
- ❌ Multi-user / real-time collaboration (single local user)
- ❌ Mobile-native apps (desktop via Electron is the target)
- ❌ A web-hosted SPA / SSR deployment
- ❌ Redis / BullMQ / a separate worker service (the in-process pipeline replaces them)
- ❌ Full agent execution-trace capture (the markdown-skill approach is intentional)

---

## 5. Architecture

### 5.1 Process Model

notegraph has no server. It is an Electron app with a clear split between the privileged main process and the UI:

- **Main process (Node.js)** owns everything local: the LadybugDB connection, the filesystem (notes + documents + inbox), the ingestion pipeline, the local embedding model, and the Copilot SDK client. This is the only place that opens files or the network.
- **Renderer (React)** is the UI: the markdown editor, the document viewer, hybrid search, and the graph view. It holds no secrets and makes no direct network or disk calls.
- **IPC** connects them: the renderer calls typed IPC handlers in main for reads, writes, search, extraction, and assistant turns.
- **Background jobs** (parse → chunk → embed → extract → project) run off the UI thread via Node `worker_threads` or an Electron `utilityProcess`. A small persisted job table in LadybugDB replaces Redis/BullMQ.

### 5.2 High-Level Diagram

```
                    notegraph.app  (Electron)
   ┌───────────────────────────────────────────────────────────┐
   │  Renderer (React)                                          │
   │  CodeMirror editor · Document viewer · Hybrid search       │
   │  Graph view (force-directed) · Cypher console · Assistant  │
   └───────────────────────────┬───────────────────────────────┘
                               │ IPC (typed handlers)
   ┌───────────────────────────┴───────────────────────────────┐
   │  Main process (Node)                                       │
   │                                                            │
   │   Notes/Docs service ──► [ Local files on disk ]           │
   │                          (markdown notes, imported docs,   │
   │                           ~/.notegraph/inbox agent summaries)
   │                                                            │
   │   Ingestion pipeline (worker_threads / utilityProcess)     │
   │     parse → chunk → embed → extract → project              │
   │        │        │       │        │         │               │
   │        │        │       │        │         └─► LadybugDB    │
   │        │        │       │        │             (graph +     │
   │        │        │       │        │              chunks +    │
   │        │        │       │        │              vectors +   │
   │        │        │       │        │              app meta)   │
   │        │        │       └─► [ Local embedding model ]       │
   │        │        │            (ONNX / transformers.js)       │
   │        │        │            fully offline                  │
   │        │        └─► Chunk service                           │
   │        └─► Local doc parsers (mammoth / pdfjs)              │
   │                                                            │
   │   AiProvider abstraction                                    │
   │     └─► CopilotAgentProvider ──────────────► GitHub Copilot │
   │            (entity extraction, assistant)      SDK  ── the  │
   │                                                ONLY egress  │
   └───────────────────────────────────────────────────────────┘

   Everything except the Copilot SDK call runs on-device and offline.
```

### 5.3 Key Architectural Decisions

- **LadybugDB is the embedded store.** An in-process property-graph database (the KuzuDB successor; "DuckDB for graphs"), it needs no server and speaks Cypher — so the knotes ontology, already expressed in Cypher, ports over directly. It holds the graph, the chunks, the vector index, and app metadata in one on-disk database file.
- **One store, not three.** knotes used Postgres (system of record) + Neo4j (projection) + pgvector (embeddings). notegraph collapses these: the durable **source of truth is the content files on disk** (markdown notes + imported documents + agent-work summaries), and LadybugDB is a **rebuildable projection** of the graph + chunks + embeddings derived from them. Wipe LadybugDB and re-project from the files at any time.
- **Embeddings are local.** A bundled embedding model (ONNX / `transformers.js`) computes vectors in-process. Semantic search never touches the network. (LadybugDB's vector-index API is the intended index; confirm the exact API against the LadybugDB version pinned at build time — see §12.)
- **Copilot SDK is the only egress.** Entity extraction and the assistant are the sole network-touching features, and they route through exactly one provider. Notes, documents, organization, search, and graph exploration all work with the network disabled.
- **In-process pipeline.** Background work runs in worker threads / a utility process with a persisted job table — no Redis, no external broker.
- **Single local user.** No OAuth, no JWT, no RBAC. The only external identity is the GitHub account used to authenticate the Copilot SDK. Queries still carry `ownerId` for forward-compatibility with the shared ontology.

---

## 6. Tech Stack

| Concern | Choice | Phase Added |
|---|---|---|
| App shell | Electron (main + renderer + IPC) | 1 |
| Language | TypeScript 5.x | 1 |
| UI framework | React 18 | 1 |
| Markdown editor | CodeMirror 6 | 1 |
| Local storage (content) | Filesystem in the app data directory | 1 |
| Graph + chunk + vector store | **LadybugDB** (embedded, Cypher, on-disk) | 1 (graph used from 3) |
| Background jobs | Node `worker_threads` / Electron `utilityProcess` + persisted job table | 3a |
| AI (v1) | **GitHub Copilot SDK** (`@github/copilot`, TypeScript) | 3d |
| Embeddings | **Local model** (ONNX Runtime / `transformers.js`), fully offline | 3c |
| Document parsing | `mammoth` (docx), `pdf-parse` / `pdfjs` (pdf), built-in (txt/md) | 3b |
| Graph visualization | Force-directed graph component (e.g. `react-force-graph`) | 3e |
| Packaging | `electron-builder` (Windows / macOS / Linux targets) | 1 |
| Agent capture | Capture skill + Stop hook + local inbox | 5 |

Nothing in this stack requires a network service. The Copilot SDK is the only component that makes an outbound request, and only when an AI feature is invoked.

---

## 7. AI Strategy

notegraph's AI is **provider-pluggable from day one, with the GitHub Copilot SDK as the sole v1 implementation.** The requirement is: ship on Copilot now; be able to add OpenAI or Anthropic later without touching feature code.

### 7.1 Why the Copilot SDK

The GitHub Copilot SDK (technical preview January 2026; public preview April 2026) is a multi-language **agentic** SDK — the same engine that powers the Copilot CLI, exposed programmatically. It is available in TypeScript, which fits Electron/Node natively. It handles planning, tool invocation, multi-turn conversation, and session lifecycle, so notegraph's assistant (Phase 4) gets an agent runtime rather than a bare completions call. The SDK also exposes the models available at runtime and supports bring-your-own-key for other providers.

Two consequences shape the design:

1. The Copilot SDK is **agent-oriented, not a raw completions/embeddings endpoint.** Its embeddings surface is not something notegraph relies on — embeddings are handled by a separate **local** provider. *(Confirm the SDK's embeddings capability against the pinned version; notegraph defaults to local embeddings regardless — see §12.)*
2. Because the SDK itself supports BYOK for OpenAI/Anthropic, there are two future paths to other providers: through the Copilot SDK's own key configuration, or as first-class native providers behind notegraph's own abstraction. notegraph builds the abstraction so it isn't locked to either.

### 7.2 The `AiProvider` Abstraction

AI capabilities are split into two interfaces so the network-touching part and the local part evolve independently:

```typescript
// main/ai/index.ts

// Network-touching, agentic. v1 = Copilot SDK.
export interface AgentProvider {
  extract<T>(prompt: string, schema: Schema<T>, opts?: AiOpts): Promise<T>;
  summarize(text: string, opts?: AiOpts): Promise<string>;
  rewrite(text: string, instruction: string, opts?: AiOpts): Promise<string>;
  assistant(session: AssistantSession, messages: Message[]): AsyncIterable<AssistantEvent>;
}

// Local, offline. v1 = bundled ONNX model.
export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
}
```

**v1 implementations**:
- `CopilotAgentProvider` — wraps `@github/copilot`; used for entity extraction (Phase 3d) and the assistant (Phase 4). The **only** provider that touches the network.
- `LocalEmbeddingProvider` — a bundled ONNX / `transformers.js` model; used for all semantic search and near-duplicate detection. Never touches the network.

**Future implementations** (behind the same interfaces, no feature-code changes):
- `OpenAIAgentProvider`, `AnthropicAgentProvider` — native providers, added when the user wants them.
- The Copilot SDK's own BYOK routing as an interim path to those models.
- `OllamaAgentProvider` / a local LLM — for a fully-offline AI mode with zero egress.

### 7.3 Task → Provider Routing

Config-driven, like knotes' task routing, but every task defaults to Copilot in v1:

```yaml
# config/ai-tasks.yaml
tasks:
  entity_extraction:  { provider: copilot }
  summarization:      { provider: copilot }
  note_rewrite:       { provider: copilot }
  assistant:          { provider: copilot }
  embedding:          { provider: local }     # always local
```

Switching a task to a future provider is a config edit, not a code change. The **single-egress guarantee** is structural: only `AgentProvider` calls reach the network, and in v1 there is exactly one `AgentProvider` — the Copilot SDK.

### 7.4 Usage Tracking

Every `AgentProvider` call is recorded locally as an `AiInvocation` row (task, provider, model, token counts if available, latency) in LadybugDB, surfaced in an in-app usage view. No telemetry leaves the device.

---

## 8. Data & Graph Model

- **Source of truth**: content files on disk — markdown notes, imported documents (kept in original form + extracted text), and `~/.notegraph/inbox/*.agent-work.md` summaries.
- **Projection**: LadybugDB holds the ontology graph (nodes + relationships), the `Chunk` records, their local embeddings (vector index), and lightweight app metadata (groups, tags, jobs, `AiInvocation` log).
- **Rebuildable**: because the files are authoritative, `Rebuild graph` wipes LadybugDB and re-derives the projection from the files + stored extraction outputs at any time — the same guarantee knotes gives with "Neo4j is rebuildable from Postgres," adapted to a local, file-first world.
- **Ontology metadata everywhere**: notes carry `ownerId`, `ontologyVersion`, `reviewStatus`, `sensitivity`, and timestamps from Phase 1, so Phase 3 extraction can project them without a migration.

The mapping from content to ontology nodes, and the node/relationship schemas, are specified in `docs/ONTOLOGY.md`. When adding a new node type, update `ONTOLOGY.md` first, then the LadybugDB schema/constraints, then the projection step, then tests.

**Open question**: whether plain relational/app-settings data (window state, preferences) lives in LadybugDB alongside the graph or in a tiny separate SQLite file. Default lean: keep it in LadybugDB to stay single-store; revisit if the relational surface grows (see §11).

---

## 9. Knowledge Graph Ontology

The canonical ontology specification is `docs/ONTOLOGY.md`, adapted from the knotes ontology. It defines:

- **Standards profile** (Schema.org, SKOS, PROV-O, Web Annotation, ActivityStreams, with `ng:` extensions)
- **Ontology layers** (Agent, Relationship Intelligence, Content, Concept, Activity/Work, Problem Resolution, Agent Work, Provenance, Annotation)
- **Node labels and relationships** with property schemas
- **Governance rules** (review status, confidence, source traceability, sensitivity handling)
- **Hybrid retrieval patterns** combining lexical + vector + graph, all local
- **Example Cypher queries** for the killer workflows in §3

The ontology is delivery-agnostic — it is already expressed as a Cypher property graph, which is exactly what LadybugDB implements. The main adaptations from knotes are: the namespace (`ng:`), the graph engine (LadybugDB), the system of record (local files + LadybugDB), and the provenance/agent layer (GitHub Copilot as the primary `SoftwareAgent`, a local model as the embedding service).

---

## 10. Constraints & Defaults

### 10.1 The Local-Only Guarantee

This is notegraph's defining constraint:

> **In v1, the GitHub Copilot SDK is the only thing that ever leaves the device.**

- Notes, documents, groups, tags, search, and the graph view work with the network fully disabled.
- Document parsing, chunking, embedding, and graph projection are all in-process and offline.
- The only outbound requests are `AgentProvider` calls — entity extraction (Phase 3d) and the assistant (Phase 4) — which route through the Copilot SDK. These require a GitHub account with Copilot access, and they send the relevant prompt/content to the Copilot backend.
- There is no analytics, telemetry, crash-reporting, auto-update ping, or font/CDN fetch that violates this. Any such need is an explicit, opt-in decision documented as a change to this guarantee.

A future **fully-offline AI mode** (a local-model `AgentProvider`, e.g. Ollama) would remove even the Copilot egress for users who want zero network.

### 10.2 Locked Decisions

| Decision | Default | Rationale |
|---|---|---|
| Delivery | Electron desktop app | Cross-platform, installable, local-first |
| Graph / vector store | LadybugDB (embedded) | No server; Cypher matches the ontology; on-disk + vector index |
| System of record | Content files on disk | Private, portable, rebuildable projection |
| AI (v1) | GitHub Copilot SDK only | Single agentic provider; TypeScript; pluggable later |
| Embeddings | Bundled local model | Keeps semantic search offline |
| Background jobs | In-process (worker threads / utilityProcess) | No Redis/broker |
| Network posture | Copilot SDK only; offline otherwise | Privacy by construction |
| Capture surfaces (v1) | Notes + documents + agent work | Audio deferred (needs local STT) |
| User model | Single local user | Personal tool; GitHub auth only for Copilot |
| Ontology source of truth | `docs/ONTOLOGY.md` | Peer doc to this VISION |

### 10.3 Sensitivity Defaults

For AI-extracted PersonFacts, the extraction prompt assigns a default sensitivity, and all AI-extracted facts default to `reviewStatus: 'unreviewed'`:

| Content | Default sensitivity |
|---|---|
| Job, role, organization, project | `business` |
| Expertise, professional preferences, opinions | `business` |
| Family, hobbies, personal life | `sensitive` (requires user acceptance to surface) |
| Health, finance, religion, politics | `restricted` (never auto-surface) |

Sensitive/restricted facts are hidden from normal retrieval until explicitly accepted. See `ONTOLOGY.md §9`.

---

## 11. Open Questions

1. **App-settings storage** — single-store in LadybugDB vs. a tiny separate SQLite for plain relational/preference data. Lean: single-store.
2. **LadybugDB vector API** — confirm the exact vector-index creation/query API for the pinned LadybugDB version and how large a corpus it comfortably indexes on typical desktop hardware.
3. **Copilot SDK embeddings** — whether the SDK exposes embeddings at all; regardless, v1 uses local embeddings, so this only matters as a possible future option.
4. **Local embedding model choice** — which bundled model (dimension, size, speed) best balances quality vs. app-bundle size and CPU-only inference on a laptop.
5. **Auto-update posture** — whether/how to ship updates without violating the local-only guarantee (e.g. user-initiated update checks only).
6. **Copilot auth & offline degradation** — how AI features degrade gracefully when the user is offline or Copilot auth is absent (the app must remain fully usable minus AI).

Once locked, these get documented in the appropriate spec.

---

## 12. How To Use This Document

This document and `docs/ONTOLOGY.md` are the two canonical seed documents for notegraph. Hand both to a coding agent to bootstrap the project.

### 12.1 Hard Rules For The Coding Agent

- **Honor the local-only guarantee.** No network calls except the Copilot SDK. No cloud DB, no S3, no cloud STT, no cloud embeddings, no telemetry. If a feature seems to need one, stop and surface it.
- **LadybugDB is the embedded store.** No Neo4j server, no Postgres, no pgvector, no Redis. One on-disk database file.
- **Embeddings are local.** Use the bundled model; never send text to a remote embedding API.
- **AI goes through the `AiProvider` abstraction.** Never call the Copilot SDK directly from feature code — always through `AgentProvider`. Keep `EmbeddingProvider` local.
- **Files are the source of truth; LadybugDB is rebuildable.** Preserve the ability to wipe and re-project the graph from disk.
- **Ontology is the north star.** New node types land in `docs/ONTOLOGY.md` first, then the LadybugDB schema, then the projection step, then tests.
- **Ship phase by phase.** Phase 1 (desktop shell + notes) must be a working, installable app before Phase 2 starts. Don't pull forward Phase 3 infrastructure.
- **Confirm the two moving-target facts at build time**: the LadybugDB vector-index API and the Copilot SDK surface (both are new in 2025–2026). Where this doc marks something "to confirm," verify against the pinned versions rather than assuming.

### 12.2 What Not To Do

- Don't turn notegraph into a web app or add a server backend.
- Don't add a cloud database, object storage, or message broker.
- Don't add any network egress beyond the Copilot SDK in v1.
- Don't hard-wire the Copilot SDK into features — keep it behind `AgentProvider`.
- Don't add audio/STT via a cloud service (local `whisper.cpp` only, and only in a later phase).
- Don't add multi-user, RBAC, or federated auth.

### 12.3 Quick Reference (Dev)

```bash
# Install
npm install

# Run the app in development (main + renderer + hot reload)
npm run electron:dev

# Package for the current platform
npm run package        # electron-builder → dist/

# Data locations (per-OS app data directory)
#   notegraph.ladybug         → embedded graph + chunks + vectors + app meta
#   notes/                    → markdown notes (source of truth)
#   documents/                → imported documents (source of truth)
#   ~/.notegraph/inbox/       → agent-work summaries (Phase 5)
```

### 12.4 Document Lineage

| Document | Purpose |
|---|---|
| `README.md` | Short user-facing intro; links to VISION |
| `VISION.md` | This document — north-star vision + phased build plan |
| `docs/ONTOLOGY.md` | Canonical ontology specification — peer to VISION |

---

**End of vision document.**

*notegraph: a desktop, local-first sibling of knotes — Electron delivery, LadybugDB embedded graph, GitHub Copilot SDK for AI (pluggable to OpenAI/Anthropic later), bundled local embeddings, and no external connectivity other than the Copilot SDK.*
