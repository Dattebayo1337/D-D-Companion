CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "Content_russian_fts" ON "Content" USING GIN (to_tsvector('russian', "searchText"));
CREATE INDEX "Content_search_trgm" ON "Content" USING GIN ("searchText" gin_trgm_ops);
