CREATE TABLE "Character" ("id" TEXT NOT NULL PRIMARY KEY,"name" TEXT NOT NULL,"edition" TEXT NOT NULL,"version" INTEGER NOT NULL DEFAULT 1,"data" JSONB NOT NULL,"archived" BOOLEAN NOT NULL DEFAULT false,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "Character_edition_archived_idx" ON "Character"("edition","archived");
