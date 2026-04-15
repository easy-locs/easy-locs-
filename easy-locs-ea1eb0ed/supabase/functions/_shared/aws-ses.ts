import { hasAwsCredentials, getSESClient, SendEmailCommand } from "./aws-sdk-clients.ts";

export function hasSesCredentials(): boolean {
  return hasAwsCredentials();
}

interface SesEmailPayload {
  to: string[];
  subject: string;
  html: string;
  text?: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  attachments?: Array<{ content: string; filename: string; type: string }>;
}

interface SesResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function buildRawMimeMessage(payload: SesEmailPayload): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const rawParts: string[] = [];

  rawParts.push(`From: ${payload.fromName} <${payload.fromEmail}>`);
  rawParts.push(`To: ${payload.to.join(", ")}`);

  const encodedSubject = btoa(unescape(encodeURIComponent(payload.subject)));
  rawParts.push(`Subject: =?UTF-8?B?${encodedSubject}?=`);
  rawParts.push(`Reply-To: ${payload.replyTo}`);
  rawParts.push("MIME-Version: 1.0");
  rawParts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  rawParts.push("");

  rawParts.push(`--${boundary}`);
  rawParts.push("Content-Type: text/html; charset=UTF-8");
  rawParts.push("Content-Transfer-Encoding: 7bit");
  rawParts.push("");
  rawParts.push(payload.html);

  if (payload.attachments) {
    for (const att of payload.attachments) {
      rawParts.push(`--${boundary}`);
      rawParts.push(`Content-Type: ${att.type}; name="${att.filename}"`);
      rawParts.push("Content-Transfer-Encoding: base64");
      rawParts.push(`Content-Disposition: attachment; filename="${att.filename}"`);
      rawParts.push("");
      rawParts.push(att.content);
    }
  }

  rawParts.push(`--${boundary}--`);
  return rawParts.join("\r\n");
}

export async function sendEmailViaSES(payload: SesEmailPayload): Promise<SesResult> {
  if (!hasSesCredentials()) {
    return { success: false, error: "AWS SES credentials not configured" };
  }

  try {
    const client = getSESClient();

    if (payload.attachments?.length) {
      const rawMessage = buildRawMimeMessage(payload);
      const rawBytes = new TextEncoder().encode(rawMessage);

      const command = new SendEmailCommand({
        Content: {
          Raw: {
            Data: rawBytes,
          },
        },
      });

      const result = await client.send(command);
      return { success: true, messageId: result.MessageId };
    }

    const command = new SendEmailCommand({
      FromEmailAddress: `${payload.fromName} <${payload.fromEmail}>`,
      Destination: {
        ToAddresses: payload.to,
      },
      ReplyToAddresses: [payload.replyTo],
      Content: {
        Simple: {
          Subject: { Data: payload.subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: payload.html, Charset: "UTF-8" },
            ...(payload.text ? { Text: { Data: payload.text, Charset: "UTF-8" } } : {}),
          },
        },
      },
    });

    const result = await client.send(command);
    return { success: true, messageId: result.MessageId };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[SES] Send failed:", msg);
    return { success: false, error: msg };
  }
}
