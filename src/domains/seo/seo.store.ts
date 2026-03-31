/**
 * SEO Store — Single owner for all page metadata.
 */
import { create } from "zustand";

export interface SeoMeta {
  title: string;
  description: string;
  canonicalUrl: string | null;
  ogImage: string | null;
  jsonLd: Record<string, unknown> | null;
  noindex: boolean;
  hreflangAlternates: Array<{ lang: string; url: string }>;
}

interface SeoState extends SeoMeta {
  setMeta: (meta: Partial<SeoMeta>) => void;
  setNoindex: (noindex: boolean) => void;
  clear: () => void;
}

const DEFAULT_META: SeoMeta = {
  title: "Easy-Locs — Property Management Software for Landlords Worldwide",
  description: "Manage rental properties worldwide. Leases, receipts, tenant portal, accounting — all-in-one platform for landlords.",
  canonicalUrl: null,
  ogImage: "https://www.easy-locs.com/pwa-512x512.png",
  jsonLd: null,
  noindex: false,
  hreflangAlternates: [],
};

export const useSeoStore = create<SeoState>((set) => ({
  ...DEFAULT_META,

  setMeta: (meta) => set((s) => ({ ...s, ...meta })),
  setNoindex: (noindex) => set({ noindex }),
  clear: () => set(DEFAULT_META),
}));
