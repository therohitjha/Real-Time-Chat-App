/**
 * Theme Toggle Component
 * Switch between dark and light themes
 */

"use client";

import { useState, useCallback, useSyncExternalStore } from "react";

type Theme = "dark" | "light";

// External store for theme state to avoid setState in useEffect
function getThemeSnapshot(): Theme {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem("theme") as Theme) || "dark";
}

function getServerSnapshot(): Theme {
  return "dark";
}

function subscribeToTheme(callback: () => void): () => void {
  // Listen for storage changes from other tabs
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerSnapshot
  );
  const [mounted, setMounted] = useState(false);

  // Initialize on first render
  if (typeof window !== "undefined" && !mounted) {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme) {
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
    setMounted(true);
  }

  const toggleTheme = useCallback(() => {
    const newTheme = theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    // Trigger re-render by dispatching storage event manually
    window.dispatchEvent(
      new StorageEvent("storage", { key: "theme", newValue: newTheme })
    );
  }, [theme]);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div
        className="theme-toggle-placeholder"
        style={{ width: 36, height: 36 }}
      />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        // Sun icon for light mode
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
        </svg>
      ) : (
        // Moon icon for dark mode
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
        </svg>
      )}

      <style jsx>{`
        .theme-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          border: none;
          color: var(--text-secondary, #8696a0);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .theme-toggle:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--primary, #00a884);
          transform: rotate(15deg);
        }

        .theme-toggle:active {
          transform: scale(0.95) rotate(15deg);
        }
      `}</style>
    </button>
  );
}

export default ThemeToggle;
