/**
 * Shop-level Role & Permissions System
 *
 * Defines what each shop role can do.
 * Separate from org-level roles (permissions.ts).
 */

export type ShopRole = "owner" | "manager" | "cashier" | "catalog_manager" | "order_manager" | "accountant" | "marketing" | "support";

export type ShopPermission =
  | "shop:manage"       // full shop settings
  | "shop:catalog"      // add/edit/remove products
  | "shop:orders"       // view & manage orders
  | "shop:pos"          // point-of-sale terminal
  | "shop:marketing"    // boosts, promos, analytics
  | "shop:support"      // customer messages
  | "shop:finance"      // revenue, payouts, reports
  | "shop:team";        // manage shop team members

const SHOP_ROLE_PERMISSIONS: Record<ShopRole, ShopPermission[]> = {
  owner: ["shop:manage", "shop:catalog", "shop:orders", "shop:pos", "shop:marketing", "shop:support", "shop:finance", "shop:team"],
  manager: ["shop:manage", "shop:catalog", "shop:orders", "shop:pos", "shop:marketing", "shop:support", "shop:finance"],
  cashier: ["shop:orders", "shop:pos"],
  catalog_manager: ["shop:catalog"],
  order_manager: ["shop:orders", "shop:support"],
  accountant: ["shop:finance", "shop:orders"],
  marketing: ["shop:marketing", "shop:catalog"],
  support: ["shop:support", "shop:orders"],
};

export function shopRoleHas(role: ShopRole, permission: ShopPermission): boolean {
  return SHOP_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getShopPermissions(role: ShopRole): ShopPermission[] {
  return SHOP_ROLE_PERMISSIONS[role] || [];
}

export const SHOP_ROLE_CONFIG: Record<ShopRole, { label: string; labelFr: string; icon: string }> = {
  owner:           { label: "Owner",           labelFr: "Propriétaire",       icon: "👑" },
  manager:         { label: "Manager",         labelFr: "Manager",            icon: "🛡️" },
  cashier:         { label: "Cashier",         labelFr: "Caissier",           icon: "💳" },
  catalog_manager: { label: "Catalog Manager", labelFr: "Gestionnaire Catalogue", icon: "📦" },
  order_manager:   { label: "Order Manager",   labelFr: "Gestionnaire Commandes", icon: "📋" },
  accountant:      { label: "Accountant",      labelFr: "Comptable",          icon: "📊" },
  marketing:       { label: "Marketing",       labelFr: "Marketing",          icon: "📢" },
  support:         { label: "Support",         labelFr: "Support",            icon: "💬" },
};
