CREATE TABLE "Campaign" ("id" TEXT NOT NULL PRIMARY KEY,"name" TEXT NOT NULL,"editionMode" TEXT NOT NULL,"version" INTEGER NOT NULL DEFAULT 1,"data" JSONB NOT NULL,"archived" BOOLEAN NOT NULL DEFAULT false,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "Campaign_editionMode_archived_idx" ON "Campaign"("editionMode","archived");
