/**
 * BrandConfig — Centralized branding for EASY-LOCS®
 * Used across emails, PDFs, and UI components.
 */

export const BRAND = {
  name: "EASY-LOCS®",
  nameShort: "Easy-Locs",
  tagline: "Gestion locative intelligente",
  email: {
    from: "noreply@easy-locs.com",
    replyTo: "contact@easy-locs.com",
    fromName: "Easy-Locs",
  },
  colors: {
    primary: "#1a2744",
    gold: "#d4a34a",
    body: "#282828",
    muted: "#6e6e6e",
    background: "#ffffff",
    cardBg: "#f8f7f4",
  },
  pdf: {
    colorPrimary: [26, 39, 68] as [number, number, number],
    colorGold: [212, 163, 74] as [number, number, number],
    colorBody: [40, 40, 40] as [number, number, number],
    colorMuted: [110, 110, 110] as [number, number, number],
    footerText: "Document genere a titre informatif. Il ne remplace pas un conseil juridique.",
    brandLabel: "EASY-LOCS",
  },
  urls: {
    app: "https://www.easy-locs.com",
  },
} as const;

/** Generate a branded HTML email wrapper */
export function brandedEmailHtml(content: string, footerText?: string): string {
  return `<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:0;background:${BRAND.colors.background};">
    <div style="background:${BRAND.colors.primary};padding:20px 24px;text-align:center;">
      <span style="color:${BRAND.colors.gold};font-size:20px;font-weight:700;letter-spacing:1px;">${BRAND.name}</span>
    </div>
    <div style="padding:24px 24px 16px;">
      ${content}
    </div>
    <div style="border-top:1px solid #e5e5e5;padding:16px 24px;text-align:center;">
      <p style="color:${BRAND.colors.muted};font-size:11px;margin:0;">${footerText || BRAND.tagline}</p>
      <p style="color:${BRAND.colors.muted};font-size:10px;margin:4px 0 0;">© ${new Date().getFullYear()} ${BRAND.name}</p>
    </div>
  </div>`;
}

/** Generate a CTA button for emails */
export function emailButton(label: string, href: string): string {
  return `<div style="text-align:center;margin:24px 0;">
    <a href="${href}" style="display:inline-block;background:${BRAND.colors.gold};color:${BRAND.colors.primary};font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;">${label}</a>
  </div>`;
}
