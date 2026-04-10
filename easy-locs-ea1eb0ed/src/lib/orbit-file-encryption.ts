/**
 * Orbit File Encryption Utilities
 * Wraps orbit-crypto's encryptFile/decryptFile with convenient helpers
 * for the chat media upload flow.
 */

import { encryptFile, decryptFile } from "@/lib/orbit-crypto";

/** Encrypt a File object, returns encrypted blob + IV for storage */
export async function encryptFileForUpload(
  file: File,
  sharedKey: CryptoKey
): Promise<{ encryptedBlob: Blob; iv: string; originalName: string; originalType: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const { ct, iv } = await encryptFile(arrayBuffer, sharedKey);
  
  // Store as .enc to signal encrypted content
  const encryptedBlob = new Blob([ct], { type: "application/octet-stream" });
  
  return {
    encryptedBlob,
    iv,
    originalName: file.name,
    originalType: file.type,
  };
}

/** Decrypt a downloaded encrypted file back to its original form */
export async function decryptFileFromDownload(
  encryptedData: ArrayBuffer,
  iv: string,
  sharedKey: CryptoKey,
  originalType: string
): Promise<Blob> {
  const decrypted = await decryptFile(encryptedData, iv, sharedKey);
  return new Blob([decrypted], { type: originalType });
}

/** Build metadata string to embed in message content for encrypted files */
export function buildEncryptedFileRef(opts: {
  url: string;
  iv: string;
  originalName: string;
  originalType: string;
}): string {
  return `e2e-file:${JSON.stringify(opts)}`;
}

/** Parse encrypted file reference from message content */
export function parseEncryptedFileRef(content: string): {
  url: string;
  iv: string;
  originalName: string;
  originalType: string;
} | null {
  if (!content?.startsWith("e2e-file:")) return null;
  try {
    return JSON.parse(content.slice(9));
  } catch {
    return null;
  }
}
