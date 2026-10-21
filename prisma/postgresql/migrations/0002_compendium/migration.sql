CREATE TABLE "Reference" ("contentId" TEXT NOT NULL PRIMARY KEY, "category" TEXT NOT NULL, "parentId" TEXT, "details" JSONB NOT NULL, CONSTRAINT "Reference_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content" ("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE INDEX "Reference_category_idx" ON "Reference"("category");
