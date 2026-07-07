# Spec 02 — Phase 2: Organization

**Status: Implemented.** Source of truth: VISION.md §4.2. Still 100% offline; no AI.

Implementation notes: SQLite schema v2 adds `groups`, `tags`, `note_tags`, and
`notes.group_id`. Note assignments (`groupId`, `tags`) live in each note's
frontmatter (source of truth) and are indexed into SQLite; tag/group definitions
live in SQLite. Definition changes that affect notes (delete group, rename/delete
tag) propagate into the affected notes' frontmatter via `OrganizationService`.
Search is unified in `Store.queryNotes({ text?, groupId?, tagIds? })` — FTS +
group-with-descendants (recursive CTE) + tag AND. Tag colors are deterministic
from the tag name (stable across sessions). Verified: 22 Vitest tests + typecheck
+ build. Files: `src/main/services/organization.ts`, extended `db/store.ts`,
`db/migrations.ts`, `services/notes.ts`; renderer `GroupTree`, `TagBar`,
`NoteMetaBar`, rewritten `NotesPage`; `test/phase2.test.ts`.

## Goal

Turn the notes app into a daily-driver knowledge-capture surface: notes searchable, organized into hierarchical groups, and tagged.

## In scope

- **Groups**: hierarchical folders (Client → Project → Workstream). A note belongs to zero or one group.
- **Tags**: polymorphic, color-coded, applied to notes (extends to documents in Phase 3).
- **Richer local search**: filter by group/tag; combine with FTS.
- UI: group tree in the drawer, tag chips on notes, a tag/group filter bar.

## Out of scope

Documents, embeddings, AI, graph projection.

## Dependencies added

None expected (pure SQLite + React + MUI).

## Data-model / schema changes

Working folder: group/tag *assignment* for a note lives in its frontmatter (`groupId`, `tags: []`) so it travels with the file; group/tag *definitions* live in SQLite. (Confirm the frontmatter-vs-SQLite boundary — VISION.md §11 open question 2.)

SQLite schema v2:
- `groups(id PK, owner_id, parent_group_id, name, color, created_at)`.
- `tags(id PK, owner_id, name, color)` + unique `(owner_id, name)`.
- `note_tags(note_id, tag_id)` — assignment index (rebuildable from frontmatter).
- `notes` gains `group_id`.

## IPC / UI surface

- `groups.list / create / rename / move / delete`
- `tags.list / create / rename / delete`
- `notes.setGroup(id, groupId)`, `notes.setTags(id, tags)`
- `search.query` extended with `{ groupId?, tagIds? }` filters.

UI: collapsible group tree, tag manager, tag chips in the editor header, filter controls in the left pane.

## Ontology touchpoints

`:Group` and `:Tag` (docs/ONTOLOGY.md §4, §8 `OWNS`/`CONTAINS`/`PART_OF`). Still no graph projection — these are indexed in SQLite and carried in frontmatter; they project in Phase 3.

## Acceptance criteria

- Create nested groups; assign notes; move notes between groups; group tree persists.
- Create/apply/remove tags across notes; tag colors persist.
- Search filters by group and tag combined with full-text.
- All group/tag state is rebuildable from the working folder (reconcile picks up frontmatter changes).

## Test plan

- Vitest: groups CRUD + hierarchy integrity; tags CRUD + uniqueness; note↔group and note↔tag assignment; filtered search; reconcile of frontmatter-carried group/tag data.
- Manual: organize 10+ notes into groups and tags; verify filtering.
