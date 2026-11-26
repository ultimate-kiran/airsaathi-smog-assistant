import { createHash } from "node:crypto";

/**
 * A small least-recently-used cache with expiry, plus request de-duplication.
 * Per server instance: on serverless each warm instance keeps its own copy, which is enough to
 * absorb repeat requests (language switches, follow-up questions) without a shared store.
 */
export class TtlCache<V> {
  private readonly items = new Map<string, { value: V; expires: number }>();
  private readonly pending = new Map<string, Promise<V>>();

  constructor(private readonly maxItems = 500) {}

  get(key: string): V | undefined {
    const hit = this.items.get(key);
    if (!hit) return undefined;
    if (hit.expires <= Date.now()) {
      this.items.delete(key);
      return undefined;
    }
    // re-insert so the most recently used entries survive eviction
    this.items.delete(key);
    this.items.set(key, hit);
    return hit.value;
  }

  set(key: string, value: V, ttlMs: number): void {
    this.items.delete(key);
    this.items.set(key, { value, expires: Date.now() + ttlMs });
    while (this.items.size > this.maxItems) {
      const oldest = this.items.keys().next().value;
      if (oldest === undefined) break;
      this.items.delete(oldest);
    }
  }

  /** Returns the cached value, or runs `load` once even when many callers ask at the same time. */
  async getOrLoad(key: string, ttlMs: number, load: () => Promise<V>, keep: (v: V) => boolean = () => true): Promise<V> {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    const inFlight = this.pending.get(key);
    if (inFlight) return inFlight;
    const p = load()
      .then((value) => {
        if (this.pending.get(key) === p && keep(value)) this.set(key, value, ttlMs);
        return value;
      })
      .finally(() => {
        if (this.pending.get(key) === p) this.pending.delete(key);
      });
    this.pending.set(key, p);
    return p;
  }

  clear(): void {
    this.items.clear();
    this.pending.clear();
  }
}

/** Stable short key for any JSON-serialisable input. */
export function hashKey(...parts: unknown[]): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("base64url").slice(0, 32);
}
