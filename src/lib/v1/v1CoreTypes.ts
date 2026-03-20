export type AppActorRole = "guest" | "customer" | "merchant" | "driver" | "admin";

export type V1CoreModule =
  | "home"
  | "orbit"
  | "achille"
  | "ride"
  | "send_package"
  | "wallet"
  | "merchant_pos"
  | "merchant_qr"
  | "merchant_orders"
  | "merchant_payments"
  | "notifications"
  | "settings";

export type V1AccessRule = {
  module: V1CoreModule;
  allowedRoles: AppActorRole[];
};

export const V1_ACCESS_RULES: V1AccessRule[] = [
  { module: "home", allowedRoles: ["guest", "customer", "merchant", "driver", "admin"] },
  { module: "orbit", allowedRoles: ["customer", "merchant", "driver", "admin"] },
  { module: "achille", allowedRoles: ["guest", "customer", "merchant", "admin"] },
  { module: "ride", allowedRoles: ["customer", "merchant", "driver", "admin"] },
  { module: "send_package", allowedRoles: ["customer", "merchant", "driver", "admin"] },
  { module: "wallet", allowedRoles: ["customer", "merchant", "driver", "admin"] },
  { module: "merchant_pos", allowedRoles: ["merchant", "admin"] },
  { module: "merchant_qr", allowedRoles: ["merchant", "admin"] },
  { module: "merchant_orders", allowedRoles: ["merchant", "admin"] },
  { module: "merchant_payments", allowedRoles: ["merchant", "admin"] },
  { module: "notifications", allowedRoles: ["customer", "merchant", "driver", "admin"] },
  { module: "settings", allowedRoles: ["customer", "merchant", "driver", "admin"] },
];
