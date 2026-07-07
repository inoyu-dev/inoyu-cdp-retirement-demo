"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, ListOrdered, Menu, ShieldCheck, X } from "lucide-react";
import DemoSessionBar from "@/components/DemoSessionBar";
import LanguageSelector from "@/components/LanguageSelector";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function SiteNavLinks({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1 md:flex-row md:items-center md:gap-2", className)}>
      <LanguageSelector variant="header" />
      <DemoSessionBar />
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-1.5 md:w-auto"
        nativeButton={false}
        render={<Link href="/dashboard" onClick={onNavigate} />}
      >
        <BarChart3 className="size-4" aria-hidden />
        Marketing dashboard
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-1.5 text-muted-foreground md:w-auto"
        nativeButton={false}
        render={<Link href="/demo" onClick={onNavigate} />}
      >
        <ListOrdered className="size-4" aria-hidden />
        How it works
      </Button>
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="group flex min-w-0 items-center gap-2.5 no-underline hover:no-underline">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-heading text-sm font-semibold tracking-tight text-foreground sm:text-base">
              Your Retirement Guide
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">Inoyu CDP demo</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex" aria-label="Main navigation">
          <SiteNavLinks />
        </nav>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 md:hidden"
          aria-expanded={menuOpen}
          aria-controls="site-mobile-nav"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </Button>
      </div>

      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/20 md:hidden"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <nav
            id="site-mobile-nav"
            className="absolute inset-x-0 top-full z-50 border-b border-border/60 bg-background/95 px-4 py-4 shadow-lg backdrop-blur-xl md:hidden"
            aria-label="Main navigation"
          >
            <SiteNavLinks onNavigate={() => setMenuOpen(false)} />
          </nav>
        </>
      ) : null}
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
