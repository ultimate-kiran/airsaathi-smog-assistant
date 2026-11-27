import { afterEach, describe, expect, it, vi } from "vitest";
import { ClientError, api, clientErrorCode, isAbort } from "../src/lib/client/api";

/** The browser's API client: URLs it builds, and how every kind of failure reaches the UI. */
const DELHI = { name: "Delhi, India", short: "Delhi", lat: 28.61, lon: 77.21 };

const reply = (status: number, body: unknown) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function stubFetch(result: Response | Error) {
  const fetchMock = vi.fn(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("API client requests", () => {
  it("searches places with the typed text URL-encoded", async () => {
    const fetchMock = stubFetch(reply(200, { places: [DELHI] }));
    expect(await api.search("New Delhi & co")).toEqual([DELHI]);
    expect(fetchMock).toHaveBeenCalledWith("/api/geocode?q=New%20Delhi%20%26%20co", expect.any(Object));
  });

  it("names a position in the chosen language", async () => {
    const fetchMock = stubFetch(reply(200, { place: DELHI }));
    expect(await api.reverse(28.61, 77.21, "hi")).toEqual(DELHI);
    expect(fetchMock).toHaveBeenCalledWith("/api/reverse?lat=28.61&lon=77.21&lang=hi", expect.any(Object));
  });
});

describe("API client failures", () => {
  it("passes the server's error code to the UI", async () => {
    stubFetch(reply(429, { code: "rate_limited", error: "Too many requests." }));
    await expect(api.search("Delhi")).rejects.toMatchObject({ name: "ClientError", code: "rate_limited" });
  });

  it("treats an unknown code or an unreadable error body as a network problem", async () => {
    stubFetch(reply(500, { code: "not-a-real-code" }));
    await expect(api.search("Delhi")).rejects.toMatchObject({ code: "network" });
    stubFetch(reply(502, "<html>Bad gateway</html>"));
    await expect(api.search("Delhi")).rejects.toMatchObject({ code: "network" });
  });

  it("rejects a successful reply that does not match the expected shape", async () => {
    stubFetch(reply(200, { places: "not a list" }));
    await expect(api.search("Delhi")).rejects.toMatchObject({ code: "internal" });
  });

  it("reports a connection that never reached the server as a network error", async () => {
    stubFetch(new TypeError("Failed to fetch"));
    await expect(api.reverse(28.61, 77.21, "en")).rejects.toMatchObject({ code: "network" });
  });

  it("lets a cancelled request through untouched, so the UI can ignore it", async () => {
    stubFetch(new DOMException("The operation was aborted.", "AbortError"));
    const error = await api.search("Delhi").catch((e: unknown) => e);
    expect(isAbort(error)).toBe(true);
    expect(error).not.toBeInstanceOf(ClientError);
  });

  it("maps any thrown value to a code the UI can translate", () => {
    expect(clientErrorCode(new ClientError("stale"))).toBe("stale");
    expect(clientErrorCode(new Error("boom"))).toBe("network");
    expect(clientErrorCode("anything")).toBe("network");
  });
});
