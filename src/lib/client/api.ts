import { ERROR_CODES, type AiExplanation, type ErrorCode, type Lang, type PlanView, type Profile } from "../types";

/**
 * The browser's only door to the API. Every call returns typed data or throws ClientError with a
 * stable code the UI translates. Aborted requests rethrow the AbortError untouched.
 */
export class ClientError extends Error {
  constructor(readonly code: ErrorCode) {
    super(code);
    this.name = "ClientError";
  }
}

export const isAbort = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

const asCode = (x: unknown): ErrorCode =>
  typeof x === "string" && (ERROR_CODES as readonly string[]).includes(x) ? (x as ErrorCode) : "network";

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch (e) {
    if (isAbort(e)) throw e;
    throw new ClientError("network");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ClientError(asCode(data?.code));
  return data as T;
}

const post = <T>(path: string, body: unknown, signal?: AbortSignal) =>
  request<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });

export interface PlaceResult {
  name: string;
  short: string;
  lat: number;
  lon: number;
}

export const api = {
  plan: (profile: Profile, signal?: AbortSignal) => post<PlanView>("/api/plan", profile, signal),
  explain: (profile: Profile, signal?: AbortSignal) => post<AiExplanation>("/api/explain", profile, signal),
  ask: (question: string, profile: Profile, signal?: AbortSignal) =>
    post<{ answer: string; source: "ai" | "rules" }>("/api/ask", { question, profile }, signal),
  search: (q: string, signal?: AbortSignal) =>
    request<{ places: PlaceResult[] }>(`/api/geocode?q=${encodeURIComponent(q)}`, { signal }).then((d) => d.places),
  reverse: (lat: number, lon: number, lang: Lang, signal?: AbortSignal) =>
    request<{ place: PlaceResult }>(`/api/reverse?lat=${lat}&lon=${lon}&lang=${lang}`, { signal }).then((d) => d.place),
};
