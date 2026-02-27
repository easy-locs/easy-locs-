import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import TenantLayout from "@/components/tenant/TenantLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const TenantMessages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, org_id")
        .eq("tenant_user_id", user.id)
        .limit(1)
        .single();
      if (!tenant) { setLoading(false); return; }
      setTenantId(tenant.id);
      setOrgId(tenant.org_id);
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: true });
      setMessages(data || []);
      // Mark unread messages as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("tenant_id", tenant.id)
        .eq("read", false)
        .neq("sender_id", user.id);
      setLoading(false);
    };
    fetch();
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !user || !tenantId || !orgId) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      tenant_id: tenantId,
      org_id: orgId,
      sender_id: user.id,
      content: newMsg.trim(),
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setMessages(prev => [...prev, { id: Date.now(), sender_id: user.id, content: newMsg.trim(), created_at: new Date().toISOString() }]);
      setNewMsg("");
      // Notify landlord by email (best-effort)
      if (orgId) {
        supabase.from("orgs").select("email").eq("id", orgId).single().then(({ data: org }) => {
          if (org?.email) {
            supabase.functions.invoke("send-email", {
              body: {
                to: org.email,
                subject: `Nouveau message de votre locataire`,
                html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                  <h2 style="color:#1a1a1a;">📩 Nouveau message locataire</h2>
                  <p style="color:#555;">Un locataire vous a envoyé un message :</p>
                  <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;">
                    <p style="color:#1a1a1a;white-space:pre-wrap;">${newMsg.trim()}</p>
                  </div>
                  <p style="color:#888;font-size:13px;">Connectez-vous à votre tableau de bord pour répondre.</p>
                </div>`,
              },
            }).catch(() => {});
          }
        });
      }
    }
    setSending(false);
  };

  return (
    <TenantLayout>
      <div className="max-w-3xl mx-auto flex flex-col" style={{ height: "calc(100vh - 8rem)" }}>
        <h1 className="text-2xl font-bold text-foreground mb-1">Messages</h1>
        <p className="text-muted-foreground mb-4">Échangez avec votre bailleur.</p>

        <div className="flex-1 bg-card rounded-xl shadow-card border border-border/50 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Aucun message. Envoyez le premier !</p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMe ? "bg-accent text-accent-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
                      <p className="text-sm">{m.content}</p>
                      <p className={`text-[10px] mt-1 ${isMe ? "text-accent-foreground/60" : "text-muted-foreground"}`}>
                        {format(new Date(m.created_at), "dd MMM HH:mm", { locale: fr })}
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
                placeholder="Votre message..."
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
