import { generateTransactions } from "./generate-dld-transactions";

self.onmessage = (_e: MessageEvent) => {
  const transactions = generateTransactions();
  self.postMessage(transactions);
};
