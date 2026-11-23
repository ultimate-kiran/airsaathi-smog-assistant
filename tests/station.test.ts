import { describe, expect, it } from "vitest";
import { snapshotFromOpenMeteo } from "../src/lib/airdata";
import { applyStation, parseWaqi, usIndexToUg } from "../src/lib/station";

const NOW = new Date("2026-11-20T12:00:00Z");

function waqi(over: Record<string, unknown> = {}) {
  return {
    status: "ok",
    data: {
      city: { name: "Vyttila, Kochi", geo: [9.97, 76.32] },
      iaqi: { pm25: { v: 80 }, pm10: { v: 60 } },
      time: { iso: "2026-11-20T16:30:00+05:30" },
      ...over,
    },
  };
}

function model() {
  const time = Array.from({ length: 48 }, (_, i) => `2026-11-${20 + Math.floor(i / 24)}T${String(i % 24).padStart(2, "0")}:00`);
  return snapshotFromOpenMeteo({
    current: { time: "2026-11-20T17:30", pm2_5: 45, pm10: 50 },
    hourly: { time, pm2_5: time.map(() => 45), pm10: time.map(() => 50) },
  });
}

describe("usIndexToUg", () => {
  it("inverts EPA breakpoints", () => {
    expect(usIndexToUg(50, [[0, 50, 0, 9], [51, 100, 9.1, 35.4]])).toBeCloseTo(9, 5);
    expect(usIndexToUg(100, [[0, 50, 0, 9], [51, 100, 9.1, 35.4]])).toBeCloseTo(35.4, 5);
  });
});

describe("parseWaqi", () => {
  it("reads a nearby fresh station", () => {
    const r = parseWaqi(waqi(), 9.94, 76.26, NOW);
    expect(r).not.toBeNull();
    expect(r!.km).toBeLessThan(10);
    expect(r!.pm25).toBeGreaterThan(20);
    expect(r!.pm25).toBeLessThan(40);
  });
  it("rejects a station that is too far away", () => {
    expect(parseWaqi(waqi({ city: { name: "Delhi", geo: [28.6, 77.2] } }), 9.94, 76.26, NOW)).toBeNull();
  });
  it("rejects stale readings", () => {
    expect(parseWaqi(waqi({ time: { iso: "2026-11-19T00:00:00+05:30" } }), 9.94, 76.26, NOW)).toBeNull();
  });
  it("rejects stations without PM2.5 and malformed payloads", () => {
    expect(parseWaqi(waqi({ iaqi: {} }), 9.94, 76.26, NOW)).toBeNull();
    expect(parseWaqi({ status: "error" }, 9.94, 76.26, NOW)).toBeNull();
    expect(parseWaqi("junk", 9.94, 76.26, NOW)).toBeNull();
  });
});

describe("applyStation", () => {
  it("uses the station as now and rescales the forecast", () => {
    const m = model();
    const st = parseWaqi(waqi(), 9.94, 76.26, NOW)!;
    const out = applyStation(m, st);
    expect(out.source.kind).toBe("station");
    expect(out.current.pm25).toBe(Math.round(st.pm25));
    expect(out.hours[0].pm25).toBe(out.current.pm25);
    expect(out.hours[5].pm25).toBeLessThan(m.hours[5].pm25); // station reads lower than the model
    expect(out.hours).toHaveLength(m.hours.length);
  });
  it("caps the scaling factor", () => {
    const m = model();
    const out = applyStation(m, { name: "x", km: 1, updatedISO: "", pm25: 1, pm10: null });
    expect(out.hours[3].pm25).toBeGreaterThanOrEqual(Math.round(45 * 0.3) - 1);
  });
});
