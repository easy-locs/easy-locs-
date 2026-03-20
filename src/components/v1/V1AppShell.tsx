/**
 * V1AppShell — Simple content wrapper. 
 * Navigation handled by global MainBottomNav in App.tsx.
 */
import { ReactNode } from "react";

export function V1AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] pb-[calc(56px+env(safe-area-inset-bottom,0px))]">
      {children}
    </div>
  );
}
