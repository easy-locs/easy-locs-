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
  title: "Easy-Locs — Food, Services, Taxi, Hotel in One App",
  description: "Easy-Locs: order food, book taxis, find hotels, get deliveries and local services — all in one super app. 190+ countries, 120+ currencies, 31 languages.",
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
