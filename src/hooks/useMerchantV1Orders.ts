import { useQuery } from "@tanstack/react-query";
import { getMerchantV1Orders } from "@/lib/v1/merchantOrderFlow";

export function useMerchantV1Orders(merchantId: string | null) {
  return useQuery({
    queryKey: ["merchant-v1-orders", merchantId],
    queryFn: () => getMerchantV1Orders(merchantId!),
    enabled: !!merchantId,
    staleTime: 5000,
    refetchInterval: 7000,
  });
}
