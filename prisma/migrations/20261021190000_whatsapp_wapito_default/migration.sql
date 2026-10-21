-- Default provider Wapito (existing rows keep stored values; migrate legacy Wapio defaults)
UPDATE "whatsapp_channel_settings"
SET "provider" = 'wapito', "api_base_url" = 'https://api.wapito.com/v1'
WHERE "provider" = 'wapio' AND "api_base_url" = 'https://api.wapio.io';

UPDATE "job_whatsapp_channel_posts"
SET "provider" = 'wapito'
WHERE "provider" = 'wapio';

ALTER TABLE "whatsapp_channel_settings" ALTER COLUMN "provider" SET DEFAULT 'wapito';
ALTER TABLE "whatsapp_channel_settings" ALTER COLUMN "api_base_url" SET DEFAULT 'https://api.wapito.com/v1';
ALTER TABLE "job_whatsapp_channel_posts" ALTER COLUMN "provider" SET DEFAULT 'wapito';
