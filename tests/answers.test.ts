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

describe("ruleAnswer general advice, when today's plan has no matching step", () => {
  const base = buildPlan(PROFILE, snapshotFromOpenMeteo(openMeteoPayload(140, 200)));
  const noSteps = { ...base, actions: [], bestWindow: null };
  const QUESTIONS: [topic: string, en: string, hi: string][] = [
    ["masks", "Which N95 should I buy?", "कौन सा मास्क लें?"],
    ["children", "Can the kids play outside?", "क्या बच्चे बाहर खेल सकते हैं?"],
    ["exercise", "Should I go for a run?", "क्या सुबह की सैर ठीक है?"],
    ["windows", "Can I open the windows?", "क्या खिड़की खोलूँ?"],
    ["purifiers", "Is a HEPA purifier worth it?", "क्या प्यूरीफ़ायर लें?"],
    ["cooking", "Is cooking on gas a problem?", "रसोई में धुआँ कैसे कम करें?"],
    ["heating", "Can we light a coal fire?", "क्या अँगीठी जलाएँ?"],
    ["health", "My father has asthma, what now?", "दमा वाले क्या करें?"],
    ["commuting", "Should I take the metro to the office?", "क्या मेट्रो से दफ़्तर जाऊँ?"],
  ];

  it.each(QUESTIONS)("answers a %s question with that topic's advice in both languages", (_topic, en, hi) => {
    for (const [question, lang] of [
      [en, "en"],
      [hi, "hi"],
    ] as const) {
      const answer = ruleAnswer(question, noSteps, lang);
      expect(answer).not.toBe(ruleAnswer("What about tomorrow?", noSteps, lang));
      expect(/[ऀ-ॿ]/.test(answer)).toBe(lang === "hi");
    }
  });

  it("gives every topic its own answer", () => {
    const answers = QUESTIONS.map(([, en]) => ruleAnswer(en, noSteps, "en"));
    expect(new Set(answers).size).toBe(QUESTIONS.length);
  });

  it("adds the cleanest hours only when there are some", () => {
    expect(ruleAnswer("Can I open the windows?", base, "en")).toContain("The cleanest hours today are");
    expect(ruleAnswer("Can I open the windows?", noSteps, "en")).not.toContain("cleanest hours");
  });

  it("falls back to a calm general answer when there is neither a topic nor a step", () => {
    expect(ruleAnswer("What about tomorrow?", noSteps, "en")).toBe(
      "The air looks fine today, so normal routines are fine.",
    );
    expect(ruleAnswer("कल क्या?", noSteps, "hi")).toMatch(/^आज हवा ठीक है/);
  });
});
