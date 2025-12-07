/**
 * Secure Socket Client
 * Handles WebSocket communication with automatic encryption/decryption
 */

"use client";

import { io, Socket } from "socket.io-client";
import { getKeyManager, KeyManager } from "@/lib/crypto/e2e-encryption";
import type {
  SocketMessage,
  TypingEvent,
  UserStatusEvent,
  MessageStatusEvent,
  PublicKeyEvent,
  Message,
} from "@/types";

type MessageHandler = (message: Message) => void;
type TypingHandler = (event: TypingEvent) => void;
type StatusHandler = (event: UserStatusEvent) => void;
type MessageStatusHandler = (event: MessageStatusEvent) => void;
type PublicKeyHandler = (event: PublicKeyEvent) => void;
type ConnectionHandler = () => void;
type ErrorHandler = (error: Error) => void;

interface QueuedMessage {
  recipientId: string;
  chatId: string;
  ciphertext: string;
  iv: string;
  timestamp: number;
  messageId: string;
}

interface SecureSocketHandlers {
  onMessage: MessageHandler;
  onTyping: TypingHandler;
  onStoppedTyping: TypingHandler;
  onUserOnline: StatusHandler;
  onUserOffline: StatusHandler;
  onMessageDelivered: MessageStatusHandler;
  onMessageRead: MessageStatusHandler;
  onPublicKey: PublicKeyHandler;
  onConnect: ConnectionHandler;
  onDisconnect: ConnectionHandler;
  onError: ErrorHandler;
  onReactionAdded: (event: import("@/types").ReactionEvent) => void;
  onReactionRemoved: (event: import("@/types").ReactionEvent) => void;
  onMessageEdited: (event: import("@/types").MessageEditEvent) => void;
  onMessageDeleted: (event: import("@/types").MessageDeleteEvent) => void;
}

export class SecureSocketClient {
  private socket: Socket | null = null;
  private keyManager: KeyManager;
  private userId: string;
  private handlers: Partial<SecureSocketHandlers> = {};
  private messageQueue: QueuedMessage[] = [];
  private isConnected: boolean = false;

  constructor(userId: string) {
    this.userId = userId;
    this.keyManager = getKeyManager();
  }

  /**
   * Connect to the socket server
   */
  connect(token: string): void {
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.setupEventListeners();
  }

  /**
   * Setup socket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      this.isConnected = true;
      this.flushMessageQueue();
      this.handlers.onConnect?.();
    });

    this.socket.on("disconnect", () => {
      this.isConnected = false;
      this.handlers.onDisconnect?.();
    });

    this.socket.on("connect_error", (error: Error) => {
      console.error("Socket connection error:", error);
      this.handlers.onError?.(error);
    });

    // Handle incoming encrypted messages
    this.socket.on("encrypted_message", async (data: SocketMessage) => {
      try {
        const decryptedContent = await this.keyManager.decryptFrom(
          data.senderId,
          data.ciphertext,
          data.iv
        );

        const message: Message = {
          id: data.messageId || data.id || "",
          chatId: data.chatId || "",
          senderId: data.senderId,
          recipientId: this.userId,
          content: decryptedContent,
          messageType: "text",
          status: "delivered",
          timestamp: data.timestamp,
          fromSelf: false,
          encrypted: true,
        };

        this.handlers.onMessage?.(message);

        // Acknowledge delivery
        this.emit("message_delivered", {
          messageId: data.messageId || data.id,
          senderId: data.senderId,
        });
      } catch (error) {
        console.error("Failed to decrypt message:", error);
        this.handlers.onError?.(error as Error);
      }
    });

    // Handle public key response
    this.socket.on("public_key_response", (data: PublicKeyEvent) => {
      this.handlers.onPublicKey?.(data);
    });

    // Handle typing indicators
    this.socket.on("user_typing", (data: TypingEvent) => {
      this.handlers.onTyping?.(data);
    });

    this.socket.on("user_stopped_typing", (data: TypingEvent) => {
      this.handlers.onStoppedTyping?.(data);
    });

    // Handle user status
    this.socket.on("user_online", (data: UserStatusEvent) => {
      this.handlers.onUserOnline?.(data);
    });

    this.socket.on("user_offline", (data: UserStatusEvent) => {
      this.handlers.onUserOffline?.(data);
    });

    // Handle message status updates
    this.socket.on("message_delivered", (data: MessageStatusEvent) => {
      this.handlers.onMessageDelivered?.(data);
    });

    this.socket.on("message_read", (data: MessageStatusEvent) => {
      this.handlers.onMessageRead?.(data);
    });

    // Handle reactions
    this.socket.on(
      "reaction_added",
      (data: import("@/types").ReactionEvent) => {
        this.handlers.onReactionAdded?.(data);
      }
    );

    this.socket.on(
      "reaction_removed",
      (data: import("@/types").ReactionEvent) => {
        this.handlers.onReactionRemoved?.(data);
      }
    );

    // Handle edits and deletions
    this.socket.on(
      "message_edited",
      (data: import("@/types").MessageEditEvent) => {
        this.handlers.onMessageEdited?.(data);
      }
    );

    this.socket.on(
      "message_deleted",
      (data: import("@/types").MessageDeleteEvent) => {
        this.handlers.onMessageDeleted?.(data);
      }
    );

    // Handle errors
    this.socket.on("error", (data: { message: string }) => {
      console.error("Socket error:", data.message);
      this.handlers.onError?.(new Error(data.message));
    });
  }

  /**
   * Send an encrypted message
   */
  async sendMessage(
    recipientId: string,
    content: string,
    chatId: string
  ): Promise<string> {
    const messageId = crypto.randomUUID();

    try {
      // Encrypt the message
      const encrypted = await this.keyManager.encryptFor(recipientId, content);

      const messageData: QueuedMessage = {
        recipientId,
        chatId,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        timestamp: Date.now(),
        messageId,
      };

      if (this.isConnected && this.socket) {
        this.socket.emit("encrypted_message", messageData);
      } else {
        // Queue message for later
        this.messageQueue.push(messageData);
      }

      return messageId;
    } catch (error) {
      console.error("Failed to send message:", error);
      throw error;
    }
  }

  /**
   * Register public key for E2E encryption
   */
  registerPublicKey(publicKey: string): void {
    this.emit("register_public_key", {
      userId: this.userId,
      publicKey,
    });
  }

  /**
   * Request a user's public key
   */
  requestPublicKey(userId: string): void {
    this.emit("request_public_key", { userId });
  }

  /**
   * Establish secure channel with another user
   */
  async establishChannel(userId: string, publicKey: string): Promise<void> {
    await this.keyManager.establishChannel(userId, publicKey);
  }

  /**
   * Check if secure channel exists
   */
  hasChannel(userId: string): boolean {
    return this.keyManager.hasChannel(userId);
  }

  /**
   * Send typing indicator
   */
  sendTyping(chatId: string, recipientId: string): void {
    this.emit("typing", { chatId, recipientId });
  }

  /**
   * Stop typing indicator
   */
  sendStoppedTyping(chatId: string, recipientId: string): void {
    this.emit("stopped_typing", { chatId, recipientId });
  }

  /**
   * Mark message as read
   */
  markAsRead(messageId: string, senderId: string): void {
    this.emit("message_read", { messageId, senderId });
  }

  /**
   * Join a chat room
   */
  joinChat(chatId: string): void {
    this.emit("join_chat", { chatId });
  }

  /**
   * Leave a chat room
   */
  leaveChat(chatId: string): void {
    this.emit("leave_chat", { chatId });
  }

  // ===================================
  // Reaction & Message Management
  // ===================================

  addReaction(messageId: string, emoji: string): void {
    this.emit("add_reaction", { messageId, emoji });
  }

  removeReaction(messageId: string, emoji: string): void {
    this.emit("remove_reaction", { messageId, emoji });
  }

  async editMessage(
    messageId: string,
    content: string,
    recipientId: string
  ): Promise<void> {
    try {
      const encrypted = await this.keyManager.encryptFor(recipientId, content);
      this.emit("edit_message", {
        messageId,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
      });
    } catch (error) {
      console.error("Failed to encrypt edited message:", error);
      throw error;
    }
  }

  deleteMessage(messageId: string): void {
    this.emit("delete_message", { messageId });
  }

  /**
   * Set event handlers
   */
  setHandlers(handlers: Partial<SecureSocketHandlers>): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  /**
   * Emit an event
   */
  private emit(event: string, data: unknown): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    }
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected && this.socket) {
      const message = this.messageQueue.shift();
      if (message) {
        this.socket.emit("encrypted_message", message);
      }
    }
  }

  /**
   * Disconnect from the socket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.messageQueue = [];
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected;
  }
}

// Factory function
let socketClientInstance: SecureSocketClient | null = null;

export function getSocketClient(userId?: string): SecureSocketClient | null {
  if (userId && !socketClientInstance) {
    socketClientInstance = new SecureSocketClient(userId);
  }
  return socketClientInstance;
}

export function clearSocketClient(): void {
  if (socketClientInstance) {
    socketClientInstance.disconnect();
    socketClientInstance = null;
  }
}
