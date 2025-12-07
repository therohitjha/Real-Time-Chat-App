/**
 * Authentication Middleware
 * Handles JWT verification and user authentication
 */

import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/helpers";
import * as db from "../database";

export interface AuthenticatedRequest extends Request {
  user?: Awaited<ReturnType<typeof db.findUserById>>;
  userId?: string;
}

/**
 * Authentication middleware
 * Verifies JWT token from cookies or Authorization header
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from cookie or Authorization header
    const token =
      req.cookies?.auth_token ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    // Check session in database
    const session = await db.findSessionByToken(token);
    if (!session || session.expiresAt < new Date()) {
      res.status(401).json({ error: "Session expired" });
      return;
    }

    // Get user
    const user = await db.findUserById(decoded.userId);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    req.user = user;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
}

/**
 * Optional authentication - doesn't fail if not authenticated
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token =
      req.cookies?.auth_token ||
      req.headers.authorization?.replace("Bearer ", "");

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const user = await db.findUserById(decoded.userId);
        if (user) {
          req.user = user;
          req.userId = decoded.userId;
        }
      }
    }
    next();
  } catch {
    next();
  }
}
