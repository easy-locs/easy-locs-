import { db } from "@/services/db";
import { qr, toResolveUrl } from "@/lib/qr-engine";
import { createPaymentRequest } from "@/payments/payment-request-hooks";
import { walletTransfer } from "@/payments/wallet-hooks";
import { APP_BASE_URL } from "@/lib/app-domain";
import { createShortLink, buildShortUrl } from "@/lib/short-links";

export type PaymentLinkType = "send" | "request" | "invite";

export interface PaymentLink {
  id: string;
  type: PaymentLinkType;
  creatorId: string;
  recipientId: string | null;
  recipientPhone: string | null;
  recipientName: string | null;
  amount: number;
  currency: string;
  note: string | null;
  status: "pending" | "claimed" | "expired" | "cancelled";
  paymentRequestId: string | null;
  holdTxId: string | null;
  shareUrl: string;
  qrUrl: string;
  createdAt: string;
  expiresAt: string;
}

const LINK_EXPIRY_HOURS = 72;

function buildShareUrl(linkId: string): string {
  return `${APP_BASE_URL}/pay/link/${linkId}`;
}

function mapToPaymentLink(data: Record<string, unknown>, shortLinkCode?: string): PaymentLink {
  const qrPayload = data.type === "request" && data.payment_request_id
    ? qr.paymentRequest(data.payment_request_id as string)
    : qr.payUser(data.creator_id as string, {
        amount: data.amount as number,
        currency: data.currency as string,
      });

  const shareUrl = shortLinkCode
    ? buildShortUrl(shortLinkCode)
    : buildShareUrl(data.id as string);
  const qrUrl = shortLinkCode
    ? buildShortUrl(shortLinkCode)
    : toResolveUrl(qrPayload);

  return {
    id: data.id as string,
    type: data.type as PaymentLinkType,
    creatorId: data.creator_id as string,
    recipientId: (data.recipient_id as string) || null,
    recipientPhone: (data.recipient_phone as string) || null,
    recipientName: (data.recipient_name as string) || null,
    amount: data.amount as number,
    currency: data.currency as string,
    note: (data.note as string) || null,
    status: data.status as PaymentLink["status"],
    paymentRequestId: (data.payment_request_id as string) || null,
    holdTxId: (data.hold_tx_id as string) || null,
    shareUrl,
    qrUrl,
    createdAt: data.created_at as string,
    expiresAt: data.expires_at as string,
  };
}

export async function createPaymentLink(params: {
  creatorId: string;
  type: PaymentLinkType;
  amount: number;
  currency: string;
  recipientId?: string | null;
  recipientPhone?: string | null;
  recipientName?: string | null;
  note?: string | null;
}): Promise<PaymentLink> {
  const expiresAt = new Date(Date.now() + LINK_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  let paymentRequestId: string | null = null;

  if (params.type === "request") {
    const req = await createPaymentRequest({
      requesterId: params.creatorId,
      recipientId: params.recipientId || null,
      amount: params.amount,
      currency: params.currency,
      title: params.note || "Payment request",
      subtitle: params.recipientName ? `Request for ${params.recipientName}` : null,
      contextType: "payment_link",
      metadata: {
        source: "payment_link",
        recipient_phone: params.recipientPhone || null,
      },
    });
    paymentRequestId = req.id;
  }

  const { data, error } = await db("payment_links")
    .insert({
      creator_id: params.creatorId,
      type: params.type,
      amount: params.amount,
      currency: params.currency,
      recipient_id: params.recipientId || null,
      recipient_phone: params.recipientPhone || null,
      recipient_name: params.recipientName || null,
      note: params.note || null,
      status: "pending",
      payment_request_id: paymentRequestId,
      hold_tx_id: null,
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (error) throw error;

  let shortLinkCode: string | undefined;
  try {
    const action = params.type === "request" ? "payment_request" as const : "pay_user" as const;
    const shortPayload = params.type === "request"
      ? { action, requestId: paymentRequestId!, amount: params.amount, currency: params.currency }
      : { action, userId: params.creatorId, amount: params.amount, currency: params.currency };
    const sl = await createShortLink({
      action,
      payload: shortPayload,
      createdBy: params.creatorId,
      expiresInHours: LINK_EXPIRY_HOURS,
    });
    shortLinkCode = sl.code;
  } catch {
    // short link creation is non-blocking
  }

  return mapToPaymentLink(data as Record<string, unknown>, shortLinkCode);
}

export async function createInvitePaymentLink(params: {
  senderId: string;
  recipientPhone: string;
  recipientName: string;
  amount: number;
  currency: string;
  note?: string;
}): Promise<PaymentLink> {
  const link = await createPaymentLink({
    creatorId: params.senderId,
    type: "invite",
    amount: params.amount,
    currency: params.currency,
    recipientPhone: params.recipientPhone,
    recipientName: params.recipientName,
    note: params.note || null,
  });

  try {
    const holdResult = await walletTransfer({
      senderId: params.senderId,
      recipientId: params.senderId,
      amount: 0,
      currency: params.currency,
      contextType: "payment_link",
      contextId: link.id,
      title: `Hold for ${params.recipientName}`,
      subtitle: `Pending invite payment`,
      metadata: {
        type: "invite_hold",
        link_id: link.id,
        recipient_phone: params.recipientPhone,
        hold_amount: params.amount,
      },
    });

    await db("payment_links")
      .update({ hold_tx_id: holdResult.txId })
      .eq("id", link.id);

    link.holdTxId = holdResult.txId;
  } catch {
    // hold creation is non-blocking; link still works without it
  }

  return link;
}

export async function fetchPaymentLink(linkId: string): Promise<PaymentLink | null> {
  const { data, error } = await db("payment_links")
    .select("*")
    .eq("id", linkId)
    .maybeSingle();

  if (error || !data) return null;
  return mapToPaymentLink(data as Record<string, unknown>);
}

export async function claimPaymentLink(
  linkId: string,
  claimerId: string,
  claimerPhone?: string,
): Promise<{ success: boolean; txId?: string; error?: string }> {
  const { data: linkData, error: fetchErr } = await db("payment_links")
    .select("*")
    .eq("id", linkId)
    .eq("status", "pending")
    .maybeSingle();

  if (fetchErr || !linkData) {
    return { success: false, error: "Link not found or already claimed" };
  }

  const link = mapToPaymentLink(linkData as Record<string, unknown>);

  if (new Date(link.expiresAt) < new Date()) {
    await db("payment_links").update({ status: "expired" }).eq("id", linkId).eq("status", "pending");
    return { success: false, error: "Link expired" };
  }

  if (link.creatorId === claimerId) {
    return { success: false, error: "Cannot claim your own link" };
  }

  if (link.recipientPhone && claimerPhone && link.recipientPhone !== claimerPhone) {
    return { success: false, error: "This payment link was sent to a different phone number" };
  }

  const { data: updated, error: updateErr } = await db("payment_links")
    .update({ status: "claimed", recipient_id: claimerId })
    .eq("id", linkId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateErr || !updated) {
    return { success: false, error: "Link was already claimed by another user" };
  }

  if (link.type === "invite" || link.type === "send") {
    try {
      const result = await walletTransfer({
        senderId: link.creatorId,
        recipientId: claimerId,
        amount: link.amount,
        currency: link.currency,
        contextType: "payment_link",
        contextId: linkId,
        title: link.note || "Payment link",
        subtitle: `Claimed by ${claimerPhone || claimerId}`,
        metadata: {
          source: "payment_link_claim",
          link_id: linkId,
          link_type: link.type,
        },
      });

      return { success: true, txId: result.txId };
    } catch (err: any) {
      await db("payment_links")
        .update({ status: "pending", recipient_id: null })
        .eq("id", linkId);

      return { success: false, error: err?.message || "Payment transfer failed" };
    }
  }

  return { success: true };
}

export async function cancelPaymentLink(linkId: string, creatorId: string): Promise<boolean> {
  const { data, error } = await db("payment_links")
    .update({ status: "cancelled" })
    .eq("id", linkId)
    .eq("creator_id", creatorId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  return !error && !!data;
}

export function generateShareMessage(link: PaymentLink, senderName: string): string {
  const url = link.shareUrl;
  if (link.type === "invite") {
    return `Hey ${link.recipientName || ""}! ${senderName} wants to send you ${link.amount} ${link.currency} on Easy-Locs. Download the app and claim your payment: ${url}`;
  }
  if (link.type === "request") {
    return `${senderName} is requesting ${link.amount} ${link.currency}${link.note ? ` for "${link.note}"` : ""}. Pay here: ${url}`;
  }
  return `Pay ${senderName} ${link.amount} ${link.currency}: ${url}`;
}
