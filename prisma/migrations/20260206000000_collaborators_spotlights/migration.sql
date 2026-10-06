CREATE TYPE "CollaboratorType" AS ENUM ('COMPANY', 'COLLEGE', 'INSTITUTE');
CREATE TYPE "PublishStatus" AS ENUM ('ACTIVE', 'DISABLED');

CREATE TABLE "collaborators" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CollaboratorType" NOT NULL,
    "logo_image" TEXT,
    "website" TEXT,
    "description" TEXT,
    "status" "PublishStatus" NOT NULL DEFAULT 'ACTIVE',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "collaborators_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "collaborators_status_sort_order_idx" ON "collaborators"("status", "sort_order");
CREATE INDEX "collaborators_type_idx" ON "collaborators"("type");

CREATE TABLE "student_spotlights" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "display_name" TEXT NOT NULL,
    "institute" TEXT,
    "headline" TEXT,
    "quote" TEXT,
    "photo" TEXT,
    "status" "PublishStatus" NOT NULL DEFAULT 'ACTIVE',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "student_spotlights_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_spotlights_user_id_key" ON "student_spotlights"("user_id");
CREATE INDEX "student_spotlights_status_sort_order_idx" ON "student_spotlights"("status", "sort_order");

ALTER TABLE "student_spotlights" ADD CONSTRAINT "student_spotlights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
