-- CreateIndex
CREATE UNIQUE INDEX "email_connections_user_id_provider_key" ON "email_connections"("user_id", "provider");
