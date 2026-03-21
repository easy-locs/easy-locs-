/**
 * V1WalletHubPage — Redirects to main wallet hub.
 * Legacy V1 wallet is removed.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function V1WalletHubPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate("/wallet/hub", { replace: true }); }, [navigate]);
  return null;
}
