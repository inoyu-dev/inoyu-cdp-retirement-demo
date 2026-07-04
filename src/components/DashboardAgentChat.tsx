"use client";

import { useRef, useState } from "react";
import { Bot, Database, Loader2, Send } from "lucide-react";
import AgentChart from "@/components/AgentChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DashboardAgentResponse } from "@/lib/dashboard-unomi-agent";
import type { AgentChartSpec } from "@/lib/unomi-mcp-tools";
import { cn } from "@/lib/utils";

type ChatEntry = {
  id: string;
  role: "user" | "assistant";
  content: string;
  charts?: AgentChartSpec[];
  toolsUsed?: string[];
  dataSource?: DashboardAgentResponse["dataSource"];
};

type Props = {
  profileId: string | null;
  profileName?: string;
};

const STARTERS = [
  "Show this visitor's event timeline",
  "Graph quiz funnel drop-offs",
  "Lead score distribution across visitors",
  "Which segments are most common?",
];

export default function DashboardAgentChat({ profileId, profileName }: Props) {
  const [entries, setEntries] = useState<ChatEntry[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "I query the CDP layer via MCP-style tools (Apache Unomi when connected, otherwise the Unomi-compatible mock store). Select a profile and ask for timelines, funnel charts, or segment breakdowns.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || sending) return;

    setSending(true);
    setDraft("");

    const userEntry: ChatEntry = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };
    setEntries((prev) => [...prev, userEntry]);

    try {
      const history = [...entries, userEntry]
        .filter((e) => e.id !== "welcome")
        .slice(-8)
        .map((e) => ({ role: e.role, content: e.content }));

      const res = await fetch("/api/dashboard-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, profileId: profileId ?? undefined, history }),
      });

      if (!res.ok) {
        setEntries((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Sorry — the agent could not complete that query. Try again.",
          },
        ]);
        return;
      }

      const data = (await res.json()) as DashboardAgentResponse;
      setEntries((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply,
          charts: data.charts,
          toolsUsed: data.toolsUsed,
          dataSource: data.dataSource,
        },
      ]);
    } finally {
      setSending(false);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      });
    }
  };

  return (
    <Card className="border-primary/20 bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="size-5 text-primary" aria-hidden />
          CDP chat agent
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          <Database className="size-3.5" aria-hidden />
          Unomi MCP tools · profiles, events, aggregations
          {profileName ? (
            <Badge variant="outline" className="h-5 text-[10px] font-normal">
              Focus: {profileName}
            </Badge>
          ) : (
            <Badge variant="outline" className="h-5 text-[10px] font-normal">
              Cohort mode
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScrollArea className="h-64 rounded-lg border border-border/60 bg-muted/20">
          <div ref={scrollRef} className="space-y-3 p-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  "max-w-[95%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                  entry.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-background text-foreground shadow-sm ring-1 ring-border/50",
                )}
              >
                <p>{entry.content}</p>
                {entry.toolsUsed && entry.toolsUsed.length > 0 ? (
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Tools: {entry.toolsUsed.join(", ")}
                    {entry.dataSource ? ` · ${entry.dataSource} data` : ""}
                  </p>
                ) : null}
                {entry.charts?.map((chart) => (
                  <div key={`${entry.id}-${chart.title}`} className="mt-3">
                    <AgentChart chart={chart} />
                  </div>
                ))}
              </div>
            ))}
            {sending ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Querying Unomi…
              </p>
            ) : null}
          </div>
        </ScrollArea>

        <div className="flex flex-wrap gap-2">
          {STARTERS.map((starter) => (
            <Button
              key={starter}
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={sending || (starter.includes("visitor") && !profileId)}
              onClick={() => void send(starter)}
            >
              {starter}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void send(draft);
            }}
            placeholder="Ask about this visitor or the cohort…"
            disabled={sending}
            className="h-11 flex-1"
            aria-label="Message to CDP agent"
          />
          <Button
            type="button"
            className="h-11 px-4"
            disabled={sending || !draft.trim()}
            onClick={() => void send(draft)}
          >
            {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
