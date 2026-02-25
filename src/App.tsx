import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { seedDemoData } from "@/lib/store";
import Index from "./pages/Index";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Receipts from "./pages/Receipts";
import Reminders from "./pages/Reminders";
import Vault from "./pages/Vault";
import Documents from "./pages/Documents";
import AIAssistant from "./pages/AIAssistant";
import Leases from "./pages/Leases";
import Company from "./pages/Company";
import Sharing from "./pages/Sharing";
import Billing from "./pages/Billing";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppInit = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    seedDemoData();
  }, []);
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppInit>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/receipts" element={<Receipts />} />
            <Route path="/dashboard/reminders" element={<Reminders />} />
            <Route path="/dashboard/vault" element={<Vault />} />
            <Route path="/dashboard/documents" element={<Documents />} />
            <Route path="/dashboard/assistant" element={<AIAssistant />} />
            <Route path="/dashboard/leases" element={<Leases />} />
            <Route path="/dashboard/company" element={<Company />} />
            <Route path="/dashboard/sharing" element={<Sharing />} />
            <Route path="/dashboard/billing" element={<Billing />} />
            <Route path="/dashboard/settings" element={<Settings />} />
            <Route path="/dashboard/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppInit>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
