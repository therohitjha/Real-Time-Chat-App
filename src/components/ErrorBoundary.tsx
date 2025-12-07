/**
 * Error Boundary Component
 * Catches JavaScript errors in child components and displays fallback UI
 */

"use client";

import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-content">
            <div className="error-icon">
              <svg
                viewBox="0 0 24 24"
                width="64"
                height="64"
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            </div>
            <h2>Something went wrong</h2>
            <p className="error-message">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <div className="error-actions">
              <button onClick={this.handleRetry} className="retry-btn">
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="reload-btn"
              >
                Reload Page
              </button>
            </div>
          </div>

          <style jsx>{`
            .error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 200px;
              padding: 32px;
              background: var(--bg-primary, #0b141a);
            }

            .error-content {
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
              max-width: 400px;
            }

            .error-icon {
              color: #f44336;
              margin-bottom: 16px;
              opacity: 0.8;
            }

            h2 {
              color: var(--text-primary, #e9edef);
              font-size: 24px;
              font-weight: 600;
              margin: 0 0 8px 0;
            }

            .error-message {
              color: var(--text-secondary, #8696a0);
              font-size: 14px;
              margin: 0 0 24px 0;
              line-height: 1.5;
            }

            .error-actions {
              display: flex;
              gap: 12px;
            }

            button {
              padding: 10px 24px;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s ease;
            }

            .retry-btn {
              background: var(--primary, #00a884);
              color: white;
              border: none;
            }

            .retry-btn:hover {
              background: var(--primary-hover, #008f72);
              transform: translateY(-1px);
            }

            .reload-btn {
              background: transparent;
              color: var(--text-secondary, #8696a0);
              border: 1px solid var(--border, #2a373f);
            }

            .reload-btn:hover {
              background: rgba(255, 255, 255, 0.05);
              color: var(--text-primary, #e9edef);
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Chat-specific error boundary with custom messaging
 */
export function ChatErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="chat-error">
          <div className="chat-error-content">
            <span className="error-emoji">💬</span>
            <h3>Chat Error</h3>
            <p>There was a problem loading this chat. Please try refreshing.</p>
            <button onClick={() => window.location.reload()}>Refresh</button>
          </div>

          <style jsx>{`
            .chat-error {
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100%;
              background: var(--bg-secondary, #111b21);
            }

            .chat-error-content {
              text-align: center;
              padding: 32px;
            }

            .error-emoji {
              font-size: 48px;
              opacity: 0.5;
            }

            h3 {
              color: var(--text-primary, #e9edef);
              margin: 16px 0 8px 0;
            }

            p {
              color: var(--text-secondary, #8696a0);
              margin: 0 0 16px 0;
            }

            button {
              padding: 8px 20px;
              background: var(--primary, #00a884);
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
            }

            button:hover {
              background: var(--primary-hover, #008f72);
            }
          `}</style>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
