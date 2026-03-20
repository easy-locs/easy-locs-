import { useNavigate } from "react-router-dom";

export default function V1MenuPage({ isMerchant = false }: { isMerchant?: boolean }) {
  const navigate = useNavigate();

  const sections = [
    {
      title: "Core",
      items: [
        { key: "orbit", label: "Orbit", path: "/orbit" },
        { key: "achille", label: "Achille Marketplace", path: "/achille" },
        { key: "ride", label: "Ride", path: "/ride" },
        { key: "send_package", label: "Send Package", path: "/ride/send-package" },
        { key: "wallet", label: "Wallet", path: "/wallet/hub" },
      ],
    },
    {
      title: "Account",
      items: [
        { key: "notifications", label: "Notifications", path: "/notifications" },
        { key: "settings", label: "Settings / Profile", path: "/me" },
      ],
    },
  ];

  const merchantSection = {
    title: "Merchant",
    items: [
      { key: "pos", label: "POS", path: "/merchant/pos" },
      { key: "qr", label: "QR", path: "/merchant/qr" },
      { key: "orders", label: "Orders", path: "/merchant/orders" },
      { key: "payments", label: "Payments", path: "/merchant/payments" },
    ],
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-28 space-y-5">
      {sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <div className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground">{section.title}</div>
          <div className="space-y-3">
            {section.items.map((item) => (
              <button
                key={item.key}
                onClick={() => navigate(item.path)}
                className="w-full rounded-[24px] border border-border/20 bg-card px-4 py-4 text-left active:scale-[0.98] transition-transform"
              >
                <div className="text-sm font-bold">{item.label}</div>
              </button>
            ))}
          </div>
        </section>
      ))}

      {isMerchant && (
        <section className="space-y-3">
          <div className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground">{merchantSection.title}</div>
          <div className="space-y-3">
            {merchantSection.items.map((item) => (
              <button
                key={item.key}
                onClick={() => navigate(item.path)}
                className="w-full rounded-[24px] border border-border/20 bg-card px-4 py-4 text-left active:scale-[0.98] transition-transform"
              >
                <div className="text-sm font-bold">{item.label}</div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
