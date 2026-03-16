/**
 * wallet-export — Transaction CSV export & receipt generation
 * PASS61: Wallet Hardening
 */
import type { WalletTransaction } from "@/hooks/useWallet";

/** Export transactions as CSV download */
export function exportTransactionsCSV(transactions: WalletTransaction[], filename?: string) {
  const headers = [
    "Date", "Reference", "Type", "Direction", "Amount", "Currency",
    "Description", "Status", "Original Amount", "Original Currency", "FX Rate"
  ];

  const rows = transactions.map((tx) => [
    new Date(tx.created_at).toISOString(),
    tx.reference_code || "",
    tx.type,
    tx.direction,
    tx.amount.toString(),
    tx.currency,
    (tx.description || "").replace(/,/g, ";"),
    tx.status,
    tx.original_amount?.toString() || "",
    tx.original_currency || "",
    tx.fx_rate_used?.toString() || "",
  ]);

  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `wallet-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Generate a printable receipt for a single transaction */
export function generateTransactionReceipt(tx: WalletTransaction): string {
  const date = new Date(tx.created_at).toLocaleString();
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       EASY-LOCS RECEIPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reference: ${tx.reference_code || tx.id.slice(0, 12)}
Date:      ${date}
Type:      ${tx.type.toUpperCase()}
Direction: ${tx.direction === "out" ? "SENT" : "RECEIVED"}
Amount:    ${tx.amount} ${tx.currency}
Status:    ${tx.status.toUpperCase()}
${tx.description ? `Note:      ${tx.description}` : ""}
${tx.original_amount ? `Original:  ${tx.original_amount} ${tx.original_currency}` : ""}
${tx.fx_rate_used ? `FX Rate:   ${tx.fx_rate_used}` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Secured by EASY-LOCS®
  PIN Protected • Atomic RPC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
}

/** Print a transaction receipt */
export function printTransactionReceipt(tx: WalletTransaction) {
  const receipt = generateTransactionReceipt(tx);
  const win = window.open("", "_blank", "width=400,height=600");
  if (!win) return;
  win.document.write(`<pre style="font-family:monospace;font-size:14px;padding:20px;">${receipt}</pre>`);
  win.document.close();
  win.print();
}
