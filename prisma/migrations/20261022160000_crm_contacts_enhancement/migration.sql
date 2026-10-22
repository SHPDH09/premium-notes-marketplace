-- CreateEnum
CREATE TYPE "CrmContactStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DO_NOT_CONTACT');

-- Extend crm_contacts
ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "phone_normalized" TEXT;
UPDATE "crm_contacts" SET "phone_normalized" = regexp_replace("phone", '[^0-9]', '', 'g') WHERE "phone_normalized" IS NULL;
ALTER TABLE "crm_contacts" ALTER COLUMN "phone_normalized" SET NOT NULL;

ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "company_name" TEXT;
ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'manual';
ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "custom_fields" JSONB;
ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "status" "CrmContactStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "assigned_member_id" TEXT;
ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "marketing_consent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "marketing_consent_at" TIMESTAMP(3);
ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "consent_source" TEXT;
ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "opted_out_at" TIMESTAMP(3);
ALTER TABLE "crm_contacts" ADD COLUMN IF NOT EXISTS "last_activity_at" TIMESTAMP(3);

DROP INDEX IF EXISTS "crm_contacts_company_id_phone_key";
CREATE UNIQUE INDEX IF NOT EXISTS "crm_contacts_company_id_phone_normalized_key" ON "crm_contacts"("company_id", "phone_normalized");
CREATE INDEX IF NOT EXISTS "crm_contacts_company_id_email_idx" ON "crm_contacts"("company_id", "email");
CREATE INDEX IF NOT EXISTS "crm_contacts_company_id_status_created_at_idx" ON "crm_contacts"("company_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "crm_contacts_company_id_assigned_member_id_idx" ON "crm_contacts"("company_id", "assigned_member_id");

ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_assigned_member_id_fkey" FOREIGN KEY ("assigned_member_id") REFERENCES "crm_company_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "crm_contact_segments" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filter_config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "crm_contact_segments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "crm_contact_import_jobs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "file_name" TEXT,
    "mapping" JSONB,
    "summary" JSONB,
    "error_report" JSONB,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "crm_contact_import_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "crm_suppression_entries" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "phone_normalized" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "crm_suppression_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "crm_contact_segments_company_id_name_key" ON "crm_contact_segments"("company_id", "name");
CREATE INDEX IF NOT EXISTS "crm_contact_import_jobs_company_id_created_at_idx" ON "crm_contact_import_jobs"("company_id", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "crm_suppression_entries_company_id_phone_normalized_key" ON "crm_suppression_entries"("company_id", "phone_normalized");

ALTER TABLE "crm_contact_segments" ADD CONSTRAINT "crm_contact_segments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "crm_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_contact_import_jobs" ADD CONSTRAINT "crm_contact_import_jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "crm_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_suppression_entries" ADD CONSTRAINT "crm_suppression_entries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "crm_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
