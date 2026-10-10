"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { SitePopupManager } from "@/components/popups/site-popup-manager";
import { SessionWatchdog } from "@/components/auth/session-watchdog";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={60} refetchOnWindowFocus>
      <SessionWatchdog />
      {children}
      <SitePopupManager />
      <Toaster richColors position="top-right" />
    </SessionProvider>
  );
}
