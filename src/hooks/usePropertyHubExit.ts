import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const PROPERTY_HUB_ROLE_KEY = "easylocs_property_hub_role";
const PROPERTY_EXIT_FLAG_KEY = "easylocs_property_hub_exit_ts";

export function clearPropertyHubContext(userId?: string | null) {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.removeItem(PROPERTY_HUB_ROLE_KEY);
    sessionStorage.setItem(PROPERTY_EXIT_FLAG_KEY, String(Date.now()));

    if (userId) {
      localStorage.removeItem(`easylocs_active_role_${userId}`);
    }
  } catch {
    // Ignore storage access errors
  }
}

export function usePropertyHubExit() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return useCallback(() => {
    clearPropertyHubContext(user?.id);
    navigate("/property-hub", {
      replace: true,
      state: { propertyHubExit: true },
    });
  }, [navigate, user?.id]);
}
