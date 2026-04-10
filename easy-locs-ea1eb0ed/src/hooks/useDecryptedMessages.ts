/**
 * useDecryptedMessages — Decrypts e2e: prefixed messages on the fly
 * Messages prefixed with "e2e:" are decrypted using the shared key with the sender.
 * Non-encrypted messages pass through unchanged (synchronous fast path).
 *
 * STABILITY: decrypt function stored in ref to prevent infinite re-render loops.
 * A boolean `decryptReady` flag drives re-decryption when decrypt becomes available,
 * without depending on the function identity itself.
 */
import { useState, useEffect, useRef, useMemo } from "react";
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
  const [asyncDecrypted, setAsyncDecrypted] = useState<DecryptableMessage[] | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const cacheRef = useRef<Map<string, string>>(new Map());
  const decryptRef = useRef(decrypt);
  decryptRef.current = decrypt;

  const decryptReady = !!decrypt;

  const hasEncrypted = useMemo(
    () => rawMessages.some(m => m.content?.startsWith("e2e:")),
    [rawMessages]
  );

  useEffect(() => {
    if (!rawMessages.length || !hasEncrypted || !decryptRef.current || !userId) {
      setAsyncDecrypted(null);
      setIsDecrypting(false);
      return;
    }

    let cancelled = false;
    setIsDecrypting(true);

    (async () => {
      const fn = decryptRef.current;
      if (!fn) {
        if (!cancelled) { setAsyncDecrypted(null); setIsDecrypting(false); }
        return;
      }

      const results = await Promise.all(
        rawMessages.map(async (msg): Promise<DecryptableMessage> => {
          if (!msg.content?.startsWith("e2e:") || !msg.sender_id) return msg;

          const cached = cacheRef.current.get(msg.id);
          if (cached) return { ...msg, content: cached };

          try {
            const peerId = isOutgoingMessage(msg, userId) ? userId : msg.sender_id;
            const plain = await fn(msg.content, peerId);
            let finalContent = plain || "🔒 [Encrypted message]";
            finalContent = await decompressMessage(finalContent);
            cacheRef.current.set(msg.id, finalContent);
            return { ...msg, content: finalContent };
          } catch {
            return { ...msg, content: "🔒 [Unable to decrypt]" };
          }
        })
      );

      if (!cancelled) {
        setAsyncDecrypted(results);
        setIsDecrypting(false);
      }
    })();

    return () => { cancelled = true; };
  }, [rawMessages, userId, decryptReady, hasEncrypted]);

  const messages = hasEncrypted && asyncDecrypted ? asyncDecrypted : rawMessages;

  return { messages, isDecrypting };
}
