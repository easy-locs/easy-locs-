import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { resolveV1Actor } from "@/lib/v1/v1RoleResolver";

export function useResolvedV1Actor() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["resolved-v1-actor", user?.id],
    queryFn: () => resolveV1Actor(user?.id),
    staleTime: 30_000,
  });
}
