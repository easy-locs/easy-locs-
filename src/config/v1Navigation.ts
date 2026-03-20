import {
  Home,
  MessageCircle,
  Store,
  Car,
  Wallet,
  Bell,
  User,
  QrCode,
  Package,
  CreditCard,
  ShoppingBag,
} from "lucide-react";

export const V1_BOTTOM_NAV = [
  { key: "home", label: "Home", path: "/home", icon: Home },
  { key: "orbit", label: "Orbit", path: "/orbit", icon: MessageCircle },
  { key: "achille", label: "Achille", path: "/achille", icon: Store },
  { key: "ride", label: "Ride", path: "/ride", icon: Car },
  { key: "wallet", label: "Wallet", path: "/wallet/hub", icon: Wallet },
];

export const V1_TOP_ACTIONS = [
  { key: "notifications", label: "Notifications", path: "/notifications", icon: Bell },
  { key: "settings", label: "Profile", path: "/me", icon: User },
];

export const V1_HOME_QUICK_ACTIONS = [
  { key: "orbit", label: "Orbit", path: "/orbit", icon: MessageCircle },
  { key: "achille", label: "Marketplace", path: "/achille", icon: ShoppingBag },
  { key: "ride", label: "Ride", path: "/ride", icon: Car },
  { key: "send_package", label: "Send Package", path: "/ride/send-package", icon: Package },
  { key: "wallet", label: "Wallet", path: "/wallet/hub", icon: Wallet },
  { key: "scan_qr", label: "Scan QR", path: "/pay/scan", icon: QrCode },
  { key: "pay", label: "Pay", path: "/wallet/hub", icon: CreditCard },
];

export const V1_MERCHANT_SHORTCUTS = [
  { key: "merchant_pos", label: "POS", path: "/merchant/pos", icon: CreditCard },
  { key: "merchant_qr", label: "QR", path: "/merchant/qr", icon: QrCode },
  { key: "merchant_orders", label: "Orders", path: "/merchant/orders", icon: ShoppingBag },
  { key: "merchant_payments", label: "Payments", path: "/merchant/payments", icon: Wallet },
];
