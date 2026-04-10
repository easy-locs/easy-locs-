export function toIsoDate(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

export function enumerateDates(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  let cur = startDate;
  while (cur < endDate) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

export function startOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
