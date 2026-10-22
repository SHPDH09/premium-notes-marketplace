import { prisma } from "@/lib/db";

export type CallCapabilities = {
  connected: boolean;
  provider: "walayer";
  incomingWebhook: boolean;
  rejectIncoming: boolean;
  outgoingProvider: boolean;
  inBrowserAnswer: boolean;
  recordings: boolean;
  deviceDial: boolean;
  summary: string;
};

/** Verified against WALayer client + webhook handlers in this repo. */
export async function getCallCapabilities(companyId: string): Promise<CallCapabilities> {
  const account = await prisma.crmWhatsAppAccount.findFirst({
    where: { companyId, status: "CONNECTED" },
    select: { id: true },
  });

  const connected = !!account;

  return {
    connected,
    provider: "walayer",
    incomingWebhook: true,
    rejectIncoming: connected,
    outgoingProvider: false,
    inBrowserAnswer: false,
    recordings: false,
    deviceDial: true,
    summary: connected
      ? "WhatsApp voice: incoming call events and reject are supported via WALayer. Outgoing WhatsApp calls and in-app answer are not available on the public API. Use device dial (tel:) as a fallback for phone calls outside WhatsApp."
      : "Connect a WhatsApp session under Connections before handling WhatsApp call events.",
  };
}

export const CALL_OUTCOMES = [
  "INTERESTED",
  "FOLLOW_UP_REQUIRED",
  "CALLBACK_REQUESTED",
  "NOT_INTERESTED",
  "ISSUE_RESOLVED",
  "WRONG_NUMBER",
] as const;

export type CallOutcome = (typeof CALL_OUTCOMES)[number];

export function formatCallStatus(status: string): string {
  const labels: Record<string, string> = {
    RINGING: "In progress",
    ANSWERED: "Answered",
    REJECTED: "Rejected",
    MISSED: "Missed",
    FAILED: "Failed",
  };
  return labels[status] ?? status;
}

export function formatCallDirection(direction: string): string {
  return direction === "INBOUND" ? "Incoming" : "Outgoing";
}
