/**
 * Prisma Database Service
 * Handles all database operations with Prisma ORM
 */

import { PrismaClient } from "@prisma/client";

// Create Prisma client with logging in development
const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
});

// Type definitions
interface CreateUserInput {
  username: string;
  email: string;
  displayName: string;
  passwordHash: string;
  publicKey?: string | null;
}

interface CreateSessionInput {
  userId: string;
  token: string;
  deviceInfo?: string;
  ipAddress?: string;
  expiresAt: Date;
}

interface CreateChatInput {
  name?: string;
  isGroup?: boolean;
  participants: string[];
}

interface CreateMessageInput {
  chatId: string;
  senderId: string;
  recipientId?: string;
  ciphertext: string;
  iv: string;
  messageType?: string;
}

interface CreateAuditLogInput {
  userId?: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
}

// ============================================
// User Operations
// ============================================

export async function createUser({
  username,
  email,
  displayName,
  passwordHash,
  publicKey,
}: CreateUserInput) {
  return prisma.user.create({
    data: {
      username,
      email,
      displayName,
      passwordHash,
      publicKey,
    },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      createdAt: true,
    },
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function findUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username },
  });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      publicKey: true,
      isOnline: true,
      lastSeen: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function updateUser(
  id: string,
  data: { displayName?: string; avatarUrl?: string }
) {
  return prisma.user.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      publicKey: true,
      updatedAt: true,
    },
  });
}

export async function updateUserPassword(id: string, passwordHash: string) {
  return prisma.user.update({
    where: { id },
    data: {
      passwordHash,
      updatedAt: new Date(),
    },
  });
}

export async function updatePublicKey(userId: string, publicKey: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { publicKey },
  });
}

export async function getPublicKey(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { publicKey: true },
  });
  return user?.publicKey ?? null;
}

export async function setUserOnline(userId: string, isOnline: boolean) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      isOnline,
      lastSeen: new Date(),
    },
  });
}

export async function searchUsers(
  query: string,
  excludeUserId: string,
  limit: number = 20
) {
  return prisma.user.findMany({
    where: {
      AND: [
        { id: { not: excludeUserId } },
        {
          OR: [
            { username: { contains: query } },
            { email: { contains: query } },
            { displayName: { contains: query } },
          ],
        },
      ],
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      isOnline: true,
    },
    take: limit,
  });
}

// ============================================
// Session Operations
// ============================================

export async function createSession({
  userId,
  token,
  deviceInfo,
  ipAddress,
  expiresAt,
}: CreateSessionInput) {
  return prisma.session.create({
    data: {
      userId,
      token,
      deviceInfo,
      ipAddress,
      expiresAt,
    },
  });
}

export async function findSessionByToken(token: string) {
  return prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
}

export async function deleteSession(token: string) {
  return prisma.session.deleteMany({
    where: { token },
  });
}

export async function deleteUserSessions(userId: string) {
  return prisma.session.deleteMany({
    where: { userId },
  });
}

export async function cleanExpiredSessions() {
  return prisma.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
}

// ============================================
// Chat Operations
// ============================================

export async function createChat({
  name,
  isGroup = false,
  participants,
}: CreateChatInput) {
  return prisma.chat.create({
    data: {
      name,
      isGroup,
      participants: {
        create: participants.map((userId) => ({
          userId,
          role: "member",
        })),
      },
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              isOnline: true,
            },
          },
        },
      },
    },
  });
}

export async function findOrCreateDirectChat(userId1: string, userId2: string) {
  const existingChat = await prisma.chat.findFirst({
    where: {
      isGroup: false,
      AND: [
        { participants: { some: { userId: userId1 } } },
        { participants: { some: { userId: userId2 } } },
      ],
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              isOnline: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (existingChat) {
    return existingChat;
  }

  return createChat({
    isGroup: false,
    participants: [userId1, userId2],
  });
}

export async function getUserChats(userId: string) {
  return prisma.chat.findMany({
    where: {
      participants: {
        some: {
          userId,
          leftAt: null,
        },
      },
    },
    include: {
      participants: {
        where: { leftAt: null },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              isOnline: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          ciphertext: true,
          iv: true,
          messageType: true,
          status: true,
          createdAt: true,
          sender: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

export async function getChatById(chatId: string, userId: string) {
  return prisma.chat.findFirst({
    where: {
      id: chatId,
      participants: {
        some: {
          userId,
          leftAt: null,
        },
      },
    },
    include: {
      participants: {
        where: { leftAt: null },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              isOnline: true,
              publicKey: true,
            },
          },
        },
      },
    },
  });
}

// ============================================
// Message Operations
// ============================================

export async function createMessage({
  chatId,
  senderId,
  recipientId,
  ciphertext,
  iv,
  messageType = "text",
}: CreateMessageInput) {
  const message = await prisma.message.create({
    data: {
      chatId,
      senderId,
      recipientId,
      ciphertext,
      iv,
      messageType,
      status: "sent",
    },
    include: {
      sender: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  await prisma.chat.update({
    where: { id: chatId },
    data: { updatedAt: new Date() },
  });

  return message;
}

interface GetChatMessagesOptions {
  limit?: number;
  before?: string | null;
}

export async function getChatMessages(
  chatId: string,
  userId: string,
  options: GetChatMessagesOptions = {}
) {
  const { limit = 50, before = null } = options;

  const isParticipant = await prisma.chatParticipant.findFirst({
    where: { chatId, userId, leftAt: null },
  });

  if (!isParticipant) {
    throw new Error("Not a participant of this chat");
  }

  const whereClause: { chatId: string; createdAt?: { lt: Date } } = { chatId };
  if (before) {
    whereClause.createdAt = { lt: new Date(before) };
  }

  return prisma.message.findMany({
    where: whereClause,
    include: {
      sender: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      attachments: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function updateMessageStatus(
  messageId: string,
  status: string,
  userId: string
) {
  const updateData: { status: string; deliveredAt?: Date; readAt?: Date } = {
    status,
  };

  if (status === "delivered") {
    updateData.deliveredAt = new Date();
  } else if (status === "read") {
    updateData.readAt = new Date();
    updateData.deliveredAt = new Date();
  }

  return prisma.message.updateMany({
    where: {
      id: messageId,
      recipientId: userId,
    },
    data: updateData,
  });
}

export async function markChatMessagesAsRead(chatId: string, userId: string) {
  return prisma.message.updateMany({
    where: {
      chatId,
      recipientId: userId,
      status: { not: "read" },
    },
    data: {
      status: "read",
      readAt: new Date(),
    },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.message.count({
    where: {
      recipientId: userId,
      status: { not: "read" },
    },
  });
}

export async function getUnreadCountPerChat(
  userId: string
): Promise<Record<string, number>> {
  const unreadCounts = await prisma.message.groupBy({
    by: ["chatId"],
    where: {
      recipientId: userId,
      status: { not: "read" },
    },
    _count: true,
  });

  const result: Record<string, number> = {};
  for (const item of unreadCounts) {
    result[item.chatId] = item._count;
  }
  return result;
}

// ============================================
// Audit Log Operations
// ============================================

export async function createAuditLog({
  userId,
  action,
  ipAddress,
  userAgent,
  metadata,
}: CreateAuditLogInput) {
  return prisma.auditLog.create({
    data: {
      userId,
      action,
      ipAddress,
      userAgent,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

export async function getUserAuditLogs(userId: string, limit: number = 50) {
  return prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// ============================================
// Rate Limiting Operations
// ============================================

export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - windowMs);

  const existing = await prisma.rateLimitRecord.findUnique({
    where: {
      identifier_endpoint: { identifier, endpoint },
    },
  });

  if (existing) {
    if (existing.windowStart < windowStart) {
      await prisma.rateLimitRecord.update({
        where: { id: existing.id },
        data: {
          count: 1,
          windowStart: new Date(),
        },
      });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    if (existing.count >= maxRequests) {
      const retryAfter = existing.windowStart.getTime() + windowMs - Date.now();
      return { allowed: false, remaining: 0, retryAfter };
    }

    await prisma.rateLimitRecord.update({
      where: { id: existing.id },
      data: { count: existing.count + 1 },
    });

    return { allowed: true, remaining: maxRequests - existing.count - 1 };
  }

  await prisma.rateLimitRecord.create({
    data: {
      identifier,
      endpoint,
      count: 1,
      windowStart: new Date(),
    },
  });

  return { allowed: true, remaining: maxRequests - 1 };
}

export async function cleanRateLimitRecords(
  olderThanMs: number = 24 * 60 * 60 * 1000
) {
  const cutoff = new Date(Date.now() - olderThanMs);
  return prisma.rateLimitRecord.deleteMany({
    where: {
      windowStart: { lt: cutoff },
    },
  });
}

// ============================================
// Message Reaction Operations
// ============================================

export async function addReaction(
  messageId: string,
  userId: string,
  emoji: string
) {
  return prisma.messageReaction.upsert({
    where: {
      messageId_userId_emoji: { messageId, userId, emoji },
    },
    create: {
      messageId,
      userId,
      emoji,
    },
    update: {},
  });
}

export async function removeReaction(
  messageId: string,
  userId: string,
  emoji: string
) {
  return prisma.messageReaction.deleteMany({
    where: {
      messageId,
      userId,
      emoji,
    },
  });
}

export async function getMessageReactions(messageId: string) {
  return prisma.messageReaction.findMany({
    where: { messageId },
    include: {
      message: {
        select: { senderId: true },
      },
    },
  });
}

export async function getReactionCounts(
  messageId: string
): Promise<Record<string, number>> {
  const reactions = await prisma.messageReaction.groupBy({
    by: ["emoji"],
    where: { messageId },
    _count: true,
  });

  const result: Record<string, number> = {};
  for (const item of reactions) {
    result[item.emoji] = item._count;
  }
  return result;
}

// ============================================
// Message Editing and Deletion
// ============================================

export async function editMessage(
  messageId: string,
  senderId: string,
  newCiphertext: string,
  newIv: string
) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message || message.senderId !== senderId) {
    throw new Error("Message not found or unauthorized");
  }

  if (message.isDeleted) {
    throw new Error("Cannot edit deleted message");
  }

  return prisma.message.update({
    where: { id: messageId },
    data: {
      ciphertext: newCiphertext,
      iv: newIv,
      isEdited: true,
      editedAt: new Date(),
    },
  });
}

export async function deleteMessage(messageId: string, senderId: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message || message.senderId !== senderId) {
    throw new Error("Message not found or unauthorized");
  }

  return prisma.message.update({
    where: { id: messageId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      ciphertext: "", // Clear the encrypted content
      iv: "",
    },
  });
}

export async function setMessageExpiry(
  messageId: string,
  senderId: string,
  expiresAt: Date
) {
  return prisma.message.updateMany({
    where: {
      id: messageId,
      senderId,
    },
    data: {
      expiresAt,
    },
  });
}

export async function cleanExpiredMessages() {
  return prisma.message.updateMany({
    where: {
      expiresAt: { lt: new Date() },
      isDeleted: false,
    },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      ciphertext: "",
      iv: "",
    },
  });
}

// ============================================
// Cleanup and Maintenance
// ============================================

export async function runCleanup() {
  const results = {
    expiredSessions: await cleanExpiredSessions(),
    oldRateLimits: await cleanRateLimitRecords(),
    expiredMessages: await cleanExpiredMessages(),
  };
  return results;
}

// Export prisma instance
export { prisma };
