"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  contactId?: string;
  conversationId?: string;
  phone?: string;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "secondary";
  label?: string;
};

export function CallActionButton({
  contactId,
  conversationId,
  phone,
  size = "sm",
  variant = "outline",
  label = "Call",
}: Props) {
  const [loading, setLoading] = useState(false);

  async function onCall() {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/calls/initiate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, conversationId, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? data.capabilities?.summary ?? "Call unavailable");
        return;
      }
      if (data.method === "device_dial" && data.telUrl) {
        toast.message(data.message ?? "Opening device dialer", { duration: 6000 });
        window.location.href = data.telUrl;
        return;
      }
      toast.error("WhatsApp calling is not available for this account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" size={size} variant={variant} disabled={loading} onClick={() => void onCall()}>
      {loading ? "…" : label}
    </Button>
  );
}
