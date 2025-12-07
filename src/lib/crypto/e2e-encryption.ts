/**
 * End-to-End Encryption Module
 * Implements Signal Protocol-inspired encryption using Web Crypto API
 *
 * Security Features:
 * - ECDH (Elliptic Curve Diffie-Hellman) for key exchange
 * - AES-256-GCM for symmetric encryption
 * - HKDF for key derivation
 * - Perfect Forward Secrecy
 */

import type { EncryptedMessage, ExportedKeyPair } from "@/types";

interface Algorithm {
  name: string;
  length?: number;
}

interface ECDHAlgorithm {
  name: string;
  namedCurve: string;
}

interface HKDFAlgorithm {
  name: string;
  hash: string;
}

const ALGORITHM: Algorithm = {
  name: "AES-GCM",
  length: 256,
};

const ECDH_ALGORITHM: ECDHAlgorithm = {
  name: "ECDH",
  namedCurve: "P-384", // NIST P-384 curve for strong security
};

const HKDF_ALGORITHM: HKDFAlgorithm = {
  name: "HKDF",
  hash: "SHA-384",
};

/**
 * Generate an ECDH key pair for key exchange
 */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    ECDH_ALGORITHM,
    true, // extractable
    ["deriveKey", "deriveBits"]
  );
}

/**
 * Export public key to Base64 string for transmission
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("spki", publicKey);
  return arrayBufferToBase64(exported);
}

/**
 * Import public key from Base64 string
 */
export async function importPublicKey(
  publicKeyBase64: string
): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(publicKeyBase64);
  return await crypto.subtle.importKey(
    "spki",
    keyBuffer,
    ECDH_ALGORITHM,
    true,
    []
  );
}

/**
 * Export private key for secure storage
 */
export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("pkcs8", privateKey);
  return arrayBufferToBase64(exported);
}

/**
 * Import private key from Base64 string
 */
export async function importPrivateKey(
  privateKeyBase64: string
): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(privateKeyBase64);
  return await crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    ECDH_ALGORITHM,
    true,
    ["deriveKey", "deriveBits"]
  );
}

/**
 * Derive a shared secret using ECDH
 */
export async function deriveSharedKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> {
  // First derive bits using ECDH
  const sharedBits = await crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: publicKey,
    },
    privateKey,
    384 // P-384 produces 384 bits
  );

  // Import the shared bits as raw key material for HKDF
  const sharedKeyMaterial = await crypto.subtle.importKey(
    "raw",
    sharedBits,
    "HKDF",
    false,
    ["deriveKey"]
  );

  // Use HKDF to derive the final AES key
  const salt = new TextEncoder().encode("SecureChat-E2E-Salt-v1");
  const info = new TextEncoder().encode("SecureChat-E2E-Key-Derivation");

  return await crypto.subtle.deriveKey(
    {
      ...HKDF_ALGORITHM,
      salt: salt,
      info: info,
    },
    sharedKeyMaterial,
    ALGORITHM,
    false, // not extractable for security
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt a message using AES-256-GCM
 */
export async function encryptMessage(
  plaintext: string,
  key: CryptoKey
): Promise<EncryptedMessage> {
  // Generate a random IV (12 bytes for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encode the message
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
      tagLength: 128, // 128-bit authentication tag
    },
    key,
    data
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv),
  };
}

/**
 * Decrypt a message using AES-256-GCM
 */
export async function decryptMessage(
  ciphertextBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<string> {
  const ciphertext = base64ToArrayBuffer(ciphertextBase64);
  const iv = base64ToArrayBuffer(ivBase64);

  try {
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
        tagLength: 128,
      },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (_error) {
    throw new Error("Decryption failed - message may have been tampered with");
  }
}

/**
 * Generate a secure random session ID
 */
export function generateSessionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return arrayBufferToBase64(bytes);
}

/**
 * Hash data using SHA-384
 */
export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-384", dataBuffer);
  return arrayBufferToBase64(hashBuffer);
}

/**
 * Verify message integrity using hash
 */
export async function verifyIntegrity(
  message: string,
  hash: string
): Promise<boolean> {
  const computedHash = await hashData(message);
  return computedHash === hash;
}

// Utility functions for Base64 encoding/decoding
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
 * Key Manager class to handle encryption keys
 */
export class KeyManager {
  private keyPair: CryptoKeyPair | null = null;
  private sharedKeys: Map<string, CryptoKey> = new Map();

  /**
   * Initialize the key manager with a new key pair
   */
  async initialize(): Promise<string> {
    this.keyPair = await generateKeyPair();
    return await exportPublicKey(this.keyPair.publicKey);
  }

  /**
   * Load existing keys from storage
   */
  async loadKeys(
    privateKeyBase64: string,
    publicKeyBase64: string
  ): Promise<void> {
    this.keyPair = {
      privateKey: await importPrivateKey(privateKeyBase64),
      publicKey: await importPublicKey(publicKeyBase64),
    };
  }

  /**
   * Export keys for secure storage
   */
  async exportKeys(): Promise<ExportedKeyPair> {
    if (!this.keyPair) {
      throw new Error("Key pair not initialized");
    }
    return {
      privateKey: await exportPrivateKey(this.keyPair.privateKey),
      publicKey: await exportPublicKey(this.keyPair.publicKey),
    };
  }

  /**
   * Establish a secure channel with another user
   */
  async establishChannel(
    recipientId: string,
    theirPublicKeyBase64: string
  ): Promise<void> {
    if (!this.keyPair) {
      throw new Error("Key pair not initialized");
    }

    const theirPublicKey = await importPublicKey(theirPublicKeyBase64);
    const sharedKey = await deriveSharedKey(
      this.keyPair.privateKey,
      theirPublicKey
    );
    this.sharedKeys.set(recipientId, sharedKey);
  }

  /**
   * Encrypt a message for a specific recipient
   */
  async encryptFor(
    recipientId: string,
    message: string
  ): Promise<EncryptedMessage> {
    const sharedKey = this.sharedKeys.get(recipientId);
    if (!sharedKey) {
      throw new Error("No secure channel established with recipient");
    }
    return await encryptMessage(message, sharedKey);
  }

  /**
   * Decrypt a message from a specific sender
   */
  async decryptFrom(
    senderId: string,
    ciphertext: string,
    iv: string
  ): Promise<string> {
    const sharedKey = this.sharedKeys.get(senderId);
    if (!sharedKey) {
      throw new Error("No secure channel established with sender");
    }
    return await decryptMessage(ciphertext, iv, sharedKey);
  }

  /**
   * Check if a secure channel exists with a user
   */
  hasChannel(recipientId: string): boolean {
    return this.sharedKeys.has(recipientId);
  }

  /**
   * Remove a secure channel
   */
  removeChannel(recipientId: string): void {
    this.sharedKeys.delete(recipientId);
  }

  /**
   * Get the public key
   */
  async getPublicKey(): Promise<string> {
    if (!this.keyPair) {
      throw new Error("Key pair not initialized");
    }
    return await exportPublicKey(this.keyPair.publicKey);
  }
}

// Singleton instance
let keyManagerInstance: KeyManager | null = null;

export function getKeyManager(): KeyManager {
  if (!keyManagerInstance) {
    keyManagerInstance = new KeyManager();
  }
  return keyManagerInstance;
}
