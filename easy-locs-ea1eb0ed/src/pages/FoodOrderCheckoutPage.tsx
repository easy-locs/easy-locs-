/**
 * FoodOrderCheckoutPage — Redirects to the real checkout flow.
 * This route exists for legacy/admin links; real flow goes through CartSheet → /checkout.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { Loader2 } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function FoodOrderCheckoutPage() {
  useUiEngine("foodordercheckoutpage");
  const navigate = useNavigate();
  const { itemCount } = useCart();

  useEffect(() => {
    if (itemCount > 0) {
      navigate("/checkout", { replace: true });
    } else {
      navigate("/browse/food", { replace: true });
    }
  }, [itemCount, navigate]);

  return (
    <SubPageShell noContentPad className="flex items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </SubPageShell>
  );
}
