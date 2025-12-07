/**
 * Main Chat Application Component
 */

"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import ChatSidebar from "./ChatSidebar";
import ChatWindow from "./ChatWindow";
import NewChatModal from "./NewChatModal";
import ProfileModal from "./ProfileModal";
import { ChatErrorBoundary, ThemeToggle } from "./";
import type { Chat, ChatAppProps } from "@/types";

export default function ChatApp(_props: ChatAppProps) {
  const [showNewChat, setShowNewChat] = useState<boolean>(false);
  const [showProfile, setShowProfile] = useState<boolean>(false);
  const [showSidebar, setShowSidebar] = useState<boolean>(true);

  const { user, logout } = useAuth();
  const { activeChat, setActiveChat, connectionStatus } = useChat();

  const handleChatSelect = useCallback(
    async (chat: Chat) => {
      await setActiveChat(chat);
      // Hide sidebar on mobile when chat is selected
      if (window.innerWidth < 768) {
        setShowSidebar(false);
      }
    },
    [setActiveChat]
  );

  const handleBack = useCallback(() => {
    setShowSidebar(true);
  }, []);

  const handleNewChatCreated = useCallback(
    async (chat: Chat) => {
      setShowNewChat(false);
      await setActiveChat(chat);
    },
    [setActiveChat]
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
    <div className="chat-app">
      {/* Sidebar */}
      <aside
        className={`chat-sidebar ${
          !showSidebar && activeChat ? "hidden-mobile" : ""
        }`}
      >
        {/* User Header */}
        <header className="sidebar-header">
          <div
            className="avatar"
            style={{ cursor: "pointer" }}
            onClick={() => setShowProfile(true)}
          >
            {getInitials(user?.displayName)}
          </div>
          <span style={{ flex: 1, fontWeight: 500 }}>{user?.displayName}</span>

          {/* Connection Status */}
          <div
            className={`status-dot ${connectionStatus}`}
            title={
              connectionStatus === "connected" ? "Connected" : "Disconnected"
            }
          />

          <ThemeToggle />

          <button
            className="icon-btn"
            onClick={() => setShowNewChat(true)}
            title="New Chat"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <button className="icon-btn" onClick={logout} title="Logout">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </header>

        {/* Chat List */}
        <ChatSidebar onChatSelect={handleChatSelect} activeChat={activeChat} />
      </aside>

      {/* Main Chat Area */}
      <main
        className={`chat-main ${
          showSidebar && !activeChat ? "hidden-mobile" : ""
        }`}
      >
        {activeChat ? (
          <ChatErrorBoundary>
            <ChatWindow
              chat={activeChat}
              onBack={handleBack}
              isMobile={!showSidebar}
            />
          </ChatErrorBoundary>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <svg
                width="120"
                height="120"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <rect
                  x="3"
                  y="11"
                  width="8"
                  height="6"
                  rx="1"
                  fill="currentColor"
                  opacity="0.2"
                />
                <circle cx="12" cy="10" r="1" fill="currentColor" />
                <circle cx="8" cy="10" r="1" fill="currentColor" />
                <circle cx="16" cy="10" r="1" fill="currentColor" />
              </svg>
            </div>
            <h2 className="empty-title">SecureChat</h2>
            <p className="empty-text">
              Select a conversation or start a new chat to begin messaging
              securely.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => setShowNewChat(true)}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Start New Chat
            </button>

            <div
              className="encryption-badge"
              style={{ marginTop: "var(--spacing-2xl)" }}
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
              <span>End-to-End Encrypted</span>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onChatCreated={handleNewChatCreated}
        />
      )}

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      <style jsx>{`
        .hidden-mobile {
          display: none;
        }
        @media (min-width: 768px) {
          .hidden-mobile {
            display: flex;
          }
        }
      `}</style>
    </div>
  );
}
