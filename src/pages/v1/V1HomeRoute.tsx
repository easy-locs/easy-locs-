import V1HomePage from "@/pages/V1HomePage";
import { V1PrimaryAppBridge } from "@/components/v1/V1PrimaryAppBridge";

export default function V1HomeRoute() {
  return (
    <V1PrimaryAppBridge module="home">
      {(ctx) => <V1HomePage isMerchant={ctx.role === "merchant" || ctx.role === "admin"} />}
    </V1PrimaryAppBridge>
  );
}
