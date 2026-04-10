import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getReturnOrigin, clearReturnOrigin } from "@/lib/navigation/return-origin";
import { haptic } from "@/lib/haptics";

export function useReturnToOrigin(fallbackRoute = "/") {
  const navigate = useNavigate();

  const returnToOrigin = useCallback((delay = 300) => {
    const origin = getReturnOrigin();
    clearReturnOrigin();
    const target = origin || fallbackRoute;

    haptic("light");
    setTimeout(() => {
      navigate(target, { replace: true });
    }, delay);
  }, [navigate, fallbackRoute]);

  const hasOrigin = getReturnOrigin() !== null;

  return { returnToOrigin, hasOrigin };
}
