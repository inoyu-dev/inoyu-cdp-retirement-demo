"use client";

import {
  CheckCircle2,
  ClipboardList,
  Eye,
  MessageCircle,
  MousePointerClick,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDashboardTime } from "@/lib/dashboard-utils";
import { describeEventForMarketer } from "@/lib/event-narration";
import { getEventTimelineMeta } from "@/lib/profile-display";
import type { UnomiEvent, VisitorProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

function EventIcon({ eventType }: { eventType: string }) {
  const meta = getEventTimelineMeta(eventType);
  const className = cn("size-4", meta.accent);

  if (meta.category === "conversion") return <CheckCircle2 className={className} aria-hidden />;
  if (meta.category === "chat") return <MessageCircle className={className} aria-hidden />;
  if (meta.category === "sms") return <MessageCircle className={className} aria-hidden />;
  if (meta.category === "content") return <MousePointerClick className={className} aria-hidden />;
  if (meta.category === "quiz") return <TrendingUp className={className} aria-hidden />;
  if (meta.category === "visit") return <Eye className={className} aria-hidden />;
  return <Sparkles className={className} aria-hidden />;
}

function TimelineItem({ event, isLast }: { event: UnomiEvent; isLast: boolean }) {
  const story = describeEventForMarketer(event);
  const meta = getEventTimelineMeta(event.eventType);

  return (
    <li className="relative flex gap-3 pb-6 last:pb-0 sm:gap-4 sm:pb-8">
      {!isLast ? (
        <span
          className="absolute left-[1.125rem] top-10 bottom-0 w-px bg-gradient-to-b from-primary/40 via-border to-transparent"
          aria-hidden
        />
      ) : null}

      <div
        className={cn(
          "relative z-[1] flex size-9 shrink-0 items-center justify-center rounded-full border shadow-sm",
          meta.bg,
          meta.border,
        )}
      >
        <EventIcon eventType={event.eventType} />
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        <div
          className={cn(
            "rounded-xl border bg-card/60 p-4 shadow-sm transition-colors hover:bg-card",
            meta.border,
          )}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="font-medium leading-snug">{story.headline}</p>
            <time dateTime={event.timestamp} className="text-xs tabular-nums text-muted-foreground">
              {formatDashboardTime(event.timestamp)}
            </time>
          </div>
          {story.detail ? (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{story.detail}</p>
          ) : null}
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80">
            {event.eventType}
          </p>
        </div>
      </div>
    </li>
  );
}

type Props = { profile: VisitorProfile };

export default function ProfileJourneyTimeline({ profile }: Props) {
  const events = [...profile.events].reverse();

  return (
    <Card className="overflow-hidden border-border/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="size-5 text-primary" aria-hidden />
          Visitor journey
        </CardTitle>
        <CardDescription>
          Plain-language timeline with visual event categories — newest first.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        <ScrollArea className="h-[min(420px,50vh)] px-3 sm:px-6">
          {events.length === 0 ? (
            <p className="pb-6 text-sm text-muted-foreground">No events recorded yet.</p>
          ) : (
            <ol className="py-2">
              {events.map((event, index) => (
                <TimelineItem key={event.id} event={event} isLast={index === events.length - 1} />
              ))}
            </ol>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
