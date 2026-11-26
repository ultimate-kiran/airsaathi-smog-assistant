import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { TtlCache, hashKey } from "../src/lib/cache";
import { INVALID_MODEL, env } from "../src/lib/env";
import { AppError } from "../src/lib/errors";
import { formatHour, formatHourShort, formatRange } from "../src/lib/format";
import { ok, readJson, route } from "../src/lib/http";
import { Throttle } from "../src/lib/places";
import { MemoryLimiter, UpstashLimiter, clientIp, limiter } from "../src/lib/ratelimit";
import { jsonResponse } from "./helpers";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("format", () => {
  it("formats hours in English and Hindi", () => {
    expect(formatHour(0, "en")).toBe("12 am");
    expect(formatHour(15, "en")).toBe("3 pm");
    expect(formatHour(7, "hi")).toBe("सुबह 7 बजे");
    expect(formatHour(15, "hi")).toBe("दोपहर 3 बजे");
    expect(formatHour(18, "hi")).toBe("शाम 6 बजे");
    expect(formatHour(23, "hi")).toBe("रात 11 बजे");
    expect(formatHourShort(18, "hi")).toBe("शाम 6");
  });

  it("formats ranges, including across parts of the day and midnight", () => {
    expect(formatRange({ start: 14, end: 15 }, "en")).toBe("2 pm–3 pm");
    expect(formatRange({ start: 14, end: 15 }, "hi")).toBe("दोपहर 2–3 बजे");
    expect(formatRange({ start: 7, end: 13 }, "hi")).toBe("सुबह 7 बजे से दोपहर 1 बजे तक");
    expect(formatRange({ start: 23, end: 0 }, "en")).toBe("11 pm–12 am");
  });
});

describe("TtlCache", () => {
  it("expires entries", () => {
    vi.useFakeTimers();
    const c = new TtlCache<number>();
    c.set("a", 1, 1000);
    expect(c.get("a")).toBe(1);
    vi.advanceTimersByTime(1001);
    expect(c.get("a")).toBeUndefined();
  });

  it("evicts the least recently used entry when full", () => {
    const c = new TtlCache<number>(2);
    c.set("a", 1, 60_000);
    c.set("b", 2, 60_000);
    c.get("a"); // a is now newer than b
    c.set("c", 3, 60_000);
    expect(c.get("b")).toBeUndefined();
    expect(c.get("a")).toBe(1);
  });

  it("runs the loader once for concurrent callers, and skips caching rejected values", async () => {
    const c = new TtlCache<number | null>();
    const load = vi.fn(async () => 7);
    await Promise.all([c.getOrLoad("k", 1000, load), c.getOrLoad("k", 1000, load)]);
    expect(load).toHaveBeenCalledTimes(1);
    const nothing = vi.fn(async () => null);
    await c.getOrLoad("n", 1000, nothing, (v) => v !== null);
    await c.getOrLoad("n", 1000, nothing, (v) => v !== null);
    expect(nothing).toHaveBeenCalledTimes(2);
  });

  it("keeps a replacement load when an older load settles after clear", async () => {
    const cache = new TtlCache<number>();
    const old = Promise.withResolvers<number>();
    const fresh = Promise.withResolvers<number>();
    const first = cache.getOrLoad("key", 1000, () => old.promise);
    cache.clear();
    const second = cache.getOrLoad("key", 1000, () => fresh.promise);
    old.resolve(1);
    await expect(first).resolves.toBe(1);
    expect(cache.get("key")).toBeUndefined();
    const duplicate = vi.fn(async () => 3);
    const third = cache.getOrLoad("key", 1000, duplicate);
    fresh.resolve(2);
    await expect(Promise.all([second, third])).resolves.toEqual([2, 2]);
    expect(duplicate).not.toHaveBeenCalled();
    expect(cache.get("key")).toBe(2);
  });

  it("hashes keys stably", () => {
    expect(hashKey({ a: 1 }, "x")).toBe(hashKey({ a: 1 }, "x"));
    expect(hashKey({ a: 1 })).not.toBe(hashKey({ a: 2 }));
  });
});

describe("rate limiting", () => {
  it("uses a rotated token for the same Redis URL", async () => {
    const transport = vi.fn(async (_url: string, _init: RequestInit) =>
      jsonResponse([{ result: 1 }, { result: 1 }, { result: null }]),
    );
    vi.stubGlobal("fetch", transport);
    try {
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "example-token-one");
      await limiter().hit("key", 2, 1000);
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "example-token-two");
      await limiter().hit("key", 2, 1000);
      expect(transport.mock.calls.map(([, init]) => new Headers(init.headers).get("authorization"))).toEqual([
        "Bearer example-token-one",
        "Bearer example-token-two",
      ]);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("counts per key in memory", async () => {
    const m = new MemoryLimiter();
    expect(await m.hit("k", 2, 60_000)).toBe(true);
    expect(await m.hit("k", 2, 60_000)).toBe(true);
    expect(await m.hit("k", 2, 60_000)).toBe(false);
    expect(await m.hit("other", 2, 60_000)).toBe(true);
  });

  it("uses Redis counts when available, and falls back to memory when Redis fails", async () => {
    const fallback = new MemoryLimiter();
    const up = new UpstashLimiter("https://redis.example", "tok_1234567890", fallback);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse([{ result: 3 }, { result: 1 }, { result: null }])),
    );
    expect(await up.hit("k", 2, 60_000)).toBe(false);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("down");
      }),
    );
    expect(await up.hit("k", 2, 60_000)).toBe(true);
  });

  it("counts the previous window in proportion to its overlap (no double burst at the edge)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Math.ceil(Date.now() / 60_000) * 60_000 + 15_000)); // a quarter into a window
    const up = new UpstashLimiter("https://redis.example", "tok_1234567890", new MemoryLimiter());
    // 2 hits so far in this window, 10 in the previous one: 2 + 10 × 0.75 = 9.5
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse([{ result: 2 }, { result: 1 }, { result: "10" }])),
    );
    expect(await up.hit("k", 9, 60_000)).toBe(false);
    expect(await up.hit("k", 10, 60_000)).toBe(true);
  });

  it("trusts the platform's x-real-ip, then the right-most forwarded address", () => {
    const req = (h: Record<string, string>) => new Request("http://x", { headers: h });
    expect(clientIp(req({ "x-real-ip": "1.1.1.1", "x-forwarded-for": "9.9.9.9" }))).toBe("1.1.1.1");
    expect(clientIp(req({ "x-forwarded-for": "6.6.6.6, 2.2.2.2" }))).toBe("2.2.2.2");
    expect(clientIp(req({}))).toBe("unknown");
  });
});

describe("env", () => {
  const KEYS = ["OPENAI_MODEL", "AI_PROVIDER", "OPENAQ_API_KEY", "WAQI_TOKEN"];
  beforeEach(() => KEYS.forEach((k) => delete process.env[k]));
  afterEach(() => KEYS.forEach((k) => delete process.env[k]));

  it("treats blank and invalid values as missing, and flags unsafe model names", () => {
    process.env.OPENAQ_API_KEY = "  ";
    process.env.WAQI_TOKEN = "short";
    process.env.AI_PROVIDER = "OpenAI";
    process.env.OPENAI_MODEL = "../evil";
    const e = env();
    expect(e.OPENAQ_API_KEY).toBeUndefined();
    expect(e.WAQI_TOKEN).toBeUndefined();
    expect(e.AI_PROVIDER).toBe("openai");
    expect(e.OPENAI_MODEL).toBe(INVALID_MODEL);
  });
});

describe("http helpers", () => {
  const post = (body: string) => new Request("http://x", { method: "POST", body });
  const Schema = z.object({ n: z.number() });

  it("reads, size-checks and validates JSON", async () => {
    await expect(readJson(post('{"n":1}'), Schema, 100)).resolves.toEqual({ n: 1 });
    await expect(readJson(post("x".repeat(200)), Schema, 100)).rejects.toMatchObject({ code: "too_large" });
    await expect(readJson(post("{nope"), Schema, 100)).rejects.toMatchObject({ code: "bad_json" });
    await expect(readJson(post('{"n":"x"}'), Schema, 100)).rejects.toMatchObject({ code: "invalid" });
  });

  it("enforces the request limit in UTF-8 bytes", async () => {
    const body = JSON.stringify("\u0928");
    const bytes = new TextEncoder().encode(body).byteLength;
    await expect(readJson(post(body), z.string(), bytes)).resolves.toBe("\u0928");
    await expect(readJson(post(body), z.string(), bytes - 1)).rejects.toMatchObject({ code: "too_large" });
  });

  it("turns AppError into a coded reply and anything else into a logged 500 without internals", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const coded = await route("t", async () => {
      throw new AppError("not_found");
    })(post("{}"));
    expect(coded.status).toBe(404);
    expect(await coded.json()).toMatchObject({ code: "not_found" });
    expect(coded.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);

    const crash = await route("t", async () => {
      throw new TypeError("secret detail at /srv/app.ts:12");
    })(post("{}"));
    expect(crash.status).toBe(500);
    expect(await crash.clone().json()).toMatchObject({ code: "internal" });
    expect(JSON.stringify(await crash.json())).not.toMatch(/secret|app\.ts/);
  });

  it("marks replies as not cacheable by default", () => {
    expect(ok({}).headers.get("cache-control")).toBe("no-store");
  });
});

describe("Throttle", () => {
  it("spaces calls at least the interval apart", async () => {
    vi.useFakeTimers();
    const gate = new Throttle(1000);
    const times: number[] = [];
    const run = Promise.all([0, 1, 2].map(() => gate.wait().then(() => times.push(Date.now()))));
    await vi.advanceTimersByTimeAsync(2500);
    await run;
    expect(times[1] - times[0]).toBeGreaterThanOrEqual(1000);
    expect(times[2] - times[1]).toBeGreaterThanOrEqual(1000);
  });
});
