import { ReactNode } from "react";
import V1BottomNav from "@/components/v1/V1BottomNav";

export function V1AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] pb-24">
      {children}
      <V1BottomNav />
    </div>
  );
}
