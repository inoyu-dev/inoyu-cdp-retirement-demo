/**
 * MCP-style tool surface for Apache Unomi CDP queries.
 * The dashboard agent calls these directly; an external Unomi MCP connector
 * would expose the same tool names and payloads.
 */
import { computeQuizFunnelAggregate } from "./quiz-funnel";
import { listProfiles, getProfile } from "./local-store";
import { isUnomiConfigured, SCOPE } from "./unomi-client";
import { unomiAdminFetch } from "./unomi-config";
import type { VisitorProfile } from "./types";

export type UnomiMcpToolName =
  | "unomi_get_profile"
  | "unomi_search_events"
  | "unomi_search_profiles"
  | "unomi_aggregate"
  | "unomi_get_visitor_timeline";

export interface AgentChartSpec {
  type: "bar" | "line" | "pie";
  title: string;
  labels: string[];
  values: number[];
  source: "unomi" | "local";
}

export interface McpToolResult {
  ok: boolean;
  source: "unomi" | "local";
  data: unknown;
  chart?: AgentChartSpec;
  error?: string;
}

async function unomiFetch(path: string, init?: RequestInit): Promise<Response | null> {
  return unomiAdminFetch(path, init);
}

export async function unomiGetProfile(profileId: string): Promise<McpToolResult> {
  const local = await getProfile(profileId);
  const res = await unomiFetch(`/cxs/profiles/${encodeURIComponent(profileId)}`);
  if (res?.ok) {
    const remote = await res.json();
    return {
      ok: true,
      source: "unomi",
      data: { unomi: remote, local: local ?? undefined },
    };
  }
  if (local) {
    return { ok: true, source: "local", data: local };
  }
  return { ok: false, source: "local", data: null, error: "Profile not found" };
}

export async function unomiSearchEvents(
  profileId: string,
  limit = 25,
): Promise<McpToolResult> {
  const local = await getProfile(profileId);
  const body = {
    offset: 0,
    limit,
    sortby: "timeStamp:desc",
    condition: {
      type: "eventPropertyCondition",
      parameterValues: {
        propertyName: "profileId",
        comparisonOperator: "equals",
        propertyValue: profileId,
      },
    },
  };

  const res = await unomiFetch("/cxs/events/search", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (res?.ok) {
    const data = await res.json();
    return { ok: true, source: "unomi", data };
  }

  const events = local?.events ?? [];
  return {
    ok: true,
    source: "local",
    data: {
      list: events.slice(0, limit).map((e) => ({
        eventType: e.eventType,
        timestamp: e.timestamp,
        properties: e.properties,
      })),
      totalSize: events.length,
    },
  };
}

export async function unomiSearchProfiles(query: {
  text?: string;
  limit?: number;
  segment?: string;
}): Promise<McpToolResult> {
  const limit = query.limit ?? 20;
  const condition = query.segment
    ? {
        type: "profilePropertyCondition",
        parameterValues: {
          propertyName: "segments",
          comparisonOperator: "equals",
          propertyValue: query.segment,
        },
      }
    : { type: "matchAllCondition" };

  const res = await unomiFetch("/cxs/profiles/search", {
    method: "POST",
    body: JSON.stringify({
      text: query.text ?? "",
      offset: 0,
      limit,
      condition,
    }),
  });

  if (res?.ok) {
    return { ok: true, source: "unomi", data: await res.json() };
  }

  let profiles = await listProfiles();
  if (query.text) {
    const q = query.text.toLowerCase();
    profiles = profiles.filter(
      (p) =>
        p.profileId.toLowerCase().includes(q) ||
        p.quiz?.firstName?.toLowerCase().includes(q) ||
        p.trafficSource.toLowerCase().includes(q),
    );
  }
  if (query.segment) {
    profiles = profiles.filter((p) => p.segments.includes(query.segment!));
  }

  return {
    ok: true,
    source: "local",
    data: {
      list: profiles.slice(0, limit).map(summarizeProfile),
      totalSize: profiles.length,
    },
  };
}

function summarizeProfile(p: VisitorProfile) {
  return {
    profileId: p.profileId,
    firstName: p.quiz?.firstName,
    trafficSource: p.trafficSource,
    leadScore: p.leadScore,
    converted: p.converted,
    segments: p.segments,
    quizScore: p.quiz?.score,
    updatedAt: p.updatedAt,
  };
}

export async function unomiAggregate(params: {
  metric:
    | "traffic_source"
    | "lead_score_buckets"
    | "event_types"
    | "quiz_funnel"
    | "conversion_rate"
    | "segments";
  profileId?: string;
}): Promise<McpToolResult> {
  const profiles = await listProfiles();
  const funnel = computeQuizFunnelAggregate(profiles);

  let chart: AgentChartSpec;
  switch (params.metric) {
    case "traffic_source": {
      const counts: Record<string, number> = {};
      for (const p of profiles) {
        counts[p.trafficSource] = (counts[p.trafficSource] ?? 0) + 1;
      }
      chart = {
        type: "bar",
        title: "Visitors by traffic source",
        labels: Object.keys(counts),
        values: Object.values(counts),
        source: isUnomiConfigured() ? "unomi" : "local",
      };
      break;
    }
    case "lead_score_buckets": {
      const buckets = ["0-39", "40-59", "60-79", "80+"];
      const values = [0, 0, 0, 0];
      for (const p of profiles) {
        if (p.leadScore < 40) values[0] += 1;
        else if (p.leadScore < 60) values[1] += 1;
        else if (p.leadScore < 80) values[2] += 1;
        else values[3] += 1;
      }
      chart = {
        type: "bar",
        title: "Lead score distribution",
        labels: buckets,
        values,
        source: isUnomiConfigured() ? "unomi" : "local",
      };
      break;
    }
    case "event_types": {
      const profile = params.profileId ? await getProfile(params.profileId) : null;
      const counts: Record<string, number> = {};
      const events = profile?.events ?? profiles.flatMap((p) => p.events);
      for (const e of events) {
        counts[e.eventType] = (counts[e.eventType] ?? 0) + 1;
      }
      chart = {
        type: "bar",
        title: params.profileId ? "Event types for visitor" : "Event types (all visitors)",
        labels: Object.keys(counts),
        values: Object.values(counts),
        source: "local",
      };
      break;
    }
    case "quiz_funnel": {
      chart = {
        type: "bar",
        title: "Quiz funnel — visitors per step",
        labels: funnel.steps.map((s) => `Step ${s.step}`),
        values: funnel.steps.map((s) => s.entered),
        source: "local",
      };
      break;
    }
    case "conversion_rate": {
      const converted = profiles.filter((p) => p.converted).length;
      const notConverted = profiles.length - converted;
      chart = {
        type: "pie",
        title: "Conversion status",
        labels: ["Converted", "Not converted"],
        values: [converted, notConverted],
        source: "local",
      };
      break;
    }
    case "segments": {
      const counts: Record<string, number> = {};
      for (const p of profiles) {
        for (const s of p.segments) {
          counts[s] = (counts[s] ?? 0) + 1;
        }
      }
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
      chart = {
        type: "bar",
        title: "Top segments",
        labels: sorted.map(([k]) => k.replace(/_/g, " ")),
        values: sorted.map(([, v]) => v),
        source: "local",
      };
      break;
    }
    default:
      return { ok: false, source: "local", data: null, error: "Unknown metric" };
  }

  return {
    ok: true,
    source: chart.source,
    data: { metric: params.metric, funnel, profileCount: profiles.length },
    chart,
  };
}

export async function unomiGetVisitorTimeline(profileId: string): Promise<McpToolResult> {
  const profile = await getProfile(profileId);
  if (!profile) {
    return { ok: false, source: "local", data: null, error: "Profile not found" };
  }

  const eventsRes = await unomiSearchEvents(profileId, 40);
  const stepEngagement = profile.quizEngagement?.stepSummaries ?? [];

  const chart: AgentChartSpec = {
    type: "bar",
    title: "Time on quiz steps (seconds)",
    labels: stepEngagement.map((s) => `Step ${s.step}`),
    values: stepEngagement.map((s) => s.durationSeconds),
    source: eventsRes.source,
  };

  return {
    ok: true,
    source: eventsRes.source,
    data: {
      profile: summarizeProfile(profile),
      events: eventsRes.data,
      quizEngagement: profile.quizEngagement,
      quizFunnel: profile.quizFunnel,
    },
    chart: stepEngagement.length > 0 ? chart : undefined,
  };
}

export async function executeUnomiMcpTool(
  name: UnomiMcpToolName,
  args: Record<string, unknown>,
): Promise<McpToolResult> {
  switch (name) {
    case "unomi_get_profile":
      return unomiGetProfile(String(args.profileId ?? ""));
    case "unomi_search_events":
      return unomiSearchEvents(String(args.profileId ?? ""), Number(args.limit ?? 25));
    case "unomi_search_profiles":
      return unomiSearchProfiles({
        text: typeof args.text === "string" ? args.text : undefined,
        limit: Number(args.limit ?? 20),
        segment: typeof args.segment === "string" ? args.segment : undefined,
      });
    case "unomi_aggregate":
      return unomiAggregate({
        metric: args.metric as Parameters<typeof unomiAggregate>[0]["metric"],
        profileId: typeof args.profileId === "string" ? args.profileId : undefined,
      });
    case "unomi_get_visitor_timeline":
      return unomiGetVisitorTimeline(String(args.profileId ?? ""));
    default: {
      const _exhaustive: never = name;
      return { ok: false, source: "local", data: null, error: `Unknown tool: ${_exhaustive}` };
    }
  }
}

export const UNOMI_MCP_TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "unomi_get_profile",
      description: "Fetch a visitor profile from Apache Unomi (falls back to local CDP store).",
      parameters: {
        type: "object",
        properties: { profileId: { type: "string" } },
        required: ["profileId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "unomi_search_events",
      description: "Search Unomi events for a profile via /cxs/events/search.",
      parameters: {
        type: "object",
        properties: {
          profileId: { type: "string" },
          limit: { type: "number" },
        },
        required: ["profileId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "unomi_search_profiles",
      description: "Search profiles in Unomi or local store by text or segment.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string" },
          segment: { type: "string" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "unomi_aggregate",
      description:
        "Run a real-time aggregation for charts: traffic_source, lead_score_buckets, event_types, quiz_funnel, conversion_rate, segments.",
      parameters: {
        type: "object",
        properties: {
          metric: {
            type: "string",
            enum: [
              "traffic_source",
              "lead_score_buckets",
              "event_types",
              "quiz_funnel",
              "conversion_rate",
              "segments",
            ],
          },
          profileId: { type: "string", description: "Optional — scope event_types to one visitor" },
        },
        required: ["metric"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "unomi_get_visitor_timeline",
      description: "Full visitor timeline: profile summary, events, quiz engagement, step time chart.",
      parameters: {
        type: "object",
        properties: { profileId: { type: "string" } },
        required: ["profileId"],
      },
    },
  },
];
