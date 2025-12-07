/**
 * New Chat Modal Component
 * For starting new conversations
 */

"use client";

import { useState, useCallback, ChangeEvent } from "react";
import { useChat } from "@/context/ChatContext";
import type { Chat, NewChatModalProps, User } from "@/types";

interface DemoContact extends User {
  id: string;
  username: string;
  displayName: string;
  email: string;
}

// Demo contacts for display
const demoContacts: DemoContact[] = [
  {
    id: "contact-1",
    username: "alice_j",
    displayName: "Alice Johnson",
    email: "alice@example.com",
  },
  {
    id: "contact-2",
    username: "bob_smith",
    displayName: "Bob Smith",
    email: "bob@example.com",
  },
  {
    id: "contact-3",
    username: "charlie_b",
    displayName: "Charlie Brown",
    email: "charlie@example.com",
  },
  {
    id: "contact-4",
    username: "diana_p",
    displayName: "Diana Prince",
    email: "diana@example.com",
  },
  {
    id: "contact-5",
    username: "edward_s",
    displayName: "Edward Stark",
    email: "edward@example.com",
  },
];

export default function NewChatModal({
  onClose,
  onChatCreated,
}: NewChatModalProps) {
  const { addChat } = useChat();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<DemoContact[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const query = searchQuery.toLowerCase();
      const results = demoContacts.filter(
        (contact) =>
          contact.displayName.toLowerCase().includes(query) ||
          contact.username.toLowerCase().includes(query) ||
          contact.email.toLowerCase().includes(query)
      );

      setSearchResults(results);
    } catch (_err) {
      setError("Failed to search users");
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
      // Debounced search
      setTimeout(() => handleSearch(), 300);
    },
    [handleSearch]
  );

  const handleSelectUser = useCallback(
    (user: DemoContact) => {
      const newChat: Chat = {
        id: `chat-${user.id}`,
        name: user.displayName,
        isGroup: false,
        participants: [
          {
            id: `p-${user.id}`,
            chatId: `chat-${user.id}`,
            userId: user.id,
            role: "member",
            user: user,
          },
        ],
        lastMessage: null,
        timestamp: Date.now(),
        unread: 0,
      };

      addChat(newChat);
      onChatCreated(newChat);
    },
    [addChat, onChatCreated]
  );

  const getInitials = (name: string | undefined): string => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">New Chat</h3>
          <button className="modal-close icon-btn" onClick={onClose}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Search Input */}
          <div
            className="search-input-wrapper"
            style={{ marginBottom: "var(--spacing-lg)" }}
          >
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
              placeholder="Search by name, username, or email"
              value={searchQuery}
              onChange={handleInputChange}
              autoFocus
            />
            {isSearching && (
              <svg
                className="animate-spin"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                style={{ color: "var(--accent-primary)" }}
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
            )}
          </div>

          {error && (
            <div
              style={{
                padding: "var(--spacing-md)",
                background: "rgba(241, 92, 109, 0.1)",
                borderRadius: "var(--radius-md)",
                marginBottom: "var(--spacing-md)",
                color: "var(--text-error)",
                fontSize: "0.875rem",
              }}
            >
              {error}
            </div>
          )}

          {/* Results */}
          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            {searchQuery ? (
              searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="chat-item"
                    onClick={() => handleSelectUser(user)}
                    style={{ borderRadius: "var(--radius-md)" }}
                  >
                    <div className="avatar">
                      {getInitials(user.displayName)}
                    </div>
                    <div className="chat-info">
                      <div className="chat-name">{user.displayName}</div>
                      <div className="last-message">@{user.username}</div>
                    </div>
                  </div>
                ))
              ) : !isSearching ? (
                <div
                  style={{
                    padding: "var(--spacing-2xl)",
                    textAlign: "center",
                    color: "var(--text-tertiary)",
                  }}
                >
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    style={{ margin: "0 auto var(--spacing-md)", opacity: 0.5 }}
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <p>No users found</p>
                </div>
              ) : null
            ) : (
              <>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "var(--spacing-sm)",
                    paddingLeft: "var(--spacing-sm)",
                  }}
                >
                  Suggested Contacts
                </div>
                {demoContacts.map((user) => (
                  <div
                    key={user.id}
                    className="chat-item"
                    onClick={() => handleSelectUser(user)}
                    style={{ borderRadius: "var(--radius-md)" }}
                  >
                    <div className="avatar">
                      {getInitials(user.displayName)}
                    </div>
                    <div className="chat-info">
                      <div className="chat-name">{user.displayName}</div>
                      <div className="last-message">@{user.username}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Security Note */}
          <div
            className="encryption-badge"
            style={{
              marginTop: "var(--spacing-lg)",
              justifyContent: "center",
              width: "100%",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>All chats are end-to-end encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
