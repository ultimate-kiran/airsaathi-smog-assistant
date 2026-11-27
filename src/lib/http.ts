import { NextResponse } from "next/server";
import type { z } from "zod";
import { AppError } from "./errors";
import { RATE_WINDOW_MS, ROUTE_LIMITS, type RouteName } from "./limits";
import { errorName, log } from "./log";
import { clientIp, limiter } from "./ratelimit";
import type { ErrorCode } from "./types";

/**
 * Everything an API route needs before its own logic: a request id, rate limiting, body size and
 * JSON checks, schema validation, uniform error replies and a last-resort error boundary.
 * Errors carry a stable `code` the client translates; `error` is an English fallback.
 */

const NO_STORE = { "Cache-Control": "no-store" };

const ERRORS: Record<ErrorCode, { status: number; message: string }> = {
  rate_limited: { status: 429, message: "Too many requests. Wait a minute and try again." },
  too_large: { status: 413, message: "Request is too large." },
  bad_json: { status: 400, message: "Request must be valid JSON." },
  invalid: { status: 422, message: "Some details are not valid. Check them and try again." },
  air_unavailable: {
    status: 502,
    message: "Air quality data is not available for this place right now. Try again in a minute.",
  },
  lookup_unavailable: { status: 502, message: "This lookup is unavailable right now." },
  not_found: { status: 404, message: "Nothing was found." },
  outside_india: { status: 422, message: "Only places in India are supported." },
  ai_unavailable: { status: 503, message: "AI explanations are unavailable right now." },
  stale: { status: 409, message: "The air data changed since this plan was made. Reload the plan." },
  internal: { status: 500, message: "Something went wrong on our side. Try again." },
  network: { status: 503, message: "Could not reach the server." },
};

export function fail(code: ErrorCode, extra: Record<string, unknown> = {}): NextResponse {
  const { status, message } = ERRORS[code];
  return NextResponse.json({ code, error: message, ...extra }, { status, headers: NO_STORE });
}

export function ok(body: unknown, headers: Record<string, string> = NO_STORE): NextResponse {
  return NextResponse.json(body, { headers });
}

/** Counts this request against the route's per-client limit (see limits.ts). */
export async function rateLimitOrThrow(req: Request, routeName: RouteName): Promise<void> {
  const { perMinute } = ROUTE_LIMITS[routeName];
  const allowed = await limiter().hit(`${routeName}:${clientIp(req)}`, perMinute, RATE_WINDOW_MS);
  if (!allowed) throw new AppError("rate_limited");
}

async function readBody(req: Request, maxBytes: number): Promise<string> {
  const reader = req.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return text + decoder.decode();
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        void reader.cancel().catch(() => {});
        throw new AppError("too_large");
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

/** Validates input against a schema, or throws AppError("invalid") listing each problem field. */
function validate<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("invalid", {
      issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
  }
  return parsed.data;
}

/** Size-capped JSON body validated against a schema. Throws AppError on any problem. */
export async function readJson<S extends z.ZodType>(req: Request, schema: S, maxBytes: number): Promise<z.infer<S>> {
  const raw = await readBody(req, maxBytes);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new AppError("bad_json");
  }
  return validate(schema, body);
}

/** The URL query string as a plain object, validated against a schema the same way JSON bodies are. */
export function readQuery<S extends z.ZodType>(req: Request, schema: S): z.infer<S> {
  return validate(schema, Object.fromEntries(new URL(req.url).searchParams));
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
    } catch (error) {
      if (error instanceof AppError) {
        res = fail(error.code, error.extra);
      } else {
        log("error", "route.crash", { route: name, requestId, reason: errorName(error) });
        res = fail("internal");
      }
    }
    res.headers.set("x-request-id", requestId);
    log("info", "route.done", { route: name, requestId, status: res.status, ms: Date.now() - started });
    return res;
  };
}
