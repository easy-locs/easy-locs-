import { encryptEnvelope, decryptEnvelope } from "./envelope-crypto";
import { assertDomainIsolation } from "./domain-isolation";

export interface WalletSecureCommand {
  walletId: string;
  referenceId: string;
  action: "authorize" | "capture" | "refund" | "settle";
  amount: number;
  currency: string;
}

export async function sealWalletCommand(cmd: WalletSecureCommand) {
  assertDomainIsolation("wallet", "wallet");

  return encryptEnvelope({
    domain: "wallet",
    plaintext: JSON.stringify(cmd),
    aad: `wallet:${cmd.walletId}:${cmd.referenceId}:${cmd.action}`,
  });
}

export async function openWalletCommand(envelope: Awaited<ReturnType<typeof sealWalletCommand>>): Promise<WalletSecureCommand> {
  const plain = await decryptEnvelope(envelope);
  return JSON.parse(plain) as WalletSecureCommand;
}
