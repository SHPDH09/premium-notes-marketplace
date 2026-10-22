import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/secret-crypto";

export const CRM_PLATFORM_SETTINGS_ID = "default";

export async function ensureCrmPlatformSettings() {
  return prisma.crmPlatformSettings.upsert({
    where: { id: CRM_PLATFORM_SETTINGS_ID },
    create: { id: CRM_PLATFORM_SETTINGS_ID },
    update: {},
  });
}

export async function getWalayerPlatformCredentials(): Promise<{
  apiKey: string;
  apiBaseUrl: string;
  webhookSecret: string | null;
} | null> {
  const row = await prisma.crmPlatformSettings.findUnique({
    where: { id: CRM_PLATFORM_SETTINGS_ID },
  });
  if (!row?.walayerApiKeyEnc) return null;
  try {
    return {
      apiKey: decryptSecret(row.walayerApiKeyEnc),
      apiBaseUrl: row.walayerApiBaseUrl,
      webhookSecret: row.webhookSecretEnc ? decryptSecret(row.webhookSecretEnc) : null,
    };
  } catch {
    return null;
  }
}

export async function saveCrmPlatformWalayerSettings(input: {
  walayerApiKey?: string;
  walayerApiBaseUrl?: string;
  webhookSecret?: string;
}) {
  await ensureCrmPlatformSettings();
  const data: {
    walayerApiKeyEnc?: string;
    walayerApiBaseUrl?: string;
    webhookSecretEnc?: string;
  } = {};
  if (input.walayerApiKey?.trim()) {
    data.walayerApiKeyEnc = encryptSecret(input.walayerApiKey.trim());
  }
  if (input.walayerApiBaseUrl?.trim()) {
    data.walayerApiBaseUrl = input.walayerApiBaseUrl.trim().replace(/\/$/, "");
  }
  if (input.webhookSecret?.trim()) {
    data.webhookSecretEnc = encryptSecret(input.webhookSecret.trim());
  }
  return prisma.crmPlatformSettings.update({
    where: { id: CRM_PLATFORM_SETTINGS_ID },
    data,
  });
}
