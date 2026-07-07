"use client";

import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CONTACT_CHANNEL_LABELS } from "@/lib/contact-channels";
import { getVisitorDisplayName } from "@/lib/profile-display";
import type { ContactChannel, VisitorProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  profiles: VisitorProfile[];
  selectedId: string | null;
  onSelect: (profileId: string) => void;
  scrollClassName?: string;
};

export default function ProfileListSidebar({
  profiles,
  selectedId,
  onSelect,
  scrollClassName = "h-[min(520px,60vh)]",
}: Props & { scrollClassName?: string }) {
  return (
    <Card className="border-border/60 bg-card/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4 text-muted-foreground" aria-hidden />
          Profiles
        </CardTitle>
        <CardDescription>
          {profiles.length === 0
            ? "No visitors yet"
            : `${profiles.length} active session${profiles.length === 1 ? "" : "s"}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {profiles.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">
            No visitors yet — share the quiz landing page.
          </p>
        ) : (
          <ScrollArea className={scrollClassName}>
            <ul className="space-y-1 p-2 pt-0">
              {profiles.map((p) => {
                const active = selectedId === p.profileId;
                return (
                  <li key={p.profileId}>
                    <button
                      type="button"
                      onClick={() => onSelect(p.profileId)}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                        active
                          ? "border-primary/50 bg-primary/10"
                          : "border-transparent hover:bg-muted/60",
                      )}
                    >
                      <span className="block font-medium">
                        {getVisitorDisplayName(p)}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span>
                          {p.trafficSource} · score {p.leadScore || "—"}
                        </span>
                        {p.quizChat?.humanRequested ? (
                          <Badge
                            variant="outline"
                            className="h-5 border-amber-500/40 px-1.5 text-[10px] font-normal text-amber-700 dark:text-amber-300"
                          >
                            Human chat
                          </Badge>
                        ) : null}
                        {p.quiz?.contactChannel ? (
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
                            {CONTACT_CHANNEL_LABELS[p.quiz.contactChannel as ContactChannel]}
                          </Badge>
                        ) : p.quiz?.smsConsent ? (
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
                            SMS
                          </Badge>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
