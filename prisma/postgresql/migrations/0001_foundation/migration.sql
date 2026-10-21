-- CreateTable
CREATE TABLE "Edition" (
    "id" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,

    CONSTRAINT "Edition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceBook" (
    "id" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "fullNameRu" TEXT NOT NULL,
    "fullNameOriginal" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "releaseDate" TEXT,
    "contentType" TEXT NOT NULL,
    "licenseType" TEXT NOT NULL,

    CONSTRAINT "SourceBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Content" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "nameOriginal" TEXT NOT NULL,
    "descriptionRu" TEXT NOT NULL,
    "descriptionOriginal" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "sourceBookId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourcePage" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "rulesVersion" TEXT NOT NULL,
    "translationStatus" TEXT NOT NULL,
    "contentOrigin" TEXT NOT NULL,
    "aliases" JSONB NOT NULL,
    "tags" JSONB NOT NULL,
    "contentVersion" INTEGER NOT NULL,
    "errataVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "searchText" TEXT NOT NULL,

    CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Spell" (
    "contentId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "school" TEXT NOT NULL,
    "ritual" BOOLEAN NOT NULL,
    "concentration" BOOLEAN NOT NULL,
    "castingTime" TEXT NOT NULL,
    "rangeFeet" DOUBLE PRECISION NOT NULL,
    "damageType" TEXT,
    "savingThrow" TEXT,
    "details" JSONB NOT NULL,

    CONSTRAINT "Spell_pkey" PRIMARY KEY ("contentId")
);

-- CreateTable
CREATE TABLE "Monster" (
    "contentId" TEXT NOT NULL,
    "challengeRating" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "armorClass" INTEGER NOT NULL,
    "hitPoints" INTEGER NOT NULL,
    "details" JSONB NOT NULL,

    CONSTRAINT "Monster_pkey" PRIMARY KEY ("contentId")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "count" INTEGER NOT NULL,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentRevision" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "contentVersion" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentRelation" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,

    CONSTRAINT "ContentRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TermTranslation" (
    "id" TEXT NOT NULL,
    "original" TEXT NOT NULL,
    "russian" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "aliases" JSONB NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TermTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalizationOverride" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "originalValue" TEXT NOT NULL,
    "customValue" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "LocalizationOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Content_editionId_kind_translationStatus_idx" ON "Content"("editionId", "kind", "translationStatus");

-- CreateIndex
CREATE INDEX "Content_sourceBookId_idx" ON "Content"("sourceBookId");

-- CreateIndex
CREATE INDEX "Spell_level_school_idx" ON "Spell"("level", "school");

-- CreateIndex
CREATE INDEX "Monster_challengeRating_type_size_idx" ON "Monster"("challengeRating", "type", "size");

-- CreateIndex
CREATE UNIQUE INDEX "ContentRevision_contentId_contentVersion_key" ON "ContentRevision"("contentId", "contentVersion");

-- CreateIndex
CREATE UNIQUE INDEX "ContentRelation_sourceId_targetId_relationType_key" ON "ContentRelation"("sourceId", "targetId", "relationType");

-- CreateIndex
CREATE UNIQUE INDEX "TermTranslation_original_category_editionId_key" ON "TermTranslation"("original", "category", "editionId");

-- CreateIndex
CREATE UNIQUE INDEX "LocalizationOverride_entityId_field_userId_key" ON "LocalizationOverride"("entityId", "field", "userId");

-- AddForeignKey
ALTER TABLE "SourceBook" ADD CONSTRAINT "SourceBook_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_sourceBookId_fkey" FOREIGN KEY ("sourceBookId") REFERENCES "SourceBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spell" ADD CONSTRAINT "Spell_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Monster" ADD CONSTRAINT "Monster_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRevision" ADD CONSTRAINT "ContentRevision_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRevision" ADD CONSTRAINT "ContentRevision_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRelation" ADD CONSTRAINT "ContentRelation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Content"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRelation" ADD CONSTRAINT "ContentRelation_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Content"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermTranslation" ADD CONSTRAINT "TermTranslation_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalizationOverride" ADD CONSTRAINT "LocalizationOverride_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Content"("id") ON DELETE RESTRICT ON UPDATE CASCADE;