import { logWarn } from "./logger";
import {
  executeUnomiMcpTool,
  type AgentChartSpec,
  type UnomiMcpToolName,
  UNOMI_MCP_TOOL_DEFINITIONS,
} from "./unomi-mcp-tools";
import {
  isOpenAiConfigured,
  openAiChatCompletion,
  parseOpenAiChatCompletion,
  type OpenAiChatMessage,
} from "./openai-config";
import { isUnomiConfigured } from "./unomi-client";
import type { VisitorProfile } from "./types";

export interface DashboardAgentMessage {
  role: "user" | "assistant";
  content: string;
}

export interface DashboardAgentResponse {
  reply: string;
  charts: AgentChartSpec[];
  toolsUsed: string[];
  dataSource: "unomi" | "local" | "mixed";
}

const SYSTEM_PROMPT = `You are a marketing intelligence agent for a retirement quiz CDP powered by Apache Unomi.

You have MCP tools to query visitor profiles, search events, and run aggregations for charts.

Rules:
- Always use tools to answer data questions — do not invent metrics
- When a profileId is provided in context, prefer visitor-specific tools first
- Suggest follow-up actions for the media buyer (handoff, retargeting, channel choice)
- Keep replies concise (2-5 sentences) plus bullet insights when helpful
- When aggregation tools return chart data, mention what the chart shows

Available metrics for unomi_aggregate: traffic_source, lead_score_buckets, event_types, quiz_funnel, conversion_rate, segments`;

function pickTemplateReply(
  message: string,
  profile: VisitorProfile | null,
  charts: AgentChartSpec[],
): string {
  const lower = message.toLowerCase();
  const name = profile?.quiz?.firstName ?? "this visitor";

  if (lower.includes("funnel") || lower.includes("drop")) {
    return "Here is the live quiz funnel from CDP data. Steps with fewer completions are friction points — compare with engagement metrics on the selected profile.";
  }
  if (lower.includes("segment")) {
    return "Segment counts show which audiences are accumulating. Cross-check with traffic source to see if Meta or Taboola drives higher-intent segments.";
  }
  if (lower.includes("event") || lower.includes("timeline")) {
    return `Pulled the event timeline for ${name}. Look for contentEngagement and quizStepEngagement before quizCompleted to gauge intent.`;
  }
  if (charts.length > 0) {
    return `Query complete — ${charts.length} chart(s) rendered from ${isUnomiConfigured() ? "Apache Unomi" : "Unomi-compatible mock CDP"} data.`;
  }
  if (profile) {
    return `${name} · lead score ${profile.leadScore} · ${profile.trafficSource} traffic · ${profile.converted ? "converted" : "not converted yet"}. Ask about events, funnel, or segments for deeper Unomi queries.`;
  }
  return "Ask me about a visitor timeline, funnel drop-offs, segments, or lead score distribution. I query the CDP layer (Apache Unomi when connected, otherwise the Unomi-compatible mock store) in real time.";
}

async function runTool(
  name: string,
  args: Record<string, unknown>,
  charts: AgentChartSpec[],
  toolsUsed: string[],
  sources: Set<"unomi" | "local">,
): Promise<string> {
  toolsUsed.push(name);
  const result = await executeUnomiMcpTool(name as UnomiMcpToolName, args);
  sources.add(result.source);
  if (result.chart) charts.push(result.chart);
  return JSON.stringify({ ok: result.ok, source: result.source, data: result.data, error: result.error });
}

export async function runDashboardUnomiAgent(input: {
  message: string;
  profileId?: string;
  selectedProfile?: VisitorProfile | null;
  history?: DashboardAgentMessage[];
}): Promise<DashboardAgentResponse> {
  const charts: AgentChartSpec[] = [];
  const toolsUsed: string[] = [];
  const sources = new Set<"unomi" | "local">();


  const contextBlock = input.selectedProfile
    ? `Selected visitor context:\n${JSON.stringify(
        {
          profileId: input.selectedProfile.profileId,
          firstName: input.selectedProfile.quiz?.firstName,
          leadScore: input.selectedProfile.leadScore,
          segments: input.selectedProfile.segments,
          trafficSource: input.selectedProfile.trafficSource,
          converted: input.selectedProfile.converted,
        },
        null,
        2,
      )}`
    : input.profileId
      ? `Active profileId: ${input.profileId}`
      : "No profile selected — answer at cohort level.";

  if (!isOpenAiConfigured()) {
    const lower = input.message.toLowerCase();
    if (lower.includes("timeline") && input.profileId) {
      await runTool("unomi_get_visitor_timeline", { profileId: input.profileId }, charts, toolsUsed, sources);
    } else if (lower.includes("event") && input.profileId) {
      await runTool("unomi_search_events", { profileId: input.profileId }, charts, toolsUsed, sources);
    } else if (lower.includes("funnel")) {
      await runTool("unomi_aggregate", { metric: "quiz_funnel" }, charts, toolsUsed, sources);
    } else if (lower.includes("segment")) {
      await runTool("unomi_aggregate", { metric: "segments" }, charts, toolsUsed, sources);
    } else if (lower.includes("source") || lower.includes("traffic")) {
      await runTool("unomi_aggregate", { metric: "traffic_source" }, charts, toolsUsed, sources);
    } else if (lower.includes("lead") || lower.includes("score")) {
      await runTool("unomi_aggregate", { metric: "lead_score_buckets" }, charts, toolsUsed, sources);
    } else if (input.profileId) {
      await runTool("unomi_get_profile", { profileId: input.profileId }, charts, toolsUsed, sources);
    }

    return {
      reply: pickTemplateReply(input.message, input.selectedProfile ?? null, charts),
      charts,
      toolsUsed,
      dataSource: sources.size > 1 ? "mixed" : sources.has("unomi") ? "unomi" : "local",
    };
  }

  const messages: OpenAiChatMessage[] = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\n${contextBlock}\nUnomi configured: ${isUnomiConfigured()}` },
    ...(input.history ?? []).slice(-6).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: input.message },
  ];

  for (let round = 0; round < 4; round += 1) {
    const response = await openAiChatCompletion({
      messages,
      tools: UNOMI_MCP_TOOL_DEFINITIONS,
      tool_choice: "auto",
      temperature: 0.4,
    });

    if (!response) break;

    const data = await parseOpenAiChatCompletion(response, { feature: "dashboard-agent" });
    if (!data) break;
    const choice = data.choices?.[0];
    const assistantMsg = choice?.message;
    if (!assistantMsg) break;

    messages.push(assistantMsg);

    if (assistantMsg.tool_calls?.length) {
      for (const call of assistantMsg.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments) as Record<string, unknown>;
        } catch (error) {
          logWarn("dashboard-agent", "Failed to parse tool call arguments", {
            tool: call.function.name,
            raw: call.function.arguments?.slice(0, 200),
          }, error);
          args = {};
        }
        if (!args.profileId && input.profileId) {
          args.profileId = input.profileId;
        }
        const toolResult = await runTool(call.function.name, args, charts, toolsUsed, sources);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          name: call.function.name,
          content: toolResult,
        });
      }
      continue;
    }

    const reply = assistantMsg.content?.trim();
    if (reply) {
      return {
        reply,
        charts,
        toolsUsed,
        dataSource: sources.size > 1 ? "mixed" : sources.has("unomi") ? "unomi" : "local",
      };
    }
    break;
  }

  return {
    reply: pickTemplateReply(input.message, input.selectedProfile ?? null, charts),
    charts,
    toolsUsed,
    dataSource: sources.size > 1 ? "mixed" : sources.has("unomi") ? "unomi" : "local",
  };
}
