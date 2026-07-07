import type { Connection, Database } from '@ladybugdb/core'

/**
 * Phase 1 role: prove the embedded graph engine loads and opens a database
 * file on disk (VISION.md §4.1, §5.3). The ontology schema and projection
 * land in Phase 3 — here we only open the DB and health-check it.
 *
 * Deliberately NON-FATAL: LadybugDB is a native module, and a build/ABI hiccup
 * must not block the notes app (the graph is not functionally used until
 * Phase 3). Failures are logged and `available` stays false.
 */
export class LadybugService {
  private db: Database | null = null
  private conn: Connection | null = null
  available = false

  async init(dbPath: string): Promise<boolean> {
    try {
      const { Database, Connection } = await import('@ladybugdb/core')
      this.db = new Database(dbPath)
      this.conn = new Connection(this.db)
      const raw = await this.conn.query('RETURN 1 AS ok')
      const result = Array.isArray(raw) ? raw[raw.length - 1] : raw
      const rows = (await result.getAll()) as Array<{ ok: number }>
      result.close()
      this.available = rows.length === 1 && Number(rows[0]?.ok) === 1
      if (this.available) {
        console.info('[ladybug] ok — embedded graph opened at', dbPath)
      } else {
        console.warn('[ladybug] health check returned unexpected result:', rows)
      }
      return this.available
    } catch (err) {
      console.warn(
        '[ladybug] unavailable (non-fatal in Phase 1) —',
        err instanceof Error ? err.message : err
      )
      this.available = false
      return false
    }
  }

  /** Connection for later phases (null until the graph is used). */
  getConnection(): Connection | null {
    return this.conn
  }

  async close(): Promise<void> {
    try {
      await this.conn?.close()
      await this.db?.close()
    } catch {
      /* ignore */
    } finally {
      this.conn = null
      this.db = null
      this.available = false
    }
  }
}
