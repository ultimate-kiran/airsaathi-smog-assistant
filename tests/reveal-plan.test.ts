// @vitest-environment jsdom
import { act, createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/components/App";
import { snapshotFromOpenMeteo } from "../src/lib/airdata";
import { ClientError, api } from "../src/lib/client/api";
import { buildPlan } from "../src/lib/engine";
import { click, mount, settle, setupDom } from "./dom";
import { openMeteoPayload } from "./helpers";

/**
 * After "Build my plan" the page moves to the new plan and gives it keyboard focus, so screen
 * reader and keyboard users land on the result. People who ask for less motion get no smooth scroll.
 */
setupDom();

let frames: FrameRequestCallback[];
const scrollIntoView = vi.fn();

beforeEach(() => {
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
  vi.stubGlobal("cancelAnimationFrame", () => {});
  // jsdom has no layout, so scrolling is recorded rather than performed.
  Element.prototype.scrollIntoView = scrollIntoView;
  scrollIntoView.mockClear();
  const air = snapshotFromOpenMeteo(openMeteoPayload());
  vi.spyOn(api, "plan").mockImplementation(async (profile) => ({ ...buildPlan(profile, air), aiEnabled: false }));
});

afterEach(() => {
  delete (Element.prototype as Partial<Element>).scrollIntoView;
});

function prefersReducedMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduce, media: query }));
}

/** Picks Delhi, builds the typical household's plan, then runs the frames the page asked for. */
async function buildPlanForDelhi() {
  await mount(createElement(App));
  await click("Delhi");
  await click("Or use a typical household");
  await settle();
  await act(() => frames.splice(0).forEach((callback) => callback(0)));
}

describe("moving to a new plan", () => {
  it("scrolls smoothly to the plan and focuses it", async () => {
    prefersReducedMotion(false);
    await buildPlanForDelhi();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(document.activeElement?.id).toBe("plan");
  });

  it("jumps without animation when the visitor prefers reduced motion", async () => {
    prefersReducedMotion(true);
    await buildPlanForDelhi();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
    expect(document.activeElement?.id).toBe("plan");
  });

  it("stays put when the plan could not be built", async () => {
    prefersReducedMotion(false);
    vi.spyOn(api, "plan").mockRejectedValue(new ClientError("air_unavailable"));
    await buildPlanForDelhi();
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(document.querySelector("#plan")).toBeNull();
  });
});
