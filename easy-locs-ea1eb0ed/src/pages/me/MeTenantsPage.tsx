import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { realEstateTenantService } from "@/services/real-estate.service";
import { AppText } from "@/components/ui/AppText";
import type { Tenant } from "@/domains/real-estate/canonical-types";
import { ArrowLeft, Users, MessageCircle, Phone, ChevronRight, UserPlus } from "lucide-react";

const navy = "hsl(220 40% 18%)";
const gold = "hsl(38 65% 56%)";

export default function MeTenantsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    realEstateTenantService.fetchByUser(user.id)
      .then(setTenants)
      .catch(() => setTenants([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const statusColors: Record<string, string> = {
    paid: "#22c55e",
    pending: "#f59e0b",
    overdue: "#ef4444",
    partial: "#f97316",
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: "#f8f9fa" }}>
      <div className="sticky top-0 z-20 px-4 pt-4 pb-3" style={{ background: navy }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/me/properties")} className="p-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
            <ArrowLeft size={20} color="#fff" />
          </button>
          <h1 className="text-base font-bold text-white flex-1">{t("re.me.tenants", "Tenants")}</h1>
          <button className="p-2 rounded-xl" style={{ background: gold }}>
            <UserPlus size={16} style={{ color: navy }} />
          </button>
        </div>
      </div>

      <div className="px-4 py-3">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "#e8e8e8" }} />
            ))}
          </div>
        ) : tenants.length === 0 ? (
          <div className="text-center py-16">
            <Users size={48} className="mx-auto mb-3" style={{ color: "#ccc" }} />
            <p className="text-sm font-medium" style={{ color: navy }}>{t("re.me.no_tenants", "No tenants yet")}</p>
            <p className="text-xs mt-1" style={{ color: "#999" }}>{t("re.me.tenants_hint", "Tenants appear when leases are created")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tenants.map(tenant => (
              <div key={tenant.id} className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: "#fff" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: `${gold}20`, color: navy }}>
                  {(tenant.name?.[0] ?? "T").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <AppText as="p" size="sm" lines={1} className="font-semibold" style={{ color: navy }}>{tenant.name}</AppText>
                  {tenant.email && <AppText as="p" size="xs" lines={1} className="text-label-safe" style={{ color: "#999" }}>{tenant.email}</AppText>}
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                  style={{
                    background: `${statusColors[tenant.paymentStatus] ?? "#999"}15`,
                    color: statusColors[tenant.paymentStatus] ?? "#999",
                  }}
                >
                  {tenant.paymentStatus}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => navigate(`/orbit?context=tenant&id=${tenant.id}`)}
                    className="p-1.5 rounded-lg"
                    style={{ background: "#f0f0f0" }}
                  >
                    <MessageCircle size={14} style={{ color: navy }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
