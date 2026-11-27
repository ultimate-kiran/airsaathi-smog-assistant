// @vitest-environment jsdom
import { createElement } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import App from "../src/components/App";
import { snapshotFromOpenMeteo } from "../src/lib/airdata";
import { api } from "../src/lib/client/api";
import { buildPlan } from "../src/lib/engine";
import { loadProfile, saveProfile } from "../src/lib/storage";
import { click, mount, setupDom } from "./dom";
import { openMeteoPayload, PROFILE } from "./helpers";

setupDom();

beforeEach(() => {
  const air = snapshotFromOpenMeteo(openMeteoPayload());
  vi.spyOn(api, "plan").mockImplementation(async (p) => {
    const result = buildPlan(p, air);
    return { ...result, ai: { ...result.ai, headline: `Plan for ${p.household.adults} adults` }, aiEnabled: false };
  });
});

it("discards a cancelled edit and rebuilds the plan only for submitted changes", async () => {
  saveProfile(PROFILE);
  await mount(createElement(App));
  await click("Change household details");
  await click("Adults: +1");
  expect(loadProfile()).toEqual(PROFILE);
  await click("Cancel");
  expect(document.querySelector(".summary")?.textContent).toContain("Adults: 2");
  expect(document.querySelector("h1")?.textContent).toBe("Plan for 2 adults");
  expect(api.plan).toHaveBeenCalledTimes(1);

  await click("Change household details");
  await click("Adults: +1");
  await click("Update my plan");
  const saved = { ...PROFILE, household: { ...PROFILE.household, adults: 3 } };
  expect(loadProfile()).toEqual(saved);
  expect(api.plan).toHaveBeenLastCalledWith(saved, expect.anything());
  expect(document.querySelector(".summary")?.textContent).toContain("Adults: 3");
  expect(document.querySelector("h1")?.textContent).toBe("Plan for 3 adults");
});

it("keeps first-time edits private and uses the defaults when a typical household is chosen", async () => {
  await mount(createElement(App));
  await click("Delhi");
  await click("Adults: +1");
  expect(loadProfile()).toBeNull();
  await click("Or use a typical household");
  expect(loadProfile()).toMatchObject({ place: "Delhi", household: { adults: 2 } });
  expect(document.querySelector("h1")?.textContent).toBe("Plan for 2 adults");
});

it("keeps the current place when an open draft is submitted after a location change", async () => {
  saveProfile(PROFILE);
  await mount(createElement(App));
  await click("Change household details");
  await click("Adults: +1");
  await click("Delhi");
  expect(loadProfile()).toMatchObject({ place: "Delhi", household: { adults: 2 } });
  await click("Update my plan");
  expect(loadProfile()).toMatchObject({ place: "Delhi", household: { adults: 3 } });
  expect(api.plan).toHaveBeenLastCalledWith(loadProfile(), expect.anything());
});

it("retries a failed update with the submitted household without showing its previous plan", async () => {
  saveProfile(PROFILE);
  await mount(createElement(App));
  await click("Change household details");
  await click("Adults: +1");
  vi.mocked(api.plan).mockRejectedValueOnce(new Error("offline"));
  await click("Update my plan");
  expect(document.querySelector("#plan")).toBeNull();
  expect(document.querySelector('[role="alert"]')).not.toBeNull();
  await click("Try again");
  expect(document.querySelector("h1")?.textContent).toBe("Plan for 3 adults");
});
