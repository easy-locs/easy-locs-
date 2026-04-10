import type { CurrencyCode } from "@/domains/shared/canonical-types";
import { platformBus } from "@/lib/shared/platform-bus";
import type { RentCall } from "./rent-call-engine";
import { markRentCallPaid, computeOverdueStatus } from "./rent-call-engine";

export type PaymentChannel = "wallet" | "bank_transfer" | "card" | "cash" | "sepa";
export type PaymentPlanType = "full" | "split_2" | "split_3" | "split_4" | "custom";

export interface PaymentPlan {
  type: PaymentPlanType;
  installments: PaymentInstallment[];
  totalAmount: number;
  currency: CurrencyCode;
}

export interface PaymentInstallment {
  index: number;
  amount: number;
  dueDate: string;
  status: "pending" | "paid" | "overdue" | "failed";
  paidAt?: string;
  transactionId?: string;
}

export interface PaymentProcessResult {
  success: boolean;
  transactionId: string;
  updatedCall: Partial<RentCall>;
  receiptRequired: boolean;
  events: string[];
  walletDebitAmount: number;
  landlordCreditAmount: number;
  platformFee: number;
  lateFee: number;
}

export interface LatePaymentPolicy {
  gracePeriodDays: number;
  lateFeeType: "fixed" | "percentage" | "none";
  lateFeeAmount: number;
  maxLateFeePercent: number;
  escalationDays: number[];
}

const DEFAULT_LATE_POLICY: LatePaymentPolicy = {
  gracePeriodDays: 5,
  lateFeeType: "none",
  lateFeeAmount: 0,
  maxLateFeePercent: 10,
  escalationDays: [5, 15, 30, 60],
};

const PLATFORM_FEE_PERCENT = 1.5;

function generateTransactionId(): string {
  return `txn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function computeLateFee(call: RentCall, policy: LatePaymentPolicy = DEFAULT_LATE_POLICY): number {
  const { daysPastDue } = computeOverdueStatus(call);
  if (daysPastDue <= policy.gracePeriodDays || policy.lateFeeType === "none") return 0;

  if (policy.lateFeeType === "fixed") return policy.lateFeeAmount;

  if (policy.lateFeeType === "percentage") {
    const fee = call.totalAmount * (policy.lateFeeAmount / 100);
    const cap = call.totalAmount * (policy.maxLateFeePercent / 100);
    return Math.min(fee, cap);
  }

  return 0;
}

export function createPaymentPlan(
  call: RentCall,
  splitType: PaymentPlanType = "full",
): PaymentPlan {
  const splitMap: Record<PaymentPlanType, number> = {
    full: 1,
    split_2: 2,
    split_3: 3,
    split_4: 4,
    custom: 1,
  };

  const count = splitMap[splitType];
  const perInstallment = Math.round((call.totalAmount / count) * 100) / 100;
  const remainder = Math.round((call.totalAmount - perInstallment * count) * 100) / 100;

  const installments: PaymentInstallment[] = [];
  const baseDate = new Date(call.dueDate);

  for (let i = 0; i < count; i++) {
    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + i * 15);

    installments.push({
      index: i,
      amount: i === 0 ? perInstallment + remainder : perInstallment,
      dueDate: dueDate.toISOString().split("T")[0],
      status: "pending",
    });
  }

  return {
    type: splitType,
    installments,
    totalAmount: call.totalAmount,
    currency: call.currency,
  };
}

export function processRentPayment(
  call: RentCall,
  amount: number,
  channel: PaymentChannel = "wallet",
  countryCode = "XX",
  latePolicy: LatePaymentPolicy = DEFAULT_LATE_POLICY,
): PaymentProcessResult {
  if (amount <= 0) {
    return {
      success: false, transactionId: "", updatedCall: {}, receiptRequired: false,
      events: ["rent.payment_rejected"], walletDebitAmount: 0, landlordCreditAmount: 0, platformFee: 0, lateFee: 0,
    };
  }

  const outstanding = call.totalAmount - call.paidAmount;
  const cappedAmount = Math.min(amount, outstanding);
  const transactionId = generateTransactionId();
  const lateFee = computeLateFee(call, latePolicy);
  const effectiveAmount = cappedAmount;

  const platformFee = Math.round(effectiveAmount * (PLATFORM_FEE_PERCENT / 100) * 100) / 100;
  const landlordCreditAmount = effectiveAmount - platformFee;

  const { updatedCall, receiptRequired, events } = markRentCallPaid(call, effectiveAmount, channel, countryCode);

  if (channel === "wallet") {
    platformBus.emit("wallet.debit", {
      userId: call.tenantId,
      amount: effectiveAmount + lateFee,
      currency: call.currency,
      reference: `rent_${call.leaseId}_${call.periodLabel}`,
      transactionId,
    });

    platformBus.emit("wallet.credit", {
      userId: call.landlordId,
      amount: landlordCreditAmount,
      currency: call.currency,
      reference: `rent_income_${call.leaseId}_${call.periodLabel}`,
      transactionId,
    });
  }

  if (lateFee > 0) {
    events.push("rent.late_fee_applied");
    platformBus.emit("rent.late_fee_applied", {
      tenantId: call.tenantId,
      leaseId: call.leaseId,
      lateFee,
      period: call.periodLabel,
    });
  }

  platformBus.emit("orbit.notify", {
    userId: call.landlordId,
    type: "rent_received",
    title: "Rent received",
    body: `Payment of ${effectiveAmount} ${call.currency} for ${call.periodLabel}`,
    data: { leaseId: call.leaseId, transactionId },
  });

  return {
    success: true,
    transactionId,
    updatedCall,
    receiptRequired,
    events,
    walletDebitAmount: effectiveAmount + lateFee,
    landlordCreditAmount,
    platformFee,
    lateFee,
  };
}

export function getPaymentSummary(calls: RentCall[]): {
  totalDue: number;
  totalPaid: number;
  totalOverdue: number;
  overdueCount: number;
  paidCount: number;
  pendingCount: number;
  partialCount: number;
  collectionRate: number;
} {
  let totalDue = 0, totalPaid = 0, totalOverdue = 0;
  let overdueCount = 0, paidCount = 0, pendingCount = 0, partialCount = 0;

  for (const call of calls) {
    totalDue += call.totalAmount;
    totalPaid += call.paidAmount;

    if (call.status === "paid") paidCount++;
    else if (call.status === "partial") partialCount++;
    else if (call.status === "overdue") { overdueCount++; totalOverdue += call.totalAmount - call.paidAmount; }
    else if (call.status === "pending") {
      const { isOverdue } = computeOverdueStatus(call);
      if (isOverdue) { overdueCount++; totalOverdue += call.totalAmount - call.paidAmount; }
      else pendingCount++;
    }
  }

  const collectionRate = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100 * 10) / 10 : 0;

  return { totalDue, totalPaid, totalOverdue, overdueCount, paidCount, pendingCount, partialCount, collectionRate };
}
