-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PlayerPosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "tick" INTEGER NOT NULL,
    "steamId" TEXT NOT NULL,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "z" REAL NOT NULL DEFAULT 0,
    "yaw" REAL NOT NULL,
    CONSTRAINT "PlayerPosition_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PlayerPosition" ("id", "matchId", "steamId", "tick", "x", "y", "yaw") SELECT "id", "matchId", "steamId", "tick", "x", "y", "yaw" FROM "PlayerPosition";
DROP TABLE "PlayerPosition";
ALTER TABLE "new_PlayerPosition" RENAME TO "PlayerPosition";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
