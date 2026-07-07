# Spec 01 — Phase 1: Desktop Shell + Notes

**Status: Implemented.** Source of truth: VISION.md §4.1, §5, §6.

## Goal

A working, installable notegraph desktop app that replaces a plain-text note tool: create/edit markdown notes with autosave and version history, in a user-chosen working folder, with local full-text search. Fully offline; no AI.

## In scope

- Electron shell: main + preload + renderer (React 18 + MUI 6), typed IPC, cross-platform packaging.
- Notes as markdown files with **ontology frontmatter from day one** (`id`, `ownerId`, `ontologyVersion`, `title`, `reviewStatus=accepted`, `sensitivity=business`, `createdAt`, `updatedAt`, `lastConfirmedAt`).
- CodeMirror 6 editor, ~800 ms debounced autosave, throttled version snapshots + restore.
- **Working-folder setting** (user picks the content location; default suggestion `~/Documents/notegraph`).
- **SQLite app database**: settings, notes index/cache, FTS5 search index, version history.
- **LadybugDB initialized** (opened + health-checked; non-fatal; ontology deferred to Phase 3).
- Local full-text search (SQLite FTS5) with snippets.
- Light/dark/system theme.

## Out of scope

Documents, embeddings/semantic search, entity extraction, the graph view, any AI, any network call.

## Dependencies added

`electron`, `electron-vite`, `electron-builder`, `@vitejs/plugin-react`, `react`, `react-dom`, `react-router-dom`, `@mui/material`, `@mui/icons-material`, `@emotion/*`, `@uiw/react-codemirror`, `@codemirror/lang-markdown`, `better-sqlite3`, `@ladybugdb/core`, `gray-matter`, `zod`, `@electron-toolkit/utils`, `vitest`, `typescript`.

## Data model

**Note file** — `<workingFolder>/notes/<id>.md`, stable filename = id, YAML frontmatter (gray-matter) + markdown body.

**SQLite schema v1** (`src/main/db/migrations.ts`), all rebuildable from the working folder:
- `settings(key PK, value)` — `ownerId`, `workingFolderPath`, `theme`.
- `notes(id PK, owner_id, path, title, sensitivity, review_status, ontology_version, created_at, updated_at, last_confirmed_at)` — index/cache.
- `notes_fts` — FTS5 virtual table (`id UNINDEXED, title, body`).
- `note_versions(id PK, note_id, content, created_at)` — capped to 50/note.
- `meta(key PK, value)` — schema_version.

## IPC / UI surface

Channels in `src/shared/api.ts`; handlers in `src/main/ipc/index.ts`; preload bridge in `src/preload/index.ts`.
- `settings.get / pickWorkingFolder / setWorkingFolder / setTheme`
- `notes.list / get / create / save / delete / versions / restoreVersion`
- `search.query`

UI (`src/renderer`): AppBar + theme toggle + Notes/Settings nav; onboarding working-folder picker; NotesPage (left: New + SearchBar + NoteList; right: NoteEditor + delete + version-history dialog); SettingsPage (working folder + theme + about).

## Critical files

`src/main/{index.ts, db/store.ts, db/migrations.ts, services/{notes,workspace,ladybug}.ts, ipc/index.ts}` · `src/preload/index.ts` · `src/shared/{types,ontology,api}.ts` · `src/renderer/src/**` · `test/{store,notes}.test.ts`.

## Ontology touchpoints

Notes carry ontology metadata (docs/ONTOLOGY.md §5.8 `:Note`, §9.3 review status, §9.4 sensitivity). No graph projection yet. `ONTOLOGY_VERSION = 0.2.0`.

## Acceptance criteria

- App launches to onboarding on first run; after picking a folder, notes persist there as `<id>.md` with correct frontmatter.
- Create / edit (autosave) / delete round-trips through the working folder; restart preserves notes.
- Full-text search returns matching notes with snippets.
- Version history lists snapshots and restores them.
- Theme light/dark/system works; working folder is changeable in Settings.
- No network egress anywhere.

## Test plan

- **Vitest** (`test/`): Store settings/index/FTS/versions; NoteService create/save/get/list/delete round-trip, reconcile (external add/remove), search, version restore. ✅ 13 tests.
- **Typecheck**: `npm run typecheck` (node + web). ✅
- **Build**: `npm run build` bundles main/preload/renderer. ✅
- **Native under Electron**: both native modules load under Electron's ABI. ✅ (ABI 148)
- **GUI boot / packaging**: run `npm run dev` and `npm run package` on a desktop with a display (not possible in a headless CI sandbox).

## Risks / notes

- Native modules must be rebuilt for Electron's ABI at package time (electron-builder `npmRebuild: true`).
- Renderer bundle is large (MUI + CodeMirror) — acceptable for desktop; consider code-splitting later.
