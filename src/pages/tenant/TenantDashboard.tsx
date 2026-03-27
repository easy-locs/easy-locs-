import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Receipt, FileText, MessageCircle, CreditCard, Home, Star,
  ClipboardList, ArrowRight, Calendar, AlertTriangle, CheckCircle, Wrench
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import TenantLayout from "@/components/tenant/TenantLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTenantProperty } from "@/hooks/useTenantProperty";
import { Badge } from "@/components/ui/badge";

const TenantDashboard = () => {
  const { user } = useAuth();
  const { tenantId, propertyCountry, L, T, fmt } = useTenantProperty();
  const { t } = useI18n();
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [receiptsCount, setReceiptsCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [nextPayment, setNextPayment] = useState<any>(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      // Get tenant record
      const { data: tenant } = await supabase
        .from("tenants")
        .select("*, properties(label, address, city, photo_urls)")
        .eq("tenant_user_id", user.id)
        .limit(1)
        .single();
      setTenantInfo(tenant);

      if (tenant) {
        // Try to get active lease for this tenant
        const { data: lease } = await supabase
          .from("leases")
          .select("id, rent_amount, charges_amount, deposit_amount, start_date, end_date, lease_type, payment_day, status")
          .eq("tenant_id", tenant.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        // Override rent info from lease if available
        if (lease) {
          setTenantInfo((prev: any) => ({
            ...prev,
            rent_amount: lease.rent_amount,
            charges_amount: lease.charges_amount,
            deposit_amount: lease.deposit_amount,
            lease_start: lease.start_date,
            lease_end: lease.end_date,
            lease_type: lease.lease_type,
            _lease_id: lease.id,
            _payment_day: lease.payment_day,
          }));
        }

        // Receipts count
        const { count } = await supabase
          .from("rent_calls")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenant.id)
          .eq("receipt_validated", true);
        setReceiptsCount(count || 0);

        // Unread messages (V2)
        const { count: msgCount } = await (supabase as any)
          .from("app_notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("category", "message")
          .is("read_at", null);
        setUnreadMessages(msgCount || 0);

        // Next unpaid rent (prefer lease_id-linked rent_calls)
        let unpaidQuery = supabase
          .from("rent_calls")
          .select("id, month, total_amount, payment_status")
          .eq("tenant_id", tenant.id)
          .eq("paid", false)
          .order("month", { ascending: true })
          .limit(1);
        const { data: unpaid } = await unpaidQuery;
        setNextPayment(unpaid?.[0] || null);

        // Pending requests
        const { count: reqCount } = await supabase
          .from("document_requests")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenant.id)
          .eq("status", "pending");
        setPendingRequests(reqCount || 0);
      }
      setLoaded(true);
    };
    fetchData();
  }, [user]);

  const leaseLabel = tenantInfo?.lease_type === "furnished"
    ? L.furnished : tenantInfo?.lease_type === "commercial"
    ? L.leaseType : L.property;

  const totalRent = tenantInfo ? Number(tenantInfo.rent_amount) + Number(tenantInfo.charges_amount || 0) : 0;
  const propertyPhoto = tenantInfo?.properties?.photo_urls?.[0];

  const quickCards = [
    { icon: Receipt, label: t("nav.receipts") || L.myReceipts, path: "/tenant/receipts", value: `${receiptsCount}`, color: "text-info", hint: t("tenant.hint_receipts") || "View my receipts →" },
    { icon: FileText, label: t("nav.documents") || L.myDocuments, path: "/tenant/documents", value: T.sendDocument, color: "text-success", hint: t("tenant.hint_documents") || "View my documents →" },
    { icon: MessageCircle, label: t("nav.messages") || L.messagesNav, path: "/tenant/messages", value: unreadMessages > 0 ? `${unreadMessages}` : "0", color: "text-warning", hint: t("tenant.hint_messages") || "View messages →" },
    { icon: CreditCard, label: t("nav.payments") || L.payRent, path: nextPayment ? `/dashboard/wallet?action=rent-pay&rentCallId=${nextPayment.id}` : "/dashboard/wallet", value: tenantInfo ? fmt(totalRent) : "—", color: "text-accent", hint: t("tenant.hint_pay") || "Pay my rent →" },
    { icon: Star, label: t("nav.reviews"), path: "/tenant/reviews", value: "—", color: "text-primary", hint: t("tenant.hint_reviews") || "Leave a review →" },
    { icon: ClipboardList, label: t("nav.requests"), path: "/tenant/requests", value: pendingRequests > 0 ? `${pendingRequests}` : "—", color: "text-muted-foreground", hint: t("tenant.hint_requests") || "My requests →" },
  ];

  return (
    <TenantLayout>
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-1">{L.welcomeTenant}</h1>
          <p className="text-muted-foreground mb-6">{L.tenantSpaceDesc}</p>
        </motion.div>

        {tenantInfo ? (
          <>
            {/* Next payment alert */}
            {nextPayment && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Link
                  to={`/dashboard/wallet?action=rent-pay&rentCallId=${nextPayment.id}`}
                  className="flex items-center gap-3 bg-warning/10 border border-warning/30 rounded-xl p-4 mb-5 hover:bg-warning/15 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {t("tenant.payment_due") || "Payment due"} — {nextPayment.month}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("tenant.payment_due_desc") || "Click to pay your rent now"}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-foreground shrink-0">{fmt(nextPayment.total_amount)}</span>
                  <ArrowRight className="h-4 w-4 text-warning shrink-0" />
                </Link>
              </motion.div>
            )}

            {/* Property info card */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="bg-card rounded-xl shadow-card border border-border/50 mb-6 overflow-hidden">
                <div className="flex">
                  {/* Property photo */}
                  <div className="w-24 sm:w-32 shrink-0 bg-muted flex items-center justify-center overflow-hidden">
                    {propertyPhoto ? (
                      <img src={propertyPhoto} alt={tenantInfo.properties?.label} className="w-full h-full object-cover" />
                    ) : (
                      <Home className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 p-5">
                    <h2 className="font-semibold text-foreground">{tenantInfo.properties?.label || L.property}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{tenantInfo.properties?.address}, {tenantInfo.properties?.city}</p>

                    {/* Lease dates */}
                    {tenantInfo.lease_start && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{tenantInfo.lease_start} → {tenantInfo.lease_end || "∞"}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1">{leaseLabel}</Badge>
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{L.myRent}</p>
                        <p className="text-sm font-bold text-foreground">{fmt(tenantInfo.rent_amount)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{L.myCharges}</p>
                        <p className="text-sm font-bold text-foreground">{fmt(tenantInfo.charges_amount)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
                        <p className="text-sm font-bold text-accent">{fmt(totalRent)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Quick access cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {quickCards.map((a, i) => (
                <motion.div key={a.path} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }} className="h-full">
                  <Link
                    to={a.path}
                    className="group flex flex-col h-full bg-card rounded-xl p-4 sm:p-5 shadow-card border border-border/50 hover:shadow-card-hover hover:border-accent/40 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-accent/10 transition-colors">
                        <a.icon className={`h-4 w-4 ${a.color}`} />
                      </div>
                      {a.label === (t("nav.messages") || L.messagesNav) && unreadMessages > 0 && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{unreadMessages}</Badge>
                      )}
                      <ArrowRight className="h-3.5 w-3.5 text-transparent group-hover:text-accent transition-colors shrink-0" />
                    </div>
                    <span className="text-xs sm:text-sm text-muted-foreground truncate mb-1">{a.label}</span>
                    <div className="font-bold text-foreground mt-auto truncate text-xl sm:text-2xl tabular-nums">{a.value}</div>
                    <p className="text-[10px] text-accent mt-1 opacity-0 group-hover:opacity-100 transition-opacity">{a.hint}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </>
        ) : loaded ? (
          <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
            <Home className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{L.noLinkedProperty}</p>
            <p className="text-sm text-muted-foreground mt-1">{L.noLinkedPropertyDesc}</p>
          </div>
        ) : null}
      </div>
    </TenantLayout>
  );
};

export default TenantDashboard;
