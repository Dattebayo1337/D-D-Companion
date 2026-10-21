CREATE TABLE "Encounter" ("id" TEXT NOT NULL PRIMARY KEY,"name" TEXT NOT NULL,"edition" TEXT NOT NULL,"campaignId" TEXT,"version" INTEGER NOT NULL DEFAULT 1,"data" JSONB NOT NULL,"archived" BOOLEAN NOT NULL DEFAULT false,"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" DATETIME NOT NULL,CONSTRAINT "Encounter_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE);
CREATE INDEX "Encounter_edition_archived_idx" ON "Encounter"("edition","archived");
CREATE INDEX "Encounter_campaignId_idx" ON "Encounter"("campaignId");
