import { useEffect, useState } from "react";
import { isFavoriteMerchant, toggleFavoriteMerchant } from "@/lib/favorites/favorites";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useOptimisticAction } from "@/hooks/useOptimisticAction";

/**
 * Merchant favorite toggle.
 *
 * Uses `useOptimisticAction` (React 19 `useOptimistic` + `useTransition`)
 * to flip the heart instantly on click. The underlying `toggleFavoriteMerchant`
 * call is fire-and-forget from the user's perspective; if it fails, React
 * drops the optimistic value and we surface a toast. Keeps INP under the
 * 200 ms target set by task #767 even on slow networks.
 */
export default function FavoriteMerchantButton({
  merchantId,
  className = "",
}: {
  merchantId: string;
  className?: string;
}) {
  const { user } = useAuth();
  const [active, setActive] = useState(false);

  useEffect(() => {
    let live = true;

    const run = async () => {
      if (!user?.id || !merchantId) return;
      try {
        const value = await isFavoriteMerchant(user.id, merchantId);
        if (live) setActive(value);
      } catch {}
    };

    run();
    return () => {
      live = false;
    };
  }, [user?.id, merchantId]);

  const { optimisticState: optimisticActive, isPending, run } = useOptimisticAction<boolean, boolean>({
    state: active,
    reducer: (_current, next) => next,
    mutate: async (next) => {
      if (!user?.id) {
        throw new Error("not-authenticated");
      }
      const res = await toggleFavoriteMerchant(user.id, merchantId);
      // Reconcile upstream state with the canonical server value.
      setActive(res.active);
      toast.success(res.active ? "Added to favorites" : "Removed from favorites");
      return res.active;
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "not-authenticated") {
        toast.error("Please sign in first");
      } else {
        toast.error("Could not update favorite");
      }
    },
  });

  const onToggle = () => {
    if (!user?.id) {
      toast.error("Please sign in first");
      return;
    }
    run(!optimisticActive);
  };

  return (
    <button
      onClick={onToggle}
      disabled={isPending}
      aria-pressed={optimisticActive}
      className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${className}`}
      style={{ background: "hsl(0 0% 0% / 0.35)", color: "white" }}
    >
      {optimisticActive ? "♥" : "♡"}
    </button>
  );
}
