export type SplitBillRow = {
  id: string;
  name: string;
  amount: number;
};

export function splitAmountEvenly(total: number, people: number): SplitBillRow[] {
  if (people <= 0) return [];

  const each = Number((total / people).toFixed(2));
  return Array.from({ length: people }).map((_, i) => ({
    id: `p-${i + 1}`,
    name: `Guest ${i + 1}`,
    amount: each,
  }));
}
