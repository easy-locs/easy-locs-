/**
 * Call Media Key — Ephemeral per-call media encryption keys.
 * Separate domain from chat/wallet/ghost keys.
 * Supports Insertable Streams E2EE where available.
 */

export async function createCallMediaKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function exportCallMediaKey(key: CryptoKey): Promise<Uint8Array> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return new Uint8Array(raw);
}

export async function importCallMediaKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw as unknown as ArrayBuffer, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function derivePeerMediaContext(
  localPrivateKey: CryptoKey,
  remotePublicKey: CryptoKey,
  roomId: string
): Promise<CryptoKey> {
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: remotePublicKey },
    localPrivateKey,
    256
  );

  const baseKey = await crypto.subtle.importKey("raw", sharedBits, "HKDF", false, ["deriveKey"]);

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new TextEncoder().encode(`call-media:${roomId}`),
      info: new TextEncoder().encode("orbit-call-media-e2ee"),
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

// ─── Insertable Streams E2EE ─────────────────────────────

let currentFrameKey: Uint8Array | null = null;

export function setFrameEncryptionKey(key: Uint8Array) {
  currentFrameKey = key;
}

export function clearFrameEncryptionKey() {
  if (currentFrameKey) {
    // Zero out key material
    currentFrameKey.fill(0);
    currentFrameKey = null;
  }
  console.log("[call-vault] media_keys_destroyed");
}

export function isInsertableStreamsSupported(): boolean {
  return typeof (window as any).RTCRtpScriptTransform !== "undefined" ||
    (typeof RTCRtpSender !== "undefined" && "createEncodedStreams" in RTCRtpSender.prototype);
}

/**
 * Create a simple XOR-based frame transform for Insertable Streams.
 * Production should use AES-GCM per frame — this is a baseline implementation.
 */
export function createSenderTransform(): TransformStream {
  return new TransformStream({
    transform(frame: any, controller: any) {
      if (!currentFrameKey) {
        controller.enqueue(frame);
        return;
      }
      const data = new Uint8Array(frame.data);
      for (let i = 0; i < data.length; i++) {
        data[i] ^= currentFrameKey[i % currentFrameKey.length];
      }
      frame.data = data.buffer;
      controller.enqueue(frame);
    },
  });
}

export function createReceiverTransform(): TransformStream {
  return new TransformStream({
    transform(frame: any, controller: any) {
      if (!currentFrameKey) {
        controller.enqueue(frame);
        return;
      }
      const data = new Uint8Array(frame.data);
      for (let i = 0; i < data.length; i++) {
        data[i] ^= currentFrameKey[i % currentFrameKey.length];
      }
      frame.data = data.buffer;
      controller.enqueue(frame);
    },
  });
}

export async function attachSenderTransform(sender: RTCRtpSender): Promise<boolean> {
  if (!isInsertableStreamsSupported()) return false;
  try {
    const streams = (sender as any).createEncodedStreams?.();
    if (streams) {
      streams.readable.pipeThrough(createSenderTransform()).pipeTo(streams.writable);
      console.log("[call-vault] sender_e2ee_attached");
      return true;
    }
  } catch (e) {
    console.warn("[call-vault] sender_e2ee_failed", e);
  }
  return false;
}

export async function attachReceiverTransform(receiver: RTCRtpReceiver): Promise<boolean> {
  if (!isInsertableStreamsSupported()) return false;
  try {
    const streams = (receiver as any).createEncodedStreams?.();
    if (streams) {
      streams.readable.pipeThrough(createReceiverTransform()).pipeTo(streams.writable);
      console.log("[call-vault] receiver_e2ee_attached");
      return true;
    }
  } catch (e) {
    console.warn("[call-vault] receiver_e2ee_failed", e);
  }
  return false;
}
