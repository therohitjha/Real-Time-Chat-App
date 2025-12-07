/**
 * Loading Screen Component
 * Displayed while the app is initializing
 */

"use client";

import type { LoadingScreenProps } from "@/types";

export default function LoadingScreen(_props: LoadingScreenProps) {
  return (
    <div className="loading-container">
      <div className="loading-content">
        {/* App Logo/Icon */}
        <div className="loading-icon">
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            <circle cx="12" cy="16" r="1" />
          </svg>
        </div>

        {/* App Name */}
        <h1 className="loading-title">SecureChat</h1>

        {/* Loading Spinner */}
        <div
          className="loader"
          style={{ marginTop: "var(--spacing-xl)" }}
        ></div>

        {/* Loading Text */}
        <p className="loading-text">Initializing encryption...</p>

        {/* Encryption Badge */}
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
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>End-to-End Encrypted</span>
        </div>
      </div>
    </div>
  );
}
