import { NextResponse } from "next/server";
import type { z } from "zod";
import { AppError } from "./errors";
import { errorName, log } from "./log";
import { clientIp, limiter } from "./ratelimit";
import type { ErrorCode } from "./types";

/**
 * Everything an API route needs before its own logic: a request id, rate limiting, body size and
 * JSON checks, schema validation, uniform error replies and a last-resort error boundary.
 * Errors carry a stable `code` the client translates; `error` is an English fallback.
 */

const NO_STORE = { "Cache-Control": "no-store" };

const MESSAGES: Record<ErrorCode, string> = {
  rate_limited: "Too many requests. Wait a minute and try again.",
  too_large: "Request is too large.",
  bad_json: "Request must be valid JSON.",
  invalid: "Some details are not valid. Check them and try again.",
  air_unavailable: "Air quality data is not available for this place right now. Try again in a minute.",
  lookup_unavailable: "This lookup is unavailable right now.",
  not_found: "Nothing was found.",
  outside_india: "Only places in India are supported.",
  ai_unavailable: "AI explanations are unavailable right now.",
  stale: "The air data changed since this plan was made. Reload the plan.",
  internal: "Something went wrong on our side. Try again.",
  network: "Could not reach the server.",
};

const STATUS: Record<ErrorCode, number> = {
  rate_limited: 429,
  too_large: 413,
  bad_json: 400,
  invalid: 422,
  air_unavailable: 502,
  lookup_unavailable: 502,
  not_found: 404,
  outside_india: 422,
  ai_unavailable: 503,
  stale: 409,
  internal: 500,
  network: 503,
};


export function fail(code: ErrorCode, extra: Record<string, unknown> = {}): NextResponse {
  return NextResponse.json({ code, error: MESSAGES[code], ...extra }, { status: STATUS[code], headers: NO_STORE });
}

export function ok(body: unknown, headers: Record<string, string> = NO_STORE): NextResponse {
  return NextResponse.json(body, { headers });
}

export async function rateLimitOrThrow(req: Request, scope: string, perMinute: number): Promise<void> {
  if (!(await limiter().hit(`${scope}:${clientIp(req)}`, perMinute, 60_000))) throw new AppError("rate_limited");
}

/** Size-capped JSON body validated against a schema. Throws AppError on any problem. */
export async function readJson<S extends z.ZodType>(req: Request, schema: S, maxBytes: number): Promise<z.infer<S>> {
  const raw = await req.text();
  if (raw.length > maxBytes) throw new AppError("too_large");
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new AppError("bad_json");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppError("invalid", {
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  return parsed.data;
}

type Handler = (req: Request) => Promise<NextResponse>;

/** Wraps a route: request id on every reply, AppError to a clean JSON reply, anything else to a logged 500. */
export function route(name: string, handler: Handler): Handler {
  return async (req) => {
    const requestId = crypto.randomUUID();
    const started = Date.now();
    let res: NextResponse;
    try {
      res = await handler(req);
    } catch (e) {
      if (e instanceof AppError) {
        res = fail(e.code, e.extra);
      } else {
        log("error", "route.crash", { route: name, requestId, reason: errorName(e) });
        res = fail("internal");
      }
    }
    res.headers.set("x-request-id", requestId);
    log("info", "route.done", { route: name, requestId, status: res.status, ms: Date.now() - started });
    return res;
  };
}
