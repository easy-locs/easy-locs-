/**
 * ChatPanel — Layer 2: Main interaction area.
 * Handles message display, text input, file upload, voice recording,
 * translation, booking actions, and payment links.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, ArrowLeft, Loader2, Paperclip, Globe, CheckCheck, Check,
  Mail, CreditCard, CalendarCheck, Ban, Phone, ChevronRight, MessageCircle,
} from "lucide-react";
import AIGenerateButton from "@/components/ai/AIGenerateButton";
import ChatMediaPreview from "@/components/communication/ChatMediaPreview";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { getCountryConfig } from "@/lib/country-config";
import { getCountryEntryOrDefault } from "@/lib/global-country-registry";
import { buildAppUrl } from "@/lib/app-domain";
import { motion } from "framer-motion";
import type { ConversationThread, ChatMessage } from "./types";
import { MESSAGE_CATEGORIES, CONV_STATUSES, CONV_TYPE_CONFIG, SOURCE_MODULE_CONFIG, STATUS_COLORS, STATUS_LABELS } from "./types";

const SYSTEM_SENDER_ID = "00000000-0000-0000-0000-000000000000";
const escapeEmailHtml = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const normalizeEmail = (e: string | null | undefined) => (e || "").trim().toLowerCase();
const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

interface Props {
  thread: ConversationThread | null;
  onBack: () => void;
  onToggleContext: () => void;
  showContext: boolean;
  onThreadUpdate: (threadId: string, updates: Partial<ConversationThread>) => void;
}

export default function ChatPanel({ thread, onBack, onToggleContext, showContext, onThreadUpdate }: Props) {
  const { user, orgId } = useAuth();
  const { t, locale } = useI18n();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [convStatus, setConvStatus] = useState("active");
  const [uploading, setUploading] = useState(false);
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  const [translatingMsgId, setTranslatingMsgId] = useState<string | null>(null);
  const [typingIndicator, setTypingIndicator] = useState(false);

  // Payment dialog
  const [paymentLinkDialog, setPaymentLinkDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [sendingPaymentLink, setSendingPaymentLink] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!orgId || !thread) return;
    let query = supabase.from("messages").select("*").eq("org_id", orgId).order("created_at", { ascending: true });

    if (thread.contextType === "guest_session" && thread.contextId) {
      query = query.eq("guest_session_id", thread.contextId);
    } else if (thread.conversationType === "listing" && thread.leadId) {
      query = query.eq("context_type", "real_estate_lead").eq("context_id", thread.leadId);
    } else if (thread.conversationType === "direct" && thread.contextId) {
      query = query.eq("context_id", thread.contextId);
    } else if (thread.bookingId) {
      query = query.eq("booking_id", thread.bookingId);
    } else if (thread.tenantId) {
      query = query.eq("tenant_id", thread.tenantId).is("booking_id", null);
    }

    const { data } = await query;
    if (data) {
      setMessages(data as ChatMessage[]);
      const lastMsg = data[data.length - 1] as any;
      if (lastMsg?.conversation_status) setConvStatus(lastMsg.conversation_status);

      const unreadIds = data.filter(m => !m.read && m.sender_id !== user?.id).map(m => m.id);
      if (unreadIds.length > 0) {
        await supabase.from("messages").update({ read: true }).in("id", unreadIds);
        onThreadUpdate(thread.id, { unreadCount: 0 });
      }
    }
  }, [orgId, thread, user, onThreadUpdate]);

  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Realtime messages
  useEffect(() => {
    if (!orgId || !thread) return;
    const channel = supabase
      .channel(`chat-${thread.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages", filter: `org_id=eq.${orgId}`,
      }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        const msgKey = newMsg.booking_id ? `booking-${newMsg.booking_id}` : newMsg.tenant_id ? `tenant-${newMsg.tenant_id}` : null;
        if (msgKey === thread.id || (newMsg as any).context_id === thread.contextId) {
          setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
          if (newMsg.sender_id !== user?.id) {
            supabase.from("messages").update({ read: true }).eq("id", newMsg.id);
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, thread, user]);

  // Typing indicator
  useEffect(() => {
    if (!thread || !orgId) return;
    const channel = supabase.channel(`typing-${thread.id}`);
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const others = Object.values(state).flat().filter((p: any) => p.user_id !== user?.id);
        setTypingIndicator(others.length > 0);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: user?.id, online_at: new Date().toISOString() });
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, [thread, orgId, user?.id]);

  // File upload
  const handleFileUpload = async (file: File) => {
    if (!orgId || !thread || !user) return;
    setUploading(true);
    try {
      const { validateMediaFile } = await import("@/lib/media-utils");
      const validationErr = validateMediaFile(file);
      if (validationErr) { toast.error(validationErr); setUploading(false); return; }

      const ext = file.name.split(".").pop() || "bin";
      const path = `${orgId}/${thread.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("chat-media").upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: signedData } = await supabase.storage.from("chat-media").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signedData?.signedUrl || path;
      const isMedia = file.type.startsWith("image/") || file.type.startsWith("video/");

      const filePayload: any = {
        org_id: orgId, sender_id: user.id,
        tenant_id: thread.tenantId || null,
        booking_id: thread.bookingId || null,
        booking_type: thread.bookingType || null,
        contact_name: thread.conversationType !== "property" ? thread.name : undefined,
        contact_email: thread.conversationType !== "property" ? thread.email : undefined,
        content: isMedia ? `📷 ${file.name}` : `📎 ${file.name}`,
        category: "general", attachment_url: url, message_type: "user", sender_locale: locale,
        context_type: thread.contextType, context_id: thread.contextId,
      };
      if (thread.threadId) filePayload.thread_id = thread.threadId;
      await supabase.from("messages").insert(filePayload);
      toast.success("File sent");
    } catch (e: any) { toast.error("Error: " + e.message); }
    setUploading(false);
  };

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || !thread || !orgId || !user) return;
    const content = newMessage.trim();
    setSending(true);
    try {
      let tenantLocale = "en";
      if (thread.tenantId) {
        const { data: tData } = await supabase.from("tenants").select("preferred_locale").eq("id", thread.tenantId).maybeSingle();
        if (tData?.preferred_locale) tenantLocale = tData.preferred_locale;
        else tenantLocale = getCountryConfig(thread.propertyCountry || "FR").locale.slice(0, 2);
      } else {
        tenantLocale = getCountryConfig(thread.propertyCountry || "FR").locale.slice(0, 2);
      }

      let translatedContent: string | null = null;
      if (locale !== tenantLocale) {
        try {
          const { data: transData } = await supabase.functions.invoke("translate-message", {
            body: { text: content, from_locale: locale, to_locale: tenantLocale },
          });
          if (transData?.translated) translatedContent = transData.translated;
        } catch (e) { console.error("Translation failed:", e); }
      }

      const msgPayload: any = {
        org_id: orgId, sender_id: user.id,
        tenant_id: thread.tenantId || null,
        booking_id: thread.bookingId || null,
        booking_type: thread.bookingType || null,
        contact_name: thread.conversationType !== "property" ? thread.name : undefined,
        contact_email: thread.conversationType !== "property" ? thread.email : undefined,
        content, translated_content: translatedContent,
        category: thread.conversationType === "listing" ? "real_estate" : selectedCategory,
        sender_locale: locale, read: false, message_type: "user",
        property_id: thread.propertyId || null,
        conversation_status: "waiting_tenant",
        context_type: thread.contextType, context_id: thread.contextId,
      };
      if (thread.threadId) msgPayload.thread_id = thread.threadId;
      await supabase.from("messages").insert(msgPayload);

      setNewMessage("");
      setConvStatus("waiting_tenant");

      // Email notification
      const recipientEmail = normalizeEmail(thread.email);
      if (recipientEmail && isValidEmail(recipientEmail)) {
        try {
          await supabase.functions.invoke("send-notification-email", {
            body: {
              event_type: "marketplace_notification",
              recipient_email: recipientEmail,
              recipient_name: thread.name,
              data: {
                subject: `📩 New message [REF:${thread.bookingId || thread.tenantId || thread.id}]`,
                message: escapeEmailHtml(translatedContent || content),
                service_title: thread.serviceTitle || thread.propertyLabel || "",
                booking_id: thread.bookingId || "",
                cta_url: buildAppUrl("/"),
                cta_label: "Reply",
                org_id: orgId,
              },
              locale: tenantLocale,
            },
          });
        } catch (e) { console.error("Email failed:", e); }
      }

      // Tenant notification
      if (thread.conversationType === "property" && thread.tenantId) {
        const { data: tenant } = await supabase.from("tenants").select("tenant_user_id").eq("id", thread.tenantId).single();
        if (tenant?.tenant_user_id) {
          await supabase.from("notifications").insert({
            user_id: tenant.tenant_user_id, org_id: orgId, type: "message",
            title: "📩 New message from your landlord", message: content.slice(0, 200), link: "/tenant/messages",
          });
        }
      }
    } finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Translation toggle
  const handleTranslateMessage = async (msg: ChatMessage) => {
    if (translatingMsgId) return;
    if (showOriginal[msg.id]) {
      setShowOriginal(prev => ({ ...prev, [msg.id]: false }));
      return;
    }
    if (!msg.translated_content) {
      setTranslatingMsgId(msg.id);
      try {
        const { data: transData } = await supabase.functions.invoke("translate-message", {
          body: { text: msg.content, from_locale: msg.sender_locale || "en", to_locale: locale },
        });
        if (transData?.translated) {
          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, translated_content: transData.translated } : m));
          await supabase.from("messages").update({ translated_content: transData.translated }).eq("id", msg.id);
        }
      } catch (e) { toast.error("Translation failed"); }
      setTranslatingMsgId(null);
      return;
    }
    setShowOriginal(prev => ({ ...prev, [msg.id]: true }));
  };

  // Booking actions
  const handleBookingAction = async (action: "confirm" | "cancel" | "complete") => {
    if (!thread?.bookingId || !orgId || !user) return;
    const statusMap = { confirm: "confirmed", cancel: "cancelled", complete: "completed" };
    const newStatus = statusMap[action];
    try {
      if (thread.bookingType === "marketplace") {
        await supabase.from("marketplace_bookings").update({ status: newStatus }).eq("id", thread.bookingId);
      } else if (thread.bookingType === "concierge") {
        const updates: any = { status: newStatus };
        if (action === "confirm") updates.confirmed_at = new Date().toISOString();
        if (action === "cancel") updates.cancelled_at = new Date().toISOString();
        if (action === "complete") updates.completed_at = new Date().toISOString();
        await supabase.from("concierge_orders").update(updates).eq("id", thread.bookingId);
      } else if (thread.bookingType === "seasonal") {
        await supabase.from("booking_requests").update({ status: newStatus }).eq("id", thread.bookingId);
      }

      const actionLabels = { confirm: "✅ Booking confirmed", cancel: "❌ Booking cancelled", complete: "🏁 Booking completed" };
      const sysMsgPayload: any = {
        org_id: orgId, sender_id: SYSTEM_SENDER_ID,
        tenant_id: thread.tenantId || null, booking_id: thread.bookingId,
        booking_type: thread.bookingType, content: actionLabels[action],
        category: "booking", message_type: "system", read: false,
        context_type: thread.contextType, context_id: thread.contextId,
      };
      if (thread.threadId) sysMsgPayload.thread_id = thread.threadId;
      await supabase.from("messages").insert(sysMsgPayload);

      onThreadUpdate(thread.id, { bookingStatus: newStatus });
      toast.success(actionLabels[action]);

      // Email
      const email = normalizeEmail(thread.email);
      if (email && isValidEmail(email)) {
        const clientLang = getCountryConfig(thread.propertyCountry || "FR").locale.slice(0, 2);
        await supabase.functions.invoke("send-notification-email", {
          body: {
            event_type: action === "confirm" ? "marketplace_booking_confirmed" : action === "cancel" ? "marketplace_booking_cancelled" : "marketplace_booking_completed",
            recipient_email: email, recipient_name: thread.name,
            data: {
              subject: actionLabels[action], message: actionLabels[action],
              service_title: thread.serviceTitle || thread.propertyLabel || "",
              booking_id: thread.bookingId || "", cta_url: buildAppUrl("/"), cta_label: "View", org_id: orgId,
            },
            locale: clientLang,
          },
        });
      }
    } catch (e: any) { toast.error("Error: " + e.message); }
  };

  // Payment link
  const handleSendPaymentLink = async () => {
    if (!thread || !orgId || !user || !paymentAmount) return;
    setSendingPaymentLink(true);
    try {
      const amount = parseFloat(paymentAmount);
      if (isNaN(amount) || amount <= 0) throw new Error("Invalid amount");

      let paymentUrl = "";
      try {
        const { data, error } = await supabase.functions.invoke("create-concierge-payment", {
          body: {
            order_id: thread.bookingId || thread.id, service_id: thread.contextId,
            amount, currency: thread.currency || "eur",
            guest_email: thread.email || "", guest_name: thread.name || "",
            service_title: thread.serviceTitle || paymentDescription || "",
            origin: window.location.origin,
          },
        });
        if (error) throw error;
        paymentUrl = data?.url || "";
      } catch (e) { console.error("Stripe failed:", e); }

      const msgContent = paymentUrl
        ? `💳 Payment request: ${amount.toFixed(2)} ${(thread.currency || "EUR").toUpperCase()}\n${paymentDescription ? `📝 ${paymentDescription}\n` : ""}🔗 ${paymentUrl}`
        : `💳 Payment request: ${amount.toFixed(2)} ${(thread.currency || "EUR").toUpperCase()}\n${paymentDescription ? `📝 ${paymentDescription}\n` : ""}Please contact us for payment details.`;

      await supabase.from("messages").insert({
        org_id: orgId, sender_id: user.id, tenant_id: thread.tenantId || null,
        booking_id: thread.bookingId || null, booking_type: thread.bookingType || null,
        content: msgContent, category: "payment", message_type: "user", read: false,
        context_type: thread.contextType, context_id: thread.contextId,
      });

      setPaymentLinkDialog(false);
      setPaymentAmount("");
      setPaymentDescription("");
      toast.success("Payment link sent");
    } catch (e: any) { toast.error(e.message); }
    setSendingPaymentLink(false);
  };

  const updateConversationStatus = async (status: string) => {
    if (!thread || !orgId) return;
    setConvStatus(status);
    const lastMsg = messages[messages.length - 1];
    if (lastMsg) {
      await supabase.from("messages").update({ conversation_status: status }).eq("id", lastMsg.id);
    }
    toast.success(`Status: ${CONV_STATUSES.find(s => s.value === status)?.label}`);
  };

  const getCategoryIcon = (cat: string) => MESSAGE_CATEGORIES.find(c => c.value === cat)?.icon || "💬";

  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md px-4">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent/20 via-accent/10 to-transparent flex items-center justify-center mx-auto mb-6 ring-1 ring-accent/10">
            <MessageCircle className="h-9 w-9 text-accent" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Communication Hub</h3>
          <p className="text-sm text-muted-foreground mb-8">
            Your unified communication center — direct messages, bookings, deals, and property management.
          </p>
          <div className="grid grid-cols-2 gap-3 text-left">
            {[
              { emoji: "💬", label: "Direct", desc: "User ↔ User", color: "from-accent/10 to-accent/5 border-accent/15" },
              { emoji: "🏠", label: "Property", desc: "Tenant ↔ Owner", color: "from-primary/10 to-primary/5 border-primary/15" },
              { emoji: "📅", label: "Bookings", desc: "All booking types", color: "from-sky-500/10 to-sky-500/5 border-sky-500/15" },
              { emoji: "🤝", label: "Deals", desc: "Negotiations", color: "from-amber-500/10 to-amber-500/5 border-amber-500/15" },
              { emoji: "🏷️", label: "Listings", desc: "Inquiries & leads", color: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/15" },
              { emoji: "🏢", label: "Business", desc: "Service providers", color: "from-violet-500/10 to-violet-500/5 border-violet-500/15" },
            ].map(p => (
              <div key={p.label} className={`px-3.5 py-3 rounded-xl bg-gradient-to-br ${p.color} border`}>
                <span className="text-lg">{p.emoji}</span>
                <p className="text-xs font-bold text-foreground mt-1.5">{p.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  const config = CONV_TYPE_CONFIG[thread.conversationType];
  const moduleConfig = SOURCE_MODULE_CONFIG[thread.sourceModule];

  return (
    <>
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-border/50">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-9 w-9">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${config.bg}`}>
                <MessageCircle className={`h-4 w-4 ${config.text}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground truncate">{thread.name}</p>
                  {thread.propertyCountry && <span className="text-sm shrink-0">{getCountryEntryOrDefault(thread.propertyCountry).flag}</span>}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${moduleConfig.cls}`}>
                    {moduleConfig.emoji} {moduleConfig.label}
                  </Badge>
                  {thread.bookingStatus && (
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${STATUS_COLORS[thread.bookingStatus] || ""}`}>
                      {STATUS_LABELS[thread.bookingStatus] || thread.bookingStatus}
                    </Badge>
                  )}
                  {thread.totalPrice != null && thread.totalPrice > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold tabular-nums">
                      {thread.totalPrice.toFixed(2)} {(thread.currency || "EUR").toUpperCase()}
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {thread.serviceTitle || thread.listingTitle || thread.propertyLabel || thread.email || ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Select value={convStatus} onValueChange={updateConversationStatus}>
                <SelectTrigger className="h-8 w-auto text-xs gap-1">
                  <span>{CONV_STATUSES.find(s => s.value === convStatus)?.icon}</span>
                  <span className="hidden sm:inline">{CONV_STATUSES.find(s => s.value === convStatus)?.label}</span>
                </SelectTrigger>
                <SelectContent>
                  {CONV_STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleContext}>
                <ChevronRight className={`h-4 w-4 transition-transform ${showContext ? "rotate-180" : ""}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-muted/5 to-transparent">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="h-6 w-6 text-muted-foreground/30" />
                </div>
                <p className="text-muted-foreground text-sm font-medium">No messages yet</p>
                <p className="text-muted-foreground/60 text-xs mt-1">Start the conversation below</p>
              </div>
            </div>
          ) : (
            messages.map(msg => {
              const isMe = msg.sender_id === user?.id;
              const isSystem = msg.message_type === "system" || msg.sender_id === SYSTEM_SENDER_ID;
              const isInboundEmail = msg.message_type === "inbound_email";
              const isPayment = msg.content.startsWith("💳");

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <div className="bg-muted/50 text-muted-foreground text-xs px-4 py-2 rounded-full max-w-[80%] text-center break-words">
                      {msg.content}
                      <span className="ml-2 opacity-60">{format(new Date(msg.created_at), "dd/MM HH:mm")}</span>
                    </div>
                  </div>
                );
              }

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 ${
                    isPayment
                      ? "bg-accent/10 border border-accent/20 text-foreground rounded-br-md"
                      : isMe
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                  }`}>
                    {isInboundEmail && (
                      <span className="text-[10px] font-medium text-accent mb-0.5 block flex items-center gap-1">
                        <Mail className="h-2.5 w-2.5" /> Email reply
                      </span>
                    )}
                    {msg.category !== "general" && !isInboundEmail && (
                      <span className="text-[10px] opacity-70 mb-0.5 block">{getCategoryIcon(msg.category)}</span>
                    )}

                    {/* Attachment */}
                    {msg.attachment_url && <ChatMediaPreview url={msg.attachment_url} />}

                    <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">
                      {isMe ? msg.content : (showOriginal[msg.id] ? msg.content : (msg.translated_content || msg.content))}
                    </p>

                    {/* Translation controls */}
                    {!isMe && msg.translated_content && !showOriginal[msg.id] && (
                      <p className="text-xs mt-1.5 pt-1.5 border-t border-current/10 opacity-50 italic whitespace-pre-wrap break-words">
                        {msg.content.length > 120 ? msg.content.slice(0, 120) + "…" : msg.content}
                      </p>
                    )}
                    {!isMe && msg.sender_locale && msg.sender_locale !== locale && (
                      <button
                        onClick={() => handleTranslateMessage(msg)}
                        className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground"
                      >
                        {translatingMsgId === msg.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Globe className="h-2.5 w-2.5" />}
                        {showOriginal[msg.id] ? "Show translation" : msg.translated_content ? "Show original" : "Translate"}
                      </button>
                    )}

                    {/* Timestamp & read status */}
                    <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                      <p className="text-[10px]">{format(new Date(msg.created_at), "HH:mm")}</p>
                      {isMe && (
                        <span className={`text-[10px] ${msg.read ? "text-primary-foreground/80" : "text-primary-foreground/40"}`}>
                          {msg.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
          {typingIndicator && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action bar */}
        {(thread.conversationType === "booking" || thread.conversationType === "listing" || thread.conversationType === "deal") && (
          <div className="px-3 py-2.5 border-t border-border/30 bg-gradient-to-r from-muted/30 to-transparent">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">Actions</span>
              <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5 rounded-lg" onClick={() => setPaymentLinkDialog(true)}>
                <CreditCard className="h-3.5 w-3.5" /> Payment
              </Button>
              {thread.bookingStatus === "pending" && (
                <Button size="sm" className="text-xs h-8 gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleBookingAction("confirm")}>
                  <CalendarCheck className="h-3.5 w-3.5" /> Confirm
                </Button>
              )}
              {thread.bookingStatus === "confirmed" && (
                <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5 rounded-lg border-blue-500/30 text-blue-600" onClick={() => handleBookingAction("complete")}>
                  <CalendarCheck className="h-3.5 w-3.5" /> Complete
                </Button>
              )}
              {!["cancelled", "completed"].includes(thread.bookingStatus || "") && (
                <Button size="sm" variant="ghost" className="text-xs h-8 gap-1.5 rounded-lg text-destructive" onClick={() => handleBookingAction("cancel")}>
                  <Ban className="h-3.5 w-3.5" /> Cancel
                </Button>
              )}
              {thread.email && (
                <Button size="sm" variant="ghost" className="text-xs h-8 gap-1.5 rounded-lg ml-auto" asChild>
                  <a href={`mailto:${thread.email}`}><Mail className="h-3.5 w-3.5" /> Email</a>
                </Button>
              )}
              {thread.phone && (
                <Button size="sm" variant="ghost" className="text-xs h-8 gap-1.5 rounded-lg" asChild>
                  <a href={`tel:${thread.phone}`}><Phone className="h-3.5 w-3.5" /> Call</a>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-2 sm:p-3 border-t border-border/50 flex gap-1.5 sm:gap-2 items-center safe-area-pb">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-10 sm:w-12 h-10 px-1.5 sm:px-2 shrink-0">
              <span className="text-sm">{getCategoryIcon(selectedCategory)}</span>
            </SelectTrigger>
            <SelectContent>
              {MESSAGE_CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex-1 min-w-0">
            <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder="Write a message..." className="h-10 text-sm" />
          </div>
          <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/mp4,video/webm,video/quicktime,.pdf,.doc,.docx"
            onChange={e => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); e.target.value = ""; }} />
          <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </Button>
          <div className="hidden sm:block">
            <AIGenerateButton task="guest_reply" taskContext={newMessage || "message from client"} onApply={text => setNewMessage(text)} label="AI" variant="icon" />
          </div>
          <Button onClick={handleSend} disabled={sending || !newMessage.trim()} className="shrink-0 h-10 px-3 sm:px-4">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Payment dialog */}
      <Dialog open={paymentLinkDialog} onOpenChange={setPaymentLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>💳 Send Payment Link</DialogTitle>
            <DialogDescription>Create and send a payment request to {thread.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground">Amount ({(thread.currency || "EUR").toUpperCase()})</label>
              <Input type="number" step="0.01" min="0.50" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="100.00" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Description</label>
              <Input value={paymentDescription} onChange={e => setPaymentDescription(e.target.value)} placeholder="Service payment..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentLinkDialog(false)}>Cancel</Button>
            <Button onClick={handleSendPaymentLink} disabled={sendingPaymentLink || !paymentAmount}>
              {sendingPaymentLink ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
