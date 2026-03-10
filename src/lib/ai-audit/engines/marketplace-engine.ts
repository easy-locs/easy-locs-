import type { AuditIssue } from "../types";
import { supabase } from "@/integrations/supabase/client";

/** Marketplace audit — listings, providers, booking flow, payment completeness */
export async function runMarketplaceAudit(): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];
  const now = new Date().toISOString();
  let id = 0;
  const uid = () => `mkt-${++id}`;

  try {
    // Check concierge services completeness
    const { data: services } = await supabase
      .from("concierge_services")
      .select("id, title, description, photo_url, price, category, city, country, booking_slug")
      .limit(100);

    if (services) {
      const incomplete = services.filter(
        (s) => !s.description || !s.photo_url || !s.city || !s.country
      );
      if (incomplete.length > 0) {
        issues.push({
          id: uid(), category: "marketplace", severity: "high",
          title: `${incomplete.length} incomplete service listing(s)`,
          description: `Services missing description, photo, or location: ${incomplete.slice(0, 3).map(s => s.title).join(", ")}`,
          suggestedFix: "Complete all service listings with photos, descriptions, and location data.",
          autoFixable: false, businessImpact: "revenue", status: "open", detectedAt: now,
          metadata: { incompleteIds: incomplete.map(s => s.id) },
        });
      }

      const noPriceServices = services.filter((s) => !s.price || s.price <= 0);
      if (noPriceServices.length > 0) {
        issues.push({
          id: uid(), category: "marketplace", severity: "critical",
          title: `${noPriceServices.length} service(s) with no/zero price`,
          description: "Services without valid prices cannot generate revenue.",
          suggestedFix: "Set valid prices for all active services.",
          autoFixable: false, businessImpact: "revenue", status: "open", detectedAt: now,
        });
      }

      const noSlug = services.filter((s) => !s.booking_slug);
      if (noSlug.length > 0) {
        issues.push({
          id: uid(), category: "marketplace", severity: "medium",
          title: `${noSlug.length} service(s) missing booking slug`,
          description: "Services without booking slugs cannot be shared via direct links.",
          suggestedFix: "Generate booking slugs for all services.",
          autoFixable: true, businessImpact: "revenue", status: "open", detectedAt: now,
        });
      }
    }

    // Check orders with stuck statuses
    const { data: stuckOrders } = await supabase
      .from("concierge_orders")
      .select("id, status, payment_status, created_at")
      .eq("status", "pending")
      .limit(50);

    if (stuckOrders && stuckOrders.length > 10) {
      issues.push({
        id: uid(), category: "marketplace", severity: "high",
        title: `${stuckOrders.length} orders stuck in "pending"`,
        description: "Many orders remain unprocessed, indicating a potential workflow bottleneck.",
        suggestedFix: "Review and process pending orders or set up auto-expiration rules.",
        autoFixable: false, businessImpact: "revenue", status: "open", detectedAt: now,
      });
    }

    // Check payment completion rate
    const { data: paidOrders } = await supabase
      .from("concierge_orders")
      .select("id")
      .eq("payment_status", "paid")
      .limit(1000);

    const { data: allOrders } = await supabase
      .from("concierge_orders")
      .select("id")
      .limit(1000);

    if (allOrders && allOrders.length > 5) {
      const rate = ((paidOrders?.length || 0) / allOrders.length) * 100;
      if (rate < 50) {
        issues.push({
          id: uid(), category: "marketplace", severity: "high",
          title: `Low payment completion rate: ${rate.toFixed(0)}%`,
          description: "Less than 50% of orders are paid. Check payment flow friction.",
          suggestedFix: "Review payment methods, add payment reminders, and simplify checkout.",
          autoFixable: false, businessImpact: "revenue", status: "open", detectedAt: now,
          metadata: { rate, total: allOrders.length, paid: paidOrders?.length || 0 },
        });
      }
    }

  } catch (err) {
    issues.push({
      id: uid(), category: "marketplace", severity: "low",
      title: "Marketplace audit data access error",
      description: "Could not query marketplace data. User may not be authenticated.",
      autoFixable: false, businessImpact: "performance", status: "open", detectedAt: now,
    });
  }

  return issues;
}
