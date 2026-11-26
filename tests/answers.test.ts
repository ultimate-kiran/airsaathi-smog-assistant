import { describe, expect, it } from "vitest";
import { snapshotFromOpenMeteo } from "../src/lib/airdata";
import { ruleAnswer } from "../src/lib/answers";
import { buildPlan } from "../src/lib/engine";
import type { Profile } from "../src/lib/types";
import { PROFILE, openMeteoPayload } from "./helpers";

const walker: Profile = {
  ...PROFILE,
  household: { ...PROFILE.household, respiratory: true },
  commute: { mode: "walk", km: 3 },
};

describe("ruleAnswer", () => {
  it("answers a mask question about masks even when no mask action applies (AQI below the mask threshold)", () => {
    const plan = buildPlan(walker, snapshotFromOpenMeteo(openMeteoPayload(57, 80)));
    expect(plan.actions.some((a) => a.id === "commute-mask")).toBe(false);
    const answer = ruleAnswer("Which mask should we buy?", plan, "en");
    expect(answer).toMatch(/N95/);
    expect(answer).not.toMatch(/medicine|inhaler/i);
  });

  it("uses the plan's own mask action when there is one", () => {
    const plan = buildPlan(
      { ...walker, commute: { mode: "bike", km: 10 } },
      snapshotFromOpenMeteo(openMeteoPayload(140, 200)),
    );
    expect(ruleAnswer("which mask?", plan, "en")).toMatch(/^Wear a fitted N95/);
  });

  it("answers in Hindi with Hindi hours", () => {
    const plan = buildPlan({ ...walker, lang: "hi" }, snapshotFromOpenMeteo(openMeteoPayload(57, 80)));
    expect(ruleAnswer("कौन सा मास्क लें?", plan, "hi")).toMatch(/N95.*AQI/);
  });

  it("falls back to the top action for questions on no known topic", () => {
    const plan = buildPlan(walker, snapshotFromOpenMeteo(openMeteoPayload(140, 200)));
    expect(ruleAnswer("What about tomorrow?", plan, "en").startsWith(plan.actions[0].title)).toBe(true);
  });
});
