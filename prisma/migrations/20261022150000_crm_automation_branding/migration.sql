-- Automation executions, scheduled tasks, AI settings, branding columns

ALTER TABLE "crm_subscription_plans" ADD COLUMN IF NOT EXISTS "white_label_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "crm_subscription_plans" ADD COLUMN IF NOT EXISTS "ai_assist_enabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "crm_platform_settings" ADD COLUMN IF NOT EXISTS "platform_name" TEXT NOT NULL DEFAULT 'WhatsApp CRM';
ALTER TABLE "crm_platform_settings" ADD COLUMN IF NOT EXISTS "platform_logo_url" TEXT;
ALTER TABLE "crm_platform_settings" ADD COLUMN IF NOT EXISTS "platform_favicon_url" TEXT;
ALTER TABLE "crm_platform_settings" ADD COLUMN IF NOT EXISTS "platform_primary_color" TEXT NOT NULL DEFAULT '#059669';
ALTER TABLE "crm_platform_settings" ADD COLUMN IF NOT EXISTS "platform_secondary_color" TEXT NOT NULL DEFAULT '#0f172a';
ALTER TABLE "crm_platform_settings" ADD COLUMN IF NOT EXISTS "platform_accent_color" TEXT NOT NULL DEFAULT '#34d399';
ALTER TABLE "crm_platform_settings" ADD COLUMN IF NOT EXISTS "platform_login_message" TEXT;
ALTER TABLE "crm_platform_settings" ADD COLUMN IF NOT EXISTS "default_company_branding" JSONB;

ALTER TABLE "crm_companies" ADD COLUMN IF NOT EXISTS "favicon_url" TEXT;
ALTER TABLE "crm_companies" ADD COLUMN IF NOT EXISTS "secondary_color" TEXT;
ALTER TABLE "crm_companies" ADD COLUMN IF NOT EXISTS "accent_color" TEXT;
ALTER TABLE "crm_companies" ADD COLUMN IF NOT EXISTS "login_logo_url" TEXT;
ALTER TABLE "crm_companies" ADD COLUMN IF NOT EXISTS "login_welcome_message" TEXT;
ALTER TABLE "crm_companies" ADD COLUMN IF NOT EXISTS "support_email" TEXT;
ALTER TABLE "crm_companies" ADD COLUMN IF NOT EXISTS "support_phone" TEXT;
ALTER TABLE "crm_companies" ADD COLUMN IF NOT EXISTS "website_url" TEXT;
ALTER TABLE "crm_companies" ADD COLUMN IF NOT EXISTS "workspace_locale" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "crm_companies" ADD COLUMN IF NOT EXISTS "workspace_theme" TEXT NOT NULL DEFAULT 'dark';
ALTER TABLE "crm_companies" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';
ALTER TABLE "crm_companies" ADD COLUMN IF NOT EXISTS "dashboard_welcome" TEXT;
ALTER TABLE "crm_companies" ADD COLUMN IF NOT EXISTS "branding_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "crm_companies" ADD COLUMN IF NOT EXISTS "hide_platform_branding" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "crm_companies" ADD COLUMN IF NOT EXISTS "automation_settings" JSONB;

ALTER TABLE "crm_automation_rules" ADD COLUMN IF NOT EXISTS "trigger_type" TEXT NOT NULL DEFAULT 'message.received';
ALTER TABLE "crm_automation_rules" ADD COLUMN IF NOT EXISTS "test_mode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "crm_automation_rules" ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "crm_automation_rules" ADD COLUMN IF NOT EXISTS "last_executed_at" TIMESTAMP(3);
ALTER TABLE "crm_automation_rules" ADD COLUMN IF NOT EXISTS "success_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "crm_automation_rules" ADD COLUMN IF NOT EXISTS "failure_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "crm_automation_rules" ADD COLUMN IF NOT EXISTS "created_by_member_id" TEXT;

CREATE TABLE IF NOT EXISTS "crm_automation_executions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "trigger_type" TEXT NOT NULL,
    "trigger_event_id" TEXT,
    "conversation_id" TEXT,
    "contact_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'running',
    "conditions_met" BOOLEAN,
    "error" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "crm_automation_executions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "crm_automation_execution_steps" (
    "id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "detail" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "crm_automation_execution_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "crm_scheduled_tasks" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "task_type" TEXT NOT NULL,
    "conversation_id" TEXT,
    "rule_id" TEXT,
    "payload" JSONB,
    "run_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "crm_scheduled_tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "crm_ai_reply_settings" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "mode" TEXT NOT NULL DEFAULT 'suggest',
    "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "max_tokens" INTEGER NOT NULL DEFAULT 400,
    "knowledge_base_text" TEXT,
    "auto_reply_enabled" BOOLEAN NOT NULL DEFAULT false,
    "escalate_keywords" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "crm_ai_reply_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "crm_ai_reply_settings_company_id_key" ON "crm_ai_reply_settings"("company_id");
CREATE INDEX IF NOT EXISTS "crm_automation_executions_company_id_started_at_idx" ON "crm_automation_executions"("company_id", "started_at");
CREATE INDEX IF NOT EXISTS "crm_automation_executions_rule_id_started_at_idx" ON "crm_automation_executions"("rule_id", "started_at");
CREATE INDEX IF NOT EXISTS "crm_automation_execution_steps_execution_id_idx" ON "crm_automation_execution_steps"("execution_id");
CREATE INDEX IF NOT EXISTS "crm_scheduled_tasks_status_run_at_idx" ON "crm_scheduled_tasks"("status", "run_at");
CREATE INDEX IF NOT EXISTS "crm_scheduled_tasks_company_id_conversation_id_idx" ON "crm_scheduled_tasks"("company_id", "conversation_id");
CREATE INDEX IF NOT EXISTS "crm_automation_rules_company_id_enabled_priority_idx" ON "crm_automation_rules"("company_id", "enabled", "priority");

ALTER TABLE "crm_automation_executions" ADD CONSTRAINT "crm_automation_executions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "crm_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_automation_executions" ADD CONSTRAINT "crm_automation_executions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "crm_automation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_automation_execution_steps" ADD CONSTRAINT "crm_automation_execution_steps_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "crm_automation_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_scheduled_tasks" ADD CONSTRAINT "crm_scheduled_tasks_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "crm_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_ai_reply_settings" ADD CONSTRAINT "crm_ai_reply_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "crm_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
