import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as explain } from "../src/app/api/explain/route";
import { snapshotFromOpenMeteo } from "../src/lib/airdata";
import { ClientError, api } from "../src/lib/client/api";
import { K, RULES, buildContext, buildPlan, markCounted, planActions, type Rule } from "../src/lib/engine";
import { getPlan, resetCaches } from "../src/lib/planService";
import { withAi } from "../src/lib/planText";
import { shareText } from "../src/lib/share";
import type { ActionOut } from "../src/lib/types";
import { PROFILE, jsonResponse, openMeteoPayload, post } from "./helpers";

const AI_KEYS = ["OPENAI_API_KEY", "GEMINI_API_KEY", "OPENAQ_API_KEY", "WAQI_TOKEN"];
beforeEach(() => {
  resetCaches();
  AI_KEYS.forEach((k) => delete process.env[k]);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  AI_KEYS.forEach((k) => delete process.env[k]);
});

const snap = (pm = 140) => snapshotFromOpenMeteo(openMeteoPayload(pm, pm * 1.4));

describe("engine structure", () => {
  it("counts only the best action of each exclusive group, in the engine", () => {
    const car = { ...PROFILE, commute: { mode: "car" as const, km: 15 } };
    const plan = buildPlan(car, snap());
    const commute = plan.actions.filter((a) => a.exclusive === "commute");
    expect(commute.length).toBeGreaterThan(1);
    expect(commute.filter((a) => a.counted)).toHaveLength(1);
    expect(commute[0].counted).toBe(true);
    expect(plan.actions.filter((a) => !a.exclusive).every((a) => a.counted)).toBe(true);
  });

  it("accepts new rules without changing the engine (open for extension)", () => {
    const extra: Rule = () => ({
      id: "test-rule", group: "community", counted: true, priority: 1000, title: "T", why: "W", impact: {}, assumption: "", forWhom: [],
    });
    const ids = planActions(buildContext(PROFILE, snap()), [...RULES, extra]).map((a) => a.id);
    expect(ids[0]).toBe("test-rule");
  });

  it("keeps explanations in step with the constants", () => {
    const car = { ...PROFILE, commute: { mode: "car" as const, km: 15 } };
    const swap = buildPlan(car, snap()).actions.find((a) => a.id === "car-to-transit")!;
    expect(swap.assumption).toContain(String(K.EF.car));
    expect(swap.assumption).toContain(String(K.EF.transit));
  });

  it("markCounted never mutates its input", () => {
    const a: ActionOut = { id: "a", group: "move", exclusive: "x", counted: true, priority: 1, title: "", why: "", impact: {}, assumption: "", forWhom: [] };
    const input = [a, { ...a, id: "b" }];
    const out = markCounted(input);
    expect(out[1].counted).toBe(false);
    expect(input[1].counted).toBe(true);
  });
});

describe("withAi", () => {
  it("returns a new plan with the AI text and notes, leaving the original untouched", () => {
    const plan = buildPlan(PROFILE, snap());
    const id = plan.actions[0].id;
    const next = withAi(plan, { headline: "H", summary: "S", familyTips: ["t"], notes: { [id]: "note" } });
    expect(next.ai).toMatchObject({ source: "ai", headline: "H" });
    expect(next.actions[0].note).toBe("note");
    expect(plan.ai.source).toBe("rules");
    expect(plan.actions[0].note).toBeUndefined();
  });
});

describe("planService", () => {
  it("reuses one air reading per ~1 km cell (language switch, follow-ups)", async () => {
    const f = vi.fn(async () => jsonResponse(openMeteoPayload()));
    vi.stubGlobal("fetch", f);
    await getPlan(PROFILE);
    await getPlan({ ...PROFILE, lang: "hi", lat: PROFILE.lat + 0.001 });
    expect(f).toHaveBeenCalledTimes(1);
  });
});

describe("/api/explain", () => {
  it("answers 503 with a code when AI is off, so the client keeps the rule text", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(openMeteoPayload())));
    const res = await explain(post("/api/explain", PROFILE));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ code: "ai_unavailable" });
  });

  it("returns grounded AI text when a model is configured", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const plan = buildPlan(PROFILE, snap(90));
    const reply = { headline: `AQI ${plan.aqi.value} today`, summary: "Keep windows shut.", familyTips: [], actionNotes: [] };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (u: string) =>
        String(u).includes("openai")
          ? jsonResponse({ choices: [{ message: { content: JSON.stringify(reply) } }] })
          : jsonResponse(openMeteoPayload(90, 126)),
      ),
    );
    const res = await explain(post("/api/explain", PROFILE));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ headline: reply.headline });
  });
});

describe("client api", () => {
  it("throws a coded ClientError for API errors and network failures", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ code: "rate_limited", error: "x" }, 429)));
    await expect(api.plan(PROFILE)).rejects.toMatchObject({ code: "rate_limited" });
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ code: "made_up" }, 500)));
    await expect(api.plan(PROFILE)).rejects.toMatchObject({ code: "network" });
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
    await expect(api.plan(PROFILE)).rejects.toBeInstanceOf(ClientError);
  });
});

describe("shareText", () => {
  it("formats the cleanest window in the reader's language", () => {
    const plan = buildPlan({ ...PROFILE, lang: "hi" }, snap());
    const text = shareText(plan, "hi");
    expect(text).toContain("AirSaathi · Kochi");
    if (plan.bestWindow) expect(text).toMatch(/बजे/);
  });
});
