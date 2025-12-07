/**
 * Server Configuration
 * Centralized configuration management
 */

import { v4 as uuidv4 } from "uuid";

export const config = {
  // Server
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || "development",

  // Security
  jwtSecret:
    process.env.JWT_SECRET ||
    "your-super-secret-jwt-key-change-in-production-" + uuidv4(),
  jwtExpiresIn: "7d",
  bcryptRounds: 12,

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",

  // Rate Limiting
  rateLimits: {
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
    },
    auth: {
      windowMs: 15 * 60 * 1000,
      max: 5,
    },
  },

  // Session
  sessionCookie: {
    name: "auth_token",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
  },
} as const;

export type Config = typeof config;
