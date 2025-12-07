/**
 * Type definitions for SecureChat
 */

// User types
export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  publicKey?: string | null;
  isOnline?: boolean;
  lastSeen?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  token?: string;
}

export interface UserCredentials {
  email: string;
  password: string;
}

export interface UserRegistration extends UserCredentials {
  username: string;
  displayName: string;
  publicKey?: string;
}

// Chat types
export interface Chat {
  id: string;
  name?: string | null;
  isGroup: boolean;
  avatarUrl?: string | null;
  participants?: ChatParticipant[];
  messages?: Message[];
  lastMessage?: string | null;
  timestamp?: number;
  unread?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ChatParticipant {
  id: string;
  chatId: string;
  userId: string;
  role: "admin" | "member";
  user?: User;
  joinedAt?: Date;
  leftAt?: Date | null;
}

// Message types
export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  recipientId?: string | null;
  content?: string;
  ciphertext?: string;
  iv?: string;
  messageType: "text" | "image" | "file" | "audio";
  status: "sending" | "sent" | "delivered" | "read";
  timestamp?: number;
  createdAt?: Date;
  updatedAt?: Date;
  sender?: User;
  recipient?: User | null;
  fromSelf?: boolean;
  encrypted?: boolean;
  replyToId?: string | null;
  // Editing and deletion
  isEdited?: boolean;
  editedAt?: Date | null;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  // Self-destructing
  expiresAt?: Date | null;
  // Reactions
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt?: Date;
}

export interface EncryptedMessage {
  ciphertext: string;
  iv: string;
}

// Encryption types
export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface ExportedKeyPair {
  publicKey: string;
  privateKey: string;
}

// Socket event types
export interface SocketMessage {
  id?: string;
  messageId?: string;
  senderId: string;
  recipientId: string;
  chatId?: string;
  ciphertext: string;
  iv: string;
  timestamp: number;
}

export interface TypingEvent {
  chatId: string;
  userId?: string;
  recipientId?: string;
}

export interface UserStatusEvent {
  userId: string;
}

export interface MessageStatusEvent {
  messageId: string;
  senderId?: string;
}

export interface PublicKeyEvent {
  userId: string;
  publicKey: string;
}

export interface ConnectionStatusEvent {
  connected: boolean;
  reason?: string;
}

export interface ReactionEvent {
  messageId: string;
  userId: string;
  emoji: string;
}

export interface MessageEditEvent {
  messageId: string;
  chatId: string;
  ciphertext: string;
  iv: string;
  editedAt: number;
}

export interface MessageDeleteEvent {
  messageId: string;
  chatId: string;
  deletedAt: number;
}

// Auth types
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (credentials: UserCredentials) => Promise<User>;
  register: (data: UserRegistration) => Promise<User>;
  logout: () => Promise<void>;
  unlock: (password: string) => Promise<User>;
  clearData: () => void;
  updateProfile: (updates: Partial<User>) => Promise<User>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<boolean>;
  clearError: () => void;
  hasStoredData: () => boolean;
}

// Chat context types
export interface ChatState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  chats: Chat[];
  activeChat: Chat | null;
  messages: Record<string, Message[]>;
  onlineUsers: Set<string>;
  typingUsers: Record<string, string>;
  unreadCounts: Record<string, number>;
  connectionStatus: "connected" | "disconnected" | "connecting";
  error: string | null;
}

export interface ChatContextType extends ChatState {
  login: (userData: User, password: string) => Promise<void>;
  logout: () => void;
  sendMessage: (
    recipientId: string,
    content: string,
    chatId: string
  ) => Promise<void>;
  setActiveChat: (chat: Chat) => Promise<void>;
  sendTyping: (chatId: string, recipientId: string) => void;
  sendStoppedTyping: (chatId: string, recipientId: string) => void;
  markAsRead: (messageId: string, senderId: string) => void;
  addChat: (chat: Chat) => void;
  clearError: () => void;
  isOnline: (userId: string) => boolean;
  isTyping: (chatId: string) => string | undefined;
  addReaction: (messageId: string, emoji: string) => void;
  removeReaction: (messageId: string, emoji: string) => void;
  editMessage: (
    messageId: string,
    content: string,
    recipientId: string
  ) => Promise<void>;
  deleteMessage: (messageId: string) => void;
}

// Validation types
export interface ValidationResult {
  valid: boolean;
  error?: string;
  strength?: "weak" | "medium" | "strong";
}

// API response types
export interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ChatsResponse {
  chats: Chat[];
  unreadCounts: Record<string, number>;
}

export interface MessagesResponse {
  messages: Message[];
}

// Session types
export interface Session {
  id: string;
  userId: string;
  token: string;
  deviceInfo?: string | null;
  ipAddress?: string | null;
  expiresAt: Date;
  createdAt: Date;
}

// Audit log types
export interface AuditLog {
  id: string;
  userId?: string | null;
  action: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: string | null;
  createdAt: Date;
}

// Rate limit types
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
}

// Component props types
export interface ChatAppProps {}

export interface ChatSidebarProps {
  onChatSelect: (chat: Chat) => void;
  activeChat: Chat | null;
}

export interface ChatWindowProps {
  chat: Chat;
  onBack: () => void;
  isMobile: boolean;
}

export interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  senderName?: string | null;
}

export interface NewChatModalProps {
  onClose: () => void;
  onChatCreated: (chat: Chat) => void;
}

export interface ProfileModalProps {
  onClose: () => void;
}

export interface AuthPageProps {}

export interface UnlockPageProps {
  onSwitchToLogin: () => void;
}

export interface LoadingScreenProps {}
