/**
 * useEnsureOrg — Ensures the current user has an organization.
 */
import { useCallback, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import * as profileRepo from "@/repositories/profile.repository";

export function useEnsureOrg() {
  const { user, orgId, refreshProfile } = useAuth();
  const [creating, setCreating] = useState(false);

  const ensureOrg = useCallback(async (): Promise<string | null> => {
    if (orgId) return orgId;
    if (!user) return null;
    setCreating(true);
    try {
      const orgName = user.email?.split("@")[0] || "My Business";
      const newOrg = await profileRepo.createOrg(orgName, user.id, user.email || "");
      if (!newOrg) return null;
      await profileRepo.addOrgMember(newOrg.id, user.id, "owner");
      await profileRepo.updateProfile(user.id, { user_type: "landlord", onboarding_completed: true });
      await refreshProfile();
      return newOrg.id;
    } catch (err) {
      console.error("[useEnsureOrg] failed:", err);
      return null;
    } finally {
      setCreating(false);
    }
  }, [user, orgId, refreshProfile]);

  return { ensureOrg, creating, hasOrg: !!orgId };
}
