"use client";

import { Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AiContentSource = "template" | "ai";

type Props = {
  aiAvailable: boolean;
  source: AiContentSource | null;
  generating: boolean;
  onGenerate: () => void;
  label?: string;
  className?: string;
};

export default function AiGenerateButton({
  aiAvailable,
  source,
  generating,
  onGenerate,
  label = "Generate with AI",
  className,
}: Props) {
  if (!aiAvailable) {
    return (
      <Badge variant="outline" className={cn("text-muted-foreground", className)}>
        Template preview (AI not configured)
      </Badge>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {source === "ai" ? (
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
          AI generated
        </Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">
          Template preview
        </Badge>
      )}
      <Button
        type="button"
        size="sm"
        variant={source === "ai" ? "outline" : "default"}
        className="gap-1.5"
        disabled={generating}
        onClick={onGenerate}
      >
        {generating ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Sparkles className="size-3.5" aria-hidden />
        )}
        {generating ? "Generating…" : source === "ai" ? "Regenerate with AI" : label}
      </Button>
    </div>
  );
}
