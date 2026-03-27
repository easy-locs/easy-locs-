/**
 * HudChatPanel — Futuristic command center chat interface.
 * Refactored: logic extracted to useMessageSender, usePaymentDialogs, useTranslation.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import DealContextHeader from "./DealContextHeader";
import DealStatusBubble from "./DealStatusBubble";
import type { DealEventType } from "./DealStatusBubble";
import {
  Send, ArrowLeft, Loader2, Paperclip, Globe, CheckCheck, Check,
  Mail, CreditCard, CalendarCheck, Ban, Phone, Video, ChevronRight, MessageCircle,
  Shield, Lock, Zap, Sparkles, MapPin, Camera, MoreVertical, Mic, Smile, Eye,
  Handshake,
} from "lucide-react";
import SecurityLevelPicker from "./SecurityLevelPicker";
import { type SecurityLevel, buildSecurityPayload, isActionAllowed } from "@/lib/message-security";
import MessageContextMenu, { DisappearingMessagesToggle } from "./MessageContextMenu";
import MessageMultiSelectToolbar from "./MessageMultiSelect";
import ChatLocationPicker from "./ChatLocationPicker";
import ForwardMessageDialog from "@/components/communication/ForwardMessageDialog";
import { useCall } from "@/components/call/CallProvider";
import AIGenerateButton from "@/components/ai/AIGenerateButton";
import { haptic } from "@/lib/haptics";
import { useVoiceRecorder, formatVoiceDuration } from "@/hooks/useVoiceRecorder";
import ChatMediaPreview from "@/components/communication/ChatMediaPreview";
import { supabase } from "@/integrations/supabase/client";
import { realtimeManager } from "@/lib/realtime-manager";
import { platformBus } from "@/lib/shared/platform-bus";
import { usePrivacySettings, computeDisappearAt } from "@/hooks/usePrivacySettings";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitEncryption } from "@/hooks/useOrbitEncryption";
import { useDecryptedMessages } from "@/hooks/useDecryptedMessages";
import OrbitPrivacyBadge from "@/components/orbit/OrbitPrivacyBadge";
import OrbitEncryptedIndicator from "@/components/orbit/OrbitEncryptedIndicator";
import OrbitSafetyNumber from "@/components/orbit/OrbitSafetyNumber";
import OrbitSecurityPanel from "@/components/orbit/OrbitSecurityPanel";
import { isE2EEncrypted, getEncryptedPreview } from "@/lib/orbit-metadata-guard";
import { useOfflineMessages } from "@/hooks/useOfflineMessages";
import { useOrbitStore } from "@/stores/orbitStore";
import { WifiOff, Wifi, CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import OrbitSmartPayment, { type PaymentConfirmation } from "@/components/orbit/payments/OrbitSmartPayment";
import { RequestMoneyModal } from "@/components/chat/RequestMoneyModal";
import { sendPaymentRequestMessageToThread, sendPaymentReceiptToThread } from "@/components/chat/ChatPaymentCards";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { getCountryConfig } from "@/lib/country-config";
import { getCountryEntryOrDefault } from "@/lib/global-country-registry";
import { buildAppUrl } from "@/lib/app-domain";
import { motion } from "framer-motion";
import type { ConversationThread, ChatMessage } from "./types";
import { MESSAGE_CATEGORIES, CONV_STATUSES, CONV_TYPE_CONFIG, SOURCE_MODULE_CONFIG, STATUS_COLORS, STATUS_LABELS } from "./types";
import ChatMessageBubble, { DateSeparator } from "./ChatMessageBubble";
import { format, isToday, isYesterday } from "date-fns";

// ── Extracted hooks ──
import { useMessageSender } from "@/hooks/useMessageSender";
import { usePaymentDialogs } from "@/hooks/usePaymentDialogs";
import { useTranslation } from "@/hooks/useTranslation";

const SYSTEM_SENDER_ID = "00000000-0000-0000-0000-000000000000";

interface Props {
  thread: ConversationThread | null;
  onBack: () => void;
  onToggleContext: () => void;
  showContext: boolean;
  onThreadUpdate: (threadId: string, updates: Partial<ConversationThread>) => void;
}

export default function HudChatPanel({ thread, onBack, onToggleContext, showContext, onThreadUpdate }: Props) {
  const { user, orgId } = useAuth();
  const myOrbitId = useOrbitStore((s) => s.profile?.orbitId ?? null);
  const { t, locale } = useI18n();
  const { startCall, isInCall, isStartingCall } = useCall();
  const { ready: e2eReady, encrypt, decrypt } = useOrbitEncryption(user?.id);
  const offline = useOfflineMessages({ userId: user?.id, orgId: orgId || undefined, threadId: thread?.id });
  const { settings: privacySettings } = usePrivacySettings();
  const [pendingOffline, setPendingOffline] = useState<any[]>([]);

  const [rawMessages, setRawMessages] = useState<ChatMessage[]>([]);
  const { messages: decryptedMessages } = useDecryptedMessages(rawMessages, decrypt, user?.id);
  const messages = decryptedMessages as ChatMessage[];
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [convStatus, setConvStatus] = useState("active");
  const [uploading, setUploading] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const typingChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [contextMessage, setContextMessage] = useState<{ msgId: string; content: string; isMe: boolean; createdAt: string; hasAudio?: boolean; hasAttachment?: boolean; senderId?: string; canModerate?: boolean; isStarred?: boolean } | null>(null);
  const [hiddenMsgIds, setHiddenMsgIds] = useState<Set<string>>(new Set());
  const [disappearTTL, setDisappearTTL] = useState("off");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showSafetyNumber, setShowSafetyNumber] = useState(false);
  const [showSecurityPanel, setShowSecurityPanel] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [voicePreview, setVoicePreview] = useState<{ blob: Blob; duration: number; url: string } | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<Set<string>>(new Set());
  const [viewOnceNext, setViewOnceNext] = useState(false);
  const [replyTo, setReplyTo] = useState<{ msgId: string; content: string; senderName?: string } | null>(null);
  const [forwardData, setForwardData] = useState<{ messageId: string; content: string } | null>(null);
  const [securityLevel, setSecurityLevel] = useState<SecurityLevel>("normal");
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideStartRef = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceRecorder = useVoiceRecorder();

  const resolveAuthUserId = useCallback(async (): Promise<string | null> => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.id) {
      toast.error("Session expirée. Reconnectez-vous pour envoyer un message.");
      return null;
    }
    return data.user.id;
  }, []);

  // ── Extracted: Translation hook ──
  const { showOriginal, translatingMsgId, handleTranslateMessage } = useTranslation(locale);

  // ── Extracted: Message sender hook ──
  const messageSender = useMessageSender({
    thread, orgId, userId: user?.id, locale, myOrbitId, e2eReady, encrypt, offline,
    privacySettings, disappearTTL, securityLevel, setSecurityLevel, selectedCategory,
    replyTo, setReplyTo: () => setReplyTo(null), setRawMessages, setPendingOffline,
    onThreadUpdate, resolveAuthUserId,
  });

  // ── Extracted: Payment dialogs hook ──
  const payment = usePaymentDialogs({ thread, orgId, locale, resolveAuthUserId });

  // ══ Load messages ══
  const loadMessages = useCallback(async () => {
    if (!thread) return;

    if (thread.isV2 && thread.v2ConversationId) {
      const { data } = await (supabase as any)
        .from("chat_messages_v2")
        .select("*")
        .eq("conversation_id", thread.v2ConversationId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (data) {
        const mapped = data.map((m: any) => ({
          id: m.id, sender_id: m.sender_user_id, content: m.body,
          created_at: m.created_at, read: !!m.read_at, category: "general",
          tenant_id: null, translated_content: null, translated_locale: null,
          language_detected: null, message_type: m.type || "user",
          context_type: "direct", context_id: thread.v2ConversationId,
        }));
        setRawMessages(mapped as ChatMessage[]);
        const unreadIds = data
          .filter((m: any) => !m.read_at && m.sender_user_id !== user?.id)
          .map((m: any) => m.id);
        if (unreadIds.length > 0) {
          await (supabase as any).from("chat_messages_v2")
            .update({ read_at: new Date().toISOString() }).in("id", unreadIds);
          onThreadUpdate(thread.id, { unreadCount: 0 });
        }
      }
      setPendingOffline([]);
      return;
    }

    if (!orgId) return;
    if (!offline.isOnline) {
      const cached = await offline.getCachedMessages();
      if (cached.length > 0) setRawMessages(cached as ChatMessage[]);
      const pending = await offline.getThreadPending();
      setPendingOffline(pending);
      return;
    }

    let query = supabase.from("messages").select("*").eq("org_id", orgId).order("created_at", { ascending: true });
    if (thread.contextType === "guest_session" && thread.contextId) query = query.eq("guest_session_id", thread.contextId);
    else if (thread.conversationType === "listing" && thread.leadId) query = query.eq("context_type", "real_estate_lead").eq("context_id", thread.leadId);
    else if (thread.conversationType === "direct" && thread.contextId) query = query.eq("context_id", thread.contextId);
    else if (thread.bookingId) query = query.eq("booking_id", thread.bookingId);
    else if (thread.tenantId) query = query.eq("tenant_id", thread.tenantId).is("booking_id", null);
    const { data } = await query;
    if (data) {
      const clearedAt = thread.clearedAt;
      const visible = clearedAt ? data.filter((m: any) => m.created_at > clearedAt) : data;
      const enriched = visible.map((msg: any) => {
        if (msg.reply_to_id && !msg.reply_to_content) {
          const parent = visible.find((m: any) => m.id === msg.reply_to_id);
          if (parent) return { ...msg, reply_to_content: (parent as any).content?.slice(0, 120) || "Message" };
        }
        return msg;
      });
      setRawMessages(enriched as ChatMessage[]);
      offline.cacheMessages(enriched);
      const lastMsg = enriched[enriched.length - 1] as any;
      if (lastMsg?.conversation_status) setConvStatus(lastMsg.conversation_status);
      const unreadIds = data.filter(m => !m.read && m.sender_id !== user?.id).map(m => m.id);
      if (unreadIds.length > 0 && privacySettings.readReceipts) {
        await supabase.from("messages").update({ read: true } as any).in("id", unreadIds);
        onThreadUpdate(thread.id, { unreadCount: 0 });
      } else if (unreadIds.length > 0) {
        onThreadUpdate(thread.id, { unreadCount: 0 });
      }
    }
    setPendingOffline([]);
  }, [orgId, thread, user, onThreadUpdate, offline]);

  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(() => { if (offline.isOnline) loadMessages(); }, [offline.isOnline]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  // ══ Realtime ══
  useEffect(() => {
    if (!thread) return;

    if (thread.isV2 && thread.v2ConversationId) {
      const v2Channel = supabase
        .channel(`rt:v2:${thread.v2ConversationId}`)
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "chat_messages_v2",
          filter: `conversation_id=eq.${thread.v2ConversationId}`,
        }, (payload) => {
          const msg = payload.new as any;
          if (!msg?.id) return;
          const mapped: ChatMessage = {
            id: msg.id, sender_id: msg.sender_user_id, content: msg.body,
            created_at: msg.created_at, read: !!msg.read_at, category: "general",
            tenant_id: null, translated_content: null, translated_locale: null,
            language_detected: null, message_type: msg.type || "user",
            context_type: "direct", context_id: thread.v2ConversationId,
          } as any;
          setRawMessages(prev => prev.some(m => m.id === mapped.id) ? prev : [...prev, mapped]);
          if (msg.sender_user_id !== user?.id && !msg.read_at) {
            (supabase as any).from("chat_messages_v2").update({ read_at: new Date().toISOString() }).eq("id", msg.id);
            onThreadUpdate(thread.id, { unreadCount: 0 });
          }
        })
        .on("postgres_changes", {
          event: "UPDATE", schema: "public", table: "chat_messages_v2",
          filter: `conversation_id=eq.${thread.v2ConversationId}`,
        }, (payload) => {
          const msg = payload.new as any;
          if (!msg?.id) return;
          setRawMessages(prev => prev.map(m => m.id === msg.id ? { ...m, content: msg.body, read: !!msg.read_at } : m));
        })
        .subscribe();

      const typChannel = supabase.channel(`rt:typing:v2:${thread.v2ConversationId}`);
      typChannel.on("presence", { event: "sync" }, () => {
        const state = typChannel.presenceState();
        const others = Object.values(state).flat().filter((p: any) => p.user_id !== user?.id);
        setTypingIndicator(others.length > 0);
      }).subscribe();
      typingChannelRef.current = typChannel;

      return () => {
        typingChannelRef.current = null;
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        supabase.removeChannel(v2Channel);
        supabase.removeChannel(typChannel);
      };
    }

    if (!orgId) return;
    const matchThread = (msg: any) => {
      const msgKey = msg.booking_id ? `booking-${msg.booking_id}` : msg.tenant_id ? `tenant-${msg.tenant_id}` : null;
      return msgKey === thread.id || msg.context_id === thread.contextId;
    };
    const sub = realtimeManager.openThread(thread.id, orgId, {
      onMessage: (payload: any) => {
        const newMsg = payload.new as ChatMessage;
        if (matchThread(newMsg)) {
          setRawMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
          if (newMsg.sender_id !== user?.id && privacySettings.readReceipts) {
            supabase.from("messages").update({ read: true } as any).eq("id", newMsg.id);
          }
        }
      },
      onUpdate: (payload: any) => {
        const updated = payload.new as ChatMessage;
        if (matchThread(updated)) setRawMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      },
      onDelete: (payload: any) => {
        const deleted = payload.old as any;
        if (deleted?.id) setRawMessages(prev => prev.filter(m => m.id !== deleted.id));
      },
      onTypingSync: (others) => setTypingIndicator(others.length > 0),
      currentUserId: user?.id,
    });
    typingChannelRef.current = sub.typingChannel;
    return () => {
      typingChannelRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      sub.unsubscribe();
    };
  }, [orgId, thread, user, privacySettings.readReceipts, onThreadUpdate]);

  const broadcastTyping = useCallback(() => {
    if (!privacySettings.typingIndicators || !typingChannelRef.current) return;
    typingChannelRef.current.track({ user_id: user?.id, typing: true, ts: Date.now() }).catch(() => {});
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingChannelRef.current?.untrack().catch(() => {});
    }, 3000);
  }, [user?.id, privacySettings.typingIndicators]);

  // ══ File upload ══
  const handleFileUpload = async (file: File) => {
    if (!thread) return;
    const authUserId = await resolveAuthUserId();
    if (!authUserId) return;
    if (!orgId) { toast.error("Please select a workspace first"); return; }
    setUploading(true);
    try {
      const { validateMediaFile } = await import("@/lib/media-utils");
      const validationErr = validateMediaFile(file);
      if (validationErr) { toast.error(validationErr); setUploading(false); return; }

      const isMedia = file.type.startsWith("image/") || file.type.startsWith("video/");
      let uploadFile: File | Blob = file;
      let uploadExt = file.name.split(".").pop() || "bin";
      let fileMetaJson: Record<string, string> | null = null;

      const peerId = thread.tenantId || thread.contextId || thread.id;
      if (e2eReady && peerId) {
        try {
          const { encryptFileForUpload } = await import("@/lib/orbit-file-encryption");
          const { getPrivateKey } = await import("@/lib/orbit-keystore");
          const { importPublicKey, deriveSharedKey: deriveKey } = await import("@/lib/orbit-crypto");
          const privateKey = await getPrivateKey(authUserId);
          if (privateKey) {
            const { data: peerKeyData } = await supabase.from("user_key_bundles" as any).select("identity_public_key").eq("user_id", peerId).maybeSingle();
            const peerPubBase64 = (peerKeyData as any)?.identity_public_key;
            if (peerPubBase64) {
              const peerPubKey = await importPublicKey(peerPubBase64);
              const sharedKey = await deriveKey(privateKey, peerPubKey);
              const { encryptedBlob, iv, originalName, originalType } = await encryptFileForUpload(file, sharedKey);
              uploadFile = encryptedBlob; uploadExt = "enc";
              fileMetaJson = { iv, originalName, originalType };
            }
          }
        } catch (err) { console.warn("[Orbit] File encryption failed, uploading unencrypted:", err); }
      }

      const path = `${orgId}/${thread.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${uploadExt}`;
      const buckets = ["chat-media", "property-photos", "avatars"];
      let finalUrl: string | null = null;
      for (const bucket of buckets) {
        const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, uploadFile, { upsert: false });
        if (uploadErr) continue;
        const { data: signedData } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
        finalUrl = signedData?.signedUrl || null;
        break;
      }
      if (!finalUrl) throw new Error("File upload failed. Please try again.");

      let content = isMedia ? `📷 ${file.name}` : `📎 ${file.name}`;
      if (fileMetaJson) {
        const { buildEncryptedFileRef } = await import("@/lib/orbit-file-encryption");
        content = buildEncryptedFileRef({ url: finalUrl, iv: fileMetaJson.iv, originalName: fileMetaJson.originalName, originalType: fileMetaJson.originalType });
      }

      if (thread.isV2 && thread.v2ConversationId) {
        const { error: v2FileErr } = await (supabase as any).from("chat_messages_v2").insert({
          conversation_id: thread.v2ConversationId, sender_user_id: authUserId,
          sender_orbit_id: myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
          receiver_orbit_id: thread.peerOrbitId ?? null,
          type: isMedia ? "media" : "file", body: content,
          metadata: fileMetaJson ? { encrypted_file: fileMetaJson, url: finalUrl } : { url: finalUrl },
        });
        if (v2FileErr) throw v2FileErr;
        await (supabase as any).from("conversations_v2").update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", thread.v2ConversationId);
      } else {
        const fileInsertPayload: any = {
          org_id: orgId, sender_id: authUserId, tenant_id: thread.tenantId || null,
          booking_id: thread.bookingId || null, booking_type: thread.bookingType || null,
          contact_name: thread.conversationType !== "property" ? thread.name : undefined,
          contact_email: thread.conversationType !== "property" ? thread.email : undefined,
          content, category: "general", attachment_url: fileMetaJson ? undefined : finalUrl,
          message_type: "user", sender_locale: locale,
          context_type: thread.contextType, context_id: thread.contextId, encrypted: !!fileMetaJson,
        };
        if (thread.threadId) fileInsertPayload.thread_id = thread.threadId;
        const { error: insertError } = await supabase.from("messages").insert(fileInsertPayload);
        if (insertError) throw insertError;
      }
      toast.success(fileMetaJson ? "🔒 Encrypted file sent" : "File sent");
      platformBus.emit("orbit:message_sent", { threadId: thread.threadId || thread.id, contextId: thread.contextId, type: "file" }, "orbit", { userId: user?.id, orgId });
    } catch (e: any) { toast.error(e?.message || "Upload failed"); }
    setUploading(false);
  };

  const handleViewOnceUpload = async (file: File) => {
    if (!thread || !orgId) return;
    const authUserId = await resolveAuthUserId();
    if (!authUserId) return;
    if (!file.type.startsWith("image/")) { toast.error("View-once only supports photos"); return; }
    setUploading(true);
    try {
      const path = `${orgId}/${thread.id}/viewonce-${Date.now()}.${file.name.split(".").pop() || "jpg"}`;
      const buckets = ["chat-media", "property-photos"];
      let finalUrl: string | null = null;
      for (const bucket of buckets) {
        const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
        if (error) continue;
        const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
        finalUrl = signed?.signedUrl || null; break;
      }
      if (!finalUrl) throw new Error("Upload failed");
      const effectiveTTL = disappearTTL !== "off" ? disappearTTL : privacySettings.defaultDisappearTtl;
      const disappearAt = computeDisappearAt(effectiveTTL);

      if (thread.isV2 && thread.v2ConversationId) {
        await (supabase as any).from("chat_messages_v2").insert({
          conversation_id: thread.v2ConversationId, sender_user_id: authUserId,
          sender_orbit_id: myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
          receiver_orbit_id: thread.peerOrbitId ?? null, type: "media",
          body: "📷 View-once photo", metadata: { url: finalUrl, view_once: true },
        });
        await (supabase as any).from("conversations_v2").update({ last_message_at: new Date().toISOString() }).eq("id", thread.v2ConversationId);
      } else {
        const viewOncePayload: any = {
          org_id: orgId, sender_id: authUserId, tenant_id: thread.tenantId || null,
          booking_id: thread.bookingId || null, booking_type: thread.bookingType || null,
          content: "📷 View-once photo", attachment_url: finalUrl, category: "general",
          message_type: "user", sender_locale: locale, context_type: thread.contextType,
          context_id: thread.contextId, view_once: true, disappear_at: disappearAt,
        };
        if (thread.threadId) viewOncePayload.thread_id = thread.threadId;
        await supabase.from("messages").insert(viewOncePayload);
      }
      toast.success("📷 View-once photo sent");
    } catch (e: any) { toast.error(e?.message || "Upload failed"); }
    setUploading(false);
    setViewOnceNext(false);
  };

  const toggleMsgSelect = useCallback((id: string) => {
    setSelectedMsgIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      if (next.size === 0) setSelectMode(false);
      return next;
    });
  }, []);

  const handleBookingAction = async (action: "confirm" | "cancel" | "complete") => {
    if (!orgId || !user) { toast.error("Workspace required"); return; }
    if (!thread?.bookingId) { toast.error("No booking linked to this conversation"); return; }
    const statusMap = { confirm: "confirmed", cancel: "cancelled", complete: "completed" };
    const newStatus = statusMap[action];
    try {
      if (thread.bookingType === "marketplace") await supabase.from("marketplace_bookings").update({ status: newStatus }).eq("id", thread.bookingId);
      else if (thread.bookingType === "concierge") {
        const updates: any = { status: newStatus };
        if (action === "confirm") updates.confirmed_at = new Date().toISOString();
        if (action === "cancel") updates.cancelled_at = new Date().toISOString();
        if (action === "complete") updates.completed_at = new Date().toISOString();
        await supabase.from("concierge_orders").update(updates).eq("id", thread.bookingId);
      } else if (thread.bookingType === "seasonal") await supabase.from("booking_requests").update({ status: newStatus }).eq("id", thread.bookingId);

      const actionLabels = { confirm: "✅ Booking confirmed", cancel: "❌ Booking cancelled", complete: "🏁 Booking completed" };
      const bookingMsgPayload: any = {
        org_id: orgId, sender_id: SYSTEM_SENDER_ID, tenant_id: thread.tenantId || null,
        booking_id: thread.bookingId, booking_type: thread.bookingType, content: actionLabels[action],
        category: "booking", message_type: "system", read: false,
        context_type: thread.contextType, context_id: thread.contextId,
      };
      if (thread.threadId) bookingMsgPayload.thread_id = thread.threadId;
      await supabase.from("messages").insert(bookingMsgPayload);
      onThreadUpdate(thread.id, { bookingStatus: newStatus });
      toast.success(actionLabels[action]);

      const email = (thread.email || "").trim().toLowerCase();
      if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        const clientLang = getCountryConfig(thread.propertyCountry || "FR").locale.slice(0, 2);
        await supabase.functions.invoke("send-notification-email", {
          body: {
            event_type: action === "confirm" ? "marketplace_booking_confirmed" : action === "cancel" ? "marketplace_booking_cancelled" : "marketplace_booking_completed",
            recipient_email: email, recipient_name: thread.name,
            data: { subject: actionLabels[action], message: actionLabels[action], service_title: thread.serviceTitle || thread.propertyLabel || "", booking_id: thread.bookingId || "", cta_url: buildAppUrl("/"), cta_label: "View", org_id: orgId },
            locale: clientLang,
          },
        });
      }
    } catch (e: any) { toast.error("Error: " + (e?.message || "Unknown error")); }
  };

  const updateConversationStatus = async (status: string) => {
    if (!thread || !orgId) return;
    setConvStatus(status);
    onThreadUpdate(thread.id, { conversationStatus: status });
    const lastMsg = messages[messages.length - 1];
    if (lastMsg) {
      const { error } = await supabase.from("messages").update({ conversation_status: status }).eq("id", lastMsg.id);
      if (error) { toast.error("Failed to update status"); return; }
    }
    toast.success(`Status: ${CONV_STATUSES.find(s => s.value === status)?.label}`);
  };

  const getCategoryIcon = (cat: string) => MESSAGE_CATEGORIES.find(c => c.value === cat)?.icon || "💬";

  const handleStartCall = (isVideo: boolean) => {
    if (!orgId) { toast.error("Please select a workspace first"); return; }
    haptic("medium");
    startCall({
      orgId, threadId: thread?.threadId, contextType: thread?.conversationType || "listing",
      contextId: thread?.contextId, contextLabel: thread?.name, peerName: thread?.name || "Contact", isVideo,
    });
  };

  // ══ Voice send handler ══
  const handleVoiceSend = async () => {
    if (!voicePreview || !thread || !orgId) return;
    const authUserId = await resolveAuthUserId();
    if (!authUserId) return;
    haptic("medium");
    setUploading(true);
    try {
      const blob = voicePreview.blob;
      const dur = voicePreview.duration;
      const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("webm") ? "webm" : "ogg";
      const path = `${orgId}/${thread.id}/voice-${Date.now()}.${ext}`;
      let uploadedBucket = "chat-media";
      const { error: uploadErr } = await supabase.storage.from("chat-media").upload(path, blob);
      if (uploadErr) {
        const { error: uploadErr2 } = await supabase.storage.from("property-photos").upload(path, blob);
        if (uploadErr2) throw new Error("Voice upload failed");
        uploadedBucket = "property-photos";
      }
      const { data: signed } = await supabase.storage.from(uploadedBucket).createSignedUrl(path, 60 * 60 * 24 * 365);
      const audioUrl = signed?.signedUrl || path;
      const voiceSecPayload = buildSecurityPayload(securityLevel);
      const voiceInsertPayload: any = {
        org_id: orgId, sender_id: authUserId, tenant_id: thread.tenantId || null,
        booking_id: thread.bookingId || null, booking_type: thread.bookingType || null,
        contact_name: thread.conversationType !== "property" ? thread.name : undefined,
        contact_email: thread.conversationType !== "property" ? thread.email : undefined,
        content: `🎤 Voice message (${formatVoiceDuration(dur)})`, category: "general",
        audio_url: audioUrl, audio_duration_seconds: dur, message_type: "user",
        sender_locale: locale, context_type: thread.contextType, context_id: thread.contextId,
        transcript_status: "pending", ...voiceSecPayload,
      };
      if (thread.threadId) voiceInsertPayload.thread_id = thread.threadId;
      const { data: insertedMsg } = await supabase.from("messages").insert(voiceInsertPayload).select("id").single();
      if (insertedMsg?.id) {
        supabase.functions.invoke("voice-transcribe", {
          body: { message_id: insertedMsg.id, audio_url: audioUrl, target_locale: locale },
        }).catch(err => console.error("[Orbit] Transcription trigger failed:", err));
      }
      setSecurityLevel("normal");
      toast.success("Voice message sent");
      platformBus.emit("orbit:message_sent", { threadId: thread.threadId || thread.id, contextId: thread.contextId, type: "voice" }, "orbit", { userId: authUserId, orgId });
    } catch (e: any) { toast.error(e?.message || "Failed to send voice message"); }
    URL.revokeObjectURL(voicePreview.url);
    setVoicePreview(null);
    setUploading(false);
  };

  // ══ EMPTY STATE ══
  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: "hsl(var(--hud-bg))" }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md px-6">
          <div className="relative w-28 h-28 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, hsl(var(--hud-cyan) / 0.15) 0%, transparent 70%)" }} />
            <div className="absolute inset-4 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.2)", boxShadow: "var(--hud-glow), inset 0 0 20px hsl(var(--hud-cyan) / 0.05)" }}>
              <Shield className="h-8 w-8" style={{ color: "hsl(var(--hud-cyan) / 0.6)" }} />
            </div>
            <motion.div className="absolute w-2 h-2 rounded-full" style={{ background: "hsl(var(--hud-cyan))", boxShadow: "0 0 8px hsl(var(--hud-cyan) / 0.5)", transformOrigin: "4px 56px" }} animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} />
          </div>
          <h3 className="text-lg font-bold mb-2" style={{ color: "hsl(var(--hud-text))" }}>{t("orbit.command_center") || "Command Center"}</h3>
          <p className="text-sm mb-1" style={{ color: "hsl(var(--hud-text-dim))" }}>{t("orbit.secure_hub") || "Secure business communication hub"}</p>
          <div className="flex items-center justify-center gap-2 mt-3 mb-6">
            <Lock className="h-3 w-3" style={{ color: "hsl(var(--hud-success) / 0.5)" }} />
            <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "hsl(var(--hud-success) / 0.5)" }}>{t("orbit.e2e_channel") || "End-to-end encrypted channel"}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[{ icon: "💬", label: "Chat" }, { icon: "📞", label: "Calls" }, { icon: "📁", label: "Files" }, { icon: "💳", label: "Payments" }, { icon: "🤝", label: "Deals" }, { icon: "🏠", label: "Properties" }].map(p => (
              <div key={p.label} className="px-3 py-2.5 rounded-lg text-center" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.1)" }}>
                <span className="text-base">{p.icon}</span>
                <p className="text-[10px] font-medium mt-1" style={{ color: "hsl(var(--hud-text-dim))" }}>{p.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  const moduleConfig = SOURCE_MODULE_CONFIG[thread.sourceModule];

  return (
    <>
      <div className="flex-1 flex flex-col min-w-0" style={{ background: "hsl(var(--hud-bg))" }}>
        {/* ══ Header ══ */}
        <div className="px-3 sm:px-4 py-2.5 shrink-0" style={{ borderBottom: "1px solid hsl(var(--hud-border) / 0.08)", background: "hsl(var(--hud-surface) / 0.5)", backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-9 w-9 rounded-full hover:bg-[hsl(var(--hud-surface-2))]">
              <ArrowLeft className="h-4 w-4" style={{ color: "hsl(var(--hud-text))" }} />
            </Button>
            <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, hsl(var(--hud-cyan) / 0.15), hsl(var(--hud-cyan) / 0.05))", border: "1.5px solid hsl(var(--hud-cyan) / 0.2)" }}>
              <span className="text-sm font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>{(thread.name || "?")[0].toUpperCase()}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>{thread.name}</p>
                {thread.propertyCountry && <span className="text-xs shrink-0">{getCountryEntryOrDefault(thread.propertyCountry).flag}</span>}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-medium" style={{ color: "hsl(var(--hud-text-dim))" }}>{moduleConfig.emoji} {moduleConfig.label}</span>
                {thread.bookingStatus && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[thread.bookingStatus] || ""}`}>{STATUS_LABELS[thread.bookingStatus] || thread.bookingStatus}</span>}
                <span className="inline-flex items-center gap-0.5 text-[9px]" style={{ color: "hsl(var(--hud-success) / 0.6)" }}><Lock className="h-2 w-2" /> E2E</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button disabled={isInCall || isStartingCall} onClick={() => handleStartCall(false)} className="h-9 w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full flex items-center justify-center transition-colors hover:bg-[hsl(var(--hud-surface-2))] disabled:opacity-40">
                <Phone className="h-[18px] w-[18px]" style={{ color: "hsl(var(--hud-success))" }} />
              </button>
              <button disabled={isInCall || isStartingCall} onClick={() => handleStartCall(true)} className="h-9 w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full flex items-center justify-center transition-colors hover:bg-[hsl(var(--hud-surface-2))] disabled:opacity-40">
                <Video className="h-[18px] w-[18px]" style={{ color: "hsl(var(--hud-cyan))" }} />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-9 w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full flex items-center justify-center transition-colors hover:bg-[hsl(var(--hud-surface-2))]">
                    <MoreVertical className="h-4 w-4" style={{ color: "hsl(var(--hud-text-dim))" }} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 max-h-[70vh] overflow-y-auto" style={{ background: "hsl(var(--hud-surface))", borderColor: "hsl(var(--hud-border) / 0.2)" }}>
                  {CONV_STATUSES.map(s => (
                    <DropdownMenuItem key={s.value} onClick={() => updateConversationStatus(s.value)} className={convStatus === s.value ? "font-semibold" : ""}>
                      {s.icon} {t(`orbit.status.${s.value}`) || s.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { haptic("light"); setShowSecurityPanel(true); }}>
                    <Shield className="h-3.5 w-3.5 mr-2" style={{ color: e2eReady ? "hsl(var(--hud-success))" : "hsl(var(--hud-text-dim))" }} /> {t("orbit.security") || "Security"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { haptic("light"); setShowSafetyNumber(true); }}>
                    <Lock className="h-3.5 w-3.5 mr-2" style={{ color: "hsl(var(--hud-text-dim))" }} /> {t("orbit.safety_number") || "Safety Number"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onToggleContext}><ChevronRight className="h-3.5 w-3.5 mr-2" /> {t("orbit.details") || "Details"}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { haptic("light"); setSelectMode(true); setSelectedMsgIds(new Set()); }}>
                    <CheckCheck className="h-3.5 w-3.5 mr-2" style={{ color: "hsl(var(--hud-text-dim))" }} /> {t("orbit.select_messages") || "Select Messages"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <DealContextHeader dealId={thread.dealId} contextType={thread.conversationType} contextId={thread.contextId} onToggleContext={onToggleContext} />

        {selectMode && (
          <MessageMultiSelectToolbar selectedIds={selectedMsgIds} messages={messages as any[]} currentUserId={user?.id} currentContextId={thread?.contextId} userEmail={user?.email} userName={user?.user_metadata?.full_name || user?.email || "User"} onClearSelection={() => { setSelectMode(false); setSelectedMsgIds(new Set()); }} onDeletedForMe={(ids) => setHiddenMsgIds(prev => new Set([...prev, ...ids]))} onDeletedForAll={(ids) => { setRawMessages(prev => prev.map(m => ids.includes(m.id) ? { ...m, content: "🚫 This message was deleted", deleted_for_all: true, attachment_url: null, audio_url: null, audio_duration_seconds: null } as any : m)); }} />
        )}

        {!offline.isOnline && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="flex items-center gap-2 px-4 py-2" style={{ background: "hsl(var(--hud-warning) / 0.15)", borderBottom: "1px solid hsl(var(--hud-warning) / 0.3)" }}>
            <WifiOff className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--hud-warning))" }} />
            <span className="text-[11px] font-medium" style={{ color: "hsl(var(--hud-warning))" }}>{t("orbit.offline_banner") || "Offline — messages will be sent when you reconnect"}</span>
            {offline.queueCount > 0 && <Badge variant="outline" className="ml-auto text-[9px] h-4 px-1.5" style={{ borderColor: "hsl(var(--hud-warning) / 0.4)", color: "hsl(var(--hud-warning))" }}>{offline.queueCount} queued</Badge>}
          </motion.div>
        )}
        {offline.isSyncing && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="flex items-center gap-2 px-4 py-1.5" style={{ background: "hsl(var(--hud-success) / 0.1)", borderBottom: "1px solid hsl(var(--hud-success) / 0.2)" }}>
            <CloudUpload className="h-3 w-3 animate-pulse" style={{ color: "hsl(var(--hud-success))" }} />
            <span className="text-[10px]" style={{ color: "hsl(var(--hud-success))" }}>Syncing {offline.queueCount} messages…</span>
          </motion.div>
        )}

        {/* ══ Messages ══ */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-1" style={{ scrollbarWidth: "thin" }}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="h-14 w-14 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.15)" }}>
                <MessageCircle className="h-6 w-6" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
              </div>
              <p className="text-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{t("orbit.no_messages") || "No messages yet"}</p>
            </div>
          ) : (() => {
            let lastDate = "";
            return messages.filter(m => !hiddenMsgIds.has(m.id)).map((msg, idx, arr) => {
              const msgDate = new Date(msg.created_at);
              const dateKey = msgDate.toDateString();
              const showDateSep = dateKey !== lastDate;
              if (showDateSep) lastDate = dateKey;
              const dateLabel = isToday(msgDate) ? "Today" : isYesterday(msgDate) ? "Yesterday" : format(msgDate, "dd MMM yyyy");
              const isMe = msg.sender_id === user?.id;
              const prevMsg = arr[idx - 1];
              const isConsecutive = prevMsg && prevMsg.sender_id === msg.sender_id && !showDateSep && msg.message_type !== "system" && (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) < 120000;
              return (
                <div key={msg.id}>
                  {showDateSep && <DateSeparator date={dateLabel} />}
                  {msg.message_type === "deal_event" && (msg as any).metadata_json ? (
                    <DealStatusBubble eventType={((msg as any).metadata_json?.event_type || "status_change") as DealEventType} data={(msg as any).metadata_json?.data || {}} createdAt={msg.created_at} actorRole={(msg as any).metadata_json?.actor_role} />
                  ) : (
                    <ChatMessageBubble msg={msg} isMe={isMe} isConsecutive={!!isConsecutive} threadName={thread?.name} locale={locale} showOriginal={!!showOriginal[msg.id]} translatingMsgId={translatingMsgId} isPendingOffline={pendingOffline.some(p => p.id === msg.id)} selected={selectedMsgIds.has(msg.id)} selectMode={selectMode} currentUserId={user?.id} onTranslate={handleTranslateMessage} onContextMenu={(e, m, me) => { if (selectMode) { toggleMsgSelect(m.id); return; } setContextMessage({ msgId: m.id, content: m.content, isMe: me, createdAt: m.created_at, hasAudio: !!(m as any).audio_url, hasAttachment: !!m.attachment_url, senderId: m.sender_id, canModerate: false, isStarred: !!(m as any).starred }); }} onToggleSelect={toggleMsgSelect} getCategoryIcon={getCategoryIcon} />
                  )}
                </div>
              );
            });
          })()}
          {typingIndicator && (
            <div className="flex justify-start mt-1">
              <div className="rounded-2xl rounded-bl-md px-4 py-3" style={{ background: "hsl(var(--hud-surface-2))" }}>
                <div className="flex gap-1.5">
                  {[0, 150, 300].map(d => <span key={d} className="h-2 w-2 rounded-full animate-bounce" style={{ background: "hsl(var(--hud-cyan) / 0.4)", animationDelay: `${d}ms` }} />)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ══ Action bar ══ */}
        {(thread.conversationType === "booking" || thread.conversationType === "listing" || thread.conversationType === "deal") && (
          <div className="px-3 sm:px-4 py-2 shrink-0" style={{ borderTop: "1px solid hsl(var(--hud-border) / 0.06)", background: "hsl(var(--hud-surface) / 0.25)" }}>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {!thread.dealId && <Button size="sm" variant="outline" className="text-[11px] h-7 min-h-[44px] sm:min-h-0 gap-1.5 rounded-full px-3 shrink-0" style={{ borderColor: "hsl(var(--hud-cyan) / 0.2)", color: "hsl(var(--hud-cyan))", background: "hsl(var(--hud-cyan) / 0.06)" }} onClick={onToggleContext}><Handshake className="h-3 w-3" /> Deal</Button>}
              <Button size="sm" variant="outline" className="text-[11px] h-7 min-h-[44px] sm:min-h-0 gap-1.5 rounded-full px-3 shrink-0" style={{ borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))", background: "hsl(var(--hud-surface))" }} onClick={() => payment.setPaymentLinkDialog(true)}><CreditCard className="h-3 w-3" /> {t("orbit.payment") || "Payment"}</Button>
              <Button size="sm" variant="outline" className="text-[11px] h-7 min-h-[44px] sm:min-h-0 gap-1.5 rounded-full px-3 shrink-0" style={{ borderColor: "hsl(var(--hud-purple) / 0.2)", color: "hsl(var(--hud-purple))", background: "hsl(var(--hud-purple) / 0.06)" }} onClick={() => payment.setRequestMoneyDialog(true)}><CreditCard className="h-3 w-3" /> Request</Button>
              {thread.bookingStatus === "pending" && <Button size="sm" className="text-[11px] h-7 min-h-[44px] sm:min-h-0 gap-1.5 rounded-full px-3 shrink-0" style={{ background: "hsl(var(--hud-success) / 0.15)", color: "hsl(var(--hud-success))", border: "1px solid hsl(var(--hud-success) / 0.25)" }} onClick={() => handleBookingAction("confirm")}><CalendarCheck className="h-3 w-3" /> {t("orbit.confirm") || "Confirm"}</Button>}
              {thread.bookingStatus === "confirmed" && <Button size="sm" variant="outline" className="text-[11px] h-7 min-h-[44px] sm:min-h-0 gap-1.5 rounded-full px-3 shrink-0" style={{ borderColor: "hsl(var(--hud-cyan) / 0.25)", color: "hsl(var(--hud-cyan))" }} onClick={() => handleBookingAction("complete")}><CalendarCheck className="h-3 w-3" /> {t("orbit.complete") || "Complete"}</Button>}
              {!["cancelled", "completed"].includes(thread.bookingStatus || "") && <Button size="sm" variant="ghost" className="text-[11px] h-7 min-h-[44px] sm:min-h-0 gap-1.5 rounded-full px-3 shrink-0" style={{ color: "hsl(var(--hud-danger) / 0.8)" }} onClick={() => handleBookingAction("cancel")}><Ban className="h-3 w-3" /> {t("orbit.cancel") || "Cancel"}</Button>}
            </div>
          </div>
        )}

        {/* ══ Reply-to banner ══ */}
        {replyTo && (
          <div className="px-3 py-2 flex items-center gap-2 shrink-0" style={{ borderTop: "1px solid hsl(var(--hud-border) / 0.08)", background: "hsl(var(--hud-cyan) / 0.05)", borderLeft: "3px solid hsl(var(--hud-cyan))" }}>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-cyan))" }}>{replyTo.senderName === user?.id ? "You" : "Reply"}</p>
              <p className="text-[11px] line-clamp-1" style={{ color: "hsl(var(--hud-text-dim))" }}>{replyTo.content.length > 80 ? replyTo.content.slice(0, 80) + "…" : replyTo.content}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center" style={{ color: "hsl(var(--hud-text-dim))" }}>✕</button>
          </div>
        )}

        {/* ══ Composer ══ */}
        <div className="px-2 sm:px-3 py-2 safe-area-pb shrink-0" style={{ borderTop: replyTo ? "none" : "1px solid hsl(var(--hud-border) / 0.08)", background: "hsl(var(--hud-surface) / 0.4)" }}>
          <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/mp4,video/webm,video/quicktime,.pdf,.doc,.docx" onChange={e => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); e.target.value = ""; }} />

          {voiceRecorder.recording ? (
            <div className="flex items-center gap-3" onTouchMove={(e) => { const touch = e.touches[0]; if (slideStartRef.current && (slideStartRef.current - touch.clientX) > 100) { voiceRecorder.cancel(); haptic("light"); } }}>
              <button onClick={() => { voiceRecorder.cancel(); haptic("light"); }} className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--hud-danger) / 0.15)", color: "hsl(var(--hud-danger))" }}><Ban className="h-4 w-4" /></button>
              <div className="flex-1 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full animate-pulse" style={{ background: "hsl(var(--hud-danger))" }} />
                <span className="text-sm font-mono tabular-nums" style={{ color: "hsl(var(--hud-text))" }}>{formatVoiceDuration(voiceRecorder.duration)}</span>
                <span className="text-[11px] animate-pulse" style={{ color: "hsl(var(--hud-text-dim))" }}>← Slide to cancel</span>
              </div>
              <button onClick={async () => { haptic("medium"); try { const result = await voiceRecorder.stop(); setVoicePreview(result); } catch (err: any) { if (err?.message !== "Recording too short") toast.error("Voice recording failed"); } }} className="shrink-0 h-12 w-12 rounded-full flex items-center justify-center active:scale-90 transition-transform" style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}><Check className="h-5 w-5" /></button>
            </div>
          ) : voicePreview ? (
            <div className="flex items-center gap-2">
              <button onClick={() => { URL.revokeObjectURL(voicePreview.url); setVoicePreview(null); haptic("light"); }} className="shrink-0 h-9 w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--hud-danger) / 0.15)", color: "hsl(var(--hud-danger))" }}><Ban className="h-3.5 w-3.5" /></button>
              <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "hsl(var(--hud-surface))" }}>
                <button onClick={() => { const a = new Audio(voicePreview.url); a.play(); }} className="h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--hud-cyan) / 0.2)", color: "hsl(var(--hud-cyan))" }}><Zap className="h-3.5 w-3.5" /></button>
                <div className="flex-1 h-1 rounded-full" style={{ background: "hsl(var(--hud-border) / 0.3)" }}><div className="h-full rounded-full" style={{ width: "100%", background: "hsl(var(--hud-cyan))" }} /></div>
                <span className="text-xs font-mono" style={{ color: "hsl(var(--hud-text-dim))" }}>{formatVoiceDuration(voicePreview.duration)}</span>
              </div>
              <button onClick={handleVoiceSend} className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center active:scale-90 transition-transform" style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-1.5">
              <div className="flex-1 min-w-0 flex items-end rounded-2xl px-1.5 py-1" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.12)" }}>
                <SecurityLevelPicker value={securityLevel} onChange={setSecurityLevel} />
                <DropdownMenu open={showAttachMenu} onOpenChange={setShowAttachMenu}>
                  <DropdownMenuTrigger asChild>
                    <button className="shrink-0 h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center rounded-full hover:bg-[hsl(var(--hud-surface-2))]" disabled={uploading}>
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: "hsl(var(--hud-cyan))" }} /> : <Paperclip className="h-4 w-4" style={{ color: "hsl(var(--hud-text-dim))" }} />}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" side="top" className="w-44" style={{ background: "hsl(var(--hud-surface))", borderColor: "hsl(var(--hud-border) / 0.2)" }}>
                    <DropdownMenuItem onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}><Paperclip className="h-4 w-4 mr-2" style={{ color: "hsl(var(--hud-cyan))" }} /> File</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setShowAttachMenu(false); const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.capture = "environment"; inp.onchange = () => { const f = inp.files?.[0]; if (f) handleFileUpload(f); }; inp.click(); }}><Camera className="h-4 w-4 mr-2" style={{ color: "hsl(var(--hud-success))" }} /> Camera</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setShowAttachMenu(false); haptic("light"); setShowLocationPicker(true); }}><MapPin className="h-4 w-4 mr-2" style={{ color: "hsl(var(--hud-warning))" }} /> Location</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setShowAttachMenu(false); payment.setPaymentLinkDialog(true); }}><CreditCard className="h-4 w-4 mr-2" style={{ color: "hsl(var(--hud-purple))" }} /> Payment</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setShowAttachMenu(false); payment.setRequestMoneyDialog(true); }}><CreditCard className="h-4 w-4 mr-2" style={{ color: "hsl(var(--hud-warning))" }} /> Request Money</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { setShowAttachMenu(false); setViewOnceNext(true); const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.onchange = () => { const f = inp.files?.[0]; if (f) handleViewOnceUpload(f); }; inp.click(); }}><Eye className="h-4 w-4 mr-2" style={{ color: "hsl(var(--hud-danger))" }} /> View Once Photo</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <input value={messageSender.newMessage} onChange={e => { messageSender.setNewMessage(e.target.value); broadcastTyping(); }} onKeyDown={messageSender.handleKeyDown} placeholder="Message…" className="flex-1 min-w-0 h-9 bg-transparent border-0 outline-none text-sm px-2" style={{ color: "hsl(var(--hud-text))" }} />
                <div className="hidden sm:block shrink-0">
                  <AIGenerateButton task="guest_reply" taskContext={messageSender.newMessage || "message from client"} onApply={text => messageSender.setNewMessage(text)} label="AI" variant="icon" />
                </div>
              </div>
              <button onClick={messageSender.newMessage.trim() ? messageSender.handleSend : undefined} onTouchStart={!messageSender.newMessage.trim() ? (e) => { slideStartRef.current = e.touches[0].clientX; holdTimerRef.current = setTimeout(async () => { haptic("medium"); try { await voiceRecorder.start(); } catch { toast.error("Microphone access denied"); } }, 200); } : undefined} onTouchEnd={!messageSender.newMessage.trim() ? () => { if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; } } : undefined} onMouseDown={!messageSender.newMessage.trim() ? async () => { haptic("medium"); try { await voiceRecorder.start(); } catch { toast.error("Microphone access denied"); } } : undefined} disabled={messageSender.sending} className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all active:scale-90" style={{ background: messageSender.newMessage.trim() ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-surface))", color: messageSender.newMessage.trim() ? "hsl(var(--hud-bg))" : "hsl(var(--hud-text-dim))", border: messageSender.newMessage.trim() ? "none" : "1px solid hsl(var(--hud-border) / 0.12)", WebkitTapHighlightColor: "transparent" }}>
                {messageSender.sending ? <Loader2 className="h-4 w-4 animate-spin" /> : messageSender.newMessage.trim() ? <Send className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ══ Payment Sheet ══ */}
      <Sheet open={payment.paymentLinkDialog} onOpenChange={payment.setPaymentLinkDialog}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto p-0">
          <OrbitSmartPayment
            recipientUserId={thread.tenantId || thread.contextId || thread.id}
            recipientName={thread.name || "Recipient"}
            context={thread.contextType ? { type: thread.contextType as any, id: thread.contextId, label: thread.serviceTitle || thread.propertyLabel || thread.listingTitle } : undefined}
            threadId={thread.threadId || thread.id}
            defaultCurrency={thread.currency?.toUpperCase()}
            onSuccess={(conf: PaymentConfirmation) => {
              payment.setPaymentLinkDialog(false);
              const sendPaymentMessage = async () => {
                const authUserId = await resolveAuthUserId();
                if (!authUserId || !orgId) return;
                const methodLabel = conf.method === "locs" ? "LOCS Wallet" : `Card (${conf.currency})`;
                const statusLabel = conf.status === "completed" ? "✅ Completed" : "⏳ Pending confirmation";
                const headerLabel = conf.status === "completed" ? "💰 Payment sent" : "💰 Payment initiated";
                const contextLine = conf.context ? `\n📎 ${conf.context.type}: ${conf.context.label || conf.context.id.slice(0, 8)}` : "";
                const refLine = conf.referenceCode ? `\n🔖 Ref: ${conf.referenceCode}` : `\n🔖 ID: ${conf.txnId.slice(0, 12)}`;
                const richContent = `${headerLabel}\n━━━━━━━━━━━━━━━━\n💵 Amount: ${conf.amount} ${conf.currency}\n💳 Method: ${methodLabel}\n📋 Status: ${statusLabel}${refLine}${contextLine}\n━━━━━━━━━━━━━━━━`;
                let storedContent = richContent;
                let isEncrypted = false;
                const peerId = thread.tenantId || thread.contextId || thread.id;
                if (e2eReady && peerId) { const enc = await encrypt(richContent, peerId); if (enc) { storedContent = enc; isEncrypted = true; } }
                const msgPayload: any = { org_id: orgId, sender_id: authUserId, tenant_id: thread.tenantId || null, booking_id: thread.bookingId || null, booking_type: thread.bookingType || null, content: storedContent, category: "payment", message_type: "system", read: false, context_type: thread.contextType, context_id: thread.contextId, encrypted: isEncrypted };
                if (thread.threadId) msgPayload.thread_id = thread.threadId;
                await supabase.from("messages").insert(msgPayload);
                try { await sendPaymentReceiptToThread({ threadId: thread.threadId || thread.id, senderId: authUserId, orgId, transactionId: conf.txnId, amount: conf.amount, currency: conf.currency, recipientName: conf.recipientName || thread.name, title: conf.status === "completed" ? "Payment sent" : "Payment initiated", contextType: thread.contextType, contextId: thread.contextId, tenantId: thread.tenantId, bookingId: thread.bookingId, bookingType: thread.bookingType, encrypt: e2eReady ? encrypt : undefined, peerId: e2eReady ? peerId : null }); } catch {}
                if (conf.status === "completed" && conf.context) { try { const { dispatchSyncEvent } = await import("@/lib/shared/sync-engine"); await dispatchSyncEvent({ type: "wallet_payment_completed", context: { orgId, bookingId: thread.bookingId || undefined, propertyId: thread.propertyId || undefined }, actorUserId: authUserId, amount: conf.amount, currency: conf.currency, paymentMethod: conf.method, txnId: conf.txnId, recipientName: conf.recipientName }); } catch {} }
              };
              sendPaymentMessage();
              toast.success(conf.status === "completed" ? "Payment sent!" : "Payment initiated — awaiting confirmation");
            }}
            onCancel={() => payment.setPaymentLinkDialog(false)}
          />
        </SheetContent>
      </Sheet>

      <RequestMoneyModal open={payment.requestMoneyDialog} onClose={() => payment.setRequestMoneyDialog(false)} recipientId={thread.tenantId || thread.contextId || null} contextId={thread.threadId || thread.id || null} onCreated={async (req) => { const authUserId = await resolveAuthUserId(); if (!authUserId || !orgId) return; const peerId = thread.tenantId || thread.contextId || thread.id; try { await sendPaymentRequestMessageToThread({ threadId: thread.threadId || thread.id, senderId: authUserId, orgId, request: req, tenantId: thread.tenantId, bookingId: thread.bookingId, bookingType: thread.bookingType, contextType: thread.contextType, contextId: thread.contextId, encrypt: e2eReady ? encrypt : undefined, peerId: e2eReady ? peerId : null }); } catch (err) { console.error("[HudChatPanel] Failed to send request message:", err); } toast.success("Payment request sent in chat"); }} />

      <MessageContextMenu message={contextMessage} onClose={() => setContextMessage(null)} onDeleted={(msgId, type) => { if (type === "self") { setHiddenMsgIds(prev => new Set([...prev, msgId])); } else { setRawMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: "🚫 This message was deleted", message_type: "system", attachment_url: null, audio_url: undefined, audio_duration_seconds: undefined, deleted_for_all: true } as any : m)); } }} onCopy={() => {}} onEdited={(msgId, newContent) => { setRawMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: newContent, edited_at: new Date().toISOString() } : m)); }} onReply={(msgId, content, senderName) => { setReplyTo({ msgId, content, senderName }); }} onForward={(msgId, content) => { setForwardData({ messageId: msgId, content }); }} onStarToggle={(msgId, starred) => { setRawMessages(prev => prev.map(m => m.id === msgId ? { ...m, starred } as any : m)); }} onEnterSelectMode={(msgId) => { setSelectMode(true); setSelectedMsgIds(new Set([msgId])); }} />

      <ChatLocationPicker open={showLocationPicker} onClose={() => setShowLocationPicker(false)} onSend={async (loc) => { if (!orgId || !thread) return; const authUserId = await resolveAuthUserId(); if (!authUserId) return; const mapUrl = `https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lng}#map=16/${loc.lat}/${loc.lng}`; const locationMsg = loc.type === "live" ? `📡 Live location shared for ${loc.duration}min\n📍 ${mapUrl}` : loc.type === "place" ? `📍 ${loc.label}\n${loc.address || ""}\n${mapUrl}` : `📍 My location\n${mapUrl}`; let storedContent = locationMsg; let isLocEncrypted = false; const peerId = thread.tenantId || thread.contextId || thread.id; if (e2eReady && peerId) { const enc = await encrypt(locationMsg, peerId); if (enc) { storedContent = enc; isLocEncrypted = true; } } const insertData: any = { org_id: orgId, sender_id: authUserId, content: storedContent, category: "general", message_type: "user", sender_locale: locale, encrypted: isLocEncrypted, contact_name: thread.conversationType !== "property" ? thread.name : undefined, contact_email: thread.conversationType !== "property" ? thread.email : undefined }; if (thread.bookingId) insertData.booking_id = thread.bookingId; if (thread.tenantId) insertData.tenant_id = thread.tenantId; if (thread.contextType) insertData.context_type = thread.contextType; if (thread.contextId) insertData.context_id = thread.contextId; if (thread.threadId) insertData.thread_id = thread.threadId; const { error } = await supabase.from("messages").insert(insertData); if (error) { toast.error("Failed to send location"); } else { platformBus.emit("orbit:message_sent", { threadId: thread.threadId || thread.id, contextId: thread.contextId, type: "location" }, "orbit", { userId: user?.id, orgId }); toast.success("📍 Location shared"); } loadMessages(); }} />

      <OrbitSafetyNumber peerId={thread?.tenantId || thread?.contextId || thread?.id || ""} peerName={thread?.name || "Contact"} open={showSafetyNumber} onOpenChange={setShowSafetyNumber} />
      <OrbitSecurityPanel peerId={thread?.tenantId || thread?.contextId || thread?.id || ""} peerName={thread?.name || "Contact"} open={showSecurityPanel} onOpenChange={setShowSecurityPanel} />

      {forwardData && <ForwardMessageDialog open={!!forwardData} onClose={() => setForwardData(null)} messageContent={forwardData.content} messageId={forwardData.messageId} userId={user?.id || ""} userEmail={user?.email || ""} userName={user?.user_metadata?.full_name || user?.email || "User"} currentContextId={thread?.contextId || ""} />}
    </>
  );
}
