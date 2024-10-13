-- CreateTable
CREATE TABLE "QueueProcess" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "searchId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "started" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended" DATETIME,
    CONSTRAINT "QueueProcess_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "Search" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "QueueProcess_searchId_key" ON "QueueProcess"("searchId");
