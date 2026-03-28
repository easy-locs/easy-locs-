/**
 * ShopSwitcher — Multi-shop selector for the Merchant OS cockpit.
 * Shows all shops owned by the user with health scores and quick actions.
 */
import { Store, Plus, ChevronRight, QrCode, Eye, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { ShopContext } from "@/lib/merchant/shop-os-engine";

interface ShopSwitcherProps {
  shops: ShopContext[];
  activeShopId?: string;
  onSelectShop: (shopId: string) => void;
  loading?: boolean;
}

export default function ShopSwitcher({ shops, activeShopId, onSelectShop, loading }: ShopSwitcherProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-bold text-foreground px-1">My Shops</p>
        {[1, 2].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-bold text-foreground">My Shops</p>
        <span className="text-[9px] text-muted-foreground font-medium">{shops.length} shop{shops.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Shop cards */}
      {shops.map((shop) => {
        const isActive = shop.id === activeShopId;
        const healthColor = shop.health.overall >= 70 ? "text-emerald-400" : shop.health.overall >= 40 ? "text-amber-400" : "text-red-400";
        const healthBg = shop.health.overall >= 70 ? "bg-emerald-500/15" : shop.health.overall >= 40 ? "bg-amber-500/15" : "bg-red-500/15";

        return (
          <button
            key={shop.id}
            onClick={() => onSelectShop(shop.id)}
            className={cn(
              "w-full rounded-2xl border p-3 text-left transition-all active:scale-[0.98]",
              isActive
                ? "border-primary/30 bg-primary/5"
                : "border-border/10 bg-card"
            )}
          >
            <div className="flex items-center gap-3">
              {shop.logoUrl ? (
                <img src={shop.logoUrl} alt={shop.name} className="w-10 h-10 rounded-xl object-cover ring-1 ring-border/20" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Store className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground break-words leading-snug">{shop.name}</p>
                  {isActive && <span className="text-[8px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">ACTIVE</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn("flex items-center gap-1 text-[9px] font-bold", shop.isPublished ? "text-emerald-400" : "text-amber-400")}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", shop.isPublished ? "bg-emerald-500" : "bg-amber-500")} />
                    {shop.isPublished ? "Live" : "Draft"}
                  </span>
                  <span className="text-[9px] text-muted-foreground">{shop.city}</span>
                  <span className="text-[9px] text-muted-foreground capitalize">{shop.vertical}</span>
                </div>
              </div>
              <div className={cn("flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl", healthBg)}>
                <span className={cn("text-base font-bold", healthColor)}>{shop.health.overall}</span>
                <span className="text-[7px] font-bold text-muted-foreground uppercase">Health</span>
              </div>
            </div>

            {/* Quick action row */}
            {isActive && (
              <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-border/10">
                <QuickBtn icon={<Eye className="w-3 h-3" />} label="View" onClick={() => navigate(`/s/${shop.slug}`)} />
                <QuickBtn icon={<QrCode className="w-3 h-3" />} label="QR Codes" onClick={() => navigate(`/merchant/qr/${shop.id}`)} />
                <QuickBtn icon={<Settings className="w-3 h-3" />} label="Settings" onClick={() => navigate(`/dashboard/my-shop/${shop.id}`)} />
                <QuickBtn icon={<ChevronRight className="w-3 h-3" />} label="Dashboard" onClick={() => navigate(`/merchant/dashboard/${shop.id}`)} />
              </div>
            )}

            {/* Issues summary */}
            {shop.health.issues.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5">
                {shop.health.issues.filter((i) => i.severity === "critical").length > 0 && (
                  <span className="text-[8px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                    {shop.health.issues.filter((i) => i.severity === "critical").length} critical
                  </span>
                )}
                {shop.health.issues.filter((i) => i.severity === "warning").length > 0 && (
                  <span className="text-[8px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                    {shop.health.issues.filter((i) => i.severity === "warning").length} warnings
                  </span>
                )}
              </div>
            )}
          </button>
        );
      })}

      {/* Create new shop */}
      <button
        onClick={() => navigate("/dashboard/my-shop")}
        className="w-full flex items-center gap-3 p-3 rounded-2xl border border-dashed border-primary/30 bg-primary/5 active:scale-[0.98] transition-transform"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <Plus className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Create new shop</p>
          <p className="text-[10px] text-muted-foreground">Set up a new storefront</p>
        </div>
      </button>
    </div>
  );
}

function QuickBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl bg-muted/50 active:scale-95 transition-transform"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[8px] font-medium text-muted-foreground">{label}</span>
    </button>
  );
}
