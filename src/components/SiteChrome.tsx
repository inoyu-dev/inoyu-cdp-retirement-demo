"use client";

import Link from "next/link";
import { BarChart3, ListOrdered, ShieldCheck } from "lucide-react";
import DemoSessionBar from "@/components/DemoSessionBar";
import LanguageSelector from "@/components/LanguageSelector";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5 no-underline hover:no-underline">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-heading text-base font-semibold tracking-tight text-foreground">
              Your Retirement Guide
            </span>
            <span className="text-xs text-muted-foreground">Free readiness score</span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1 sm:gap-2" aria-label="Main navigation">
          <LanguageSelector variant="header" />
          <DemoSessionBar />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            nativeButton={false}
            render={<Link href="/dashboard" />}
          >
            <BarChart3 className="size-4" aria-hidden />
            Marketing dashboard
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            nativeButton={false}
            render={<Link href="/demo" />}
          >
            <ListOrdered className="size-4" aria-hidden />
            How it works
          </Button>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-8 text-center sm:px-6">
        <p className="text-sm text-muted-foreground">
          Free educational guide. Not personalized financial advice.
        </p>
        <p className="mt-1 text-xs text-muted-foreground/80">
          Text STOP anytime to opt out of messages.
        </p>
        <p className="mt-4 text-xs text-muted-foreground/90">
          Built by{" "}
          <a
            href="https://inoyu.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
          >
            Inoyu.dev
          </a>
          , powered by{" "}
          <a
            href="https://unomi.apache.org"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
          >
            Apache Unomi
          </a>
        </p>
      </div>
    </footer>
  );
}
