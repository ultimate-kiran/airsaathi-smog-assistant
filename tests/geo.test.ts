import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APPROXIMATE_OVER_M, GeoError, formatAccuracy, locate, round2 } from "../src/lib/geo";

type Ok = (p: GeolocationPosition) => void;
type Err = (e: GeolocationPositionError) => void;

/** A controllable stand-in for navigator.geolocation. */
function fakeGeo() {
  let onOk: Ok = () => {};
  let onErr: Err = () => {};
  let options: PositionOptions | undefined;
  const cleared: number[] = [];
  const geo = {
    watchPosition: vi.fn((ok: Ok, err?: Err | null, opts?: PositionOptions) => {
      onOk = ok;
      onErr = err ?? (() => {});
      options = opts;
      return 7;
    }),
    clearWatch: vi.fn((id: number) => {
      cleared.push(id);
    }),
  };
  const fix = (accuracy: number, lat = 28.6139, lon = 77.209) =>
    onOk({ coords: { latitude: lat, longitude: lon, accuracy } } as GeolocationPosition);
  const error = (code: number) => onErr({ code } as GeolocationPositionError);
  return { geo, fix, error, cleared, opts: () => options };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("locate", () => {
  it("asks for a high-accuracy, uncached position", async () => {
    const g = fakeGeo();
    const p = locate(g.geo);
    g.fix(20);
    await p;
    expect(g.opts()).toMatchObject({ enableHighAccuracy: true, maximumAge: 0 });
  });

  it("returns at once when the first fix is accurate enough, and stops listening", async () => {
    const g = fakeGeo();
    const p = locate(g.geo);
    g.fix(35, 9.97, 76.28);
    await expect(p).resolves.toEqual({ lat: 9.97, lon: 76.28, accuracy: 35 });
    expect(g.cleared).toEqual([7]);
  });

  it("does not settle for a coarse first fix: it waits and uses the better one that follows", async () => {
    const g = fakeGeo();
    const p = locate(g.geo);
    g.fix(12000, 28.0, 77.0); // network guess, kilometres off
    await vi.advanceTimersByTimeAsync(2000);
    g.fix(40, 28.6139, 77.209); // real fix arrives
    await expect(p).resolves.toMatchObject({ lat: 28.6139, lon: 77.209, accuracy: 40 });
  });

  it("returns a usable first fix received after the settle timer", async () => {
    const g = fakeGeo();
    const p = locate(g.geo, { settleMs: 100, timeoutMs: 500 });
    await vi.advanceTimersByTimeAsync(200);
    g.fix(700);
    const result = expect(p).resolves.toMatchObject({ accuracy: 700 });
    await Promise.all([result, vi.advanceTimersByTimeAsync(1500)]);
  });

  it("settles for the best fix seen once the wait is over", async () => {
    const g = fakeGeo();
    const p = locate(g.geo, { settleMs: 5000 });
    g.fix(9000);
    g.fix(4000);
    g.fix(6000); // worse than the best: ignored
    await vi.advanceTimersByTimeAsync(5000);
    await expect(p).resolves.toMatchObject({ accuracy: 4000 });
    expect(g.cleared).toEqual([7]);
  });

  it("treats an error after a fix as a blip: keeps waiting, then uses the better fix that follows", async () => {
    const g = fakeGeo();
    const p = locate(g.geo, { settleMs: 6000 });
    g.fix(15000, 28.9, 77.5); // coarse
    g.error(2); // the position source changed
    await vi.advanceTimersByTimeAsync(2000);
    g.fix(35, 9.97, 76.28); // real fix arrives after the blip
    await expect(p).resolves.toMatchObject({ lat: 9.97, lon: 76.28, accuracy: 35 });
  });

  it("falls back to the best fix it has if only errors follow", async () => {
    const g = fakeGeo();
    const p = locate(g.geo, { settleMs: 6000 });
    g.fix(800);
    g.error(3);
    await vi.advanceTimersByTimeAsync(6000);
    await expect(p).resolves.toMatchObject({ accuracy: 800 });
    expect(g.cleared).toEqual([7]);
  });

  it.each([
    [1, "denied"],
    [2, "unavailable"],
    [3, "timeout"],
  ])("maps error code %i to '%s' when there is no fix", async (code, kind) => {
    const g = fakeGeo();
    const p = locate(g.geo);
    g.error(code);
    await expect(p).rejects.toMatchObject({ kind });
    expect(g.cleared).toEqual([7]);
  });

  it("times out when the device never answers", async () => {
    const g = fakeGeo();
    const p = locate(g.geo, { timeoutMs: 4000 });
    const assertion = expect(p).rejects.toMatchObject({ kind: "timeout" });
    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
  });

  it("reports browsers without geolocation", async () => {
    await expect(locate(undefined)).rejects.toBeInstanceOf(GeoError);
    await expect(locate(undefined)).rejects.toMatchObject({ kind: "unsupported" });
  });

  it("copes with a position delivered before watchPosition has returned", async () => {
    const clearWatch = vi.fn();
    const geo = {
      watchPosition: vi.fn((ok: Ok) => {
        ok({ coords: { latitude: 1, longitude: 2, accuracy: 10 } } as GeolocationPosition);
        return 3;
      }),
      clearWatch,
    };
    await expect(locate(geo)).resolves.toMatchObject({ accuracy: 10 });
    expect(clearWatch).toHaveBeenCalledWith(3);
  });
});

describe("helpers", () => {
  it("rounds to about 1 km", () => {
    expect(round2(9.939876)).toBe(9.94);
    expect(round2(76.260222)).toBe(76.26);
  });

  it("formats accuracy in metres under a kilometre and kilometres above", () => {
    expect(formatAccuracy(35.4)).toBe("35 m");
    expect(formatAccuracy(0.2)).toBe("1 m");
    expect(formatAccuracy(2400)).toBe("2.4 km");
  });

  it("treats a multi-kilometre fix as approximate", () => {
    expect(APPROXIMATE_OVER_M).toBe(3000);
  });
});
