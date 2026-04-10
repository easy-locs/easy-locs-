import type { BackendSecurityContract, SignedEnvelope } from "./types";
import { signPayload, verifySignedPayload } from "./signatures";
import { assertNotReplayed } from "./replay-protection";

export type SignalPayload = Record<string, unknown>;

export async function createSignedSignal(params: {
  signalType: string;
  sessionId: string;
  senderUserId: string;
  receiverUserId: string;
  payload: SignalPayload;
}) {
  return signPayload({
    domain: "signaling",
    keyId: params.sessionId,
    payload: {
      signalType: params.signalType,
      sessionId: params.sessionId,
      senderUserId: params.senderUserId,
      receiverUserId: params.receiverUserId,
      payload: params.payload,
    },
  });
}

export async function verifyIncomingSignal(params: {
  backend: BackendSecurityContract;
  envelope: SignedEnvelope<SignalPayload>;
  signerPublicKeyJwk: JsonWebKey;
}) {
  const ok = await verifySignedPayload(params.envelope, params.signerPublicKeyJwk);
  if (!ok) throw new Error("Invalid signal signature");

  await assertNotReplayed({
    backend: params.backend,
    domain: "signaling",
    nonce: params.envelope.nonce,
  });

  return true;
}
