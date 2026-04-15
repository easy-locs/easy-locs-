import { useState, useEffect } from "react";
import { db } from "@/services/db";
import { useAuth } from "@/contexts/AuthContext";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  itemId: string;
  shopId?: string;
  variantId?: string;
  size?: "sm" | "md";
  className?: string;
}

export default function WishlistButton({ itemId, shopId, variantId, size = "md", className }: WishlistButtonProps) {
  const { user } = useAuth();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id || !itemId) return;
    let q = db.from("user_wishlist_items").select("id").eq("user_id", user.id).eq("item_id", itemId);
    if (variantId) q = q.eq("variant_id", variantId);
    else q = q.is("variant_id", null);
    q.maybeSingle().then(({ data }) => setIsWishlisted(!!data));
  }, [user?.id, itemId, variantId]);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) { toast.error("Please sign in"); return; }
    setLoading(true);
    try {
      if (isWishlisted) {
        let q = db.from("user_wishlist_items").delete().eq("user_id", user.id).eq("item_id", itemId);
        if (variantId) q = q.eq("variant_id", variantId);
        else q = q.is("variant_id", null);
        await q;
        setIsWishlisted(false);
        toast.success("Removed from wishlist");
      } else {
        await db.from("user_wishlist_items").insert({
          user_id: user.id,
          item_id: itemId,
          variant_id: variantId || null,
          shop_id: shopId || null,
        });
        setIsWishlisted(true);
        toast.success("Added to wishlist");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4.5 w-4.5";

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={cn(
        "rounded-full flex items-center justify-center transition-all active:scale-90",
        isWishlisted ? "bg-red-50 text-red-500" : "bg-muted/50 text-muted-foreground hover:text-red-400",
        sizeClasses,
        className
      )}
    >
      <Heart className={cn(iconSize, isWishlisted && "fill-red-500")} />
    </button>
  );
}
