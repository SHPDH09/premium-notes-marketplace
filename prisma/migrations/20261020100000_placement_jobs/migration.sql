-- CreateEnum
CREATE TYPE "JobApplyType" AS ENUM ('EMAIL', 'LINK', 'WALK_IN');

-- CreateEnum
CREATE TYPE "PlacementSubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "placement_subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price_label" TEXT,
    "duration_days" INTEGER,
    "status" "PublishStatus" NOT NULL DEFAULT 'ACTIVE',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "placement_subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_placement_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "PlacementSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_placement_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_career_profiles" (
    "user_id" TEXT NOT NULL,
    "resume_storage_key" TEXT,
    "resume_file_name" TEXT,
    "resume_text" TEXT,
    "email_header" TEXT,
    "email_footer" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_career_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "job_postings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "apply_type" "JobApplyType" NOT NULL,
    "description" TEXT NOT NULL,
    "apply_email" TEXT,
    "apply_url" TEXT,
    "walk_in_details" TEXT,
    "requires_subscription" BOOLEAN NOT NULL DEFAULT true,
    "status" "PublishStatus" NOT NULL DEFAULT 'ACTIVE',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "placed_students" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "display_name" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT,
    "package_label" TEXT,
    "photo" TEXT,
    "story" TEXT,
    "status" "PublishStatus" NOT NULL DEFAULT 'ACTIVE',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "placed_students_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_placement_subscriptions_user_id_status_idx" ON "user_placement_subscriptions"("user_id", "status");

-- CreateIndex
CREATE INDEX "job_postings_status_sort_order_idx" ON "job_postings"("status", "sort_order");

-- CreateIndex
CREATE INDEX "placed_students_status_sort_order_idx" ON "placed_students"("status", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "placed_students_user_id_key" ON "placed_students"("user_id");

-- AddForeignKey
ALTER TABLE "user_placement_subscriptions" ADD CONSTRAINT "user_placement_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_placement_subscriptions" ADD CONSTRAINT "user_placement_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "placement_subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_career_profiles" ADD CONSTRAINT "student_career_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placed_students" ADD CONSTRAINT "placed_students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
