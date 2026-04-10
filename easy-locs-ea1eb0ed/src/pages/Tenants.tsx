import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Tenants = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/dashboard/rental-management?tab=tenants", { replace: true });
  }, [navigate]);
  return null;
};

export default Tenants;
