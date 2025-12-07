/**
 * Secure Chat Server with Prisma SQLite Database
 * Express + Socket.IO with comprehensive security measures
 */

import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import hpp from "hpp";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

// Import database service
import * as db from "./database";

// Type definitions
interface JwtPayload {
  userId: string;
}

interface AuthenticatedRequest extends Request {
  user?: Awaited<ReturnType<typeof db.findUserById>>;
  userId?: string;
}

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

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Configuration
const PORT = process.env.PORT || 3001;
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "your-super-secret-jwt-key-change-in-production-" + uuidv4();
const JWT_EXPIRES_IN = "7d";
const BCRYPT_ROUNDS = 12;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

// ============================================
// Security Middleware
// ============================================

// Helmet for security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "ws:", "wss:"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
  skipSuccessfulRequests: true,
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Body parser with size limit
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Cookie parser
app.use(cookieParser());

// HPP - HTTP Parameter Pollution prevention
app.use(hpp());

// ============================================
// Helper Functions
// ============================================

function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

function sanitizeInput(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim().replace(/[<>]/g, "").slice(0, 1000);
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

function validatePassword(password: string): boolean {
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{12,}$/;
  return passwordRegex.test(password);
}

function validateUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  return usernameRegex.test(username);
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0];
  }
  return req.socket.remoteAddress || "";
}

// Authentication middleware
async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : req.cookies?.token;

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  try {
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

// ============================================
// API Routes
// ============================================

// Health check
app.get("/api/health", async (_req: Request, res: Response) => {
  try {
    await db.prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      database: "connected",
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

// Register
app.post("/api/auth/register", async (req: Request, res: Response) => {
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
      res
        .status(400)
        .json({
          error:
            "Invalid username format. Use 3-30 alphanumeric characters, underscores, or hyphens.",
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
          "Password must be at least 12 characters with uppercase, lowercase, number, and special character",
      });
      return;
    }

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

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await db.createUser({
      username: sanitizedUsername,
      email: sanitizedEmail,
      displayName: sanitizedDisplayName,
      passwordHash,
      publicKey: publicKey || null,
    });

    const token = generateToken(user.id);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.createSession({
      userId: user.id,
      token,
      deviceInfo: req.headers["user-agent"],
      ipAddress: getClientIp(req),
      expiresAt,
    });

    await db.createAuditLog({
      userId: user.id,
      action: "register",
      ipAddress: getClientIp(req),
      userAgent: req.headers["user-agent"] as string,
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
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

// Login
app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const sanitizedEmail = sanitizeInput(email).toLowerCase();
    const user = await db.findUserByEmail(sanitizedEmail);

    if (!user) {
      await bcrypt.compare(
        password,
        "$2a$12$invalid.hash.to.prevent.timing.attacks"
      );
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      await db.createAuditLog({
        userId: user.id,
        action: "login_failed",
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"] as string,
      });
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = generateToken(user.id);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.createSession({
      userId: user.id,
      token,
      deviceInfo: req.headers["user-agent"],
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

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// Verify session
app.get(
  "/api/auth/verify",
  authenticate as express.RequestHandler,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId || !req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const token = generateToken(req.userId);
    res.json({
      valid: true,
      token,
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        displayName: req.user.displayName,
      },
    });
  }
);

// Logout
app.post("/api/auth/logout", async (req: Request, res: Response) => {
  const token = req.cookies?.token;

  if (token) {
    try {
      const decoded = verifyToken(token);
      if (decoded) {
        await db.deleteSession(token);
        await db.setUserOnline(decoded.userId, false);
        await db.createAuditLog({
          userId: decoded.userId,
          action: "logout",
          ipAddress: getClientIp(req),
          userAgent: req.headers["user-agent"] as string,
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  res.clearCookie("token");
  res.json({ success: true });
});

// Change password
app.post(
  "/api/auth/change-password",
  authenticate as express.RequestHandler,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || !req.userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res
          .status(400)
          .json({ error: "Current and new password are required" });
        return;
      }

      const user = await db.findUserByEmail(req.user.email);
      if (!user) {
        res.status(401).json({ error: "User not found" });
        return;
      }

      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        res.status(401).json({ error: "Current password is incorrect" });
        return;
      }

      if (!validatePassword(newPassword)) {
        res.status(400).json({
          error:
            "Password must be at least 12 characters with uppercase, lowercase, number, and special character",
        });
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await db.updateUserPassword(req.userId, passwordHash);
      await db.deleteUserSessions(req.userId);

      await db.createAuditLog({
        userId: req.userId,
        action: "password_change",
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"] as string,
      });

      const token = generateToken(req.userId);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await db.createSession({
        userId: req.userId,
        token,
        deviceInfo: req.headers["user-agent"],
        ipAddress: getClientIp(req),
        expiresAt,
      });

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({ success: true, token });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  }
);

// Update profile
app.patch(
  "/api/user/profile",
  authenticate as express.RequestHandler,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const { displayName, avatarUrl } = req.body;
      const updates: { displayName?: string; avatarUrl?: string } = {};

      if (displayName) {
        const sanitized = sanitizeInput(displayName);
        if (sanitized.length > 0 && sanitized.length <= 50) {
          updates.displayName = sanitized;
        }
      }

      if (avatarUrl !== undefined) {
        updates.avatarUrl = avatarUrl;
      }

      const user = await db.updateUser(req.userId, updates);
      res.json({ user });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  }
);

// Update public key
app.post(
  "/api/user/update-public-key",
  authenticate as express.RequestHandler,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const { publicKey } = req.body;

      if (!publicKey) {
        res.status(400).json({ error: "Public key is required" });
        return;
      }

      await db.updatePublicKey(req.userId, publicKey);

      await db.createAuditLog({
        userId: req.userId,
        action: "key_update",
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"] as string,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Public key update error:", error);
      res.status(500).json({ error: "Failed to update public key" });
    }
  }
);

// Get user's public key
app.get(
  "/api/user/:userId/public-key",
  authenticate as express.RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const publicKey = await db.getPublicKey(userId);

      if (!publicKey) {
        res.status(404).json({ error: "Public key not found" });
        return;
      }

      res.json({ publicKey });
    } catch (error) {
      console.error("Get public key error:", error);
      res.status(500).json({ error: "Failed to get public key" });
    }
  }
);

// Search users
app.get(
  "/api/users/search",
  authenticate as express.RequestHandler,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const { q } = req.query;

      if (!q || (typeof q === "string" && q.length < 2)) {
        res.json({ users: [] });
        return;
      }

      const query = sanitizeInput(q).toLowerCase();
      const users = await db.searchUsers(query, req.userId);

      res.json({ users });
    } catch (error) {
      console.error("User search error:", error);
      res.status(500).json({ error: "Search failed" });
    }
  }
);

// Get user's chats
app.get(
  "/api/chats",
  authenticate as express.RequestHandler,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const chats = await db.getUserChats(req.userId);
      const unreadCounts = await db.getUnreadCountPerChat(req.userId);

      res.json({ chats, unreadCounts });
    } catch (error) {
      console.error("Get chats error:", error);
      res.status(500).json({ error: "Failed to get chats" });
    }
  }
);

// Create or get direct chat
app.post(
  "/api/chats/direct",
  authenticate as express.RequestHandler,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const { recipientId } = req.body;

      if (!recipientId) {
        res.status(400).json({ error: "Recipient ID is required" });
        return;
      }

      const chat = await db.findOrCreateDirectChat(req.userId, recipientId);
      res.json({ chat });
    } catch (error) {
      console.error("Create chat error:", error);
      res.status(500).json({ error: "Failed to create chat" });
    }
  }
);

// Get chat messages
app.get(
  "/api/chats/:chatId/messages",
  authenticate as express.RequestHandler,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const { chatId } = req.params;
      const { before, limit } = req.query;

      const messages = await db.getChatMessages(chatId, req.userId, {
        before: before as string | null,
        limit: parseInt(limit as string) || 50,
      });

      res.json({ messages: messages.reverse() });
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  }
);

// ============================================
// Socket.IO Setup
// ============================================

const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket"],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Socket authentication middleware
io.use(async (socket: Socket, next) => {
  const token = socket.handshake.auth.token as string;

  if (!token) {
    return next(new Error("Authentication required"));
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return next(new Error("Invalid token"));
  }

  try {
    const user = await db.findUserById(decoded.userId);
    if (!user) {
      return next(new Error("User not found"));
    }

    (socket as AuthenticatedSocket).userId = decoded.userId;
    (socket as AuthenticatedSocket).user = user as SocketUser;
    next();
  } catch {
    return next(new Error("Authentication failed"));
  }
});

// Online users tracking
const onlineUsers = new Map<string, Set<string>>();

io.on("connection", async (socket: Socket) => {
  const authSocket = socket as AuthenticatedSocket;
  console.log(
    `User connected: ${authSocket.user.displayName} (${authSocket.userId})`
  );

  if (!onlineUsers.has(authSocket.userId)) {
    onlineUsers.set(authSocket.userId, new Set());
  }
  onlineUsers.get(authSocket.userId)!.add(socket.id);

  await db.setUserOnline(authSocket.userId, true);
  socket.broadcast.emit("user_online", { userId: authSocket.userId });

  socket.on(
    "register_public_key",
    async ({ userId, publicKey }: { userId: string; publicKey: string }) => {
      if (userId === authSocket.userId && publicKey) {
        await db.updatePublicKey(userId, publicKey);
      }
    }
  );

  socket.on("request_public_key", async ({ userId }: { userId: string }) => {
    try {
      const publicKey = await db.getPublicKey(userId);
      if (publicKey) {
        socket.emit("public_key_response", { userId, publicKey });
      } else {
        socket.emit("error", { message: "User public key not found" });
      }
    } catch {
      socket.emit("error", { message: "Failed to get public key" });
    }
  });

  socket.on(
    "encrypted_message",
    async (data: {
      recipientId: string;
      chatId?: string;
      ciphertext: string;
      iv: string;
      timestamp: number;
      messageId: string;
    }) => {
      const { recipientId, chatId, ciphertext, iv } = data;

      if (!recipientId || !ciphertext || !iv) {
        socket.emit("error", { message: "Invalid message data" });
        return;
      }

      try {
        const message = await db.createMessage({
          chatId:
            chatId ||
            `direct_${[authSocket.userId, recipientId].sort().join("_")}`,
          senderId: authSocket.userId,
          recipientId,
          ciphertext,
          iv,
          messageType: "text",
        });

        const recipientSockets = onlineUsers.get(recipientId);
        if (recipientSockets) {
          recipientSockets.forEach((socketId) => {
            io.to(socketId).emit("encrypted_message", {
              id: message.id,
              senderId: authSocket.userId,
              chatId: message.chatId,
              ciphertext,
              iv,
              timestamp: message.createdAt.getTime(),
              messageId: message.id,
            });
          });

          await db.updateMessageStatus(message.id, "delivered", recipientId);
        }
      } catch (error) {
        console.error("Message handling error:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    }
  );

  socket.on(
    "typing",
    ({ chatId, recipientId }: { chatId: string; recipientId: string }) => {
      const recipientSockets = onlineUsers.get(recipientId);
      if (recipientSockets) {
        recipientSockets.forEach((socketId) => {
          io.to(socketId).emit("user_typing", {
            chatId,
            userId: authSocket.userId,
          });
        });
      }
    }
  );

  socket.on(
    "stopped_typing",
    ({ chatId, recipientId }: { chatId: string; recipientId: string }) => {
      const recipientSockets = onlineUsers.get(recipientId);
      if (recipientSockets) {
        recipientSockets.forEach((socketId) => {
          io.to(socketId).emit("user_stopped_typing", {
            chatId,
            userId: authSocket.userId,
          });
        });
      }
    }
  );

  socket.on(
    "message_delivered",
    async ({
      messageId,
      senderId,
    }: {
      messageId: string;
      senderId: string;
    }) => {
      try {
        await db.updateMessageStatus(messageId, "delivered", authSocket.userId);

        const senderSockets = onlineUsers.get(senderId);
        if (senderSockets) {
          senderSockets.forEach((socketId) => {
            io.to(socketId).emit("message_delivered", { messageId });
          });
        }
      } catch (error) {
        console.error("Delivery ack error:", error);
      }
    }
  );

  socket.on(
    "message_read",
    async ({
      messageId,
      senderId,
    }: {
      messageId: string;
      senderId: string;
    }) => {
      try {
        await db.updateMessageStatus(messageId, "read", authSocket.userId);

        const senderSockets = onlineUsers.get(senderId);
        if (senderSockets) {
          senderSockets.forEach((socketId) => {
            io.to(socketId).emit("message_read", { messageId });
          });
        }
      } catch (error) {
        console.error("Read ack error:", error);
      }
    }
  );

  socket.on("join_chat", ({ chatId }: { chatId: string }) => {
    socket.join(chatId);
  });

  socket.on("leave_chat", ({ chatId }: { chatId: string }) => {
    socket.leave(chatId);
  });

  socket.on("disconnect", async () => {
    console.log(`User disconnected: ${authSocket.user.displayName}`);

    const userSockets = onlineUsers.get(authSocket.userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        onlineUsers.delete(authSocket.userId);
        await db.setUserOnline(authSocket.userId, false);
        socket.broadcast.emit("user_offline", { userId: authSocket.userId });
      }
    }
  });
});

// ============================================
// Error Handling
// ============================================

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ============================================
// Graceful Shutdown
// ============================================

async function gracefulShutdown(): Promise<void> {
  console.log("\nShutting down gracefully...");
  io.close();
  httpServer.close();
  await db.prisma.$disconnect();
  console.log("Goodbye!");
  process.exit(0);
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// ============================================
// Database Cleanup Job
// ============================================

setInterval(async () => {
  try {
    const results = await db.runCleanup();
    console.log("Cleanup completed:", results);
  } catch (error) {
    console.error("Cleanup error:", error);
  }
}, 60 * 60 * 1000);

// ============================================
// Start Server
// ============================================

httpServer.listen(PORT, () => {
  console.log(`
🔐 SecureChat Server Running (TypeScript + SQLite + Prisma)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 HTTP Server: http://localhost:${PORT}
🔌 WebSocket: ws://localhost:${PORT}
💾 Database: SQLite (prisma/dev.db)
🛡️  Security Features:
   • Helmet security headers
   • Rate limiting (100 req/15min, 5 auth attempts)
   • CORS protection
   • HTTP-only cookies
   • bcrypt password hashing (12 rounds)
   • JWT authentication
   • Input sanitization
   • HPP protection
   • Audit logging
   • Session management
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

export { app, io };
