import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuditIssue {
  id: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  businessImpact: string;
  suggestedFix?: string;
  autoFixable: boolean;
  location?: string;
}

const SEVERITY_WEIGHTS: Record<string, number> = {
  critical: 25, high: 15, medium: 8, low: 3, info: 0,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth guard: only service role key or dedicated cron secret allowed
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    const cronSecret = Deno.env.get("CRON_SECRET") || "";
    if (token !== serviceRoleKey && (cronSecret === "" || token !== cronSecret)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const issues: AuditIssue[] = [];
    let issueCounter = 0;
    const makeId = () => `sched-${++issueCounter}`;

    // ─── 1. Data Quality: Properties without photos ───
    const { data: propsNoPhotos } = await supabase
      .from("properties")
      .select("id, label")
      .or("photo_urls.is.null,photo_urls.eq.[]")
      .limit(50);

    if (propsNoPhotos && propsNoPhotos.length > 0) {
      issues.push({
        id: makeId(), category: "data_quality", severity: propsNoPhotos.length > 10 ? "high" : "medium",
        title: `${propsNoPhotos.length} properties without photos`,
        description: "Properties without photos have 60% less engagement.",
        businessImpact: "conversion", suggestedFix: "Add at least 3 photos per property.", autoFixable: false,
      });
    }

    // ─── 2. Stale bookings (pending > 7 days) ───
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: staleBookings } = await supabase
      .from("booking_requests")
      .select("id")
      .eq("status", "pending")
      .lt("created_at", sevenDaysAgo)
      .limit(100);

    if (staleBookings && staleBookings.length > 0) {
      issues.push({
        id: makeId(), category: "booking", severity: staleBookings.length > 5 ? "high" : "medium",
        title: `${staleBookings.length} stale booking requests (>7 days)`,
        description: "Pending bookings older than 7 days hurt guest experience.",
        businessImpact: "revenue", suggestedFix: "Review and respond to pending bookings.", autoFixable: false,
      });
    }

    // ─── 3. Concierge orders stuck ───
    const { data: stuckOrders } = await supabase
      .from("concierge_orders")
      .select("id")
      .in("status", ["pending", "awaiting_payment"])
      .lt("created_at", sevenDaysAgo)
      .limit(100);

    if (stuckOrders && stuckOrders.length > 0) {
      issues.push({
        id: makeId(), category: "marketplace", severity: "medium",
        title: `${stuckOrders.length} stuck concierge orders`,
        description: "Orders pending for over 7 days may indicate payment or communication issues.",
        businessImpact: "revenue", suggestedFix: "Follow up with guests or cancel stale orders.", autoFixable: false,
      });
    }

    // ─── 4. Leases expiring soon (30 days) ───
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];
    const { data: expiringLeases } = await supabase
      .from("leases")
      .select("id")
      .eq("status", "active")
      .not("end_date", "is", null)
      .lte("end_date", thirtyDaysFromNow)
      .gte("end_date", today)
      .limit(50);

    if (expiringLeases && expiringLeases.length > 0) {
      issues.push({
        id: makeId(), category: "content", severity: expiringLeases.length > 3 ? "high" : "medium",
        title: `${expiringLeases.length} leases expiring within 30 days`,
        description: "Upcoming lease expirations require renewal or tenant transition planning.",
        businessImpact: "revenue", suggestedFix: "Review expiring leases and initiate renewal process.", autoFixable: false,
      });
    }

    // ─── 5. Unread notifications (>100) ───
    const { count: unreadCount } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("read", false);

    if (unreadCount && unreadCount > 100) {
      issues.push({
        id: makeId(), category: "communication", severity: "medium",
        title: `${unreadCount} unread notifications platform-wide`,
        description: "High unread notification count suggests users aren't engaging with alerts.",
        businessImpact: "usability", suggestedFix: "Review notification relevance and delivery settings.", autoFixable: false,
      });
    }

    // ─── 6. Tenants without user accounts ───
    const { data: orphanTenants } = await supabase
      .from("tenants")
      .select("id")
      .is("tenant_user_id", null)
      .limit(100);

    if (orphanTenants && orphanTenants.length > 0) {
      issues.push({
        id: makeId(), category: "data_quality", severity: orphanTenants.length > 10 ? "high" : "low",
        title: `${orphanTenants.length} tenants without linked accounts`,
        description: "Tenants without accounts can't access the tenant portal.",
        businessImpact: "usability", suggestedFix: "Send tenant invitations to link accounts.", autoFixable: false,
      });
    }

    // ─── 7. Marketplace services without photos ───
    const { data: servicesNoPhotos } = await supabase
      .from("marketplace_services")
      .select("id")
      .eq("active", true)
      .or("photo_urls.is.null,photo_urls.eq.[]")
      .limit(50);

    if (servicesNoPhotos && servicesNoPhotos.length > 0) {
      issues.push({
        id: makeId(), category: "marketplace", severity: "medium",
        title: `${servicesNoPhotos.length} active services without photos`,
        description: "Services without photos convert 40% less.",
        businessImpact: "conversion", suggestedFix: "Add cover photos to marketplace services.", autoFixable: false,
      });
    }

    // ─── Compute scores ───
    const categories = [
      "ui_ux", "seo", "technical", "marketplace", "international",
      "conversion", "communication", "security", "brand", "data_quality",
      "analytics", "mobile", "payment", "booking", "content",
    ];

    const CATEGORY_LABELS: Record<string, string> = {
      ui_ux: "UI/UX", seo: "SEO", technical: "Technical", marketplace: "Marketplace",
      international: "International", conversion: "Conversion", communication: "Communication",
      security: "Security", brand: "Brand", data_quality: "Data Quality",
      analytics: "Analytics", mobile: "Mobile", payment: "Payment",
      booking: "Booking", content: "Content",
    };

    const modules = categories.map((cat) => {
      const catIssues = issues.filter((i) => i.category === cat);
      const penalty = catIssues.reduce((s, i) => s + (SEVERITY_WEIGHTS[i.severity] || 0), 0);
      return {
        category: cat,
        label: CATEGORY_LABELS[cat] || cat,
        score: Math.max(0, Math.min(100, 100 - penalty)),
        issueCount: catIssues.length,
        criticalCount: catIssues.filter((i) => i.severity === "critical").length,
        trend: "stable",
      };
    });

    const globalScore = modules.length > 0
      ? Math.round(modules.reduce((s, m) => s + m.score, 0) / modules.length)
      : 100;

    // ─── Store results for all orgs ───
    const { data: orgs } = await supabase.from("orgs").select("id").limit(500);
    if (orgs && orgs.length > 0) {
      const rows = orgs.map((org: { id: string }) => ({
        org_id: org.id,
        scan_type: "scheduled",
        global_score: globalScore,
        total_issues: issues.length,
        critical_issues: issues.filter((i) => i.severity === "critical").length,
        modules_json: modules,
        issues_json: issues,
        source: "backend",
      }));

      await supabase.from("audit_reports").insert(rows);
    }

    return new Response(
      JSON.stringify({
        success: true,
        globalScore,
        totalIssues: issues.length,
        criticalIssues: issues.filter((i) => i.severity === "critical").length,
        orgsAudited: orgs?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Scheduled audit error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
