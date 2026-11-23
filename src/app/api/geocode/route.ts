import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, rateLimit } from "@/lib/ratelimit";

const ResultSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        admin1: z.string().optional(),
        country: z.string().optional(),
        latitude: z.number(),
        longitude: z.number(),
      }),
    )
    .optional(),
});

export async function GET(req: Request) {
  if (!rateLimit(clientKey(req, "geo"), 40, 60_000)) {
    return NextResponse.json({ error: "Too many searches. Wait a minute." }, { status: 429 });
  }
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 60) {
    return NextResponse.json({ error: "Type at least 2 letters of a city or area." }, { status: 422 });
  }
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json&countryCode=IN`,
      { signal: AbortSignal.timeout(6000), next: { revalidate: 3600 } },
    );
    if (!res.ok) throw new Error("upstream");
    const data = ResultSchema.parse(await res.json());
    return NextResponse.json({
      places: (data.results ?? []).map((r) => ({
        name: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
        short: r.name,
        lat: r.latitude,
        lon: r.longitude,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Place search is unavailable right now." }, { status: 502 });
  }
}
