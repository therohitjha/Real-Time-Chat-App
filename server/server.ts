/**
 * Secure Chat Server - Refactored
 * Express + Socket.IO with modular architecture
 */

import express, { Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import hpp from "hpp";
import rateLimit from "express-rate-limit";

// Config and modules
import { config } from "./config";
import { authRoutes, userRoutes, chatRoutes } from "./routes";
import {
  initializeSocketHandlers,
  getConnectedUsersCount,
} from "./socket/handlers";
import { prisma } from "./database";

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ============================================
// Middleware
// ============================================

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "ws:", "wss:", config.corsOrigin],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cookie parser
app.use(cookieParser());

// HPP - HTTP Parameter Pollution prevention
app.use(hpp());

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: config.rateLimits.general.windowMs,
  max: config.rateLimits.general.max,
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", generalLimiter);

// ============================================
// Health Check
// ============================================

app.get("/api/health", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "healthy",
      database: "connected",
      connectedUsers: getConnectedUsersCount(),
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(500).json({
      status: "error",
      database: "disconnected",
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================
// API Routes
// ============================================

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/users", userRoutes); // Alias for search endpoint
app.use("/api/chats", chatRoutes);

// ============================================
// Socket.IO Handlers
// ============================================

initializeSocketHandlers(io);

// ============================================
// Error Handling
// ============================================

app.use((err: Error, _req: Request, res: Response) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// ============================================
// Server Startup
// ============================================

httpServer.listen(config.port, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                   🔐 SecureChat Server                      ║
╠════════════════════════════════════════════════════════════╣
║  Status:     Running (Refactored & Modular)                ║
║  Port:       ${String(config.port).padEnd(44)}║
║  Mode:       ${config.nodeEnv.padEnd(44)}║
║  CORS:       ${config.corsOrigin.padEnd(44)}║
╠════════════════════════════════════════════════════════════╣
║  Modules Loaded:                                            ║
║    ✓ Authentication Routes                                  ║
║    ✓ User Routes                                            ║
║    ✓ Chat Routes                                            ║
║    ✓ Socket.IO Handlers                                     ║
║    ✓ Security Middleware                                    ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  await prisma.$disconnect();
  httpServer.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("SIGINT received. Shutting down gracefully...");
  await prisma.$disconnect();
  httpServer.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});

export { app, httpServer, io };
