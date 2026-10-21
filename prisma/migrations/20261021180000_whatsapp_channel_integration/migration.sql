-- CreateEnum
CREATE TYPE "WhatsAppChannelPostStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE IF NOT EXISTS "whatsapp_channel_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT NOT NULL DEFAULT 'wapio',
    "api_base_url" TEXT NOT NULL DEFAULT 'https://api.wapio.io',
    "channel_id" TEXT,
    "api_key_enc" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_channel_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "job_whatsapp_channel_posts" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "status" "WhatsAppChannelPostStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'wapio',
    "error_message" TEXT,
    "posted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_whatsapp_channel_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "job_whatsapp_channel_posts_job_id_key" ON "job_whatsapp_channel_posts"("job_id");
CREATE INDEX IF NOT EXISTS "job_whatsapp_channel_posts_status_created_at_idx" ON "job_whatsapp_channel_posts"("status", "created_at");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "job_whatsapp_channel_posts" ADD CONSTRAINT "job_whatsapp_channel_posts_job_id_fkey"
    FOREIGN KEY ("job_id") REFERENCES "job_postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
