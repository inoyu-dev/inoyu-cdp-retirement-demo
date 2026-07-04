import { getCdpMode, type CdpMode } from "./cdp-mode";
import { checkOpenAiHealth, type OpenAiHealthResult } from "./openai-config";
import { checkUnomiHealth, type UnomiHealthResult } from "./unomi-config";

export type ShowcaseMode = "full-live" | "demo-live" | "fallback";

export interface IntegrationsHealthPayload {
  checkedAt: string;
  mode: "live" | "local-fallback";
  showcaseMode: ShowcaseMode;
  cdpMode: CdpMode;
  openai: OpenAiHealthResult;
  unomi: UnomiHealthResult;
}

export async function getIntegrationsHealth(): Promise<IntegrationsHealthPayload> {
  const [openai, unomi] = await Promise.all([checkOpenAiHealth(), checkUnomiHealth()]);
  const cdpMode = getCdpMode(unomi.configured, unomi.ok);
  const fullLive = openai.ok && unomi.ok;
  const demoLive = openai.ok && cdpMode === "unomi-mock";

  let showcaseMode: ShowcaseMode = "fallback";
  if (fullLive) showcaseMode = "full-live";
  else if (demoLive) showcaseMode = "demo-live";

  return {
    checkedAt: new Date().toISOString(),
    mode: fullLive || demoLive ? "live" : "local-fallback",
    showcaseMode,
    cdpMode,
    openai,
    unomi,
  };
}

export function isShowcaseLive(payload: IntegrationsHealthPayload): boolean {
  return payload.showcaseMode === "full-live" || payload.showcaseMode === "demo-live";
}
