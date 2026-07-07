import { NextResponse } from "next/server";
import { logApiError } from "./logger";

export function apiErrorResponse(
  route: string,
  publicMessage: string,
  error: unknown,
  context?: Record<string, unknown>,
  status = 500,
): NextResponse {
  logApiError(route, error, context);
  return NextResponse.json({ error: publicMessage }, { status });
}
