import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { loadV1SessionContext } from "@/lib/v1/v1SessionContext";

export function useV1SessionContext() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["v1-session-context", user?.id],
    queryFn: () => loadV1SessionContext(user?.id),
    staleTime: 30_000,
  });
}
