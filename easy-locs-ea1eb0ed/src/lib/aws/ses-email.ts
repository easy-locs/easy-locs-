import { db } from "@/services/db";

export interface SesEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
  }>;
}

export interface SesEmailResult {
  success: boolean;
  messageId?: string;
  provider: "ses" | "sendgrid";
  error?: string;
}

export async function sendViaSES(params: SesEmailParams): Promise<SesEmailResult> {
  const { data, error } = await db.functions.invoke("send-email", {
    body: {
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      from_name: params.fromName,
      attachments: params.attachments,
    },
  });

  if (error) {
    return { success: false, provider: "sendgrid", error: error.message };
  }

  return {
    success: data?.success === true,
    messageId: data?.messageId,
    provider: data?.provider || "sendgrid",
    error: data?.error,
  };
}
