/**
 * Socket.IO Event Handlers
 * Handles real-time messaging events
 */

import { Server, Socket } from "socket.io";
import { verifyToken } from "../utils/helpers";
import * as db from "../database";

// Type definitions
interface SocketUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
}

interface AuthenticatedSocket extends Socket {
  userId: string;
  user: SocketUser;
}

// Connected users map
const connectedUsers = new Map<string, string>(); // userId -> socketId

/**
 * Initialize Socket.IO event handlers
 */
export function initializeSocketHandlers(io: Server): void {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace("Bearer ", "") ||
        parseCookie(socket.handshake.headers.cookie || "").auth_token;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return next(new Error("Invalid token"));
      }

      const session = await db.findSessionByToken(token);
      if (!session || session.expiresAt < new Date()) {
        return next(new Error("Session expired"));
      }

      const user = await db.findUserById(decoded.userId);
      if (!user) {
        return next(new Error("User not found"));
      }

      (socket as AuthenticatedSocket).userId = decoded.userId;
      (socket as AuthenticatedSocket).user = {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
      };

      next();
    } catch (_error) {
      next(new Error("Authentication failed"));
    }
  });

  // Connection handler
  io.on("connection", async (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const userId = authSocket.userId;
    const user = authSocket.user;

    console.log(`User connected: ${user.displayName} (${userId})`);

    // Track connected user
    connectedUsers.set(userId, socket.id);

    // Update online status
    await db.setUserOnline(userId, true);

    // Notify others that user is online
    socket.broadcast.emit("user_online", {
      userId,
      displayName: user.displayName,
    });

    // Join user's chat rooms
    const chats = await db.getUserChats(userId);
    for (const chat of chats) {
      socket.join(`chat:${chat.id}`);
    }

    // Register public key
    socket.on("register_public_key", async (data: { publicKey: string }) => {
      try {
        await db.updatePublicKey(userId, data.publicKey);
        socket.emit("public_key_registered", { success: true });
      } catch (error) {
        console.error("Error registering public key:", error);
        socket.emit("error", { message: "Failed to register public key" });
      }
    });

    // Request public key
    socket.on("request_public_key", async (data: { recipientId: string }) => {
      try {
        const publicKey = await db.getPublicKey(data.recipientId);
        socket.emit("public_key_response", {
          recipientId: data.recipientId,
          publicKey,
        });
      } catch (error) {
        console.error("Error getting public key:", error);
        socket.emit("error", { message: "Failed to get public key" });
      }
    });

    // Encrypted message
    socket.on(
      "encrypted_message",
      async (data: {
        chatId: string;
        recipientId: string;
        ciphertext: string;
        iv: string;
        messageType?: string;
        tempId?: string;
      }) => {
        try {
          // Create message in database
          const message = await db.createMessage({
            chatId: data.chatId,
            senderId: userId,
            recipientId: data.recipientId,
            ciphertext: data.ciphertext,
            iv: data.iv,
            messageType: data.messageType || "text",
          });

          const messagePayload = {
            ...message,
            tempId: data.tempId,
          };

          // Send to chat room
          io.to(`chat:${data.chatId}`).emit(
            "encrypted_message",
            messagePayload
          );

          // If recipient is online, send directly too
          const recipientSocketId = connectedUsers.get(data.recipientId);
          if (recipientSocketId) {
            io.to(recipientSocketId).emit("encrypted_message", messagePayload);
          }
        } catch (error) {
          console.error("Error sending message:", error);
          socket.emit("error", { message: "Failed to send message" });
        }
      }
    );

    // Add Reaction
    socket.on(
      "add_reaction",
      async (data: { messageId: string; emoji: string }) => {
        try {
          await db.addReaction(data.messageId, userId, data.emoji);

          // Find chat ID for the message
          const message = await db.prisma.message.findUnique({
            where: { id: data.messageId },
            select: { chatId: true },
          });

          if (message) {
            io.to(`chat:${message.chatId}`).emit("reaction_added", {
              messageId: data.messageId,
              userId,
              emoji: data.emoji,
            });
          }
        } catch (error) {
          console.error("Error adding reaction:", error);
        }
      }
    );

    // Remove Reaction
    socket.on(
      "remove_reaction",
      async (data: { messageId: string; emoji: string }) => {
        try {
          await db.removeReaction(data.messageId, userId, data.emoji);

          const message = await db.prisma.message.findUnique({
            where: { id: data.messageId },
            select: { chatId: true },
          });

          if (message) {
            io.to(`chat:${message.chatId}`).emit("reaction_removed", {
              messageId: data.messageId,
              userId,
              emoji: data.emoji,
            });
          }
        } catch (error) {
          console.error("Error removing reaction:", error);
        }
      }
    );

    // Edit Message
    socket.on(
      "edit_message",
      async (data: { messageId: string; ciphertext: string; iv: string }) => {
        try {
          const message = await db.editMessage(
            data.messageId,
            userId,
            data.ciphertext,
            data.iv
          );
          io.to(`chat:${message.chatId}`).emit("message_edited", {
            messageId: data.messageId,
            chatId: message.chatId,
            ciphertext: data.ciphertext,
            iv: data.iv,
            editedAt: message.editedAt?.getTime(),
          });
        } catch (error) {
          console.error("Error editing message:", error);
        }
      }
    );

    // Delete Message
    socket.on("delete_message", async (data: { messageId: string }) => {
      try {
        const message = await db.deleteMessage(data.messageId, userId);
        io.to(`chat:${message.chatId}`).emit("message_deleted", {
          messageId: data.messageId,
          chatId: message.chatId,
          deletedAt: message.deletedAt?.getTime(),
        });
      } catch (error) {
        console.error("Error deleting message:", error);
      }
    });

    // Typing indicator
    socket.on("typing", (data: { chatId: string }) => {
      socket.to(`chat:${data.chatId}`).emit("user_typing", {
        userId,
        chatId: data.chatId,
        displayName: user.displayName,
      });
    });

    // Stopped typing
    socket.on("stopped_typing", (data: { chatId: string }) => {
      socket.to(`chat:${data.chatId}`).emit("user_stopped_typing", {
        userId,
        chatId: data.chatId,
      });
    });

    // Message delivered
    socket.on("message_delivered", async (data: { messageId: string }) => {
      try {
        await db.updateMessageStatus(data.messageId, "delivered", userId);

        // Notify sender
        const message = await db.prisma.message.findUnique({
          where: { id: data.messageId },
          select: { senderId: true, chatId: true },
        });

        if (message) {
          const senderSocketId = connectedUsers.get(message.senderId);
          if (senderSocketId) {
            io.to(senderSocketId).emit("message_delivered", {
              messageId: data.messageId,
              chatId: message.chatId,
            });
          }
        }
      } catch (error) {
        console.error("Error marking message delivered:", error);
      }
    });

    // Message read
    socket.on(
      "message_read",
      async (data: { messageId: string; chatId: string }) => {
        try {
          await db.updateMessageStatus(data.messageId, "read", userId);

          // Notify sender
          const message = await db.prisma.message.findUnique({
            where: { id: data.messageId },
            select: { senderId: true },
          });

          if (message) {
            const senderSocketId = connectedUsers.get(message.senderId);
            if (senderSocketId) {
              io.to(senderSocketId).emit("message_read", {
                messageId: data.messageId,
                chatId: data.chatId,
                readBy: userId,
              });
            }
          }
        } catch (error) {
          console.error("Error marking message read:", error);
        }
      }
    );

    // Join chat room
    socket.on("join_chat", (data: { chatId: string }) => {
      socket.join(`chat:${data.chatId}`);
    });

    // Leave chat room
    socket.on("leave_chat", (data: { chatId: string }) => {
      socket.leave(`chat:${data.chatId}`);
    });

    // Disconnect handler
    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${user.displayName} (${userId})`);

      connectedUsers.delete(userId);
      await db.setUserOnline(userId, false);

      socket.broadcast.emit("user_offline", {
        userId,
        displayName: user.displayName,
      });
    });
  });
}

/**
 * Parse cookie string into object
 */
function parseCookie(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieString.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.split("=");
    if (name && rest.length > 0) {
      cookies[name.trim()] = rest.join("=").trim();
    }
  });
  return cookies;
}

/**
 * Get connected users count
 */
export function getConnectedUsersCount(): number {
  return connectedUsers.size;
}

/**
 * Check if user is online
 */
export function isUserOnline(userId: string): boolean {
  return connectedUsers.has(userId);
}
