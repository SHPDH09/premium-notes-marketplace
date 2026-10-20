"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect } from "react";
import { toast } from "sonner";

/** Signs out when this account logs in on another device. */
export function SessionWatchdog() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    let cancelled = false;

    async function check() {
      const res = await fetch("/api/auth/session-check", { credentials: "include", cache: "no-store" });
      if (cancelled) return;
      if (res.status === 401) {
        const data = (await res.json().catch(() => ({}))) as { code?: string };
        if (data.code === "SESSION_SUPERSEDED") {
          toast.error("You signed in on another device. This session was closed.");
        }
        await signOut({ callbackUrl: "/login" });
      }
    }

    void check();
    const id = window.setInterval(() => void check(), 20_000);
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [session?.user?.id, status]);

  return null;
}
