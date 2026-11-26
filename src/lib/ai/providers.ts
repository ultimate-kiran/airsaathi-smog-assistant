import { INVALID_MODEL, env } from "../env";
import { errorName, log } from "../log";

/**
 * Model providers behind one interface (Strategy). Adding a provider means adding one entry to
 * PROVIDERS and its key to env.ts; callers never change.
 */
export type Provider = "openai" | "gemini";

export interface ProviderConfig {
  provider: Provider;
  key: string;
  model: string;
}

export interface ModelRequest {
  system: string;
  user: string;
  /** when set, the model must return JSON matching this schema */
  schema?: object;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
}

interface ModelClient {
  defaultModel: string;
  keyOf: (e: ReturnType<typeof env>) => { key?: string; model?: string };
  call: (r: ModelRequest, cfg: ProviderConfig) => Promise<string | null>;
}

/** Gemini's responseSchema uses upper-case type names and has no additionalProperties. */
export function toGeminiSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toGeminiSchema);
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === "additionalProperties") continue;
      out[k] = k === "type" && typeof v === "string" ? v.toUpperCase() : toGeminiSchema(v);
    }
    return out;
  }
  return node;
}

async function postModelRequest(
  provider: Provider,
  url: string,
  auth: Record<string, string>,
  payload: object,
  timeoutMs: number,
) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    log("error", "ai.http", { provider, status: response.status });
    return null;
  }
  return response.json();
}

const PROVIDERS: Record<Provider, ModelClient> = {
  gemini: {
    defaultModel: "gemini-flash-latest",
    keyOf: (e) => ({ key: e.GEMINI_API_KEY, model: e.GEMINI_MODEL }),
    async call(r, cfg) {
      const data = await postModelRequest(
        cfg.provider,
        `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent`,
        { "x-goog-api-key": cfg.key },
        {
          systemInstruction: { parts: [{ text: r.system }] },
          contents: [{ role: "user", parts: [{ text: r.user }] }],
          generationConfig: {
            temperature: r.temperature,
            maxOutputTokens: r.maxTokens,
            ...(r.schema ? { responseMimeType: "application/json", responseSchema: toGeminiSchema(r.schema) } : {}),
          },
        },
        r.timeoutMs,
      );
      return data?.candidates?.[0]?.content?.parts?.map((x: { text?: string }) => x.text ?? "").join("") ?? null;
    },
  },
  openai: {
    defaultModel: "gpt-4.1-mini",
    keyOf: (e) => ({ key: e.OPENAI_API_KEY, model: e.OPENAI_MODEL }),
    async call(r, cfg) {
      const data = await postModelRequest(
        cfg.provider,
        "https://api.openai.com/v1/chat/completions",
        { Authorization: `Bearer ${cfg.key}` },
        {
          model: cfg.model,
          messages: [
            { role: "system", content: r.system },
            { role: "user", content: r.user },
          ],
          max_completion_tokens: r.maxTokens,
          // Reasoning models reject a custom temperature, so only send it to the GPT-4 family.
          ...(/^gpt-4/.test(cfg.model) ? { temperature: r.temperature } : {}),
          ...(r.schema
            ? { response_format: { type: "json_schema", json_schema: { name: "briefing", strict: true, schema: r.schema } } }
            : {}),
        },
        r.timeoutMs,
      );
      const msg = data?.choices?.[0]?.message;
      if (!msg || msg.refusal) return null;
      return typeof msg.content === "string" ? msg.content : null;
    },
  },
};

/** AI_PROVIDER=openai|gemini picks one when both keys exist; otherwise Gemini, then OpenAI. */
export function providerConfig(): ProviderConfig | null {
  const e = env();
  const order: Provider[] = e.AI_PROVIDER === "openai" ? ["openai", "gemini"] : ["gemini", "openai"];
  for (const provider of order) {
    const { key, model } = PROVIDERS[provider].keyOf(e);
    if (key && model !== INVALID_MODEL) return { provider, key, model: model ?? PROVIDERS[provider].defaultModel };
  }
  return null;
}

/** Calls the configured model. Any failure, including a timeout, returns null. */
export async function callModel(r: ModelRequest, cfg: ProviderConfig): Promise<string | null> {
  try {
    const text = await PROVIDERS[cfg.provider].call(r, cfg);
    return typeof text === "string" && text.length > 0 ? text : null;
  } catch (e) {
    log("error", "ai.error", { provider: cfg.provider, reason: errorName(e) });
    return null;
  }
}
