/**
 * useRentalMessaging — Atomic: tenant messaging (load, send, realtime).
 * MIGRATED: All DB ops via rental-data.repository.
 */
import { useState, useEffect, useCallback } from "react";
import * as rentalRepo from "@/repositories/rental-data.repository";

export function useRentalMessaging(orgId: string | null, tenantId: string | null, userId: string | undefined) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const loadMessages = useCallback(async () => {
    if (!orgId || !tenantId) return;
    const data = await rentalRepo.fetchChatMessages(orgId, tenantId);
    setMessages(data);
  }, [orgId, tenantId]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !tenantId || !orgId || !userId) return;
    const body = newMessage.trim();
    try {
      await rentalRepo.insertChatMessage(orgId, tenantId, userId, body);
      setNewMessage("");
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), conversation_id: `tenant_${orgId}_${tenantId}`, sender_user_id: userId, body, created_at: new Date().toISOString() }]);
    } catch (err) {
      return err;
    }
    return null;
  }, [newMessage, tenantId, orgId, userId]);

  // Realtime listener
  useEffect(() => {
    if (!orgId || !tenantId) return;
    return rentalRepo.subscribeToRentalChat(
      tenantId,
      (msg) => setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]),
      (updated) => setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))),
    );
  }, [orgId, tenantId]);

  return { messages, newMessage, setNewMessage, loadMessages, sendMessage };
}
