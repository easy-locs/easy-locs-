/**
 * LEGACY ISOLATED MODULE
 * --------------------------------------------
 * This file is intentionally isolated from Orbit V2+ core.
 * Do not import Orbit core messaging services here.
 * Do not mix with canonical V2+ Orbit chain.
 * Migrate later as its own domain-specific module.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Send, Loader2, Paperclip, Check, CheckCheck, Upload, Languages, Phone, Video, Shield, ArrowLeft } from "lucide-react";
import TenantLayout from "@/components/tenant/TenantLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCall } from "@/components/call/CallProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow } from "date-fns";
import { fr, enUS, es, de, it, pt } from "@/lib/date-locales";
import type { Locale as DateFnsLocale } from "@/lib/date-locales";
import { getCountryConfig } from "@/lib/country-config";
import { useTenantProperty } from "@/hooks/useTenantProperty";
import { buildAppUrl } from "@/lib/app-domain";
import { motion } from "framer-motion";
import { toast as sonnerToast } from "sonner";
import * as tenantPortalRepo from "@/repositories/tenant-portal.repository";

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
    const userId = await tenantPortalRepo.getAuthUser();
    if (!userId) {
      sonnerToast.error("Session expirée. Reconnectez-vous.");
      return null;
    }
    return userId;
  }, []);

  // ── Call handlers ──
  const handleAudioCall = useCallback(async () => {
    if (!orgId || isInCall || isStartingCall) return;
    const authUserId = await resolveAuthUserId();
    if (!authUserId) return;
    await startCall({
      targetId: orgId,
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
      targetId: orgId,
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
      const contextId = `tenant_${orgId}_${tenantId}`;
      const data = await tenantPortalRepo.fetchTenantMessages(contextId);
      setMessages(data);
      // Mark notifications as read
      await tenantPortalRepo.markNotificationsRead(user!.id);
      setLoading(false);
    };
    fetch();
  }, [tenantId, orgId, user]);

  // Real-time (V2)
  useEffect(() => {
    if (!tenantId || !orgId) return;
    const unsub = tenantPortalRepo.subscribeTenantMessages(tenantId, orgId, (incoming) => {
      setMessages((prev) => (prev.some((m: any) => m.id === incoming.id) ? prev : [...prev, incoming]));
    });
    return unsub;
  }, [tenantId, orgId, user?.id]);

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
        const translated = await tenantPortalRepo.invokeTranslation(m.body || m.content, senderLocale, tenantLocale);
        if (translated) {
          setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, translated_content: translated } : msg));
          await tenantPortalRepo.updateMessageMetadata(m.id, { ...(m.metadata || {}), translated_content: translated });
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
      const url = await tenantPortalRepo.uploadChatFile(orgId, tenantId, file);
      const contextId = `tenant_${orgId}_${tenantId}`;
      const inserted = await tenantPortalRepo.insertChatMessage({
        conversation_id: contextId, sender_user_id: authUserId,
        sender_orbit_id: `orbit_${authUserId.slice(0, 12)}`,
        type: "file", body: `📎 ${file.name}`,
        metadata: { attachment_url: url, sender_locale: tenantLocale },
      });
      if (inserted) setMessages(prev => prev.some((m: any) => m.id === (inserted as any).id) ? prev : [...prev, inserted]);
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
          translatedContent = await tenantPortalRepo.invokeTranslation(messageToSend, tenantLocale, landlordLocale);
        } catch (e) { console.error("Translation failed:", e); }
      }

      const contextId = `tenant_${orgId}_${tenantId}`;
      const inserted = await tenantPortalRepo.insertChatMessage({
        conversation_id: contextId, sender_user_id: authUserId,
        sender_orbit_id: `orbit_${authUserId.slice(0, 12)}`,
        type: "text", body: messageToSend,
        metadata: { translated_content: translatedContent, category: selectedCategory, sender_locale: tenantLocale },
      });

      if (inserted) {
        setMessages((prev) => (prev.some((m) => m.id === (inserted as any).id) ? prev : [...prev, inserted]));
        setNewMsg("");

        // Audit
        await tenantPortalRepo.insertAuditLog({
          user_id: authUserId, org_id: orgId, action: "message_sent",
          metadata_json: { tenant_id: tenantId, category: selectedCategory, direction: "tenant_to_landlord" },
        });

        // Notification + email to landlord
        if (orgId) {
          try {
            const org = await tenantPortalRepo.fetchOrgEmailAndOwner(orgId);
            if (org?.owner_user_id) {
              await tenantPortalRepo.insertNotification({
                user_id: org.owner_user_id, scope: "global", category: "message",
                title: L.notifNewMsgTenant, body: L.notifTenantSentMsg, severity: "info", route: "/dashboard/communication",
              });
            }
            let landlordEmail = normalizeEmail(org?.email);
            if ((!landlordEmail || !isValidEmail(landlordEmail)) && org?.owner_user_id) {
              landlordEmail = normalizeEmail(await tenantPortalRepo.fetchProfileEmail(org.owner_user_id));
            }
            if (landlordEmail && isValidEmail(landlordEmail)) {
              const appUrl = buildAppUrl("/");
              await tenantPortalRepo.invokeEmail({
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
                const isMe = m.sender_user_id === user?.id;
                const isSystem = m.type === "system" || m.sender_user_id === SYSTEM_SENDER_ID;
                const meta = m.metadata || {};
                const content = m.body || "";
                const attachmentUrl = meta.attachment_url;
                const translatedContent = meta.translated_content;
                const senderLocale = meta.sender_locale;
                const category = meta.category;

                if (isSystem) {
                  return (
                    <div key={m.id} className="flex justify-center">
                      <div className="bg-muted/50 text-muted-foreground text-xs px-4 py-2 rounded-full max-w-[80%] text-center">
                        {content}
                        <span className="ml-2 opacity-60">{format(new Date(m.created_at), "dd/MM HH:mm")}</span>
                      </div>
                    </div>
                  );
                }

                const showingOriginal = showOriginalMap[m.id];
                const displayContent = isMe
                  ? content
                  : showingOriginal
                    ? content
                    : (translatedContent || content);
                const hasTranslation = !isMe && (translatedContent || senderLocale !== tenantLocale);

                return (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMe ? "bg-accent text-accent-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
                      {category && category !== "general" && (
                        <span className="text-[10px] opacity-70 mb-0.5 block">{getCategoryIcon(category)}</span>
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
                      {attachmentUrl && (
                        <a href={attachmentUrl} target="_blank" rel="noopener noreferrer"
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
                            {m.read_at ? <CheckCheck className="h-3 w-3 text-accent-foreground/80" /> : <Check className="h-3 w-3 text-accent-foreground/40" />}
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
