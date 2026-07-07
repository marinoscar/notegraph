import type Database from 'better-sqlite3'

/** Current SQLite schema version (Phase 1). */
export const SCHEMA_VERSION = 1

/**
 * Apply schema migrations idempotently. The SQLite database is a rebuildable
 * projection of the working folder, so migrations only need to (re)create the
 * index/cache, FTS index, and version tables — never authoritative content.
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
      created_at       TEXT NOT NULL DEFAULT '',
      updated_at       TEXT NOT NULL DEFAULT '',
      last_confirmed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS notes_updated_at ON notes (updated_at DESC);

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
  `)

  db.prepare(
    `INSERT INTO meta (key, value) VALUES ('schema_version', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(String(SCHEMA_VERSION))
}
