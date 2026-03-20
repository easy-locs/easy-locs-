import V1MenuPage from "@/pages/V1MenuPage";
import { V1PrimaryAppBridge } from "@/components/v1/V1PrimaryAppBridge";

export default function V1MenuRoute() {
  return (
    <V1PrimaryAppBridge module="settings">
      {(ctx) => <V1MenuPage isMerchant={ctx.role === "merchant" || ctx.role === "admin"} />}
    </V1PrimaryAppBridge>
  );
}
