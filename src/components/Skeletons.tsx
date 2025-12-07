/**
 * Skeleton Loaders
 * Loading placeholder components for better perceived performance
 */

"use client";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}

/**
 * Base skeleton component
 */
export function Skeleton({
  className = "",
  width,
  height,
  borderRadius = 4,
}: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        borderRadius:
          typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
      }}
    >
      <style jsx>{`
        .skeleton {
          background: linear-gradient(
            90deg,
            var(--skeleton-base, rgba(255, 255, 255, 0.05)) 0%,
            var(--skeleton-highlight, rgba(255, 255, 255, 0.1)) 50%,
            var(--skeleton-base, rgba(255, 255, 255, 0.05)) 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Chat list item skeleton
 */
export function ChatItemSkeleton() {
  return (
    <div className="chat-item-skeleton">
      <Skeleton width={48} height={48} borderRadius="50%" />
      <div className="content">
        <Skeleton width="60%" height={16} borderRadius={8} />
        <Skeleton width="80%" height={12} borderRadius={6} />
      </div>

      <style jsx>{`
        .chat-item-skeleton {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
        }

        .content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
      `}</style>
    </div>
  );
}

/**
 * Chat list skeleton (multiple items)
 */
export function ChatListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="chat-list-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <ChatItemSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Message bubble skeleton
 */
export function MessageSkeleton({
  isOwn = false,
  index = 0,
}: {
  isOwn?: boolean;
  index?: number;
}) {
  // Deterministic width based on index to avoid Math.random during render
  const widths = [65, 45, 55, 70, 50, 60, 40, 75];
  const width = widths[index % widths.length];

  return (
    <div className={`message-skeleton ${isOwn ? "own" : ""}`}>
      <Skeleton width={`${width}%`} height={40} borderRadius={12} />

      <style jsx>{`
        .message-skeleton {
          display: flex;
          margin: 4px 16px;
        }

        .message-skeleton.own {
          justify-content: flex-end;
        }
      `}</style>
    </div>
  );
}

/**
 * Messages list skeleton
 */
export function MessagesListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="messages-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <MessageSkeleton key={i} isOwn={i % 3 === 0} index={i} />
      ))}

      <style jsx>{`
        .messages-skeleton {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 16px 0;
        }
      `}</style>
    </div>
  );
}

/**
 * User avatar skeleton
 */
export function AvatarSkeleton({ size = 40 }: { size?: number }) {
  return <Skeleton width={size} height={size} borderRadius="50%" />;
}

/**
 * Profile header skeleton
 */
export function ProfileHeaderSkeleton() {
  return (
    <div className="profile-header-skeleton">
      <AvatarSkeleton size={80} />
      <div className="info">
        <Skeleton width={150} height={20} borderRadius={10} />
        <Skeleton width={200} height={14} borderRadius={7} />
      </div>

      <style jsx>{`
        .profile-header-skeleton {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 24px;
        }

        .info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
      `}</style>
    </div>
  );
}

/**
 * Search result skeleton
 */
export function SearchResultSkeleton() {
  return (
    <div className="search-result-skeleton">
      <Skeleton width={40} height={40} borderRadius="50%" />
      <div className="content">
        <Skeleton width="50%" height={14} borderRadius={7} />
        <Skeleton width="30%" height={12} borderRadius={6} />
      </div>

      <style jsx>{`
        .search-result-skeleton {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
        }

        .content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
      `}</style>
    </div>
  );
}

/**
 * Full page loading skeleton
 */
export function PageSkeleton() {
  return (
    <div className="page-skeleton">
      <div className="sidebar">
        <div className="header">
          <Skeleton width={120} height={24} borderRadius={12} />
        </div>
        <ChatListSkeleton count={6} />
      </div>
      <div className="main">
        <div className="header">
          <Skeleton width={160} height={20} borderRadius={10} />
        </div>
        <MessagesListSkeleton count={10} />
      </div>

      <style jsx>{`
        .page-skeleton {
          display: flex;
          height: 100vh;
          background: var(--bg-primary, #0b141a);
        }

        .sidebar {
          width: 360px;
          border-right: 1px solid var(--border, #2a373f);
        }

        .sidebar .header {
          padding: 16px;
          border-bottom: 1px solid var(--border, #2a373f);
        }

        .main {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--bg-secondary, #111b21);
        }

        .main .header {
          padding: 16px;
          border-bottom: 1px solid var(--border, #2a373f);
        }

        @media (max-width: 768px) {
          .sidebar {
            width: 100%;
          }
          .main {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

export default Skeleton;
