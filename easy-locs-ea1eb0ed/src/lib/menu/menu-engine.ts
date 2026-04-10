import type { MenuNode, MenuContext, MenuSection, MenuSearchResult, ResolvedMenu, UserRole } from "./menu-types";
import { getMenuTree, getFlatMenuIndex, getBusinessMenuItems, getBusinessMenuSections } from "./menu-registry";

function isNodeVisible(node: MenuNode, ctx: MenuContext): boolean {
  if (!node.active) return false;

  if (node.visibleCountries?.length && !node.visibleCountries.includes(ctx.countryCode)) return false;
  if (node.hiddenCountries?.length && node.hiddenCountries.includes(ctx.countryCode)) return false;

  if (node.visibleRoles?.length && !node.visibleRoles.includes(ctx.userRole)) return false;

  if (node.audience === "business" && ctx.userRole === "user") return false;
  if (node.audience === "public" && ["admin"].includes(ctx.userRole)) return true;

  if (node.featureFlag && ctx.features && ctx.features[node.featureFlag] === false) return false;

  return true;
}

function filterTree(nodes: MenuNode[], ctx: MenuContext): MenuNode[] {
  const result: MenuNode[] = [];
  for (const node of nodes) {
    if (!isNodeVisible(node, ctx)) continue;
    const filtered = { ...node };
    if (node.children?.length) {
      filtered.children = filterTree(node.children, ctx);
      if (filtered.children.length === 0) continue;
    }
    result.push(filtered);
  }
  return result;
}

function scoreNode(node: MenuNode, ctx: MenuContext): number {
  let score = 1000 - node.defaultOrder * 10;

  if (ctx.frequentRoutes?.includes(node.route)) score += 200;
  if (ctx.favorites?.includes(node.id)) score += 150;
  if (node.vertical === ctx.activeVertical) score += 100;

  if (ctx.timeOfDay === "morning" && ["food", "taxi"].includes(node.slug)) score += 50;
  if (ctx.timeOfDay === "evening" && ["food", "stay"].includes(node.slug)) score += 30;

  return score;
}

function sortNodes(nodes: MenuNode[], ctx: MenuContext): MenuNode[] {
  return [...nodes].sort((a, b) => scoreNode(b, ctx) - scoreNode(a, ctx));
}

export function resolvePublicMenu(ctx: MenuContext, quickActionCount = 14): ResolvedMenu {
  const tree = getMenuTree();
  const filtered = filterTree(tree, ctx);
  const sorted = sortNodes(filtered, ctx);

  const sections: MenuSection[] = [
    {
      id: "verticals",
      title: "Services",
      titleKey: "menu.section.services",
      nodes: sorted,
      collapsible: false,
      defaultExpanded: true,
    },
  ];

  const quickActions = sorted.slice(0, quickActionCount);

  return {
    sections,
    quickActions,
    totalItems: getFlatMenuIndex().filter(n => isNodeVisible(n, ctx)).length,
  };
}

export function resolveBusinessMenu(ctx: MenuContext): MenuSection[] {
  const role = ctx.userRole;
  const sectionMap = getBusinessMenuSections(role);
  const sections: MenuSection[] = [];

  const SECTION_TITLES: Record<string, { title: string; titleKey: string }> = {
    operations: { title: "Operations", titleKey: "menu.section.operations" },
    finance: { title: "Finance", titleKey: "menu.section.finance" },
    growth: { title: "Growth", titleKey: "menu.section.growth" },
    settings: { title: "Settings", titleKey: "menu.section.settings" },
    communication: { title: "Communication", titleKey: "menu.section.communication" },
    compliance: { title: "Compliance", titleKey: "menu.section.compliance" },
    admin: { title: "Admin", titleKey: "menu.section.admin" },
  };

  const order = ["operations", "finance", "growth", "compliance", "communication", "settings", "admin"];

  for (const sectionKey of order) {
    const items = sectionMap.get(sectionKey);
    if (!items?.length) continue;

    const meta = SECTION_TITLES[sectionKey] ?? { title: sectionKey, titleKey: `menu.section.${sectionKey}` };

    const nodes: MenuNode[] = items
      .filter(item => !item.featureFlag || !ctx.features || ctx.features[item.featureFlag] !== false)
      .map(item => ({
        id: item.id,
        parentId: null,
        level: 2 as const,
        label: item.labelKey,
        labelKey: item.labelKey,
        slug: item.id,
        icon: item.icon,
        route: item.route,
        aliases: [],
        tags: [],
        defaultOrder: item.order,
        active: true,
        audience: "business" as const,
        badge: item.badge,
      }));

    sections.push({
      id: sectionKey,
      title: meta.title,
      titleKey: meta.titleKey,
      nodes,
      collapsible: true,
      defaultExpanded: sectionKey === "operations",
    });
  }

  return sections;
}

export function searchMenu(query: string, ctx: MenuContext, limit = 20): MenuSearchResult[] {
  if (!query.trim()) return [];

  const q = query.toLowerCase().trim();
  const flat = getFlatMenuIndex();
  const results: MenuSearchResult[] = [];

  for (const node of flat) {
    if (!isNodeVisible(node, ctx)) continue;

    let matchType: MenuSearchResult["matchType"] | null = null;
    let score = 0;

    if (node.label.toLowerCase().includes(q)) {
      matchType = "label";
      score = node.label.toLowerCase().startsWith(q) ? 100 : 80;
    } else if (node.slug.includes(q)) {
      matchType = "slug";
      score = 70;
    } else if (node.aliases.some(a => a.toLowerCase().includes(q))) {
      matchType = "alias";
      score = 60;
    } else if (node.tags.some(t => t.toLowerCase().includes(q))) {
      matchType = "tag";
      score = 50;
    }

    if (matchType) {
      if (ctx.frequentRoutes?.includes(node.route)) score += 20;
      if (ctx.favorites?.includes(node.id)) score += 15;

      const breadcrumb = buildBreadcrumb(node);
      results.push({ node, matchType, score, breadcrumb });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

function buildBreadcrumb(node: MenuNode): string[] {
  const flat = getFlatMenuIndex();
  const crumbs: string[] = [node.label];
  let current = node;

  while (current.parentId) {
    const parent = flat.find(n => n.id === current.parentId);
    if (!parent) break;
    crumbs.unshift(parent.label);
    current = parent;
  }

  return crumbs;
}

export function getFilteredVerticals(ctx: MenuContext): MenuNode[] {
  const tree = getMenuTree();
  return filterTree(tree, ctx);
}

export function getVerticalSubMenu(verticalKey: string, ctx: MenuContext): MenuNode[] {
  const tree = getMenuTree();
  const vertical = tree.find(n => n.slug === verticalKey);
  if (!vertical?.children) return [];
  return filterTree(vertical.children, ctx);
}

export function getQuickActions(ctx: MenuContext, count = 6): MenuNode[] {
  const menu = resolvePublicMenu(ctx);
  return menu.quickActions.slice(0, count);
}
