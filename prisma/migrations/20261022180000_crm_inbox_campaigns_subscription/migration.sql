-- Inbox agent visibility, campaigns, subscription billing (idempotent)

DO $$ BEGIN
  CREATE TYPE "CrmSubscriptionStatus" AS ENUM (
    'TRIAL', 'ACTIVE', 'PAYMENT_PENDING', 'PAST_DUE', 'EXPIRED', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CrmCampaignRecipientStatus" AS ENUM (
    'PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED', 'OPTED_OUT'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "crm_companies" ADD COLUMN IF NOT EXISTS "agents_can_view_unassigned_chats" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "crm_companies" ADD COLUMN IF NOT EXISTS "subscription_status" "CrmSubscriptionStatus" NOT NULL DEFAULT 'TRIAL';
ALTER TABLE "crm_companies" ADD COLUMN IF NOT EXISTS "subscription_started_at" TIMESTAMP(3);
ALTER TABLE "crm_companies" ADD COLUMN IF NOT EXISTS "trial_ends_at" TIMESTAMP(3);
ALTER TABLE "crm_companies" ADD COLUMN IF NOT EXISTS "billing_cycle" "CrmBillingInterval";

ALTER TABLE "crm_subscription_plans" ADD COLUMN IF NOT EXISTS "plan_code" TEXT;
ALTER TABLE "crm_subscription_plans" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "crm_subscription_plans" ADD COLUMN IF NOT EXISTS "price_quarterly_inr" INTEGER;
ALTER TABLE "crm_subscription_plans" ADD COLUMN IF NOT EXISTS "price_half_yearly_inr" INTEGER;
ALTER TABLE "crm_subscription_plans" ADD COLUMN IF NOT EXISTS "price_yearly_inr" INTEGER;
ALTER TABLE "crm_subscription_plans" ADD COLUMN IF NOT EXISTS "setup_fee_inr" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "crm_subscription_plans" ADD COLUMN IF NOT EXISTS "discount_percent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "crm_subscription_plans" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE "crm_subscription_plans" ADD COLUMN IF NOT EXISTS "entitlements" JSONB;
ALTER TABLE "crm_subscription_plans" ADD COLUMN IF NOT EXISTS "featured_label" TEXT;
ALTER TABLE "crm_subscription_plans" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);

UPDATE "crm_subscription_plans"
SET "plan_code" = LOWER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM("name"), ''), 'plan'), '[^a-zA-Z0-9]+', '-', 'g'))
WHERE "plan_code" IS NULL OR "plan_code" = '';

UPDATE "crm_subscription_plans" SET "plan_code" = CONCAT("plan_code", '-', SUBSTRING("id", 1, 6))
WHERE "id" IN (
  SELECT p1."id" FROM "crm_subscription_plans" p1
  JOIN "crm_subscription_plans" p2 ON p1."plan_code" = p2."plan_code" AND p1."id" <> p2."id"
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'crm_subscription_plans' AND column_name = 'plan_code'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM "crm_subscription_plans" WHERE "plan_code" IS NULL) THEN
      ALTER TABLE "crm_subscription_plans" ALTER COLUMN "plan_code" SET NOT NULL;
    END IF;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "crm_subscription_plans_plan_code_key" ON "crm_subscription_plans"("plan_code");

ALTER TABLE "crm_campaign_recipients" ADD COLUMN IF NOT EXISTS "contact_id" TEXT;
ALTER TABLE "crm_campaign_recipients" ADD COLUMN IF NOT EXISTS "provider_message_id" TEXT;
ALTER TABLE "crm_campaign_recipients" ADD COLUMN IF NOT EXISTS "sent_at" TIMESTAMP(3);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'crm_campaign_recipients'
      AND column_name = 'status' AND udt_name = 'text'
  ) THEN
    ALTER TABLE "crm_campaign_recipients"
      ALTER COLUMN "status" DROP DEFAULT,
      ALTER COLUMN "status" TYPE "CrmCampaignRecipientStatus"
      USING (
        CASE LOWER("status")
          WHEN 'sent' THEN 'SENT'::"CrmCampaignRecipientStatus"
          WHEN 'failed' THEN 'FAILED'::"CrmCampaignRecipientStatus"
          WHEN 'delivered' THEN 'DELIVERED'::"CrmCampaignRecipientStatus"
          WHEN 'read' THEN 'READ'::"CrmCampaignRecipientStatus"
          WHEN 'skipped' THEN 'SKIPPED'::"CrmCampaignRecipientStatus"
          WHEN 'opted_out' THEN 'OPTED_OUT'::"CrmCampaignRecipientStatus"
          WHEN 'queued' THEN 'QUEUED'::"CrmCampaignRecipientStatus"
          ELSE 'PENDING'::"CrmCampaignRecipientStatus"
        END
      ),
      ALTER COLUMN "status" SET DEFAULT 'PENDING'::"CrmCampaignRecipientStatus";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "crm_subscription_orders" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "billing_cycle" "CrmBillingInterval" NOT NULL,
    "amount_inr" INTEGER NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "cashfree_order_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "crm_subscription_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "crm_subscription_history" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "plan_id" TEXT,
    "action" TEXT NOT NULL,
    "from_plan_id" TEXT,
    "detail" JSONB,
    "actor_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "crm_subscription_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "crm_subscription_orders_cashfree_order_id_key" ON "crm_subscription_orders"("cashfree_order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "crm_subscription_orders_idempotency_key_key" ON "crm_subscription_orders"("idempotency_key");
CREATE INDEX IF NOT EXISTS "crm_subscription_orders_company_id_created_at_idx" ON "crm_subscription_orders"("company_id", "created_at");
CREATE INDEX IF NOT EXISTS "crm_subscription_history_company_id_created_at_idx" ON "crm_subscription_history"("company_id", "created_at");

DO $$ BEGIN
  ALTER TABLE "crm_subscription_orders" ADD CONSTRAINT "crm_subscription_orders_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "crm_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "crm_subscription_orders" ADD CONSTRAINT "crm_subscription_orders_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "crm_subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "crm_subscription_history" ADD CONSTRAINT "crm_subscription_history_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "crm_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "crm_subscription_history" ADD CONSTRAINT "crm_subscription_history_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "crm_subscription_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
