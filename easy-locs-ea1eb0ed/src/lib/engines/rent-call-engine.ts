import type { Lease } from "@/domains/real-estate/canonical-types";
import type { CurrencyCode } from "@/domains/shared/canonical-types";
import { isRentReceiptMandatory } from "@/domains/real-estate/country-rules";
import { platformBus } from "@/lib/shared/platform-bus";

export type RentCallStatus = "pending" | "paid" | "partial" | "overdue" | "cancelled" | "waived";

export interface RentCall {
  id: string;
  leaseId: string;
  propertyId: string;
  tenantId: string;
  landlordId: string;
  periodLabel: string;
  dueDate: string;
  amount: number;
  chargesAmount: number;
  totalAmount: number;
  currency: CurrencyCode;
  status: RentCallStatus;
  paidAmount: number;
  paidAt?: string;
  paymentMethod?: "wallet" | "bank_transfer" | "card" | "cash" | "sepa";
  reminderCount: number;
  lastReminderAt?: string;
  createdAt: string;
}

export interface RentCallGenerationResult {
  calls: Omit<RentCall, "id" | "createdAt">[];
  totalExpected: number;
  periodCount: number;
}

function formatPeriodLabel(date: Date, cycle: string): string {
  const month = date.toLocaleString("en", { month: "long" });
  const year = date.getFullYear();
  if (cycle === "monthly") return `${month} ${year}`;
  if (cycle === "quarterly") return `Q${Math.ceil((date.getMonth() + 1) / 3)} ${year}`;
  if (cycle === "semi_annual") return `H${date.getMonth() < 6 ? 1 : 2} ${year}`;
  return `${year}`;
}

function computeCycleAmount(monthlyRent: number, cycle: string): number {
  if (cycle === "quarterly") return monthlyRent * 3;
  if (cycle === "semi_annual") return monthlyRent * 6;
  if (cycle === "annual") return monthlyRent * 12;
  return monthlyRent;
}

function getNextDueDate(start: Date, index: number, cycle: string): Date {
  const d = new Date(start);
  if (cycle === "monthly") d.setMonth(d.getMonth() + index);
  else if (cycle === "quarterly") d.setMonth(d.getMonth() + index * 3);
  else if (cycle === "semi_annual") d.setMonth(d.getMonth() + index * 6);
  else d.setFullYear(d.getFullYear() + index);
  return d;
}

export function generateRentCalls(
  lease: Lease,
  chargesAmount = 0,
): RentCallGenerationResult {
  const start = new Date(lease.startDate);
  const end = new Date(lease.endDate);
  const cycle = lease.paymentCycle;
  const cycleAmount = computeCycleAmount(lease.rentAmount, cycle);
  const calls: Omit<RentCall, "id" | "createdAt">[] = [];

  let index = 0;
  while (true) {
    const dueDate = getNextDueDate(start, index, cycle);
    if (dueDate >= end) break;

    calls.push({
      leaseId: lease.id,
      propertyId: lease.propertyId,
      tenantId: lease.tenantId,
      landlordId: lease.landlordId,
      periodLabel: formatPeriodLabel(dueDate, cycle),
      dueDate: dueDate.toISOString().split("T")[0],
      amount: cycleAmount,
      chargesAmount,
      totalAmount: cycleAmount + chargesAmount,
      currency: lease.currency,
      status: "pending",
      paidAmount: 0,
      reminderCount: 0,
    });

    index++;
    if (index > 120) break;
  }

  return {
    calls,
    totalExpected: calls.reduce((s, c) => s + c.totalAmount, 0),
    periodCount: calls.length,
  };
}

export function markRentCallPaid(
  call: RentCall,
  amount: number,
  method: RentCall["paymentMethod"] = "wallet",
  countryCode = "XX",
): { updatedCall: Partial<RentCall>; receiptRequired: boolean; events: string[] } {
  const events: string[] = [];
  const now = new Date().toISOString();
  const newPaidAmount = call.paidAmount + amount;
  const isFullyPaid = newPaidAmount >= call.totalAmount;

  const updatedCall: Partial<RentCall> = {
    paidAmount: newPaidAmount,
    status: isFullyPaid ? "paid" : "partial",
    paidAt: now,
    paymentMethod: method,
  };

  if (isFullyPaid) {
    events.push("pm:payment_received");
    platformBus.emit("pm:payment_received", {
      paymentId: `rent_${call.leaseId}_${call.periodLabel}`,
      leaseId: call.leaseId,
      tenantId: call.tenantId,
      tenantOrbitId: call.tenantId,
      ownerOrbitId: call.landlordId,
      landlordId: call.landlordId,
      amount: call.totalAmount,
      currency: "AED",
      period: call.periodLabel,
      status: "paid",
      full: true,
    }, "pm");
  } else {
    events.push("pm:payment_received");
    platformBus.emit("pm:payment_received", {
      paymentId: `rent_${call.leaseId}_${call.periodLabel}_partial`,
      leaseId: call.leaseId,
      tenantId: call.tenantId,
      tenantOrbitId: call.tenantId,
      ownerOrbitId: call.landlordId,
      landlordId: call.landlordId,
      paidAmount: newPaidAmount,
      amount: newPaidAmount,
      currency: "AED",
      remaining: call.totalAmount - newPaidAmount,
      period: call.periodLabel,
      status: "partial",
      full: false,
    }, "pm");
  }

  const receiptRequired = isFullyPaid && isRentReceiptMandatory(countryCode);

  return { updatedCall, receiptRequired, events };
}

export function computeOverdueStatus(call: RentCall): {
  isOverdue: boolean;
  daysPastDue: number;
  severity: "none" | "warning" | "late" | "critical";
} {
  if (call.status === "paid" || call.status === "cancelled" || call.status === "waived") {
    return { isOverdue: false, daysPastDue: 0, severity: "none" };
  }

  const now = new Date();
  const due = new Date(call.dueDate);
  const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

  if (diff <= 0) return { isOverdue: false, daysPastDue: 0, severity: "none" };
  if (diff <= 5) return { isOverdue: true, daysPastDue: diff, severity: "warning" };
  if (diff <= 15) return { isOverdue: true, daysPastDue: diff, severity: "late" };
  return { isOverdue: true, daysPastDue: diff, severity: "critical" };
}

export function shouldSendReminder(call: RentCall): { send: boolean; channel: "push" | "orbit" | "both" } {
  if (call.status === "paid" || call.status === "cancelled") return { send: false, channel: "push" };

  const now = new Date();
  const due = new Date(call.dueDate);
  const daysUntilDue = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilDue <= 3 && daysUntilDue > 0 && call.reminderCount === 0) {
    return { send: true, channel: "push" };
  }

  if (daysUntilDue <= 0 && call.reminderCount < 3) {
    return { send: true, channel: "both" };
  }

  const { severity } = computeOverdueStatus(call);
  if (severity === "critical" && call.reminderCount < 5) {
    return { send: true, channel: "both" };
  }

  return { send: false, channel: "push" };
}
