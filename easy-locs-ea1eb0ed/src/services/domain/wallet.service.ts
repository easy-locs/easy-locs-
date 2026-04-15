import { walletRepo } from "@/repositories/domain/wallet.repo";

export async function fetchWalletTransactions(
  userId: string,
  limit = 200
) {
  return walletRepo.listTransactions(userId, limit);
}
