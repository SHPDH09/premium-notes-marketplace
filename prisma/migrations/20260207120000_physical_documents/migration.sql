-- CreateEnum
CREATE TYPE "CouponAppliesTo" AS ENUM ('NOTE', 'PHYSICAL', 'BOTH');

-- CreateEnum
CREATE TYPE "PaperSize" AS ENUM ('A4', 'A5', 'OTHER');

-- CreateEnum
CREATE TYPE "PaperType" AS ENUM ('NORMAL', 'PREMIUM');

-- CreateEnum
CREATE TYPE "PrintType" AS ENUM ('BLACK_WHITE', 'COLOR');

-- CreateEnum
CREATE TYPE "BindingType" AS ENUM ('NONE', 'SPIRAL', 'SOFT_BINDING', 'HARD_BINDING');

-- CreateEnum
CREATE TYPE "PhysicalFulfillmentStatus" AS ENUM ('ORDER_PLACED', 'PAYMENT_CONFIRMED', 'PROCESSING', 'PRINTING', 'QUALITY_CHECK', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED');

-- CreateEnum
CREATE TYPE "PhysicalPrintStatus" AS ENUM ('PENDING_PRINT', 'PRINTING', 'PRINTED', 'QC_PENDING', 'QC_PASSED', 'QC_FAILED', 'REPRINT_REQUIRED');

-- CreateEnum
CREATE TYPE "PhysicalShippingStatus" AS ENUM ('NOT_SHIPPED', 'READY_FOR_PACKING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED', 'RETURNED');

-- CreateEnum
CREATE TYPE "PhysicalRefundStatus" AS ENUM ('NOT_REQUESTED', 'REQUESTED', 'APPROVED', 'PROCESSING', 'REFUNDED', 'REJECTED');

-- AlterTable
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "applies_to" "CouponAppliesTo" NOT NULL DEFAULT 'NOTE';

-- CreateTable
CREATE TABLE "coupon_physical_documents" (
    "coupon_id" TEXT NOT NULL,
    "physical_document_id" TEXT NOT NULL,

    CONSTRAINT "coupon_physical_documents_pkey" PRIMARY KEY ("coupon_id","physical_document_id")
);

-- CreateTable
CREATE TABLE "shipping_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "delivery_charge" DECIMAL(10,2) NOT NULL DEFAULT 50,
    "free_delivery_threshold" DECIMAL(10,2),
    "processing_days" INTEGER NOT NULL DEFAULT 2,
    "shipping_days" INTEGER NOT NULL DEFAULT 3,
    "shipping_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "physical_documents" (
    "id" TEXT NOT NULL,
    "source_note_id" TEXT,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cover_storage_key" TEXT,
    "source_pdf_key" TEXT,
    "page_count" INTEGER,
    "paper_size" "PaperSize" NOT NULL DEFAULT 'A4',
    "paper_type" "PaperType" NOT NULL DEFAULT 'NORMAL',
    "print_type" "PrintType" NOT NULL DEFAULT 'BLACK_WHITE',
    "binding_type" "BindingType" NOT NULL DEFAULT 'NONE',
    "printing_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "binding_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "packaging_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "base_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "final_price" DECIMAL(10,2) NOT NULL,
    "price_override" BOOLEAN NOT NULL DEFAULT false,
    "min_quantity" INTEGER NOT NULL DEFAULT 1,
    "max_quantity" INTEGER NOT NULL DEFAULT 10,
    "processing_days" INTEGER NOT NULL DEFAULT 2,
    "status" "PublishStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "physical_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "physical_cart_meta" (
    "user_id" TEXT NOT NULL,
    "coupon_code" TEXT,

    CONSTRAINT "physical_cart_meta_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "physical_cart_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "physical_document_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "print_type" "PrintType" NOT NULL,
    "paper_type" "PaperType" NOT NULL,
    "binding_type" "BindingType" NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "physical_cart_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_addresses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address_line_1" TEXT NOT NULL,
    "address_line_2" TEXT,
    "landmark" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "physical_orders" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "coupon_discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "delivery_charge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "coupon_id" TEXT,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "fulfillment_status" "PhysicalFulfillmentStatus" NOT NULL DEFAULT 'ORDER_PLACED',
    "print_status" "PhysicalPrintStatus" NOT NULL DEFAULT 'PENDING_PRINT',
    "shipping_status" "PhysicalShippingStatus" NOT NULL DEFAULT 'NOT_SHIPPED',
    "refund_status" "PhysicalRefundStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
    "cashfree_order_id" TEXT,
    "payment_txn_id" TEXT,
    "idempotency_key" TEXT,
    "expected_delivery" TIMESTAMP(3),
    "courier_name" TEXT,
    "tracking_number" TEXT,
    "tracking_url" TEXT,
    "shipping_date" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "package_weight" TEXT,
    "package_dimensions" TEXT,
    "package_count" INTEGER,
    "packaging_notes" TEXT,
    "qc_failure_reason" TEXT,
    "cancel_reason" TEXT,
    "student_name_snap" TEXT NOT NULL,
    "student_email_snap" TEXT NOT NULL,
    "student_phone_snap" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "physical_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "physical_order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "physical_document_id" TEXT,
    "document_name_snap" TEXT NOT NULL,
    "document_title_snap" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "page_count_snap" INTEGER,
    "print_type" "PrintType" NOT NULL,
    "paper_type" "PaperType" NOT NULL,
    "binding_type" "BindingType" NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "physical_order_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "physical_order_addresses" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "alt_phone" TEXT,
    "address_line_1" TEXT NOT NULL,
    "address_line_2" TEXT,
    "landmark" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "physical_order_addresses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "physical_order_status_history" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "changed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "physical_order_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "printing_jobs" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "status" "PhysicalPrintStatus" NOT NULL DEFAULT 'PENDING_PRINT',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "print_started_at" TIMESTAMP(3),
    "print_completed_at" TIMESTAMP(3),
    "qc_status" TEXT,
    "qc_reason" TEXT,
    "printed_by" TEXT,
    "qc_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "printing_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "courier_name" TEXT,
    "tracking_number" TEXT,
    "tracking_url" TEXT,
    "shipping_date" TIMESTAMP(3),
    "expected_delivery_date" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "shipping_status" "PhysicalShippingStatus" NOT NULL DEFAULT 'NOT_SHIPPED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "physical_order_refunds" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "refund_amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "PhysicalRefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "payment_refund_id" TEXT,
    "requested_by" TEXT,
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "physical_order_refunds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "physical_coupon_redemptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "coupon_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "physical_coupon_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- Indexes & uniques
CREATE UNIQUE INDEX "physical_cart_items_user_id_physical_document_id_print_type_paper_type_binding_type_key" ON "physical_cart_items"("user_id", "physical_document_id", "print_type", "paper_type", "binding_type");
CREATE INDEX "physical_documents_status_idx" ON "physical_documents"("status");
CREATE INDEX "user_addresses_user_id_idx" ON "user_addresses"("user_id");
CREATE UNIQUE INDEX "physical_orders_order_number_key" ON "physical_orders"("order_number");
CREATE UNIQUE INDEX "physical_orders_cashfree_order_id_key" ON "physical_orders"("cashfree_order_id");
CREATE UNIQUE INDEX "physical_orders_idempotency_key_key" ON "physical_orders"("idempotency_key");
CREATE INDEX "physical_orders_user_id_idx" ON "physical_orders"("user_id");
CREATE INDEX "physical_orders_created_at_idx" ON "physical_orders"("created_at");
CREATE INDEX "physical_orders_fulfillment_status_idx" ON "physical_orders"("fulfillment_status");
CREATE INDEX "physical_orders_payment_status_idx" ON "physical_orders"("payment_status");
CREATE INDEX "physical_order_items_order_id_idx" ON "physical_order_items"("order_id");
CREATE UNIQUE INDEX "physical_order_addresses_order_id_key" ON "physical_order_addresses"("order_id");
CREATE INDEX "physical_order_status_history_order_id_idx" ON "physical_order_status_history"("order_id");
CREATE UNIQUE INDEX "printing_jobs_order_id_key" ON "printing_jobs"("order_id");
CREATE UNIQUE INDEX "shipments_order_id_key" ON "shipments"("order_id");
CREATE INDEX "physical_order_refunds_order_id_idx" ON "physical_order_refunds"("order_id");
CREATE UNIQUE INDEX "physical_coupon_redemptions_order_id_key" ON "physical_coupon_redemptions"("order_id");
CREATE UNIQUE INDEX "physical_coupon_redemptions_user_id_coupon_id_key" ON "physical_coupon_redemptions"("user_id", "coupon_id");
CREATE INDEX "admin_audit_logs_entity_entity_id_idx" ON "admin_audit_logs"("entity", "entity_id");
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at");

-- Foreign keys
ALTER TABLE "coupon_physical_documents" ADD CONSTRAINT "coupon_physical_documents_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "coupon_physical_documents" ADD CONSTRAINT "coupon_physical_documents_physical_document_id_fkey" FOREIGN KEY ("physical_document_id") REFERENCES "physical_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "physical_documents" ADD CONSTRAINT "physical_documents_source_note_id_fkey" FOREIGN KEY ("source_note_id") REFERENCES "notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "physical_cart_meta" ADD CONSTRAINT "physical_cart_meta_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "physical_cart_items" ADD CONSTRAINT "physical_cart_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "physical_cart_items" ADD CONSTRAINT "physical_cart_items_physical_document_id_fkey" FOREIGN KEY ("physical_document_id") REFERENCES "physical_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "physical_orders" ADD CONSTRAINT "physical_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "physical_orders" ADD CONSTRAINT "physical_orders_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "physical_order_items" ADD CONSTRAINT "physical_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "physical_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "physical_order_items" ADD CONSTRAINT "physical_order_items_physical_document_id_fkey" FOREIGN KEY ("physical_document_id") REFERENCES "physical_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "physical_order_addresses" ADD CONSTRAINT "physical_order_addresses_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "physical_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "physical_order_status_history" ADD CONSTRAINT "physical_order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "physical_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "printing_jobs" ADD CONSTRAINT "printing_jobs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "physical_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "physical_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "physical_order_refunds" ADD CONSTRAINT "physical_order_refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "physical_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "physical_coupon_redemptions" ADD CONSTRAINT "physical_coupon_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "physical_coupon_redemptions" ADD CONSTRAINT "physical_coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "physical_coupon_redemptions" ADD CONSTRAINT "physical_coupon_redemptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "physical_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "shipping_settings" ("id", "delivery_charge", "processing_days", "shipping_days", "shipping_enabled", "updated_at")
VALUES ('default', 50, 2, 3, true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
