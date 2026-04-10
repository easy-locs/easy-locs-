import AppLogo from "@/components/AppLogo";

/**
 * AuthBrand — Centered logo for auth pages.
 * Rendered in normal flow (not absolute) to avoid overlapping card content.
 */
const AuthBrand = () => (
  <div className="flex items-center justify-center mb-6">
    <AppLogo variant="auth" linkTo="/" />
  </div>
);

export default AuthBrand;
