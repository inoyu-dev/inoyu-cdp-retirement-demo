import { resolveUnomiScope } from "./app-identity";

/**
 * Structured server-side logging for Vercel/serverless debugging.
 * Errors and warnings always emit; debug logs require LOG_LEVEL=debug or UNOMI_DEBUG=true.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

function truncate(value: unknown, max = 240): unknown {
  if (typeof value !== "string") return value;
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

export function sanitizeLogContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;
  const out: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (value === undefined) continue;
    const lower = key.toLowerCase();
    if (
      lower.includes("password") ||
      lower.includes("token") ||
      lower.includes("secret") ||
      lower.includes("authorization")
    ) {
      out[key] = "[redacted]";
      continue;
    }
    out[key] = typeof value === "string" ? truncate(value) : value;
  }
  return out;
}

export function isDebugLogging(): boolean {
  return process.env.LOG_LEVEL === "debug" || process.env.UNOMI_DEBUG === "true";
}

function emit(
  level: LogLevel,
  scope: string,
  message: string,
  context?: LogContext,
  error?: unknown,
): void {
  const payload: LogContext = {
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    ...sanitizeLogContext(context),
  };
  if (error !== undefined) {
    payload.error = serializeError(error);
  }

  const prefix = `[${scope}] ${message}`;
  switch (level) {
    case "error":
      console.error(prefix, payload);
      break;
    case "warn":
      console.warn(prefix, payload);
      break;
    case "info":
    case "debug":
      console.log(prefix, payload);
      break;
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

export function logDebug(scope: string, message: string, context?: LogContext): void {
  if (!isDebugLogging()) return;
  emit("debug", scope, message, context);
}

export function logInfo(scope: string, message: string, context?: LogContext): void {
  emit("info", scope, message, context);
}

export function logWarn(scope: string, message: string, context?: LogContext, error?: unknown): void {
  emit("warn", scope, message, context, error);
}

export function logError(scope: string, message: string, context?: LogContext, error?: unknown): void {
  emit("error", scope, message, context, error);
}

export function logApiError(route: string, error: unknown, context?: LogContext): void {
  logError(`api/${route}`, "Request handler failed", context, error);
}

export function logId(value: string | null | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const id = value.trim();
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

export function logUnomiFailure(
  operation: string,
  context: LogContext & { status?: number; error?: string },
): void {
  logWarn("unomi", `${operation} failed`, {
    scope: resolveUnomiScope(),
    baseUrl: process.env.UNOMI_BASE_URL?.replace(/\/+$/, ""),
    ...context,
  });
}

export function logOpenAiFailure(
  operation: string,
  context: LogContext & { status?: number; feature?: string; model?: string },
  error?: unknown,
): void {
  logWarn("openai", `${operation} failed`, context, error);
}
