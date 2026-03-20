export const V1_MENU_SECTIONS = [
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
  {
    title: "Merchant",
    items: [
      { key: "merchant_pos", label: "POS", path: "/merchant/pos" },
      { key: "merchant_qr", label: "QR", path: "/merchant/qr" },
      { key: "merchant_orders", label: "Orders", path: "/merchant/orders" },
      { key: "merchant_payments", label: "Payments", path: "/merchant/payments" },
    ],
  },
];
