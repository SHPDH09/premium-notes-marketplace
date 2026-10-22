import { prisma } from "@/lib/db";
import { parseWalayerMessagePayload } from "@/lib/crm/walayer-message-parse";
import { getWalayerPlatformCredentials } from "@/lib/crm/platform-settings";
import { walayerGetPlatformMessage, walayerListChatMessages } from "@/lib/walayer/client";

function asMessageRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown[] }).data)) {
    return (data as { data: Record<string, unknown>[] }).data;
  }
  return [];
}

/**
 * Fill missing body/media on CRM messages from WALayer chat history or message API.
 * Needed when webhooks omit text (content storage off on WALayer workspace).
 */
export async function hydrateConversationMessages(conversationId: string): Promise<{ updated: number }> {
  const conv = await prisma.crmConversation.findUnique({
    where: { id: conversationId },
    include: { whatsappAccount: true },
  });
  if (!conv?.whatsappAccount?.walayerSessionId || conv.whatsappAccount.status !== "CONNECTED") {
    return { updated: 0 };
  }

  const creds = await getWalayerPlatformCredentials();
  if (!creds) return { updated: 0 };

  const local = await prisma.crmMessage.findMany({
    where: { conversationId },
    orderBy: { sentAt: "desc" },
    take: 120,
  });

  const needsWork = local.filter((m) => !(m.bodyText ?? "").trim());
  if (!needsWork.length) return { updated: 0 };

  const remote = await walayerListChatMessages({
    apiKey: creds.apiKey,
    apiBaseUrl: creds.apiBaseUrl,
    sessionId: conv.whatsappAccount.walayerSessionId,
    chatJid: conv.chatJid,
    limit: 100,
  });

  const remoteRows = remote.ok ? asMessageRows(remote.data) : [];
  const remoteByProvider = new Map<string, ReturnType<typeof parseWalayerMessagePayload>>();
  const remoteByWa = new Map<string, ReturnType<typeof parseWalayerMessagePayload>>();

  for (const row of remoteRows) {
    const parsed = parseWalayerMessagePayload(row);
    if (parsed.providerMessageId) remoteByProvider.set(parsed.providerMessageId, parsed);
    if (parsed.waMessageId) remoteByWa.set(parsed.waMessageId, parsed);
  }

  let updated = 0;

  for (const msg of needsWork) {
    let parsed =
      (msg.providerMessageId && remoteByProvider.get(msg.providerMessageId)) ||
      (msg.waMessageId && remoteByWa.get(msg.waMessageId)) ||
      null;

    if (!parsed?.text && !parsed?.mediaUrl && msg.providerMessageId) {
      const one = await walayerGetPlatformMessage(
        creds.apiKey,
        creds.apiBaseUrl,
        msg.providerMessageId
      );
      if (one.ok && one.data && typeof one.data === "object") {
        parsed = parseWalayerMessagePayload(one.data);
      }
    }

    if (!parsed || (!parsed.text && !parsed.mediaUrl)) continue;

    await prisma.crmMessage.update({
      where: { id: msg.id },
      data: {
        bodyText: parsed.text || msg.bodyText,
        mediaUrl: parsed.mediaUrl ?? msg.mediaUrl,
        messageType: parsed.type || msg.messageType,
      },
    });
    updated += 1;
  }

  return { updated };
}
