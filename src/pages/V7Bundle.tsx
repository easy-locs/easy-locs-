/**
 * V7Bundle — Thin route wrapper that lazy-loads V7 pillar pages.
 * Usage: <V7BundleRoutes /> in App.tsx
 */
import React, { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";

const LazyMyBusinessHub = lazy(() => import("@/pages/MyBusinessHub"));
const LazyMyShopsPage = lazy(() => import("@/pages/MyShopsPage"));
const LazyShopsPage = lazy(() => import("@/pages/ShopsPage"));

const Fallback = () => (
  <div className="flex flex-col min-h-0 flex-1 bg-background px-4 pt-6 space-y-3 max-w-lg mx-auto w-full">
    {[1, 2, 3].map((i) => (
      <div key={i} className="h-20 rounded-3xl bg-muted/40 animate-pulse" />
    ))}
  </div>
);

export function V7BundleRoutes() {
  return (
    <Routes>
      <Route
        path="/shops"
        element={<Suspense fallback={<Fallback />}><LazyShopsPage /></Suspense>}
      />
      <Route
        path="/business"
        element={<Suspense fallback={<Fallback />}><LazyMyBusinessHub /></Suspense>}
      />
      <Route
        path="/business/my-shops"
        element={<Suspense fallback={<Fallback />}><LazyMyShopsPage /></Suspense>}
      />
    </Routes>
  );
}

export default V7BundleRoutes;
