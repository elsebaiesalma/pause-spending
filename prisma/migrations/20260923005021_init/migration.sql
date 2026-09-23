-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_connections" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "encrypted_token" JSONB NOT NULL,
    "sync_cursor" TEXT,
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'connected',

    CONSTRAINT "email_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source_email_connection_id" UUID,
    "merchant" TEXT NOT NULL,
    "order_date" DATE NOT NULL,
    "item_name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "category" TEXT NOT NULL,
    "image_url" TEXT,
    "product_link" TEXT,
    "source_email_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wardrobe_items" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source_purchase_id" UUID,
    "item_name" TEXT NOT NULL,
    "image_url" TEXT,
    "category" TEXT,
    "primary_color" TEXT,
    "secondary_color" TEXT,
    "style_tags" TEXT[],
    "use_case_tags" TEXT[],
    "owned_since" DATE,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "wardrobe_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "desired_items" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source_type" TEXT NOT NULL,
    "raw_input" TEXT,
    "item_name" TEXT,
    "price" DECIMAL(10,2),
    "image_url" TEXT,
    "category" TEXT,
    "primary_color" TEXT,
    "style_tags" TEXT[],
    "user_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "pause_status" TEXT NOT NULL DEFAULT 'pending_confirmation',
    "wait_until" TIMESTAMP(3),
    "decision_outcome" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "desired_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "month" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "category_scope" TEXT NOT NULL DEFAULT 'clothing_shoes_accessories',

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "budgets_user_id_month_key" ON "budgets"("user_id", "month");

-- AddForeignKey
ALTER TABLE "email_connections" ADD CONSTRAINT "email_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_source_email_connection_id_fkey" FOREIGN KEY ("source_email_connection_id") REFERENCES "email_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wardrobe_items" ADD CONSTRAINT "wardrobe_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wardrobe_items" ADD CONSTRAINT "wardrobe_items_source_purchase_id_fkey" FOREIGN KEY ("source_purchase_id") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desired_items" ADD CONSTRAINT "desired_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

