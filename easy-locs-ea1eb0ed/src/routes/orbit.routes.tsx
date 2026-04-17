import { Suspense, type ComponentType } from "react";
import { Route } from "react-router-dom";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import * as Pages from "@/app/app-route-registry";
import { PillarSkeleton } from "@/app/route-skeletons";

const {
  CommunicationCenter, OrbitAISupportPage, OrbitAddContactPage, OrbitContactsPage, OrbitIdentityPage,
} = Pages;

/**
 * Named Orbit sub-sections (single source of truth).
 *
 * Adding a new entry here automatically:
 *   1. Registers the route under `/orbit/<segment>`.
 *   2. Keeps the bottom nav visible on that page (see `shouldHideBottomNav`
 *      in `src/config/navigation.ts`, which imports this list).
 *
 * The bottom nav is only hidden inside an actual conversation thread
 * (`/orbit/:conversationId`), never on a named sub-section. This prevents
 * the "Orbit traps the user" regression from task #988 from coming back
 * whenever a future Orbit sub-section is added.
 */
export const ORBIT_SUBSECTIONS: ReadonlyArray<{
  segment: string;
  component: ComponentType;
}> = [
  { segment: "contacts", component: OrbitContactsPage },
  { segment: "add", component: OrbitAddContactPage },
  { segment: "identity", component: OrbitIdentityPage },
  { segment: "support", component: OrbitAISupportPage },
];

export const ORBIT_SUBSECTION_PATHS: ReadonlySet<string> = new Set(
  ORBIT_SUBSECTIONS.map((s) => `/orbit/${s.segment}`),
);

export function OrbitRoutes() {
  return (
    <>
      <Route path="/orbit" element={<ProtectedRoute><FeatureErrorBoundary featureName="Orbit"><Suspense fallback={<PillarSkeleton pillar="orbit" />}><CommunicationCenter /></Suspense></FeatureErrorBoundary></ProtectedRoute>} />
      {ORBIT_SUBSECTIONS.map(({ segment, component: Component }) => (
        <Route
          key={segment}
          path={`/orbit/${segment}`}
          element={<ProtectedRoute><FeatureErrorBoundary featureName="Orbit"><Component /></FeatureErrorBoundary></ProtectedRoute>}
        />
      ))}
      <Route path="/orbit/:conversationId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Orbit"><CommunicationCenter /></FeatureErrorBoundary></ProtectedRoute>} />
    </>
  );
}
