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
          <CardTitle className="text-lg">The five steps</CardTitle>
        </div>
        <CardDescription>
          Two-tab walkthrough for contest reviewers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4">
          {DEMO_FLOW_STEPS.map((step) => (
            <li key={step.id} className="flex gap-3">
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
