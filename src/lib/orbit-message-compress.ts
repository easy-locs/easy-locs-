/**
 * Orbit Message Compression — Reduce payload before encryption
 * 
 * Uses the CompressionStream API (native browser) with deflate-raw.
 * Falls back to no compression on unsupported browsers.
 * 
 * Typical text compression: 40-60% size reduction.
 */

const COMPRESS_MARKER = "\x01CMP\x01";
const MIN_COMPRESS_LENGTH = 64; // Don't compress tiny messages

export async function compressMessage(plaintext: string): Promise<string> {
  if (plaintext.length < MIN_COMPRESS_LENGTH || !supportsCompression()) {
    return plaintext;
  }

  try {
    const encoded = new TextEncoder().encode(plaintext);
    const cs = new CompressionStream("deflate-raw");
    const writer = cs.writable.getWriter();
    writer.write(encoded.buffer as ArrayBuffer);
    writer.close();

    const reader = cs.readable.getReader();
    const chunks: Uint8Array[] = [];
    let totalLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalLength += value.length;
    }

    const compressed = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      compressed.set(chunk, offset);
      offset += chunk.length;
    }

    // Only use compression if it actually saves space
    if (compressed.length >= encoded.length) {
      return plaintext;
    }

    return COMPRESS_MARKER + bufferToBase64(compressed);
  } catch {
    return plaintext;
  }
}

export async function decompressMessage(data: string): Promise<string> {
  if (!data.startsWith(COMPRESS_MARKER)) {
    return data;
  }

  try {
    const compressed = base64ToBuffer(data.slice(COMPRESS_MARKER.length));
    const ds = new DecompressionStream("deflate-raw");
    const writer = ds.writable.getWriter();
    writer.write(compressed.buffer as ArrayBuffer);
    writer.close();

    const reader = ds.readable.getReader();
    const chunks: Uint8Array[] = [];
    let totalLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalLength += value.length;
    }

    const decompressed = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      decompressed.set(chunk, offset);
      offset += chunk.length;
    }

    return new TextDecoder().decode(decompressed);
  } catch {
    return data; // Return as-is if decompression fails
  }
}

function supportsCompression(): boolean {
  return typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";
}

function bufferToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
