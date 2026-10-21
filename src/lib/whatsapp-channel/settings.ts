import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/secret-crypto";

export const WHATSAPP_CHANNEL_SETTINGS_ID = "default";

export async function getWhatsAppChannelSettingsRecord() {
  return prisma.whatsAppChannelSettings.findUnique({
    where: { id: WHATSAPP_CHANNEL_SETTINGS_ID },
  });
}

export async function ensureWhatsAppChannelSettings() {
  return prisma.whatsAppChannelSettings.upsert({
    where: { id: WHATSAPP_CHANNEL_SETTINGS_ID },
    create: { id: WHATSAPP_CHANNEL_SETTINGS_ID },
    update: {},
  });
}

export function decryptWhatsAppApiKey(apiKeyEnc: string | null | undefined): string | null {
  if (!apiKeyEnc) return null;
  try {
    return decryptSecret(apiKeyEnc);
  } catch {
    return null;
  }
}

export async function getWhatsAppChannelConfig() {
  const row = await getWhatsAppChannelSettingsRecord();
  if (!row?.enabled || !row.channelId?.trim()) return null;
  const apiKey = decryptWhatsAppApiKey(row.apiKeyEnc);
  if (!apiKey) return null;
  return {
    enabled: true,
    provider: row.provider,
    apiBaseUrl: row.apiBaseUrl,
    channelId: row.channelId.trim(),
    apiKey,
  };
}

export async function saveWhatsAppChannelSettings(input: {
  enabled: boolean;
  channelId: string;
  apiKey?: string;
  apiBaseUrl?: string;
}) {
  await ensureWhatsAppChannelSettings();
  const data: {
    enabled: boolean;
    channelId: string;
    apiBaseUrl?: string;
    apiKeyEnc?: string;
  } = {
    enabled: input.enabled,
    channelId: input.channelId.trim(),
  };
  if (input.apiBaseUrl?.trim()) {
    data.apiBaseUrl = input.apiBaseUrl.trim().replace(/\/$/, "");
  }
  if (input.apiKey?.trim()) {
    data.apiKeyEnc = encryptSecret(input.apiKey.trim());
  }
  return prisma.whatsAppChannelSettings.update({
    where: { id: WHATSAPP_CHANNEL_SETTINGS_ID },
    data,
  });
}
