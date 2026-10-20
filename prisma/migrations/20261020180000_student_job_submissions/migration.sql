-- CreateEnum
CREATE TYPE "JobPostingSource" AS ENUM ('ADMIN', 'STUDENT');
CREATE TYPE "JobReviewStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "job_postings" ADD COLUMN IF NOT EXISTS "source" "JobPostingSource" NOT NULL DEFAULT 'ADMIN';
ALTER TABLE "job_postings" ADD COLUMN IF NOT EXISTS "review_status" "JobReviewStatus" NOT NULL DEFAULT 'NONE';
ALTER TABLE "job_postings" ADD COLUMN IF NOT EXISTS "admin_review_note" TEXT;
ALTER TABLE "job_postings" ADD COLUMN IF NOT EXISTS "submitted_by_user_id" TEXT;
ALTER TABLE "job_postings" ADD COLUMN IF NOT EXISTS "view_count" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_submitted_by_user_id_fkey"
    FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "job_postings_review_status_source_idx" ON "job_postings"("review_status", "source");
CREATE INDEX IF NOT EXISTS "job_postings_submitted_by_user_id_idx" ON "job_postings"("submitted_by_user_id");
