import { z } from "zod";
import { ok, rateLimitOrThrow, readQuery, route } from "@/lib/http";
import { places } from "@/lib/container";
import { PLACE_QUERY_LENGTH } from "@/lib/types";

const SearchQuery = z.object({
  q: z.string().trim().min(PLACE_QUERY_LENGTH.min).max(PLACE_QUERY_LENGTH.max),
});

/** Places in India whose name matches what the user typed. */
export const GET = route("geocode", async (req) => {
  await rateLimitOrThrow(req, "geocode");
  const { q: query } = readQuery(req, SearchQuery);
  return ok({ places: await places.search(query) });
});
