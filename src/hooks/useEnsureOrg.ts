import { useCallback, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Ensures the current user has an organization.
 * For free/client accounts that want to publish listings,
 * this auto-creates a personal org on demand.
 */
export function useEnsureOrg() {
  const { user, orgId, refreshProfile } = useAuth();
  const [creating, setCreating] = useState(false);

  const ensureOrg = useCallback(async (): Promise<string | null> => {
    // Already has org
    if (orgId) return orgId;
    if (!user) return null;

    setCreating(true);
    try {
      // Create a personal org
      const orgName = user.email?.split("@")[0] || "My Business";
      const { data: newOrg, error: orgErr } = await supabase
        .from("orgs")
        .insert({
          name: orgName,
          owner_user_id: user.id,
          email: user.email || "",
        })
        .select("id")
        .single();

      if (orgErr || !newOrg) {
        console.error("[useEnsureOrg] org creation failed:", orgErr);
        return null;
      }

      // Add user as owner member
      await supabase.from("org_members").insert({
        org_id: newOrg.id,
        user_id: user.id,
        role: "owner",
      });

      // Update profile to landlord type with onboarding done
      await supabase.from("profiles").update({
        user_type: "landlord",
        onboarding_completed: true,
      }).eq("id", user.id);

      // Refresh auth context to pick up new org
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
