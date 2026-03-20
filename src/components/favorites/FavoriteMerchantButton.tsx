import { useEffect, useState } from "react";
import { isFavoriteMerchant, toggleFavoriteMerchant } from "@/lib/favorites/favorites";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function FavoriteMerchantButton({
  merchantId,
  className = "",
}: {
  merchantId: string;
  className?: string;
}) {
  const { user } = useAuth();
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const onToggle = async () => {
    if (!user?.id) {
      toast.error("Please sign in first");
      return;
    }

    try {
      setLoading(true);
      const res = await toggleFavoriteMerchant(user.id, merchantId);
      setActive(res.active);
      toast.success(res.active ? "Added to favorites" : "Removed from favorites");
    } catch (err: any) {
      toast.error(err.message || "Could not update favorite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={onToggle}
      disabled={loading}
      className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${className}`}
      style={{ background: "hsl(0 0% 0% / 0.35)", color: "white" }}
    >
      {active ? "♥" : "♡"}
    </button>
  );
}
