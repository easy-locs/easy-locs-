export type AppHealthState = {
  orbit: "ok" | "degraded" | "down";
  wallet: "ok" | "degraded" | "down";
  radar: "ok" | "degraded" | "down";
  dashboard: "ok" | "degraded" | "down";
  me: "ok" | "degraded" | "down";
  notifications: "ok" | "degraded" | "down";
};

export const DEFAULT_APP_HEALTH: AppHealthState = {
  orbit: "ok",
  wallet: "ok",
  radar: "ok",
  dashboard: "ok",
  me: "ok",
  notifications: "ok",
};

export function reduceHealth(
  current: AppHealthState,
  patch: Partial<AppHealthState>
): AppHealthState {
  return {
    ...current,
    ...patch,
  };
}
