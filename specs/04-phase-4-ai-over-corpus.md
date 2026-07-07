# Spec 04 — Phase 4: AI Over the Corpus (Copilot SDK)

**Status: Planned.** Source of truth: VISION.md §4.4, §7. Leans into the Copilot SDK's agentic strength.

## Goal

The corpus actively serves the user: a grounded conversational assistant plus AI helpers over the local knowledge graph. All AI routes through the `AgentProvider` (Copilot SDK); local embedding similarity needs no network.

## In scope

- **Conversational KG assistant**: a streaming, tool-calling agent (Copilot SDK) answering NL questions grounded in the local graph. Tools: search graph, fetch entity/neighborhood, retrieve evidence chunks. Surfaces evidence (source snippets + clickable entity cards into the graph view). With user confirmation, applies **reversible** graph mutations (recorded, with undo).
- AI summaries, action items, and topic extraction per note/document.
- Rewrite / tighten / reframe tools for notes.
- Cross-content quote extraction ("insert what I wrote last quarter about X").
- "Did I already write this?" near-duplicate detection via local embedding similarity (offline).

## Out of scope

New providers (Phase 4 stays on Copilot); audio.

## Dependencies added

None beyond Phase 3 (reuses `AgentProvider` + graph + embeddings).

## Data-model / schema changes

- SQLite: `assistant_sessions`, `assistant_messages`, `assistant_mutations` (reversible, with pre-state for undo).
- Reuse `ai_invocations` for usage/cost logging.

## IPC / UI surface

- `assistant.start / send (streaming) / applyMutation / undoMutation / listSessions`
- `ai.summarize / rewrite / extractQuotes / findDuplicates`
- UI: `/assistant` chat panel with streamed tokens, evidence cards, and a "what changed" card with Undo; AI action buttons in the note/document views.

## Ontology touchpoints

Reads the full graph; mutations create/update ontology nodes/edges under the review-status + provenance rules (docs/ONTOLOGY.md §9). Assistant mutations are provenance-tracked (`WAS_GENERATED_BY` an `AiInvocation`/agent run).

## Acceptance criteria

- Ask a NL question; get a grounded, streamed answer citing evidence with working links into the graph.
- Summaries/rewrites/quote-extraction operate on real notes/documents.
- Near-duplicate detection runs fully offline.
- Every assistant mutation is reversible; usage is logged locally; nothing but Copilot calls touch the network.

## Test plan

- Vitest: tool-call plumbing (mock AgentProvider), mutation apply/undo round-trip, duplicate detection over fixture embeddings.
- Manual: multi-turn assistant session over a seeded corpus; verify grounding, evidence links, and undo.

## Risks

Grounding quality; mutation safety (always confirm + reversible); graceful offline degradation.
