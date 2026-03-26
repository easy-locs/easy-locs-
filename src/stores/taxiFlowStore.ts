/**
 * taxiFlowStore — State machine for taxi booking UX.
 * Controls which screen the customer sees: search → preview → active → completed.
 */
import { create } from "zustand";
import type { CanonicalPlace } from "@/lib/address/canonical-place";

export type TaxiFlowStep =
  | "search"        // destination input (NO map)
  | "preview"       // map + route + fare + confirm
  | "active_ride"   // live tracking
  | "completed";    // ride done / rating

export type ServiceLevel = "taxi_standard" | "taxi_premium" | "taxi_xl" | "taxi_moto";
export type BookingMode = "now" | "scheduled";

interface TaxiFlowState {
  step: TaxiFlowStep;
  pickup: CanonicalPlace | null;
  dropoff: CanonicalPlace | null;
  serviceLevel: ServiceLevel;
  bookingMode: BookingMode;
  scheduledDate: string;
  scheduledTime: string;
  seats: number;
  activeJobId: string | null;

  setStep: (s: TaxiFlowStep) => void;
  setPickup: (p: CanonicalPlace | null) => void;
  setDropoff: (d: CanonicalPlace | null) => void;
  setServiceLevel: (sl: ServiceLevel) => void;
  setBookingMode: (bm: BookingMode) => void;
  setScheduledDate: (d: string) => void;
  setScheduledTime: (t: string) => void;
  setSeats: (s: number) => void;
  setActiveJobId: (id: string | null) => void;
  reset: () => void;
}

const INITIAL: Pick<TaxiFlowState,
  "step" | "pickup" | "dropoff" | "serviceLevel" | "bookingMode" |
  "scheduledDate" | "scheduledTime" | "seats" | "activeJobId"
> = {
  step: "search",
  pickup: null,
  dropoff: null,
  serviceLevel: "taxi_standard",
  bookingMode: "now",
  scheduledDate: "",
  scheduledTime: "",
  seats: 1,
  activeJobId: null,
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
