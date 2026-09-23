-- AlterTable
ALTER TABLE "purchases" DROP CONSTRAINT "purchases_source_email_connection_id_fkey";
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_source_email_connection_id_fkey" FOREIGN KEY ("source_email_connection_id") REFERENCES "email_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "wardrobe_items" DROP CONSTRAINT "wardrobe_items_source_purchase_id_fkey";
ALTER TABLE "wardrobe_items" ADD CONSTRAINT "wardrobe_items_source_purchase_id_fkey" FOREIGN KEY ("source_purchase_id") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
