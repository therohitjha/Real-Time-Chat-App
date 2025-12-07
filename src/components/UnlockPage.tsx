/**
 * Unlock Page Component
 * For returning users to unlock with their password
 */

"use client";

import { useState, useCallback, ChangeEvent, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import type { UnlockPageProps } from "@/types";

export default function UnlockPage({ onSwitchToLogin }: UnlockPageProps) {
  const [password, setPassword] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  const { unlock, clearData, error, clearError } = useAuth();
  const { login: chatLogin } = useChat();

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!password.trim()) {
        return;
      }

      setIsSubmitting(true);

      try {
        const user = await unlock(password);
        await chatLogin(user, password);
      } catch (err) {
        // Error is handled by AuthContext
        console.error("Unlock error:", err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [password, unlock, chatLogin]
  );

  const handlePasswordChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value);
      clearError();
    },
    [clearError]
  );

  const handleClearData = useCallback(() => {
    clearData();
    setShowClearConfirm(false);
    onSwitchToLogin();
  }, [clearData, onSwitchToLogin]);

  return (
    <div className="auth-container">
      <div className="auth-card animate-fadeIn">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-icon">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">
            Enter your password to unlock your messages
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              className={`form-input ${error ? "error" : ""}`}
              placeholder="Enter your password"
              value={password}
              onChange={handlePasswordChange}
              autoComplete="current-password"
              autoFocus
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="form-error-banner animate-fadeIn">{error}</div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={isSubmitting || !password.trim()}
          >
            {isSubmitting ? (
              <span className="btn-loading">
                <span className="loader-small"></span>
                Unlocking...
              </span>
            ) : (
              "Unlock"
            )}
          </button>
        </form>

        {/* Actions */}
        <div className="auth-toggle">
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            style={{ opacity: 0.7 }}
          >
            Sign in with different account
          </button>
        </div>

        {/* Encryption Badge */}
        <div className="encryption-badge">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Your messages are encrypted locally</span>
        </div>
      </div>

      {/* Clear Data Confirmation Modal */}
      {showClearConfirm && (
        <div className="modal-overlay animate-fadeIn">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Clear Local Data?</h3>
            </div>
            <div className="modal-body">
              <p>
                This will permanently delete all locally stored messages and
                encryption keys. You will need to sign in again.
              </p>
              <p
                style={{
                  color: "var(--text-error)",
                  marginTop: "var(--spacing-md)",
                }}
              >
                <strong>Warning:</strong> This action cannot be undone.
              </p>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="btn"
                onClick={handleClearData}
                style={{ background: "var(--text-error)", color: "white" }}
              >
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
