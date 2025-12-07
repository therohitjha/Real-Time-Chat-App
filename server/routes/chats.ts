/**
 * Chat Routes
 * Handles chat and message management
 */

import { Router, Response } from "express";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import * as db from "../database";

const router = Router();

/**
 * GET /api/chats
 * Get all chats for the current user
 */
router.get(
  "/",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const chats = await db.getUserChats(userId);
      res.json({ chats });
    } catch (error) {
      console.error("Get chats error:", error);
      res.status(500).json({ error: "Failed to get chats" });
    }
  }
);

/**
 * POST /api/chats/direct
 * Create or get a direct chat with another user
 */
router.post(
  "/direct",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId;
      const { recipientId } = req.body;

      if (!userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      if (!recipientId) {
        res.status(400).json({ error: "Recipient ID is required" });
        return;
      }

      if (recipientId === userId) {
        res.status(400).json({ error: "Cannot create chat with yourself" });
        return;
      }

      // Check if recipient exists
      const recipient = await db.findUserById(recipientId);
      if (!recipient) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const chat = await db.findOrCreateDirectChat(userId, recipientId);
      res.json({ chat });
    } catch (error) {
      console.error("Create direct chat error:", error);
      res.status(500).json({ error: "Failed to create chat" });
    }
  }
);

/**
 * GET /api/chats/:id
 * Get a specific chat
 */
router.get(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const chat = await db.getChatById(id, userId);
      if (!chat) {
        res.status(404).json({ error: "Chat not found" });
        return;
      }

      res.json({ chat });
    } catch (error) {
      console.error("Get chat error:", error);
      res.status(500).json({ error: "Failed to get chat" });
    }
  }
);

/**
 * GET /api/chats/:id/messages
 * Get messages for a chat with pagination
 */
router.get(
  "/:id/messages",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId;
      const { id } = req.params;
      const { before, limit } = req.query;

      if (!userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const messages = await db.getChatMessages(id, userId, {
        before: before as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : 50,
      });

      res.json({ messages: messages.reverse() });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Not a participant of this chat"
      ) {
        res.status(403).json({ error: "Access denied" });
        return;
      }
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  }
);

/**
 * POST /api/chats/:id/read
 * Mark all messages in a chat as read
 */
router.post(
  "/:id/read",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      await db.markChatMessagesAsRead(id, userId);
      res.json({ message: "Messages marked as read" });
    } catch (error) {
      console.error("Mark read error:", error);
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
  }
);

/**
 * GET /api/chats/unread/count
 * Get unread message counts
 */
router.get(
  "/unread/count",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const totalUnread = await db.getUnreadCount(userId);
      const perChat = await db.getUnreadCountPerChat(userId);

      res.json({ totalUnread, perChat });
    } catch (error) {
      console.error("Get unread count error:", error);
      res.status(500).json({ error: "Failed to get unread count" });
    }
  }
);

export default router;
