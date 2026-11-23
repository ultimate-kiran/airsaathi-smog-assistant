import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchBestAir } from "@/lib/airsource";
import { buildPlan } from "@/lib/engine";
import { answerWithAi } from "@/lib/ai";
import { clientKey, rateLimit } from "@/lib/ratelimit";
import { ProfileSchema, type Lang, type PlanResponse } from "@/lib/types";

export const maxDuration = 30;

const NO_STORE = { "Cache-Control": "no-store" };

const AskSchema = z.object({
  question: z.string().trim().min(2).max(300),
  profile: ProfileSchema,
});

const TOPICS: { words: RegExp; ids: string[] }[] = [
  { words: /mask|n95|ffp|मास्क/i, ids: ["commute-mask"] },
  { words: /kid|child|school|play|बच्च|स्कूल|खेल/i, ids: ["kids-play-window", "kids-play-indoors"] },
  { words: /walk|exercise|run|gym|yoga|सैर|कसरत|दौड़/i, ids: ["exercise-window", "exercise-indoors", "elders-walk-window", "elders-walk-indoors"] },
  { words: /window|ventilat|open|air out|खिड़की|हवा/i, ids: ["smart-ventilation", "air-out"] },
  { words: /purifier|hepa|filter|प्यूरीफ़|फ़िल्टर/i, ids: ["bedroom-purifier"] },
  { words: /cook|stove|kitchen|gas|lpg|चूल्हा|रसोई|खाना/i, ids: ["clean-cooking", "kitchen-exhaust"] },
  { words: /heat|fire|coal|wood|हीटर|अँगीठी|आग/i, ids: ["stop-indoor-burning"] },
  { words: /asthma|inhaler|breath|doctor|pregnan|दमा|साँस|डॉक्टर|गर्भ/i, ids: ["sensitive-plan"] },
  { words: /car|metro|bus|commute|drive|office|कार|मेट्रो|बस|दफ़्तर/i, ids: ["wfh-severe", "car-to-transit", "carpool", "commute-mask"] },
];

function ruleAnswer(question: string, plan: PlanResponse, lang: Lang): string {
  const hit = TOPICS.find((t) => t.words.test(question));
  const action = hit
    ? plan.actions.find((a) => hit.ids.includes(a.id))
    : undefined;
  const chosen = action ?? plan.actions[0];
  const window = plan.bestWindow
    ? lang === "hi"
      ? ` सबसे साफ़ समय ${plan.bestWindow.start}–${plan.bestWindow.end} है।`
      : ` The cleanest hours today are ${plan.bestWindow.start}–${plan.bestWindow.end}.`
    : "";
  if (!chosen) {
    return lang === "hi"
      ? "आज हवा ठीक है। सामान्य सावधानियाँ काफ़ी हैं।"
      : "The air looks fine today, so normal routines are fine.";
  }
  return `${chosen.title}. ${chosen.why}${window}`;
}

export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "ask"), 10, 60_000)) {
    return NextResponse.json(
      { error: "Too many questions. Wait a minute and try again." },
      { status: 429, headers: NO_STORE },
    );
  }
  const raw = await req.text();
  if (raw.length > 10_000) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413, headers: NO_STORE });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Request must be valid JSON." }, { status: 400, headers: NO_STORE });
  }
  const parsed = AskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ask a question of 2 to 300 characters." },
      { status: 422, headers: NO_STORE },
    );
  }
  const { question, profile } = parsed.data;

  let air;
  try {
    air = await fetchBestAir(profile.lat, profile.lon);
  } catch {
    return NextResponse.json(
      { error: "Air quality data is not available right now. Try again in a minute." },
      { status: 502, headers: NO_STORE },
    );
  }
  const plan = buildPlan(profile, air);
  const ai = await answerWithAi(question, plan, profile);
  return NextResponse.json(
    { answer: ai ?? ruleAnswer(question, plan, profile.lang), source: ai ? "ai" : "rules" },
    { headers: NO_STORE },
  );
}
