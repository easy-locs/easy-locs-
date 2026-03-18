import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { I18nProvider } from "@/lib/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1, refetchOnWindowFocus: false },
  },
});

const HomePage = lazy(() => import("./pages/Index"));
const DiscoverPage = lazy(() => import("./pages/DiscoverPage"));
const SuperMapRadarPage = lazy(() => import("./pages/SuperMapRadarPage"));
const WalletHub = lazy(() => import("./pages/WalletHub"));
const UserProfilePage = lazy(() => import("./pages/deep-link/UserProfilePage"));
const ProductPage = lazy(() => import("./pages/deep-link/ProductPage"));
const PayRequestPage = lazy(() => import("./pages/deep-link/PayRequestPage"));
const QrScannerPage = lazy(() => import("./pages/payments/QrScannerPage"));
const ShopPage = lazy(() => import("./pages/ShopPage"));
const NotFoundPage = lazy(() => import("./pages/NotFound"));

function Loader() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#0b1220",
        color: "white",
      }}
    >
      Loading...
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="easylocs-theme">
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <TooltipProvider>
            <AuthProvider>
              <Toaster />
              <Sonner />
              <Suspense fallback={<Loader />}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/discover" element={<DiscoverPage />} />
                  <Route path="/super-map" element={<SuperMapRadarPage />} />
                  <Route path="/dashboard/wallet" element={<WalletHub />} />
                  <Route path="/pay/scan" element={<QrScannerPage />} />
                  <Route path="/pay/request/:requestId" element={<PayRequestPage />} />
                  <Route path="/u/:userId" element={<UserProfilePage />} />
                  <Route path="/p/:productId" element={<ProductPage />} />
                  <Route path="/s/:slug" element={<ShopPage />} />
                  <Route path="/index" element={<Navigate to="/" replace />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </AuthProvider>
          </TooltipProvider>
        </I18nProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
