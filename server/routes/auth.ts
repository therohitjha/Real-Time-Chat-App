/**
 * Authentication Routes
 * Handles user registration, login, logout, and session management
 */

import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { config } from "../config";
import {
  sanitizeInput,
  validateEmail,
  validatePassword,
  validateUsername,
  generateToken,
  getClientIp,
  getSessionExpiry,
} from "../utils/helpers";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import * as db from "../database";

const router = Router();

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: config.rateLimits.auth.windowMs,
  max: config.rateLimits.auth.max,
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
  skipSuccessfulRequests: true,
});

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { username, email, password, displayName, publicKey } = req.body;

    if (!username || !email || !password || !displayName) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    const sanitizedUsername = sanitizeInput(username).toLowerCase();
    const sanitizedEmail = sanitizeInput(email).toLowerCase();
    const sanitizedDisplayName = sanitizeInput(displayName);

    if (!validateUsername(sanitizedUsername)) {
      res.status(400).json({
        error:
          "Username must be 3-20 characters, alphanumeric and underscores only",
      });
      return;
    }

    if (!validateEmail(sanitizedEmail)) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }

    if (!validatePassword(password)) {
      res.status(400).json({
        error:
          "Password must be 12+ characters with uppercase, lowercase, number, and special character",
      });
      return;
    }

    // Check for existing user
    const existingEmail = await db.findUserByEmail(sanitizedEmail);
    if (existingEmail) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const existingUsername = await db.findUserByUsername(sanitizedUsername);
    if (existingUsername) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }

    // Create user
    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
    const user = await db.createUser({
      username: sanitizedUsername,
      email: sanitizedEmail,
      displayName: sanitizedDisplayName,
      passwordHash,
      publicKey: publicKey || null,
    });

    // Create session
    const token = generateToken(user.id);
    const expiresAt = getSessionExpiry();

    await db.createSession({
      userId: user.id,
      token,
      deviceInfo: req.headers["user-agent"] as string,
      ipAddress: getClientIp(req),
      expiresAt,
    });

    // Create audit log
    await db.createAuditLog({
      userId: user.id,
      action: "register",
      ipAddress: getClientIp(req),
      userAgent: req.headers["user-agent"] as string,
    });

    // Set cookie
    res.cookie("auth_token", token, {
      ...config.sessionCookie,
      maxAge: config.sessionCookie.maxAge,
    });

    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
      },
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post("/login", authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const sanitizedEmail = sanitizeInput(email).toLowerCase();

    // Find user
    const user = await db.findUserByEmail(sanitizedEmail);
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      await db.createAuditLog({
        userId: user.id,
        action: "failed_login",
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"] as string,
      });
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Create session
    const token = generateToken(user.id);
    const expiresAt = getSessionExpiry();

    await db.createSession({
      userId: user.id,
      token,
      deviceInfo: req.headers["user-agent"] as string,
      ipAddress: getClientIp(req),
      expiresAt,
    });

    await db.setUserOnline(user.id, true);

    await db.createAuditLog({
      userId: user.id,
      action: "login",
      ipAddress: getClientIp(req),
      userAgent: req.headers["user-agent"] as string,
    });

    res.cookie("auth_token", token, {
      ...config.sessionCookie,
      maxAge: config.sessionCookie.maxAge,
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        publicKey: user.publicKey,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

/**
 * GET /api/auth/verify
 * Verify current session
 */
router.get(
  "/verify",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          publicKey: user.publicKey,
        },
      });
    } catch (error) {
      console.error("Verify error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post(
  "/logout",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const token =
        req.cookies?.auth_token ||
        req.headers.authorization?.replace("Bearer ", "");

      if (token) {
        await db.deleteSession(token);
      }

      if (req.userId) {
        await db.setUserOnline(req.userId, false);
        await db.createAuditLog({
          userId: req.userId,
          action: "logout",
          ipAddress: getClientIp(req),
          userAgent: req.headers["user-agent"] as string,
        });
      }

      res.clearCookie("auth_token");
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  }
);

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post(
  "/change-password",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.userId;

      if (!userId || !currentPassword || !newPassword) {
        res.status(400).json({ error: "All fields are required" });
        return;
      }

      if (!validatePassword(newPassword)) {
        res.status(400).json({
          error:
            "New password must be 12+ characters with uppercase, lowercase, number, and special character",
        });
        return;
      }

      const user = await db.findUserByEmail(req.user?.email || "");
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const validPassword = await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );
      if (!validPassword) {
        res.status(401).json({ error: "Current password is incorrect" });
        return;
      }

      const newPasswordHash = await bcrypt.hash(
        newPassword,
        config.bcryptRounds
      );
      await db.updateUserPassword(userId, newPasswordHash);

      // Invalidate all sessions except current
      await db.deleteUserSessions(userId);

      await db.createAuditLog({
        userId,
        action: "password_change",
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"] as string,
      });

      res.json({
        message: "Password changed successfully. Please login again.",
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  }
);

export default router;
