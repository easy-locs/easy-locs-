import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useIdentityModeStore } from "@/stores/identity-mode.store";

export interface CanonicalIdentity {
  userId: string | null;
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  currency: string | null;
  language: string | null;
  mode: "personal" | "business";
  orgId: string | null;
  initials: string;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function useCanonicalIdentity(): CanonicalIdentity {
  const { user, userCountry, userCurrency } = useAuth();
  const { mode, orgId } = useIdentityModeStore();

  return useMemo(() => {
    const meta = user?.user_metadata ?? {};
    const displayName =
      meta.full_name || meta.display_name || user?.email?.split("@")[0] || "User";
    const avatarUrl = meta.avatar_url || null;

    return {
      userId: user?.id ?? null,
      displayName,
      avatarUrl,
      email: user?.email ?? null,
      phone: meta.phone || user?.phone || null,
      country: userCountry ?? null,
      currency: userCurrency ?? null,
      language: meta.language || null,
      mode,
      orgId: mode === "business" ? orgId : null,
      initials: getInitials(displayName),
    };
  }, [user, userCountry, userCurrency, mode, orgId]);
}
