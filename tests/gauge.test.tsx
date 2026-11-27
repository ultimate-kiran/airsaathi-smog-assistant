// @vitest-environment jsdom
import { act, createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import Gauge from "../src/components/Gauge";
import { CATEGORIES } from "../src/lib/aqi";
import { mount, setupDom } from "./dom";

setupDom();

/** Collects animation frames so a test decides when the dial's sweep runs. */
function holdFrames() {
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
  vi.stubGlobal("cancelAnimationFrame", () => {});
  return () => act(() => frames.splice(0).forEach((callback) => callback(0)));
}

/** The dial pointer's rotation in degrees: 0 points at AQI 0, 180 at AQI 500. */
function pointerAngle(): number {
  const style = document.querySelector(".gauge__dot")?.getAttribute("style") ?? "";
  const match = /rotate\(([-\d.e]+)deg\)/.exec(style);
  if (!match) throw new Error(`No rotation in: ${style}`);
  return Number(match[1]);
}

describe("AQI dial", () => {
  it("starts at zero and sweeps to the reading after the first frame", async () => {
    const runFrames = holdFrames();
    await mount(createElement(Gauge, { aqi: 500, label: "Severe" }));
    expect(pointerAngle()).toBe(0);
    await runFrames();
    expect(pointerAngle()).toBeCloseTo(180);
  });

  // Six equal segments of 30°, one per CPCB band; the pointer moves linearly inside each band.
  it.each([
    [0, 0],
    [25, 15],
    [50, 30],
    [75, 45],
    [100, 60],
    [150, 75],
    [350, 135],
    [500, 180],
    [999, 180],
    [-20, 0],
  ])("points AQI %i at %i°", async (aqi, degrees) => {
    const runFrames = holdFrames();
    await mount(createElement(Gauge, { aqi, label: "x" }));
    await runFrames();
    expect(pointerAngle()).toBeCloseTo(degrees);
  });

  it("draws one coloured segment per CPCB band and names the reading for screen readers", async () => {
    await mount(createElement(Gauge, { aqi: 75, label: "Satisfactory" }));
    const segments = document.querySelectorAll(".gauge path");
    expect(segments).toHaveLength(CATEGORIES.length);
    expect([...segments].map((path) => path.getAttribute("stroke"))).toEqual(CATEGORIES.map((band) => band.color));
    expect(document.querySelector(".gauge")?.getAttribute("aria-label")).toBe("AQI 75, Satisfactory");
  });
});
