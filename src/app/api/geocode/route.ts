import { AppError } from "@/lib/errors";
import { ok, rateLimitOrThrow, route } from "@/lib/http";
import { places } from "@/lib/container";

export const GET = route("geocode", async (req) => {
  await rateLimitOrThrow(req, "geo", 40);
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 60) throw new AppError("invalid");
  return ok({ places: await places.search(q) });
});
