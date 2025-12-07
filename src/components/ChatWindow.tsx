/**
 * Chat Window Component
 * Displays messages and input for active chat
 */

"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import {
  validateMessage,
  sanitizeMessage,
} from "@/lib/security/input-validation";
import MessageBubble from "./MessageBubble";
import type { ChatWindowProps } from "@/types";

export default function ChatWindow({
  chat,
  onBack,
  isMobile,
}: ChatWindowProps) {
  const [message, setMessage] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { user } = useAuth();
  const {
    messages,
    sendMessage,
    sendTyping,
    sendStoppedTyping,
    isTyping,
    isOnline,
  } = useChat();

  const chatMessages = useMemo(
    () => messages[chat.id] || [],
    [messages, chat.id]
  );

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Focus input when chat opens
  useEffect(() => {
    inputRef.current?.focus();
  }, [chat.id]);

  const getRecipientId = useCallback((): string => {
    if (!chat.participants || chat.participants.length === 0) return "";
    return chat.participants[0]?.userId || "";
  }, [chat.participants]);

  const handleMessageChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setMessage(value);

      // Handle typing indicator
      const recipientId = getRecipientId();
      if (recipientId) {
        sendTyping(chat.id, recipientId);

        // Clear previous timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout to stop typing
        typingTimeoutRef.current = setTimeout(() => {
          sendStoppedTyping(chat.id, recipientId);
        }, 2000);
      }
    },
    [chat.id, sendTyping, sendStoppedTyping, getRecipientId]
  );

  const handleSubmit = useCallback(
    async (e?: FormEvent<HTMLFormElement>) => {
      e?.preventDefault();

      const trimmedMessage = message.trim();
      const validation = validateMessage(trimmedMessage);
      if (!validation.valid) {
        return;
      }

      const recipientId = getRecipientId();
      if (!recipientId) {
        console.error("No recipient found");
        return;
      }

      setIsSending(true);
      const sanitizedMessage = sanitizeMessage(trimmedMessage);

      try {
        await sendMessage(recipientId, sanitizedMessage, chat.id);
        setMessage("");
        sendStoppedTyping(chat.id, recipientId);
      } catch (err) {
        console.error("Failed to send message:", err);
      } finally {
        setIsSending(false);
      }
    },
    [message, chat.id, sendMessage, sendStoppedTyping, getRecipientId]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const getInitials = (name: string | undefined | null): string => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const recipientId = getRecipientId();
  const typing = isTyping(chat.id);
  const online = isOnline(recipientId);

  return (
    <div className="chat-window">
      {/* Header */}
      <header className="chat-header">
        {isMobile && (
          <button className="icon-btn" onClick={onBack}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        <div className="avatar">
          {getInitials(chat.name)}
          {online && !chat.isGroup && (
            <span className="status-dot online"></span>
          )}
        </div>

        <div className="chat-info">
          <div className="chat-name">{chat.name}</div>
          <div className="chat-status">
            {typing ? (
              <span className="typing-indicator">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                typing...
              </span>
            ) : online ? (
              "Online"
            ) : (
              "Offline"
            )}
          </div>
        </div>

        <div className="chat-actions">
          <button className="icon-btn" title="Search">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <button className="icon-btn" title="More options">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="messages-container">
        {/* Encryption Notice */}
        <div className="encryption-notice">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>
            Messages are end-to-end encrypted. No one outside of this chat can
            read them.
          </span>
        </div>

        {/* Message List */}
        {chatMessages.map((msg) => {
          const isOwn = msg.fromSelf || msg.senderId === user?.id;
          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={isOwn}
              showAvatar={chat.isGroup && !isOwn}
              senderName={chat.isGroup && !isOwn ? "User" : undefined} // Ideally get name from participants
            />
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form className="message-input-container" onSubmit={handleSubmit}>
        <button type="button" className="icon-btn" title="Emoji">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </button>

        <button type="button" className="icon-btn" title="Attach file">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        <input
          ref={inputRef}
          type="text"
          className="message-input"
          placeholder="Type a message"
          value={message}
          onChange={handleMessageChange}
          onKeyDown={handleKeyDown}
          disabled={isSending}
        />

        <button
          type="submit"
          className="send-btn"
          disabled={!message.trim() || isSending}
        >
          {isSending ? (
            <svg
              className="animate-spin"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                strokeOpacity="0.2"
              />
              <path
                d="M12 2a10 10 0 0 1 10 10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}
