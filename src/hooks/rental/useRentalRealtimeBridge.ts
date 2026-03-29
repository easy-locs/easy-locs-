/**
 * useRentalRealtimeBridge — Extracted realtime subscription for rental messages.
 * Replaces inline createRealtimeChannel() calls in RentalManagement.tsx.
 */
import { useEffect, useState, useCallback } from "react";
import { subscribeRentalMessages, fetchRentalMessages, sendRentalMessage, sendRentalNotification } from "@/lib/rental/rental-repository";
import { emitRentalMessageSent } from "@/lib/rental/rental-event-bridge";
import { useAuth } from "@/contexts/AuthContext";
import { invokeSendEmail } from "@/repositories/ai.repository";
import { buildAppUrl } from "@/lib/app-domain";

const escapeEmailHtml = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

export function useRentalRealtimeBridge(tenantId: string | null, orgId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);

  // Load messages when tenant changes
  useEffect(() => {
    if (!orgId || !tenantId) { setMessages([]); return; }
    fetchRentalMessages(orgId, tenantId).then(setMessages);
  }, [orgId, tenantId]);

  // Realtime subscription
  useEffect(() => {
    if (!orgId || !tenantId) return;
    const unsub = subscribeRentalMessages(
      tenantId,
      (newMsg) => setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]),
      (updated) => setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m)),
    );
    return unsub;
  }, [orgId, tenantId]);

  const send = useCallback(async (body: string, tenant: { id: string; email?: string; tenant_user_id?: string }, emailSubject?: string, emailTitle?: string, emailBody?: string, replyLabel?: string, footerLabel?: string) => {
    if (!orgId || !user || !body.trim()) return;
    await sendRentalMessage(orgId, tenant.id, user.id, body.trim());
    emitRentalMessageSent(tenant.id);

    // Refresh messages
    const updated = await fetchRentalMessages(orgId, tenant.id);
    setMessages(updated);

    // In-app notification
    if (tenant.tenant_user_id) {
      await sendRentalNotification(tenant.tenant_user_id, emailTitle ?? "New message", emailBody ?? "Your landlord sent you a message");
    }

    // Email notification
    const email = (tenant.email ?? "").trim().toLowerCase();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const appUrl = buildAppUrl("/");
      await invokeSendEmail({
        to: email,
        subject: emailSubject ?? "New message",
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
          <h2 style="color:#1a1a1a;text-align:center;">${escapeEmailHtml(emailTitle ?? "New message")}</h2>
          <p style="color:#555;font-size:15px;">${escapeEmailHtml(emailBody ?? "You have a new message")}</p>
          <div style="background:#f5f5f5;border-left:4px solid #d4a853;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="color:#1a1a1a;white-space:pre-wrap;margin:0;font-size:15px;">${escapeEmailHtml(body)}</p>
          </div>
          <div style="text-align:center;margin:24px 0;">
            <a href="${appUrl}/tenant/messages" style="display:inline-block;background:#d4a853;color:#1a1a1a;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;">${escapeEmailHtml(replyLabel ?? "Reply")}</a>
          </div>
          <p style="color:#888;font-size:12px;text-align:center;">${escapeEmailHtml(footerLabel ?? "Automatic notification")}</p>
        </div>`,
      }).catch(() => {});
    }
  }, [orgId, user]);

  return { messages, send };
}
