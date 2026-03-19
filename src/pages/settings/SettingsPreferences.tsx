import { Navigate } from "react-router-dom";
export default function SettingsPreferences() {
  return <Navigate to="/dashboard/settings?section=preferences" replace />;
}
