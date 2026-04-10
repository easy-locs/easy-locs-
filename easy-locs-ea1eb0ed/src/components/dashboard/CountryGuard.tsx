import { Navigate } from "react-router-dom";
import { useCountryContext } from "@/hooks/useCountryContext";

/**
 * Wraps operational pages that MUST have a country context.
 * If accessed without ?country=XX, redirects to the global dashboard
 * so the user selects a country first.
 */
const CountryGuard = ({ children }: { children: React.ReactNode }) => {
  const country = useCountryContext();
  
  if (!country) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default CountryGuard;
