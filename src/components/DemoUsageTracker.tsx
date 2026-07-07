"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { DEMO_BROWSER_SESSION_KEY } from "@/lib/app-identity";

const FLUSH_INTERVAL_MS = 10_000;
const SESSION_KEY = DEMO_BROWSER_SESSION_KEY;

function getBrowserSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

async function sendTelemetry(
  eventType: string,
  properties: Record<string, unknown>,
  useBeacon = false,
): Promise<void> {
  const payload = JSON.stringify({ eventType, properties });
  if (useBeacon && navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/demo-telemetry",
      new Blob([payload], { type: "application/json" }),
    );
    return;
  }
  await fetch("/api/demo-telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  });
}

function scrollDepthPct(): number {
  const doc = document.documentElement;
  const scrollTop = window.scrollY || doc.scrollTop;
  const viewport = window.innerHeight;
  const height = Math.max(doc.scrollHeight, 1);
  return Math.min(100, Math.round(((scrollTop + viewport) / height) * 100));
}

export default function DemoUsageTracker() {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  const moveCount = useRef(0);
  const clickCount = useRef(0);
  const maxScroll = useRef(0);
  const pageEnteredAt = useRef(Date.now());
  const sessionStarted = useRef(false);
  const browserSessionId = useRef("");

  useEffect(() => {
    browserSessionId.current = getBrowserSessionId();
    if (!sessionStarted.current) {
      sessionStarted.current = true;
      void sendTelemetry("demoSessionStart", {
        browserSessionId: browserSessionId.current,
        path: pathname,
        userAgent: navigator.userAgent,
        viewport: { width: window.innerWidth, height: window.innerHeight },
      });
    }
  }, [pathname]);

  useEffect(() => {
    pageEnteredAt.current = Date.now();
    moveCount.current = 0;
    clickCount.current = 0;
    maxScroll.current = scrollDepthPct();

    void sendTelemetry("demoPageView", {
      path: pathname,
      referrer: document.referrer || null,
      browserSessionId: browserSessionId.current,
    });

    const onMove = () => {
      moveCount.current += 1;
    };
    const onClick = () => {
      clickCount.current += 1;
    };
    const onScroll = () => {
      maxScroll.current = Math.max(maxScroll.current, scrollDepthPct());
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("click", onClick, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    const flush = () => {
      if (moveCount.current === 0 && clickCount.current === 0) return;
      void sendTelemetry("demoMouseActivity", {
        path: pathname,
        browserSessionId: browserSessionId.current,
        moveCount: moveCount.current,
        clickCount: clickCount.current,
        scrollDepthPct: maxScroll.current,
        viewport: { width: window.innerWidth, height: window.innerHeight },
      });
      moveCount.current = 0;
      clickCount.current = 0;
    };

    const interval = window.setInterval(() => {
      flush();
      const seconds = Math.round((Date.now() - pageEnteredAt.current) / 1000);
      if (seconds > 0) {
        void sendTelemetry("demoSessionHeartbeat", {
          path: pathname,
          browserSessionId: browserSessionId.current,
          activeSeconds: seconds,
        });
      }
    }, FLUSH_INTERVAL_MS);

    const onHide = () => {
      if (document.visibilityState !== "hidden") return;
      flush();
      const seconds = Math.round((Date.now() - pageEnteredAt.current) / 1000);
      void sendTelemetry("demoPageDwell", {
        path: pathname,
        browserSessionId: browserSessionId.current,
        seconds,
        scrollDepthPct: maxScroll.current,
      });
    };

    const onUnload = () => {
      flush();
      const seconds = Math.round((Date.now() - pageEnteredAt.current) / 1000);
      sendTelemetry(
        "demoPageDwell",
        {
          path: pathname,
          browserSessionId: browserSessionId.current,
          seconds,
          scrollDepthPct: maxScroll.current,
        },
        true,
      );
    };

    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onUnload);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onUnload);
      flush();
      const seconds = Math.round((Date.now() - pageEnteredAt.current) / 1000);
      if (seconds > 0) {
        void sendTelemetry("demoPageDwell", {
          path: pathname,
          browserSessionId: browserSessionId.current,
          seconds,
          scrollDepthPct: maxScroll.current,
        });
      }
    };
  }, [pathname]);

  return null;
}
