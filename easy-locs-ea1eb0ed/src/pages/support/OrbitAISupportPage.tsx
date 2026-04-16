import { lazy, Suspense } from "react";
import PillarPage from "@/components/layout/PillarPage";

const OrbitAISupportChat = lazy(() => import("@/components/orbit/support/OrbitAISupportChat"));

export default function OrbitAISupportPage() {
  return (
    <PillarPage noPadding noSafeArea style={{ height: "100dvh" }}>
      <Suspense
        fallback={
          <div
            style={{
              height: "100dvh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "hsl(228 28% 12%)",
              color: "hsl(0 0% 60%)",
              fontSize: 14,
            }}
          >
            Loading support...
          </div>
        }
      >
        <OrbitAISupportChat />
      </Suspense>
    </PillarPage>
  );
}
