import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  MessageCircle, Send, ArrowLeft, User, Filter, Search, Paperclip,
  Globe, Clock, CheckCheck, Check, FileText, CreditCard, Wrench,
  Loader2, X, Upload, Link2, CalendarCheck, Ban, Edit3, ExternalLink,
  Building, Phone, Mail, MapPin, Receipt, ChevronRight, Hash, History,
} from "lucide-react";
import EntityActivityLog from "@/components/communication/EntityActivityLog";
import DealRoomPanel from "@/components/communication/DealRoomPanel";
import AIGenerateButton from "@/components/ai/AIGenerateButton";
import ChatMediaPreview from "@/components/communication/ChatMediaPreview";
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
  id: string; // tenant_id or booking_id or lead_id
  type: "tenant" | "booking" | "lead";
  contextType: string; // unified context: tenant, seasonal_booking, marketplace_booking, concierge_booking, real_estate_lead, etc.
  contextId: string; // actual record ID
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
  leadId?: string;
  listingTitle?: string;
  listingType?: string;
  assignedTo?: string;
}

interface Message {
  id: string;
  sender_id: string;
  tenant_id: string | null;
  content: string;
  translated_content: string | null;
  translated_locale: string | null;
  language_detected: string | null;
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
  sender_locale?: string;
}

const MESSAGE_CATEGORIES = [
  { value: "general", label: "💬 Général", icon: "💬" },
  { value: "payment", label: "💰 Paiement", icon: "💰" },
  { value: "booking", label: "📅 Réservation", icon: "📅" },
  { value: "lease", label: "📝 Bail", icon: "📝" },
  { value: "maintenance", label: "🔧 Maintenance", icon: "🔧" },
  { value: "legal", label: "⚖️ Juridique", icon: "⚖️" },
  { value: "real_estate", label: "🏠 Immobilier", icon: "🏠" },
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
  const [filterProperty, setFilterProperty] = useState("all");

  // Request notification permission when entering communication center
  useEffect(() => {
    import("@/lib/notif-alert-prefs").then(m => m.requestNotificationPermission());
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [convStatus, setConvStatus] = useState("active");
  const [uploading, setUploading] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  const [translatingMsgId, setTranslatingMsgId] = useState<string | null>(null);
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
          contextType: "tenant",
          contextId: t.id,
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
          contextType: "marketplace_booking",
          contextId: b.id,
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
          contextType: "concierge_booking",
          contextId: o.id,
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
          contextType: "seasonal_booking",
          contextId: b.id,
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

    // 5. Load real estate leads as conversation threads
    const { data: reLeads } = await supabase
      .from("real_estate_leads")
      .select("id, name, email, phone, status, message, listing_id, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (reLeads?.length) {
      const listingIds = [...new Set(reLeads.map(l => l.listing_id).filter(Boolean))];
      let listingMap: Record<string, { title: string; listing_type: string; country: string }> = {};
      if (listingIds.length > 0) {
        const { data: listings } = await supabase
          .from("real_estate_listings")
          .select("id, title, listing_type, country")
          .in("id", listingIds);
        if (listings) listingMap = Object.fromEntries(listings.map(l => [l.id, { title: l.title, listing_type: l.listing_type, country: l.country || "" }]));
      }
      for (const lead of reLeads) {
        const listing = lead.listing_id ? listingMap[lead.listing_id] : null;
        threadMap.set(`lead-${lead.id}`, {
          id: `lead-${lead.id}`,
          type: "lead",
          contextType: "real_estate_lead",
          contextId: lead.id,
          name: lead.name || "Visitor",
          email: lead.email || null,
          phone: lead.phone,
          leadId: lead.id,
          listingTitle: listing?.title,
          listingType: listing?.listing_type,
          propertyCountry: listing?.country,
          bookingStatus: lead.status,
          unreadCount: 0,
          lastMessage: lead.message || undefined,
          lastMessageTime: lead.created_at,
        });
      }
    }

    // 6. Load guest session conversations
    const { data: guestSessions } = await supabase
      .from("guest_sessions" as any)
      .select("id, display_name, email, context_type, context_id, created_at, expires_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (guestSessions?.length) {
      for (const gs of guestSessions as any[]) {
        threadMap.set(`guest-${gs.id}`, {
          id: `guest-${gs.id}`,
          type: "lead" as const,
          contextType: "guest_session",
          contextId: gs.id,
          name: gs.display_name || "Guest",
          email: gs.email || null,
          listingTitle: gs.context_type !== "general" ? gs.context_type : undefined,
          unreadCount: 0,
          lastMessageTime: gs.created_at,
        });
      }
    }

    // 6. Load message metadata (unread counts + last messages)
    const { data: allMsgs } = await supabase
      .from("messages")
      .select("tenant_id, booking_id, content, created_at, read, sender_id, context_type, context_id")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (allMsgs) {
      for (const m of allMsgs) {
        // Try context-based key first, then legacy
        const ctxKey = (m as any).context_type && (m as any).context_id
          ? `${(m as any).context_type === "real_estate_lead" ? "lead" : (m as any).context_type === "tenant" ? "tenant" : "booking"}-${(m as any).context_id}`
          : null;
        const legacyKey = m.booking_id ? `booking-${m.booking_id}` : m.tenant_id ? `tenant-${m.tenant_id}` : null;
        const key = ctxKey || legacyKey;
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

    // Use context-based query for leads/guests, legacy for others
    if (selectedThread.contextType === "guest_session" && selectedThread.contextId) {
      query = query.eq("guest_session_id", selectedThread.contextId);
    } else if (selectedThread.type === "lead" && selectedThread.leadId) {
      query = query.eq("context_type", "real_estate_lead").eq("context_id", selectedThread.leadId);
    } else if (selectedThread.type === "booking" && selectedThread.bookingId) {
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

  /* ────── File/media upload ────── */
  const handleFileUpload = async (file: File) => {
    if (!orgId || !selectedThread || !user) return;
    setUploading(true);
    try {
      const { validateMediaFile } = await import("@/lib/media-utils");
      const validationErr = validateMediaFile(file);
      if (validationErr) { toast.error(validationErr); setUploading(false); return; }

      const ext = file.name.split(".").pop() || "bin";
      const path = `${orgId}/${selectedThread.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("chat-media").upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: signedData } = await supabase.storage.from("chat-media").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signedData?.signedUrl || path;

      const isMedia = file.type.startsWith("image/") || file.type.startsWith("video/");
      await supabase.from("messages").insert({
        org_id: orgId,
        sender_id: user.id,
        tenant_id: selectedThread.tenantId || null,
        booking_id: selectedThread.bookingId || null,
        booking_type: selectedThread.bookingType || null,
        contact_name: selectedThread.type === "booking" ? selectedThread.name : null,
        contact_email: selectedThread.type === "booking" ? selectedThread.email : null,
        content: isMedia ? `📷 ${file.name}` : `📎 ${file.name}`,
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

  const handleMediaUploaded = async (urls: string[], names: string[]) => {
    if (!orgId || !selectedThread || !user) return;
    for (let i = 0; i < urls.length; i++) {
      await supabase.from("messages").insert({
        org_id: orgId,
        sender_id: user.id,
        tenant_id: selectedThread.tenantId || null,
        booking_id: selectedThread.bookingId || null,
        booking_type: selectedThread.bookingType || null,
        contact_name: selectedThread.type === "booking" ? selectedThread.name : null,
        contact_email: selectedThread.type === "booking" ? selectedThread.email : null,
        content: `📷 ${names[i]}`,
        category: "general",
        attachment_url: urls[i],
        message_type: "user",
        sender_locale: locale,
      } as any);
    }
    toast.success(`${urls.length} media sent`);
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
      // Resolve customer language: prefer their stored locale, fallback to property country, then "en"
      const senderLocale = locale;
      let tenantLocale = "en";
      if (selectedThread.tenantId) {
        const { data: tData } = await supabase.from("tenants").select("preferred_locale").eq("id", selectedThread.tenantId).maybeSingle();
        if (tData?.preferred_locale) tenantLocale = tData.preferred_locale;
        else {
          const propCountry = selectedThread.propertyCountry || "FR";
          tenantLocale = getCountryConfig(propCountry).locale.slice(0, 2);
        }
      } else {
        const propCountry = selectedThread.propertyCountry || "FR";
        tenantLocale = getCountryConfig(propCountry).locale.slice(0, 2);
      }

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
        contact_name: selectedThread.type !== "tenant" ? selectedThread.name : null,
        contact_email: selectedThread.type !== "tenant" ? selectedThread.email : null,
        content,
        translated_content: translatedContent,
        category: selectedThread.type === "lead" ? "real_estate" : category,
        sender_locale: senderLocale,
        read: false,
        message_type: "user",
        property_id: selectedThread.propertyId || null,
        conversation_status: "waiting_tenant",
        context_type: selectedThread.contextType,
        context_id: selectedThread.contextId,
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

      // Send email notification to client — professional design with booking details
      const recipientEmail = normalizeEmail(selectedThread.email);
      if (recipientEmail && isValidEmail(recipientEmail)) {
        const propCountryLabel = selectedThread.propertyCountry
          ? getCountryEntryOrDefault(selectedThread.propertyCountry).name
          : "";
        const bookingRef = selectedThread.bookingId?.slice(0, 8) || "";
        const emailLang = tenantLocale || "en";
        const emailLabels: Record<string, Record<string, string>> = {
          fr: { title: "📩 Nouveau message de votre hôte", cta: "Répondre", ref: "Réf. réservation", service: "Service", property: "Bien" },
          en: { title: "📩 New message from your host", cta: "Reply", ref: "Booking ref", service: "Service", property: "Property" },
          es: { title: "📩 Nuevo mensaje de tu anfitrión", cta: "Responder", ref: "Ref. reserva", service: "Servicio", property: "Propiedad" },
          de: { title: "📩 Neue Nachricht von Ihrem Gastgeber", cta: "Antworten", ref: "Buchungs-Ref", service: "Service", property: "Objekt" },
          it: { title: "📩 Nuovo messaggio dal tuo host", cta: "Rispondi", ref: "Rif. prenotazione", service: "Servizio", property: "Proprietà" },
          pt: { title: "📩 Nova mensagem do seu anfitrião", cta: "Responder", ref: "Ref. reserva", service: "Serviço", property: "Imóvel" },
        };
        const eL = emailLabels[emailLang] || emailLabels.en;
        const appUrl = buildAppUrl("/");

        const detailRows = [
          bookingRef ? `<tr><td style="padding:10px 16px;color:#888;font-size:13px;border-bottom:1px solid #f0f0f0;">${eL.ref}</td><td style="padding:10px 16px;font-weight:600;font-size:13px;border-bottom:1px solid #f0f0f0;font-family:monospace;">${bookingRef}</td></tr>` : "",
          selectedThread.serviceTitle ? `<tr><td style="padding:10px 16px;color:#888;font-size:13px;border-bottom:1px solid #f0f0f0;">${eL.service}</td><td style="padding:10px 16px;font-size:13px;border-bottom:1px solid #f0f0f0;">${escapeEmailHtml(selectedThread.serviceTitle)}</td></tr>` : "",
          selectedThread.propertyLabel ? `<tr><td style="padding:10px 16px;color:#888;font-size:13px;border-bottom:1px solid #f0f0f0;">${eL.property}</td><td style="padding:10px 16px;font-size:13px;border-bottom:1px solid #f0f0f0;">${escapeEmailHtml(selectedThread.propertyLabel)}</td></tr>` : "",
        ].filter(Boolean).join("");

        try {
          const threadRef = selectedThread.bookingId?.slice(0, 8) || selectedThread.tenantId?.slice(0, 8) || "";
          const subjectWithRef = threadRef ? `${eL.title} [REF:${selectedThread.bookingId || selectedThread.tenantId}]` : eL.title;
          
          await supabase.functions.invoke("send-notification-email", {
            body: {
              event_type: "marketplace_notification",
              recipient_email: recipientEmail,
              recipient_name: selectedThread.name,
              data: {
                subject: subjectWithRef,
                message: escapeEmailHtml(translatedContent || content),
                service_title: selectedThread.serviceTitle || selectedThread.propertyLabel || "",
                booking_id: selectedThread.bookingId || "",
                cta_url: appUrl,
                cta_label: eL.cta,
                org_id: orgId,
              },
              locale: emailLang,
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

  /* ────── On-demand translation (Airbnb-style) ────── */
  const handleTranslateMessage = async (msg: Message) => {
    if (translatingMsgId) return;
    const isShowingOriginal = showOriginal[msg.id];

    // Toggle back to translated if already showing original
    if (isShowingOriginal) {
      setShowOriginal(prev => ({ ...prev, [msg.id]: false }));
      return;
    }

    // If message has no translated_content yet, request translation
    if (!msg.translated_content) {
      setTranslatingMsgId(msg.id);
      try {
        const senderLocale = msg.sender_locale || "en";
        const { data: transData } = await supabase.functions.invoke("translate-message", {
          body: { text: msg.content, from_locale: senderLocale, to_locale: locale },
        });
        if (transData?.translated) {
          // Update local state
          setMessages(prev => prev.map(m =>
            m.id === msg.id ? { ...m, translated_content: transData.translated } : m
          ));
          // Persist translation
          await supabase.from("messages").update({ translated_content: transData.translated }).eq("id", msg.id);
        }
      } catch (e) {
        console.error("Translation failed:", e);
        toast.error("Translation failed");
      }
      setTranslatingMsgId(null);
      return;
    }

    // Toggle to show original
    setShowOriginal(prev => ({ ...prev, [msg.id]: true }));
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

      // Notify client by email — professional template in customer language
      const email = normalizeEmail(selectedThread.email);
      if (email && isValidEmail(email)) {
        // Resolve client language from tenant preferred_locale or property country
        let clientLang = "en";
        if (selectedThread.tenantId) {
          const { data: tL } = await supabase.from("tenants").select("preferred_locale").eq("id", selectedThread.tenantId).maybeSingle();
          clientLang = tL?.preferred_locale || getCountryConfig(selectedThread.propertyCountry || "FR").locale.slice(0, 2);
        } else {
          clientLang = getCountryConfig(selectedThread.propertyCountry || "FR").locale.slice(0, 2);
        }
        const actionI18n: Record<string, Record<string, { subject: string; title: string; body: string; cta: string }>> = {
          confirm: {
            fr: { subject: "✅ Réservation confirmée", title: "✅ Votre réservation est confirmée", body: "Votre réservation a été confirmée. Nous avons hâte de vous accueillir !", cta: "Voir ma réservation" },
            en: { subject: "✅ Booking Confirmed", title: "✅ Your booking is confirmed", body: "Your booking has been confirmed. We look forward to welcoming you!", cta: "View my booking" },
            es: { subject: "✅ Reserva confirmada", title: "✅ Su reserva está confirmada", body: "Su reserva ha sido confirmada. ¡Le esperamos!", cta: "Ver mi reserva" },
            de: { subject: "✅ Buchung bestätigt", title: "✅ Ihre Buchung ist bestätigt", body: "Ihre Buchung wurde bestätigt. Wir freuen uns auf Sie!", cta: "Meine Buchung ansehen" },
            it: { subject: "✅ Prenotazione confermata", title: "✅ La tua prenotazione è confermata", body: "La tua prenotazione è stata confermata. Non vediamo l'ora di accoglierti!", cta: "Vedi la mia prenotazione" },
            pt: { subject: "✅ Reserva confirmada", title: "✅ Sua reserva está confirmada", body: "Sua reserva foi confirmada. Esperamos por você!", cta: "Ver minha reserva" },
          },
          cancel: {
            fr: { subject: "❌ Réservation annulée", title: "❌ Réservation annulée", body: "Votre réservation a été annulée. N'hésitez pas à nous contacter pour toute question.", cta: "Nous contacter" },
            en: { subject: "❌ Booking Cancelled", title: "❌ Booking Cancelled", body: "Your booking has been cancelled. Please contact us if you have any questions.", cta: "Contact us" },
            es: { subject: "❌ Reserva cancelada", title: "❌ Reserva cancelada", body: "Su reserva ha sido cancelada. No dude en contactarnos.", cta: "Contactar" },
            de: { subject: "❌ Buchung storniert", title: "❌ Buchung storniert", body: "Ihre Buchung wurde storniert. Kontaktieren Sie uns bei Fragen.", cta: "Kontakt" },
            it: { subject: "❌ Prenotazione cancellata", title: "❌ Prenotazione cancellata", body: "La tua prenotazione è stata cancellata. Contattaci per domande.", cta: "Contattaci" },
            pt: { subject: "❌ Reserva cancelada", title: "❌ Reserva cancelada", body: "Sua reserva foi cancelada. Entre em contato conosco.", cta: "Contato" },
          },
          complete: {
            fr: { subject: "🏁 Réservation terminée", title: "🏁 Réservation terminée", body: "Votre réservation est terminée. Merci de votre confiance !", cta: "Laisser un avis" },
            en: { subject: "🏁 Booking Completed", title: "🏁 Booking Completed", body: "Your booking is completed. Thank you for your trust!", cta: "Leave a review" },
            es: { subject: "🏁 Reserva completada", title: "🏁 Reserva completada", body: "Su reserva ha finalizado. ¡Gracias por su confianza!", cta: "Dejar una reseña" },
            de: { subject: "🏁 Buchung abgeschlossen", title: "🏁 Buchung abgeschlossen", body: "Ihre Buchung ist abgeschlossen. Vielen Dank für Ihr Vertrauen!", cta: "Bewertung abgeben" },
            it: { subject: "🏁 Prenotazione completata", title: "🏁 Prenotazione completata", body: "La tua prenotazione è completata. Grazie per la fiducia!", cta: "Lascia una recensione" },
            pt: { subject: "🏁 Reserva concluída", title: "🏁 Reserva concluída", body: "Sua reserva foi concluída. Obrigado pela confiança!", cta: "Deixar avaliação" },
          },
        };
        const aL = (actionI18n[action]?.[clientLang] || actionI18n[action]?.en)!;
        const bookingRef = bookingId.slice(0, 8);
        const subjectWithRef = `${aL.subject} [REF:${bookingId}]`;

        await supabase.functions.invoke("send-notification-email", {
          body: {
            event_type: selectedThread.bookingType === "seasonal"
              ? (action === "confirm" ? "seasonal_booking_confirmed" : action === "cancel" ? "seasonal_booking_cancelled" : "marketplace_booking_completed")
              : (action === "confirm" ? "marketplace_booking_confirmed" : action === "cancel" ? "marketplace_booking_cancelled" : "marketplace_booking_completed"),
            recipient_email: email,
            recipient_name: selectedThread.name,
            data: {
              subject: subjectWithRef,
              message: aL.body,
              service_title: selectedThread.serviceTitle || selectedThread.propertyLabel || "",
              booking_id: bookingRef,
              check_in: "",
              check_out: "",
              cta_url: buildAppUrl("/"),
              cta_label: aL.cta,
              org_id: orgId,
            },
            locale: clientLang,
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
        // Note: create-concierge-payment / create-booking-payment expect amount in decimal, NOT cents
        const { data, error } = await supabase.functions.invoke("create-concierge-payment", {
          body: {
            order_id: selectedThread.bookingId || selectedThread.id,
            service_id: selectedThread.contextId,
            amount,
            currency: selectedThread.currency || "eur",
            guest_email: selectedThread.email || "",
            guest_name: selectedThread.name || "",
            service_title: selectedThread.serviceTitle || paymentDescription || "",
            origin: window.location.origin,
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

      // Email client using premium template
      const email = normalizeEmail(selectedThread.email);
      if (email && isValidEmail(email)) {
        let clientLangPay = "en";
        if (selectedThread.tenantId) {
          const { data: tLP } = await supabase.from("tenants").select("preferred_locale").eq("id", selectedThread.tenantId).maybeSingle();
          clientLangPay = tLP?.preferred_locale || getCountryConfig(selectedThread.propertyCountry || "FR").locale.slice(0, 2);
        } else {
          clientLangPay = getCountryConfig(selectedThread.propertyCountry || "FR").locale.slice(0, 2);
        }
        const clientLang = clientLangPay;
        const threadRef = selectedThread.bookingId || selectedThread.id;
        
        await supabase.functions.invoke("send-notification-email", {
          body: {
            event_type: "payment_link_sent",
            recipient_email: email,
            recipient_name: selectedThread.name,
            data: {
              service_title: selectedThread.serviceTitle || selectedThread.propertyLabel || "",
              message: `${amount.toFixed(2)} ${(selectedThread.currency || "EUR").toUpperCase()}${paymentDescription ? ` — ${paymentDescription}` : ""}`,
              booking_id: selectedThread.bookingId || "",
              cta_url: paymentUrl || buildAppUrl("/"),
              cta_label: clientLang === "fr" ? "Payer maintenant" : clientLang === "es" ? "Pagar ahora" : clientLang === "de" ? "Jetzt bezahlen" : "Pay Now",
              org_id: orgId,
            },
            locale: clientLang,
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

  /* ────── Property list for filter ────── */
  const propertyOptions = useMemo(() => {
    const props = new Map<string, string>();
    threads.forEach(t => {
      if (t.propertyId && t.propertyLabel) props.set(t.propertyId, t.propertyLabel);
    });
    return Array.from(props.entries()).map(([id, label]) => ({ id, label }));
  }, [threads]);

  /* ────── Filters ────── */
  const filteredThreads = useMemo(() =>
    threads
      .filter(t => filterType === "all" || t.type === filterType || t.bookingType === filterType || (filterType === "lead" && t.type === "lead"))
      .filter(t => filterProperty === "all" || t.propertyId === filterProperty)
      .filter(t => !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.propertyLabel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.serviceTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.listingTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.bookingId?.includes(searchQuery) ||
        t.leadId?.includes(searchQuery)
      ),
    [threads, filterType, filterProperty, searchQuery]
  );

  const getCategoryIcon = (cat: string) => MESSAGE_CATEGORIES.find(c => c.value === cat)?.icon || "💬";

  const getBookingTypeBadge = (thread: ConversationThread) => {
    const cfg: Record<string, { emoji: string; label: string; cls: string }> = {
      marketplace: { emoji: "🛍️", label: "Marketplace", cls: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
      concierge: { emoji: "🎯", label: "Concierge", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
      seasonal: { emoji: "🏖️", label: "Seasonal", cls: "bg-sky-500/10 text-sky-600 border-sky-500/20" },
    };
    if (thread.type === "lead") return <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">🏡 Real Estate</Badge>;
    const c = cfg[thread.bookingType || ""];
    return c ? <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${c.cls}`}>{c.emoji} {c.label}</Badge> : null;
  };

  const getStatusBadge = (status?: string) => {
    const colors: Record<string, string> = {
      pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      confirmed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      completed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      cancelled: "bg-destructive/10 text-destructive border-destructive/20",
      awaiting_payment: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      new: "bg-primary/10 text-primary border-primary/20",
    };
    const labels: Record<string, string> = {
      pending: "⏳ Pending", confirmed: "✅ Confirmed", completed: "🏁 Completed",
      cancelled: "❌ Cancelled", awaiting_payment: "💰 Awaiting Payment", paid: "💚 Paid", new: "🆕 New",
    };
    return status ? (
      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${colors[status] || "bg-muted text-muted-foreground"}`}>
        {labels[status] || status}
      </Badge>
    ) : null;
  };

  const getPillarColor = (thread: ConversationThread) => {
    if (thread.type === "tenant") return { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" };
    if (thread.type === "lead") return { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/20" };
    switch (thread.bookingType) {
      case "marketplace": return { bg: "bg-violet-500/10", text: "text-violet-600", border: "border-violet-500/20" };
      case "concierge": return { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-500/20" };
      case "seasonal": return { bg: "bg-sky-500/10", text: "text-sky-600", border: "border-sky-500/20" };
      default: return { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };
    }
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100dvh-8rem)] sm:h-[calc(100vh-8rem)] flex flex-col overflow-hidden">
        {/* ═══ Header bar — clean & compact ═══ */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-3 px-1">
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-foreground flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center shrink-0">
                <MessageCircle className="h-4 w-4 text-accent-foreground" />
              </div>
              <span className="truncate">{t("page.communication.title") || "Communication"}</span>
            </h1>
          </div>
          <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto scrollbar-hide">
            {[
              { icon: MessageCircle, value: stats.unread, color: "text-accent", bg: "bg-accent/8" },
              { icon: FileText, value: stats.pending_docs, color: "text-blue-500", bg: "bg-blue-500/8" },
              { icon: CreditCard, value: stats.overdue, color: "text-destructive", bg: "bg-destructive/8" },
              { icon: Wrench, value: stats.maintenance, color: "text-amber-500", bg: "bg-amber-500/8" },
            ].filter(s => s.value > 0).map((s, i) => (
              <div
                key={i}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 ${s.bg} rounded-lg text-xs`}
              >
                <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                <span className="font-bold text-foreground tabular-nums">{s.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="flex-1 flex gap-0 min-h-0 bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
          {/* ────── Thread list ────── */}
          <div className={`w-full md:w-80 lg:w-96 border-e border-border/50 flex flex-col comm-thread-list ${selectedThread ? "hidden md:flex" : "flex"}`}>
            <div className="p-2.5 sm:p-3 border-b border-border/50 space-y-2">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t("page.communication.search") || "Search conversations..."} className="ps-9 h-9 text-sm" />
              </div>
              <div className="flex gap-1 flex-wrap">
                {[
                  { value: "all", label: t("page.communication.filter_all") || "All", count: threads.length },
                  { value: "tenant", label: "🏠 " + (t("page.communication.filter_longterm") || "Long-term"), count: threads.filter(t => t.type === "tenant").length },
                  { value: "lead", label: "🏡 " + (t("page.communication.filter_leads") || "Leads"), count: threads.filter(t => t.type === "lead").length },
                  { value: "seasonal", label: "🏖️ " + (t("page.communication.filter_seasonal") || "Seasonal"), count: threads.filter(t => t.bookingType === "seasonal").length },
                  { value: "marketplace", label: "🛍️ " + (t("page.communication.filter_market") || "Market"), count: threads.filter(t => t.bookingType === "marketplace").length },
                  { value: "concierge", label: "🎯 " + (t("page.communication.filter_concierge") || "Concierge"), count: threads.filter(t => t.bookingType === "concierge").length },
                ].map(f => (
                  <Button
                    key={f.value}
                    size="sm"
                    variant={filterType === f.value ? "default" : "ghost"}
                    onClick={() => setFilterType(f.value)}
                    className={`text-xs h-7 px-2 gap-1 ${filterType === f.value ? "" : "text-muted-foreground"}`}
                  >
                    {f.label}
                    {f.count > 0 && <span className="text-[9px] opacity-60">{f.count}</span>}
                  </Button>
                ))}
              </div>
              {propertyOptions.length > 1 && (
                <Select value={filterProperty} onValueChange={setFilterProperty}>
                  <SelectTrigger className="h-8 text-xs">
                    <MapPin className="h-3 w-3 me-1 text-muted-foreground" />
                    <span className="truncate">{filterProperty === "all" ? (t("page.communication.all_properties") || "All properties") : propertyOptions.find(p => p.id === filterProperty)?.label || "Property"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("page.communication.all_properties") || "All properties"}</SelectItem>
                    {propertyOptions.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-accent" />
                  <p className="text-xs text-muted-foreground mt-2">Loading conversations…</p>
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">No conversations</p>
                  <p className="text-xs text-muted-foreground mt-1">Messages will appear here when clients interact.</p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {filteredThreads.map((thread, i) => {
                    const pillar = getPillarColor(thread);
                    const isActive = selectedThread?.id === thread.id;
                    const hasBooking = thread.type === "booking";
                    const ref = thread.bookingId?.slice(0, 8) || thread.leadId?.slice(0, 8) || "";

                    return (
                      <motion.button
                        key={thread.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        onClick={() => setSelectedThread(thread)}
                        className={`w-full text-left rounded-xl border transition-all min-h-[88px] ${
                          isActive
                            ? `${pillar.border} ${pillar.bg} border-2 shadow-md`
                            : "border-border/30 hover:border-border/60 hover:bg-muted/30"
                        }`}
                      >
                        {/* Ticket header strip */}
                        <div className={`flex items-center justify-between px-3 py-1.5 rounded-t-xl border-b ${
                          isActive ? `${pillar.bg} ${pillar.border}` : "bg-muted/20 border-border/10"
                        }`}>
                          <div className="flex items-center gap-1.5">
                            {getBookingTypeBadge(thread)}
                            {thread.propertyCountry && <span className="text-[11px]">{getCountryEntryOrDefault(thread.propertyCountry).flag}</span>}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {ref && <span className="text-[9px] font-mono text-muted-foreground opacity-60">#{ref}</span>}
                            {thread.unreadCount > 0 && (
                              <span className="bg-accent text-accent-foreground text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1 shadow-sm">
                                {thread.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Ticket body */}
                        <div className="px-3 py-2.5">
                          <div className="flex items-start gap-2.5">
                            <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${pillar.bg}`}>
                              {thread.type === "booking" ? (
                                <Hash className={`h-3.5 w-3.5 ${pillar.text}`} />
                              ) : thread.type === "lead" ? (
                                <Building className={`h-3.5 w-3.5 ${pillar.text}`} />
                              ) : (
                                <User className={`h-3.5 w-3.5 ${pillar.text}`} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <p className={`text-sm truncate ${thread.unreadCount > 0 ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
                                  {thread.name}
                                </p>
                                {thread.lastMessageTime && (
                                  <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                                    {formatDistanceToNow(new Date(thread.lastMessageTime), { addSuffix: false, locale: fr })}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                {thread.serviceTitle || thread.listingTitle || thread.propertyLabel || thread.email || "—"}
                              </p>
                            </div>
                          </div>

                          {/* Ticket footer — status + price */}
                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/10">
                            <div className="flex items-center gap-1.5">
                              {thread.bookingStatus && getStatusBadge(thread.bookingStatus)}
                            </div>
                            {thread.totalPrice != null && thread.totalPrice > 0 && (
                              <span className="text-xs font-bold text-foreground tabular-nums">
                                {thread.totalPrice.toFixed(0)} {(thread.currency || "€").toUpperCase()}
                              </span>
                            )}
                          </div>

                          {/* Last message preview */}
                          {thread.lastMessage && (
                            <p className={`text-[11px] truncate mt-1 ${thread.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground/60"}`}>
                              {thread.lastMessage.slice(0, 60)}
                            </p>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* ────── Chat area ────── */}
          <div className={`flex-1 flex flex-col ${!selectedThread ? "hidden md:flex" : "flex"}`}>
            {selectedThread ? (
              <>
                {/* Chat header — dynamic booking context */}
                <div className="p-3 border-b border-border/50">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedThread(null)} className="md:hidden shrink-0 h-9 w-9">
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      {(() => {
                        const p = getPillarColor(selectedThread);
                        return (
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${p.bg}`}>
                            {selectedThread.type === "booking" ? <Hash className={`h-4 w-4 ${p.text}`} /> : selectedThread.type === "lead" ? <Building className={`h-4 w-4 ${p.text}`} /> : <User className={`h-4 w-4 ${p.text}`} />}
                          </div>
                        );
                      })()}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-foreground truncate">{selectedThread.name}</p>
                          {selectedThread.propertyCountry && <span className="text-sm shrink-0">{getCountryEntryOrDefault(selectedThread.propertyCountry).flag}</span>}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {(selectedThread.type === "booking" || selectedThread.type === "lead") && getBookingTypeBadge(selectedThread)}
                          {selectedThread.bookingStatus && getStatusBadge(selectedThread.bookingStatus)}
                          {selectedThread.totalPrice != null && selectedThread.totalPrice > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold tabular-nums">
                              {selectedThread.totalPrice.toFixed(2)} {(selectedThread.currency || "EUR").toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {selectedThread.serviceTitle || selectedThread.listingTitle || selectedThread.propertyLabel || selectedThread.email || ""}
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
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowContext(!showContext)}>
                        <ChevronRight className={`h-4 w-4 transition-transform ${showContext ? "rotate-180" : ""}`} />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex min-h-0">
                  {/* Messages */}
                  <div className="flex-1 flex flex-col min-h-0">
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-muted/5 to-transparent">
                      {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                              <MessageCircle className="h-6 w-6 text-muted-foreground/30" />
                            </div>
                            <p className="text-muted-foreground text-sm font-medium">Aucun message</p>
                            <p className="text-muted-foreground/60 text-xs mt-1">Commencez la conversation ci-dessous</p>
                          </div>
                        </div>
                      ) : (
                        messages.map(msg => {
                          const isMe = msg.sender_id === user?.id;
                          const isSystem = msg.message_type === "system" || msg.sender_id === SYSTEM_SENDER_ID;
                          const isInboundEmail = msg.message_type === "inbound_email";

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
                                    {msg.language_detected && (
                                      <span className="opacity-60">• {msg.language_detected.toUpperCase()}</span>
                                    )}
                                  </span>
                                )}
                                {msg.category !== "general" && !isInboundEmail && (
                                  <span className="text-[10px] opacity-70 mb-0.5 block">{getCategoryIcon(msg.category)}</span>
                                )}
                                <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">
                                  {isMe
                                    ? msg.content
                                    : showOriginal[msg.id]
                                      ? msg.content
                                      : (msg.translated_content || msg.content)
                                  }
                                </p>
                                {/* Show original below translation when not toggled */}
                                {!isMe && msg.translated_content && !showOriginal[msg.id] && (
                                  <p className="text-xs mt-1.5 pt-1.5 border-t border-current/10 opacity-50 italic whitespace-pre-wrap break-words">
                                    {msg.content.length > 120 ? msg.content.slice(0, 120) + "…" : msg.content}
                                  </p>
                                )}
                                {/* Airbnb-style translation toggle */}
                                {!isMe && msg.sender_locale && msg.sender_locale !== locale && (
                                  <button
                                    onClick={() => handleTranslateMessage(msg)}
                                    className={`mt-1 inline-flex items-center gap-1 text-[10px] transition-colors ${
                                      isPayment ? "text-accent/70 hover:text-accent" : "text-muted-foreground/60 hover:text-muted-foreground"
                                    }`}
                                  >
                                    {translatingMsgId === msg.id ? (
                                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                    ) : (
                                      <Globe className="h-2.5 w-2.5" />
                                    )}
                                    {showOriginal[msg.id]
                                      ? "Show translation"
                                      : msg.translated_content
                                        ? "Show original"
                                        : "Translate"
                                    }
                                  </button>
                                )}
                                {/* Also show toggle for owner's own messages that have translations */}
                                {isMe && msg.translated_content && (
                                  <button
                                    onClick={() => setShowOriginal(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                                    className="mt-1 inline-flex items-center gap-1 text-[10px] text-primary-foreground/50 hover:text-primary-foreground/80 transition-colors"
                                  >
                                    <Globe className="h-2.5 w-2.5" />
                                    {showOriginal[msg.id] ? "Your message" : `Sent as: ${msg.translated_content.slice(0, 30)}…`}
                                  </button>
                                )}
                                {linkMatch && (
                                  <a href={linkMatch[1]} target="_blank" rel="noopener noreferrer"
                                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-accent underline">
                                    <ExternalLink className="h-3 w-3" /> Open payment link
                                  </a>
                                )}
                                {msg.attachment_url && (
                                  <ChatMediaPreview url={msg.attachment_url} fileName={msg.content?.replace(/^📎 |^📷 /, "")} isMe={isMe} />
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

                    {/* ═══ Quick action bar — booking lifecycle ═══ */}
                    {(selectedThread.type === "booking" || selectedThread.type === "lead") && (
                      <div className="px-3 py-2.5 border-t border-border/30 bg-gradient-to-r from-muted/30 to-transparent">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">Actions</span>
                          <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5 rounded-lg" onClick={() => setPaymentLinkDialog(true)}>
                            <CreditCard className="h-3.5 w-3.5" /> Payment Link
                          </Button>
                          {selectedThread.bookingStatus === "pending" && (
                            <Button size="sm" className="text-xs h-8 gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" onClick={() => handleBookingAction("confirm")}>
                              <CalendarCheck className="h-3.5 w-3.5" /> Confirm
                            </Button>
                          )}
                          {selectedThread.bookingStatus === "confirmed" && (
                            <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5 rounded-lg border-blue-500/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30" onClick={() => handleBookingAction("complete")}>
                              <CalendarCheck className="h-3.5 w-3.5" /> Complete
                            </Button>
                          )}
                          {!["cancelled", "completed"].includes(selectedThread.bookingStatus || "") && (
                            <Button size="sm" variant="ghost" className="text-xs h-8 gap-1.5 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => handleBookingAction("cancel")}>
                              <Ban className="h-3.5 w-3.5" /> Cancel
                            </Button>
                          )}
                          {selectedThread.email && (
                            <Button size="sm" variant="ghost" className="text-xs h-8 gap-1.5 rounded-lg ml-auto" asChild>
                              <a href={`mailto:${selectedThread.email}`}><Mail className="h-3.5 w-3.5" /> Email</a>
                            </Button>
                          )}
                          {selectedThread.phone && (
                            <Button size="sm" variant="ghost" className="text-xs h-8 gap-1.5 rounded-lg" asChild>
                              <a href={`tel:${selectedThread.phone}`}><Phone className="h-3.5 w-3.5" /> Call</a>
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Input — mobile-optimized */}
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

                  {/* ────── Context panel with Activity Log ────── */}
                  {showContext && (
                    <div className="w-72 border-l border-border/50 flex flex-col overflow-hidden hidden lg:flex bg-muted/5">
                      <div className="p-4 space-y-4 overflow-y-auto flex-shrink-0">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-accent" /> Détails
                        </h3>

                        {/* Contact info */}
                        <div className="space-y-2">
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
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-foreground">Booking</h4>
                            <div className="flex items-center gap-2">
                              {getBookingTypeBadge(selectedThread)}
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
                        <div className="pt-3 border-t border-border/30 space-y-1.5">
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

                      {/* Activity Timeline */}
                      <div className="flex-1 border-t border-border/30 flex flex-col min-h-0">
                        <div className="px-4 py-2.5 flex items-center gap-1.5">
                          <History className="h-3.5 w-3.5 text-muted-foreground" />
                          <h4 className="text-xs font-semibold text-foreground">Activity Timeline</h4>
                        </div>
                        <div className="flex-1 px-4 pb-4 min-h-0 overflow-hidden">
                          {orgId && (
                            <EntityActivityLog
                              entityType={
                                selectedThread.type === "tenant" ? "tenant" :
                                selectedThread.propertyId ? "property" :
                                "booking"
                              }
                              entityId={
                                selectedThread.type === "tenant" ? (selectedThread.tenantId || selectedThread.contextId) :
                                selectedThread.propertyId ? selectedThread.propertyId :
                                (selectedThread.bookingId || selectedThread.contextId)
                              }
                              orgId={orgId}
                              maxItems={30}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md px-4">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent/20 via-accent/10 to-transparent flex items-center justify-center mx-auto mb-6 ring-1 ring-accent/10">
                    <MessageCircle className="h-9 w-9 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Sélectionnez une conversation</h3>
                  <p className="text-sm text-muted-foreground mb-8">
                    Toutes vos conversations centralisées — locataires, voyageurs, clients et prospects.
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-left">
                    {[
                      { emoji: "🏠", label: "Long-term", desc: "Bailleur ↔ Locataire", color: "from-primary/10 to-primary/5 border-primary/15" },
                      { emoji: "🏖️", label: "Seasonal", desc: "Hôte ↔ Voyageur", color: "from-sky-500/10 to-sky-500/5 border-sky-500/15" },
                      { emoji: "🛍️", label: "Marketplace", desc: "Prestataire ↔ Client", color: "from-violet-500/10 to-violet-500/5 border-violet-500/15" },
                      { emoji: "🏡", label: "Real Estate", desc: "Agent ↔ Prospect", color: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/15" },
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
