import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface OnboardingDraftData {
  vertical?: string;
  subcategory?: string;
  businessName?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  description?: string;
  legalName?: string;
  taxId?: string;
  registrationNumber?: string;
  address?: string;
  lat?: number;
  lng?: number;
  logoUrl?: string;
  coverUrl?: string;
  galleryUrls?: string[];
  openingHours?: Record<string, { open: string; close: string; closed?: boolean }>;
  bankName?: string;
  iban?: string;
  catalogItems?: Array<Record<string, unknown>>;
  currentStep: number;
  lastSavedAt: number;
}

interface OnboardingDraftStore {
  draft: OnboardingDraftData | null;
  saveDraft: (data: Partial<OnboardingDraftData>) => void;
  clearDraft: () => void;
  getDraft: () => OnboardingDraftData | null;
  hasDraft: () => boolean;
}

const DEFAULT_DRAFT: OnboardingDraftData = {
  currentStep: 0,
  lastSavedAt: Date.now(),
};

export const useOnboardingDraftStore = create<OnboardingDraftStore>()(
  persist(
    (set, get) => ({
      draft: null,

      saveDraft: (data) => {
        const current = get().draft ?? { ...DEFAULT_DRAFT };
        set({
          draft: {
            ...current,
            ...data,
            lastSavedAt: Date.now(),
          },
        });
      },

      clearDraft: () => set({ draft: null }),

      getDraft: () => get().draft,

      hasDraft: () => get().draft !== null && (get().draft?.currentStep ?? 0) > 0,
    }),
    {
      name: "easylocs_onboarding_draft",
      version: 1,
    },
  ),
);

export interface ConsumerOnboardingData {
  interests: string[];
  city?: string;
  country?: string;
  currency?: string;
  notificationPrefs: {
    deals: boolean;
    orders: boolean;
    messages: boolean;
    news: boolean;
    prayer: boolean;
  };
  completed: boolean;
  lastSavedAt: number;
}

interface ConsumerDraftStore {
  draft: ConsumerOnboardingData | null;
  saveDraft: (data: Partial<ConsumerOnboardingData>) => void;
  clearDraft: () => void;
}

const DEFAULT_CONSUMER: ConsumerOnboardingData = {
  interests: [],
  notificationPrefs: {
    deals: true,
    orders: true,
    messages: true,
    news: true,
    prayer: false,
  },
  completed: false,
  lastSavedAt: Date.now(),
};

export const useConsumerDraftStore = create<ConsumerDraftStore>()(
  persist(
    (set, get) => ({
      draft: null,
      saveDraft: (data) => {
        const current = get().draft ?? { ...DEFAULT_CONSUMER };
        set({ draft: { ...current, ...data, lastSavedAt: Date.now() } });
      },
      clearDraft: () => set({ draft: null }),
    }),
    {
      name: "easylocs_consumer_onboarding_draft",
      version: 1,
    },
  ),
);
