import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  MessageCircle, Send, ArrowLeft, User, Filter, Search, Paperclip,
  Globe, Clock, CheckCheck, Check, FileText, CreditCard, Wrench,
  Loader2, X, Upload, Link2, CalendarCheck, Ban, Edit3, ExternalLink,
  Building, Phone, Mail, MapPin, Receipt, ChevronRight, Hash,
} from "lucide-react";
import AIGenerateButton from "@/components/ai/AIGenerateButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { getCountryConfig } from "@/lib/country-config";
import { getCountryEntryOrDefault } from "@/lib/global-country-registry";
import { buildAppUrl } from "@/lib/app-domain";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";

const SYSTEM_SENDER_ID = "00000000-0000-0000-0000-000000000000";

/* ────── Types ────── */
interface ConversationThread {
  id: string; // tenant_id or booking_id
  type: "tenant" | "booking";
  name: string;
  email: string | null;
  phone?: string | null;
  bookingId?: string;
  bookingType?: string; // seasonal, marketplace, concierge
  bookingStatus?: string;
  propertyLabel?: string;
  propertyCountry?: string;
  propertyId?: string;
  serviceTitle?: string;
  totalPrice?: number;
  currency?: string;
  unreadCount: number;
  lastMessage?: string;
  lastMessageTime?: string;
  tenantId?: string;
}

interface Message {
  id: string;
  sender_id: string;
  tenant_id: string | null;
  content: string;
  translated_content: string | null;
  category: string;
  read: boolean;
  created_at: string;
  attachment_url?: string;
  message_type?: string;
  property_id?: string;
  delivered?: boolean;
  conversation_status?: string;
  booking_id?: string;
  booking_type?: string;
  contact_name?: string;
  contact_email?: string;
}

const MESSAGE_CATEGORIES = [
  { value: "general", label: "💬 Général", icon: "💬" },
  { value: "payment", label: "💰 Paiement", icon: "💰" },
  { value: "booking", label: "📅 Réservation", icon: "📅" },
  { value: "lease", label: "📝 Bail", icon: "📝" },
  { value: "maintenance", label: "🔧 Maintenance", icon: "🔧" },
  { value: "legal", label: "⚖️ Juridique", icon: "⚖️" },
];

const CONV_STATUSES = [
  { value: "active", label: "Actif", icon: "🟢" },
  { value: "waiting_tenant", label: "Attente client", icon: "🟡" },
  { value: "waiting_landlord", label: "Attente bailleur", icon: "🟠" },
  { value: "waiting_payment", label: "Attente paiement", icon: "💰" },
  { value: "resolved", label: "Résolu", icon: "✅" },
  { value: "archived", label: "Archivé", icon: "📦" },
];

const escapeEmailHtml = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const normalizeEmail = (e: string | null | undefined) => (e || "").trim().toLowerCase();
const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

const CommunicationCenter = () => {
  const { user, orgId } = useAuth();
  const { t, locale } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();

  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<ConversationThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [convStatus, setConvStatus] = useState("active");
  const [uploading, setUploading] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Action dialogs
  const [paymentLinkDialog, setPaymentLinkDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [sendingPaymentLink, setSendingPaymentLink] = useState(false);

  // Stats
  const [stats, setStats] = useState({ unread: 0, pending_docs: 0, overdue: 0, maintenance: 0 });

  // Context panel
  const [showContext, setShowContext] = useState(false);

  /* ────── Load all conversation threads ────── */
  const loadThreads = useCallback(async () => {
    if (!orgId) return;
    const threadMap = new Map<string, ConversationThread>();

    // 1. Load tenant-based conversations
    const { data: tenants } = await supabase
      .from("tenants")
      .select("id, name, email, tenant_user_id, property_id, lease_type")
      .eq("org_id", orgId)
      .order("name");

    if (tenants) {
      const propertyIds = tenants.filter(t => t.property_id).map(t => t.property_id!);
      let propertyMap: Record<string, { label: string; country: string }> = {};
      if (propertyIds.length > 0) {
        const { data: props } = await supabase
          .from("properties")
          .select("id, label, country")
          .in("id", propertyIds);
        if (props) propertyMap = Object.fromEntries(props.map(p => [p.id, { label: p.label, country: p.country || "FR" }]));
      }
      for (const t of tenants) {
        threadMap.set(`tenant-${t.id}`, {
          id: `tenant-${t.id}`,
          type: "tenant",
          name: t.name,
          email: t.email,
          tenantId: t.id,
          propertyLabel: t.property_id ? propertyMap[t.property_id]?.label : undefined,
          propertyCountry: t.property_id ? propertyMap[t.property_id]?.country : undefined,
          propertyId: t.property_id || undefined,
          unreadCount: 0,
          lastMessage: undefined,
          lastMessageTime: undefined,
        });
      }
    }

    // 2. Load booking-based conversations (marketplace)
    const { data: mBookings } = await supabase
      .from("marketplace_bookings")
      .select("id, booker_name, booker_email, booker_phone, status, total_price, currency, service_id, service_date")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (mBookings?.length) {
      const svcIds = [...new Set(mBookings.map(b => b.service_id).filter(Boolean))];
      let svcMap: Record<string, { title: string; country: string }> = {};
      if (svcIds.length > 0) {
        const { data: svcs } = await supabase
          .from("marketplace_services")
          .select("id, title, country")
          .in("id", svcIds);
        if (svcs) svcMap = Object.fromEntries(svcs.map(s => [s.id, { title: s.title, country: s.country || "" }]));
      }
      for (const b of mBookings) {
        threadMap.set(`booking-${b.id}`, {
          id: `booking-${b.id}`,
          type: "booking",
          name: b.booker_name || "Client",
          email: b.booker_email || null,
          phone: b.booker_phone,
          bookingId: b.id,
          bookingType: "marketplace",
          bookingStatus: b.status,
          serviceTitle: b.service_id ? svcMap[b.service_id]?.title : undefined,
          propertyCountry: b.service_id ? svcMap[b.service_id]?.country : undefined,
          totalPrice: b.total_price,
          currency: b.currency,
          unreadCount: 0,
        });
      }
    }

    // 3. Load concierge booking conversations
    const { data: cOrders } = await supabase
      .from("concierge_orders")
      .select("id, guest_name, guest_email, guest_phone, status, total_price, currency, service_id, service_date, property_label")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (cOrders?.length) {
      const svcIds = [...new Set(cOrders.map(o => o.service_id).filter(Boolean))];
      let svcMap: Record<string, { title: string; country: string }> = {};
      if (svcIds.length > 0) {
        const { data: svcs } = await supabase
          .from("concierge_services")
          .select("id, title, country")
          .in("id", svcIds);
        if (svcs) svcMap = Object.fromEntries(svcs.map(s => [s.id, { title: s.title, country: s.country || "" }]));
      }
      for (const o of cOrders) {
        threadMap.set(`booking-${o.id}`, {
          id: `booking-${o.id}`,
          type: "booking",
          name: o.guest_name || "Client",
          email: o.guest_email || null,
          phone: o.guest_phone,
          bookingId: o.id,
          bookingType: "concierge",
          bookingStatus: o.status,
          serviceTitle: o.service_id ? svcMap[o.service_id]?.title : undefined,
          propertyLabel: o.property_label || undefined,
          totalPrice: o.total_price,
          currency: o.currency,
          unreadCount: 0,
        });
      }
    }

    // 4. Load seasonal booking conversations
    const { data: sBookings } = await supabase
      .from("booking_requests")
      .select("id, guest_name, guest_email, guest_phone, status, check_in, check_out, property_id")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (sBookings?.length) {
      const propIds = [...new Set(sBookings.map(b => b.property_id).filter(Boolean))];
      let propMap: Record<string, { label: string; country: string }> = {};
      if (propIds.length > 0) {
        const { data: props } = await supabase.from("properties").select("id, label, country").in("id", propIds);
        if (props) propMap = Object.fromEntries(props.map(p => [p.id, { label: p.label, country: p.country || "" }]));
      }
      for (const b of sBookings) {
        threadMap.set(`booking-${b.id}`, {
          id: `booking-${b.id}`,
          type: "booking",
          name: b.guest_name || "Guest",
          email: b.guest_email || null,
          phone: b.guest_phone,
          bookingId: b.id,
          bookingType: "seasonal",
          bookingStatus: b.status,
          propertyLabel: b.property_id ? propMap[b.property_id]?.label : undefined,
          propertyCountry: b.property_id ? propMap[b.property_id]?.country : undefined,
          propertyId: b.property_id || undefined,
          unreadCount: 0,
        });
      }
    }

    // 5. Load message metadata (unread counts + last messages)
    const { data: allMsgs } = await supabase
      .from("messages")
      .select("tenant_id, booking_id, content, created_at, read, sender_id")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (allMsgs) {
      for (const m of allMsgs) {
        const key = m.booking_id ? `booking-${m.booking_id}` : m.tenant_id ? `tenant-${m.tenant_id}` : null;
        if (!key) continue;
        const thread = threadMap.get(key);
        if (!thread) continue;
        if (!thread.lastMessage) {
          thread.lastMessage = m.content;
          thread.lastMessageTime = m.created_at;
        }
        if (!m.read && m.sender_id !== user?.id) {
          thread.unreadCount++;
        }
      }
    }

    const sorted = Array.from(threadMap.values()).sort((a, b) => {
      if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
      const at = a.lastMessageTime || "";
      const bt = b.lastMessageTime || "";
      return bt.localeCompare(at);
    });

    setThreads(sorted);
    setStats(s => ({ ...s, unread: sorted.reduce((acc, t) => acc + t.unreadCount, 0) }));
    setLoading(false);
  }, [orgId, user]);

  const loadStats = useCallback(async () => {
    if (!orgId) return;
    const [docRes, overdueRes, maintRes] = await Promise.all([
      supabase.from("document_requests").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "pending"),
      supabase.from("rent_calls").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("paid", false),
      supabase.from("interventions").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "pending"),
    ]);
    setStats(s => ({
      ...s,
      pending_docs: docRes.count || 0,
      overdue: overdueRes.count || 0,
      maintenance: maintRes.count || 0,
    }));
  }, [orgId]);

  const loadMessages = useCallback(async () => {
    if (!orgId || !selectedThread) return;
    let query = supabase
      .from("messages")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true });

    if (selectedThread.type === "booking" && selectedThread.bookingId) {
      query = query.eq("booking_id", selectedThread.bookingId);
    } else if (selectedThread.tenantId) {
      query = query.eq("tenant_id", selectedThread.tenantId).is("booking_id", null);
    }

    const { data } = await query;
    if (data) {
      setMessages(data as Message[]);
      const lastMsg = data[data.length - 1] as any;
      if (lastMsg?.conversation_status) setConvStatus(lastMsg.conversation_status);

      const unreadIds = data.filter(m => !m.read && m.sender_id !== user?.id).map(m => m.id);
      if (unreadIds.length > 0) {
        await supabase.from("messages").update({ read: true }).in("id", unreadIds);
        // Update thread unread count locally
        setThreads(prev => prev.map(t =>
          t.id === selectedThread.id ? { ...t, unreadCount: 0 } : t
        ));
      }
    }
  }, [orgId, selectedThread, user]);

  useEffect(() => { loadThreads(); loadStats(); }, [loadThreads, loadStats]);
  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Deep-link from notifications: ?thread=booking-xxx or ?thread=tenant-xxx
  useEffect(() => {
    const threadParam = searchParams.get("thread") || searchParams.get("booking");
    if (!threadParam || loading || threads.length === 0) return;

    // Try to find by booking id
    let found = threads.find(t =>
      t.id === `booking-${threadParam}` || t.id === threadParam || t.bookingId === threadParam
    );
    if (!found) {
      found = threads.find(t => t.id === `tenant-${threadParam}` || t.tenantId === threadParam);
    }
    if (found) {
      setSelectedThread(found);
      setSearchParams({}, { replace: true });
    }
  }, [threads, loading, searchParams, setSearchParams]);

  // Real-time
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel("comm-center-rt")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages", filter: `org_id=eq.${orgId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        const msgThreadKey = newMsg.booking_id ? `booking-${newMsg.booking_id}` : newMsg.tenant_id ? `tenant-${newMsg.tenant_id}` : null;

        if (selectedThread && msgThreadKey === selectedThread.id) {
          setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
          if (newMsg.sender_id !== user?.id) {
            supabase.from("messages").update({ read: true }).eq("id", newMsg.id);
          }
        } else if (msgThreadKey) {
          setThreads(prev => prev.map(t =>
            t.id === msgThreadKey
              ? { ...t, unreadCount: t.unreadCount + 1, lastMessage: newMsg.content, lastMessageTime: newMsg.created_at }
              : t
          ));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, selectedThread, user]);

  // Typing indicator
  useEffect(() => {
    if (!selectedThread || !orgId) return;
    const channel = supabase.channel(`typing-${selectedThread.id}`);
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
  }, [selectedThread, orgId, user?.id]);

  /* ────── File upload ────── */
  const handleFileUpload = async (file: File) => {
    if (!orgId || !selectedThread || !user) return;
    setUploading(true);
    try {
      const path = `${orgId}/messages/${selectedThread.id}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("rental-docs").upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: signedData } = await supabase.storage.from("rental-docs").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signedData?.signedUrl || path;

      await supabase.from("messages").insert({
        org_id: orgId,
        sender_id: user.id,
        tenant_id: selectedThread.tenantId || null,
        booking_id: selectedThread.bookingId || null,
        booking_type: selectedThread.bookingType || null,
        contact_name: selectedThread.type === "booking" ? selectedThread.name : null,
        contact_email: selectedThread.type === "booking" ? selectedThread.email : null,
        content: `📎 ${file.name}`,
        category: "general",
        attachment_url: url,
        message_type: "user",
        sender_locale: locale,
      } as any);

      toast.success("Fichier envoyé");
    } catch (e: any) {
      toast.error("Erreur: " + e.message);
    }
    setUploading(false);
  };

  const updateConversationStatus = async (status: string) => {
    if (!selectedThread || !orgId || !user) return;
    setConvStatus(status);
    const lastMsg = messages[messages.length - 1];
    if (lastMsg) {
      await supabase.from("messages").update({ conversation_status: status }).eq("id", lastMsg.id);
    }
    toast.success(`Statut: ${CONV_STATUSES.find(s => s.value === status)?.label}`);
  };

  /* ────── Send message ────── */
  const handleSendMessage = async (content: string, category: string) => {
    if (!selectedThread || !orgId || !user) return;
    setSending(true);
    try {
      const propCountry = selectedThread.propertyCountry || "FR";
      const tenantLocale = getCountryConfig(propCountry).locale.slice(0, 2);
      const senderLocale = locale;

      let translatedContent: string | null = null;
      if (senderLocale !== tenantLocale) {
        try {
          const { data: transData } = await supabase.functions.invoke("translate-message", {
            body: { text: content, from_locale: senderLocale, to_locale: tenantLocale },
          });
          if (transData?.translated) translatedContent = transData.translated;
        } catch (e) { console.error("Translation failed:", e); }
      }

      await supabase.from("messages").insert({
        org_id: orgId,
        sender_id: user.id,
        tenant_id: selectedThread.tenantId || null,
        booking_id: selectedThread.bookingId || null,
        booking_type: selectedThread.bookingType || null,
        contact_name: selectedThread.type === "booking" ? selectedThread.name : null,
        contact_email: selectedThread.type === "booking" ? selectedThread.email : null,
        content,
        translated_content: translatedContent,
        category,
        sender_locale: senderLocale,
        read: false,
        message_type: "user",
        property_id: selectedThread.propertyId || null,
        conversation_status: "waiting_tenant",
      } as any);

      setNewMessage("");
      setConvStatus("waiting_tenant");

      // Audit
      await supabase.from("audit_logs").insert({
        user_id: user.id, org_id: orgId, action: "message_sent",
        metadata_json: {
          thread_id: selectedThread.id,
          booking_id: selectedThread.bookingId,
          category,
        },
      });

      // Send email notification to client
      const recipientEmail = normalizeEmail(selectedThread.email);
      if (recipientEmail && isValidEmail(recipientEmail)) {
        const L = getCountryConfig(propCountry).labels;
        const appUrl = buildAppUrl("/");
        try {
          await supabase.functions.invoke("send-email", {
            body: {
              to: recipientEmail,
              subject: `📩 ${selectedThread.name} — New message`,
              html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
                <h2 style="color:#1a1a1a;text-align:center;">📩 New message from your host</h2>
                <div style="background:#f5f5f5;border-left:4px solid #d4a853;border-radius:8px;padding:16px;margin:16px 0;">
                  <p style="color:#1a1a1a;white-space:pre-wrap;margin:0;font-size:15px;">${escapeEmailHtml(translatedContent || content)}</p>
                </div>
                ${selectedThread.bookingId ? `<p style="color:#888;font-size:12px;">Booking ref: ${selectedThread.bookingId.slice(0, 8)}</p>` : ""}
                <div style="text-align:center;margin:24px 0;">
                  <a href="${appUrl}" style="display:inline-block;background:#d4a853;color:#1a1a1a;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;">Reply</a>
                </div>
              </div>`,
            },
          });
        } catch (e) { console.error("Email failed:", e); }
      }

      // In-app notification for tenant
      if (selectedThread.type === "tenant" && selectedThread.tenantId) {
        const { data: tenant } = await supabase
          .from("tenants")
          .select("tenant_user_id")
          .eq("id", selectedThread.tenantId)
          .single();
        if (tenant?.tenant_user_id) {
          await supabase.from("notifications").insert({
            user_id: tenant.tenant_user_id, org_id: orgId, type: "message",
            title: "📩 New message from your landlord",
            message: content.slice(0, 200),
            link: "/tenant/messages",
          });
        }
      }
    } finally { setSending(false); }
  };

  const handleSend = () => {
    if (!newMessage.trim()) return;
    handleSendMessage(newMessage.trim(), selectedCategory);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  /* ────── Booking actions ────── */
  const handleBookingAction = async (action: "confirm" | "cancel" | "complete") => {
    if (!selectedThread?.bookingId || !orgId || !user) return;
    const { bookingId, bookingType } = selectedThread;
    const statusMap = { confirm: "confirmed", cancel: "cancelled", complete: "completed" };
    const newStatus = statusMap[action];

    try {
      if (bookingType === "marketplace") {
        await supabase.from("marketplace_bookings").update({ status: newStatus }).eq("id", bookingId);
      } else if (bookingType === "concierge") {
        const updates: any = { status: newStatus };
        if (action === "confirm") updates.confirmed_at = new Date().toISOString();
        if (action === "cancel") updates.cancelled_at = new Date().toISOString();
        if (action === "complete") updates.completed_at = new Date().toISOString();
        await supabase.from("concierge_orders").update(updates).eq("id", bookingId);
      } else if (bookingType === "seasonal") {
        await supabase.from("booking_requests").update({ status: newStatus }).eq("id", bookingId);
      }

      // Send system message
      const actionLabels = { confirm: "✅ Booking confirmed", cancel: "❌ Booking cancelled", complete: "🏁 Booking completed" };
      await supabase.from("messages").insert({
        org_id: orgId,
        sender_id: SYSTEM_SENDER_ID,
        tenant_id: selectedThread.tenantId || null,
        booking_id: bookingId,
        booking_type: bookingType,
        content: actionLabels[action],
        category: "booking",
        message_type: "system",
        read: false,
      } as any);

      // Update thread locally
      setSelectedThread(prev => prev ? { ...prev, bookingStatus: newStatus } : null);
      setThreads(prev => prev.map(t => t.id === selectedThread.id ? { ...t, bookingStatus: newStatus } : t));

      toast.success(actionLabels[action]);

      // Notify client by email
      const email = normalizeEmail(selectedThread.email);
      if (email && isValidEmail(email)) {
        await supabase.functions.invoke("send-email", {
          body: {
            to: email,
            subject: actionLabels[action],
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
              <h2 style="text-align:center;">${actionLabels[action]}</h2>
              <p style="text-align:center;color:#555;">Your booking has been updated. Ref: ${bookingId.slice(0, 8)}</p>
            </div>`,
          },
        });
      }
    } catch (e: any) {
      toast.error("Error: " + e.message);
    }
  };

  /* ────── Send payment link ────── */
  const handleSendPaymentLink = async () => {
    if (!selectedThread || !orgId || !user || !paymentAmount) return;
    setSendingPaymentLink(true);
    try {
      const amount = parseFloat(paymentAmount);
      if (isNaN(amount) || amount <= 0) throw new Error("Invalid amount");

      // Try to create a Stripe payment link
      let paymentUrl = "";
      try {
        const { data, error } = await supabase.functions.invoke("create-booking-payment", {
          body: {
            booking_id: selectedThread.bookingId || selectedThread.id,
            amount: Math.round(amount * 100),
            currency: selectedThread.currency || "eur",
            description: paymentDescription || `Payment — ${selectedThread.name}`,
            customer_email: selectedThread.email || "",
          },
        });
        if (error) throw error;
        paymentUrl = data?.url || "";
      } catch (e) {
        console.error("Stripe payment link failed:", e);
      }

      const msgContent = paymentUrl
        ? `💳 Payment request: ${amount.toFixed(2)} ${(selectedThread.currency || "EUR").toUpperCase()}\n${paymentDescription ? `📝 ${paymentDescription}\n` : ""}🔗 ${paymentUrl}`
        : `💳 Payment request: ${amount.toFixed(2)} ${(selectedThread.currency || "EUR").toUpperCase()}\n${paymentDescription ? `📝 ${paymentDescription}\n` : ""}Please contact us for payment details.`;

      await supabase.from("messages").insert({
        org_id: orgId,
        sender_id: user.id,
        tenant_id: selectedThread.tenantId || null,
        booking_id: selectedThread.bookingId || null,
        booking_type: selectedThread.bookingType || null,
        content: msgContent,
        category: "payment",
        message_type: "user",
        read: false,
      } as any);

      // Email client
      const email = normalizeEmail(selectedThread.email);
      if (email && isValidEmail(email)) {
        await supabase.functions.invoke("send-email", {
          body: {
            to: email,
            subject: `💳 Payment request — ${amount.toFixed(2)} ${(selectedThread.currency || "EUR").toUpperCase()}`,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
              <h2 style="text-align:center;">💳 Payment Request</h2>
              <p style="text-align:center;font-size:24px;font-weight:bold;color:#1a1a1a;">${amount.toFixed(2)} ${(selectedThread.currency || "EUR").toUpperCase()}</p>
              ${paymentDescription ? `<p style="text-align:center;color:#555;">${escapeEmailHtml(paymentDescription)}</p>` : ""}
              ${paymentUrl ? `<div style="text-align:center;margin:24px 0;"><a href="${paymentUrl}" style="display:inline-block;background:#d4a853;color:#1a1a1a;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:16px;">Pay Now</a></div>` : ""}
            </div>`,
          },
        });
      }

      setPaymentLinkDialog(false);
      setPaymentAmount("");
      setPaymentDescription("");
      toast.success("Payment link sent");
    } catch (e: any) {
      toast.error(e.message);
    }
    setSendingPaymentLink(false);
  };

  /* ────── Filters ────── */
  const filteredThreads = useMemo(() =>
    threads
      .filter(t => filterType === "all" || t.type === filterType || t.bookingType === filterType)
      .filter(t => !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.propertyLabel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.serviceTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.bookingId?.includes(searchQuery)
      ),
    [threads, filterType, searchQuery]
  );

  const getCategoryIcon = (cat: string) => MESSAGE_CATEGORIES.find(c => c.value === cat)?.icon || "💬";

  const getBookingTypeBadge = (type?: string) => {
    switch (type) {
      case "marketplace": return <Badge variant="outline" className="text-[10px] px-1.5 py-0">🛍️ Marketplace</Badge>;
      case "concierge": return <Badge variant="outline" className="text-[10px] px-1.5 py-0">🎯 Concierge</Badge>;
      case "seasonal": return <Badge variant="outline" className="text-[10px] px-1.5 py-0">🏖️ Seasonal</Badge>;
      default: return null;
    }
  };

  const getStatusBadge = (status?: string) => {
    const colors: Record<string, string> = {
      pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      confirmed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      completed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      cancelled: "bg-destructive/10 text-destructive border-destructive/20",
      awaiting_payment: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    };
    return status ? (
      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${colors[status] || ""}`}>
        {status}
      </Badge>
    ) : null;
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Stats bar */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground">Communication Center</h1>
            <p className="text-sm text-muted-foreground">Unified inbox — Tenants, Bookings, Services</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { icon: MessageCircle, label: "Unread", value: stats.unread, color: "text-primary" },
              { icon: FileText, label: "Docs", value: stats.pending_docs, color: "text-blue-500" },
              { icon: CreditCard, label: "Overdue", value: stats.overdue, color: "text-destructive" },
              { icon: Wrench, label: "Maint.", value: stats.maintenance, color: "text-amber-500" },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-card rounded-lg border border-border/50 text-xs">
                <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                <span className="font-semibold text-foreground">{s.value}</span>
                <span className="text-muted-foreground hidden sm:inline">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex gap-0 min-h-0 bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
          {/* ────── Thread list ────── */}
          <div className={`w-full md:w-80 lg:w-96 border-r border-border/50 flex flex-col ${selectedThread ? "hidden md:flex" : "flex"}`}>
            <div className="p-3 border-b border-border/50 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search conversations..." className="pl-9 h-9 text-sm" />
              </div>
              <div className="flex gap-1 flex-wrap">
                {[
                  { value: "all", label: "All" },
                  { value: "tenant", label: "🏠 Tenants" },
                  { value: "marketplace", label: "🛍️ Market" },
                  { value: "concierge", label: "🎯 Concierge" },
                  { value: "seasonal", label: "🏖️ Seasonal" },
                ].map(f => (
                  <Button
                    key={f.value}
                    size="sm"
                    variant={filterType === f.value ? "default" : "ghost"}
                    onClick={() => setFilterType(f.value)}
                    className="text-xs h-7 px-2"
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>

            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-4 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
              ) : filteredThreads.length === 0 ? (
                <div className="p-6 text-center">
                  <MessageCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">No conversations found</p>
                </div>
              ) : (
                filteredThreads.map(thread => (
                  <button
                    key={thread.id}
                    onClick={() => setSelectedThread(thread)}
                    className={`w-full text-left p-3 hover:bg-muted/50 transition-colors border-b border-border/20 ${
                      selectedThread?.id === thread.id ? "bg-muted/70" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                          thread.type === "booking" ? "bg-accent/10" : "bg-primary/10"
                        }`}>
                          {thread.type === "booking" ? (
                            <Hash className="h-4 w-4 text-accent" />
                          ) : (
                            <User className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        {thread.unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                            {thread.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm truncate ${thread.unreadCount > 0 ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
                            {thread.name}
                          </p>
                          {thread.lastMessageTime && (
                            <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                              {formatDistanceToNow(new Date(thread.lastMessageTime), { addSuffix: false, locale: fr })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {thread.type === "booking" && getBookingTypeBadge(thread.bookingType)}
                          {thread.bookingStatus && getStatusBadge(thread.bookingStatus)}
                          {thread.propertyCountry && <span className="text-xs">{getCountryEntryOrDefault(thread.propertyCountry).flag}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {thread.serviceTitle || thread.propertyLabel || thread.email || "—"}
                        </p>
                        {thread.lastMessage && (
                          <p className={`text-xs truncate mt-0.5 ${thread.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                            {thread.lastMessage.slice(0, 60)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </ScrollArea>
          </div>

          {/* ────── Chat area ────── */}
          <div className={`flex-1 flex flex-col ${!selectedThread ? "hidden md:flex" : "flex"}`}>
            {selectedThread ? (
              <>
                {/* Chat header */}
                <div className="p-3 border-b border-border/50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedThread(null)} className="md:hidden shrink-0">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                      selectedThread.type === "booking" ? "bg-accent/10" : "bg-primary/10"
                    }`}>
                      {selectedThread.type === "booking" ? <Hash className="h-4 w-4 text-accent" /> : <User className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{selectedThread.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {selectedThread.type === "booking" && getBookingTypeBadge(selectedThread.bookingType)}
                        {selectedThread.bookingStatus && getStatusBadge(selectedThread.bookingStatus)}
                        {selectedThread.serviceTitle && <span className="truncate">{selectedThread.serviceTitle}</span>}
                        {selectedThread.propertyLabel && <span className="truncate">{selectedThread.propertyLabel}</span>}
                      </div>
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
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowContext(!showContext)}>
                      <ChevronRight className={`h-4 w-4 transition-transform ${showContext ? "rotate-180" : ""}`} />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 flex min-h-0">
                  {/* Messages */}
                  <div className="flex-1 flex flex-col min-h-0">
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                      {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <MessageCircle className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
                            <p className="text-muted-foreground text-sm">No messages yet — start the conversation</p>
                          </div>
                        </div>
                      ) : (
                        messages.map(msg => {
                          const isMe = msg.sender_id === user?.id;
                          const isSystem = msg.message_type === "system" || msg.sender_id === SYSTEM_SENDER_ID;

                          if (isSystem) {
                            return (
                              <div key={msg.id} className="flex justify-center">
                                <div className="bg-muted/50 text-muted-foreground text-xs px-4 py-2 rounded-full max-w-[80%] text-center">
                                  {msg.content}
                                  <span className="ml-2 opacity-60">{format(new Date(msg.created_at), "dd/MM HH:mm")}</span>
                                </div>
                              </div>
                            );
                          }

                          // Payment link message
                          const isPayment = msg.content.startsWith("💳");
                          const linkMatch = msg.content.match(/(https:\/\/[^\s]+)/);

                          return (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                            >
                              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                                isPayment
                                  ? "bg-accent/10 border border-accent/20 text-foreground rounded-br-md"
                                  : isMe
                                    ? "bg-primary text-primary-foreground rounded-br-md"
                                    : "bg-muted text-foreground rounded-bl-md"
                              }`}>
                                {msg.category !== "general" && (
                                  <span className="text-[10px] opacity-70 mb-0.5 block">{getCategoryIcon(msg.category)}</span>
                                )}
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {isMe ? msg.content : (msg.translated_content || msg.content)}
                                </p>
                                {linkMatch && (
                                  <a href={linkMatch[1]} target="_blank" rel="noopener noreferrer"
                                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-accent underline">
                                    <ExternalLink className="h-3 w-3" /> Open payment link
                                  </a>
                                )}
                                {msg.attachment_url && (
                                  <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer"
                                    className={`flex items-center gap-1.5 mt-2 text-xs underline ${isMe ? "text-primary-foreground/80" : "text-accent"}`}>
                                    <Paperclip className="h-3 w-3" /> Attachment
                                  </a>
                                )}
                                <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : ""}`}>
                                  <p className={`text-[10px] ${isMe && !isPayment ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                    {format(new Date(msg.created_at), "HH:mm")}
                                  </p>
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

                    {/* Quick action bar for bookings */}
                    {selectedThread.type === "booking" && (
                      <div className="px-3 py-2 border-t border-border/30 flex items-center gap-2 flex-wrap bg-muted/30">
                        <span className="text-xs text-muted-foreground mr-1">Actions:</span>
                        <Button size="sm" variant="ghost" className="text-xs h-7 gap-1" onClick={() => setPaymentLinkDialog(true)}>
                          <CreditCard className="h-3 w-3" /> Payment Link
                        </Button>
                        {selectedThread.bookingStatus === "pending" && (
                          <Button size="sm" variant="ghost" className="text-xs h-7 gap-1 text-emerald-600" onClick={() => handleBookingAction("confirm")}>
                            <CalendarCheck className="h-3 w-3" /> Confirm
                          </Button>
                        )}
                        {selectedThread.bookingStatus === "confirmed" && (
                          <Button size="sm" variant="ghost" className="text-xs h-7 gap-1 text-blue-600" onClick={() => handleBookingAction("complete")}>
                            <CalendarCheck className="h-3 w-3" /> Complete
                          </Button>
                        )}
                        {!["cancelled", "completed"].includes(selectedThread.bookingStatus || "") && (
                          <Button size="sm" variant="ghost" className="text-xs h-7 gap-1 text-destructive" onClick={() => handleBookingAction("cancel")}>
                            <Ban className="h-3 w-3" /> Cancel
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Input */}
                    <div className="p-3 border-t border-border/50 flex gap-2 items-center">
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-12 h-10 px-2">
                          <span className="text-sm">{getCategoryIcon(selectedCategory)}</span>
                        </SelectTrigger>
                        <SelectContent>
                          {MESSAGE_CATEGORIES.map(c => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex-1">
                        <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder="Write a message..." className="h-10" />
                      </div>
                      <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.heic"
                        onChange={e => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); e.target.value = ""; }} />
                      <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                      </Button>
                      <AIGenerateButton task="guest_reply" taskContext={newMessage || "message from client"} onApply={text => setNewMessage(text)} label="AI" variant="icon" />
                      <Button onClick={handleSend} disabled={sending || !newMessage.trim()} className="shrink-0 h-10">
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* ────── Context panel ────── */}
                  {showContext && (
                    <div className="w-64 border-l border-border/50 p-4 overflow-y-auto hidden lg:block">
                      <h3 className="text-sm font-semibold text-foreground mb-3">Details</h3>

                      {/* Contact info */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{selectedThread.name}</span>
                        </div>
                        {selectedThread.email && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <a href={`mailto:${selectedThread.email}`} className="truncate underline">{selectedThread.email}</a>
                          </div>
                        )}
                        {selectedThread.phone && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            <a href={`tel:${selectedThread.phone}`} className="underline">{selectedThread.phone}</a>
                          </div>
                        )}
                      </div>

                      {/* Booking info */}
                      {selectedThread.type === "booking" && (
                        <div className="space-y-2 mb-4">
                          <h4 className="text-xs font-semibold text-foreground">Booking</h4>
                          <div className="flex items-center gap-2">
                            {getBookingTypeBadge(selectedThread.bookingType)}
                            {getStatusBadge(selectedThread.bookingStatus)}
                          </div>
                          {selectedThread.bookingId && (
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {selectedThread.bookingId.slice(0, 8)}
                            </p>
                          )}
                          {selectedThread.serviceTitle && (
                            <p className="text-xs text-foreground">{selectedThread.serviceTitle}</p>
                          )}
                          {selectedThread.totalPrice != null && (
                            <p className="text-sm font-semibold text-foreground">
                              {selectedThread.totalPrice.toFixed(2)} {(selectedThread.currency || "EUR").toUpperCase()}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Property info */}
                      {(selectedThread.propertyLabel || selectedThread.propertyCountry) && (
                        <div className="space-y-1">
                          <h4 className="text-xs font-semibold text-foreground">Property</h4>
                          {selectedThread.propertyCountry && (
                            <span className="text-xs">{getCountryEntryOrDefault(selectedThread.propertyCountry).flag} {getCountryEntryOrDefault(selectedThread.propertyCountry).name}</span>
                          )}
                          {selectedThread.propertyLabel && (
                            <p className="text-xs text-muted-foreground">{selectedThread.propertyLabel}</p>
                          )}
                        </div>
                      )}

                      {/* Quick links */}
                      <div className="mt-4 pt-4 border-t border-border/30 space-y-1.5">
                        <h4 className="text-xs font-semibold text-foreground mb-2">Quick Links</h4>
                        {selectedThread.type === "booking" && selectedThread.bookingType === "marketplace" && (
                          <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-1.5" asChild>
                            <a href={`/dashboard/activities?booking=${selectedThread.bookingId}`}>
                              <ExternalLink className="h-3 w-3" /> View in Marketplace
                            </a>
                          </Button>
                        )}
                        {selectedThread.type === "booking" && selectedThread.bookingType === "concierge" && (
                          <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-1.5" asChild>
                            <a href={`/dashboard/concierge?booking=${selectedThread.bookingId}`}>
                              <ExternalLink className="h-3 w-3" /> View in Concierge
                            </a>
                          </Button>
                        )}
                        {selectedThread.type === "booking" && selectedThread.bookingType === "seasonal" && (
                          <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-1.5" asChild>
                            <a href={`/dashboard/seasonal?booking=${selectedThread.bookingId}`}>
                              <ExternalLink className="h-3 w-3" /> View in Seasonal
                            </a>
                          </Button>
                        )}
                        {selectedThread.type === "tenant" && (
                          <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-1.5" asChild>
                            <a href="/dashboard/rental?tab=tenants">
                              <ExternalLink className="h-3 w-3" /> View Tenant
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-sm">
                  <MessageCircle className="h-16 w-16 text-muted-foreground/15 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Communication Center</h3>
                  <p className="text-sm text-muted-foreground">
                    Select a conversation to start. All messages, bookings, and documents are unified here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment link dialog */}
      <Dialog open={paymentLinkDialog} onOpenChange={setPaymentLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>💳 Send Payment Link</DialogTitle>
            <DialogDescription>Create and send a payment request to {selectedThread?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground">Amount ({(selectedThread?.currency || "EUR").toUpperCase()})</label>
              <Input type="number" step="0.01" min="0.50" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="100.00" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Description (optional)</label>
              <Textarea value={paymentDescription} onChange={e => setPaymentDescription(e.target.value)} placeholder="Payment for..." className="min-h-[3rem]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPaymentLinkDialog(false)}>Cancel</Button>
            <Button onClick={handleSendPaymentLink} disabled={sendingPaymentLink || !paymentAmount}>
              {sendingPaymentLink ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Send Payment Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CommunicationCenter;
