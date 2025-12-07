/**
 * Input Validation and Sanitization Module
 * Prevents XSS, injection attacks, and other security vulnerabilities
 */

import type { ValidationResult } from "@/types";

// Character limits for different input types
interface Limits {
  username: { min: number; max: number };
  password: { min: number; max: number };
  email: { max: number };
  message: { max: number };
  displayName: { min: number; max: number };
  chatName: { min: number; max: number };
}

const LIMITS: Limits = {
  username: { min: 3, max: 30 },
  password: { min: 12, max: 128 },
  email: { max: 254 },
  message: { max: 4000 },
  displayName: { min: 1, max: 50 },
  chatName: { min: 1, max: 100 },
};

// Regex patterns
interface Patterns {
  username: RegExp;
  email: RegExp;
  password: RegExp;
  displayName: RegExp;
  uuid: RegExp;
}

const PATTERNS: Patterns = {
  username: /^[a-zA-Z0-9_-]+$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  // Minimum requirements: 1 uppercase, 1 lowercase, 1 number, 1 special char
  password:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{12,}$/,
  displayName: /^[\p{L}\p{N}\s\-'.]+$/u,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
};

// HTML entities for escaping
const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#96;",
};

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(str: string): string {
  if (typeof str !== "string") {
    return "";
  }
  return str.replace(/[&<>"'`/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitize message content
 */
export function sanitizeMessage(message: string): string {
  if (typeof message !== "string") {
    return "";
  }

  // Trim and limit length
  let sanitized = message.trim().slice(0, LIMITS.message.max);

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "");

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Escape HTML entities
  sanitized = escapeHtml(sanitized);

  return sanitized;
}

/**
 * Validate username
 */
export function validateUsername(username: string): ValidationResult {
  if (!username || typeof username !== "string") {
    return { valid: false, error: "Username is required" };
  }

  const trimmed = username.trim();

  if (trimmed.length < LIMITS.username.min) {
    return {
      valid: false,
      error: `Username must be at least ${LIMITS.username.min} characters`,
    };
  }

  if (trimmed.length > LIMITS.username.max) {
    return {
      valid: false,
      error: `Username must be at most ${LIMITS.username.max} characters`,
    };
  }

  if (!PATTERNS.username.test(trimmed)) {
    return {
      valid: false,
      error:
        "Username can only contain letters, numbers, underscores, and hyphens",
    };
  }

  return { valid: true };
}

/**
 * Validate email
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Email is required" };
  }

  const trimmed = email.trim().toLowerCase();

  if (trimmed.length > LIMITS.email.max) {
    return { valid: false, error: "Email is too long" };
  }

  if (!PATTERNS.email.test(trimmed)) {
    return { valid: false, error: "Invalid email format" };
  }

  return { valid: true };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): ValidationResult {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required" };
  }

  if (password.length < LIMITS.password.min) {
    return {
      valid: false,
      error: `Password must be at least ${LIMITS.password.min} characters`,
    };
  }

  if (password.length > LIMITS.password.max) {
    return { valid: false, error: "Password is too long" };
  }

  // Check individual requirements
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (!hasLowercase) {
    return {
      valid: false,
      error: "Password must contain at least one lowercase letter",
    };
  }
  if (!hasUppercase) {
    return {
      valid: false,
      error: "Password must contain at least one uppercase letter",
    };
  }
  if (!hasNumber) {
    return { valid: false, error: "Password must contain at least one number" };
  }
  if (!hasSpecial) {
    return {
      valid: false,
      error: "Password must contain at least one special character",
    };
  }

  // Calculate strength
  let strength: "weak" | "medium" | "strong" = "weak";
  if (
    password.length >= 16 &&
    hasLowercase &&
    hasUppercase &&
    hasNumber &&
    hasSpecial
  ) {
    strength = "strong";
  } else if (
    password.length >= 12 &&
    hasLowercase &&
    hasUppercase &&
    hasNumber &&
    hasSpecial
  ) {
    strength = "medium";
  }

  return { valid: true, strength };
}

/**
 * Validate display name
 */
export function validateDisplayName(name: string): ValidationResult {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Display name is required" };
  }

  const trimmed = name.trim();

  if (trimmed.length < LIMITS.displayName.min) {
    return { valid: false, error: "Display name is required" };
  }

  if (trimmed.length > LIMITS.displayName.max) {
    return {
      valid: false,
      error: `Display name must be at most ${LIMITS.displayName.max} characters`,
    };
  }

  if (!PATTERNS.displayName.test(trimmed)) {
    return { valid: false, error: "Display name contains invalid characters" };
  }

  return { valid: true };
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== "string") {
    return false;
  }
  return PATTERNS.uuid.test(uuid);
}

/**
 * Validate message content
 */
export function validateMessage(message: string): ValidationResult {
  if (!message || typeof message !== "string") {
    return { valid: false, error: "Message cannot be empty" };
  }

  const trimmed = message.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: "Message cannot be empty" };
  }

  if (trimmed.length > LIMITS.message.max) {
    return {
      valid: false,
      error: `Message cannot exceed ${LIMITS.message.max} characters`,
    };
  }

  return { valid: true };
}

/**
 * Check for common password patterns (blacklist check)
 */
export function isCommonPassword(password: string): boolean {
  const commonPasswords = [
    "password123",
    "qwerty123456",
    "123456789abc",
    "letmein12345",
    "admin123456",
    "welcome12345",
    "monkey123456",
    "dragon123456",
    "master123456",
    "sunshine1234",
    "princess1234",
    "football1234",
  ];

  return commonPasswords.some((common) =>
    password.toLowerCase().includes(common.toLowerCase())
  );
}

/**
 * Sanitize object by escaping all string values
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => {
      if (typeof item === "string") {
        return escapeHtml(item);
      } else if (typeof item === "object" && item !== null) {
        return sanitizeObject(item as Record<string, unknown>);
      }
      return item;
    }) as unknown as T;
  }

  const sanitized: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (typeof value === "string") {
      sanitized[key] = escapeHtml(value);
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Rate limiting helper for client-side
 */
export class RateLimiter {
  private maxRequests: number;
  private windowMs: number;
  private requests: number[] = [];

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      return false;
    }

    this.requests.push(now);
    return true;
  }

  /**
   * Get remaining requests in current window
   */
  getRemaining(): number {
    const now = Date.now();
    this.requests = this.requests.filter((time) => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - this.requests.length);
  }

  /**
   * Get time until next request is allowed
   */
  getRetryAfter(): number {
    if (this.requests.length < this.maxRequests) {
      return 0;
    }
    const oldestRequest = Math.min(...this.requests);
    return Math.max(0, this.windowMs - (Date.now() - oldestRequest));
  }
}
