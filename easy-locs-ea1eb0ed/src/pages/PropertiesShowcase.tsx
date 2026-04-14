import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function PropertiesShowcase() {
  useUiEngine("propertiesshowcase");
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/real-estate", { replace: true });
  }, [navigate]);

  return (
    <div className="app-mobile-page flex items-center justify-center h-[60dvh]">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
    </div>
  );
}
