-- CreateEnum
CREATE TYPE "PopupType" AS ENUM ('TEXT', 'IMAGE');
CREATE TYPE "PopupRepeatMode" AS ENUM ('REPEAT', 'ONCE_PER_SESSION', 'ONCE_PER_BROWSER');

-- CreateTable
CREATE TABLE "site_popups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "popup_type" "PopupType" NOT NULL,
    "title" TEXT,
    "body_text" TEXT,
    "image_storage_key" TEXT,
    "button_label" TEXT,
    "button_url" TEXT,
    "whatsapp_url" TEXT,
    "social_links" JSONB NOT NULL DEFAULT '[]',
    "target_pages" JSONB NOT NULL DEFAULT '[]',
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "repeat_mode" "PopupRepeatMode" NOT NULL DEFAULT 'REPEAT',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "PublishStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_popups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "site_popups_status_sort_order_idx" ON "site_popups"("status", "sort_order");
