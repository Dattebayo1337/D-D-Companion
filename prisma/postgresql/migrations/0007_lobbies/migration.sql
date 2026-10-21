CREATE TABLE "Lobby" (
 "id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "campaignId" TEXT,
 "characterIds" JSONB NOT NULL, "notes" TEXT NOT NULL DEFAULT '',
 "inviteHash" TEXT NOT NULL, "version" INTEGER NOT NULL DEFAULT 1,
 "closed" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Lobby_inviteHash_key" ON "Lobby"("inviteHash");
CREATE TABLE "LobbyMember" (
 "id" TEXT NOT NULL PRIMARY KEY, "lobbyId" TEXT NOT NULL, "name" TEXT NOT NULL,
 "tokenHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "revoked" BOOLEAN NOT NULL DEFAULT false,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "LobbyMember_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "Lobby"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LobbyMember_tokenHash_key" ON "LobbyMember"("tokenHash");
CREATE INDEX "LobbyMember_lobbyId_idx" ON "LobbyMember"("lobbyId");

