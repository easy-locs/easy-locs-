/**
 * useMatchingEngine — Abstraction for driver/courier matching.
 * Currently runs demo simulation; designed to swap to real backend (WebSocket/Realtime).
 */
import { useState, useCallback, useRef, useEffect } from "react";

export type MatchState = "idle" | "searching" | "matched" | "arriving" | "in_progress" | "completed" | "cancelled";

export interface MatchedProvider {
  id: string;
  name: string;
  rating: number;
  trips: number;
  vehicle: string;
  plate: string;
  eta: string;
  avatar: string;
  lat?: number;
  lng?: number;
}

interface MatchingOptions {
  type: "ride" | "delivery";
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  /** Auto-advance through demo states */
  demo?: boolean;
}

const MOCK_PROVIDERS: Record<string, MatchedProvider> = {
  ride: {
    id: "driver-1",
    name: "Mohamed K.",
    rating: 4.9,
    trips: 1247,
    vehicle: "Toyota Corolla · Gray",
    plate: "AB-123-CD",
    eta: "3 min",
    avatar: "🧑‍✈️",
  },
  delivery: {
    id: "courier-1",
    name: "Sarah L.",
    rating: 4.8,
    trips: 832,
    vehicle: "Scooter · Blue",
    plate: "SC-456-EF",
    eta: "5 min",
    avatar: "🛵",
  },
};

export function useMatchingEngine(options: MatchingOptions) {
  const [state, setState] = useState<MatchState>("idle");
  const [provider, setProvider] = useState<MatchedProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const demo = options.demo !== false; // default true

  // Cleanup on unmount
  useEffect(() => {
    return () => timeoutsRef.current.forEach(clearTimeout);
  }, []);

  const startMatching = useCallback(() => {
    setError(null);
    setState("searching");
    setProvider(null);

    if (demo) {
      // Demo: simulate matching flow
      const t1 = setTimeout(() => {
        setProvider(MOCK_PROVIDERS[options.type] || MOCK_PROVIDERS.ride);
        setState("matched");
      }, 3000);

      const t2 = setTimeout(() => setState("arriving"), 7000);
      const t3 = setTimeout(() => setState("in_progress"), 12000);

      timeoutsRef.current = [t1, t2, t3];
    } else {
      // TODO: Real backend matching via Supabase Realtime
      // 1. Insert match_request into DB
      // 2. Subscribe to realtime channel for state updates
      // 3. Backend edge function handles provider assignment
      console.log("[MatchingEngine] Real matching not yet implemented");
    }
  }, [options.type, demo]);

  const cancel = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setState("cancelled");
    setProvider(null);
  }, []);

  const reset = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setState("idle");
    setProvider(null);
    setError(null);
  }, []);

  return {
    state,
    provider,
    error,
    isActive: state !== "idle" && state !== "completed" && state !== "cancelled",
    startMatching,
    cancel,
    reset,
    /** Manually set state (for UI control) */
    setState,
  };
}
