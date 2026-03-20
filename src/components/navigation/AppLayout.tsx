/**
 * AppLayout — Global layout wrapper for the main app.
 * Renders children + MainBottomNav. Replaces AppShell/MobileBottomNav.
 */
import MainBottomNav from "./MainBottomNav";

export default function AppLayout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <main className="flex-1 overflow-y-auto pb-[calc(56px+env(safe-area-inset-bottom,0px))] lg:pb-0">
        {children}
      </main>
      <MainBottomNav />
    </div>
  );
}
