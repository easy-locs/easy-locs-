/**
 * Notification Event Dispatcher — Wires real platform events to the notification engine.
 * Call these from order flows, claim flows, payment flows, etc.
 */
import { sendNotification, updateLiveStatus } from "./notification-engine";

// ── Order Events ──

export async function notifyOrderCreated(userId: string, orderId: string, shopName: string, amount: number) {
  return sendNotification({
    user_id: userId,
    event_type: "order_confirmed",
    entity_id: orderId,
    entity_type: "order",
    variables: { shop_name: shopName, amount, order_id: orderId, title: "Order Confirmed", body: `Order from ${shopName} — ${amount} AED` },
    dedup_key: `order_created_${orderId}`,
  });
}

export async function notifyNewMessage(receiverId: string, senderName: string, preview: string, conversationId: string) {
  return sendNotification({
    user_id: receiverId,
    event_type: "new_message",
    entity_id: conversationId,
    entity_type: "conversation",
    variables: { sender_name: senderName, preview, title: `Message from ${senderName}`, body: preview || "You received a message" },
    dedup_key: `msg_${conversationId}_${Date.now()}`,
  });
}

export async function notifyWalletCredit(userId: string, amount: number, currency: string, reason: string) {
  return sendNotification({
    user_id: userId,
    event_type: "wallet_received",
    entity_type: "wallet",
    variables: { amount, currency, reason, title: "Payment Received", body: `+${amount} ${currency} — ${reason}` },
    dedup_key: `wallet_credit_${userId}_${Date.now()}`,
  });
}

export async function notifyOrderAccepted(userId: string, orderId: string, shopName: string, etaMin?: number) {
  await updateLiveStatus({
    entity_id: orderId,
    entity_type: "order",
    user_id: userId,
    status_label: "Order Accepted",
    status_subtitle: etaMin ? `ETA ~${etaMin} min` : "Preparing your order",
    status_code: "accepted",
    progress_percent: 25,
    live_step_index: 1,
    live_step_total: 4,
    eta_min: etaMin,
  });
  return sendNotification({
    user_id: userId,
    event_type: "order_accepted",
    entity_id: orderId,
    entity_type: "order",
    variables: { shop_name: shopName, order_id: orderId, eta: etaMin ?? 0 },
    dedup_key: `order_accepted_${orderId}`,
  });
}

export async function notifyOrderReady(userId: string, orderId: string, shopName: string) {
  await updateLiveStatus({
    entity_id: orderId,
    entity_type: "order",
    user_id: userId,
    status_label: "Ready for Pickup",
    status_code: "ready",
    progress_percent: 75,
    live_step_index: 3,
    live_step_total: 4,
  });
  return sendNotification({
    user_id: userId,
    event_type: "order_ready",
    entity_id: orderId,
    entity_type: "order",
    variables: { shop_name: shopName, order_id: orderId },
    dedup_key: `order_ready_${orderId}`,
  });
}

export async function notifyOrderDelivered(userId: string, orderId: string, shopName: string) {
  await updateLiveStatus({
    entity_id: orderId,
    entity_type: "order",
    user_id: userId,
    status_label: "Delivered",
    status_code: "delivered",
    progress_percent: 100,
    live_step_index: 4,
    live_step_total: 4,
  });
  return sendNotification({
    user_id: userId,
    event_type: "order_delivered",
    entity_id: orderId,
    entity_type: "order",
    variables: { shop_name: shopName, order_id: orderId },
    dedup_key: `order_delivered_${orderId}`,
  });
}

// ── Payment Events ──

export async function notifyPaymentSuccess(userId: string, txId: string, amount: number, currency: string) {
  return sendNotification({
    user_id: userId,
    event_type: "payment_success",
    entity_id: txId,
    entity_type: "transaction",
    variables: { amount, currency, tx_id: txId },
    dedup_key: `payment_success_${txId}`,
  });
}

export async function notifyPaymentFailed(userId: string, txId: string, reason: string) {
  return sendNotification({
    user_id: userId,
    event_type: "payment_failed",
    entity_id: txId,
    entity_type: "transaction",
    variables: { reason, tx_id: txId },
    priority_override: "high",
    dedup_key: `payment_failed_${txId}`,
  });
}

// ── Claim Events ──

export async function notifyClaimRequest(adminUserId: string, shopId: string, shopName: string, merchantEmail: string) {
  return sendNotification({
    user_id: adminUserId,
    event_type: "claim_request",
    entity_id: shopId,
    entity_type: "storefront",
    variables: { shop_name: shopName, merchant_email: merchantEmail },
    dedup_key: `claim_request_${shopId}`,
  });
}

export async function notifyClaimApproved(merchantUserId: string, shopId: string, shopName: string) {
  return sendNotification({
    user_id: merchantUserId,
    event_type: "claim_approved",
    entity_id: shopId,
    entity_type: "storefront",
    variables: { shop_name: shopName },
    dedup_key: `claim_approved_${shopId}`,
  });
}

// ── System Events ──

export async function notifyCoherenceIssue(adminUserId: string, entityId: string, entityName: string, conflicts: string[]) {
  return sendNotification({
    user_id: adminUserId,
    event_type: "coherence_issue",
    entity_id: entityId,
    entity_type: "storefront",
    variables: { entity_name: entityName, conflict_count: conflicts.length },
    metadata: { conflicts },
    priority_override: "high",
    dedup_key: `coherence_issue_${entityId}`,
  });
}

export async function notifyAutoFixApplied(adminUserId: string, entityId: string, fixType: string, fixCount: number) {
  return sendNotification({
    user_id: adminUserId,
    event_type: "autofix_applied",
    entity_id: entityId,
    entity_type: "system",
    variables: { fix_type: fixType, fix_count: fixCount },
    dedup_key: `autofix_${entityId}_${fixType}_${Date.now()}`,
  });
}

export async function notifyRecoveryAlert(adminUserId: string, checkName: string, status: string) {
  return sendNotification({
    user_id: adminUserId,
    event_type: "recovery_alert",
    entity_type: "system",
    variables: { check_name: checkName, status },
    priority_override: "critical",
    dedup_key: `recovery_${checkName}_${new Date().toISOString().slice(0, 13)}`,
  });
}
