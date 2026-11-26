import { AppError } from "@/lib/errors";
import { ok, rateLimitOrThrow, route } from "@/lib/http";
import { places } from "@/lib/container";
import { inIndia } from "@/lib/places";

/**
 * Turns coordinates into a place name ("Raisina Hill, New Delhi") so "Use my location" can show
 * where you are. Only ~1 km rounded coordinates reach the lookup service, with nothing that
 * identifies the user.
 */
export const GET = route("reverse", async (req) => {
  await rateLimitOrThrow(req, "rev", 30);
  const sp = new URL(req.url).searchParams;
  const lat = Number(sp.get("lat"));
  const lon = Number(sp.get("lon"));
  if (!sp.get("lat") || !sp.get("lon") || !inIndia(lat, lon)) throw new AppError("outside_india");
  const place = await places.reverse(lat, lon, sp.get("lang") === "hi" ? "hi" : "en");
  if (!place) throw new AppError("not_found");
  return ok({ place });
});
