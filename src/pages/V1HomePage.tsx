import { Bell, CreditCard, MapPin, MessageCircle, Package, QrCode, Search, ShoppingBag, Store, Wallet, Car } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function V1HomePage({
  isMerchant = false,
}: {
  isMerchant?: boolean;
}) {
  const navigate = useNavigate();

  const coreActions = [
    { key: "orbit", label: "Orbit", path: "/orbit", icon: MessageCircle, merchantOnly: false },
    { key: "achille", label: "Marketplace", path: "/achille", icon: ShoppingBag, merchantOnly: false },
    { key: "ride", label: "Ride", path: "/ride", icon: Car, merchantOnly: false },
    { key: "send_package", label: "Send Package", path: "/ride/send-package", icon: Package, merchantOnly: false },
    { key: "wallet", label: "Wallet", path: "/wallet/hub", icon: Wallet, merchantOnly: false },
    { key: "scan_qr", label: "Scan QR", path: "/pay/scan", icon: QrCode, merchantOnly: false },
    { key: "pay", label: "Pay", path: "/wallet/hub", icon: CreditCard, merchantOnly: false },
    { key: "merchant_pos", label: "POS", path: "/merchant/pos", icon: Store, merchantOnly: true },
  ];

  const filteredActions = coreActions.filter((a) => !a.merchantOnly || isMerchant);

  return (
    <div className="max-w-md mx-auto px-4 py-5 pb-28 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => navigate("/settings/addresses")} className="min-w-0 flex items-center gap-3 text-left">
          <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center">
            <MapPin size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold truncate">Dubai, UAE</p>
            <p className="text-xs text-muted-foreground truncate">Current location</p>
          </div>
        </button>
        <button onClick={() => navigate("/notifications")} className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center active:scale-95 transition-transform">
          <Bell size={20} />
        </button>
      </div>

      {/* Search */}
      <button
        onClick={() => navigate("/search-results")}
        className="w-full rounded-2xl bg-muted px-4 py-3.5 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
      >
        <Search size={18} className="text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Search marketplace, ride, wallet...</span>
      </button>

      {/* Core Actions Grid */}
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-wide font-bold text-muted-foreground">Quick Actions</p>
        <div className="grid grid-cols-3 gap-3">
          {filteredActions.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.path)}
                className="rounded-2xl border border-border/10 bg-card px-3 py-4 flex flex-col items-center gap-2.5 text-center active:scale-[0.97] transition-transform shadow-sm"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon size={20} />
                </div>
                <span className="text-xs font-bold leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Live Actions */}
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-wide font-bold text-muted-foreground">Discover</p>
        <div className="space-y-3">
          <button onClick={() => navigate("/achille")} className="w-full rounded-2xl border border-border/10 bg-card p-4 text-left active:scale-[0.98] transition-transform shadow-sm">
            <p className="text-base font-bold">Nearby restaurants</p>
            <p className="text-sm text-muted-foreground mt-1">Browse food marketplace around you</p>
          </button>
          <button onClick={() => navigate("/orbit")} className="w-full rounded-2xl border border-border/10 bg-card p-4 text-left active:scale-[0.98] transition-transform shadow-sm">
            <p className="text-base font-bold">Orbit</p>
            <p className="text-sm text-muted-foreground mt-1">Messages, contacts, communication</p>
          </button>
          <button onClick={() => navigate("/ride")} className="w-full rounded-2xl border border-border/10 bg-card p-4 text-left active:scale-[0.98] transition-transform shadow-sm">
            <p className="text-base font-bold">Ride / Send Package</p>
            <p className="text-sm text-muted-foreground mt-1">Transport and package dispatch</p>
          </button>
          <button onClick={() => navigate("/wallet/hub")} className="w-full rounded-2xl border border-border/10 bg-card p-4 text-left active:scale-[0.98] transition-transform shadow-sm">
            <p className="text-base font-bold">Wallet</p>
            <p className="text-sm text-muted-foreground mt-1">Balance, scan QR, pay and receive</p>
          </button>
        </div>
      </section>

      {/* Merchant Section */}
      {isMerchant && (
        <section className="space-y-3">
          <p className="text-xs uppercase tracking-wide font-bold text-muted-foreground">Merchant</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "pos", label: "POS", path: "/merchant/pos" },
              { key: "qr", label: "QR", path: "/merchant/qr" },
              { key: "orders", label: "Orders", path: "/merchant/orders" },
              { key: "payments", label: "Payments", path: "/merchant/payments" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => navigate(item.path)}
                className="rounded-2xl border border-border/10 bg-card px-4 py-4 text-center active:scale-[0.97] transition-transform shadow-sm"
              >
                <span className="text-sm font-bold">{item.label}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
