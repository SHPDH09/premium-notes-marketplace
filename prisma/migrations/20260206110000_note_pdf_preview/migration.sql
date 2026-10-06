ALTER TABLE "notes" ADD COLUMN "pdf_preview_storage_key" TEXT;
ALTER TABLE "notes" ADD COLUMN "free_preview_pages" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "notes" ADD COLUMN "pdf_page_count" INTEGER;
