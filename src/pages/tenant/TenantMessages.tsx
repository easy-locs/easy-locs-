import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import TenantLayout from "@/components/tenant/TenantLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { fr, enUS, es, de, it, pt } from "date-fns/locale";
import type { Locale as DateFnsLocale } from "date-fns";
import { getCountryConfig } from "@/lib/country-config";
import { useTenantProperty } from "@/hooks/useTenantProperty";
import { buildAppUrl } from "@/lib/app-domain";

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
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("general");
  const bottomRef = useRef<HTMLDivElement>(null);

  const dateLang = (getCountryConfig(propertyCountry).locale || "fr-FR").slice(0, 2);
  const dateFnsLocale = DATE_LOCALES[dateLang] || DATE_LOCALES.fr;
  const tenantLocale = dateLang;

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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !user || !tenantId || !orgId) return;
    const messageToSend = newMsg.trim();
    setSending(true);
    try {
      // Translate if needed
      let translatedContent: string | null = null;
      const landlordLocale = "fr"; // default, will be overridden by sender_locale on landlord side
      if (tenantLocale !== landlordLocale) {
        try {
          const { data: transData } = await supabase.functions.invoke("translate-message", {
            body: { text: messageToSend, from_locale: tenantLocale, to_locale: landlordLocale },
          });
          if (transData?.translated) translatedContent = transData.translated;
        } catch (e) {
          console.error("Translation failed:", e);
        }
      }

      const { data: inserted, error } = await supabase
        .from("messages")
        .insert({
          tenant_id: tenantId, org_id: orgId, sender_id: user.id,
          content: messageToSend, translated_content: translatedContent,
          category: selectedCategory, sender_locale: tenantLocale,
        })
        .select("*")
        .single();

      if (error) {
        toast({ title: T.error, description: error.message, variant: "destructive" });
      } else {
        if (inserted) setMessages((prev) => (prev.some((m) => m.id === inserted.id) ? prev : [...prev, inserted]));
        setNewMsg("");

        // Audit log
        await supabase.from("audit_logs").insert({
          user_id: user.id, org_id: orgId, action: "message_sent",
          metadata_json: { tenant_id: tenantId, category: selectedCategory, direction: "tenant_to_landlord" },
        });

        if (orgId) {
          try {
            const { data: org } = await supabase.from("orgs").select("email, owner_user_id").eq("id", orgId).single();
            if (org?.owner_user_id) {
              await supabase.from("notifications").insert({
                user_id: org.owner_user_id, org_id: orgId, type: "message",
                title: L.notifNewMsgTenant, message: L.notifTenantSentMsg, link: "/dashboard/messages",
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
                      <a href="${appUrl}/dashboard/messages" style="display:inline-block;background:#d4a853;color:#1a1a1a;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;">${escapeEmailHtml(L.emailReplyInApp)}</a>
                    </div>
                    <p style="color:#888;font-size:12px;text-align:center;">${escapeEmailHtml(L.emailAutoSent)}</p>
                  </div>`,
                },
              });
            }
          } catch (mailErr: any) {
            console.error("Email notification failed:", mailErr);
          }
        }
      }
    } finally {
      setSending(false);
    }
  };

  const getCategoryIcon = (cat: string) => MESSAGE_CATEGORIES.find(c => c.value === cat)?.label || "💬";

  return (
    <TenantLayout>
      <div className="max-w-3xl mx-auto flex flex-col" style={{ height: "calc(100vh - 8rem)" }}>
        <h1 className="text-2xl font-bold text-foreground mb-1">{T.messagesTitle}</h1>
        <p className="text-muted-foreground mb-4">{T.messagesSubtitle}</p>

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
                return (
                  <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMe ? "bg-accent text-accent-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
                      {m.category && m.category !== "general" && (
                        <span className="text-[10px] opacity-70 mb-0.5 block">{getCategoryIcon(m.category)}</span>
                      )}
                      <p className="text-sm">
                        {isMe ? m.content : (m.translated_content || m.content)}
                      </p>
                      <p className={`text-[10px] mt-1 ${isMe ? "text-accent-foreground/60" : "text-muted-foreground"}`}>
                        {format(new Date(m.created_at), "dd MMM HH:mm", { locale: dateFnsLocale })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {tenantId && (
            <form onSubmit={handleSend} className="border-t border-border p-3 flex gap-2 items-center">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-12 h-9 px-2">
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
