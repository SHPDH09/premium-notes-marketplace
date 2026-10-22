import { prisma } from "@/lib/db";
import { parseWalayerMessagePayload, walayerRowTimestamp } from "@/lib/crm/walayer-message-parse";
import { getWalayerPlatformCredentials } from "@/lib/crm/platform-settings";
import {
  walayerGetPlatformMessage,
  walayerListChatMessages,
  walayerListMessages,
} from "@/lib/walayer/client";
import type { CrmMessage } from "@prisma/client";

function asMessageRows(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (!raw || typeof raw !== "object") return [];
  const o = raw as Record<string, unknown>;
  if (Array.isArray(o.data)) return o.data as Record<string, unknown>[];
  if (Array.isArray(o.messages)) return o.messages as Record<string, unknown>[];
  if (Array.isArray(o.items)) return o.items as Record<string, unknown>[];
  return [];
}

function matchLocalMessage(
  local: CrmMessage[],
  parsed: ReturnType<typeof parseWalayerMessagePayload>,
  row: Record<string, unknown>
): CrmMessage | null {
  if (parsed.providerMessageId) {
    const byProvider = local.find((m) => m.providerMessageId === parsed.providerMessageId);
    if (byProvider) return byProvider;
  }
  if (parsed.waMessageId) {
    const byWa = local.find((m) => m.waMessageId === parsed.waMessageId);
    if (byWa) return byWa;
  }

  const ts = parsed.timestampMs ?? walayerRowTimestamp(row);
  if (ts == null) return null;

  const direction = parsed.fromMe ? "OUTBOUND" : "INBOUND";
  let best: CrmMessage | null = null;
  let bestDiff = Infinity;

  for (const m of local) {
    if (m.direction !== direction) continue;
    const diff = Math.abs(m.sentAt.getTime() - ts);
    if (diff < bestDiff && diff <= 8000) {
      bestDiff = diff;
      best = m;
    }
  }

  return best;
}

/**
 * Fill missing body/media on CRM messages from WALayer chat history or message API.
 * WALayer webhooks often omit `text` when content storage is off on the workspace.
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

  const sessionId = conv.whatsappAccount.walayerSessionId;

  const local = await prisma.crmMessage.findMany({
    where: { conversationId },
    orderBy: { sentAt: "desc" },
    take: 150,
  });

  const hasEmpty = local.some((m) => !(m.bodyText ?? "").trim() && !m.mediaUrl);
  if (!hasEmpty) return { updated: 0 };

  const remote = await walayerListChatMessages({
    apiKey: creds.apiKey,
    apiBaseUrl: creds.apiBaseUrl,
    sessionId,
    chatJid: conv.chatJid,
    limit: 120,
  });

  let remoteRows = remote.ok ? asMessageRows(remote.raw) : [];
  if (!remoteRows.length && remote.ok) remoteRows = asMessageRows(remote.data);

  if (!remoteRows.length) {
    const listed = await walayerListMessages({
      apiKey: creds.apiKey,
      apiBaseUrl: creds.apiBaseUrl,
      sessionId,
      limit: 150,
    });
    if (listed.ok) {
      remoteRows = asMessageRows(listed.raw)
        .concat(asMessageRows(listed.data))
        .filter((row) => {
          const jid = row.chat_jid ?? row.chatJid ?? row.jid;
          return typeof jid === "string" && jid === conv.chatJid;
        });
    }
  }

  let updated = 0;
  const usedLocalIds = new Set<string>();

  for (const row of remoteRows) {
    const parsed = parseWalayerMessagePayload(row);
    if (!parsed.text && !parsed.mediaUrl) continue;

    let target = matchLocalMessage(local, parsed, row);
    if (target && usedLocalIds.has(target.id)) target = null;
    if (!target) continue;

    const needsUpdate =
      (!(target.bodyText ?? "").trim() && parsed.text) ||
      (!target.mediaUrl && parsed.mediaUrl);
    if (!needsUpdate) continue;

    await prisma.crmMessage.update({
      where: { id: target.id },
      data: {
        bodyText: parsed.text || target.bodyText,
        mediaUrl: parsed.mediaUrl ?? target.mediaUrl,
        messageType: parsed.type || target.messageType,
        providerMessageId: target.providerMessageId ?? parsed.providerMessageId ?? undefined,
        waMessageId: target.waMessageId ?? parsed.waMessageId ?? undefined,
      },
    });
    usedLocalIds.add(target.id);
    updated += 1;
  }

  for (const msg of local) {
    if ((msg.bodyText ?? "").trim() || msg.mediaUrl) continue;
    if (!msg.providerMessageId) continue;

    const one = await walayerGetPlatformMessage(
      creds.apiKey,
      creds.apiBaseUrl,
      msg.providerMessageId
    );
    if (!one.ok || !one.data || typeof one.data !== "object") continue;

    const parsed = parseWalayerMessagePayload(one.data as Record<string, unknown>);
    if (!parsed.text && !parsed.mediaUrl) continue;

    await prisma.crmMessage.update({
      where: { id: msg.id },
      data: {
        bodyText: parsed.text || msg.bodyText,
        mediaUrl: parsed.mediaUrl ?? msg.mediaUrl,
        messageType: parsed.type || msg.messageType,
        providerPayload: one.data as object,
      },
    });
    updated += 1;
  }

  if (updated > 0) {
    const latest = await prisma.crmMessage.findFirst({
      where: { conversationId, bodyText: { not: null } },
      orderBy: { sentAt: "desc" },
    });
    if (latest?.bodyText?.trim()) {
      await prisma.crmConversation.update({
        where: { id: conversationId },
        data: { lastMessagePreview: latest.bodyText.slice(0, 280) },
      });
    }
  }

  return { updated };
}
