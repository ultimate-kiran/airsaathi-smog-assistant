import { env } from "./env";
import { errorName, log } from "./log";

/**
 * Rate limiting behind one interface, so the storage can change without touching the routes.
 *  - With UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN set, counters live in Redis and are
 *    shared by every serverless instance (fixed one-minute windows).
 *  - Without them, each instance counts in memory: fine for one server, a soft limit on serverless.
 * If Redis is unreachable we fall back to memory rather than blocking everyone.
 */
export interface RateLimiter {
  /** true when this hit is allowed */
  hit(key: string, limit: number, windowMs: number): Promise<boolean>;
}

export class MemoryLimiter implements RateLimiter {
  private readonly hits = new Map<string, number[]>();

  async hit(key: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);
    const allowed = recent.length < limit;
    if (allowed) recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 5000) {
      for (const [k, v] of this.hits) if (v.every((t) => now - t >= windowMs)) this.hits.delete(k);
    }
    return allowed;
  }
}

export class UpstashLimiter implements RateLimiter {
  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly fallback: RateLimiter,
  ) {}

  async hit(key: string, limit: number, windowMs: number): Promise<boolean> {
    const bucket = `rl:${key}:${Math.floor(Date.now() / windowMs)}`;
    try {
      const res = await fetch(`${this.url}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: JSON.stringify([
          ["INCR", bucket],
          ["PEXPIRE", bucket, String(windowMs)],
        ]),
        signal: AbortSignal.timeout(1500),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`upstash ${res.status}`);
      const [incr] = (await res.json()) as { result?: number }[];
      if (typeof incr?.result !== "number") throw new Error("upstash reply");
      return incr.result <= limit;
    } catch (e) {
      log("warn", "ratelimit.fallback", { reason: errorName(e) });
      return this.fallback.hit(key, limit, windowMs);
    }
  }
}

const memory = new MemoryLimiter();
let shared: { url: string; limiter: RateLimiter } | null = null;

export function limiter(): RateLimiter {
  const { UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: token } = env();
  if (!url || !token) return memory;
  if (shared?.url !== url) shared = { url, limiter: new UpstashLimiter(url.replace(/\/$/, ""), token, memory) };
  return shared.limiter;
}

/**
 * The caller's IP as reported by the platform. x-real-ip is set by Vercel and most reverse
 * proxies; for x-forwarded-for we take the right-most entry, the one our own proxy appended,
 * because a client can put anything at the left.
 */
export function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const fwd = req.headers.get("x-forwarded-for");
  const last = fwd?.split(",").map((s) => s.trim()).filter(Boolean).at(-1);
  return last || "unknown";
}
