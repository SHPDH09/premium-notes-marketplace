"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { SitePopupManager } from "@/components/popups/site-popup-manager";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <SitePopupManager />
      <Toaster richColors position="top-right" />
    </SessionProvider>
  );
}
