import type { AiUsageFeature } from "./ai-usage-types";
import { OPENAI_APP_TITLE_DEFAULT } from "./app-identity";
import { logError, logOpenAiFailure } from "./logger";

export interface OpenAiHealthResult {
  configured: boolean;
  ok: boolean;
  message: string;
  model: string;
  baseUrl: string;
  latencyMs?: number;
}

export interface OpenAiChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_call_id?: string;
  name?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
}

export interface OpenAiChatCompletionBody {
  model?: string;
  messages: OpenAiChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" | "text" };
  tools?: unknown[];
  tool_choice?: "auto" | "none" | "required";
}

export interface OpenAiChatCompletionChoice {
  message?: OpenAiChatMessage;
  finish_reason?: string;
}

export interface OpenAiChatCompletionResponse {
  choices?: OpenAiChatCompletionChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export interface OpenAiCallOptions {
  feature?: AiUsageFeature;
}

export function getInfomaniakProductId(): string | undefined {
  const id = process.env.INFOMANIAK_AI_PRODUCT_ID?.trim();
  return id || undefined;
}

export function isInfomaniakConfigured(): boolean {
  return Boolean(getInfomaniakProductId());
}

export function getOpenAiApiKey(): string | undefined {
  const infomaniakKey = process.env.INFOMANIAK_API_TOKEN?.trim();
  if (infomaniakKey) return infomaniakKey;
  const key = process.env.OPENAI_API_KEY?.trim();
  return key || undefined;
}

export function isOpenAiConfigured(): boolean {
  return Boolean(getOpenAiApiKey());
}

export function getOpenAiModel(): string {
  const configured = process.env.OPENAI_MODEL?.trim();
  if (configured) return configured;
  return isInfomaniakConfigured() ? "qwen3" : "gpt-4o-mini";
}

/** Base URL for an OpenAI-compatible API (Infomaniak, OpenAI, OpenRouter, Groq, Azure, etc.). */
export function getOpenAiBaseUrl(): string {
  const explicit = process.env.OPENAI_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const productId = getInfomaniakProductId();
  if (productId) {
    return `https://api.infomaniak.com/2/ai/${encodeURIComponent(productId)}/openai/v1`;
  }

  return "https://api.openai.com/v1";
}

function authHeaders(): Record<string, string> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) return {};

  const scheme = (process.env.OPENAI_AUTH_SCHEME ?? "Bearer").trim();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (scheme.toLowerCase() === "api-key") {
    headers["api-key"] = apiKey;
  } else {
    headers.Authorization = `${scheme} ${apiKey}`;
  }

  const org = process.env.OPENAI_ORGANIZATION?.trim();
  if (org) headers["OpenAI-Organization"] = org;

  const referer = process.env.OPENAI_HTTP_REFERER?.trim();
  if (referer) headers["HTTP-Referer"] = referer;

  const title = (process.env.OPENAI_APP_TITLE?.trim() || OPENAI_APP_TITLE_DEFAULT);
  if (title) headers["X-Title"] = title;

  return headers;
}

function withApiVersion(url: string): string {
  const version = process.env.OPENAI_API_VERSION?.trim();
  if (!version) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}api-version=${encodeURIComponent(version)}`;
}

async function trackOpenAiUsage(input: {
  feature: AiUsageFeature;
  model?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens?: number;
}): Promise<void> {
  if (typeof window !== "undefined") return;
  try {
    const { recordAiUsage } = await import("./ai-usage-store");
    await recordAiUsage(input);
  } catch (error) {
    logError("ai/usage", "Failed to record AI usage (non-fatal)", { feature: input.feature }, error);
  }
}

export function openAiEndpoint(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return withApiVersion(`${getOpenAiBaseUrl()}${normalized}`);
}

export async function openAiChatCompletion(
  body: OpenAiChatCompletionBody,
): Promise<Response | null> {
  if (!isOpenAiConfigured()) return null;
  try {
    return await fetch(openAiEndpoint("/chat/completions"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ model: getOpenAiModel(), ...body }),
    });
  } catch (error) {
    logOpenAiFailure("chat/completions request", { model: getOpenAiModel() }, error);
    return null;
  }
}

export async function parseOpenAiChatCompletion(
  response: Response,
  options?: OpenAiCallOptions,
): Promise<OpenAiChatCompletionResponse | null> {
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    logOpenAiFailure("chat/completions response", {
      status: response.status,
      feature: options?.feature,
      model: getOpenAiModel(),
      error: body.slice(0, 200) || response.statusText,
    });
    return null;
  }
  try {
    const data = (await response.json()) as OpenAiChatCompletionResponse;
    const usage = data.usage;
    if (options?.feature && usage) {
      void trackOpenAiUsage({
        feature: options.feature,
        model: getOpenAiModel(),
        promptTokens: usage.prompt_tokens ?? 0,
        completionTokens: usage.completion_tokens ?? 0,
        totalTokens: usage.total_tokens,
      });
    }
    return data;
  } catch (error) {
    logOpenAiFailure("parse chat completion JSON", { feature: options?.feature, model: getOpenAiModel() }, error);
    return null;
  }
}

export async function openAiChatCompletionText(
  body: OpenAiChatCompletionBody,
  options?: OpenAiCallOptions,
): Promise<string | null> {
  const response = await openAiChatCompletion(body);
  if (!response) return null;
  const data = await parseOpenAiChatCompletion(response, options);
  return data?.choices?.[0]?.message?.content?.trim() ?? null;
}

export async function openAiChatCompletionJson<T>(
  body: OpenAiChatCompletionBody,
  options?: OpenAiCallOptions,
): Promise<T | null> {
  const text = await openAiChatCompletionText(body, options);
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    logOpenAiFailure("parse chat completion text as JSON", { feature: options?.feature, model: getOpenAiModel(), preview: text.slice(0, 120) }, error);
    return null;
  }
}

export function getOpenAiProviderLabel(): string {
  if (isInfomaniakConfigured() || getOpenAiBaseUrl().includes("infomaniak.com")) return "Infomaniak AI";
  const base = getOpenAiBaseUrl();
  if (base.includes("openai.com")) return "OpenAI";
  if (base.includes("openrouter.ai")) return "OpenRouter";
  if (base.includes("groq.com")) return "Groq";
  if (base.includes("together.xyz")) return "Together";
  if (base.includes("azure.com")) return "Azure OpenAI";
  if (base.includes("localhost") || base.includes("127.0.0.1")) return "Local LLM";
  return "OpenAI-compatible";
}

export async function checkOpenAiHealth(): Promise<OpenAiHealthResult> {
  const apiKey = getOpenAiApiKey();
  const model = getOpenAiModel();
  const baseUrl = getOpenAiBaseUrl();
  const provider = getOpenAiProviderLabel();

  if (!apiKey) {
    return {
      configured: false,
      ok: false,
      model,
      baseUrl,
      message: "OPENAI_API_KEY not set — using template fallbacks",
    };
  }

  const started = Date.now();
  try {
    const res = await fetch(openAiEndpoint("/models"), { headers: authHeaders() });
    const latencyMs = Date.now() - started;

    if (res.ok) {
      return {
        configured: true,
        ok: true,
        model,
        baseUrl,
        latencyMs,
        message: `${provider} connected — model ${model}`,
      };
    }

    if (res.status === 401 || res.status === 403) {
      return {
        configured: true,
        ok: false,
        model,
        baseUrl,
        latencyMs,
        message: `${provider} API key rejected (${res.status})`,
      };
    }

    if (res.status === 404) {
      return {
        configured: true,
        ok: true,
        model,
        baseUrl,
        latencyMs,
        message: `${provider} configured at ${baseUrl} (no /models probe)`,
      };
    }

    return {
      configured: true,
      ok: false,
      model,
      baseUrl,
      latencyMs,
      message: `${provider} API error (${res.status})`,
    };
  } catch (error) {
    logOpenAiFailure("health probe", { model, baseUrl, provider }, error);
    return {
      configured: true,
      ok: false,
      model,
      baseUrl,
      latencyMs: Date.now() - started,
      message: `${provider} API unreachable at ${baseUrl}`,
    };
  }
}
