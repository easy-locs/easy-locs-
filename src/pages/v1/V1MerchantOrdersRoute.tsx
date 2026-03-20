import { V1PrimaryAppBridge } from "@/components/v1/V1PrimaryAppBridge";
import V1MerchantOrdersPage from "@/pages/v1/V1MerchantOrdersPage";

export default function V1MerchantOrdersRoute() {
  return (
    <V1PrimaryAppBridge module="merchant_orders" requireMerchantContext>
      {(ctx) => <V1MerchantOrdersPage merchantId={ctx.merchantId!} />}
    </V1PrimaryAppBridge>
  );
}
