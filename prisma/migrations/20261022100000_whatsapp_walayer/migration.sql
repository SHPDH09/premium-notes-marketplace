-- WALayer replaces Wapito for WhatsApp Channel auto-posting
ALTER TABLE "whatsapp_channel_settings" ADD COLUMN IF NOT EXISTS "session_id" TEXT;

UPDATE "whatsapp_channel_settings"
SET "provider" = 'walayer', "api_base_url" = 'https://api.walayer.com/v1'
WHERE "provider" IN ('wapito', 'wapio');

UPDATE "job_whatsapp_channel_posts"
SET "provider" = 'walayer'
WHERE "provider" IN ('wapito', 'wapio');

ALTER TABLE "whatsapp_channel_settings" ALTER COLUMN "provider" SET DEFAULT 'walayer';
ALTER TABLE "whatsapp_channel_settings" ALTER COLUMN "api_base_url" SET DEFAULT 'https://api.walayer.com/v1';
ALTER TABLE "job_whatsapp_channel_posts" ALTER COLUMN "provider" SET DEFAULT 'walayer';
