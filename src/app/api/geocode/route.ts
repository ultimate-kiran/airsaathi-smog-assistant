import { AppError } from "@/lib/errors";
import { ok, rateLimitOrThrow, route } from "@/lib/http";
import { places } from "@/lib/container";
import { PLACE_QUERY_LENGTH } from "@/lib/types";

export const GET = route("geocode", async (req) => {
  await rateLimitOrThrow(req, "geo", 40);
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < PLACE_QUERY_LENGTH.min || q.length > PLACE_QUERY_LENGTH.max) throw new AppError("invalid");
  return ok({ places: await places.search(q) });
});
