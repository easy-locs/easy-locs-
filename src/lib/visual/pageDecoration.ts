/**
 * Page Decoration Engine — Adds contextual visual flavor by page type.
 * Returns gradient + accent config for headers/backgrounds.
 */

export type PageContext = "orbit" | "marketplace" | "ride" | "wallet" | "property" | "profile" | "default";

export interface PageDecoration {
  gradient: string;
  accentColor: string;
  iconTint: string;
  headerBg: string;
}

const decorations: Record<PageContext, PageDecoration> = {
  orbit: {
    gradient: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(220 35% 28%) 100%)",
    accentColor: "hsl(var(--primary))",
    iconTint: "text-primary",
    headerBg: "bg-primary",
  },
  marketplace: {
    gradient: "linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(38 70% 62%) 100%)",
    accentColor: "hsl(var(--accent))",
    iconTint: "text-accent",
    headerBg: "bg-accent",
  },
  ride: {
    gradient: "linear-gradient(135deg, hsl(var(--info)) 0%, hsl(200 80% 45%) 100%)",
    accentColor: "hsl(var(--info))",
    iconTint: "text-info",
    headerBg: "bg-info",
  },
  wallet: {
    gradient: "linear-gradient(135deg, hsl(var(--success)) 0%, hsl(152 50% 50%) 100%)",
    accentColor: "hsl(var(--success))",
    iconTint: "text-success",
    headerBg: "bg-success",
  },
  property: {
    gradient: "linear-gradient(135deg, hsl(var(--navy)) 0%, hsl(220 40% 25%) 100%)",
    accentColor: "hsl(var(--navy))",
    iconTint: "text-foreground",
    headerBg: "bg-card",
  },
  profile: {
    gradient: "linear-gradient(135deg, hsl(var(--muted)) 0%, hsl(var(--background)) 100%)",
    accentColor: "hsl(var(--muted-foreground))",
    iconTint: "text-muted-foreground",
    headerBg: "bg-background",
  },
  default: {
    gradient: "linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--muted)) 100%)",
    accentColor: "hsl(var(--foreground))",
    iconTint: "text-foreground",
    headerBg: "bg-background",
  },
};

export function getPageDecoration(ctx: PageContext): PageDecoration {
  return decorations[ctx] || decorations.default;
}

/** Detect page context from route */
export function detectPageContext(pathname: string): PageContext {
  if (pathname === "/" || pathname.startsWith("/orbit")) return "orbit";
  if (pathname.startsWith("/explore") || pathname.startsWith("/food") || pathname.startsWith("/shop") || pathname.startsWith("/achille")) return "marketplace";
  if (pathname.startsWith("/map") || pathname.startsWith("/ride")) return "ride";
  if (pathname.startsWith("/wallet")) return "wallet";
  if (pathname.startsWith("/property") || pathname.startsWith("/real-estate")) return "property";
  if (pathname.startsWith("/settings") || pathname.startsWith("/me")) return "profile";
  return "default";
}
