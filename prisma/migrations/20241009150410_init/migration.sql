-- CreateTable
CREATE TABLE "Listing" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "source" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "location" TEXT NOT NULL,
    "thumbnailId" INTEGER,
    "searchId" INTEGER NOT NULL,
    CONSTRAINT "Listing_thumbnailId_fkey" FOREIGN KEY ("thumbnailId") REFERENCES "Thumbnail" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Listing_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "Search" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Thumbnail" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "image" BLOB NOT NULL
);

-- CreateTable
CREATE TABLE "Search" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "query" TEXT NOT NULL,
    "time" DATETIME NOT NULL
);
