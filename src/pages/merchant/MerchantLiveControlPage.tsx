import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getMerchantAvailability,
  setMerchantOpenFlag,
} from "@/lib/merchant/availabilityEngine";

export default function MerchantLiveControlPage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["merchant-live-control", merchantId],
    queryFn: () => getMerchantAvailability(merchantId),
    enabled: !!merchantId,
    staleTime: 5000,
  });

  const toggleOpen = async () => {
    if (!data?.merchant) return;
    try {
      await setMerchantOpenFlag({
        merchantId,
        isOpen: !(data.merchant as any).is_open,
      });
      toast.success("Merchant live state updated");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Could not update merchant state");
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          onClick={() => navigate(`/merchant/dashboard/${merchantId}`)}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Live Control</h1>
          <p className="text-xs text-muted-foreground">Open/close and live availability</p>
        </div>
      </header>

      {isLoading && <div className="mx-4 h-32 rounded-2xl bg-muted animate-pulse" />}

      {!isLoading && data && (
        <>
          <div className="mx-4 rounded-2xl border border-border/20 bg-card p-6 space-y-4">
            <p className="text-base font-bold text-foreground">{(data.merchant as any)?.name || "Merchant"}</p>
            <p className="text-sm text-muted-foreground">
              Flag: {(data.merchant as any)?.is_open ? "Open" : "Closed"}
            </p>
            <p className="text-sm text-muted-foreground">
              Schedule: {data.computed.reason}
            </p>

            <button
              onClick={toggleOpen}
              className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold"
            >
              {(data.merchant as any)?.is_open ? "Close Store Now" : "Open Store Now"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
