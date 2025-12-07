/**
 * Secure Storage Module
 * Handles secure storage of encryption keys and sensitive data
 * Uses Web Crypto API for encrypting data at rest
 */

import type { ExportedKeyPair, User } from "@/types";

interface EncryptedData {
  iv: string;
  ciphertext: string;
}

const STORAGE_KEY_PREFIX = "secure_chat_";
const KEYS_STORAGE_NAME = `${STORAGE_KEY_PREFIX}encryption_keys`;

/**
 * Derive a key from password using PBKDF2
 */
async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: 600000, // OWASP recommended minimum for PBKDF2-SHA256
      hash: "SHA-256",
    },
    passwordKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Generate a random salt
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

/**
 * Encrypt data for storage
 */
async function encryptForStorage(
  data: string,
  key: CryptoKey
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encoder.encode(data)
  );

  const result: EncryptedData = {
    iv: arrayBufferToBase64(iv),
    ciphertext: arrayBufferToBase64(ciphertext),
  };

  return JSON.stringify(result);
}

/**
 * Decrypt data from storage
 */
async function decryptFromStorage(
  encryptedJson: string,
  key: CryptoKey
): Promise<string> {
  const { iv, ciphertext }: EncryptedData = JSON.parse(encryptedJson);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64ToArrayBuffer(iv),
    },
    key,
    base64ToArrayBuffer(ciphertext)
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

// Utility functions
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * SecureStorage class for managing encrypted local storage
 */
export class SecureStorage {
  private masterKey: CryptoKey | null = null;
  private salt: Uint8Array | null = null;
  private initialized: boolean = false;

  /**
   * Initialize secure storage with user password
   */
  async initialize(
    password: string,
    isNewUser: boolean = false
  ): Promise<void> {
    if (typeof window === "undefined") {
      throw new Error("SecureStorage can only be used in browser environment");
    }

    if (isNewUser) {
      // Generate new salt and store it
      this.salt = generateSalt();
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}salt`,
        arrayBufferToBase64(this.salt)
      );
    } else {
      // Load existing salt
      const storedSalt = localStorage.getItem(`${STORAGE_KEY_PREFIX}salt`);
      if (!storedSalt) {
        throw new Error("No stored credentials found. Please register first.");
      }
      this.salt = new Uint8Array(base64ToArrayBuffer(storedSalt));
    }

    // Derive master key from password
    this.masterKey = await deriveKeyFromPassword(password, this.salt);
    this.initialized = true;

    // Verify password for existing users
    if (!isNewUser) {
      try {
        const verificationData = localStorage.getItem(
          `${STORAGE_KEY_PREFIX}verification`
        );
        if (verificationData) {
          await decryptFromStorage(verificationData, this.masterKey);
        }
      } catch (_error) {
        this.masterKey = null;
        this.initialized = false;
        throw new Error("Invalid password");
      }
    } else {
      // Store verification data for new users
      const verificationData = await encryptForStorage(
        "verification_token",
        this.masterKey
      );
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}verification`,
        verificationData
      );
    }
  }

  /**
   * Check if secure storage is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Store encryption keys securely
   */
  async storeKeys(keys: ExportedKeyPair): Promise<void> {
    if (!this.initialized || !this.masterKey) {
      throw new Error("SecureStorage not initialized");
    }

    const encrypted = await encryptForStorage(
      JSON.stringify(keys),
      this.masterKey
    );
    localStorage.setItem(KEYS_STORAGE_NAME, encrypted);
  }

  /**
   * Retrieve encryption keys
   */
  async getKeys(): Promise<ExportedKeyPair | null> {
    if (!this.initialized || !this.masterKey) {
      throw new Error("SecureStorage not initialized");
    }

    const encrypted = localStorage.getItem(KEYS_STORAGE_NAME);
    if (!encrypted) {
      return null;
    }

    const decrypted = await decryptFromStorage(encrypted, this.masterKey);
    return JSON.parse(decrypted) as ExportedKeyPair;
  }

  /**
   * Store arbitrary secure data
   */
  async setItem<T>(key: string, value: T): Promise<void> {
    if (!this.initialized || !this.masterKey) {
      throw new Error("SecureStorage not initialized");
    }

    const encrypted = await encryptForStorage(
      JSON.stringify(value),
      this.masterKey
    );
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${key}`, encrypted);
  }

  /**
   * Retrieve secure data
   */
  async getItem<T>(key: string): Promise<T | null> {
    if (!this.initialized || !this.masterKey) {
      throw new Error("SecureStorage not initialized");
    }

    const encrypted = localStorage.getItem(`${STORAGE_KEY_PREFIX}${key}`);
    if (!encrypted) {
      return null;
    }

    try {
      const decrypted = await decryptFromStorage(encrypted, this.masterKey);
      return JSON.parse(decrypted) as T;
    } catch (_error) {
      console.error("Failed to decrypt item:", key);
      return null;
    }
  }

  /**
   * Remove an item from secure storage
   */
  removeItem(key: string): void {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${key}`);
  }

  /**
   * Clear all secure storage
   */
  clear(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    this.masterKey = null;
    this.salt = null;
    this.initialized = false;
  }

  /**
   * Lock the storage (clear keys from memory)
   */
  lock(): void {
    this.masterKey = null;
    this.initialized = false;
  }

  /**
   * Check if storage data exists
   */
  hasStoredData(): boolean {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}salt`) !== null;
  }
}

// Singleton instance
let secureStorageInstance: SecureStorage | null = null;

export function getSecureStorage(): SecureStorage {
  if (!secureStorageInstance) {
    secureStorageInstance = new SecureStorage();
  }
  return secureStorageInstance;
}

/**
 * Store message history securely
 */
export async function storeMessageHistory(
  chatId: string,
  messages: unknown[]
): Promise<void> {
  const storage = getSecureStorage();
  await storage.setItem(`messages_${chatId}`, messages);
}

/**
 * Retrieve message history
 */
export async function getMessageHistory(chatId: string): Promise<unknown[]> {
  const storage = getSecureStorage();
  return (await storage.getItem<unknown[]>(`messages_${chatId}`)) || [];
}

/**
 * Store user profile securely
 */
export async function storeUserProfile(profile: User): Promise<void> {
  const storage = getSecureStorage();
  await storage.setItem("user_profile", profile);
}

/**
 * Get user profile
 */
export async function getUserProfile(): Promise<User | null> {
  const storage = getSecureStorage();
  return await storage.getItem<User>("user_profile");
}
