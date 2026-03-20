export function getCardRadiusClass(size: "sm" | "md" | "lg" = "md") {
  if (size === "sm") return "rounded-2xl";
  if (size === "lg") return "rounded-[28px]";
  return "rounded-[24px]";
}

export function getSectionTitleClass() {
  return "text-[11px] uppercase tracking-wide font-bold text-muted-foreground";
}

export function getPageShellClass() {
  return "max-w-md mx-auto px-4 py-4 space-y-4 pb-32";
}

export function getPrimaryButtonClass() {
  return "rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold active:scale-[0.98] transition-transform";
}

export function getSecondaryButtonClass() {
  return "rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-foreground active:scale-[0.98] transition-transform";
}
