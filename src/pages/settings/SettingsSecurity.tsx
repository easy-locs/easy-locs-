import { Navigate } from "react-router-dom";
export default function SettingsSecurity() {
  return <Navigate to="/dashboard/settings?section=security" replace />;
}
