import { platformBus } from "@/lib/shared/platform-bus";

export interface SellerDashboardMetrics {
  sellerId: string;
  orgId: string | null;
  period: "today" | "week" | "month" | "year";
  totalRevenue: number;
  totalOrders: number;
  totalBookings: number;
  averageOrderValue: number;
  conversionRate: number;
  responseTimeMinutes: number;
  rating: number;
  reviewCount: number;
  activeListings: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
  pendingPayouts: number;
  completedPayouts: number;
  currency: string;
}

export interface CatalogStats {
  totalProducts: number;
  activeProducts: number;
  draftProducts: number;
  outOfStockProducts: number;
  pendingReviewProducts: number;
}

export interface PerformanceMetrics {
  sellerId: string;
  responseTimeP50: number;
  responseTimeP95: number;
  fulfillmentRate: number;
  cancellationRate: number;
  refundRate: number;
  ratingTrend: number[];
  revenueTrend: number[];
}

export interface PayoutRecord {
  payoutId: string;
  sellerId: string;
  amount: number;
  currency: string;
  commissionDeducted: number;
  netPayout: number;
  status: "pending" | "processing" | "completed" | "failed";
  periodStart: string;
  periodEnd: string;
  transactionIds: string[];
}

export type SellerLevel = "new" | "active" | "trusted" | "premium" | "top_seller";

export function calculateSellerLevel(metrics: SellerDashboardMetrics): SellerLevel {
  if (metrics.totalOrders < 5) return "new";
  if (metrics.rating < 3.5 || metrics.cancellationRate > 0.15) return "active";
  if (metrics.totalOrders >= 100 && metrics.rating >= 4.5 && metrics.responseTimeMinutes <= 15) return "top_seller";
  if (metrics.totalOrders >= 50 && metrics.rating >= 4.0 && metrics.responseTimeMinutes <= 30) return "premium";
  if (metrics.rating >= 3.5 && metrics.totalOrders >= 10) return "trusted";
  return "active";
}

export function calculatePayout(
  transactions: Array<{ amount: number; commissionRate: number }>,
  currency: string
): { grossAmount: number; totalCommission: number; netPayout: number } {
  let grossAmount = 0;
  let totalCommission = 0;
  for (const tx of transactions) {
    grossAmount += tx.amount;
    totalCommission += tx.amount * tx.commissionRate;
  }
  return { grossAmount, totalCommission, netPayout: grossAmount - totalCommission };
}

export function emitPayoutCompleted(sellerId: string, amount: number, currency: string): void {
  platformBus.emit("wallet:transfer_completed", {
    sellerId,
    amount,
    currency,
    type: "seller_payout",
    timestamp: Date.now(),
  }, "seller-os");
  platformBus.emit("dashboard:counters_refresh", {}, "seller-os");
}

export function emitSellerMilestone(sellerId: string, milestone: string): void {
  platformBus.emit("storefront:growth_milestone", {
    sellerId,
    milestone,
    timestamp: Date.now(),
  }, "seller-os");
  platformBus.emit("notification:created", {
    recipientId: sellerId,
    type: "seller_milestone",
    title: "Milestone reached!",
    body: `Congratulations! You reached: ${milestone}`,
    route: "/me/shop",
  }, "seller-os");
}

export function emitLowStockAlert(sellerId: string, productId: string, productName: string, remaining: number): void {
  platformBus.emit("marketplace:stock_updated", {
    sellerId,
    productId,
    title: productName,
    quantity: remaining,
  }, "seller-os");
}
