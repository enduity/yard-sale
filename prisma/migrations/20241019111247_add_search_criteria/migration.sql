/*
  Warnings:

  - You are about to drop the column `maxDaysListed` on the `Search` table. All the data in the column will be lost.
*/

-- CreateTable
CREATE TABLE "SearchCriteria" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "maxDaysListed" INTEGER,
    "condition" TEXT,
    "searchId" INTEGER NOT NULL,
    CONSTRAINT "SearchCriteria_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "Search" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Insert existing maxDaysListed values into the new SearchCriteria table
INSERT INTO "SearchCriteria" ("maxDaysListed", "searchId")
SELECT "maxDaysListed", "id"
FROM "Search"
WHERE "maxDaysListed" IS NOT NULL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Search" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "query" TEXT NOT NULL,
    "time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Search" ("id", "query", "time") SELECT "id", "query", "time" FROM "Search";
DROP TABLE "Search";
ALTER TABLE "new_Search" RENAME TO "Search";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "SearchCriteria_searchId_key" ON "SearchCriteria"("searchId");
