import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadDone, loadProfile, localDate, saveDone, saveProfile, streak } from "../src/lib/storage";
import { PROFILE } from "./helpers";

function fakeStorage(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  };
}

beforeEach(() => {
  vi.stubGlobal("window", { localStorage: fakeStorage() });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("profile storage", () => {
  it("round-trips a valid profile", () => {
    saveProfile(PROFILE);
    expect(loadProfile()).toEqual(PROFILE);
  });
  it("ignores tampered or corrupt data", () => {
    vi.stubGlobal("window", {
      localStorage: fakeStorage({ "airsaathi.profile.v1": JSON.stringify({ ...PROFILE, lat: "x" }) }),
    });
    expect(loadProfile()).toBeNull();
    vi.stubGlobal("window", { localStorage: fakeStorage({ "airsaathi.profile.v1": "{broken" }) });
    expect(loadProfile()).toBeNull();
  });
  it("keeps working when storage throws (private mode)", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("denied");
        },
        setItem: () => {
          throw new Error("denied");
        },
      },
    });
    expect(loadProfile()).toBeNull();
    expect(() => saveProfile(PROFILE)).not.toThrow();
  });
});

describe("progress log", () => {
  it("drops malformed days and entries", () => {
    vi.stubGlobal("window", {
      localStorage: fakeStorage({
        "airsaathi.done.v1": JSON.stringify({
          "2026-11-20": [{ id: "a", ug: 5, co2: 1 }, { id: 7 }, null],
          "not-a-date": [{ id: "b", ug: 1, co2: 1 }],
        }),
      }),
    });
    expect(loadDone()).toEqual({ "2026-11-20": [{ id: "a", ug: 5, co2: 1 }] });
  });

  it("keeps at most 60 days when saving", () => {
    const log: Record<string, { id: string; ug: number; co2: number }[]> = {};
    for (let i = 1; i <= 90; i++) {
      const d = new Date(2026, 0, i);
      log[localDate(d)] = [{ id: "x", ug: 1, co2: 0 }];
    }
    saveDone(log);
    expect(Object.keys(loadDone())).toHaveLength(60);
  });

  it("counts a streak that is still alive if yesterday has entries", () => {
    const today = new Date();
    const y = new Date(today);
    y.setDate(today.getDate() - 1);
    const yy = new Date(today);
    yy.setDate(today.getDate() - 2);
    const e = [{ id: "x", ug: 1, co2: 0 }];
    expect(streak({ [localDate(y)]: e, [localDate(yy)]: e })).toBe(2);
    expect(streak({ [localDate(today)]: e, [localDate(y)]: e })).toBe(2);
    expect(streak({})).toBe(0);
  });
});
