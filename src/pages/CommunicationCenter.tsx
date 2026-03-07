import { useState, useEffect, useRef, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  MessageCircle, Send, ArrowLeft, User, Filter, Search, Paperclip,
  Building, Globe, Clock, CheckCheck, Check, AlertTriangle, FileText,
  CreditCard, Wrench, Archive, Loader2, X, Upload,
} from "lucide-react";
import AIGenerateButton from "@/components/ai/AIGenerateButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, formatDistanceToNow } from "date-fns";
import { fr, enUS, es, de, it, pt } from "date-fns/locale";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { getCountryConfig } from "@/lib/country-config";
import { getCountryEntryOrDefault } from "@/lib/global-country-registry";
import { buildAppUrl } from "@/lib/app-domain";
import { motion, AnimatePresence } from "framer-motion";

const SYSTEM_SENDER_ID = "00000000-0000-0000-0000-000000000000";

interface Tenant {
  id: string;
  name: string;
  email: string | null;
  tenant_user_id?: string | null;
  property_id?: string | null;
  property_label?: string;
  property_country?: string;
  lease_type?: string;
}

interface Message {
  id: string;
  sender_id: string;
  tenant_id: string;
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
}

const MESSAGE_CATEGORIES = [
  { value: "general", label: "💬 Général", icon: "💬" },
  { value: "payment", label: "💰 Paiement", icon: "💰" },
  { value: "lease", label: "📝 Bail", icon: "📝" },
  { value: "inspection", label: "📋 Inspection", icon: "📋" },
  { value: "maintenance", label: "🔧 Maintenance", icon: "🔧" },
  { value: "legal", label: "⚖️ Juridique", icon: "⚖️" },
];

const CONV_STATUSES = [
  { value: "active", label: "Actif", icon: "🟢" },
  { value: "waiting_tenant", label: "Attente locataire", icon: "🟡" },
  { value: "waiting_landlord", label: "Attente bailleur", icon: "🟠" },
  { value: "waiting_payment", label: "Attente paiement", icon: "💰" },
  { value: "waiting_signature", label: "Attente signature", icon: "📝" },
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

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [lastMessages, setLastMessages] = useState<Record<string, { content: string; time: string }>>({});
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [convStatus, setConvStatus] = useState("active");
  const [uploading, setUploading] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats
  const [stats, setStats] = useState({ unread: 0, pending_docs: 0, overdue: 0, maintenance: 0 });

  const loadTenants = useCallback(async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from("tenants")
      .select("id, name, email, tenant_user_id, property_id, lease_type")
      .eq("org_id", orgId)
      .order("name");

    if (data) {
      const propertyIds = data.filter(t => t.property_id).map(t => t.property_id!);
      let propertyMap: Record<string, { label: string; country: string }> = {};
      if (propertyIds.length > 0) {
        const { data: props } = await supabase
          .from("properties")
          .select("id, label, country")
          .in("id", propertyIds);
        if (props) {
          propertyMap = Object.fromEntries(props.map(p => [p.id, { label: p.label, country: p.country || "FR" }]));
        }
      }
      const mapped = data.map(t => ({
        ...t,
        property_label: t.property_id ? propertyMap[t.property_id]?.label : undefined,
        property_country: t.property_id ? propertyMap[t.property_id]?.country : undefined,
      }));
      setTenants(mapped);

      // Load last message per tenant
      const { data: allMsgs } = await supabase
        .from("messages")
        .select("tenant_id, content, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });
      if (allMsgs) {
        const lm: Record<string, { content: string; time: string }> = {};
        allMsgs.forEach(m => {
          if (!lm[m.tenant_id]) lm[m.tenant_id] = { content: m.content, time: m.created_at };
        });
        setLastMessages(lm);
      }
    }
    setLoading(false);
  }, [orgId]);

  const loadUnreadCounts = useCallback(async () => {
    if (!orgId || !user) return;
    const { data } = await supabase
      .from("messages")
      .select("tenant_id")
      .eq("org_id", orgId)
      .eq("read", false)
      .neq("sender_id", user.id);
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach(m => { counts[m.tenant_id] = (counts[m.tenant_id] || 0) + 1; });
      setUnreadCounts(counts);
      setStats(s => ({ ...s, unread: data.length }));
    }
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
    if (!orgId || !selectedTenant) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("org_id", orgId)
      .eq("tenant_id", selectedTenant.id)
      .order("created_at", { ascending: true });
    if (data) {
      setMessages(data as Message[]);
      // Get conversation status from last message
      const lastMsg = data[data.length - 1] as any;
      if (lastMsg?.conversation_status) setConvStatus(lastMsg.conversation_status);

      const unreadIds = data.filter(m => !m.read && m.sender_id !== user?.id).map(m => m.id);
      if (unreadIds.length > 0) {
        await supabase.from("messages").update({ read: true }).in("id", unreadIds);
        loadUnreadCounts();
      }
    }
  }, [orgId, selectedTenant, user, loadUnreadCounts]);

  useEffect(() => { loadTenants(); loadUnreadCounts(); loadStats(); }, [loadTenants, loadUnreadCounts, loadStats]);
  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Real-time
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel("comm-center-rt")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages", filter: `org_id=eq.${orgId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        if (selectedTenant && newMsg.tenant_id === selectedTenant.id) {
          setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
          if (newMsg.sender_id !== user?.id) {
            supabase.from("messages").update({ read: true }).eq("id", newMsg.id).then(() => loadUnreadCounts());
          }
        } else {
          loadUnreadCounts();
        }
        // Update last messages
        setLastMessages(prev => ({
          ...prev,
          [newMsg.tenant_id]: { content: newMsg.content, time: newMsg.created_at },
        }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, selectedTenant, user, loadUnreadCounts]);

  // Typing indicator simulation via channel presence
  useEffect(() => {
    if (!selectedTenant || !orgId) return;
    const channel = supabase.channel(`typing-${selectedTenant.id}`);
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
  }, [selectedTenant, orgId, user?.id]);

  const handleFileUpload = async (file: File) => {
    if (!orgId || !selectedTenant || !user) return;
    setUploading(true);
    try {
      const path = `${orgId}/messages/${selectedTenant.id}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("rental-docs").upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: signedData } = await supabase.storage.from("rental-docs").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signedData?.signedUrl || path;

      await supabase.from("messages").insert({
        org_id: orgId,
        sender_id: user.id,
        tenant_id: selectedTenant.id,
        content: `📎 ${file.name}`,
        category: "general",
        attachment_url: url,
        message_type: "user",
        sender_locale: locale,
      });

      toast.success("Fichier envoyé");
    } catch (e: any) {
      toast.error("Erreur d'envoi: " + e.message);
    }
    setUploading(false);
  };

  const updateConversationStatus = async (status: string) => {
    if (!selectedTenant || !orgId || !user) return;
    setConvStatus(status);
    // Update the last message with the new status
    const lastMsg = messages[messages.length - 1];
    if (lastMsg) {
      await supabase.from("messages").update({ conversation_status: status } as any).eq("id", lastMsg.id);
    }
    toast.success(`Statut: ${CONV_STATUSES.find(s => s.value === status)?.label}`);
  };

  const translateAndSend = async (content: string, category: string) => {
    if (!selectedTenant || !orgId || !user) return;
    setSending(true);
    try {
      const propCountry = selectedTenant.property_country || "FR";
      const tenantLocale = getCountryConfig(propCountry).locale.slice(0, 2);
      const senderLocale = locale;

      let translatedContent: string | null = null;
      if (senderLocale !== tenantLocale) {
        try {
          const { data: transData } = await supabase.functions.invoke("translate-message", {
            body: { text: content, from_locale: senderLocale, to_locale: tenantLocale },
          });
          if (transData?.translated) translatedContent = transData.translated;
        } catch (e) {
          console.error("Translation failed:", e);
        }
      }

      const { error } = await supabase.from("messages").insert({
        org_id: orgId,
        sender_id: user.id,
        tenant_id: selectedTenant.id,
        content,
        translated_content: translatedContent,
        category,
        sender_locale: senderLocale,
        read: false,
        message_type: "user",
        property_id: selectedTenant.property_id || null,
        conversation_status: "waiting_tenant",
      } as any);

      if (error) { toast.error("Erreur d'envoi"); return; }
      setNewMessage("");
      setConvStatus("waiting_tenant");

      // Audit
      await supabase.from("audit_logs").insert({
        user_id: user.id, org_id: orgId, action: "message_sent",
        metadata_json: { tenant_id: selectedTenant.id, category },
      });

      // Notification + email
      if (selectedTenant.tenant_user_id) {
        const L = getCountryConfig(propCountry).labels;
        await supabase.from("notifications").insert({
          user_id: selectedTenant.tenant_user_id, org_id: orgId, type: "message",
          title: L.notifNewMsgLandlord, message: L.notifLandlordSentMsg, link: "/tenant/messages",
        });
      }
      const tenantEmail = normalizeEmail(selectedTenant.email);
      if (tenantEmail && isValidEmail(tenantEmail)) {
        const L = getCountryConfig(propCountry).labels;
        const appUrl = buildAppUrl("/");
        try {
          await supabase.functions.invoke("send-email", {
            body: {
              to: tenantEmail,
              subject: L.emailNewMsgSubjectFromLandlord,
              html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
                <h2 style="color:#1a1a1a;text-align:center;">📩 ${escapeEmailHtml(L.emailNewMsgFromLandlord)}</h2>
                <p style="color:#555;font-size:15px;">${escapeEmailHtml(L.emailYouReceivedMsg)}</p>
                <div style="background:#f5f5f5;border-left:4px solid #d4a853;border-radius:8px;padding:16px;margin:16px 0;">
                  <p style="color:#1a1a1a;white-space:pre-wrap;margin:0;font-size:15px;">${escapeEmailHtml(translatedContent || content)}</p>
                </div>
                <div style="text-align:center;margin:24px 0;">
                  <a href="${appUrl}/tenant/messages" style="display:inline-block;background:#d4a853;color:#1a1a1a;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;">${escapeEmailHtml(L.emailReplyInApp)}</a>
                </div>
                <p style="color:#888;font-size:12px;text-align:center;">${escapeEmailHtml(L.emailAutoSent)}</p>
              </div>`,
            },
          });
        } catch (e) { console.error("Email failed:", e); }
      }
    } finally { setSending(false); }
  };

  const handleSend = () => {
    if (!newMessage.trim()) return;
    translateAndSend(newMessage.trim(), selectedCategory);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Filters
  const filteredTenants = tenants
    .filter(t => filterCountry === "all" || t.property_country === filterCountry)
    .filter(t => !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.property_label?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      // Sort by unread first, then by last message time
      const aUnread = unreadCounts[a.id] || 0;
      const bUnread = unreadCounts[b.id] || 0;
      if (aUnread !== bUnread) return bUnread - aUnread;
      const aTime = lastMessages[a.id]?.time || "";
      const bTime = lastMessages[b.id]?.time || "";
      return bTime.localeCompare(aTime);
    });

  const filteredMessages = filterCategory === "all"
    ? messages : messages.filter(m => m.category === filterCategory);

  const getCategoryIcon = (cat: string) => MESSAGE_CATEGORIES.find(c => c.value === cat)?.icon || "💬";
  const countries = [...new Set(tenants.map(t => t.property_country).filter(Boolean))];

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Stats bar */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground">Centre de communication</h1>
            <p className="text-sm text-muted-foreground">Hub centralisé de messagerie et alertes</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { icon: MessageCircle, label: "Non lus", value: stats.unread, color: "text-primary" },
              { icon: FileText, label: "Docs", value: stats.pending_docs, color: "text-info" },
              { icon: CreditCard, label: "Impayés", value: stats.overdue, color: "text-destructive" },
              { icon: Wrench, label: "Maintenance", value: stats.maintenance, color: "text-warning" },
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
          {/* Conversation list */}
          <div className={`w-full md:w-80 lg:w-96 border-r border-border/50 flex flex-col ${selectedTenant ? "hidden md:flex" : "flex"}`}>
            {/* Search and filters */}
            <div className="p-3 border-b border-border/50 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un locataire..."
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Select value={filterCountry} onValueChange={setFilterCountry}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <Globe className="h-3 w-3 mr-1" />
                    <SelectValue placeholder="Pays" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les pays</SelectItem>
                    {countries.map(c => {
                      const entry = getCountryEntryOrDefault(c!);
                      return <SelectItem key={c} value={c!}>{entry.flag} {entry.name}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <Filter className="h-3 w-3 mr-1" />
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {CONV_STATUSES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-4 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
              ) : filteredTenants.length === 0 ? (
                <div className="p-6 text-center">
                  <User className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">Aucun locataire trouvé</p>
                </div>
              ) : (
                filteredTenants.map(tenant => {
                  const unread = unreadCounts[tenant.id] || 0;
                  const last = lastMessages[tenant.id];
                  const countryEntry = tenant.property_country ? getCountryEntryOrDefault(tenant.property_country) : null;
                  return (
                    <button
                      key={tenant.id}
                      onClick={() => setSelectedTenant(tenant)}
                      className={`w-full text-left p-3 hover:bg-muted/50 transition-colors border-b border-border/20 ${
                        selectedTenant?.id === tenant.id ? "bg-muted/70" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          {unread > 0 && (
                            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                              {unread}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm truncate ${unread > 0 ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
                              {tenant.name}
                            </p>
                            {last && (
                              <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                                {formatDistanceToNow(new Date(last.time), { addSuffix: false, locale: fr })}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {countryEntry && <span className="text-xs">{countryEntry.flag}</span>}
                            <p className="text-xs text-muted-foreground truncate">
                              {tenant.property_label || "—"}
                            </p>
                          </div>
                          {last && (
                            <p className={`text-xs truncate mt-0.5 ${unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                              {last.content.slice(0, 60)}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </ScrollArea>
          </div>

          {/* Chat area */}
          <div className={`flex-1 flex flex-col ${!selectedTenant ? "hidden md:flex" : "flex"}`}>
            {selectedTenant ? (
              <>
                {/* Chat header */}
                <div className="p-3 border-b border-border/50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedTenant(null)} className="md:hidden shrink-0">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{selectedTenant.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {selectedTenant.property_country && (
                          <span>{getCountryEntryOrDefault(selectedTenant.property_country).flag}</span>
                        )}
                        <span className="truncate">{selectedTenant.property_label}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Conversation status */}
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
                    {/* Category filter */}
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="h-8 w-auto text-xs">
                        <Filter className="h-3 w-3 mr-1" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        {MESSAGE_CATEGORIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {filteredMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <MessageCircle className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">Aucun message</p>
                      </div>
                    </div>
                  ) : (
                    filteredMessages.map(msg => {
                      const isMe = msg.sender_id === user?.id;
                      const isSystem = msg.message_type === "system" || msg.sender_id === SYSTEM_SENDER_ID;
                      
                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center">
                            <div className="bg-muted/50 text-muted-foreground text-xs px-4 py-2 rounded-full max-w-[80%] text-center">
                              {msg.content}
                              <span className="ml-2 opacity-60">
                                {format(new Date(msg.created_at), "dd/MM HH:mm")}
                              </span>
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
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                            isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"
                          }`}>
                            {msg.category !== "general" && (
                              <span className="text-[10px] opacity-70 mb-0.5 block">{getCategoryIcon(msg.category)}</span>
                            )}
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {isMe ? msg.content : (msg.translated_content || msg.content)}
                            </p>
                            {msg.attachment_url && (
                              <a
                                href={msg.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-1.5 mt-2 text-xs underline ${
                                  isMe ? "text-primary-foreground/80" : "text-accent"
                                }`}
                              >
                                <Paperclip className="h-3 w-3" />
                                Pièce jointe
                              </a>
                            )}
                            <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : ""}`}>
                              <p className={`text-[10px] ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
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
                          <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

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
                  <div className="flex-1 relative">
                    <Input
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Écrire un message..."
                      className="pr-10 h-10"
                    />
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-10 w-10"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  </Button>
                  <AIGenerateButton
                    task="guest_reply"
                    taskContext={newMessage || "message du locataire"}
                    onApply={(text) => setNewMessage(text)}
                    label="IA"
                    variant="icon"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={sending || !newMessage.trim()}
                    className="shrink-0 h-10"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-sm">
                  <MessageCircle className="h-16 w-16 text-muted-foreground/15 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Centre de communication</h3>
                  <p className="text-sm text-muted-foreground">
                    Sélectionnez une conversation pour commencer. Tous les messages, documents et alertes sont centralisés ici.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CommunicationCenter;
