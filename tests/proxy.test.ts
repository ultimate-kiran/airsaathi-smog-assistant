import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { config, proxy } from "../src/proxy";

/** The page's policy, split into directives: { "script-src": "'self' 'nonce-…' …", … } */
function policy(res: Response): Record<string, string> {
  const csp = res.headers.get("Content-Security-Policy") ?? "";
  return Object.fromEntries(
    csp.split("; ").map((d) => {
      const [name, ...values] = d.split(" ");
      return [name, values.join(" ")];
    }),
  );
}

const page = () => proxy(new NextRequest("http://localhost/"));
const nonceOf = (res: Response) => /'nonce-([^']+)'/.exec(policy(res)["script-src"])?.[1];

afterEach(() => vi.unstubAllEnvs());

describe("Content Security Policy proxy", () => {
  it("allows only same-origin scripts carrying this response's nonce", () => {
    const res = page();
    const scripts = policy(res)["script-src"];
    expect(scripts).toBe(`'self' 'nonce-${nonceOf(res)}' 'strict-dynamic'`);
    expect(scripts).not.toContain("unsafe-inline");
  });

  it("issues a fresh nonce on every page view and passes it to Next.js", () => {
    const first = page();
    const second = page();
    expect(nonceOf(first)).toBeTruthy();
    expect(nonceOf(first)).not.toBe(nonceOf(second));
    // NextResponse.next() forwards the rewritten request headers with this prefix.
    expect(first.headers.get("x-middleware-request-x-nonce")).toBe(nonceOf(first));
  });

  it("blocks framing, plugins, foreign form targets and base-URL tricks", () => {
    expect(policy(page())).toMatchObject({
      "default-src": "'self'",
      "connect-src": "'self'",
      "object-src": "'none'",
      "frame-ancestors": "'none'",
      "form-action": "'self'",
      "base-uri": "'self'",
    });
  });

  it("allows eval only in development, for hot reload", () => {
    expect(policy(page())["script-src"]).not.toContain("unsafe-eval");
    vi.stubEnv("NODE_ENV", "development");
    expect(policy(page())["script-src"]).toContain("'unsafe-eval'");
  });

  it("runs on pages but not on API routes or static files", () => {
    const matches = (path: string) => new RegExp(`^${config.matcher[0].source}$`).test(path);
    expect(matches("/")).toBe(true);
    expect(matches("/api/plan")).toBe(false);
    expect(matches("/_next/static/chunk.js")).toBe(false);
    expect(matches("/icon.svg")).toBe(false);
  });
});
