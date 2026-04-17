import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type HealthLevel = "ok" | "warn" | "down" | "unknown";

export interface HealthIndicator {
  id: string;
  label: string;
  level: HealthLevel;
  hint?: string;
}

export interface DetailPanelState {
  title: string;
  subtitle?: string;
  body: ReactNode;
}

export interface KillSwitchState {
  engaged: boolean;
  busy: boolean;
}

export interface ControlContextValue {
  detail: DetailPanelState | null;
  openDetail: (state: DetailPanelState) => void;
  closeDetail: () => void;

  health: HealthIndicator[];
  setHealth: (indicators: HealthIndicator[]) => void;

  killSwitch: KillSwitchState;
  setKillSwitch: (next: Partial<KillSwitchState>) => void;
  killSwitchHandler: (() => Promise<void> | void) | null;
  registerKillSwitchHandler: (handler: (() => Promise<void> | void) | null) => void;

  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;

  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
}

const ControlContext = createContext<ControlContextValue | null>(null);

export function ControlProvider({ children }: { children: ReactNode }) {
  const [detail, setDetail] = useState<DetailPanelState | null>(null);
  const [health, setHealthState] = useState<HealthIndicator[]>([
    { id: "api", label: "API", level: "unknown" },
    { id: "db", label: "DB", level: "unknown" },
    { id: "queue", label: "Queue", level: "unknown" },
    { id: "agents", label: "Agents", level: "unknown" },
  ]);
  const [killSwitch, setKillSwitchState] = useState<KillSwitchState>({
    engaged: false,
    busy: false,
  });
  const [killSwitchHandler, setKillSwitchHandler] = useState<
    (() => Promise<void> | void) | null
  >(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const openDetail = useCallback((state: DetailPanelState) => setDetail(state), []);
  const closeDetail = useCallback(() => setDetail(null), []);

  const setHealth = useCallback((indicators: HealthIndicator[]) => {
    setHealthState(indicators);
  }, []);

  const setKillSwitch = useCallback((next: Partial<KillSwitchState>) => {
    setKillSwitchState((prev) => ({ ...prev, ...next }));
  }, []);

  const registerKillSwitchHandler = useCallback(
    (handler: (() => Promise<void> | void) | null) => {
      setKillSwitchHandler(() => handler);
    },
    [],
  );

  const value = useMemo<ControlContextValue>(
    () => ({
      detail,
      openDetail,
      closeDetail,
      health,
      setHealth,
      killSwitch,
      setKillSwitch,
      killSwitchHandler,
      registerKillSwitchHandler,
      shortcutsOpen,
      setShortcutsOpen,
      paletteOpen,
      setPaletteOpen,
    }),
    [
      detail,
      openDetail,
      closeDetail,
      health,
      setHealth,
      killSwitch,
      setKillSwitch,
      killSwitchHandler,
      registerKillSwitchHandler,
      shortcutsOpen,
      paletteOpen,
    ],
  );

  return <ControlContext.Provider value={value}>{children}</ControlContext.Provider>;
}

export function useControlContext(): ControlContextValue {
  const ctx = useContext(ControlContext);
  if (!ctx) {
    throw new Error("useControlContext must be used inside <ControlProvider>");
  }
  return ctx;
}
