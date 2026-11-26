import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as reverse } from "../src/app/api/reverse/route";
import { nameFor } from "../src/lib/geo";
import { createPlaceService } from "../src/lib/places";
import { placeName } from "../src/lib/placename";
import { places, resetAll } from "../src/lib/container";
import { jsonResponse } from "./helpers";

beforeEach(() => {
  resetAll();
  places.gate.intervalMs = 0; // the one-per-second spacing has its own test
});
afterEach(() => vi.unstubAllGlobals());

let n = 0;
const get = (qs: string) =>
  new Request(`http://localhost/api/reverse?${qs}`, { headers: { "x-forwarded-for": `198.51.100.${++n}` } });

describe("placeName", () => {
  it("joins the local area and the town", () => {
    expect(placeName({ suburb: "Raisina Hill", city: "New Delhi", state: "Delhi" })).toEqual({
      short: "Raisina Hill, New Delhi",
      name: "Raisina Hill, New Delhi, Delhi",
    });
  });

  it("does not repeat a name that is both area and town", () => {
    expect(placeName({ city: "Kochi", suburb: "Kochi", state: "Kerala" })).toEqual({
      short: "Kochi",
      name: "Kochi, Kerala",
    });
  });

  it("falls back from town to village to county, and to the state alone", () => {
    expect(placeName({ village: "Munnar", state: "Kerala" })?.short).toBe("Munnar");
    expect(placeName({ county: "Idukki", state: "Kerala" })?.short).toBe("Idukki");
    expect(placeName({ state: "Kerala" })?.short).toBe("Kerala");
  });

  it("returns null when there is nothing usable, and keeps names within the plan's limit", () => {
    expect(placeName({})).toBeNull();
    expect(placeName({ suburb: "a".repeat(200), city: "b".repeat(200) })!.short.length).toBeLessThanOrEqual(60);
  });
});

it("shares one lookup and throttle slot for concurrent requests in a grid cell", async () => {
  const lookup = vi.fn(async (lat: number, lon: number) => ({ name: "Delhi", short: "Delhi", lat, lon }));
  const gate = { intervalMs: 0, wait: vi.fn(async () => {}) };
  const service = createPlaceService({ shared: () => null, lookup, gate });
  const [first, second] = await Promise.all([
    service.reverse(28.611, 77.041, "hi"),
    service.reverse(28.612, 77.042, "hi"),
  ]);
  expect(first).toEqual(second);
  expect(lookup).toHaveBeenCalledExactlyOnceWith(28.61, 77.04, "hi");
  expect(gate.wait).toHaveBeenCalledTimes(1);
});

describe("GET /api/reverse", () => {
  const found = { address: { suburb: "Dwarka", city: "New Delhi", state: "Delhi", country_code: "in" } };

  it("returns a place name and sends only coordinates rounded to ~1 km", async () => {
    const f = vi.fn(async (_url: string, _init?: RequestInit) => jsonResponse(found));
    vi.stubGlobal("fetch", f);
    const res = await reverse(get("lat=28.612345&lon=77.039876"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.place).toMatchObject({
      short: "Dwarka, New Delhi",
      name: "Dwarka, New Delhi, Delhi",
      lat: 28.61,
      lon: 77.04,
    });
    const url = String(f.mock.calls[0][0]);
    expect(url).toContain("lat=28.61&lon=77.04");
    expect(url).not.toContain("28.612345");
    expect(url).toContain("accept-language=en");
    expect(JSON.stringify(f.mock.calls[0][1]?.headers)).not.toMatch(/@/);
  });

  it("asks for Hindi names when the app is in Hindi", async () => {
    const f = vi.fn(async (_url: string) => jsonResponse(found));
    vi.stubGlobal("fetch", f);
    await reverse(get("lat=28.61&lon=77.04&lang=hi"));
    expect(String(f.mock.calls[0][0])).toContain("accept-language=hi,en");
  });

  it("rejects missing, malformed and out-of-India coordinates without calling out", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    for (const qs of ["", "lat=28.6", "lat=abc&lon=77", "lat=51.5&lon=-0.12", "lat=0&lon=0"]) {
      expect((await reverse(get(qs))).status).toBe(422);
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("refuses a result that is outside India", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ address: { city: "Dhaka", country_code: "bd" } })),
    );
    expect((await reverse(get("lat=23.8&lon=90.4"))).status).toBe(422);
  });

  it("answers 404 when the point has no name, and 502 when the service is down", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ address: { country_code: "in" } })),
    );
    expect((await reverse(get("lat=20&lon=80"))).status).toBe(404);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({}, 503)),
    );
    expect((await reverse(get("lat=20&lon=81"))).status).toBe(502);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    expect((await reverse(get("lat=20&lon=82"))).status).toBe(502);
  });

  it("is rate limited per client", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(found)),
    );
    const req = () =>
      new Request("http://localhost/api/reverse?lat=28.6&lon=77", { headers: { "x-forwarded-for": "203.0.113.9" } });
    let last = 200;
    for (let i = 0; i < 31; i++) last = (await reverse(req())).status;
    expect(last).toBe(429);
  });
});

describe("nameFor", () => {
  it("returns the name from the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ place: { name: "Dwarka, New Delhi, Delhi", short: "Dwarka, New Delhi", lat: 1, lon: 2 } }),
      ),
    );
    await expect(nameFor(28.61, 77.04)).resolves.toEqual({
      name: "Dwarka, New Delhi, Delhi",
      short: "Dwarka, New Delhi",
    });
  });

  it("returns null on any failure so the caller can keep a generic label", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: "x" }, 404)),
    );
    await expect(nameFor(28.61, 77.04)).resolves.toBeNull();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    await expect(nameFor(28.61, 77.04)).resolves.toBeNull();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ place: {} })),
    );
    await expect(nameFor(28.61, 77.04)).resolves.toBeNull();
  });
});
