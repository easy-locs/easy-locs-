import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrbitIdentity } from "@/hooks/useOrbitIdentity";

export type AccountType = "personal" | "business";

export interface AccountIdentity {
  displayName: string;
  initials: string;
  avatarUrl: string | null;
  email: string | null;
  accountType: AccountType;
  accountLabel: string;
  userId: string | null;
}

function buildInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";
}

export function useAccountIdentity(): AccountIdentity {
  const { user, userType, activeRole } = useAuth();
  const orbit = useOrbitIdentity();

  return useMemo(() => {
    if (!user) {
      return {
        displayName: "Guest",
        initials: "?",
        avatarUrl: null,
        email: null,
        accountType: "personal" as AccountType,
        accountLabel: "Personal",
        userId: null,
      };
    }

    const meta = user.user_metadata as Record<string, any> | undefined;

    const compositeName = [meta?.first_name, meta?.last_name].filter(Boolean).join(" ") || null;

    const rawName =
      orbit?.displayName ||
      meta?.display_name ||
      meta?.full_name ||
      meta?.name ||
      compositeName ||
      meta?.username ||
      null;

    const displayName =
      rawName ||
      user.email?.split("@")[0] ||
      "User";

    const avatarUrl =
      orbit?.avatarUrl ||
      meta?.avatar_url ||
      null;

    const isBusiness =
      userType === "landlord" ||
      activeRole === "landlord" ||
      (meta?.account_type === "business");

    const accountType: AccountType = isBusiness ? "business" : "personal";
    const accountLabel = isBusiness ? "Business" : "Personal";

    return {
      displayName,
      initials: buildInitials(displayName),
      avatarUrl,
      email: user.email || null,
      accountType,
      accountLabel,
      userId: user.id,
    };
  }, [
    user?.id,
    user?.email,
    user?.user_metadata,
    orbit?.displayName,
    orbit?.avatarUrl,
    userType,
    activeRole,
  ]);
}

export function resolveAccountDisplayName(user: {
  user_metadata?: Record<string, any>;
  email?: string;
} | null): string {
  if (!user) return "Guest";
  const meta = user.user_metadata;
  return (
    meta?.display_name ||
    meta?.full_name ||
    meta?.name ||
    user.email?.split("@")[0] ||
    "User"
  );
}
