import type { MemoryAdapter } from "../types.js";

/**
 * SQLite memory adapter — persistent, zero-config local storage.
 * Requires: pnpm add better-sqlite3 && pnpm add -D @types/better-sqlite3
 */
export class SQLiteAdapter implements MemoryAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any = null;
  private path: string;

  constructor(dbPath = "./powerhouse-memory.db") {
    this.path = dbPath;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getDb(): any {
    if (!this.db) {
      try {
        // Dynamic require — better-sqlite3 is an optional peer dependency
        const Database = require("better-sqlite3");
        this.db = new Database(this.path);
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS memory (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at INTEGER NOT NULL
          )
        `);
      } catch {
        throw new Error(
          "SQLiteAdapter requires better-sqlite3. Install it with: pnpm add better-sqlite3"
        );
      }
    }
    return this.db;
  }

  async get(key: string): Promise<string | null> {
    const row = this.getDb()
      .prepare("SELECT value FROM memory WHERE key = ?")
      .get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.getDb()
      .prepare("INSERT OR REPLACE INTO memory (key, value, updated_at) VALUES (?, ?, ?)")
      .run(key, value, Date.now());
  }

  async delete(key: string): Promise<void> {
    this.getDb().prepare("DELETE FROM memory WHERE key = ?").run(key);
  }

  async clear(namespace?: string): Promise<void> {
    if (!namespace) {
      this.getDb().prepare("DELETE FROM memory").run();
      return;
    }
    this.getDb()
      .prepare("DELETE FROM memory WHERE key LIKE ?")
      .run(`${namespace}%`);
  }
}
