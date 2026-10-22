import { prisma } from "@/lib/db";
import { getCompanyEntitlements, checkLimit } from "@/lib/crm/entitlements";
import { getWalayerPlatformCredentials } from "@/lib/crm/platform-settings";
import { chatJidFromPhone, normalizePhoneDigits } from "@/lib/crm/phone";
import { walayerSendTextMessage } from "@/lib/walayer/client";
import { randomUUID } from "node:crypto";

const BATCH = 40;

export async function runCampaignSend(campaignId: string, companyId: string) {
  const campaign = await prisma.crmCampaign.findFirst({
    where: { id: campaignId, companyId },
    include: {
      recipients: { where: { status: "PENDING" }, take: BATCH },
    },
  });
  if (!campaign) return { ok: false as const, error: "Campaign not found" };
  if (!campaign.templateBody?.trim()) {
    return { ok: false as const, error: "Campaign message body is empty" };
  }

  const ent = await getCompanyEntitlements(companyId);
  const limitCheck = checkLimit(
    ent.entitlements.maxCampaignMessagesPerMonth,
    ent.usage.campaignMessagesThisMonth
  );
  if (!limitCheck.ok) return { ok: false as const, error: limitCheck.message };

  const account = await prisma.crmWhatsAppAccount.findFirst({
    where: { companyId, status: "CONNECTED" },
  });
  if (!account?.walayerSessionId) {
    return { ok: false as const, error: "Connect WhatsApp before sending campaigns" };
  }

  const creds = await getWalayerPlatformCredentials();
  if (!creds) return { ok: false as const, error: "WhatsApp provider not configured" };

  await prisma.crmCampaign.update({
    where: { id: campaign.id },
    data: { status: "RUNNING" },
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const recipient of campaign.recipients) {
    const digits = normalizePhoneDigits(recipient.phone);
    const suppressed = await prisma.crmSuppressionEntry.findFirst({
      where: { companyId, phoneNormalized: digits },
    });
    if (suppressed) {
      await prisma.crmCampaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "OPTED_OUT", error: "Suppressed / opted out" },
      });
      skipped += 1;
      continue;
    }

    const idempotencyKey = `campaign-${campaign.id}-${recipient.id}-${randomUUID()}`;
    const to = chatJidFromPhone(recipient.phone);
    const send = await walayerSendTextMessage({
      apiKey: creds.apiKey,
      apiBaseUrl: creds.apiBaseUrl,
      sessionId: account.walayerSessionId,
      to,
      text: campaign.templateBody,
      idempotencyKey,
    });

    if (!send.ok) {
      await prisma.crmCampaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "FAILED", error: send.error },
      });
      failed += 1;
      continue;
    }

    const providerMessageId =
      typeof send.data === "object" && send.data && "id" in send.data
        ? String((send.data as { id: string }).id)
        : undefined;

    await prisma.crmCampaignRecipient.update({
      where: { id: recipient.id },
      data: { status: "SENT", sentAt: new Date(), providerMessageId, error: null },
    });
    sent += 1;
  }

  const remaining = await prisma.crmCampaignRecipient.count({
    where: { campaignId: campaign.id, status: "PENDING" },
  });

  const prev = (campaign.stats as { sent?: number; failed?: number; skipped?: number }) ?? {};
  const stats = {
    sent: (prev.sent ?? 0) + sent,
    failed: (prev.failed ?? 0) + failed,
    skipped: (prev.skipped ?? 0) + skipped,
  };

  await prisma.crmCampaign.update({
    where: { id: campaign.id },
    data: {
      status: remaining > 0 ? "RUNNING" : failed > 0 && sent === 0 ? "FAILED" : "COMPLETED",
      stats: {
        ...((campaign.stats as object) ?? {}),
        sent: stats.sent,
        failed: stats.failed,
        skipped: stats.skipped,
        lastRunAt: new Date().toISOString(),
      },
    },
  });

  return { ok: true as const, sent, failed, skipped, remaining };
}
