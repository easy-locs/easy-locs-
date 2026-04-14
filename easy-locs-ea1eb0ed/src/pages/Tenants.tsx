import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

const Tenants = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/dashboard/rental-management?tab=tenants", { replace: true });
  }, [navigate]);
  useUiEngine("tenants");

  return (
    <SubPageShell noContentPad className="flex items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </SubPageShell>
  );
};

export default Tenants;
