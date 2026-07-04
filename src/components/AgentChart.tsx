"use client";

import type { AgentChartSpec } from "@/lib/unomi-mcp-tools";
import RechartsAgentChart from "@/components/charts/RechartsAgentChart";

type Props = {
  chart: AgentChartSpec;
};

export default function AgentChart({ chart }: Props) {
  return <RechartsAgentChart chart={chart} />;
}
