import { Navigate } from "react-router-dom";
export default function SettingsWallet() {
  return <Navigate to="/dashboard/settings?section=wallet" replace />;
}
