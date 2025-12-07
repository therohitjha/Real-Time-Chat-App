/**
 * User Routes
 * Handles user profile and public key management
 */

import { Router, Response } from "express";
import { sanitizeInput } from "../utils/helpers";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import * as db from "../database";

const router = Router();

/**
 * PATCH /api/user/profile
 * Update user profile
 */
router.patch(
  "/profile",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId;
      const { displayName, avatarUrl } = req.body;

      if (!userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const updateData: { displayName?: string; avatarUrl?: string } = {};

      if (displayName) {
        updateData.displayName = sanitizeInput(displayName);
      }
      if (avatarUrl) {
        updateData.avatarUrl = sanitizeInput(avatarUrl);
      }

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({ error: "No valid fields to update" });
        return;
      }

      const updatedUser = await db.updateUser(userId, updateData);

      res.json({
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          displayName: updatedUser.displayName,
          avatarUrl: updatedUser.avatarUrl,
          publicKey: updatedUser.publicKey,
        },
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  }
);

/**
 * POST /api/user/update-public-key
 * Update user's E2E encryption public key
 */
router.post(
  "/update-public-key",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId;
      const { publicKey } = req.body;

      if (!userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      if (!publicKey) {
        res.status(400).json({ error: "Public key is required" });
        return;
      }

      await db.updatePublicKey(userId, publicKey);
      res.json({ message: "Public key updated successfully" });
    } catch (error) {
      console.error("Update public key error:", error);
      res.status(500).json({ error: "Failed to update public key" });
    }
  }
);

/**
 * GET /api/user/:id/public-key
 * Get a user's public key for E2E encryption
 */
router.get(
  "/:id/public-key",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const publicKey = await db.getPublicKey(id);

      if (!publicKey) {
        res.status(404).json({ error: "User or public key not found" });
        return;
      }

      res.json({ publicKey });
    } catch (error) {
      console.error("Get public key error:", error);
      res.status(500).json({ error: "Failed to get public key" });
    }
  }
);

/**
 * GET /api/users/search
 * Search for users
 */
router.get(
  "/search",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId;
      const { q } = req.query;

      if (!userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      if (!q || typeof q !== "string") {
        res.status(400).json({ error: "Search query is required" });
        return;
      }

      const sanitizedQuery = sanitizeInput(q);
      if (sanitizedQuery.length < 2) {
        res
          .status(400)
          .json({ error: "Search query must be at least 2 characters" });
        return;
      }

      const users = await db.searchUsers(sanitizedQuery, userId, 20);
      res.json({ users });
    } catch (error) {
      console.error("Search users error:", error);
      res.status(500).json({ error: "Search failed" });
    }
  }
);

export default router;
