import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setIntentNavigate } from "@/lib/intent/intent-event-bridge";

export default function IntentNavigateProvider() {
  const navigate = useNavigate();

  useEffect(() => {
    setIntentNavigate((path: string) => navigate(path));
  }, [navigate]);

  return null;
}
