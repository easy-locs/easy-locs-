import { useQuery } from "@tanstack/react-query";
import { getDriverLiveProfile } from "@/lib/driver/driverLive";

export function useDriverLive(userId?: string | null) {
  return useQuery({
    queryKey: ["driver-live-profile", userId],
    queryFn: () => getDriverLiveProfile(userId!),
    enabled: !!userId,
    staleTime: 3000,
    refetchInterval: 5000,
  });
}
