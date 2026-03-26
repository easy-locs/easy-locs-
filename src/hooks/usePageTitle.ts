/**
 * usePageTitle — Sets document.title based on i18n key or plain string.
 * Automatically appends " — Easy-Locs" suffix.
 */
import { useEffect } from "react";
import { tc, hasKey } from "@/lib/i18n-canonical";

const APP_NAME = "Easy-Locs";

export function usePageTitle(titleOrKey: string) {
  useEffect(() => {
    const resolved = hasKey(titleOrKey) ? tc(titleOrKey) : titleOrKey;
    document.title = resolved ? `${resolved} — ${APP_NAME}` : APP_NAME;
    return () => { document.title = APP_NAME; };
  }, [titleOrKey]);
}
