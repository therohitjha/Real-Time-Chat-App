"use client";

import { useAuth } from "@/context/AuthContext";
import LoadingScreen from "@/components/LoadingScreen";
import AuthPage from "@/components/AuthPage";
import UnlockPage from "@/components/UnlockPage";
import ChatApp from "@/components/ChatApp";

export default function Home() {
  const { isAuthenticated, isLoading, hasStoredData } = useAuth();

  // Show loading screen while initializing
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Show chat app if authenticated
  if (isAuthenticated) {
    return <ChatApp />;
  }

  // Show unlock page if there's stored data
  if (hasStoredData()) {
    return <UnlockPage onSwitchToLogin={() => {}} />;
  }

  // Show auth page for new users
  return <AuthPage />;
}
