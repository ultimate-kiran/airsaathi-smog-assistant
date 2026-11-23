import { describe, expect, it } from "vitest";
import { aggregate, pickLocations, toCandidate, type OpenAqCandidate } from "../src/lib/openaq";
import { US_PM10, US_PM25, usIndexToUg } from "../src/lib/station";

const NOW = new Date("2026-11-23T10:00:00Z");
const KOCHI = { lat: 9.94, lon: 76.26 };
const UG = "µg/m³";

interface LocOpts {
  id?: number;
  name?: string;
  monitor?: boolean;
  last?: string | null;
  lat?: number;
  lon?: number;
  units?: string;
}

/** A /v3/locations result carrying a pm25 sensor (id = loc id + 1) and a pm10 sensor (id + 2). */
function loc({ id = 1, name = "Eloor", monitor = true, last = "2026-11-23T09:00:00Z", lat = 10.07, lon = 76.3, units = UG }: LocOpts = {}) {
  return {
    id,
    name,
    isMonitor: monitor,
    coordinates: { latitude: lat, longitude: lon },
    ...(last ? { datetimeLast: { utc: last } } : {}),
    sensors: [
      { id: id * 10 + 1, parameter: { name: "pm25", units } },
      { id: id * 10 + 2, parameter: { name: "pm10", units } },
    ],
  };
}
const locations = (...l: ReturnType<typeof loc>[]) => ({ results: l });

function latest(id: number, pm25: number | null, utc = "2026-11-23T09:00:00Z", pm10?: number) {
  return {
    results: [
      { sensorsId: id * 10 + 1, value: pm25, datetime: { utc } },
      ...(pm10 !== undefined ? [{ sensorsId: id * 10 + 2, value: pm10, datetime: { utc } }] : []),
    ],
  };
}

const cand = (over: Partial<OpenAqCandidate> = {}): OpenAqCandidate => ({
  name: "A",
  km: 5,
  monitor: true,
  pm25: 40,
  pm10: null,
  updatedISO: "2026-11-23T09:00:00Z",
  ...over,
});

describe("pickLocations", () => {
  it("keeps fresh locations and drops ones silent for more than 3 hours", () => {
    const raw = locations(loc({ id: 1 }), loc({ id: 2, last: "2022-10-16T16:00:00Z" }));
    expect(pickLocations(raw, KOCHI.lat, KOCHI.lon, NOW).map((l) => l.id)).toEqual([1]);
  });
  it("drops locations with no timestamp and sensors in other units", () => {
    const raw = locations(loc({ id: 1, last: null }), loc({ id: 2, units: "ppb" }));
    expect(pickLocations(raw, KOCHI.lat, KOCHI.lon, NOW)).toEqual([]);
  });
  it("sorts by distance and keeps only the nearest five", () => {
    const many = Array.from({ length: 8 }, (_, i) => loc({ id: i + 1, lat: 9.94 + (8 - i) * 0.01 }));
    const picked = pickLocations(locations(...many), KOCHI.lat, KOCHI.lon, NOW);
    expect(picked).toHaveLength(5);
    expect(picked[0].id).toBe(8); // closest to 9.94
  });
  it("returns nothing for malformed payloads", () => {
    expect(pickLocations("junk", KOCHI.lat, KOCHI.lon, NOW)).toEqual([]);
    expect(pickLocations({ results: [{ id: "x" }] }, KOCHI.lat, KOCHI.lon, NOW)).toEqual([]);
  });
});

describe("toCandidate", () => {
  const l = loc({ id: 7, name: " Eloor " });
  const parsed = pickLocations(locations(l), KOCHI.lat, KOCHI.lon, NOW)[0];

  it("reads PM2.5 and PM10 and tags a reference monitor", () => {
    const c = toCandidate(parsed, latest(7, 18.1, "2026-11-23T08:00:00Z", 40), KOCHI.lat, KOCHI.lon, NOW)!;
    expect(c).toMatchObject({ name: "Eloor", monitor: true, pm25: 18.1, pm10: 40 });
    expect(c.km).toBeGreaterThan(10);
  });
  it("rejects a stale value, a negative one and an absurd one", () => {
    expect(toCandidate(parsed, latest(7, 18, "2026-11-23T05:00:00Z"), KOCHI.lat, KOCHI.lon, NOW)).toBeNull();
    expect(toCandidate(parsed, latest(7, -4), KOCHI.lat, KOCHI.lon, NOW)).toBeNull();
    expect(toCandidate(parsed, latest(7, 5000), KOCHI.lat, KOCHI.lon, NOW)).toBeNull();
    expect(toCandidate(parsed, latest(7, null), KOCHI.lat, KOCHI.lon, NOW)).toBeNull();
  });
  it("picks the freshest of several PM2.5 sensors at one location", () => {
    const twoSensors = { ...l, sensors: [...l.sensors, { id: 999, parameter: { name: "pm25", units: UG } }] };
    const p = pickLocations(locations(twoSensors), KOCHI.lat, KOCHI.lon, NOW)[0];
    const raw = {
      results: [
        { sensorsId: 71, value: 200, datetime: { utc: "2026-11-23T07:30:00Z" } },
        { sensorsId: 999, value: 22, datetime: { utc: "2026-11-23T09:30:00Z" } },
      ],
    };
    expect(toCandidate(p, raw, KOCHI.lat, KOCHI.lon, NOW)!.pm25).toBe(22);
  });
  it("ignores readings from sensors that are not PM2.5 at this location", () => {
    const raw = { results: [{ sensorsId: 424242, value: 30, datetime: { utc: "2026-11-23T09:00:00Z" } }] };
    expect(toCandidate(parsed, raw, KOCHI.lat, KOCHI.lon, NOW)).toBeNull();
    expect(toCandidate(parsed, "junk", KOCHI.lat, KOCHI.lon, NOW)).toBeNull();
  });
});

describe("aggregate", () => {
  it("returns null with no candidates", () => {
    expect(aggregate([])).toBeNull();
  });
  it("uses the median of several agreeing monitors and is not flagged uncertain", () => {
    const r = aggregate([cand({ pm25: 100, km: 3 }), cand({ pm25: 120, km: 8 }), cand({ pm25: 110, km: 9 })])!;
    expect(r.pm25).toBe(110);
    expect(r.count).toBe(3);
    expect(r.km).toBe(9);
    expect(r.uncertain).toBe(false);
  });
  it("averages the middle pair for an even count", () => {
    expect(aggregate([cand({ pm25: 40 }), cand({ pm25: 60 })])!.pm25).toBe(50);
  });
  it("one faulty station does not move the median", () => {
    const r = aggregate([cand({ pm25: 80 }), cand({ pm25: 85 }), cand({ pm25: 900 })])!;
    expect(r.pm25).toBe(85);
    expect(r.uncertain).toBe(true); // 900 vs 80 disagree, so we say so
  });
  it("flags a single station as uncertain and names it", () => {
    const r = aggregate([cand({ name: "Eloor", pm25: 18, km: 15 })])!;
    expect(r).toMatchObject({ name: "Eloor", count: 1, km: 15, uncertain: true });
  });
  it("prefers reference monitors over low-cost sensors but flags the disagreement (Kochi case)", () => {
    const r = aggregate([
      cand({ name: "Eloor", pm25: 18.11, km: 15 }),
      cand({ name: "Ambalamugal", pm25: 115.5, km: 12, monitor: false }),
    ])!;
    expect(r.pm25).toBeCloseTo(18.11, 2);
    expect(r.count).toBe(1);
    expect(r.uncertain).toBe(true);
  });
  it("falls back to low-cost sensors when no monitor is fresh, always uncertain", () => {
    const r = aggregate([cand({ pm25: 50, monitor: false }), cand({ pm25: 52, monitor: false })])!;
    expect(r.count).toBe(2);
    expect(r.uncertain).toBe(true);
  });
  it("takes PM10 from the stations that report it and the newest timestamp", () => {
    const r = aggregate([
      cand({ pm10: 100, updatedISO: "2026-11-23T08:00:00Z" }),
      cand({ pm10: null, updatedISO: "2026-11-23T09:30:00Z" }),
      cand({ pm10: 140, updatedISO: "2026-11-23T09:00:00Z" }),
    ])!;
    expect(r.pm10).toBe(120);
    expect(r.updatedISO).toBe("2026-11-23T09:30:00Z");
  });
});

describe("EPA index conversion accuracy (pinned)", () => {
  // Measured against OpenAQ at 11 paired CPCB stations on 2026-11-23: WAQI index -> µg/m³ with this
  // table lands within about ±15% on average. These pin the table so a typo cannot slip in.
  it.each([
    [171, 84.0],
    [121, 43.6],
    [91, 30.6],
    [57, 12.3],
  ])("index %i is about %f µg/m³", (idx, ug) => {
    expect(usIndexToUg(idx, US_PM25)).toBeCloseTo(ug, 0);
  });
  it("covers 0 to 500 without gaps", () => {
    for (const t of [US_PM25, US_PM10]) {
      expect(t[0][0]).toBe(0);
      expect(t.at(-1)![1]).toBe(500);
      t.slice(1).forEach((b, i) => expect(b[0]).toBe(t[i][1] + 1));
    }
  });
});
