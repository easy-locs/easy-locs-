import { Link } from "react-router-dom";
import AppLogo from "@/components/AppLogo";

const AuthBrand = () => (
  <div className="fixed top-4 left-4 sm:top-6 sm:left-6 z-50">
    <AppLogo variant="auth" linkTo="/" />
  </div>
);

export default AuthBrand;
