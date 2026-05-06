-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "steamId" TEXT,
    "mapName" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filePath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scoreT" INTEGER NOT NULL DEFAULT 0,
    "scoreCt" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "parsedAt" DATETIME,
    "errorMsg" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "roundNum" INTEGER NOT NULL,
    "winner" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "tScore" INTEGER NOT NULL,
    "ctScore" INTEGER NOT NULL,
    CONSTRAINT "Round_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Kill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "tick" INTEGER NOT NULL,
    "attackerSteamId" TEXT NOT NULL,
    "victimSteamId" TEXT NOT NULL,
    "weapon" TEXT NOT NULL,
    "headshot" BOOLEAN NOT NULL DEFAULT false,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "z" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "Kill_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerPosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "tick" INTEGER NOT NULL,
    "steamId" TEXT NOT NULL,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "yaw" REAL NOT NULL,
    CONSTRAINT "PlayerPosition_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GrenadeEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "tick" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "steamId" TEXT NOT NULL,
    "trajectoryJson" TEXT NOT NULL,
    CONSTRAINT "GrenadeEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Damage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "tick" INTEGER NOT NULL,
    "attackerSteamId" TEXT NOT NULL,
    "victimSteamId" TEXT NOT NULL,
    "damage" REAL NOT NULL,
    "hitgroup" TEXT NOT NULL,
    CONSTRAINT "Damage_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerMatchStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "steamId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL DEFAULT '',
    "team" TEXT NOT NULL DEFAULT '',
    "kills" INTEGER NOT NULL DEFAULT 0,
    "deaths" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "adr" REAL NOT NULL DEFAULT 0,
    "hsPct" REAL NOT NULL DEFAULT 0,
    "flashAssists" INTEGER NOT NULL DEFAULT 0,
    "utilDamage" REAL NOT NULL DEFAULT 0,
    "rating" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "PlayerMatchStat_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
