import type Database from 'better-sqlite3'

/** Current SQLite schema version. v1 = Phase 1 notes; v2 = Phase 2 groups/tags. */
export const SCHEMA_VERSION = 2

function hasColumn(db: Database.Database, table: string, column: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  return cols.some((c) => c.name === column)
}

/**
 * Apply schema migrations idempotently. The SQLite database is a rebuildable
 * projection of the working folder, so migrations only touch the index/cache,
 * FTS index, version history, and (Phase 2) group/tag definitions + assignment
 * index — never authoritative content.
 */
export function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id               TEXT PRIMARY KEY,
      owner_id         TEXT NOT NULL DEFAULT '',
      path             TEXT NOT NULL,
      title            TEXT NOT NULL DEFAULT '',
      sensitivity      TEXT NOT NULL DEFAULT 'business',
      review_status    TEXT NOT NULL DEFAULT 'accepted',
      ontology_version TEXT NOT NULL DEFAULT '',
      group_id         TEXT,
      created_at       TEXT NOT NULL DEFAULT '',
      updated_at       TEXT NOT NULL DEFAULT '',
      last_confirmed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS notes_updated_at ON notes (updated_at DESC);
    CREATE INDEX IF NOT EXISTS notes_group_id ON notes (group_id);

    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5 (
      id UNINDEXED,
      title,
      body,
      tokenize = 'unicode61'
    );

    CREATE TABLE IF NOT EXISTS note_versions (
      id         TEXT PRIMARY KEY,
      note_id    TEXT NOT NULL,
      content    TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS note_versions_note_id ON note_versions (note_id, created_at DESC);

    -- Phase 2: groups + tags (definitions) and the note→tag assignment index.
    CREATE TABLE IF NOT EXISTS groups (
      id              TEXT PRIMARY KEY,
      owner_id        TEXT NOT NULL DEFAULT '',
      parent_group_id TEXT,
      name            TEXT NOT NULL,
      color           TEXT,
      created_at      TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS groups_parent ON groups (parent_group_id);

    CREATE TABLE IF NOT EXISTS tags (
      id       TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL DEFAULT '',
      name     TEXT NOT NULL,
      color    TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS tags_owner_name ON tags (owner_id, name);

    CREATE TABLE IF NOT EXISTS note_tags (
      note_id TEXT NOT NULL,
      tag_id  TEXT NOT NULL,
      PRIMARY KEY (note_id, tag_id)
    );
    CREATE INDEX IF NOT EXISTS note_tags_tag ON note_tags (tag_id);
  `)

  // Upgrade path for a pre-existing v1 database created before group_id existed.
  if (!hasColumn(db, 'notes', 'group_id')) {
    db.exec('ALTER TABLE notes ADD COLUMN group_id TEXT')
  }

  db.prepare(
    `INSERT INTO meta (key, value) VALUES ('schema_version', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(String(SCHEMA_VERSION))
}
