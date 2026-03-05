import { useState, useEffect, useRef, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { MessageCircle, Send, ArrowLeft, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { getCountryConfig } from "@/lib/country-config";

interface Tenant {
  id: string;
  name: string;
  email: string | null;
  tenant_user_id?: string | null;
  property_label?: string;
  property_country?: string;
}

interface Message {
  id: string;
  sender_id: string;
  tenant_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

const escapeEmailHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

const normalizeEmail = (email: string | null | undefined) => (email || "").trim().toLowerCase();
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const Messages = () => {
  const { user, orgId } = useAuth();
  const { t } = useI18n();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load tenants with their properties
  const loadTenants = useCallback(async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from("tenants")
      .select("id, name, email, tenant_user_id, property_id")
      .eq("org_id", orgId)
      .order("name");

    if (data) {
      // Load property labels and countries
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

      setTenants(data.map(t => ({
        ...t,
        property_label: t.property_id ? propertyMap[t.property_id]?.label : undefined,
        property_country: t.property_id ? propertyMap[t.property_id]?.country : undefined,
      })));
    }
    setLoading(false);
  }, [orgId]);

  // Load unread counts
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
      data.forEach(m => {
        counts[m.tenant_id] = (counts[m.tenant_id] || 0) + 1;
      });
      setUnreadCounts(counts);
    }
  }, [orgId, user]);

  // Load messages for selected tenant
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
      // Mark unread messages as read
      const unreadIds = data
        .filter(m => !m.read && m.sender_id !== user?.id)
        .map(m => m.id);
      if (unreadIds.length > 0) {
        await supabase
          .from("messages")
          .update({ read: true })
          .in("id", unreadIds);
        loadUnreadCounts();
      }
    }
  }, [orgId, selectedTenant, user, loadUnreadCounts]);

  useEffect(() => { loadTenants(); loadUnreadCounts(); }, [loadTenants, loadUnreadCounts]);
  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `org_id=eq.${orgId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        if (selectedTenant && newMsg.tenant_id === selectedTenant.id) {
          setMessages(prev => [...prev, newMsg]);
          // Mark as read if it's not from us
          if (newMsg.sender_id !== user?.id) {
            supabase.from("messages").update({ read: true }).eq("id", newMsg.id).then(() => loadUnreadCounts());
          }
        } else {
          loadUnreadCounts();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orgId, selectedTenant, user, loadUnreadCounts]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedTenant || !orgId || !user) return;
    const messageToSend = newMessage.trim();

    setSending(true);
    const { error } = await supabase.from("messages").insert({
      org_id: orgId,
      sender_id: user.id,
      tenant_id: selectedTenant.id,
      content: messageToSend,
      read: false,
    });

    if (error) {
      toast.error(t("page.messages.send_error"));
    } else {
      setNewMessage("");

      if (selectedTenant.tenant_user_id) {
        const propCountry = selectedTenant.property_country || "FR";
        const L = getCountryConfig(propCountry).labels;
        await supabase.from("notifications").insert({
          user_id: selectedTenant.tenant_user_id,
          org_id: orgId,
          type: "message",
          title: L.notifNewMsgLandlord,
          message: L.notifLandlordSentMsg,
          link: "/tenant/messages",
        });
      }

      const tenantEmail = normalizeEmail(selectedTenant.email);
      const propCountry = selectedTenant.property_country || "FR";
      const L = getCountryConfig(propCountry).labels;
      if (tenantEmail && isValidEmail(tenantEmail)) {
        try {
          const appUrl = window.location.origin;
          const { data, error: emailError } = await supabase.functions.invoke("send-email", {
            body: {
              to: tenantEmail,
              subject: L.emailNewMsgSubjectFromLandlord,
              html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
                <div style="text-align:center;margin-bottom:24px;">
                  <h2 style="color:#1a1a1a;margin:0;">📩 ${escapeEmailHtml(L.emailNewMsgFromLandlord)}</h2>
                </div>
                <p style="color:#555;font-size:15px;">${escapeEmailHtml(L.emailHello)},</p>
                <p style="color:#555;font-size:15px;">${escapeEmailHtml(L.emailYouReceivedMsg)}</p>
                <div style="background:#f5f5f5;border-left:4px solid #d4a853;border-radius:8px;padding:16px;margin:16px 0;">
                  <p style="color:#1a1a1a;white-space:pre-wrap;margin:0;font-size:15px;">${escapeEmailHtml(messageToSend)}</p>
                </div>
                <div style="text-align:center;margin:24px 0;">
                  <a href="${appUrl}/tenant/messages" style="display:inline-block;background:#d4a853;color:#1a1a1a;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;">${escapeEmailHtml(L.emailReplyInApp)}</a>
                </div>
                <p style="color:#888;font-size:12px;text-align:center;">${escapeEmailHtml(L.emailAutoSent)}</p>
              </div>`,
            },
          });

          if (emailError || (data && data.success === false)) {
            throw emailError || new Error(data?.error || "Échec notification email");
          }
        } catch (mailErr: any) {
          toast.error(`${t("page.messages.sent_no_email")}: ${mailErr.message}`);
        }
      }
    }

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          {selectedTenant && (
            <Button variant="ghost" size="icon" onClick={() => setSelectedTenant(null)} className="md:hidden">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("page.messages.title")}</h1>
            <p className="text-muted-foreground text-sm">{t("page.messages.subtitle")}</p>
          </div>
        </div>

        <div className="flex-1 flex gap-4 min-h-0 bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
          {/* Tenant list */}
          <div className={`w-full md:w-80 border-r border-border/50 flex flex-col ${selectedTenant ? "hidden md:flex" : "flex"}`}>
            <div className="p-3 border-b border-border/50">
              <p className="text-sm font-semibold text-foreground">{t("page.messages.conversations")}</p>
            </div>
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground text-sm">{t("page.common.loading")}</div>
              ) : tenants.length === 0 ? (
                <div className="p-6 text-center">
                  <User className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">{t("page.messages.no_tenants")}</p>
                </div>
              ) : (
                tenants.map(tenant => (
                  <button
                    key={tenant.id}
                    onClick={() => setSelectedTenant(tenant)}
                    className={`w-full text-left p-3 hover:bg-muted/50 transition-colors border-b border-border/30 ${
                      selectedTenant?.id === tenant.id ? "bg-muted/70" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{tenant.name}</p>
                          {tenant.property_label && (
                            <p className="text-xs text-muted-foreground truncate">{tenant.property_label}</p>
                          )}
                        </div>
                      </div>
                      {unreadCounts[tenant.id] > 0 && (
                        <Badge variant="default" className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 ml-2">
                          {unreadCounts[tenant.id]}
                        </Badge>
                      )}
                    </div>
                  </button>
                ))
              )}
            </ScrollArea>
          </div>

          {/* Chat area */}
          <div className={`flex-1 flex flex-col ${!selectedTenant ? "hidden md:flex" : "flex"}`}>
            {selectedTenant ? (
              <>
                {/* Chat header */}
                <div className="p-3 border-b border-border/50 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{selectedTenant.name}</p>
                    {selectedTenant.email && (
                      <p className="text-xs text-muted-foreground">{selectedTenant.email}</p>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <MessageCircle className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">{t("page.messages.no_messages")}</p>
                      </div>
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isMe = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                            isMe
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted text-foreground rounded-bl-md"
                          }`}>
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                            <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                              {format(new Date(msg.created_at), "HH:mm", { locale: fr })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Input */}
                <div className="p-3 border-t border-border/50 flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t("page.messages.placeholder")}
                    className="flex-1"
                    disabled={sending}
                  />
                  <Button onClick={handleSend} disabled={!newMessage.trim() || sending} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground">{t("page.messages.select_tenant")}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Messages;
