/**
 * Orbit Display Name resolver.
 * Returns the appropriate display name based on user privacy settings.
 */

export type DisplayNameMode = "real" | "username" | "custom" | "anonymous" | "hidden";

export function getOrbitDisplayName(opts: {
  realName?: string | null;
  userId?: string;
  mode?: DisplayNameMode;
  customName?: string;
}): string {
  // Mode priority: explicit param > (caller should pass from DB). Fallback to localStorage only as last resort.
  const mode = opts.mode || (localStorage.getItem("orbit_display_name_mode") as DisplayNameMode) || "real";
  const customName = opts.customName || localStorage.getItem("orbit_custom_display_name") || "";

  switch (mode) {
    case "real":
      return opts.realName?.trim() || "Contact";
    case "username":
      return opts.userId ? `EL-${opts.userId.substring(0, 8).toUpperCase()}` : "Contact";
    case "custom":
      return customName.trim() || opts.realName?.trim() || "Contact";
    case "anonymous":
      return "Private contact";
    case "hidden":
      return "";
    default:
      return opts.realName?.trim() || "Contact";
  }
}

export function getOrbitCallerName(opts: {
  realName?: string | null;
  userId?: string;
}): string {
  const name = getOrbitDisplayName(opts);
  return name || "Incoming call";
}
