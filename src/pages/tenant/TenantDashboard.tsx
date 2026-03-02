import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Receipt, FileText, MessageCircle, CreditCard, Home } from "lucide-react";
import TenantLayout from "@/components/tenant/TenantLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getCountryConfig, formatCurrency } from "@/lib/country-config";

const TenantDashboard = () => {
  const { user, userCountry } = useAuth();
  const L = useMemo(() => getCountryConfig(userCountry).labels, [userCountry]);
  const fmt = (n: number) => formatCurrency(n, userCountry);
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [receiptsCount, setReceiptsCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("*, properties(label, address, city)")
        .eq("tenant_user_id", user.id)
        .limit(1)
        .single();
      setTenantInfo(tenant);

      if (tenant) {
        const { count } = await supabase
          .from("rent_calls")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenant.id)
          .eq("receipt_validated", true);
        setReceiptsCount(count || 0);

        const { count: msgCount } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenant.id)
          .eq("read", false)
          .neq("sender_id", user.id);
        setUnreadMessages(msgCount || 0);
      }
    };
    fetchData();
  }, [user]);

  const leaseLabel = tenantInfo?.lease_type === "furnished"
    ? L.furnished : tenantInfo?.lease_type === "commercial"
    ? L.leaseType : L.property;

  return (
    <TenantLayout>
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-1">{L.welcomeTenant}</h1>
          <p className="text-muted-foreground mb-8">{L.tenantSpaceDesc}</p>
        </motion.div>

        {tenantInfo ? (
          <>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl p-6 shadow-card border border-border/50 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <Home className="h-6 w-6 text-accent" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-foreground">{tenantInfo.properties?.label || L.property}</h2>
                  <p className="text-sm text-muted-foreground">{tenantInfo.properties?.address}, {tenantInfo.properties?.city}</p>
                  <div className="flex gap-6 mt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{L.myRent}</p>
                      <p className="font-semibold text-foreground">{fmt(tenantInfo.rent_amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{L.myCharges}</p>
                      <p className="font-semibold text-foreground">{fmt(tenantInfo.charges_amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{L.myLease}</p>
                      <p className="font-semibold text-foreground">{leaseLabel}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { icon: Receipt, label: L.myReceipts, path: "/tenant/receipts", value: String(receiptsCount), color: "bg-info/10 text-info" },
                { icon: FileText, label: L.myDocuments, path: "/tenant/documents", value: L.send, color: "bg-success/10 text-success" },
                { icon: MessageCircle, label: L.messagesNav, path: "/tenant/messages", value: unreadMessages > 0 ? `${unreadMessages}` : "0", color: "bg-warning/10 text-warning" },
                { icon: CreditCard, label: L.payRent, path: "/tenant/pay", value: fmt(Number(tenantInfo.rent_amount) + Number(tenantInfo.charges_amount)), color: "bg-accent/10 text-accent" },
              ].map((a, i) => (
                <motion.div key={a.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}>
                  <Link to={a.path} className="block bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all text-center">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-3 ${a.color}`}>
                      <a.icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-foreground">{a.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{a.value}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
            <Home className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{L.noLinkedProperty}</p>
            <p className="text-sm text-muted-foreground mt-1">{L.noLinkedPropertyDesc}</p>
          </div>
        )}
      </div>
    </TenantLayout>
  );
};

export default TenantDashboard;