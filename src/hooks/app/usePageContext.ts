import { useLocation } from "react-router-dom";
import { useMemo } from "react";
import { detectPageContext, getPageDecoration } from "@/lib/visual/pageDecoration";

/**
 * Hook providing current page context and visual decoration.
 */
export function usePageContext() {
  const { pathname } = useLocation();

  return useMemo(() => {
    const context = detectPageContext(pathname);
    const decoration = getPageDecoration(context);
    return { context, decoration, pathname };
  }, [pathname]);
}
