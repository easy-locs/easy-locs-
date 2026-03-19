import { encryptEnvelope, decryptEnvelope } from "./envelope-crypto";
import { assertDomainIsolation } from "./domain-isolation";

export interface UltraEncryptedChatMessage {
  conversationId: string;
  senderDeviceId: string;
  envelope: Awaited<ReturnType<typeof encryptEnvelope>>;
  sentAt: string;
}

export async function encryptUltraChatMessage(params: {
  conversationId: string;
  senderDeviceId: string;
  plaintext: string;
}): Promise<UltraEncryptedChatMessage> {
  assertDomainIsolation("chat", "chat");

  const envelope = await encryptEnvelope({
    domain: "chat",
    plaintext: params.plaintext,
    aad: `chat:${params.conversationId}:${params.senderDeviceId}`,
  });

  return {
    conversationId: params.conversationId,
    senderDeviceId: params.senderDeviceId,
    envelope,
    sentAt: new Date().toISOString(),
  };
}

export async function decryptUltraChatMessage(msg: UltraEncryptedChatMessage): Promise<string> {
  return decryptEnvelope(msg.envelope);
}
