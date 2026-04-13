import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const Tenants = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/dashboard/rental-management?tab=tenants", { replace: true });
  }, [navigate]);
  return (
    <div className="app-mobile-page flex items-center justify-center h-[60dvh]">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
};

export default Tenants;
