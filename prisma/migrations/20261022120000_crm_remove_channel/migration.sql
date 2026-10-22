-- Remove placement WhatsApp Channel auto-post tables
DROP TABLE IF EXISTS "job_whatsapp_channel_posts";
DROP TABLE IF EXISTS "whatsapp_channel_settings";
DROP TYPE IF EXISTS "WhatsAppChannelPostStatus";

-- Extend user roles for CRM
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';
ALTER TYPE "Role" ADD VALUE 'COMPANY_ADMIN';
ALTER TYPE "Role" ADD VALUE 'AGENT';

-- CRM enums
CREATE TYPE "CrmCompanyStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "CrmMemberRole" AS ENUM ('COMPANY_ADMIN', 'AGENT', 'SUPERVISOR');
CREATE TYPE "CrmAgentAvailability" AS ENUM ('ONLINE', 'BUSY', 'OFFLINE');
CREATE TYPE "CrmWaConnectionStatus" AS ENUM ('DISCONNECTED', 'CONNECTING', 'CONNECTED', 'EXPIRED', 'ERROR');
CREATE TYPE "CrmConversationStatus" AS ENUM ('OPEN', 'PENDING', 'RESOLVED', 'CLOSED');
CREATE TYPE "CrmConversationPriority" AS ENUM ('NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "CrmMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE "CrmSendMethod" AS ENUM ('MANUAL', 'AUTOMATION', 'CHATBOT', 'API', 'EXTERNAL');
CREATE TYPE "CrmMessageDeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'UNKNOWN');
CREATE TYPE "CrmCallDirection" AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE "CrmCallRecordStatus" AS ENUM ('RINGING', 'ANSWERED', 'REJECTED', 'MISSED', 'FAILED');
CREATE TYPE "CrmCampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "CrmBillingInterval" AS ENUM ('MONTHLY', 'YEARLY');

CREATE TABLE "crm_platform_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "walayer_api_key_enc" TEXT,
    "walayer_api_base_url" TEXT NOT NULL DEFAULT 'https://api.walayer.com/v1',
    "webhook_secret_enc" TEXT,
    "walayer_webhook_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "crm_platform_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_inr" INTEGER NOT NULL DEFAULT 0,
    "billing_interval" "CrmBillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "max_whatsapp_numbers" INTEGER NOT NULL DEFAULT 1,
    "max_agents" INTEGER NOT NULL DEFAULT 5,
    "max_messages_per_month" INTEGER,
    "max_media_storage_mb" INTEGER,
    "automation_enabled" BOOLEAN NOT NULL DEFAULT true,
    "chatbot_enabled" BOOLEAN NOT NULL DEFAULT false,
    "calling_enabled" BOOLEAN NOT NULL DEFAULT false,
    "api_access_enabled" BOOLEAN NOT NULL DEFAULT false,
    "trial_days" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "crm_subscription_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "brand_color" TEXT,
    "status" "CrmCompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "subscription_plan_id" TEXT,
    "subscription_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "crm_companies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_teams" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "crm_teams_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_company_members" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "member_role" "CrmMemberRole" NOT NULL,
    "availability" "CrmAgentAvailability" NOT NULL DEFAULT 'OFFLINE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "team_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "crm_company_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_whatsapp_accounts" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'walayer',
    "walayer_session_id" TEXT,
    "phone_e164" TEXT,
    "display_name" TEXT,
    "status" "CrmWaConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "status_message" TEXT,
    "last_connected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "crm_whatsapp_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_contacts" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "wa_jid" TEXT,
    "name" TEXT,
    "lead_status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "crm_contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_conversations" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "whatsapp_account_id" TEXT NOT NULL,
    "chat_jid" TEXT NOT NULL,
    "status" "CrmConversationStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "CrmConversationPriority" NOT NULL DEFAULT 'NORMAL',
    "assigned_member_id" TEXT,
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "last_message_at" TIMESTAMP(3),
    "last_message_preview" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "crm_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_conversation_assignments" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "from_member_id" TEXT,
    "to_member_id" TEXT,
    "assigned_by_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "crm_conversation_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "direction" "CrmMessageDirection" NOT NULL,
    "message_type" TEXT NOT NULL DEFAULT 'text',
    "body_text" TEXT,
    "media_url" TEXT,
    "provider_message_id" TEXT,
    "wa_message_id" TEXT,
    "idempotency_key" TEXT,
    "send_method" "CrmSendMethod" NOT NULL DEFAULT 'MANUAL',
    "sent_by_member_id" TEXT,
    "delivery_status" "CrmMessageDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "delivery_error" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "crm_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_message_status_events" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "status" "CrmMessageDeliveryStatus" NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "crm_message_status_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_internal_notes" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "crm_internal_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_tags" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#16a34a',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "crm_tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_contact_tags" (
    "contact_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    CONSTRAINT "crm_contact_tags_pkey" PRIMARY KEY ("contact_id","tag_id")
);

CREATE TABLE "crm_conversation_tags" (
    "conversation_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    CONSTRAINT "crm_conversation_tags_pkey" PRIMARY KEY ("conversation_id","tag_id")
);

CREATE TABLE "crm_call_records" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "conversation_id" TEXT,
    "provider_call_id" TEXT,
    "direction" "CrmCallDirection" NOT NULL,
    "status" "CrmCallRecordStatus" NOT NULL,
    "caller_jid" TEXT,
    "chat_jid" TEXT,
    "duration_sec" INTEGER,
    "internal_notes" TEXT,
    "outcome" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    CONSTRAINT "crm_call_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_automation_rules" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rule_type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "crm_automation_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_campaigns" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CrmCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "template_body" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "stats" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "crm_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_campaign_recipients" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "crm_campaign_recipients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_usage_records" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "messages_in" INTEGER NOT NULL DEFAULT 0,
    "messages_out" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "crm_usage_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'walayer',
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "session_id" TEXT,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "crm_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_notifications" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "payload" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "crm_notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_audit_logs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "detail" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "crm_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "crm_companies_slug_key" ON "crm_companies"("slug");
CREATE UNIQUE INDEX "crm_company_members_company_id_user_id_key" ON "crm_company_members"("company_id", "user_id");
CREATE UNIQUE INDEX "crm_teams_company_id_name_key" ON "crm_teams"("company_id", "name");
CREATE UNIQUE INDEX "crm_whatsapp_accounts_walayer_session_id_key" ON "crm_whatsapp_accounts"("walayer_session_id");
CREATE UNIQUE INDEX "crm_contacts_company_id_phone_key" ON "crm_contacts"("company_id", "phone");
CREATE UNIQUE INDEX "crm_conversations_whatsapp_account_id_chat_jid_key" ON "crm_conversations"("whatsapp_account_id", "chat_jid");
CREATE UNIQUE INDEX "crm_messages_provider_message_id_key" ON "crm_messages"("provider_message_id");
CREATE UNIQUE INDEX "crm_tags_company_id_name_key" ON "crm_tags"("company_id", "name");
CREATE UNIQUE INDEX "crm_campaign_recipients_campaign_id_phone_key" ON "crm_campaign_recipients"("campaign_id", "phone");
CREATE UNIQUE INDEX "crm_usage_records_company_id_period_start_key" ON "crm_usage_records"("company_id", "period_start");
CREATE UNIQUE INDEX "crm_webhook_events_event_id_key" ON "crm_webhook_events"("event_id");

CREATE INDEX "crm_companies_status_idx" ON "crm_companies"("status");
CREATE INDEX "crm_company_members_company_id_member_role_idx" ON "crm_company_members"("company_id", "member_role");
CREATE INDEX "crm_whatsapp_accounts_company_id_status_idx" ON "crm_whatsapp_accounts"("company_id", "status");
CREATE INDEX "crm_contacts_company_id_name_idx" ON "crm_contacts"("company_id", "name");
CREATE INDEX "crm_conversations_company_id_status_last_message_at_idx" ON "crm_conversations"("company_id", "status", "last_message_at");
CREATE INDEX "crm_conversations_company_id_assigned_member_id_idx" ON "crm_conversations"("company_id", "assigned_member_id");
CREATE INDEX "crm_conversation_assignments_conversation_id_created_at_idx" ON "crm_conversation_assignments"("conversation_id", "created_at");
CREATE INDEX "crm_messages_conversation_id_sent_at_idx" ON "crm_messages"("conversation_id", "sent_at");
CREATE INDEX "crm_message_status_events_message_id_recorded_at_idx" ON "crm_message_status_events"("message_id", "recorded_at");
CREATE INDEX "crm_internal_notes_conversation_id_created_at_idx" ON "crm_internal_notes"("conversation_id", "created_at");
CREATE INDEX "crm_call_records_company_id_started_at_idx" ON "crm_call_records"("company_id", "started_at");
CREATE INDEX "crm_automation_rules_company_id_enabled_idx" ON "crm_automation_rules"("company_id", "enabled");
CREATE INDEX "crm_campaigns_company_id_status_idx" ON "crm_campaigns"("company_id", "status");
CREATE INDEX "crm_webhook_events_processed_created_at_idx" ON "crm_webhook_events"("processed", "created_at");
CREATE INDEX "crm_notifications_member_id_read_at_idx" ON "crm_notifications"("member_id", "read_at");
CREATE INDEX "crm_audit_logs_company_id_created_at_idx" ON "crm_audit_logs"("company_id", "created_at");

ALTER TABLE "crm_companies" ADD CONSTRAINT "crm_companies_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "crm_subscription_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_teams" ADD CONSTRAINT "crm_teams_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "crm_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_company_members" ADD CONSTRAINT "crm_company_members_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "crm_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_company_members" ADD CONSTRAINT "crm_company_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_company_members" ADD CONSTRAINT "crm_company_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "crm_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_whatsapp_accounts" ADD CONSTRAINT "crm_whatsapp_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "crm_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "crm_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_conversations" ADD CONSTRAINT "crm_conversations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "crm_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_conversations" ADD CONSTRAINT "crm_conversations_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_conversations" ADD CONSTRAINT "crm_conversations_whatsapp_account_id_fkey" FOREIGN KEY ("whatsapp_account_id") REFERENCES "crm_whatsapp_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_conversations" ADD CONSTRAINT "crm_conversations_assigned_member_id_fkey" FOREIGN KEY ("assigned_member_id") REFERENCES "crm_company_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_conversation_assignments" ADD CONSTRAINT "crm_conversation_assignments_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "crm_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_conversation_assignments" ADD CONSTRAINT "crm_conversation_assignments_from_member_id_fkey" FOREIGN KEY ("from_member_id") REFERENCES "crm_company_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_conversation_assignments" ADD CONSTRAINT "crm_conversation_assignments_to_member_id_fkey" FOREIGN KEY ("to_member_id") REFERENCES "crm_company_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_conversation_assignments" ADD CONSTRAINT "crm_conversation_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "crm_company_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_messages" ADD CONSTRAINT "crm_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "crm_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_messages" ADD CONSTRAINT "crm_messages_sent_by_member_id_fkey" FOREIGN KEY ("sent_by_member_id") REFERENCES "crm_company_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_message_status_events" ADD CONSTRAINT "crm_message_status_events_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "crm_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_internal_notes" ADD CONSTRAINT "crm_internal_notes_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "crm_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_internal_notes" ADD CONSTRAINT "crm_internal_notes_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "crm_company_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_tags" ADD CONSTRAINT "crm_tags_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "crm_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_contact_tags" ADD CONSTRAINT "crm_contact_tags_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "crm_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_contact_tags" ADD CONSTRAINT "crm_contact_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "crm_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_conversation_tags" ADD CONSTRAINT "crm_conversation_tags_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "crm_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_conversation_tags" ADD CONSTRAINT "crm_conversation_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "crm_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_call_records" ADD CONSTRAINT "crm_call_records_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "crm_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_call_records" ADD CONSTRAINT "crm_call_records_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "crm_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_automation_rules" ADD CONSTRAINT "crm_automation_rules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "crm_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_campaigns" ADD CONSTRAINT "crm_campaigns_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "crm_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_campaign_recipients" ADD CONSTRAINT "crm_campaign_recipients_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "crm_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_usage_records" ADD CONSTRAINT "crm_usage_records_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "crm_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_notifications" ADD CONSTRAINT "crm_notifications_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "crm_company_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_audit_logs" ADD CONSTRAINT "crm_audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "crm_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "crm_platform_settings" ("id", "updated_at") VALUES ('default', CURRENT_TIMESTAMP);

INSERT INTO "crm_subscription_plans" ("id", "name", "price_inr", "max_whatsapp_numbers", "max_agents", "max_messages_per_month", "sort_order", "updated_at")
VALUES
  ('plan_starter', 'Starter', 0, 1, 3, 5000, 0, CURRENT_TIMESTAMP),
  ('plan_growth', 'Growth', 499900, 3, 15, 50000, 1, CURRENT_TIMESTAMP),
  ('plan_enterprise', 'Enterprise', 0, 10, 100, NULL, 2, CURRENT_TIMESTAMP);
