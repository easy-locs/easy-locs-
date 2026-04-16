import { useMemo } from "react";
import { Link } from "react-router-dom";
import EasyLocsLogo from "@/components/brand/EasyLocsLogo";
import type { DynamicLogoProps } from "@/components/brand/EasyLocsLogo";
import { useI18n } from "@/lib/i18n";
import { useDynamicLogo } from "@/hooks/useDynamicLogo";

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
  auth: "lg",
};

const animatedContexts = new Set(["landing", "auth"]);

const AppLogo = ({
  linkTo = "/dashboard",
  showLabel = false,
  variant = "sidebar",
  className = "",
}: AppLogoProps) => {
  const { t } = useI18n();
  const logoCtx = useDynamicLogo();
  const isLanding = variant === "landing" || variant === "footer";
  const isAuth = variant === "auth";
  const href = isLanding || isAuth ? "/" : linkTo;
  const shouldAnimate = animatedContexts.has(variant);

  const isSubtle = variant === "sidebar" || variant === "header";
  const dynamic: DynamicLogoProps = useMemo(() => ({
    gradientColors: logoCtx.gradientColors,
    microIcon: logoCtx.microIcon,
    specialEvent: isSubtle ? null : logoCtx.specialEvent,
  }), [logoCtx.gradientColors, logoCtx.microIcon, logoCtx.specialEvent, isSubtle]);

  return (
    <Link
      to={href}
      className={`flex items-center gap-2 shrink-0 select-none group ${className}`}
    >
      <div className="hidden sm:block">
        <EasyLocsLogo variant="full" size={sizeMap[variant]} animate={shouldAnimate} dynamic={dynamic} />
      </div>
      <div className="block sm:hidden">
        <EasyLocsLogo variant="full" size={variant === "auth" ? "md" : "sm"} animate={shouldAnimate} dynamic={dynamic} />
      </div>
      {variant === "footer" && (
        <span
          className="text-[0.625rem] tracking-[0.2em] uppercase font-medium hidden sm:block"
          style={{ color: "hsl(var(--accent) / 0.6)" }}
        >
          {t("brand.tagline") || "Connect \u2022 Locate \u2022 Grow"}
        </span>
      )}
    </Link>
  );
};

export default AppLogo;
