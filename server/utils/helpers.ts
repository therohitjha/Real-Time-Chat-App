/**
 * Server Utility Functions
 * Helper functions used across the server
 */

import { Request } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";

export interface JwtPayload {
  userId: string;
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(userId: string): string {
  return jwt.sign({ userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim().replace(/[<>]/g, "");
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Requirements: 12+ chars, uppercase, lowercase, number, special char
 */
export function validatePassword(password: string): boolean {
  const minLength = password.length >= 12;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  return minLength && hasUpper && hasLower && hasNumber && hasSpecial;
}

/**
 * Validate username format
 */
export function validateUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
}

/**
 * Get client IP address from request
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

/**
 * Calculate session expiry date
 */
export function getSessionExpiry(): Date {
  return new Date(Date.now() + config.sessionCookie.maxAge);
}
