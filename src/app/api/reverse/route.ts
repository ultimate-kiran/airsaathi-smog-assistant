import { NextResponse } from "next/server";
import { z } from "zod";
import { AddressSchema, placeName } from "@/lib/placename";
import { clientKey, rateLimit } from "@/lib/ratelimit";

/**
 * Turns coordinates into a place name ("Raisina Hill, New Delhi") so "Use my location"
 * can show where you are instead of a bare label. Only the ~1 km rounded coordinates
 * are sent to the lookup service, and nothing that identifies the user.
 */
const ResultSchema = z.object({ address: AddressSchema.optional() });

export async function GET(req: Request) {
  if (!rateLimit(clientKey(req, "rev"), 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Wait a minute." }, { status: 429 });
  }
  const sp = new URL(req.url).searchParams;
  const lat = Number(sp.get("lat"));
  const lon = Number(sp.get("lon"));
  // India only, like the rest of the app.
  if (!sp.get("lat") || !sp.get("lon") || !(lat >= 6 && lat <= 38) || !(lon >= 68 && lon <= 98)) {
    return NextResponse.json({ error: "Coordinates must be inside India." }, { status: 422 });
  }
  const lang = sp.get("lang") === "hi" ? "hi,en" : "en";
  // Same rounding as /api/plan: about 1 km is all the lookup needs.
  const rlat = Math.round(lat * 100) / 100;
  const rlon = Math.round(lon * 100) / 100;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&accept-language=${lang}&lat=${rlat}&lon=${rlon}`,
      {
        headers: { "User-Agent": "AirSaathi-smog-assistant" },
        signal: AbortSignal.timeout(6000),
        next: { revalidate: 86_400 },
      },
    );
    if (!res.ok) throw new Error("upstream");
    const data = ResultSchema.parse(await res.json());
    if (data.address?.country_code && data.address.country_code !== "in") {
      return NextResponse.json({ error: "Only places in India are supported." }, { status: 422 });
    }
    const named = data.address ? placeName(data.address) : null;
    if (!named) return NextResponse.json({ error: "No place name found here." }, { status: 404 });
    return NextResponse.json({ place: { ...named, lat: rlat, lon: rlon } });
  } catch {
    return NextResponse.json({ error: "Place lookup is unavailable right now." }, { status: 502 });
  }
}
