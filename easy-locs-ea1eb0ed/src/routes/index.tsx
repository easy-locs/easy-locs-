import { Route } from "react-router-dom";
import * as Pages from "@/app/app-route-registry";
import { RouteLoadingSkeleton } from "@/app/route-skeletons";
import { TransitionRoutes } from "@/app/transition-router";

import { AuthRoutes } from "./auth.routes";
import { DashboardRoutes } from "./dashboard.routes";
import { RadarRoutes } from "./radar.routes";
import { OrbitRoutes } from "./orbit.routes";
import { WalletRoutes } from "./wallet.routes";
import { MeRoutes } from "./me.routes";
import { MerchantRoutes } from "./merchant.routes";
import { DriverRoutes } from "./driver.routes";
import { ProRoutes } from "./pro.routes";
import { AdminRoutes } from "./admin.routes";
import { OnboardingRoutes } from "./onboarding.routes";
import { DeeplinksRoutes } from "./deeplinks.routes";
import { SeoRoutes } from "./seo.routes";
import { LegalRoutes } from "./legal.routes";

const { SEOCatchAll, AppNotFoundPage } = Pages;

export { RouteLoadingSkeleton };

export function AppRoutes() {
  return (
    <TransitionRoutes>
      {AuthRoutes()}
      {DashboardRoutes()}
      {RadarRoutes()}
      {OrbitRoutes()}
      {WalletRoutes()}
      {MeRoutes()}
      {MerchantRoutes()}
      {DriverRoutes()}
      {ProRoutes()}
      {AdminRoutes()}
      {OnboardingRoutes()}
      {DeeplinksRoutes()}
      {SeoRoutes()}
      {LegalRoutes()}
      <Route path="/seo/*" element={<SEOCatchAll />} />
      <Route path="*" element={<AppNotFoundPage />} />
    </TransitionRoutes>
  );
}
