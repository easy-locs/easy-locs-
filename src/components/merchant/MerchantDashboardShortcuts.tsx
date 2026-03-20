import { useNavigate } from "react-router-dom";

export default function MerchantDashboardShortcuts({
  merchantId,
}: {
  merchantId: string;
}) {
  const navigate = useNavigate();

  const items = [
    { label: "Orders Board", path: `/merchant/orders/${merchantId}` },
    { label: "Inventory", path: `/merchant/inventory/${merchantId}` },
    { label: "Coupons", path: `/merchant/coupons/${merchantId}` },
    { label: "Live Control", path: `/merchant/live/${merchantId}` },
    { label: "Review Replies", path: `/merchant/reviews/${merchantId}` },
    { label: "Store Settings", path: `/merchant/store-settings/${merchantId}` },
    { label: "Packaging", path: `/merchant/packaging/${merchantId}` },
    { label: "Order Throttle", path: `/merchant/order-throttle/${merchantId}` },
    { label: "Cancellation Rules", path: `/merchant/cancellation-rules/${merchantId}` },
    { label: "Chat Settings", path: `/merchant/chat-settings/${merchantId}` },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-foreground">Merchant Shortcuts</p>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className="rounded-2xl bg-muted px-4 py-4 text-left text-sm font-bold text-foreground active:scale-[0.98] transition-transform"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
