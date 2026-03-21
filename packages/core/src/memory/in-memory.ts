import type { MemoryAdapter } from "../types.js";

/**
 * In-memory storage — great for development and testing.
 * Does NOT persist across process restarts.
 */
export class InMemoryAdapter implements MemoryAdapter {
  private store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(namespace?: string): Promise<void> {
    if (!namespace) {
      this.store.clear();
      return;
    }
    for (const key of this.store.keys()) {
      if (key.startsWith(namespace)) this.store.delete(key);
    }
  }
}
