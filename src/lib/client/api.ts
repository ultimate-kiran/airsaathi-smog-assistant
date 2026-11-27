import { z } from "zod";
import {
  AiExplanationSchema,
  AskReplySchema,
  ERROR_CODES,
  PlaceSchema,
  PlanViewSchema,
  type ErrorCode,
  type Lang,
  type Profile,
} from "../types";

/**
 * The browser's only door to the API. Every reply is checked against the same schema the server's
 * types come from; anything else throws ClientError with a stable code the UI translates.
 * Aborted requests rethrow the AbortError untouched.
 */
export class ClientError extends Error {
  constructor(readonly code: ErrorCode) {
    super(code);
    this.name = "ClientError";
  }
}

export function clientErrorCode(error: unknown): ErrorCode {
  return error instanceof ClientError ? error.code : "network";
}

export const isAbort = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

const asCode = (x: unknown): ErrorCode =>
  typeof x === "string" && (ERROR_CODES as readonly string[]).includes(x) ? (x as ErrorCode) : "network";

async function request<S extends z.ZodType>(schema: S, path: string, init: RequestInit): Promise<z.infer<S>> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch (e) {
    if (isAbort(e)) throw e;
    throw new ClientError("network");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ClientError(asCode(data?.code));
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new ClientError("internal");
  return parsed.data;
}

const post = <S extends z.ZodType>(schema: S, path: string, body: unknown, signal?: AbortSignal) =>
  request(schema, path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

export const api = {
  plan: (profile: Profile, signal?: AbortSignal) => post(PlanViewSchema, "/api/plan", profile, signal),
  explain: (profile: Profile, fetchedAt: string, signal?: AbortSignal) =>
    post(AiExplanationSchema, "/api/explain", { profile, fetchedAt }, signal),
  ask: (question: string, profile: Profile, signal?: AbortSignal) =>
    post(AskReplySchema, "/api/ask", { question, profile }, signal),
  search: (q: string, signal?: AbortSignal) =>
    request(z.object({ places: z.array(PlaceSchema) }), `/api/geocode?q=${encodeURIComponent(q)}`, { signal }).then(
      (d) => d.places,
    ),
  reverse: (lat: number, lon: number, lang: Lang, signal?: AbortSignal) =>
    request(z.object({ place: PlaceSchema }), `/api/reverse?lat=${lat}&lon=${lon}&lang=${lang}`, { signal }).then(
      (d) => d.place,
    ),
};
