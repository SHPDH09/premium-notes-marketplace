ALTER TABLE "placement_subscription_plans" ADD COLUMN "price_amount" DECIMAL(10,2) NOT NULL DEFAULT 0;

CREATE TABLE "placement_plan_orders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "cashfree_order_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "placement_plan_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "placement_plan_orders_cashfree_order_id_key" ON "placement_plan_orders"("cashfree_order_id");
CREATE INDEX "placement_plan_orders_user_id_idx" ON "placement_plan_orders"("user_id");

ALTER TABLE "placement_plan_orders" ADD CONSTRAINT "placement_plan_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "placement_plan_orders" ADD CONSTRAINT "placement_plan_orders_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "placement_subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
