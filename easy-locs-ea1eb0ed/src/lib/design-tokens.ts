export const DESIGN_TOKENS = {
  spacing: {
    "0": "0px",
    "0.5": "2px",
    "1": "4px",
    "1.5": "6px",
    "2": "8px",
    "2.5": "10px",
    "3": "12px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "8": "32px",
    "10": "40px",
    "12": "48px",
    "16": "64px",
    "20": "80px",
    "24": "96px",
  },

  typography: {
    "display-xl": { fontSize: "2.25rem", lineHeight: "2.5rem", fontWeight: 700, letterSpacing: "-0.02em" },
    "display-lg": { fontSize: "1.875rem", lineHeight: "2.25rem", fontWeight: 700, letterSpacing: "-0.015em" },
    "heading-lg": { fontSize: "1.5rem", lineHeight: "2rem", fontWeight: 700, letterSpacing: "-0.01em" },
    "heading-md": { fontSize: "1.25rem", lineHeight: "1.75rem", fontWeight: 600, letterSpacing: "-0.005em" },
    "heading-sm": { fontSize: "1rem", lineHeight: "1.5rem", fontWeight: 600, letterSpacing: "0" },
    "body-lg": { fontSize: "1rem", lineHeight: "1.5rem", fontWeight: 400, letterSpacing: "0" },
    "body-md": { fontSize: "0.875rem", lineHeight: "1.25rem", fontWeight: 400, letterSpacing: "0" },
    "body-sm": { fontSize: "0.75rem", lineHeight: "1rem", fontWeight: 400, letterSpacing: "0" },
    caption: { fontSize: "0.6875rem", lineHeight: "0.875rem", fontWeight: 400, letterSpacing: "0.01em" },
    overline: { fontSize: "0.625rem", lineHeight: "0.75rem", fontWeight: 600, letterSpacing: "0.05em" },
  },

  colors: {
    primary: "hsl(var(--primary))",
    primaryForeground: "hsl(var(--primary-foreground))",
    secondary: "hsl(var(--secondary))",
    muted: "hsl(var(--muted))",
    mutedForeground: "hsl(var(--muted-foreground))",
    accent: "hsl(var(--accent))",
    accentForeground: "hsl(var(--accent-foreground))",
    destructive: "hsl(var(--destructive))",
    background: "hsl(var(--background))",
    foreground: "hsl(var(--foreground))",
    card: "hsl(var(--card))",
    cardForeground: "hsl(var(--card-foreground))",
    border: "hsl(var(--border))",
    input: "hsl(var(--input))",
    ring: "hsl(var(--ring))",
    success: "hsl(142 72% 44%)",
    warning: "hsl(38 92% 50%)",
    danger: "hsl(0 72% 51%)",
    info: "hsl(210 100% 50%)",
    surface: "hsl(226 24% 11%)",
    surfaceElevated: "hsl(226 24% 14%)",
    cardHover: "hsl(226 24% 12%)",
    overlay: "hsl(228 28% 7% / 0.8)",
    borderSubtle: "hsl(0 0% 100% / 0.05)",
    borderHover: "hsl(0 0% 100% / 0.1)",
    accentDim: "hsl(168 50% 36%)",
    textPrimary: "hsl(0 0% 100% / 0.9)",
    textSecondary: "hsl(0 0% 100% / 0.55)",
    textTertiary: "hsl(0 0% 100% / 0.35)",
    textMuted: "hsl(0 0% 100% / 0.2)",
  },

  elevation: {
    none: "none",
    subtle: "0 1px 2px hsl(0 0% 0% / 0.04)",
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    medium: "0 2px 8px hsl(0 0% 0% / 0.06), 0 1px 2px hsl(0 0% 0% / 0.04)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    elevated: "0 8px 24px hsl(0 0% 0% / 0.1), 0 2px 8px hsl(0 0% 0% / 0.06)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    card: "0 2px 12px hsl(0 0% 0% / 0.18), 0 1px 3px hsl(0 0% 0% / 0.08), inset 0 1px 0 hsl(0 0% 100% / 0.03)",
    modal: "0 12px 48px hsl(0 0% 0% / 0.3), 0 4px 16px hsl(0 0% 0% / 0.12)",
    glow: "0 0 20px hsl(168 72% 44% / 0.12), 0 0 6px hsl(168 72% 44% / 0.06)",
    inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
  },

  radius: {
    none: "0px",
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    "2xl": "24px",
    full: "9999px",
  },

  layout: {
    sidebarWidth: "16rem",
    contentMaxWidth: "87.5rem",
    pagePaddingX: "1rem",
    pagePaddingXSm: "1.5rem",
  },

  breakpoints: {
    xs: 475,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    "2xl": 1400,
  },

  grid: {
    mobile: { columns: 4, gutter: 16, margin: 16 },
    tablet: { columns: 8, gutter: 24, margin: 24 },
    desktop: { columns: 12, gutter: 24, margin: 32 },
  },

  animation: {
    duration: {
      instant: 100,
      fast: 150,
      normal: 250,
      slow: 400,
      deliberate: 600,
    },
    easing: {
      default: "cubic-bezier(0.4, 0, 0.2, 1)",
      in: "cubic-bezier(0.4, 0, 1, 1)",
      out: "cubic-bezier(0, 0, 0.2, 1)",
      inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
      spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
    },
  },

  gradient: {
    card: "linear-gradient(135deg, hsl(226 24% 11%), hsl(226 22% 15%))",
    hero: "linear-gradient(135deg, hsl(226 24% 10%), hsl(228 28% 7%))",
    accent: "linear-gradient(135deg, hsl(168 72% 44%), hsl(168 72% 38%))",
    overlay: "linear-gradient(180deg, transparent 0%, hsl(228 28% 7% / 0.6) 40%, hsl(228 28% 7% / 0.92) 100%)",
  },
} as const;

export type DesignTokens = typeof DESIGN_TOKENS;

export function generateCSSCustomProperties(): string {
  const lines: string[] = [":root {"];

  for (const [key, value] of Object.entries(DESIGN_TOKENS.spacing)) {
    lines.push(`  --spacing-${key}: ${value};`);
  }

  for (const [key, value] of Object.entries(DESIGN_TOKENS.radius)) {
    lines.push(`  --radius-${key}: ${value};`);
  }

  for (const [key, shadow] of Object.entries(DESIGN_TOKENS.elevation)) {
    lines.push(`  --shadow-${key}: ${shadow};`);
  }

  for (const [key, duration] of Object.entries(DESIGN_TOKENS.animation.duration)) {
    lines.push(`  --duration-${key}: ${duration}ms;`);
  }

  for (const [key, easing] of Object.entries(DESIGN_TOKENS.animation.easing)) {
    lines.push(`  --easing-${key}: ${easing};`);
  }

  lines.push("}");
  return lines.join("\n");
}

export function getSpacing(key: keyof typeof DESIGN_TOKENS.spacing): string {
  return DESIGN_TOKENS.spacing[key];
}

export function getRadius(key: keyof typeof DESIGN_TOKENS.radius): string {
  return DESIGN_TOKENS.radius[key];
}

export function getElevation(key: keyof typeof DESIGN_TOKENS.elevation): string {
  return DESIGN_TOKENS.elevation[key];
}

export function getColor(key: keyof typeof DESIGN_TOKENS.colors): string {
  return DESIGN_TOKENS.colors[key];
}

export function getTypography(key: keyof typeof DESIGN_TOKENS.typography): {
  fontSize: string; lineHeight: string; fontWeight: number; letterSpacing: string;
} {
  return DESIGN_TOKENS.typography[key];
}

export const DESIGN_SYSTEM_VERSION = "2.0.0";
