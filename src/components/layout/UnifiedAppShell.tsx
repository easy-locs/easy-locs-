/**
 * UnifiedAppShell — REMOVED. Navigation now handled by global MainBottomNav.
 * This file re-exports a simple pass-through for backward compat.
 */
import { Outlet } from "react-router-dom";

export default function UnifiedAppShell() {
  return <Outlet />;
}
