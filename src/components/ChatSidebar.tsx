/**
 * Chat Sidebar Component
 * Displays list of chats with search functionality
 */

"use client";

import { useState, useCallback, useMemo, ChangeEvent } from "react";
import { ChatListSkeleton } from "./"; // Import from index
import { useChat } from "@/context/ChatContext";
import type { Chat, ChatSidebarProps } from "@/types";

export default function ChatSidebar({
  onChatSelect,
  activeChat,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { chats, isOnline, isTyping, unreadCounts, isLoading } = useChat();

  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) {
      return chats;
    }
    const query = searchQuery.toLowerCase();
    return chats.filter((chat) => chat.name?.toLowerCase().includes(query));
  }, [chats, searchQuery]);

  const formatTime = (timestamp: number | undefined): string => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const getInitials = (name: string | undefined | null): string => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const getParticipantId = (chat: Chat): string => {
    if (!chat.participants || chat.participants.length === 0) return "";
    return chat.participants[0]?.userId || "";
  };

  return (
    <div className="chat-list-container">
      {/* Search */}
      <div className="search-container">
        <div className="search-input-wrapper">
          <svg
            className="search-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="chat-list">
        {isLoading ? (
          <ChatListSkeleton count={6} />
        ) : filteredChats.length === 0 ? (
          <div
            style={{
              padding: "var(--spacing-2xl)",
              textAlign: "center",
              color: "var(--text-tertiary)",
            }}
          >
            {searchQuery ? "No chats found" : "No conversations yet"}
          </div>
        ) : (
          filteredChats.map((chat) => {
            const participantId = getParticipantId(chat);
            const online = isOnline(participantId);
            const typing = isTyping(chat.id);
            const unread = unreadCounts[chat.id] || chat.unread || 0;

            return (
              <div
                key={chat.id}
                className={`chat-item ${
                  activeChat?.id === chat.id ? "active" : ""
                }`}
                onClick={() => onChatSelect(chat)}
              >
                <div className="avatar">
                  {getInitials(chat.name)}
                  {online && !chat.isGroup && (
                    <span className="status-dot online"></span>
                  )}
                </div>
                <div className="chat-info">
                  <div className="chat-name">{chat.name}</div>
                  <div className="last-message">
                    {typing ? (
                      <span className="typing-indicator">
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                        typing...
                      </span>
                    ) : (
                      chat.lastMessage || "No messages yet"
                    )}
                  </div>
                </div>
                <div className="chat-meta">
                  <div className="chat-time">{formatTime(chat.timestamp)}</div>
                  {unread > 0 && (
                    <div className="unread-badge">
                      {unread > 99 ? "99+" : unread}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
