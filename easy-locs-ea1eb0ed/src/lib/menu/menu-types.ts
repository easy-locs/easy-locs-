import type { LucideIcon } from "lucide-react";

export type MenuLevel = 1 | 2 | 3 | 4;
export type MenuAudience = "public" | "business" | "both";
export type UserRole = "user" | "merchant" | "provider" | "owner" | "manager" | "admin" | "property_manager" | "tenant" | "landlord" | "driver";

export interface MenuNode {
  id: string;
  parentId: string | null;
  level: MenuLevel;
  label: string;
  labelKey: string;
  slug: string;
  emoji?: string;
  icon?: LucideIcon;
  route: string;
  aliases: string[];
  tags: string[];
  defaultOrder: number;
  active: boolean;
  audience: MenuAudience;
  visibleCountries?: string[];
  hiddenCountries?: string[];
  visibleRoles?: UserRole[];
  featureFlag?: string;
  cluster?: string;
  vertical?: string;
  badge?: string;
  children?: MenuNode[];
}

export interface MenuContext {
  userRole: UserRole;
  countryCode: string;
  language: string;
  isRTL: boolean;
  activeVertical?: string;
  frequentRoutes?: string[];
  favorites?: string[];
  timeOfDay?: "morning" | "afternoon" | "evening" | "night";
  features?: Record<string, boolean>;
}

export interface MenuSection {
  id: string;
  title: string;
  titleKey: string;
  nodes: MenuNode[];
  collapsible: boolean;
  defaultExpanded: boolean;
  icon?: LucideIcon;
}

export interface MenuSearchResult {
  node: MenuNode;
  matchType: "label" | "alias" | "tag" | "slug";
  score: number;
  breadcrumb: string[];
}

export interface ResolvedMenu {
  sections: MenuSection[];
  quickActions: MenuNode[];
  totalItems: number;
}

export interface BusinessMenuItem {
  id: string;
  labelKey: string;
  route: string;
  icon?: LucideIcon;
  roles: UserRole[];
  badge?: string;
  order: number;
  section: string;
  featureFlag?: string;
}
