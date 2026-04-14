import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function PropertiesShowcase() {
  useUiEngine("propertiesshowcase");
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/real-estate", { replace: true });
  }, [navigate]);

  return (
    <SubPageShell noContentPad className="flex items-center justify-center">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
    </SubPageShell>
  );
}
