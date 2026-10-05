-- AlterTable
ALTER TABLE "purchases" ADD COLUMN "user_edited" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "desired_items" ADD COLUMN "user_edited" BOOLEAN NOT NULL DEFAULT false;
