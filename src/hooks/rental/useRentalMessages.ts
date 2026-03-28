/**
 * useRentalMessages — Extracted from RentalManagement.tsx
 * Handles tenant messages: load, send, realtime, email notification.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { buildAppUrl } from "@/lib/app-domain";

const escapeEmailHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

const normalizeEmail = (email: string | null | undefined) => (email || "").trim().toLowerCase();
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export function useRentalMessages(selectedTenantId: string | null) {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const loadMessages = useCallback(async (tenantId: string) => {
    if (!orgId) return;
    const contextId = `tenant_${orgId}_${tenantId}`;
    const { data } = await (supabase as any).from("chat_messages_v2")
      .select("*")
      .eq("conversation_id", contextId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  }, [orgId]);

  // Realtime listener
  useEffect(() => {
    if (!orgId || !selectedTenantId) return;
    const channel = supabase
      .channel(`rental-msg-${selectedTenantId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "chat_messages_v2",
      }, (payload) => {
        const newMsg = payload.new as any;
        if (newMsg.metadata?.tenant_id === selectedTenantId || newMsg.conversation_id?.includes(selectedTenantId)) {
          setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        }
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "chat_messages_v2",
      }, (payload) => {
        const updated = payload.new as any;
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, selectedTenantId]);

  const sendMessage = useCallback(async (tenant: { id: string; email: string; tenant_user_id?: string | null }) => {
    if (!newMessage.trim() || !orgId || !user) return;
    const messageToSend = newMessage.trim();
    const contextId = `tenant_${orgId}_${tenant.id}`;

    const { error } = await (supabase as any).from("chat_messages_v2").insert({
      conversation_id: contextId,
      sender_user_id: user.id,
      sender_orbit_id: `orbit_${user.id.slice(0, 12)}`,
      type: "text",
      body: messageToSend,
    });

    if (error) {
      toast({ title: t("page.rental.error"), description: error.message, variant: "destructive" });
      return;
    }

    setNewMessage("");
    await loadMessages(tenant.id);

    // In-app notification
    if (tenant.tenant_user_id) {
      await (supabase as any).from("app_notifications").insert({
        user_id: tenant.tenant_user_id,
        scope: "global",
        category: "message",
        title: t("page.rental.new_message_notif"),
        body: t("page.rental.landlord_message"),
        severity: "info",
        route: "/tenant/messages",
      });
    }

    // Email notification
    const tenantEmail = normalizeEmail(tenant.email);
    if (tenantEmail && isValidEmail(tenantEmail)) {
      const appUrl = buildAppUrl("/");
      const { data: emailData, error: emailError } = await supabase.functions.invoke("send-email", {
        body: {
          to: tenantEmail,
          subject: t("page.rental.email_new_msg_subject"),
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
            <h2 style="color:#1a1a1a;text-align:center;">${escapeEmailHtml(t("page.rental.email_new_msg_title"))}</h2>
            <p style="color:#555;font-size:15px;">${escapeEmailHtml(t("page.rental.email_new_msg_body"))}</p>
            <div style="background:#f5f5f5;border-left:4px solid #d4a853;border-radius:8px;padding:16px;margin:16px 0;">
              <p style="color:#1a1a1a;white-space:pre-wrap;margin:0;font-size:15px;">${escapeEmailHtml(messageToSend)}</p>
            </div>
            <div style="text-align:center;margin:24px 0;">
              <a href="${appUrl}/tenant/messages" style="display:inline-block;background:#d4a853;color:#1a1a1a;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;">${escapeEmailHtml(t("page.rental.reply_in_app"))}</a>
            </div>
            <p style="color:#888;font-size:12px;text-align:center;">${escapeEmailHtml(t("page.rental.email_auto_footer"))}</p>
          </div>`,
        },
      });

      if (emailError || (emailData && emailData.success === false)) {
        toast({
          title: t("page.rental.msg_sent"),
          description: `${t("page.rental.email_not_sent")} : ${(emailError as any)?.message || emailData?.error || "unknown error"}`,
          variant: "destructive",
        });
      }
    }
  }, [newMessage, orgId, user, loadMessages, toast, t]);

  return { messages, newMessage, setNewMessage, loadMessages, sendMessage };
}
