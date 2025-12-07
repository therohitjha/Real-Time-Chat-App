/**
 * Message Bubble Component
 * Displays individual messages with status indicators
 */

"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import MessageReactions from "./MessageReactions";
import type { MessageBubbleProps } from "@/types";

export default function MessageBubble({
  message,
  isOwn,
  showAvatar: _showAvatar = false,
  senderName = null,
}: MessageBubbleProps) {
  const { user } = useAuth();
  const { addReaction, removeReaction, deleteMessage, editMessage } = useChat();
  const [showActions, setShowActions] = useState(false);

  // Status icons
  // ... (keeping existing helpers)

  const handleEdit = () => {
    // Simple prompt for MVP
    // eslint-disable-next-line no-alert
    const content = prompt("Edit message:", message.content);
    if (content && content !== message.content && message.recipientId) {
      editMessage(message.id, content, message.recipientId).catch(
        console.error
      );
    }
  };

  const handleDelete = () => {
    // eslint-disable-next-line no-alert
    if (confirm("Are you sure you want to delete this message?")) {
      deleteMessage(message.id);
    }
  };

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case "sending":
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
          </svg>
        );
      case "sent":
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        );
      case "delivered":
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="18 6 9 17 4 12" />
            <polyline points="22 6 13 17" />
          </svg>
        );
      case "read":
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="18 6 9 17 4 12" />
            <polyline points="22 6 13 17" />
          </svg>
        );
      default:
        return null;
    }
  };

  const formatTime = (timestamp: number | Date | undefined): string => {
    if (!timestamp) return "";
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      className={`message ${isOwn ? "outgoing" : "incoming"} ${
        message.isDeleted ? "deleted" : ""
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Sender name for group chats */}
      {senderName && !isOwn && <div className="sender-name">{senderName}</div>}

      {/* Message content */}
      <div className="message-content">
        {message.isDeleted ? (
          <span className="deleted-content">
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              stroke="currentColor"
              fill="none"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            This message was deleted
          </span>
        ) : (
          message.content
        )}
      </div>

      {/* Message meta */}
      <div className="message-meta">
        {message.isEdited && !message.isDeleted && (
          <span className="edited-label">Edited</span>
        )}

        <span className="message-time">
          {formatTime(message.timestamp || message.createdAt)}
        </span>

        {isOwn && (
          <span className={`message-status ${message.status || "sent"}`}>
            {getStatusIcon(message.status || "sent")}
          </span>
        )}

        {message.encrypted && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ opacity: 0.5 }}
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        )}
      </div>

      {/* Reactions */}
      {!message.isDeleted && (
        <MessageReactions
          messageId={message.id}
          reactions={message.reactions || []}
          currentUserId={user?.id || ""}
          onAddReaction={addReaction}
          onRemoveReaction={removeReaction}
          isOwnMessage={isOwn}
        />
      )}

      {/* Actions (Edit/Delete) */}
      {isOwn && !message.isDeleted && showActions && (
        <div className="message-actions">
          <button onClick={handleEdit} className="action-btn" title="Edit">
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button onClick={handleDelete} className="action-btn" title="Delete">
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      )}

      <style jsx>{`
        .sender-name {
          font-size: 0.75rem;
          color: var(--accent-tertiary);
          margin-bottom: 2px;
          font-weight: 500;
        }

        .deleted-content {
          font-style: italic;
          color: var(--text-tertiary);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .edited-label {
          font-size: 10px;
          color: var(--text-tertiary);
          margin-right: 4px;
        }

        .message-actions {
          position: absolute;
          top: -10px;
          right: ${isOwn ? "auto" : "-10px"};
          left: ${isOwn ? "-10px" : "auto"};
          background: var(--bg-secondary);
          padding: 4px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          display: flex;
          gap: 4px;
          opacity: 0;
          animation: fadeIn 0.1s forwards;
          z-index: 10;
        }

        .message:hover .message-actions {
          opacity: 1;
        }

        .action-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
        }

        .action-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--primary);
        }

        @keyframes fadeIn {
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
