/**
 * Authentication Context
 * Manages user authentication state with secure storage
 */

"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  getSecureStorage,
  storeUserProfile,
  getUserProfile,
} from "@/lib/crypto/secure-storage";
import { getKeyManager } from "@/lib/crypto/e2e-encryption";
import type {
  User,
  UserCredentials,
  UserRegistration,
  AuthContextType,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check if there's stored data on mount
  useEffect(() => {
    const checkStoredData = async () => {
      const storage = getSecureStorage();
      if (typeof window !== "undefined" && storage.hasStoredData()) {
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    };

    checkStoredData();
  }, []);

  // Helper function for API calls
  const apiRequest = async <T,>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Request failed");
    }

    return data as T;
  };

  // Register new user
  const register = useCallback(
    async (data: UserRegistration): Promise<User> => {
      setIsLoading(true);
      setError(null);

      try {
        // Initialize secure storage with the password
        const storage = getSecureStorage();
        await storage.initialize(data.password, true);

        // Generate encryption keys
        const keyManager = getKeyManager();
        const publicKey = await keyManager.initialize();

        // Store keys securely
        const keys = await keyManager.exportKeys();
        await storage.storeKeys(keys);

        // Register with the server
        const response = await apiRequest<{ user: User; token: string }>(
          "/auth/register",
          {
            method: "POST",
            body: JSON.stringify({
              ...data,
              publicKey,
            }),
          }
        );

        // Store user profile
        const userWithToken: User = { ...response.user, token: response.token };
        await storeUserProfile(userWithToken);

        setUser(userWithToken);
        setIsAuthenticated(true);
        return userWithToken;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Registration failed";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Login existing user
  const login = useCallback(
    async (credentials: UserCredentials): Promise<User> => {
      setIsLoading(true);
      setError(null);

      try {
        // Initialize secure storage with the password
        const storage = getSecureStorage();
        await storage.initialize(credentials.password, false);

        // Load encryption keys
        const keys = await storage.getKeys();
        if (keys) {
          const keyManager = getKeyManager();
          await keyManager.loadKeys(keys.privateKey, keys.publicKey);
        }

        // Authenticate with the server
        const response = await apiRequest<{ user: User; token: string }>(
          "/auth/login",
          {
            method: "POST",
            body: JSON.stringify(credentials),
          }
        );

        // Update stored user profile
        const userWithToken: User = { ...response.user, token: response.token };
        await storeUserProfile(userWithToken);

        setUser(userWithToken);
        setIsAuthenticated(true);
        return userWithToken;
      } catch (err) {
        const storage = getSecureStorage();
        storage.lock();
        const errorMessage =
          err instanceof Error ? err.message : "Login failed";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Unlock with password (for returning users)
  const unlock = useCallback(async (password: string): Promise<User> => {
    setIsLoading(true);
    setError(null);

    try {
      // Initialize secure storage with password
      const storage = getSecureStorage();
      await storage.initialize(password, false);

      // Get stored user profile
      const storedUser = await getUserProfile();
      if (!storedUser) {
        throw new Error("No user profile found");
      }

      // Load encryption keys
      const keys = await storage.getKeys();
      if (keys) {
        const keyManager = getKeyManager();
        await keyManager.loadKeys(keys.privateKey, keys.publicKey);
      }

      // Verify session with server (optional, can skip for offline mode)
      try {
        if (storedUser.token) {
          const response = await apiRequest<{ valid: boolean; user: User }>(
            "/auth/verify",
            {
              headers: {
                Authorization: `Bearer ${storedUser.token}`,
              },
            }
          );
          if (!response.valid) {
            throw new Error("Session expired");
          }
        }
      } catch (verifyError) {
        // Continue in offline mode if server is unavailable
        console.warn("Could not verify session:", verifyError);
      }

      setUser(storedUser);
      setIsAuthenticated(true);
      return storedUser;
    } catch (err) {
      const storage = getSecureStorage();
      storage.lock();
      const errorMessage = err instanceof Error ? err.message : "Unlock failed";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      // Notify server
      if (user?.token) {
        await apiRequest("/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });
      }
    } catch (err) {
      console.warn("Logout request failed:", err);
    }

    // Lock secure storage (keeps data but clears keys from memory)
    const storage = getSecureStorage();
    storage.lock();

    setUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);
  }, [user?.token]);

  // Clear all local data
  const clearData = useCallback((): void => {
    const storage = getSecureStorage();
    storage.clear();
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  }, []);

  // Update profile
  const updateProfile = useCallback(
    async (updates: Partial<User>): Promise<User> => {
      if (!user?.token) {
        throw new Error("Not authenticated");
      }

      try {
        const response = await apiRequest<{ user: User }>("/user/profile", {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify(updates),
        });

        const updatedUser: User = { ...user, ...response.user };
        await storeUserProfile(updatedUser);
        setUser(updatedUser);
        return updatedUser;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Update failed";
        setError(errorMessage);
        throw err;
      }
    },
    [user]
  );

  // Change password
  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<boolean> => {
      if (!user?.token) {
        throw new Error("Not authenticated");
      }

      try {
        await apiRequest<{ success: boolean }>("/auth/change-password", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ currentPassword, newPassword }),
        });

        // Re-encrypt storage with new password
        const storage = getSecureStorage();
        const keys = await storage.getKeys();
        const storedUser = await getUserProfile();

        storage.clear();
        await storage.initialize(newPassword, true);

        if (keys) await storage.storeKeys(keys);
        if (storedUser) await storeUserProfile(storedUser);

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Password change failed";
        setError(errorMessage);
        throw err;
      }
    },
    [user?.token]
  );

  // Check if stored data exists
  const hasStoredData = useCallback((): boolean => {
    const storage = getSecureStorage();
    return storage.hasStoredData();
  }, []);

  // Clear error
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    unlock,
    clearData,
    updateProfile,
    changePassword,
    clearError,
    hasStoredData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
