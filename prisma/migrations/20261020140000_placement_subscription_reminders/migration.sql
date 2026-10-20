-- CreateTable
CREATE TABLE "placement_subscription_reminders" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "days_before_end" INTEGER NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "placement_subscription_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "placement_subscription_reminders_subscription_id_days_before_end_key" ON "placement_subscription_reminders"("subscription_id", "days_before_end");

-- CreateIndex
CREATE INDEX "user_placement_subscriptions_ends_at_status_idx" ON "user_placement_subscriptions"("ends_at", "status");

-- AddForeignKey
ALTER TABLE "placement_subscription_reminders" ADD CONSTRAINT "placement_subscription_reminders_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "user_placement_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
