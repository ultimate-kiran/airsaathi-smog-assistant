// @vitest-environment jsdom
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/components/App";
import { snapshotFromOpenMeteo } from "../src/lib/airdata";
import { ClientError, api } from "../src/lib/client/api";
import { buildPlan } from "../src/lib/engine";
import { UI } from "../src/lib/i18n";
import { loadDone, localDate, saveProfile } from "../src/lib/storage";
import type { AiExplanation } from "../src/lib/types";
import { click, mount, settle, text, setupDom } from "./dom";
import { openMeteoPayload, PROFILE } from "./helpers";

setupDom();

const t = UI.en;
const AI: AiExplanation = {
  headline: "Kochi's air is moderate today",
  summary: "Go out after 2 pm.",
  familyTips: ["Run the purifier in the bedroom."],
  notes: {},
};

beforeEach(() => {
  const air = snapshotFromOpenMeteo(openMeteoPayload());
  vi.spyOn(api, "plan").mockImplementation(async (p) => ({ ...buildPlan(p, air), aiEnabled: true }));
  saveProfile(PROFILE);
});

/** Renders the app for a returning visitor and lets the plan and AI requests finish. */
async function openApp() {
  await mount(createElement(App));
  await settle();
}

describe("AI explanation step", () => {
  it("replaces the rule text with the AI text once it arrives", async () => {
    vi.spyOn(api, "explain").mockResolvedValue(AI);
    await openApp();
    expect(api.explain).toHaveBeenCalledWith(PROFILE, expect.any(String), expect.any(AbortSignal));
    expect(text("h1")).toBe(AI.headline);
    expect(text(".tips")).toContain(AI.familyTips[0]);
    expect(text(".ai-note")).toContain(t.aiOn);
  });

  it("keeps the rule-based plan when the AI request fails", async () => {
    vi.spyOn(api, "explain").mockRejectedValue(new ClientError("internal"));
    await openApp();
    expect(text("h1")).toMatch(/^Air in Kochi is/);
    expect(text(".ai-note")).toContain(t.aiOff);
  });

  it("reloads the plan once when the air reading changed between the two requests", async () => {
    vi.spyOn(api, "explain").mockRejectedValueOnce(new ClientError("stale")).mockResolvedValueOnce(AI);
    await openApp();
    await settle();
    expect(api.plan).toHaveBeenCalledTimes(2);
    expect(text("h1")).toBe(AI.headline);
  });

  it("gives up after one reload, so a reading that keeps changing cannot loop", async () => {
    vi.spyOn(api, "explain").mockRejectedValue(new ClientError("stale"));
    await openApp();
    await settle();
    expect(api.plan).toHaveBeenCalledTimes(2);
    expect(text(".ai-note")).toContain(t.aiOff);
  });
});

describe("I did this", () => {
  it("logs a step for today, counts it in the tracker, and un-logs it on a second tap", async () => {
    vi.spyOn(api, "explain").mockResolvedValue(AI);
    await openApp();
    const tick = document.querySelector<HTMLInputElement>(".action .done input")!;

    await click(tick);
    const logged = loadDone()[localDate()] ?? [];
    expect(logged).toHaveLength(1);
    expect(tick.checked).toBe(true);
    expect(text(".tracker")).not.toContain(t.trackerEmpty);

    await click(tick);
    expect(loadDone()[localDate()] ?? []).toHaveLength(0);
    expect(tick.checked).toBe(false);
  });
});

describe("Language switch", () => {
  it("sets the page language too, so screen readers read the whole page in Hindi", async () => {
    vi.spyOn(api, "explain").mockResolvedValue(AI);
    await openApp();
    expect(document.documentElement.lang).toBe("en");
    await click("हिन्दी");
    expect(document.documentElement.lang).toBe("hi");
    expect(document.querySelector(".app")?.getAttribute("lang")).toBe("hi");
  });
});
