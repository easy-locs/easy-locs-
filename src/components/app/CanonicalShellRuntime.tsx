import { AppBootRuntime } from "@/components/app/AppBootRuntime";
import { CanonicalAppBridges } from "@/components/app/CanonicalAppBridges";
import { AppHealthBanner } from "@/components/app/AppHealthBanner";

export function CanonicalShellRuntime() {
  return (
    <>
      <AppBootRuntime />
      <CanonicalAppBridges />
      <AppHealthBanner />
    </>
  );
}
