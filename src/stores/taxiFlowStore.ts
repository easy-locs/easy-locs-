/**
 * taxiFlowStore — 5-step state machine for taxi booking (Careem/Uber UX).
 * search → preview → requesting → tracking → completed
 */
import { create } from "zustand";
import type { CanonicalPlace } from "@/lib/address/canonical-place";

export type TaxiFlowStep =
  | "search"       // Step 1: destination input, NO map
  | "preview"      // Step 2: map + route + fare + ride options
  | "requesting"   // Step 3: searching for driver
  | "tracking"     // Step 4: live ride tracking
  | "completed";   // Step 5: ride done

export type TaxiServiceLevel = "taxi_standard" | "taxi_premium" | "taxi_xl" | "taxi_moto";

interface TaxiFlowState {
  step: TaxiFlowStep;
  pickup: CanonicalPlace | null;
  dropoff: CanonicalPlace | null;
  serviceLevel: TaxiServiceLevel;
  bookingMode: "now" | "scheduled";
  scheduledDate: string;
  scheduledTime: string;
  seats: number;
  activeJobId: string | null;

  setStep: (s: TaxiFlowStep) => void;
  setPickup: (p: CanonicalPlace | null) => void;
  setDropoff: (d: CanonicalPlace | null) => void;
  setServiceLevel: (sl: TaxiServiceLevel) => void;
  setBookingMode: (bm: "now" | "scheduled") => void;
  setScheduledDate: (d: string) => void;
  setScheduledTime: (t: string) => void;
  setSeats: (s: number) => void;
  setActiveJobId: (id: string | null) => void;
  reset: () => void;
}

const INITIAL = {
  step: "search" as TaxiFlowStep,
  pickup: null as CanonicalPlace | null,
  dropoff: null as CanonicalPlace | null,
  serviceLevel: "taxi_standard" as TaxiServiceLevel,
  bookingMode: "now" as "now" | "scheduled",
  scheduledDate: "",
  scheduledTime: "",
  seats: 1,
  activeJobId: null as string | null,
};

export const useTaxiFlowStore = create<TaxiFlowState>((set) => ({
  ...INITIAL,
  setStep: (step) => set({ step }),
  setPickup: (pickup) => set({ pickup }),
  setDropoff: (dropoff) => set({ dropoff }),
  setServiceLevel: (serviceLevel) => set({ serviceLevel }),
  setBookingMode: (bookingMode) => set({ bookingMode }),
  setScheduledDate: (scheduledDate) => set({ scheduledDate }),
  setScheduledTime: (scheduledTime) => set({ scheduledTime }),
  setSeats: (seats) => set({ seats }),
  setActiveJobId: (activeJobId) => set({ activeJobId }),
  reset: () => set({ ...INITIAL }),
}));
