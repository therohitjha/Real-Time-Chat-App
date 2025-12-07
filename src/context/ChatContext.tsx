/**
 * Chat Context
 * Manages global chat state with E2E encryption
 */

"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  getSocketClient,
  clearSocketClient,
  SecureSocketClient,
} from "@/lib/socket/socket-client";
import { getKeyManager } from "@/lib/crypto/e2e-encryption";
import {
  storeMessageHistory,
  getMessageHistory,
} from "@/lib/crypto/secure-storage";
import type {
  User,
  Chat,
  Message,
  ChatContextType,
  TypingEvent,
  UserStatusEvent,
  MessageStatusEvent,
  PublicKeyEvent,
} from "@/types";

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChatState] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [socketClient, setSocketClient] = useState<SecureSocketClient | null>(
    null
  );

  // ==========================================
  // State Updaters (Defined first to be used in login)
  // ==========================================

  // Update message status
  const updateMessageStatus = useCallback(
    (messageId: string, status: "delivered" | "read") => {
      setMessages((prev) => {
        const updated: Record<string, Message[]> = {};
        for (const [chatId, chatMessages] of Object.entries(prev)) {
          updated[chatId] = chatMessages.map((msg) =>
            msg.id === messageId ? { ...msg, status } : msg
          );
        }
        return updated;
      });
    },
    []
  );

  // Handle incoming message
  const handleIncomingMessage = useCallback(
    (message: Message) => {
      const chatId = message.chatId;

      setMessages((prev) => {
        const chatMessages = prev[chatId] || [];
        return {
          ...prev,
          [chatId]: [...chatMessages, message],
        };
      });

      // Increment unread count if not in active chat
      if (!activeChat || activeChat.id !== chatId) {
        setUnreadCounts((prev) => ({
          ...prev,
          [chatId]: (prev[chatId] || 0) + 1,
        }));
      }

      // Update last message in chat list
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id === chatId) {
            return {
              ...chat,
              lastMessage: message.content,
              timestamp: message.timestamp || Date.now(),
              unread: activeChat?.id === chatId ? 0 : (chat.unread || 0) + 1,
            };
          }
          return chat;
        })
      );

      // Store message history
      storeMessageHistory(chatId, messages[chatId] || []).catch(console.error);
    },
    [activeChat, messages]
  );

  // Handle reaction updates
  const handleReaction = useCallback(
    (event: import("@/types").ReactionEvent, action: "add" | "remove") => {
      setMessages((prev) => {
        const updated = { ...prev };
        for (const chatId in updated) {
          updated[chatId] = updated[chatId].map((msg) => {
            if (msg.id === event.messageId) {
              const reactions = msg.reactions || [];
              let newReactions = [...reactions];

              if (action === "add") {
                // Check if already exists to avoid duplicates
                if (
                  !newReactions.some(
                    (r) => r.userId === event.userId && r.emoji === event.emoji
                  )
                ) {
                  newReactions.push({
                    id: `${event.messageId}-${event.userId}-${event.emoji}`,
                    messageId: event.messageId,
                    userId: event.userId,
                    emoji: event.emoji,
                    createdAt: new Date(),
                  });
                }
              } else {
                newReactions = newReactions.filter(
                  (r) => !(r.userId === event.userId && r.emoji === event.emoji)
                );
              }
              return { ...msg, reactions: newReactions };
            }
            return msg;
          });
        }
        return updated;
      });
    },
    []
  );

  // Handle message edits
  const handleMessageEdit = useCallback(
    (event: import("@/types").MessageEditEvent) => {
      setMessages((prev) => {
        const updated = { ...prev };
        const chatId = event.chatId;
        if (updated[chatId]) {
          updated[chatId] = updated[chatId].map((msg) => {
            if (msg.id === event.messageId) {
              return {
                ...msg,
                isEdited: true,
                editedAt: new Date(event.editedAt),
                // Note: Content update needs decryption, handling via reload for MVP
              };
            }
            return msg;
          });
        }
        return updated;
      });
    },
    []
  );

  // Handle message deletion
  const handleMessageDelete = useCallback(
    (event: import("@/types").MessageDeleteEvent) => {
      setMessages((prev) => {
        const updated = { ...prev };
        const chatId = event.chatId;
        if (updated[chatId]) {
          updated[chatId] = updated[chatId].map((msg) => {
            if (msg.id === event.messageId) {
              return {
                ...msg,
                isDeleted: true,
                deletedAt: new Date(event.deletedAt),
                content: "This message was deleted",
                ciphertext: "",
              };
            }
            return msg;
          });
        }
        return updated;
      });
    },
    []
  );

  // Load demo messages (helper)
  const loadDemoMessages = useCallback(
    (chatId: string, currentUserId: string) => {
      const demoMessages: Message[] = [
        {
          id: `${chatId}-msg-1`,
          chatId,
          senderId: "user-1",
          content: "Hey! How are you doing?",
          messageType: "text",
          status: "read",
          timestamp: Date.now() - 1000 * 60 * 60,
          fromSelf: false,
          encrypted: true,
        },
        {
          id: `${chatId}-msg-2`,
          chatId,
          senderId: currentUserId,
          content: "I'm doing great! Working on the new secure chat app.",
          messageType: "text",
          status: "read",
          timestamp: Date.now() - 1000 * 60 * 55,
          fromSelf: true,
          encrypted: true,
        },
        {
          id: `${chatId}-msg-3`,
          chatId,
          senderId: "user-1",
          content: "That sounds exciting! Is it using end-to-end encryption?",
          messageType: "text",
          status: "read",
          timestamp: Date.now() - 1000 * 60 * 50,
          fromSelf: false,
          encrypted: true,
        },
        {
          id: `${chatId}-msg-4`,
          chatId,
          senderId: currentUserId,
          content:
            "Yes! AES-256-GCM with ECDH key exchange. Military-grade security! 🔐",
          messageType: "text",
          status: "read",
          timestamp: Date.now() - 1000 * 60 * 45,
          fromSelf: true,
          encrypted: true,
        },
      ];

      setMessages((prev) => ({
        ...prev,
        [chatId]: demoMessages,
      }));
    },
    []
  );

  // Load demo chats (helper)
  const loadDemoChats = useCallback(() => {
    const demoChats: Chat[] = [
      {
        id: "chat-1",
        name: "Alice Johnson",
        isGroup: false,
        participants: [
          {
            id: "p1",
            chatId: "chat-1",
            userId: "user-1",
            role: "member",
            user: {
              id: "user-1",
              username: "alice_j",
              email: "alice@example.com",
              displayName: "Alice Johnson",
              isOnline: true,
            },
          },
        ],
        lastMessage: "Hey! How are you?",
        timestamp: Date.now() - 1000 * 60 * 5,
        unread: 2,
      },
      {
        id: "chat-2",
        name: "Bob Smith",
        isGroup: false,
        participants: [
          {
            id: "p2",
            chatId: "chat-2",
            userId: "user-2",
            role: "member",
            user: {
              id: "user-2",
              username: "bob_smith",
              email: "bob@example.com",
              displayName: "Bob Smith",
              isOnline: false,
            },
          },
        ],
        lastMessage: "The project looks great!",
        timestamp: Date.now() - 1000 * 60 * 30,
        unread: 0,
      },
      {
        id: "chat-3",
        name: "Development Team",
        isGroup: true,
        participants: [],
        lastMessage: "Charlie: Meeting at 3pm",
        timestamp: Date.now() - 1000 * 60 * 60,
        unread: 5,
      },
    ];

    setChats(demoChats);
    setOnlineUsers(new Set(["user-1"]));
  }, []);

  // ==========================================
  // Auth & Connection
  // ==========================================

  // Initialize socket connection when user logs in
  const login = useCallback(
    async (userData: User, _password: string): Promise<void> => {
      setIsLoading(true);
      setConnectionStatus("connecting");

      try {
        setUser(userData);
        setIsAuthenticated(true);

        // Initialize socket client
        if (userData.token) {
          const client = getSocketClient(userData.id);
          if (client) {
            // Set up socket handlers
            client.setHandlers({
              onConnect: () => {
                setConnectionStatus("connected");
                // Register public key
                const keyManager = getKeyManager();
                keyManager.getPublicKey().then((publicKey) => {
                  client.registerPublicKey(publicKey);
                });
              },
              onDisconnect: () => {
                setConnectionStatus("disconnected");
              },
              onMessage: (message: Message) => {
                handleIncomingMessage(message);
              },
              onTyping: (event: TypingEvent) => {
                setTypingUsers((prev) => ({
                  ...prev,
                  [event.chatId]: event.userId || "",
                }));
                // Auto-clear typing after 3 seconds
                setTimeout(() => {
                  setTypingUsers((prev) => {
                    const next = { ...prev };
                    delete next[event.chatId];
                    return next;
                  });
                }, 3000);
              },
              onStoppedTyping: (event: TypingEvent) => {
                setTypingUsers((prev) => {
                  const next = { ...prev };
                  delete next[event.chatId];
                  return next;
                });
              },
              onUserOnline: (event: UserStatusEvent) => {
                setOnlineUsers((prev) => new Set([...prev, event.userId]));
              },
              onUserOffline: (event: UserStatusEvent) => {
                setOnlineUsers((prev) => {
                  const next = new Set(prev);
                  next.delete(event.userId);
                  return next;
                });
              },
              onMessageDelivered: (event: MessageStatusEvent) => {
                updateMessageStatus(event.messageId, "delivered");
              },
              onMessageRead: (event: MessageStatusEvent) => {
                updateMessageStatus(event.messageId, "read");
              },
              onReactionAdded: (event: import("@/types").ReactionEvent) => {
                handleReaction(event, "add");
              },
              onReactionRemoved: (event: import("@/types").ReactionEvent) => {
                handleReaction(event, "remove");
              },
              onMessageEdited: (event: import("@/types").MessageEditEvent) => {
                handleMessageEdit(event);
              },
              onMessageDeleted: (
                event: import("@/types").MessageDeleteEvent
              ) => {
                handleMessageDelete(event);
              },
              onPublicKey: async (event: PublicKeyEvent) => {
                await client.establishChannel(event.userId, event.publicKey);
              },
              onError: (err: Error) => {
                console.error("Socket error:", err);
                setError(err.message);
              },
            });

            client.connect(userData.token);
            setSocketClient(client);
          }
        }

        // Load demo chats for UI display
        loadDemoChats();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Connection failed";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [
      handleIncomingMessage,
      handleReaction,
      handleMessageEdit,
      handleMessageDelete,
      loadDemoChats,
      updateMessageStatus,
    ]
  );

  // ==========================================
  // Client Actions
  // ==========================================

  // Send a message
  const sendMessage = useCallback(
    async (
      recipientId: string,
      content: string,
      chatId: string
    ): Promise<void> => {
      if (!socketClient || !user) {
        throw new Error("Not connected");
      }

      try {
        // Request public key if no channel exists
        if (!socketClient.hasChannel(recipientId)) {
          socketClient.requestPublicKey(recipientId);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        const messageId = await socketClient.sendMessage(
          recipientId,
          content,
          chatId
        );

        // Add message to local state immediately
        const newMessage: Message = {
          id: messageId,
          chatId,
          senderId: user.id,
          recipientId,
          content,
          messageType: "text",
          status: "sending",
          timestamp: Date.now(),
          fromSelf: true,
          encrypted: true,
        };

        setMessages((prev) => ({
          ...prev,
          [chatId]: [...(prev[chatId] || []), newMessage],
        }));

        // Update last message in chat list
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === chatId
              ? { ...chat, lastMessage: content, timestamp: Date.now() }
              : chat
          )
        );

        setTimeout(() => {
          updateMessageStatus(messageId, "delivered");
        }, 500);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to send message";
        setError(errorMessage);
        throw err;
      }
    },
    [socketClient, user, updateMessageStatus]
  );

  // Send typing indicator
  const sendTyping = useCallback(
    (chatId: string, recipientId: string): void => {
      socketClient?.sendTyping(chatId, recipientId);
    },
    [socketClient]
  );

  // Send stopped typing
  const sendStoppedTyping = useCallback(
    (chatId: string, recipientId: string): void => {
      socketClient?.sendStoppedTyping(chatId, recipientId);
    },
    [socketClient]
  );

  // Reactions
  const addReaction = useCallback(
    (messageId: string, emoji: string): void => {
      socketClient?.addReaction(messageId, emoji);
      if (user) {
        handleReaction({ messageId, userId: user.id, emoji }, "add");
      }
    },
    [socketClient, user, handleReaction]
  );

  const removeReaction = useCallback(
    (messageId: string, emoji: string): void => {
      socketClient?.removeReaction(messageId, emoji);
      if (user) {
        handleReaction({ messageId, userId: user.id, emoji }, "remove");
      }
    },
    [socketClient, user, handleReaction]
  );

  // Edit/Delete
  const editMessage = useCallback(
    async (
      messageId: string,
      content: string,
      recipientId: string
    ): Promise<void> => {
      await socketClient?.editMessage(messageId, content, recipientId);
      // Optimistic update omitted for simplicity regarding re-encryption/decryption flow
    },
    [socketClient]
  );

  const deleteMessage = useCallback(
    (messageId: string): void => {
      socketClient?.deleteMessage(messageId);

      let chatIdFound: string | undefined;
      for (const [cid, msgs] of Object.entries(messages)) {
        if (msgs.find((m) => m.id === messageId)) {
          chatIdFound = cid;
          break;
        }
      }

      if (chatIdFound) {
        handleMessageDelete({
          messageId,
          chatId: chatIdFound,
          deletedAt: Date.now(),
        });
      }
    },
    [socketClient, messages, handleMessageDelete]
  );

  // Mark message as read
  const markAsRead = useCallback(
    (messageId: string, senderId: string): void => {
      socketClient?.markAsRead(messageId, senderId);
      updateMessageStatus(messageId, "read");
    },
    [socketClient, updateMessageStatus]
  );

  // Add a new chat
  const addChat = useCallback((chat: Chat): void => {
    setChats((prev) => {
      if (prev.find((c) => c.id === chat.id)) {
        return prev;
      }
      return [chat, ...prev];
    });
  }, []);

  // Set active chat
  const setActiveChat = useCallback(
    async (chat: Chat): Promise<void> => {
      setActiveChatState(chat);

      setUnreadCounts((prev) => ({ ...prev, [chat.id]: 0 }));
      setChats((prev) =>
        prev.map((c) => (c.id === chat.id ? { ...c, unread: 0 } : c))
      );

      try {
        const history = await getMessageHistory(chat.id);
        if (history.length > 0) {
          setMessages((prev) => ({
            ...prev,
            [chat.id]: history as Message[],
          }));
        } else if (user) {
          loadDemoMessages(chat.id, user.id);
        }
      } catch (err) {
        console.error("Failed to load message history:", err);
        if (user) loadDemoMessages(chat.id, user.id);
      }

      if (socketClient) {
        socketClient.joinChat(chat.id);
      }
    },
    [socketClient, user, loadDemoMessages]
  );

  // Logout
  const logout = useCallback((): void => {
    clearSocketClient();
    setSocketClient(null);
    setUser(null);
    setIsAuthenticated(false);
    setChats([]);
    setMessages({});
    setActiveChatState(null);
    setOnlineUsers(new Set());
    setTypingUsers({});
    setUnreadCounts({});
    setConnectionStatus("disconnected");
  }, []);

  // Check if user is online
  const isOnline = useCallback(
    (userId: string): boolean => {
      return onlineUsers.has(userId);
    },
    [onlineUsers]
  );

  // Check if user is typing
  const isTyping = useCallback(
    (chatId: string): string | undefined => {
      return typingUsers[chatId];
    },
    [typingUsers]
  );

  // Clear error
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSocketClient();
    };
  }, []);

  const value: ChatContextType = {
    user,
    isAuthenticated,
    isLoading,
    chats,
    activeChat,
    messages,
    onlineUsers,
    typingUsers,
    unreadCounts,
    connectionStatus,
    error,
    login,
    logout,
    sendMessage,
    setActiveChat,
    sendTyping,
    sendStoppedTyping,
    markAsRead,
    addChat,
    clearError,
    isOnline,
    isTyping,
    addReaction,
    removeReaction,
    editMessage,
    deleteMessage,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextType {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
