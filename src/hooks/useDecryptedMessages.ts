/**
 * useDecryptedMessages — Decrypts e2e: prefixed messages on the fly
 * Messages prefixed with "e2e:" are decrypted using the shared key with the sender.
 * Non-encrypted messages pass through unchanged.
 */
import { useState, useEffect, useRef } from "react";
import { isOutgoingMessage } from "@/domains/orbit/resolvers";
import { decompressMessage } from "@/lib/orbit-message-compress";
interface DecryptableMessage {
  id: string;
  content: string;
  sender_id: string | null;
  [key: string]: any;
}

interface UseDecryptedMessagesResult {
  messages: DecryptableMessage[];
  isDecrypting: boolean;
}

export function useDecryptedMessages(
  rawMessages: DecryptableMessage[],
  decrypt: ((ciphertext: string, peerId: string) => Promise<string | null>) | undefined,
  userId: string | undefined
): UseDecryptedMessagesResult {
  const [decrypted, setDecrypted] = useState<DecryptableMessage[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const cacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!rawMessages.length) {
      setDecrypted([]);
      return;
    }

    // If no decrypt function or no user, pass through
    if (!decrypt || !userId) {
      setDecrypted(rawMessages);
      return;
    }

    const hasEncrypted = rawMessages.some(m => m.content?.startsWith("e2e:"));
    if (!hasEncrypted) {
      setDecrypted(rawMessages);
      return;
    }

    let cancelled = false;
    setIsDecrypting(true);

    (async () => {
      const results: DecryptableMessage[] = [];
      for (const msg of rawMessages) {
        if (!msg.content?.startsWith("e2e:") || !msg.sender_id) {
          results.push(msg);
          continue;
        }

        // Check cache
        const cached = cacheRef.current.get(msg.id);
        if (cached) {
          results.push({ ...msg, content: cached });
          continue;
        }

        try {
          const peerId = isOutgoingMessage(msg, userId) ? userId : msg.sender_id;
          const plain = await decrypt(msg.content, peerId);
          let finalContent = plain || "🔒 [Encrypted message]";
          // Decompress if compressed
          finalContent = await decompressMessage(finalContent);
          cacheRef.current.set(msg.id, finalContent);
          results.push({ ...msg, content: finalContent });
        } catch {
          results.push({ ...msg, content: "🔒 [Unable to decrypt]" });
        }
      }
      if (!cancelled) {
        setDecrypted(results);
        setIsDecrypting(false);
      }
    })();

    return () => { cancelled = true; };
  }, [rawMessages, decrypt, userId]);

  return { messages: decrypted, isDecrypting };
}
