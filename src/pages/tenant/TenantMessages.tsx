import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Send, Loader2, Paperclip, Check, CheckCheck, Upload, Languages, Phone, Video, Shield, ArrowLeft } from "lucide-react";
import TenantLayout from "@/components/tenant/TenantLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCall } from "@/components/call/CallProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow } from "date-fns";
import { fr, enUS, es, de, it, pt } from "@/lib/date-locales";
import type { Locale as DateFnsLocale } from "date-fns";
import { getCountryConfig } from "@/lib/country-config";
import { useTenantProperty } from "@/hooks/useTenantProperty";
import { buildAppUrl } from "@/lib/app-domain";
import { motion } from "framer-motion";
import { toast as sonnerToast } from "sonner";

const SYSTEM_SENDER_ID = "00000000-0000-0000-0000-000000000000";

const escapeEmailHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
const normalizeEmail = (email: string | null | undefined) => (email || "").trim().toLowerCase();
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const DATE_LOCALES: Record<string, DateFnsLocale> = { fr, en: enUS, es, de, it, pt };

const MESSAGE_CATEGORIES = [
  { value: "general", label: "💬", fullLabel: "💬 Général" },
  { value: "payment", label: "💰", fullLabel: "💰 Paiement" },
  { value: "lease", label: "📝", fullLabel: "📝 Bail" },
  { value: "inspection", label: "📋", fullLabel: "📋 Inspection" },
  { value: "maintenance", label: "🔧", fullLabel: "🔧 Maintenance" },
  { value: "legal", label: "⚖️", fullLabel: "⚖️ Juridique" },
];

const TenantMessages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { tenantId, orgId, propertyCountry, L, T } = useTenantProperty();
  const { startCall, isInCall, isStartingCall } = useCall();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [uploading, setUploading] = useState(false);
  const [showOriginalMap, setShowOriginalMap] = useState<Record<string, boolean>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dateLang = (getCountryConfig(propertyCountry).locale || "fr-FR").slice(0, 2);
  const dateFnsLocale = DATE_LOCALES[dateLang] || DATE_LOCALES.fr;
  const tenantLocale = dateLang;

  const resolveAuthUserId = useCallback(async (): Promise<string | null> => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.id) {
      sonnerToast.error("Session expirée. Reconnectez-vous.");
      return null;
    }
    return data.user.id;
  }, []);

  // ── Call handlers ──
  const handleAudioCall = useCallback(async () => {
    if (!orgId || isInCall || isStartingCall) return;
    const authUserId = await resolveAuthUserId();
    if (!authUserId) return;
    await startCall({
      orgId,
      contextType: "tenant",
      contextId: tenantId || undefined,
      contextLabel: L.tenantSpace || "Tenant",
      peerName: L.tenantSpace || "Landlord",
      isVideo: false,
    });
  }, [orgId, tenantId, isInCall, isStartingCall, startCall, resolveAuthUserId, L]);

  const handleVideoCall = useCallback(async () => {
    if (!orgId || isInCall || isStartingCall) return;
    const authUserId = await resolveAuthUserId();
    if (!authUserId) return;
    await startCall({
      orgId,
      contextType: "tenant",
      contextId: tenantId || undefined,
      contextLabel: L.tenantSpace || "Tenant",
      peerName: L.tenantSpace || "Landlord",
      isVideo: true,
    });
  }, [orgId, tenantId, isInCall, isStartingCall, startCall, resolveAuthUserId, L]);

  useEffect(() => {
    if (!tenantId) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });
      setMessages(data || []);
      await supabase.from("messages").update({ read: true }).eq("tenant_id", tenantId).eq("read", false).neq("sender_id", user!.id);
      setLoading(false);
    };
    fetch();
  }, [tenantId, user]);

  // Real-time
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`tenant-messages-${tenantId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `tenant_id=eq.${tenantId}` }, (payload) => {
        const incoming = payload.new as any;
        setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
        if (incoming.sender_id !== user?.id) {
          supabase.from("messages").update({ read: true }).eq("id", incoming.id).then(() => {});
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, user?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleToggleTranslation = async (m: any) => {
    const isShowingOriginal = showOriginalMap[m.id];
    if (isShowingOriginal) {
      setShowOriginalMap(prev => ({ ...prev, [m.id]: false }));
      return;
    }
    if (!m.translated_content) {
      setTranslatingId(m.id);
      try {
        const senderLocale = m.sender_locale || "en";
        const { data: transData } = await supabase.functions.invoke("translate-message", {
          body: { text: m.content, from_locale: senderLocale, to_locale: tenantLocale },
        });
        if (transData?.translated) {
          setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, translated_content: transData.translated } : msg));
          await supabase.from("messages").update({ translated_content: transData.translated }).eq("id", m.id);
        }
      } catch (e) { console.error("Translation failed:", e); }
      setTranslatingId(null);
      return;
    }
    setShowOriginalMap(prev => ({ ...prev, [m.id]: true }));
  };

  const handleFileUpload = async (file: File) => {
    if (!orgId || !tenantId || !user) return;
    const authUserId = await resolveAuthUserId();
    if (!authUserId) return;
    setUploading(true);
    try {
      const path = `${orgId}/messages/${tenantId}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("rental-docs").upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: signedData } = await supabase.storage.from("rental-docs").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signedData?.signedUrl || path;

      const { data: inserted } = await supabase
        .from("messages")
        .insert({
          tenant_id: tenantId, org_id: orgId, sender_id: authUserId,
          content: `📎 ${file.name}`, attachment_url: url,
          category: "general", sender_locale: tenantLocale, message_type: "user",
        } as any)
        .select("*")
        .single();

      if (inserted) setMessages(prev => prev.some(m => m.id === (inserted as any).id) ? prev : [...prev, inserted]);
      toast({ title: T.sendDocument || "File sent" });
    } catch (e: any) {
      toast({ title: T.error, description: e.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !user || !tenantId || !orgId) return;
    const authUserId = await resolveAuthUserId();
    if (!authUserId) return;
    const messageToSend = newMsg.trim();
    setSending(true);
    try {
      let translatedContent: string | null = null;
      const landlordLocale = "fr";
      if (tenantLocale !== landlordLocale) {
        try {
          const { data: transData } = await supabase.functions.invoke("translate-message", {
            body: { text: messageToSend, from_locale: tenantLocale, to_locale: landlordLocale },
          });
          if (transData?.translated) translatedContent = transData.translated;
        } catch (e) { console.error("Translation failed:", e); }
      }

      const { data: inserted, error } = await supabase
        .from("messages")
        .insert({
          tenant_id: tenantId, org_id: orgId, sender_id: authUserId,
          content: messageToSend, translated_content: translatedContent,
          category: selectedCategory, sender_locale: tenantLocale,
          message_type: "user", conversation_status: "waiting_landlord",
        } as any)
        .select("*")
        .single();

      if (error) {
        toast({ title: T.error, description: error.message, variant: "destructive" });
      } else {
        if (inserted) setMessages((prev) => (prev.some((m) => m.id === (inserted as any).id) ? prev : [...prev, inserted]));
        setNewMsg("");

        // Audit
        await supabase.from("audit_logs").insert({
          user_id: authUserId, org_id: orgId, action: "message_sent",
          metadata_json: { tenant_id: tenantId, category: selectedCategory, direction: "tenant_to_landlord" },
        });

        // Notification + email to landlord
        if (orgId) {
          try {
            const { data: org } = await supabase.from("orgs").select("email, owner_user_id").eq("id", orgId).single();
            if (org?.owner_user_id) {
              await supabase.from("notifications").insert({
                user_id: org.owner_user_id, org_id: orgId, type: "message",
                title: L.notifNewMsgTenant, message: L.notifTenantSentMsg, link: "/dashboard/communication",
              });
            }
            let landlordEmail = normalizeEmail(org?.email);
            if ((!landlordEmail || !isValidEmail(landlordEmail)) && org?.owner_user_id) {
              const { data: ownerProfile } = await supabase.from("profiles").select("email").eq("id", org.owner_user_id).maybeSingle();
              landlordEmail = normalizeEmail(ownerProfile?.email ?? null);
            }
            if (landlordEmail && isValidEmail(landlordEmail)) {
              const appUrl = buildAppUrl("/");
              await supabase.functions.invoke("send-email", {
                body: {
                  to: landlordEmail,
                  subject: L.emailNewMsgSubjectFromTenant,
                  html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
                    <h2 style="color:#1a1a1a;text-align:center;">📩 ${escapeEmailHtml(L.emailNewMsgFromTenant)}</h2>
                    <p style="color:#555;font-size:15px;">${escapeEmailHtml(L.emailTenantSentMsg)}</p>
                    <div style="background:#f5f5f5;border-left:4px solid #d4a853;border-radius:8px;padding:16px;margin:16px 0;">
                      <p style="color:#1a1a1a;white-space:pre-wrap;margin:0;font-size:15px;">${escapeEmailHtml(translatedContent || messageToSend)}</p>
                    </div>
                    <div style="text-align:center;margin:24px 0;">
                      <a href="${appUrl}/dashboard/communication" style="display:inline-block;background:#d4a853;color:#1a1a1a;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;">${escapeEmailHtml(L.emailReplyInApp)}</a>
                    </div>
                    <p style="color:#888;font-size:12px;text-align:center;">${escapeEmailHtml(L.emailAutoSent)}</p>
                  </div>`,
                },
              });
            }
          } catch (mailErr: any) { console.error("Email notification failed:", mailErr); }
        }
      }
    } finally { setSending(false); }
  };

  const getCategoryIcon = (cat: string) => MESSAGE_CATEGORIES.find(c => c.value === cat)?.label || "💬";

  return (
    <TenantLayout>
      <div className="max-w-3xl mx-auto flex flex-col" style={{ height: "calc(100vh - 8rem)" }}>
        {/* ── Header with call buttons ── */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{T.messagesTitle}</h1>
            <p className="text-muted-foreground text-sm">{T.messagesSubtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAudioCall}
              disabled={!orgId || isInCall || isStartingCall}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-40 active:scale-95"
              style={{ background: "hsl(var(--primary) / 0.08)", color: "hsl(var(--primary))" }}
              title="Audio call"
            >
              {isStartingCall ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
            </button>
            <button
              onClick={handleVideoCall}
              disabled={!orgId || isInCall || isStartingCall}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-40 active:scale-95"
              style={{ background: "hsl(var(--primary) / 0.08)", color: "hsl(var(--primary))" }}
              title="Video call"
            >
              <Video className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Encrypted badge */}
        <div className="flex items-center gap-1.5 mb-3">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ background: "hsl(142 70% 50% / 0.08)", color: "hsl(142 70% 50%)" }}>
            <Shield className="h-2.5 w-2.5" /> Secure channel
          </div>
        </div>

        <div className="flex-1 bg-card rounded-xl shadow-card border border-border/50 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">{T.noMessage}</p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.sender_id === user?.id;
                const isSystem = m.message_type === "system" || m.sender_id === SYSTEM_SENDER_ID;

                if (isSystem) {
                  return (
                    <div key={m.id} className="flex justify-center">
                      <div className="bg-muted/50 text-muted-foreground text-xs px-4 py-2 rounded-full max-w-[80%] text-center">
                        {m.content}
                        <span className="ml-2 opacity-60">{format(new Date(m.created_at), "dd/MM HH:mm")}</span>
                      </div>
                    </div>
                  );
                }

                const showingOriginal = showOriginalMap[m.id];
                const displayContent = isMe
                  ? m.content
                  : showingOriginal
                    ? m.content
                    : (m.translated_content || m.content);
                const hasTranslation = !isMe && (m.translated_content || m.sender_locale !== tenantLocale);

                return (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMe ? "bg-accent text-accent-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
                      {m.category && m.category !== "general" && (
                        <span className="text-[10px] opacity-70 mb-0.5 block">{getCategoryIcon(m.category)}</span>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">{displayContent}</p>
                      {/* Translation toggle */}
                      {hasTranslation && (
                        <button
                          onClick={() => handleToggleTranslation(m)}
                          disabled={translatingId === m.id}
                          className="flex items-center gap-1 mt-1 text-[10px] text-accent hover:underline disabled:opacity-50"
                        >
                          <Languages className="h-3 w-3" />
                          {translatingId === m.id ? "…" : showingOriginal ? "Show translation" : "Show original"}
                        </button>
                      )}
                      {m.attachment_url && (
                        <a href={m.attachment_url} target="_blank" rel="noopener noreferrer"
                          className={`flex items-center gap-1.5 mt-2 text-xs underline ${isMe ? "text-accent-foreground/80" : "text-accent"}`}>
                          <Paperclip className="h-3 w-3" /> Pièce jointe
                        </a>
                      )}
                      <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : ""}`}>
                        <p className={`text-[10px] ${isMe ? "text-accent-foreground/60" : "text-muted-foreground"}`}>
                          {format(new Date(m.created_at), "dd MMM HH:mm", { locale: dateFnsLocale })}
                        </p>
                        {isMe && (
                          <span className="text-[10px]">
                            {m.read ? <CheckCheck className="h-3 w-3 text-accent-foreground/80" /> : <Check className="h-3 w-3 text-accent-foreground/40" />}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {tenantId && (
            <form onSubmit={handleSend} className="border-t border-border p-3 flex gap-2 items-center">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-12 h-10 px-2">
                  <span className="text-sm">{getCategoryIcon(selectedCategory)}</span>
                </SelectTrigger>
                <SelectContent>
                  {MESSAGE_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.fullLabel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                type="text"
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                placeholder={T.yourMessage}
                className="flex-1 bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
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
              <Button type="button" variant="ghost" size="icon" className="shrink-0"
                onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              </Button>
              <button type="submit" disabled={sending || !newMsg.trim()} className="bg-gradient-gold text-accent-foreground p-2.5 rounded-lg hover:opacity-90 disabled:opacity-40">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          )}
        </div>
      </div>
    </TenantLayout>
  );
};

export default TenantMessages;
