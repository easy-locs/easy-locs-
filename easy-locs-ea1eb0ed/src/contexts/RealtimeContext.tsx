"use client";

import { createContext, useContext, type ReactNode } from "react";

interface RealtimeContextValue {
  // Extend as needed
}

const RealtimeContext = createContext<RealtimeContextValue>({});

export function RealtimeProvider({ children }: { children: ReactNode }) {
  return <RealtimeContext.Provider value={{}}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
