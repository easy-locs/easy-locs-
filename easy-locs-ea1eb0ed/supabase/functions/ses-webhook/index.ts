import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { X509Certificate } from "npm:@peculiar/x509@1.11.0";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const ALLOWED_TOPIC_ARN_PREFIX = Deno.env.get("AWS_SNS_TOPIC_ARN_PREFIX") || "";
const AWS_ACCOUNT_ID = Deno.env.get("AWS_ACCOUNT_ID") || "";
const SNS_CERT_CACHE = new Map<string, CryptoKey>();

interface SnsMessage {
  Type: string;
  MessageId: string;
  TopicArn: string;
  Message: string;
  SubscribeURL?: string;
  Timestamp: string;
  Token?: string;
  Signature: string;
  SignatureVersion: string;
  SigningCertURL?: string;
  SigningCertUrl?: string;
  Subject?: string;
}

interface SesBounce {
  bounceType: string;
  bounceSubType: string;
  bouncedRecipients: Array<{ emailAddress: string; status?: string; diagnosticCode?: string }>;
  timestamp: string;
  feedbackId: string;
}

interface SesComplaint {
  complainedRecipients: Array<{ emailAddress: string }>;
  complaintFeedbackType: string;
  timestamp: string;
  feedbackId: string;
}

interface SesDelivery {
  recipients: string[];
  timestamp: string;
  processingTimeMillis: number;
  smtpResponse: string;
}

interface SesNotification {
  notificationType: "Bounce" | "Complaint" | "Delivery";
  mail: {
    messageId: string;
    source: string;
    timestamp: string;
    destination: string[];
  };
  bounce?: SesBounce;
  complaint?: SesComplaint;
  delivery?: SesDelivery;
}

interface EmailDeliveryEventRow {
  event_type: string;
  email_address: string;
  message_id: string;
  bounce_type?: string;
  bounce_sub_type?: string;
  diagnostic_code?: string | null;
  complaint_type?: string;
  feedback_id?: string;
  smtp_response?: string;
  processing_time_ms?: number;
  is_permanent: boolean;
  raw_event: SesNotification;
  created_at: string;
}

interface EmailSuppressionRow {
  email_address: string;
  reason: string;
  bounce_type?: string;
  bounce_sub_type?: string;
  complaint_type?: string;
  suppressed_at: string;
}

function getSigningString(msg: SnsMessage): string {
  const fields: string[] = [];

  if (msg.Type === "Notification") {
    fields.push("Message", msg.Message);
    fields.push("MessageId", msg.MessageId);
    if (msg.Subject) {
      fields.push("Subject", msg.Subject);
    }
    fields.push("Timestamp", msg.Timestamp);
    fields.push("TopicArn", msg.TopicArn);
    fields.push("Type", msg.Type);
  } else if (msg.Type === "SubscriptionConfirmation" || msg.Type === "UnsubscribeConfirmation") {
    fields.push("Message", msg.Message);
    fields.push("MessageId", msg.MessageId);
    fields.push("SubscribeURL", msg.SubscribeURL || "");
    fields.push("Timestamp", msg.Timestamp);
    fields.push("Token", msg.Token || "");
    fields.push("TopicArn", msg.TopicArn);
    fields.push("Type", msg.Type);
  }

  return fields.map(f => f + "\n").join("");
}

function isValidSnsCertUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.endsWith(".amazonaws.com") &&
      parsed.pathname.endsWith(".pem")
    );
  } catch {
    return false;
  }
}

async function getPublicKey(certUrl: string): Promise<CryptoKey> {
  const cached = SNS_CERT_CACHE.get(certUrl);
  if (cached) return cached;

  const resp = await fetch(certUrl);
  if (!resp.ok) throw new Error(`Failed to fetch SNS cert from ${certUrl}`);
  const pem = await resp.text();

  const cert = new X509Certificate(pem);
  const publicKey = await cert.publicKey.export(
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-1" } as RsaHashedImportParams,
    ["verify"],
  );

  SNS_CERT_CACHE.set(certUrl, publicKey);
  return publicKey;
}

async function verifySnsSignature(msg: SnsMessage): Promise<boolean> {
  if (msg.SignatureVersion !== "1") {
    console.warn("[ses-webhook] Unsupported signature version:", msg.SignatureVersion);
    return false;
  }

  const certUrl = msg.SigningCertURL || msg.SigningCertUrl || "";
  if (!isValidSnsCertUrl(certUrl)) {
    console.warn("[ses-webhook] Invalid SNS cert URL:", certUrl);
    return false;
  }

  try {
    const publicKey = await getPublicKey(certUrl);
    const signingString = getSigningString(msg);
    const signatureBytes = Uint8Array.from(atob(msg.Signature), c => c.charCodeAt(0));
    const dataBytes = new TextEncoder().encode(signingString);

    return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, signatureBytes, dataBytes);
  } catch (e) {
    console.error("[ses-webhook] Signature verification error:", e);
    return false;
  }
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body = await req.text();
    const snsMessage: SnsMessage = JSON.parse(body);

    if (!ALLOWED_TOPIC_ARN_PREFIX && !AWS_ACCOUNT_ID) {
      console.error("[ses-webhook] Neither AWS_SNS_TOPIC_ARN_PREFIX nor AWS_ACCOUNT_ID is set — cannot validate topic origin");
      return new Response(JSON.stringify({ error: "Webhook topic validation not configured" }), { status: 503, headers: { "Content-Type": "application/json" } });
    }

    const topicArn = snsMessage.TopicArn || "";
    const topicAllowed = ALLOWED_TOPIC_ARN_PREFIX
      ? topicArn.startsWith(ALLOWED_TOPIC_ARN_PREFIX)
      : topicArn.includes(`:${AWS_ACCOUNT_ID}:`);

    if (!topicAllowed) {
      console.warn("[ses-webhook] Rejected message from unknown topic:", topicArn);
      return new Response("Forbidden", { status: 403 });
    }

    if (!snsMessage.Signature || !snsMessage.SignatureVersion) {
      console.warn("[ses-webhook] Missing SNS signature, rejecting:", snsMessage.MessageId);
      return new Response("Missing signature", { status: 403 });
    }

    const valid = await verifySnsSignature(snsMessage);
    if (!valid) {
      console.warn("[ses-webhook] SNS signature verification failed for:", snsMessage.MessageId);
      return new Response("Invalid signature", { status: 403 });
    }

    if (snsMessage.Type === "SubscriptionConfirmation" && snsMessage.SubscribeURL) {
      console.log("[ses-webhook] Confirming SNS subscription:", snsMessage.TopicArn);
      await fetch(snsMessage.SubscribeURL);
      return new Response(JSON.stringify({ confirmed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (snsMessage.Type !== "Notification") {
      return new Response(JSON.stringify({ skipped: true, type: snsMessage.Type }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notification: SesNotification = JSON.parse(snsMessage.Message);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    async function insertDeliveryEvent(row: EmailDeliveryEventRow): Promise<void> {
      const { error } = await supabase.from("email_delivery_events").insert(row);
      if (error) console.warn("[ses-webhook] delivery event insert error:", error.message);
    }

    async function upsertSuppression(row: EmailSuppressionRow): Promise<void> {
      const { error } = await supabase.from("email_suppressions").upsert(row, { onConflict: "email_address" });
      if (error) console.warn("[ses-webhook] suppression upsert error:", error.message);
    }

    if (notification.notificationType === "Bounce" && notification.bounce) {
      const bounce = notification.bounce;
      const isPermanent = bounce.bounceType === "Permanent";

      for (const recipient of bounce.bouncedRecipients) {
        await insertDeliveryEvent({
          event_type: "bounce",
          email_address: recipient.emailAddress.toLowerCase(),
          message_id: notification.mail.messageId,
          bounce_type: bounce.bounceType,
          bounce_sub_type: bounce.bounceSubType,
          diagnostic_code: recipient.diagnosticCode || null,
          feedback_id: bounce.feedbackId,
          is_permanent: isPermanent,
          raw_event: notification,
          created_at: bounce.timestamp,
        });

        if (isPermanent) {
          await upsertSuppression({
            email_address: recipient.emailAddress.toLowerCase(),
            reason: "bounce",
            bounce_type: bounce.bounceType,
            bounce_sub_type: bounce.bounceSubType,
            suppressed_at: bounce.timestamp,
          });
        }
      }

      console.log(`[ses-webhook] Processed ${bounce.bounceType} bounce for ${bounce.bouncedRecipients.length} recipients`);
    }

    if (notification.notificationType === "Complaint" && notification.complaint) {
      const complaint = notification.complaint;

      for (const recipient of complaint.complainedRecipients) {
        await insertDeliveryEvent({
          event_type: "complaint",
          email_address: recipient.emailAddress.toLowerCase(),
          message_id: notification.mail.messageId,
          complaint_type: complaint.complaintFeedbackType,
          feedback_id: complaint.feedbackId,
          is_permanent: true,
          raw_event: notification,
          created_at: complaint.timestamp,
        });

        await upsertSuppression({
          email_address: recipient.emailAddress.toLowerCase(),
          reason: "complaint",
          complaint_type: complaint.complaintFeedbackType,
          suppressed_at: complaint.timestamp,
        });
      }

      console.log(`[ses-webhook] Processed complaint for ${complaint.complainedRecipients.length} recipients`);
    }

    if (notification.notificationType === "Delivery" && notification.delivery) {
      const delivery = notification.delivery;

      for (const recipient of delivery.recipients) {
        await insertDeliveryEvent({
          event_type: "delivery",
          email_address: recipient.toLowerCase(),
          message_id: notification.mail.messageId,
          smtp_response: delivery.smtpResponse,
          processing_time_ms: delivery.processingTimeMillis,
          is_permanent: false,
          raw_event: notification,
          created_at: delivery.timestamp,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, type: notification.notificationType }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: unknown) {
    console.error("[ses-webhook] Error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
