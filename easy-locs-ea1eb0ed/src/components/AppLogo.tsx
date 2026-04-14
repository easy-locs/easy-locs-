/**
 * AppLogo — unified brand component, delegates to EasyLocsLogo.
 */
import { Link } from "react-router-dom";
import EasyLocsLogo from "@/components/brand/EasyLocsLogo";
import { useI18n } from "@/lib/i18n";

interface AppLogoProps {
  linkTo?: string;
  showLabel?: boolean;
  variant?: "sidebar" | "header" | "landing" | "footer" | "auth";
  className?: string;
}

const sizeMap: Record<string, "xs" | "sm" | "md" | "lg"> = {
  sidebar: "sm",
  header: "sm",
  landing: "md",
  footer: "sm",
  auth: "md",
};

const AppLogo = ({
  linkTo = "/dashboard",
  showLabel = false,
  variant = "sidebar",
  className = "",
}: AppLogoProps) => {
  const { t } = useI18n();
  const isLanding = variant === "landing" || variant === "footer";
  const isAuth = variant === "auth";
  const href = isLanding || isAuth ? "/" : linkTo;

  return (
    <Link
      to={href}
      className={`flex items-center gap-2 shrink-0 select-none group ${className}`}
    >
      <div className="hidden sm:block">
        <EasyLocsLogo variant="full" size={sizeMap[variant]} />
      </div>
      <div className="block sm:hidden">
        <EasyLocsLogo variant="full" size="sm" />
      </div>
      {variant === "footer" && (
        <span
          className="text-[10px] tracking-[0.2em] uppercase font-medium hidden sm:block"
          style={{ color: "hsl(var(--accent) / 0.6)" }}
        >
          {t("brand.tagline") || "Connect \u2022 Locate \u2022 Grow"}
        </span>
      )}
    </Link>
  );
};

export default AppLogo;
