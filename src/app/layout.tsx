import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ChatProvider } from "@/context/ChatContext";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0b141a",
};

export const metadata: Metadata = {
  title: "SecureChat - End-to-End Encrypted Messaging",
  description:
    "A secure, real-time messaging application with military-grade end-to-end encryption. Your privacy is our priority.",
  keywords: [
    "secure chat",
    "encrypted messaging",
    "E2E encryption",
    "private messaging",
  ],
  authors: [{ name: "SecureChat Team" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AuthProvider>
          <ChatProvider>{children}</ChatProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
