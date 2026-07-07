export function getAiConfig() {
  const infomaniakProductId = (process.env.INFOMANIAK_AI_PRODUCT_ID || "").trim();
  const apiKey = (process.env.INFOMANIAK_API_TOKEN || process.env.OPENAI_API_KEY || "").trim();
  const explicitBase = (process.env.OPENAI_BASE_URL || "").replace(/\/+$/, "");
  const baseUrl = explicitBase
    ? explicitBase
    : infomaniakProductId
      ? "https://api.infomaniak.com/2/ai/" + encodeURIComponent(infomaniakProductId) + "/openai/v1"
      : "https://api.openai.com/v1";
  const model =
    process.env.OPENAI_MODEL?.trim() || (infomaniakProductId ? "qwen3" : "gpt-4o-mini");
  return { apiKey, baseUrl, model, infomaniakProductId };
}

export function aiHeaders(config = getAiConfig()) {
  const headers = { Accept: "application/json", "Content-Type": "application/json" };
  const scheme = (process.env.OPENAI_AUTH_SCHEME || "Bearer").trim();
  if (scheme.toLowerCase() === "api-key") headers["api-key"] = config.apiKey;
  else headers.Authorization = scheme + " " + config.apiKey;
  return headers;
}

export function aiUrl(path, config = getAiConfig()) {
  const normalized = path.startsWith("/") ? path : "/" + path;
  const version = process.env.OPENAI_API_VERSION?.trim();
  const url = config.baseUrl + normalized;
  if (!version) return url;
  return url + (url.includes("?") ? "&" : "?") + "api-version=" + encodeURIComponent(version);
}

/** Token-free connectivity check (safe for occasional manual runs). */
export async function checkAiModelsEndpoint() {
  const config = getAiConfig();
  if (!config.apiKey) return { ok: false, configured: false, status: 0, message: "no API key" };
  const res = await fetch(aiUrl("/models", config), { headers: aiHeaders(config) });
  if (res.ok) return { ok: true, configured: true, status: res.status, message: "models OK" };
  if (res.status === 404) {
    return { ok: true, configured: true, status: res.status, message: "no /models endpoint (acceptable)" };
  }
  return { ok: false, configured: true, status: res.status, message: "models probe failed" };
}

/** Minimal completion — uses tokens; only call when RUN_AI_INTEGRATION_TESTS=1. */
export async function minimalAiCompletion() {
  const config = getAiConfig();
  const res = await fetch(aiUrl("/chat/completions", config), {
    method: "POST",
    headers: aiHeaders(config),
    body: JSON.stringify({
      model: config.model,
      max_tokens: 8,
      temperature: 0,
      messages: [
        { role: "system", content: "Reply with exactly one word: pong" },
        { role: "user", content: "ping" },
      ],
    }),
  });
  if (!res.ok) {
    return { ok: false, status: res.status, text: null, usage: null };
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim() ?? null;
  return {
    ok: Boolean(text),
    status: res.status,
    text,
    usage: data.usage ?? null,
  };
}

/** JSON completion shape used by ai-summary — uses tokens. */
export async function minimalAiJsonCompletion() {
  const config = getAiConfig();
  const messages = [
    {
      role: "system",
      content: 'Return JSON only: {"headline": string, "confidence": "high"|"medium"}',
    },
    { role: "user", content: "Summarize a retirement quiz lead named Alex, age 58." },
  ];

  async function attempt(withJsonMode) {
    const body = {
      model: config.model,
      max_tokens: 60,
      temperature: 0,
      messages,
    };
    if (withJsonMode) body.response_format = { type: "json_object" };
    const res = await fetch(aiUrl("/chat/completions", config), {
      method: "POST",
      headers: aiHeaders(config),
      body: JSON.stringify(body),
    });
    if (!res.ok) return { ok: false, status: res.status, parsed: null, usage: null, mode: withJsonMode ? "json" : "text" };
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return { ok: false, status: res.status, parsed: null, usage: null, mode: withJsonMode ? "json" : "text" };
    const jsonText = raw.match(/\{[\s\S]*\}/)?.[0] ?? raw;
    try {
      const parsed = JSON.parse(jsonText);
      return {
        ok: typeof parsed.headline === "string",
        status: res.status,
        parsed,
        usage: data.usage ?? null,
        mode: withJsonMode ? "json" : "text",
      };
    } catch {
      return { ok: false, status: res.status, parsed: null, usage: data.usage ?? null, mode: withJsonMode ? "json" : "text" };
    }
  }

  const jsonMode = await attempt(true);
  if (jsonMode.ok) return jsonMode;
  if (jsonMode.status !== 400 && jsonMode.status !== 422) return jsonMode;
  return attempt(false);
}
