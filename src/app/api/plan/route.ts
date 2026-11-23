import { NextResponse } from "next/server";
import { fetchBestAir } from "@/lib/airsource";
import { buildPlan } from "@/lib/engine";
import { aiEnabled, explainWithAi } from "@/lib/ai";
import { clientKey, rateLimit } from "@/lib/ratelimit";
import { ProfileSchema } from "@/lib/types";

export const maxDuration = 30;

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "plan"), 20, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Wait a minute and try again." },
      { status: 429, headers: NO_STORE },
    );
  }

  const raw = await req.text();
  if (raw.length > 8_000) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413, headers: NO_STORE });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Request must be valid JSON." }, { status: 400, headers: NO_STORE });
  }

  const parsed = ProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Some details are not valid. Check the form and try again.",
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 422, headers: NO_STORE },
    );
  }
  const profile = parsed.data;

  let air;
  try {
    air = await fetchBestAir(profile.lat, profile.lon);
  } catch {
    return NextResponse.json(
      { error: "Air quality data is not available for this place right now. Try again in a minute." },
      { status: 502, headers: NO_STORE },
    );
  }


  const plan = buildPlan(profile, air);
  const ai = await explainWithAi(plan, profile);
  if (ai) {
    plan.ai = { source: "ai", headline: ai.headline, summary: ai.summary, familyTips: ai.familyTips };
    for (const a of plan.actions) a.note = ai.notes[a.id];
  }
  return NextResponse.json(
    { ...plan, aiEnabled: aiEnabled() },
    { headers: NO_STORE },
  );
}
