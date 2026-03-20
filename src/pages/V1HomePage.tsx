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
    { key: "merchant_pos", label: "Merchant POS", path: "/merchant/pos", icon: Store, merchantOnly: true },
  ];

  const filteredActions = coreActions.filter((a) => !a.merchantOnly || isMerchant);

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-28 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => navigate("/settings/addresses")} className="min-w-0 flex items-center gap-2 text-left">
          <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center">
            <MapPin size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold truncate">Dubai, UAE</div>
            <div className="text-xs text-muted-foreground truncate">Current location</div>
          </div>
        </button>
        <button onClick={() => navigate("/notifications")} className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center">
          <Bell size={18} />
        </button>
      </div>

      <button
        onClick={() => navigate("/search-results")}
        className="w-full rounded-2xl bg-muted px-4 py-3 flex items-center gap-3 text-left"
      >
        <Search size={18} className="text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Search Orbit, marketplace, ride, wallet...</span>
      </button>

      <section className="space-y-3">
        <div className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground">V1 Core</div>
        <div className="grid grid-cols-3 gap-3">
          {filteredActions.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.path)}
                className="rounded-[24px] border border-border/20 bg-card px-3 py-4 flex flex-col items-center gap-2 text-center active:scale-[0.98] transition-transform"
              >
                <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon size={18} />
                </div>
                <span className="text-xs font-bold leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground">Live Actions</div>
        <div className="space-y-3">
          <button onClick={() => navigate("/achille")} className="w-full rounded-[24px] border border-border/20 bg-card p-4 text-left">
            <div className="text-sm font-bold">Nearby merchants</div>
            <div className="text-xs text-muted-foreground mt-1">Browse Achille marketplace around you</div>
          </button>
          <button onClick={() => navigate("/orbit")} className="w-full rounded-[24px] border border-border/20 bg-card p-4 text-left">
            <div className="text-sm font-bold">Orbit activity</div>
            <div className="text-xs text-muted-foreground mt-1">Messages, contacts, communication</div>
          </button>
          <button onClick={() => navigate("/ride")} className="w-full rounded-[24px] border border-border/20 bg-card p-4 text-left">
            <div className="text-sm font-bold">Ride / Send Package</div>
            <div className="text-xs text-muted-foreground mt-1">Transport and package dispatch</div>
          </button>
          <button onClick={() => navigate("/wallet/hub")} className="w-full rounded-[24px] border border-border/20 bg-card p-4 text-left">
            <div className="text-sm font-bold">Wallet shortcuts</div>
            <div className="text-xs text-muted-foreground mt-1">Balance, scan QR, pay and receive</div>
          </button>
        </div>
      </section>

      {isMerchant && (
        <section className="space-y-3">
          <div className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground">Merchant</div>
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
                className="rounded-[24px] border border-border/20 bg-card px-3 py-4 text-center active:scale-[0.98] transition-transform"
              >
                <span className="text-xs font-bold">{item.label}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
