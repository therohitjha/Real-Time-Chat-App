/**
 * Components Index
 * Central export for all reusable components
 */

// Core components
export { default as ChatApp } from "./ChatApp";
export { default as ChatSidebar } from "./ChatSidebar";
export { default as ChatWindow } from "./ChatWindow";
export { default as MessageBubble } from "./MessageBubble";
export { default as NewChatModal } from "./NewChatModal";
export { default as ProfileModal } from "./ProfileModal";
export { default as AuthPage } from "./AuthPage";
export { default as UnlockPage } from "./UnlockPage";
export { default as LoadingScreen } from "./LoadingScreen";

// New components
export { default as ErrorBoundary, ChatErrorBoundary } from "./ErrorBoundary";
export { default as ThemeToggle } from "./ThemeToggle";
export { default as MessageReactions } from "./MessageReactions";

// Skeleton loaders
export {
  Skeleton,
  ChatItemSkeleton,
  ChatListSkeleton,
  MessageSkeleton,
  MessagesListSkeleton,
  AvatarSkeleton,
  ProfileHeaderSkeleton,
  SearchResultSkeleton,
  PageSkeleton,
} from "./Skeletons";
