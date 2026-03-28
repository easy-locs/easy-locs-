/**
 * useRentalMessages — Extracted from RentalManagement.tsx
 * Handles tenant messages: load, send, realtime, email notification.
 * MIGRATED: All DB ops via rental-data.repository.
 */
import { useState, useEffect, useCallback } from "react";
import * as rentalRepo from "@/repositories/rental-data.repository";
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
    const data = await rentalRepo.fetchChatMessages(orgId, tenantId);
    setMessages(data);
  }, [orgId]);

  // Realtime listener
  useEffect(() => {
    if (!orgId || !selectedTenantId) return;
    return rentalRepo.subscribeToRentalChat(
      selectedTenantId,
      (newMsg) => {
        if (newMsg.metadata?.tenant_id === selectedTenantId || newMsg.conversation_id?.includes(selectedTenantId)) {
          setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        }
      },
      (updated) => setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m)),
    );
  }, [orgId, selectedTenantId]);

  const sendMessage = useCallback(async (tenant: { id: string; email: string; tenant_user_id?: string | null }) => {
    if (!newMessage.trim() || !orgId || !user) return;
    const messageToSend = newMessage.trim();

    try {
      await rentalRepo.insertChatMessage(orgId, tenant.id, user.id, messageToSend);
    } catch (error: any) {
      toast({ title: t("page.rental.error"), description: error.message, variant: "destructive" });
      return;
    }

    setNewMessage("");
    await loadMessages(tenant.id);

    // In-app notification
    if (tenant.tenant_user_id) {
      await rentalRepo.insertAppNotification({
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
      try {
        const emailData = await rentalRepo.invokeSendEmail({
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
        });

        if (emailData && emailData.success === false) {
          toast({
            title: t("page.rental.msg_sent"),
            description: `${t("page.rental.email_not_sent")} : ${emailData?.error || "unknown error"}`,
            variant: "destructive",
          });
        }
      } catch (err: any) {
        toast({
          title: t("page.rental.msg_sent"),
          description: `${t("page.rental.email_not_sent")} : ${err.message || "unknown error"}`,
          variant: "destructive",
        });
      }
    }
  }, [newMessage, orgId, user, loadMessages, toast, t]);

  return { messages, newMessage, setNewMessage, loadMessages, sendMessage };
}
