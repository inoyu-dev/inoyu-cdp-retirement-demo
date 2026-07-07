import { ListOrdered } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_FLOW_STEPS } from "@/lib/quiz-flow";

export default function DemoFlowGuide() {
  return (
    <Card className="border-border/70 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ListOrdered className="size-5 text-primary" aria-hidden />
          <CardTitle className="text-lg">The six steps</CardTitle>
        </div>
        <CardDescription>
          End-to-end walkthrough — works on desktop (two tabs) or mobile (menu navigation).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3 sm:space-y-4">
          {DEMO_FLOW_STEPS.map((step) => (
            <li key={step.id} className="flex gap-3 rounded-xl border border-border/50 bg-muted/15 p-3 sm:border-transparent sm:bg-transparent sm:p-0">
              <Badge variant="outline" className="mt-0.5 size-7 shrink-0 justify-center rounded-full p-0">
                {step.id}
              </Badge>
              <div>
                <p className="font-medium leading-snug">{step.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
