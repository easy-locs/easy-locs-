import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import TenantLayout from "@/components/tenant/TenantLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr, enUS, es, de, it, pt } from "date-fns/locale";
import type { Locale as DateFnsLocale } from "date-fns";
import { getCountryConfig } from "@/lib/country-config";
import { useTenantProperty } from "@/hooks/useTenantProperty";

const escapeEmailHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");

const normalizeEmail = (email: string | null | undefined) => (email || "").trim().toLowerCase();
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const DATE_LOCALES: Record<string, DateFnsLocale> = { fr, en: enUS, es, de, it, pt };

const TenantMessages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { tenantId, orgId, propertyCountry, L, T } = useTenantProperty();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const dateLang = (getCountryConfig(propertyCountry).locale || "fr-FR").slice(0, 2);
  const dateFnsLocale = DATE_LOCALES[dateLang] || DATE_LOCALES.fr;

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
      const { data: inserted, error } = await supabase
        .from("messages")
        .insert({ tenant_id: tenantId, org_id: orgId, sender_id: user.id, content: messageToSend })
        .select("*")
        .single();
      if (error) {
        toast({ title: T.error, description: error.message, variant: "destructive" });
      } else {
        if (inserted) setMessages((prev) => (prev.some((m) => m.id === inserted.id) ? prev : [...prev, inserted]));
        setNewMsg("");
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
              const appUrl = window.location.origin;
              await supabase.functions.invoke("send-email", {
                body: {
                  to: landlordEmail,
                  subject: L.emailNewMsgSubjectFromTenant,
                  html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
                    <h2 style="color:#1a1a1a;text-align:center;">📩 ${escapeEmailHtml(L.emailNewMsgFromTenant)}</h2>
                    <p style="color:#555;font-size:15px;">${escapeEmailHtml(L.emailTenantSentMsg)}</p>
                    <div style="background:#f5f5f5;border-left:4px solid #d4a853;border-radius:8px;padding:16px;margin:16px 0;">
                      <p style="color:#1a1a1a;white-space:pre-wrap;margin:0;font-size:15px;">${escapeEmailHtml(messageToSend)}</p>
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
                      <p className="text-sm">{m.content}</p>
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
            <form onSubmit={handleSend} className="border-t border-border p-3 flex gap-2">
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
