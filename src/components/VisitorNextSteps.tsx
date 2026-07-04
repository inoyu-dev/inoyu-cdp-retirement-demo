import { ListChecks, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  steps: string[];
  loading?: boolean;
  title?: string;
  description?: string;
  compact?: boolean;
  loadingLabel?: string;
};

export default function VisitorNextSteps({
  steps,
  loading = false,
  title = "Your suggested next steps",
  description = "Personalized based on your quiz answers — simple actions you can take this week.",
  compact = false,
  loadingLabel = "{loadingLabel}",
}: Props) {
  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {loadingLabel}
      </p>
    );
  }

  if (steps.length === 0) return null;

  if (compact) {
    return (
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
        <p className="text-base font-medium">{title}</p>
        <ol className="mt-3 space-y-2">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
              <span className="font-semibold tabular-nums text-foreground">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ListChecks className="size-5 text-primary" aria-hidden />
          {title}
        </CardTitle>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-base leading-relaxed">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
