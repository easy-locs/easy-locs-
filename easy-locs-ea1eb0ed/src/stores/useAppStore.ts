/**
 * useAppStore — Zustand global UI store.
 * Layer 3.4: Replaces prop-drilling for sidebar, filters, dashboard preferences.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppStore {
  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;

  // Dashboard filter preferences (persisted)
  dashboardCountryFilter: string | null;
  setDashboardCountryFilter: (country: string | null) => void;

  // Active dashboard tab
  dashboardActiveTab: string;
  setDashboardActiveTab: (tab: string) => void;

  // Explore filters
  exploreSearch: string;
  setExploreSearch: (s: string) => void;
  exploreCountry: string;
  setExploreCountry: (c: string) => void;
  exploreCity: string;
  setExploreCity: (c: string) => void;

  // Marketplace display currency
  displayCurrency: string;
  setDisplayCurrency: (c: string) => void;

  // Notification panel
  notificationPanelOpen: boolean;
  setNotificationPanelOpen: (v: boolean) => void;

  // PDF generation preference
  pdfMode: "client" | "server";
  setPdfMode: (m: "client" | "server") => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // Sidebar
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      // Dashboard filter
      dashboardCountryFilter: null,
      setDashboardCountryFilter: (country) => set({ dashboardCountryFilter: country }),

      // Dashboard tab
      dashboardActiveTab: "overview",
      setDashboardActiveTab: (tab) => set({ dashboardActiveTab: tab }),

      // Explore filters
      exploreSearch: "",
      setExploreSearch: (s) => set({ exploreSearch: s }),
      exploreCountry: "all",
      setExploreCountry: (c) => set({ exploreCountry: c }),
      exploreCity: "",
      setExploreCity: (c) => set({ exploreCity: c }),

      // Currency
      displayCurrency: "EUR",
      setDisplayCurrency: (c) => set({ displayCurrency: c }),

      // Notification panel
      notificationPanelOpen: false,
      setNotificationPanelOpen: (v) => set({ notificationPanelOpen: v }),

      // PDF mode
      pdfMode: "client",
      setPdfMode: (m) => set({ pdfMode: m }),
    }),
    {
      name: "easylocs-app-store",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        dashboardCountryFilter: state.dashboardCountryFilter,
        displayCurrency: state.displayCurrency,
        pdfMode: state.pdfMode,
      }),
    }
  )
);
