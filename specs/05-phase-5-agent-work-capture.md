# Spec 05 — Phase 5: Agent Work Capture

**Status: Planned.** Source of truth: VISION.md §4.5; docs/ONTOLOGY.md §7, §14.4. Distilled markdown summaries, **not** raw trace ingestion.

## Goal

AI-agent work becomes first-class knowledge: each meaningful coding-agent session contributes Problem / Attempt / Resolution / Runbook / ReusablePattern nodes to the local graph, entirely on-device.

## In scope

- A capture **skill** (`notegraph-capture`) that emits a structured markdown summary at session end, template mapping 1:1 to ontology nodes (docs/ONTOLOGY.md §7).
- A **Stop hook** that auto-invokes the skill.
- Skill writes to a **local inbox** inside the working folder: `<workingFolder>/inbox/*.agent-work.md` (no cloud upload).
- An in-process **AgentWorkProcessor**: watches the inbox, parses YAML + sections, creates `AgentRun`, `Problem`, `Attempt`, `Resolution`, `Runbook`, `CodeChange`, `CommandRun`, `ReusablePattern` nodes via the Phase 3 projection.
- UI to browse `AgentRun` history and derived runbooks.
- "Find similar prior work" query (docs/ONTOLOGY.md §11.3, §13 scenarios 4 & 9).

## Out of scope

Full execution-trace capture (intentionally avoided — VISION.md §4.7); cloud sync.

## Dependencies added

A filesystem watcher (Node `fs.watch` / `chokidar`) for the inbox; a markdown/YAML parser (reuse `gray-matter` + a section parser).

## Data-model / schema changes

- Reuse the Phase 3 agent-work ontology tables in LadybugDB.
- SQLite: `agent_work_files` (ingest ledger — path, hash, status) so re-ingest is idempotent and offline-rebuildable.

## IPC / UI surface

- `agentWork.list / get / reprocess`
- `agentWork.findSimilar(context)` → prior runs/runbooks/patterns.
- UI: `/agent-runs` browser + runbook viewer; a "bootstrap from prior work" panel.

## Ontology touchpoints

Projects the Agent Work layer (docs/ONTOLOGY.md §7): `AgentTask, AgentRun, AgentStep, ToolUse, CommandRun, CodeChange, Error, ReusablePattern` and relationships (`PERFORMED, HAS_STEP, PRODUCED, DERIVED_PATTERN, RESOLVED, ...`). Governance: no private chain-of-thought; failed attempts preserved (§9.5–9.6).

## Acceptance criteria

- A real coding-agent session produces a `*.agent-work.md` summary in the inbox.
- The processor ingests it → `AgentRun` + `Problem` + `Resolution` + `Runbook` nodes appear in the graph.
- Re-processing the same file is idempotent (ledger by content hash).
- "Find similar prior work" returns relevant past sessions/runbooks.
- Entire loop is on-device (inbox → local processor → LadybugDB).

## Test plan

- Vitest: summary parser (frontmatter + sections → nodes); idempotent ingest by hash; similar-work query over seeded agent runs.
- Manual: run a capture, confirm nodes + runbook browsing + similarity retrieval.

## Risks

Skill/hook reliability (VISION.md notes Phase 5 is gated on the capture mechanism proving natural); summary completeness (template enforcement).
