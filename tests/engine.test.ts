import { describe, expect, it } from "vitest";
import { categoryFor, indiaAqi } from "../src/lib/aqi";
import { snapshotFromOpenMeteo } from "../src/lib/airdata";
import { bestWindow, buildPlan, totalsFor, worstStretch } from "../src/lib/engine";
import { numbersGrounded } from "../src/lib/ai";
import { ProfileSchema, type HourPoint, type Profile } from "../src/lib/types";
import { formatRange } from "../src/lib/format";

/** Two days of hourly data: dirty at night and dawn, cleanest around 2 pm. */
function fixture(currentTime = "2026-11-20T09:15", peak = 260, trough = 110) {
  const time: string[] = [];
  const pm25: number[] = [];
  const pm10: number[] = [];
  for (let d = 20; d <= 21; d++) {
    for (let h = 0; h < 24; h++) {
      time.push(`2026-11-${d}T${String(h).padStart(2, "0")}:00`);
      // smooth dip centred on 14:00
      const dist = Math.min(Math.abs(h - 14), 24 - Math.abs(h - 14));
      const v = trough + ((peak - trough) * Math.min(dist, 8)) / 8;
      pm25.push(Math.round(v));
      pm10.push(Math.round(v * 1.4));
    }
  }
  const idx = time.indexOf(currentTime.slice(0, 13) + ":00");
  return {
    timezone: "Asia/Kolkata",
    current: { time: currentTime, pm2_5: pm25[idx], pm10: pm10[idx] },
    hourly: { time, pm2_5: pm25, pm10 },
  };
}

const base: Profile = {
  lat: 28.61,
  lon: 77.2,
  place: "Delhi",
  lang: "en",
  household: { adults: 2, children: 1, elders: 1, respiratory: false, heart: false, pregnant: false },
  commute: { mode: "car", km: 12 },
  cooking: "lpg",
  heating: "none",
  hasPurifier: false,
  windows: "open",
  exercise: { outdoor: true, minutes: 40 },
};

describe("India AQI", () => {
  it("matches CPCB breakpoints", () => {
    expect(indiaAqi(30, 0)).toBe(50);
    expect(indiaAqi(60, 0)).toBe(100);
    expect(indiaAqi(90, 0)).toBe(200);
    expect(indiaAqi(120, 0)).toBe(300);
    expect(indiaAqi(250, 0)).toBe(400);
  });
  it("takes the worse of PM2.5 and PM10", () => {
    expect(indiaAqi(10, 350)).toBe(300);
  });
  it("maps to categories", () => {
    expect(categoryFor(40).key).toBe("good");
    expect(categoryFor(150).key).toBe("moderate");
    expect(categoryFor(320).key).toBe("veryPoor");
    expect(categoryFor(480).key).toBe("severe");
    expect(categoryFor(999).key).toBe("severe");
  });
});

describe("air snapshot", () => {
  it("starts at the current hour and returns 24 points", () => {
    const s = snapshotFromOpenMeteo(fixture());
    expect(s.hours).toHaveLength(24);
    expect(s.hours[0].hour).toBe(9);
    expect(s.hours[0].isNow).toBe(true);
  });
  it("rejects forecast columns of different lengths", () => {
    const raw = fixture();
    raw.hourly.pm10 = raw.hourly.pm10.slice(0, 10);
    expect(() => snapshotFromOpenMeteo(raw)).toThrow();
  });
  it("fills null gaps instead of failing", () => {
    const raw = fixture();
    (raw.hourly.pm2_5 as (number | null)[])[10] = null;
    expect(() => snapshotFromOpenMeteo(raw)).not.toThrow();
  });
  it("rejects data with no values", () => {
    const raw = fixture();
    raw.hourly.pm2_5 = raw.hourly.pm2_5.map(() => null) as never;
    expect(() => snapshotFromOpenMeteo(raw)).toThrow();
  });
});

describe("best window", () => {
  it("finds the cleanest daytime hours", () => {
    const s = snapshotFromOpenMeteo(fixture());
    const w = bestWindow(s.hours, 1);
    expect(w?.start).toBe(14);
    expect(formatRange(w!, "en")).toBe("2 pm–3 pm");
    expect(formatRange(w!, "hi")).toBe("दोपहर 2–3 बजे");
  });
  it("rejects windows crossing midnight even when those hours have the cleanest air", () => {
    const { hours } = snapshotFromOpenMeteo(fixture());
    const midnight = hours.map((h) => ({ ...h, pm25: h.hour === 23 || h.hour === 0 ? 0 : 100 }));
    expect(bestWindow(midnight, 2)?.start).toBe(9);
  });
  it("never recommends night hours", () => {
    const s = snapshotFromOpenMeteo(fixture());
    const w = bestWindow(s.hours, 3);
    expect(w!.start).toBeGreaterThanOrEqual(6);
    expect(w!.start + 3).toBeLessThanOrEqual(20);
  });
});

describe("plan", () => {
  it("is deterministic", () => {
    const air = snapshotFromOpenMeteo(fixture());
    expect(buildPlan(base, air).actions).toEqual(buildPlan(base, air).actions);
  });

  it("recommends the cleanest window and moves hard exercise indoors when every hour is poor", () => {
    const dirty = snapshotFromOpenMeteo(fixture("2026-11-20T09:15", 400, 300));
    const plan = buildPlan(base, dirty);
    const ids = plan.actions.map((a) => a.id);
    expect(ids).toContain("exercise-indoors");
    expect(ids).not.toContain("exercise-window");
    expect(ids).toContain("kids-play-indoors");
  });

  it("schedules exercise in the clean window when one exists", () => {
    const mild = snapshotFromOpenMeteo(fixture("2026-11-20T09:15", 120, 40));
    const plan = buildPlan(base, mild);
    const ex = plan.actions.find((a) => a.id === "exercise-window");
    expect(ex).toBeDefined();
    expect(formatRange(ex!.window!, "en")).toMatch(/pm/);
    expect(ex!.impact.inhaledPm25Ug).toBeGreaterThan(0);
  });

  it("only suggests the kitchen swap for biomass cooking, and exhaust for gas", () => {
    const air = snapshotFromOpenMeteo(fixture());
    const gas = buildPlan(base, air).actions.map((a) => a.id);
    expect(gas).toContain("kitchen-exhaust");
    expect(gas).not.toContain("clean-cooking");
    const wood = buildPlan({ ...base, cooking: "biomass", heating: "biomass" }, air).actions.map((a) => a.id);
    expect(wood).toContain("clean-cooking");
    expect(wood).toContain("stop-indoor-burning");
    expect(wood).not.toContain("kitchen-exhaust");
  });

  it("adds a health plan only for sensitive households", () => {
    const air = snapshotFromOpenMeteo(fixture());
    expect(buildPlan(base, air).actions.map((a) => a.id)).not.toContain("sensitive-plan");
    const asthma = { ...base, household: { ...base.household, respiratory: true } };
    expect(buildPlan(asthma, air).actions.map((a) => a.id)).toContain("sensitive-plan");
  });

  it("does not suggest a purifier or sealing windows when the air is clean", () => {
    const clean = snapshotFromOpenMeteo(fixture("2026-11-20T09:15", 25, 10));
    const ids = buildPlan(base, clean).actions.map((a) => a.id);
    expect(ids).not.toContain("bedroom-purifier");
    expect(ids).not.toContain("smart-ventilation");
    expect(ids).toContain("air-out");
  });

  it("every quantified impact is a positive, finite number", () => {
    const air = snapshotFromOpenMeteo(fixture());
    const plan = buildPlan({ ...base, commute: { mode: "bike", km: 8 } }, air);
    for (const a of plan.actions) {
      for (const v of Object.values(a.impact)) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("speaks Hindi when asked", () => {
    const air = snapshotFromOpenMeteo(fixture());
    const plan = buildPlan({ ...base, lang: "hi" }, air);
    expect(plan.actions[0].title).toMatch(/[ऀ-ॿ]/);
    expect(plan.ai.headline).toMatch(/[ऀ-ॿ]/);
  });

  it("counts only one action per exclusive group in totals", () => {
    const air = snapshotFromOpenMeteo(fixture());
    const plan = buildPlan(base, air); // a car commuter gets transit and carpool alternatives
    const commute = plan.actions.filter((a) => a.exclusive === "commute");
    expect(commute.length).toBeGreaterThan(1);
    const all = plan.actions.reduce((s, a) => s + (a.impact.co2eKg ?? 0), 0);
    expect(totalsFor(plan.actions).co2eKg).toBeLessThan(all);
  });
});

describe("profile validation", () => {
  it("rejects out-of-range input", () => {
    expect(ProfileSchema.safeParse({ ...base, lat: 120 }).success).toBe(false);
    expect(ProfileSchema.safeParse({ ...base, commute: { mode: "rocket", km: 5 } }).success).toBe(false);
    expect(ProfileSchema.safeParse({ ...base, place: "x".repeat(200) }).success).toBe(false);
  });
  it("accepts the base profile", () => {
    expect(ProfileSchema.safeParse(base).success).toBe(true);
  });
});

describe("hallucination guard", () => {
  const ctx = JSON.stringify({ aqiNow: 312, inhaledPm25MicrogramsAvoidedPerDay: 540 });
  it("accepts numbers that come from the context", () => {
    expect(numbersGrounded("AQI is 312 and you save 540 µg.", ctx)).toBe(true);
  });
  it("accepts small everyday numbers", () => {
    expect(numbersGrounded("Air the house for 10 minutes at 2 pm.", ctx)).toBe(true);
  });
  it("rejects invented large numbers", () => {
    expect(numbersGrounded("This avoids 4,800 µg of PM2.5.", ctx)).toBe(false);
  });
});

describe("worstStretch", () => {
  /** A day of hours starting at 6 am with the given AQI values (the rest of the day at 50). */
  const day = (aqis: number[]): HourPoint[] =>
    Array.from({ length: 24 }, (_, i) => ({
      hour: (6 + i) % 24,
      pm25: 20,
      pm10: 40,
      aqi: aqis[i] ?? 50,
      category: "satisfactory",
      isNow: i === 0,
    }));

  it("returns nothing when even the peak is under the limit", () => {
    expect(worstStretch(day([90, 95, 99]), 100)).toBeNull();
  });

  it("picks the longest run near the peak, as clock hours with an exclusive end", () => {
    // 8-9 am is a short spike; 1-4 pm is the longer stretch at the same level.
    const aqis = [50, 50, 300, 300, 50, 50, 50, 300, 300, 300];
    expect(worstStretch(day(aqis), 100)).toEqual({ start: 13, end: 16, allDay: false });
  });

  it("keeps the earlier stretch when two are equally long", () => {
    expect(worstStretch(day([300, 300, 50, 300, 300]), 100)).toEqual({ start: 6, end: 8, allDay: false });
  });

  it("counts a stretch that runs to the end of the forecast", () => {
    const aqis = Array.from({ length: 24 }, (_, i) => (i >= 20 ? 300 : 50));
    expect(worstStretch(day(aqis), 100)).toEqual({ start: 2, end: 6, allDay: false });
  });

  it("flags the whole day when nearly every hour is bad", () => {
    expect(worstStretch(day(Array(24).fill(300)), 100)?.allDay).toBe(true);
  });

  it("uses the limit as the floor when the peak is only just above it", () => {
    // Peak 110: 85% of it is 93.5, but nothing at or below the 100 limit may count.
    expect(worstStretch(day([95, 110, 105, 99]), 100)).toEqual({ start: 7, end: 9, allDay: false });
  });
});
