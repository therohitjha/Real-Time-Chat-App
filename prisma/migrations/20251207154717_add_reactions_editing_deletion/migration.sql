-- CreateTable
CREATE TABLE "MessageReaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT,
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "status" TEXT NOT NULL DEFAULT 'sent',
    "deliveredAt" DATETIME,
    "readAt" DATETIME,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" DATETIME,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "replyToId" TEXT,
    CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Message" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("chatId", "ciphertext", "createdAt", "deliveredAt", "id", "iv", "messageType", "readAt", "recipientId", "replyToId", "senderId", "status", "updatedAt") SELECT "chatId", "ciphertext", "createdAt", "deliveredAt", "id", "iv", "messageType", "readAt", "recipientId", "replyToId", "senderId", "status", "updatedAt" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE INDEX "Message_chatId_createdAt_idx" ON "Message"("chatId", "createdAt");
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");
CREATE INDEX "Message_recipientId_idx" ON "Message"("recipientId");
CREATE INDEX "Message_status_idx" ON "Message"("status");
CREATE INDEX "Message_expiresAt_idx" ON "Message"("expiresAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "MessageReaction_messageId_idx" ON "MessageReaction"("messageId");

-- CreateIndex
CREATE INDEX "MessageReaction_userId_idx" ON "MessageReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageReaction_messageId_userId_emoji_key" ON "MessageReaction"("messageId", "userId", "emoji");
