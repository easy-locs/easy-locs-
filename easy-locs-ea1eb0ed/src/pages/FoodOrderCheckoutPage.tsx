/**
 * FoodOrderCheckoutPage — Redirects to the real checkout flow.
 * This route exists for legacy/admin links; real flow goes through CartSheet → /checkout.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";

export default function FoodOrderCheckoutPage() {
  const navigate = useNavigate();
  const { itemCount } = useCart();

  useEffect(() => {
    if (itemCount > 0) {
      navigate("/checkout", { replace: true });
    } else {
      navigate("/browse/food", { replace: true });
    }
  }, [itemCount, navigate]);

  return null;
}
