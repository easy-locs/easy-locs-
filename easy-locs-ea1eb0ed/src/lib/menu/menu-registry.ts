import {
  CATEGORY_TREE,
  type PrimaryCategory,
  type CategorySubcategory,
} from "@/lib/taxonomy/category-tree";
import type { MenuNode, MenuLevel, BusinessMenuItem, UserRole } from "./menu-types";
import {
  UtensilsCrossed, ShoppingCart, Store, Wrench, HeartPulse, Sparkles,
  Car, Package, Building2, Hotel, Zap, Plane, GraduationCap, Landmark,
  Home, Briefcase, ClipboardList, BarChart3, Settings, Users, FileText,
  MessageCircle, Wallet, MapPin, Star, Bell, Shield, Megaphone,
  CreditCard, Receipt, Calendar, Camera, TrendingUp, Globe,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const VERTICAL_ICONS: Record<string, LucideIcon> = {
  food: UtensilsCrossed,
  grocery: ShoppingCart,
  shops: Store,
  services: Wrench,
  health: HeartPulse,
  beauty: Sparkles,
  taxi: Car,
  delivery: Package,
  property: Building2,
  stay: Hotel,
  utility: Zap,
  travel: Plane,
  education: GraduationCap,
  finance: Landmark,
  classified_c2c: Megaphone,
};

function buildMenuNodeFromPrimary(cat: PrimaryCategory, order: number): MenuNode {
  return {
    id: `v_${cat.key}`,
    parentId: null,
    level: 1 as MenuLevel,
    label: cat.label,
    labelKey: `menu.vertical.${cat.key}`,
    slug: cat.key,
    emoji: cat.emoji,
    icon: VERTICAL_ICONS[cat.key],
    route: cat.route,
    aliases: [],
    tags: [cat.vertical, cat.key],
    defaultOrder: order,
    active: true,
    audience: "public",
    vertical: cat.vertical,
    children: buildClusterNodes(cat),
  };
}

function buildClusterNodes(cat: PrimaryCategory): MenuNode[] {
  const clusterMap = new Map<string, CategorySubcategory[]>();
  for (const sub of cat.subcategories) {
    const cluster = sub.cluster;
    if (!clusterMap.has(cluster)) clusterMap.set(cluster, []);
    clusterMap.get(cluster)!.push(sub);
  }

  let clusterOrder = 0;
  const nodes: MenuNode[] = [];

  for (const [cluster, subs] of clusterMap) {
    const clusterNode: MenuNode = {
      id: `c_${cat.key}_${cluster}`,
      parentId: `v_${cat.key}`,
      level: 2 as MenuLevel,
      label: formatClusterLabel(cluster),
      labelKey: `menu.cluster.${cat.key}.${cluster}`,
      slug: `${cat.key}/${cluster}`,
      route: `${cat.route}?cluster=${cluster}`,
      aliases: [],
      tags: [cluster, cat.key],
      defaultOrder: clusterOrder++,
      active: true,
      audience: "public",
      vertical: cat.vertical,
      cluster,
      children: subs.map((sub, idx) => buildSubcategoryNode(cat, sub, cluster, idx)),
    };
    nodes.push(clusterNode);
  }

  return nodes;
}

function buildSubcategoryNode(cat: PrimaryCategory, sub: CategorySubcategory, cluster: string, order: number): MenuNode {
  return {
    id: `s_${cat.key}_${sub.value}`,
    parentId: `c_${cat.key}_${cluster}`,
    level: 3 as MenuLevel,
    label: sub.label,
    labelKey: `menu.sub.${sub.value}`,
    slug: `${cat.key}/${sub.value}`,
    emoji: sub.emoji,
    route: `${cat.route}?sub=${sub.value}`,
    aliases: [],
    tags: sub.tags ?? [],
    defaultOrder: order,
    active: true,
    audience: "public",
    vertical: cat.vertical,
    cluster,
  };
}

function formatClusterLabel(cluster: string): string {
  return cluster
    .split("_")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

let _menuTree: MenuNode[] | null = null;
let _flatIndex: MenuNode[] | null = null;

const GEO_EXPLORER_NODE: MenuNode = {
  id: "v_geo_explorer",
  parentId: null,
  level: 1 as MenuLevel,
  label: "Explorer",
  labelKey: "menu.vertical.geo_explorer",
  slug: "geo_explorer",
  emoji: "🌍",
  icon: Globe,
  route: "/geo-explorer",
  aliases: ["geo", "country", "city", "district", "quartier", "pays", "ville"],
  tags: ["geo", "explorer", "country", "city"],
  defaultOrder: 99,
  active: true,
  audience: "public",
  vertical: "geo",
};

export function getMenuTree(): MenuNode[] {
  if (_menuTree) return _menuTree;
  _menuTree = [
    ...CATEGORY_TREE.map((cat, idx) => buildMenuNodeFromPrimary(cat, idx)),
    GEO_EXPLORER_NODE,
  ];
  return _menuTree;
}

export function getFlatMenuIndex(): MenuNode[] {
  if (_flatIndex) return _flatIndex;
  const tree = getMenuTree();
  const flat: MenuNode[] = [];

  function walk(nodes: MenuNode[]) {
    for (const node of nodes) {
      flat.push(node);
      if (node.children) walk(node.children);
    }
  }
  walk(tree);
  _flatIndex = flat;
  return _flatIndex;
}

export function getVerticalCount(): number {
  return getMenuTree().length;
}

export function getSubcategoryCount(): number {
  return CATEGORY_TREE.reduce((sum, cat) => sum + cat.subcategories.length, 0);
}

export function getMenuNodeById(id: string): MenuNode | undefined {
  return getFlatMenuIndex().find(n => n.id === id);
}

export function getMenuNodeBySlug(slug: string): MenuNode | undefined {
  return getFlatMenuIndex().find(n => n.slug === slug);
}

export function getMenuNodeByRoute(route: string): MenuNode | undefined {
  const base = route.split("?")[0];
  return getFlatMenuIndex().find(n => n.route.split("?")[0] === base);
}

const BUSINESS_MENU_ITEMS: BusinessMenuItem[] = [
  { id: "biz_dashboard", labelKey: "menu.biz.dashboard", route: "/merchant/dashboard", icon: BarChart3, roles: ["merchant"], order: 0, section: "operations" },
  { id: "biz_orders", labelKey: "menu.biz.orders", route: "/merchant/orders", icon: ClipboardList, roles: ["merchant"], order: 1, section: "operations" },
  { id: "biz_menu", labelKey: "menu.biz.menu_catalog", route: "/merchant/menu", icon: UtensilsCrossed, roles: ["merchant"], order: 2, section: "operations" },
  { id: "biz_products", labelKey: "menu.biz.products", route: "/seller", icon: Store, roles: ["merchant"], order: 3, section: "operations" },
  { id: "biz_analytics", labelKey: "menu.biz.analytics", route: "/merchant/analytics", icon: TrendingUp, roles: ["merchant"], order: 4, section: "operations" },
  { id: "biz_pos", labelKey: "menu.biz.pos", route: "/pos", icon: CreditCard, roles: ["merchant"], order: 5, section: "operations" },
  { id: "biz_finance", labelKey: "menu.biz.finance", route: "/merchant/finance", icon: Wallet, roles: ["merchant"], order: 6, section: "finance" },
  { id: "biz_receipts", labelKey: "menu.biz.receipts", route: "/me/order-receipts", icon: Receipt, roles: ["merchant"], order: 7, section: "finance" },
  { id: "biz_store_settings", labelKey: "menu.biz.store_settings", route: "/merchant/store-settings", icon: Settings, roles: ["merchant"], order: 8, section: "settings" },
  { id: "biz_media", labelKey: "menu.biz.media", route: "/merchant/media", icon: Camera, roles: ["merchant"], order: 9, section: "settings" },
  { id: "biz_boost", labelKey: "menu.biz.boost", route: "/seller/boost", icon: Megaphone, roles: ["merchant"], order: 10, section: "growth" },

  { id: "prov_services", labelKey: "menu.biz.my_services", route: "/provider/services", icon: Wrench, roles: ["provider"], order: 0, section: "operations" },
  { id: "prov_availability", labelKey: "menu.biz.availability", route: "/provider/availability", icon: Calendar, roles: ["provider"], order: 1, section: "operations" },
  { id: "prov_bookings", labelKey: "menu.biz.bookings", route: "/provider/bookings", icon: ClipboardList, roles: ["provider"], order: 2, section: "operations" },
  { id: "prov_zones", labelKey: "menu.biz.zones", route: "/provider/zones", icon: MapPin, roles: ["provider"], order: 3, section: "operations" },
  { id: "prov_reviews", labelKey: "menu.biz.reviews", route: "/provider/reviews", icon: Star, roles: ["provider"], order: 4, section: "growth" },

  { id: "prop_properties", labelKey: "menu.biz.properties", route: "/me/properties", icon: Building2, roles: ["property_manager", "landlord", "owner"], order: 0, section: "operations" },
  { id: "prop_tenants", labelKey: "menu.biz.tenants", route: "/me/properties/tenants", icon: Users, roles: ["property_manager", "landlord", "owner"], order: 1, section: "operations" },
  { id: "prop_leases", labelKey: "menu.biz.leases", route: "/me/properties/leases", icon: FileText, roles: ["property_manager", "landlord", "owner"], order: 2, section: "operations" },
  { id: "prop_finance", labelKey: "menu.biz.property_finance", route: "/wallet/property", icon: Wallet, roles: ["property_manager", "landlord", "owner"], order: 3, section: "finance" },
  { id: "prop_maintenance", labelKey: "menu.biz.maintenance", route: "/me/properties/maintenance", icon: Wrench, roles: ["property_manager", "landlord", "owner"], order: 4, section: "operations" },
  { id: "prop_documents", labelKey: "menu.biz.documents", route: "/me/properties/documents", icon: FileText, roles: ["property_manager", "landlord", "owner"], order: 5, section: "compliance" },

  { id: "tenant_lease", labelKey: "menu.biz.my_lease", route: "/me/leases", icon: FileText, roles: ["tenant"], order: 0, section: "operations" },
  { id: "tenant_payments", labelKey: "menu.biz.my_payments", route: "/wallet/property", icon: CreditCard, roles: ["tenant"], order: 1, section: "finance" },
  { id: "tenant_maintenance", labelKey: "menu.biz.report_issue", route: "/me/maintenance", icon: Wrench, roles: ["tenant"], order: 2, section: "operations" },
  { id: "tenant_receipts", labelKey: "menu.biz.my_receipts", route: "/me/receipts", icon: Receipt, roles: ["tenant"], order: 3, section: "finance" },

  { id: "driver_hub", labelKey: "menu.biz.driver_hub", route: "/driver", icon: Car, roles: ["driver"], order: 0, section: "operations" },
  { id: "driver_earnings", labelKey: "menu.biz.earnings", route: "/driver/earnings", icon: Wallet, roles: ["driver"], order: 1, section: "finance" },

  { id: "admin_dashboard", labelKey: "menu.biz.admin_dashboard", route: "/admin/dashboard", icon: Shield, roles: ["admin"], order: 0, section: "admin" },
  { id: "admin_system", labelKey: "menu.biz.system_health", route: "/admin/system-health", icon: BarChart3, roles: ["admin"], order: 1, section: "admin" },

  { id: "common_orbit", labelKey: "menu.biz.messages", route: "/orbit", icon: MessageCircle, roles: ["merchant", "provider", "property_manager", "landlord", "tenant", "driver"], order: 90, section: "communication" },
  { id: "common_notifications", labelKey: "menu.biz.notifications", route: "/notifications", icon: Bell, roles: ["merchant", "provider", "property_manager", "landlord", "tenant", "driver"], order: 91, section: "communication" },
  { id: "common_settings", labelKey: "menu.biz.settings", route: "/settings", icon: Settings, roles: ["merchant", "provider", "property_manager", "landlord", "tenant", "driver", "admin"], order: 99, section: "settings" },
];

export function getBusinessMenuItems(role: UserRole): BusinessMenuItem[] {
  return BUSINESS_MENU_ITEMS
    .filter(item => item.roles.includes(role))
    .sort((a, b) => a.order - b.order);
}

export function getBusinessMenuSections(role: UserRole): Map<string, BusinessMenuItem[]> {
  const items = getBusinessMenuItems(role);
  const sections = new Map<string, BusinessMenuItem[]>();
  for (const item of items) {
    if (!sections.has(item.section)) sections.set(item.section, []);
    sections.get(item.section)!.push(item);
  }
  return sections;
}

export const QUICK_ACCESS_SERVICES: MenuNode[] = CATEGORY_TREE.slice(0, 8).map((cat, idx) => ({
  id: `qa_${cat.key}`,
  parentId: null,
  level: 1 as MenuLevel,
  label: cat.label,
  labelKey: `menu.vertical.${cat.key}`,
  slug: cat.key,
  emoji: cat.emoji,
  icon: VERTICAL_ICONS[cat.key],
  route: cat.route,
  aliases: [],
  tags: [cat.vertical],
  defaultOrder: idx,
  active: true,
  audience: "public" as const,
  vertical: cat.vertical,
}));
