import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as geocode } from "../src/app/api/geocode/route";
import { POST as ask } from "../src/app/api/ask/route";
import { POST as plan } from "../src/app/api/plan/route";
import { resetAll as resetCaches } from "../src/lib/container";
import { PROFILE, jsonResponse, openMeteoPayload, post } from "./helpers";

beforeEach(() => {
  resetCaches();
  delete process.env.GEMINI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.WAQI_TOKEN;
  delete process.env.OPENAQ_API_KEY;
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/plan", () => {
  it("returns a rule-based plan from live-shaped data", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(openMeteoPayload())));
    const res = await plan(post("/api/plan", PROFILE));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body.aiEnabled).toBe(false);
    expect(body.ai.source).toBe("rules");
    expect(body.source.kind).toBe("model");
    expect(body.aqi.value).toBeGreaterThan(100);
    expect(body.actions.length).toBeGreaterThan(3);
  });

  it("rounds coordinates before calling the air-quality service", async () => {
    const f = vi.fn(async (_url: string) => jsonResponse(openMeteoPayload()));
    vi.stubGlobal("fetch", f);
    await plan(post("/api/plan", { ...PROFILE, lat: 9.939876, lon: 76.260222 }));
    const url = String(f.mock.calls[0][0]);
    expect(url).toContain("latitude=9.94");
    expect(url).toContain("longitude=76.26");
    expect(url).not.toContain("9.939876");
  });

  it("rejects invalid JSON, oversize bodies and bad profiles", async () => {
    expect((await plan(post("/api/plan", "{nope"))).status).toBe(400);
    expect((await plan(post("/api/plan", "x".repeat(9000)))).status).toBe(413);
    const bad = await plan(post("/api/plan", { ...PROFILE, lat: 999 }));
    expect(bad.status).toBe(422);
    expect((await bad.json()).issues.length).toBeGreaterThan(0);
  });

  it("returns 502 with a friendly message when the data source is down", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({}, 500)));
    const res = await plan(post("/api/plan", PROFILE));
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toMatch(/stack|at \w+\(/i);
  });

  it("rate limits a single client", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(openMeteoPayload())));
    const ip = "203.0.113.9";
    const codes: number[] = [];
    for (let i = 0; i < 22; i++) codes.push((await plan(post("/api/plan", PROFILE, ip))).status);
    expect(codes.slice(0, 20).every((c) => c === 200)).toBe(true);
    expect(codes[20]).toBe(429);
  });

  it("falls back to the model when the optional station source fails", async () => {
    process.env.WAQI_TOKEN = "a".repeat(32);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        String(url).includes("waqi.info") ? jsonResponse({ status: "error" }, 500) : jsonResponse(openMeteoPayload()),
      ),
    );
    const res = await plan(post("/api/plan", PROFILE));
    expect(res.status).toBe(200);
    expect((await res.json()).source.kind).toBe("model");
  });
});

describe("POST /api/plan source priority", () => {
  const fresh = (minAgo: number) => new Date(Date.now() - minAgo * 60_000).toISOString();
  const KEY = "k".repeat(40);

  /** Routes each outbound call to a canned response and records the calls. */
  function stubServices(opts: { openaq?: "ok" | "empty" | "down"; waqi?: "ok" | "down" } = {}) {
    const calls: { url: string; headers: Record<string, string> }[] = [];
    const loc = (id: number, name: string, lat: number) => ({
      id,
      name,
      isMonitor: true,
      coordinates: { latitude: lat, longitude: 76.26 },
      datetimeLast: { utc: fresh(30) },
      sensors: [{ id: id * 10 + 1, parameter: { name: "pm25", units: "µg/m³" } }],
    });
    const f = vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url);
      calls.push({ url: u, headers: (init?.headers ?? {}) as Record<string, string> });
      if (u.includes("api.openaq.org")) {
        if (opts.openaq === "down") return jsonResponse({}, 500);
        if (u.includes("/latest")) {
          const id = Number(/locations\/(\d+)\/latest/.exec(u)![1]);
          return jsonResponse({
            results: [{ sensorsId: id * 10 + 1, value: id === 1 ? 30 : 50, datetime: { utc: fresh(40) } }],
          });
        }
        return jsonResponse({ results: opts.openaq === "empty" ? [] : [loc(1, "North", 9.97), loc(2, "South", 9.92)] });
      }
      if (u.includes("waqi.info")) {
        if (opts.waqi === "down") return jsonResponse({ status: "error" }, 500);
        return jsonResponse({
          status: "ok",
          data: {
            city: { name: "WAQI Station", geo: [9.95, 76.27] },
            iaqi: { pm25: { v: 100 } },
            time: { iso: fresh(20) },
          },
        });
      }
      return jsonResponse(openMeteoPayload());
    });
    vi.stubGlobal("fetch", f);
    return calls;
  }

  it("prefers OpenAQ, uses the median of its stations and never calls WAQI", async () => {
    process.env.OPENAQ_API_KEY = KEY;
    process.env.WAQI_TOKEN = "a".repeat(32);
    const calls = stubServices();
    const body = await (await plan(post("/api/plan", PROFILE))).json();
    expect(body.source).toMatchObject({ kind: "station", count: 2, uncertain: false });
    expect(body.aqi.pm25).toBe(40); // median of 30 and 50
    expect(calls.some((c) => c.url.includes("waqi.info"))).toBe(false);
  });

  it("sends the OpenAQ key in a header, never in the URL", async () => {
    process.env.OPENAQ_API_KEY = KEY;
    const calls = stubServices();
    await plan(post("/api/plan", PROFILE));
    const oq = calls.filter((c) => c.url.includes("api.openaq.org"));
    expect(oq.length).toBeGreaterThan(1);
    for (const c of oq) {
      expect(c.url).not.toContain(KEY);
      expect(c.headers["X-API-Key"]).toBe(KEY);
    }
  });

  it("falls back to WAQI when OpenAQ has no fresh station", async () => {
    process.env.OPENAQ_API_KEY = KEY;
    process.env.WAQI_TOKEN = "a".repeat(32);
    stubServices({ openaq: "empty" });
    const body = await (await plan(post("/api/plan", PROFILE))).json();
    expect(body.source).toMatchObject({ kind: "station", name: "WAQI Station", count: 1 });
  });

  it("falls back to WAQI when OpenAQ errors", async () => {
    process.env.OPENAQ_API_KEY = KEY;
    process.env.WAQI_TOKEN = "a".repeat(32);
    stubServices({ openaq: "down" });
    expect((await (await plan(post("/api/plan", PROFILE))).json()).source.name).toBe("WAQI Station");
  });

  it("falls back to the model when every station source is down", async () => {
    process.env.OPENAQ_API_KEY = KEY;
    process.env.WAQI_TOKEN = "a".repeat(32);
    stubServices({ openaq: "down", waqi: "down" });
    const res = await plan(post("/api/plan", PROFILE));
    expect(res.status).toBe(200);
    expect((await res.json()).source.kind).toBe("model");
  });

  it("/api/ask uses the same station sources, so answers match the plan", async () => {
    process.env.OPENAQ_API_KEY = KEY;
    const calls = stubServices();
    const res = await ask(post("/api/ask", { question: "Should my child play outside?", profile: PROFILE }));
    expect(res.status).toBe(200);
    expect(calls.some((c) => c.url.includes("api.openaq.org"))).toBe(true);
  });

  it("never calls OpenAQ without a key, and ignores a malformed key", async () => {
    const calls = stubServices();
    await plan(post("/api/plan", PROFILE));
    process.env.OPENAQ_API_KEY = "bad key!";
    await plan(post("/api/plan", PROFILE));
    expect(calls.some((c) => c.url.includes("openaq"))).toBe(false);
  });
});

describe("POST /api/ask", () => {
  it("answers with rules when AI is off", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(openMeteoPayload())));
    const res = await ask(post("/api/ask", { question: "Should my child play outside?", profile: PROFILE }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe("rules");
    expect(body.answer.length).toBeGreaterThan(20);
  });

  it("validates the question length", async () => {
    expect((await ask(post("/api/ask", { question: "a", profile: PROFILE }))).status).toBe(422);
    expect((await ask(post("/api/ask", { question: "q".repeat(301), profile: PROFILE }))).status).toBe(422);
  });
});

describe("GET /api/geocode", () => {
  const get = (q: string, ip: string) =>
    new Request(`http://localhost/api/geocode?q=${encodeURIComponent(q)}`, { headers: { "x-forwarded-for": ip } });

  it("asks only for places in India", async () => {
    const f = vi.fn(async (_url: string) =>
      jsonResponse({ results: [{ name: "Kochi", admin1: "Kerala", country: "India", latitude: 9.94, longitude: 76.26 }] }),
    );
    vi.stubGlobal("fetch", f);
    const res = await geocode(get("Kochi", "198.51.100.1"));
    expect(String(f.mock.calls[0][0])).toContain("countryCode=IN");
    const body = await res.json();
    expect(body.places[0]).toMatchObject({ short: "Kochi", name: "Kochi, Kerala, India" });
  });

  it("rejects too-short and too-long queries", async () => {
    expect((await geocode(get("a", "198.51.100.2"))).status).toBe(422);
    expect((await geocode(get("x".repeat(61), "198.51.100.3"))).status).toBe(422);
  });
});
