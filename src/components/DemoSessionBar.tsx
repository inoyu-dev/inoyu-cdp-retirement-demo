"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DemoSessionBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (pathname === "/login") {
      setUsername(null);
      return;
    }
    void (async () => {
      const res = await fetch("/api/demo-auth/session");
      if (!res.ok) {
        setUsername(null);
        return;
      }
      const data = (await res.json()) as { username?: string };
      setUsername(data.username ?? null);
    })();
  }, [pathname]);

  if (!username || pathname === "/login") return null;

  const logout = async () => {
    await fetch("/api/demo-auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="mr-1 flex items-center gap-2">
      <span className="hidden text-xs text-muted-foreground sm:inline">Signed in as {username}</span>
      <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => void logout()}>
        <LogOut className="size-4" aria-hidden />
        Sign out
      </Button>
    </div>
  );
}
