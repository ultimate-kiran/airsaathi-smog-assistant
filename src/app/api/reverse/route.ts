import { z } from "zod";
import { AppError } from "@/lib/errors";
import { ok, rateLimitOrThrow, readQuery, route } from "@/lib/http";
import { places } from "@/lib/container";
import { inIndia } from "@/lib/places";
import { LANGS } from "@/lib/types";

const PositionQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  lang: z.enum(LANGS).catch("en"),
});

/**
 * Turns coordinates into a place name ("Raisina Hill, New Delhi") so "Use my location" can show
 * where you are. Only ~1 km rounded coordinates reach the lookup service, with nothing that
 * identifies the user.
 */
export const GET = route("reverse", async (req) => {
  await rateLimitOrThrow(req, "reverse");
  const { lat, lon, lang } = readQuery(req, PositionQuery);
  if (!inIndia(lat, lon)) throw new AppError("outside_india");
  const place = await places.reverse(lat, lon, lang);
  if (!place) throw new AppError("not_found");
  return ok({ place });
});
