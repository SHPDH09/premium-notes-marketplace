-- CRM Calls enhancement: contact/agent links, recording ref, idempotency

ALTER TABLE "crm_call_records" ADD COLUMN IF NOT EXISTS "contact_id" TEXT;
ALTER TABLE "crm_call_records" ADD COLUMN IF NOT EXISTS "assigned_member_id" TEXT;
ALTER TABLE "crm_call_records" ADD COLUMN IF NOT EXISTS "recording_ref" TEXT;
ALTER TABLE "crm_call_records" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "crm_call_records" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "crm_call_records_company_id_contact_id_idx" ON "crm_call_records"("company_id", "contact_id");
CREATE INDEX IF NOT EXISTS "crm_call_records_company_id_assigned_member_id_idx" ON "crm_call_records"("company_id", "assigned_member_id");
CREATE INDEX IF NOT EXISTS "crm_call_records_company_id_status_idx" ON "crm_call_records"("company_id", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "crm_call_records_company_id_provider_call_id_key"
  ON "crm_call_records"("company_id", "provider_call_id")
  WHERE "provider_call_id" IS NOT NULL AND "provider_call_id" <> '';

ALTER TABLE "crm_call_records" ADD CONSTRAINT "crm_call_records_contact_id_fkey"
  FOREIGN KEY ("contact_id") REFERENCES "crm_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "crm_call_records" ADD CONSTRAINT "crm_call_records_assigned_member_id_fkey"
  FOREIGN KEY ("assigned_member_id") REFERENCES "crm_company_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
