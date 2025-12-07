/**
 * Message Reactions Component
 * Displays and manages emoji reactions on messages
 */

"use client";

import { useState, useRef, useEffect } from "react";
import type { MessageReaction } from "@/types";

// Common reaction emojis
const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

interface MessageReactionsProps {
  messageId: string;
  reactions: MessageReaction[];
  currentUserId: string;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  isOwnMessage: boolean;
}

export function MessageReactions({
  messageId,
  reactions,
  currentUserId,
  onAddReaction,
  onRemoveReaction,
  isOwnMessage,
}: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Group reactions by emoji with count
  const reactionCounts = reactions.reduce<
    Record<string, { count: number; hasUserReacted: boolean }>
  >((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = { count: 0, hasUserReacted: false };
    }
    acc[reaction.emoji].count++;
    if (reaction.userId === currentUserId) {
      acc[reaction.emoji].hasUserReacted = true;
    }
    return acc;
  }, {});

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleReactionClick = (emoji: string) => {
    const reaction = reactionCounts[emoji];
    if (reaction?.hasUserReacted) {
      onRemoveReaction(messageId, emoji);
    } else {
      onAddReaction(messageId, emoji);
    }
  };

  const handlePickerSelect = (emoji: string) => {
    onAddReaction(messageId, emoji);
    setShowPicker(false);
  };

  return (
    <div className="message-reactions-container">
      {/* Existing reactions */}
      {Object.keys(reactionCounts).length > 0 && (
        <div className={`reactions-display ${isOwnMessage ? "own" : ""}`}>
          {Object.entries(reactionCounts).map(
            ([emoji, { count, hasUserReacted }]) => (
              <button
                key={emoji}
                className={`reaction-badge ${hasUserReacted ? "active" : ""}`}
                onClick={() => handleReactionClick(emoji)}
                title={hasUserReacted ? "Remove reaction" : "Add reaction"}
              >
                <span className="reaction-emoji">{emoji}</span>
                <span className="reaction-count">{count}</span>
              </button>
            )
          )}
        </div>
      )}

      {/* Add reaction button */}
      <div className="reaction-picker-wrapper" ref={pickerRef}>
        <button
          className="add-reaction-btn"
          onClick={() => setShowPicker(!showPicker)}
          title="Add reaction"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm3.5-9c.828 0 1.5-.672 1.5-1.5S16.328 8 15.5 8 14 8.672 14 9.5s.672 1.5 1.5 1.5zm-7 0c.828 0 1.5-.672 1.5-1.5S9.328 8 8.5 8 7 8.672 7 9.5 7.672 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
          </svg>
        </button>

        {/* Emoji picker popup */}
        {showPicker && (
          <div className={`emoji-picker ${isOwnMessage ? "left" : "right"}`}>
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                className="emoji-option"
                onClick={() => handlePickerSelect(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .message-reactions-container {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
        }

        .reactions-display {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .reactions-display.own {
          justify-content: flex-end;
        }

        .reaction-badge {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 2px 6px;
          border-radius: 12px;
          background: rgba(0, 168, 132, 0.15);
          border: 1px solid rgba(0, 168, 132, 0.3);
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 12px;
        }

        .reaction-badge:hover {
          background: rgba(0, 168, 132, 0.25);
        }

        .reaction-badge.active {
          background: rgba(0, 168, 132, 0.3);
          border-color: rgba(0, 168, 132, 0.5);
        }

        .reaction-emoji {
          font-size: 14px;
        }

        .reaction-count {
          color: var(--text-secondary, #8696a0);
          font-size: 11px;
        }

        .reaction-picker-wrapper {
          position: relative;
        }

        .add-reaction-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: transparent;
          border: none;
          color: var(--text-secondary, #8696a0);
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s, background 0.2s;
        }

        .message-reactions-container:hover .add-reaction-btn,
        .add-reaction-btn:focus {
          opacity: 1;
        }

        .add-reaction-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--primary, #00a884);
        }

        .emoji-picker {
          position: absolute;
          bottom: 100%;
          margin-bottom: 8px;
          display: flex;
          gap: 4px;
          padding: 8px;
          background: var(--bg-secondary, #1f2c33);
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
          z-index: 100;
          animation: fadeIn 0.15s ease;
        }

        .emoji-picker.left {
          right: 0;
        }

        .emoji-picker.right {
          left: 0;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .emoji-option {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          font-size: 20px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.15s, background 0.15s;
        }

        .emoji-option:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: scale(1.2);
        }
      `}</style>
    </div>
  );
}

export default MessageReactions;
