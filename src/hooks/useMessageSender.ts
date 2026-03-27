/**
 * useMessageSender — Extracted from HudChatPanel.
 * Handles text message sending (V2 + legacy), optimistic UI, offline queue, E2E encryption.
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";
import { buildSecurityPayload, type SecurityLevel } from "@/lib/message-security";
import { computeDisappearAt } from "@/hooks/usePrivacySettings";
import { getCountryConfig } from "@/lib/country-config";
import { buildAppUrl } from "@/lib/app-domain";
import { toast } from "sonner";
import type { ConversationThread, ChatMessage } from "@/components/communication-hub/types";

const SYSTEM_SENDER_ID = "00000000-0000-0000-0000-000000000000";
const escapeEmailHtml = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const normalizeEmail = (e: string | null | undefined) => (e || "").trim().toLowerCase();
const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

interface UseMessageSenderParams {
  thread: ConversationThread | null;
  orgId: string | null | undefined;
  userId: string | undefined;
  locale: string;
  myOrbitId: string | null;
  e2eReady: boolean;
  encrypt: (text: string, peerId: string) => Promise<string | null>;
  offline: { isOnline: boolean; queueMessage: (...args: any[]) => Promise<string> };
  privacySettings: { defaultDisappearTtl: string; readReceipts: boolean };
  disappearTTL: string;
  securityLevel: SecurityLevel;
  setSecurityLevel: (l: SecurityLevel) => void;
  selectedCategory: string;
  replyTo: { msgId: string; content: string; senderName?: string } | null;
  setReplyTo: (r: null) => void;
  setRawMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setPendingOffline: React.Dispatch<React.SetStateAction<any[]>>;
  onThreadUpdate: (threadId: string, updates: Partial<ConversationThread>) => void;
  resolveAuthUserId: () => Promise<string | null>;
}

export function useMessageSender(params: UseMessageSenderParams) {
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");

  const handleSend = useCallback(async () => {
    const {
      thread, orgId, locale, myOrbitId, e2eReady, encrypt, offline,
      privacySettings, disappearTTL, securityLevel, setSecurityLevel,
      selectedCategory, replyTo, setReplyTo, setRawMessages, setPendingOffline,
      onThreadUpdate, resolveAuthUserId,
    } = params;

    if (!newMessage.trim() || !thread) return;
    const msgText = newMessage.trim();

    const authUserId = await resolveAuthUserId();
    if (!authUserId) return;

    if (!orgId) {
      toast.error("Please select a workspace to send messages");
      return;
    }

    const { checkMessageRate, detectAbuse } = await import("@/lib/orbit-rate-limiter");
    const rateCheck = checkMessageRate(authUserId);
    if (!rateCheck.allowed) {
      toast.error(rateCheck.inCooldown ? `Too many messages. Wait ${rateCheck.retryAfter}s` : "Slow down...");
      return;
    }
    const abuseCheck = detectAbuse(msgText);
    if (abuseCheck.suspicious) {
      toast.error(abuseCheck.reason || "Message blocked");
      return;
    }

    // Optimistic insert
    const optimisticId = `opt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const optimisticMsg: ChatMessage = {
      id: optimisticId, content: msgText, sender_id: authUserId,
      created_at: new Date().toISOString(), read: false, message_type: "user",
      category: selectedCategory,
    } as any;
    setRawMessages(prev => [...prev, optimisticMsg]);
    setNewMessage("");
    const currentReplyTo = replyTo;
    setReplyTo(null);

    const { compressMessage } = await import("@/lib/orbit-message-compress");
    const content = await compressMessage(msgText);

    let storedContent = content;
    let isEncrypted = false;
    const peerId = thread.tenantId || thread.contextId || thread.id;
    if (e2eReady && peerId) {
      const encrypted = await encrypt(content, peerId);
      if (encrypted) { storedContent = encrypted; isEncrypted = true; }
    }

    // Offline queue
    if (!offline.isOnline) {
      const queuedId = await offline.queueMessage(storedContent, isEncrypted, {
        tenantId: thread.tenantId, bookingId: thread.bookingId,
        bookingType: thread.bookingType,
        contactName: thread.conversationType !== "property" ? thread.name : undefined,
        contactEmail: thread.conversationType !== "property" ? thread.email : undefined,
        category: thread.conversationType === "listing" ? "real_estate" : selectedCategory,
        senderLocale: locale, propertyId: thread.propertyId,
        contextType: thread.contextType, contextId: thread.contextId,
        threadDbId: thread.threadId,
      });
      setRawMessages(prev => prev.map(m => m.id === optimisticId ? { ...m, id: queuedId } as any : m));
      setPendingOffline(prev => [...prev, { id: queuedId }]);
      toast("📡 Queued — will send when back online", { duration: 2000 });
      return;
    }

    setSending(true);
    try {
      // V2 canonical path
      if (thread.isV2 && thread.v2ConversationId) {
        if (!thread.peerUserId || thread.peerUserId === authUserId) {
          setRawMessages(prev => prev.filter(m => m.id !== optimisticId));
          toast.error("Destinataire invalide pour cette conversation.");
          return;
        }
        const { error: v2Err } = await (supabase as any)
          .from("chat_messages_v2")
          .insert({
            conversation_id: thread.v2ConversationId,
            sender_user_id: authUserId,
            sender_orbit_id: myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
            receiver_orbit_id: thread.peerOrbitId ?? null,
            type: "text", body: storedContent,
          });
        if (v2Err) {
          setRawMessages(prev => prev.filter(m => m.id !== optimisticId));
          toast.error("Failed to send: " + v2Err.message);
          setNewMessage(msgText);
          return;
        }
        await (supabase as any).from("conversations_v2")
          .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", thread.v2ConversationId);
        platformBus.emit("orbit:message_sent", {
          threadId: thread.id, contextId: thread.contextId,
          recipientName: thread.name, contentPreview: content.slice(0, 80),
        }, "orbit", { userId: authUserId, orgId });
        onThreadUpdate(thread.id, { lastMessage: msgText, lastMessageTime: new Date().toISOString() });
        setSecurityLevel("normal");
        setSending(false);
        return;
      }

      // Legacy path
      let tenantLocale = "en";
      if (thread.tenantId) {
        const { data: tData } = await supabase.from("tenants").select("preferred_locale").eq("id", thread.tenantId).maybeSingle();
        if (tData?.preferred_locale) tenantLocale = tData.preferred_locale;
        else tenantLocale = getCountryConfig(thread.propertyCountry || "FR").locale.slice(0, 2);
      } else tenantLocale = getCountryConfig(thread.propertyCountry || "FR").locale.slice(0, 2);

      let translatedContent: string | null = null;
      if (locale !== tenantLocale) {
        try {
          const { data: transData } = await supabase.functions.invoke("translate-message", { body: { text: content, from_locale: locale, to_locale: tenantLocale } });
          if (transData?.translated) translatedContent = transData.translated;
        } catch (e) { console.error("Translation failed:", e); }
      }

      const effectiveTTL = disappearTTL !== "off" ? disappearTTL : privacySettings.defaultDisappearTtl;
      const disappearAt = computeDisappearAt(effectiveTTL);
      const secPayload = buildSecurityPayload(securityLevel);

      const insertPayload: any = {
        org_id: orgId, sender_id: authUserId, tenant_id: thread.tenantId || null,
        booking_id: thread.bookingId || null, booking_type: thread.bookingType || null,
        contact_name: thread.conversationType !== "property" ? thread.name : undefined,
        contact_email: thread.conversationType !== "property" ? thread.email : undefined,
        content: storedContent, translated_content: translatedContent,
        category: thread.conversationType === "listing" ? "real_estate" : selectedCategory,
        sender_locale: locale, read: false, message_type: "user",
        property_id: thread.propertyId || null, conversation_status: "waiting_tenant",
        context_type: thread.contextType, context_id: thread.contextId,
        encrypted: isEncrypted,
        disappear_at: secPayload.disappear_at || disappearAt,
        reply_to_id: currentReplyTo?.msgId || null,
        reply_to_content: currentReplyTo?.content?.slice(0, 120) || null,
        ...secPayload,
      };
      if (thread.threadId) insertPayload.thread_id = thread.threadId;

      const { error: insertErr } = await supabase.from("messages").insert(insertPayload);
      if (insertErr) {
        setRawMessages(prev => prev.filter(m => m.id !== optimisticId));
        toast.error("Failed to send message: " + insertErr.message);
        setNewMessage(msgText);
        return;
      }

      setSecurityLevel("normal");

      platformBus.emit("orbit:message_sent", {
        threadId: thread.threadId || thread.id, contextId: thread.contextId,
        recipientName: thread.name, contentPreview: content.slice(0, 80),
      }, "orbit", { userId: authUserId, orgId });

      const recipientEmail = normalizeEmail(thread.email);
      if (recipientEmail && isValidEmail(recipientEmail)) {
        try {
          await supabase.functions.invoke("send-notification-email", {
            body: {
              event_type: "marketplace_notification", recipient_email: recipientEmail, recipient_name: thread.name,
              data: {
                subject: `📩 New message [REF:${thread.bookingId || thread.tenantId || thread.id}]`,
                message: escapeEmailHtml(translatedContent || content),
                service_title: thread.serviceTitle || thread.propertyLabel || "",
                booking_id: thread.bookingId || "", cta_url: buildAppUrl("/"), cta_label: "Reply", org_id: orgId,
              }, locale: tenantLocale,
            },
          });
        } catch (e) { console.error("Email failed:", e); }
      }

      if (thread.conversationType === "property" && thread.tenantId) {
        const { data: tenant } = await supabase.from("tenants").select("tenant_user_id").eq("id", thread.tenantId).single();
        if (tenant?.tenant_user_id) {
          await supabase.from("notifications").insert({
            user_id: tenant.tenant_user_id, org_id: orgId, type: "message",
            title: "📩 New message from your landlord", message: content.slice(0, 200), link: "/tenant/messages",
          });
        }
      }
    } catch (e: any) {
      toast.error("Send failed: " + (e?.message || "unknown error"));
    } finally { setSending(false); }
  }, [newMessage, params]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  return { sending, newMessage, setNewMessage, handleSend, handleKeyDown };
}
