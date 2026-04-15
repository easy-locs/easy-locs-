import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface C2CDraft {
  category: string;
  subcategory: string;
  title: string;
  description: string;
  customAttributes: Record<string, any>;
  condition: string;
  photoUrls: string[];
  priceType: string;
  price: number | null;
  currency: string;
  city: string;
  quartier: string;
  country: string;
  lat: number | null;
  lng: number | null;
  deliveryOption: string;
  step: number;
}

const EMPTY_DRAFT: C2CDraft = {
  category: "",
  subcategory: "",
  title: "",
  description: "",
  customAttributes: {},
  condition: "",
  photoUrls: [],
  priceType: "fixed",
  price: null,
  currency: "EUR",
  city: "",
  quartier: "",
  country: "",
  lat: null,
  lng: null,
  deliveryOption: "hand",
  step: 0,
};

interface C2CDraftStore {
  draft: C2CDraft;
  setField: <K extends keyof C2CDraft>(key: K, value: C2CDraft[K]) => void;
  setAttribute: (key: string, value: any) => void;
  setStep: (step: number) => void;
  reset: () => void;
}

export const useC2CDraftStore = create<C2CDraftStore>()(
  persist(
    (set) => ({
      draft: { ...EMPTY_DRAFT },
      setField: (key, value) =>
        set((s) => ({ draft: { ...s.draft, [key]: value } })),
      setAttribute: (key, value) =>
        set((s) => ({
          draft: {
            ...s.draft,
            customAttributes: { ...s.draft.customAttributes, [key]: value },
          },
        })),
      setStep: (step) =>
        set((s) => ({ draft: { ...s.draft, step } })),
      reset: () => set({ draft: { ...EMPTY_DRAFT } }),
    }),
    { name: "c2c-draft-v1" }
  )
);
