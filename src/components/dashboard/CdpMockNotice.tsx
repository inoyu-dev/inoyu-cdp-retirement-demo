"use client";

import Link from "next/link";
import { Database } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CDP_MOCK_HEADLINE, CDP_MOCK_SUMMARY } from "@/lib/cdp-mode";
import { useIntegrationsHealth } from "@/hooks/useIntegrationsHealth";

export default function CdpMockNotice() {
  const { health, loading } = useIntegrationsHealth();

  if (loading || !health || health.cdpMode !== "unomi-mock") return null;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="size-4 text-amber-600" aria-hidden />
          {CDP_MOCK_HEADLINE}
        </CardTitle>
        <CardDescription>{CDP_MOCK_SUMMARY}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        <p>
          Quiz events still flow through the same server routes that mirror production Unomi ingestion. You can
          verify the full visitor → profile → AI brief loop; only the remote CDP host is simulated.
        </p>
        <p className="mt-2">
          <Link href="/demo#unomi" className="font-medium text-foreground underline-offset-4 hover:underline">
            Read more on /demo
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
