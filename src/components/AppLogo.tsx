import { Link } from "react-router-dom";
import logoSrc from "@/assets/logo-easylocs.png";

interface AppLogoProps {
  linkTo?: string;
  showLabel?: boolean;
  variant?: "sidebar" | "header" | "landing" | "footer" | "auth";
  className?: string;
}

/**
 * Unified logo component — single source of truth for brand identity.
 *
 * Fixed sizing per context:
 *  - sidebar/header: 32→40px
 *  - landing/auth/footer: 28→36px
 *
 * Uses semantic color tokens for all text.
 */
const AppLogo = ({
  linkTo = "/dashboard",
  showLabel = true,
  variant = "sidebar",
  className = "",
}: AppLogoProps) => {
  const isLanding = variant === "landing" || variant === "footer";
  const isAuth = variant === "auth";
  const href = isLanding || isAuth ? "/" : linkTo;

  // Fixed pixel sizes — no layout shifts
  const imgClass = isLanding || isAuth
    ? "h-7 sm:h-9 w-auto"
    : "h-8 sm:h-10 w-auto";

  const labelClass = isLanding || isAuth
    ? "text-sm sm:text-lg"
    : "text-base lg:text-lg";

  const textColor = isLanding || isAuth
    ? "text-primary-foreground"
    : "text-sidebar-foreground";

  const supColor = isLanding || isAuth
    ? "text-primary-foreground/40"
    : "text-sidebar-foreground/50";

  return (
    <Link
      to={href}
      className={`flex items-center gap-2.5 shrink-0 group select-none ${className}`}
    >
      <img
        src={logoSrc}
        alt="EASY-LOCS"
        className={`${imgClass} object-contain transition-all duration-200`}
        draggable={false}
        style={{ mixBlendMode: "multiply", background: "transparent" }}
        width={40}
        height={40}
      />

      {showLabel && (
        <span
          className={`font-bold tracking-tight whitespace-nowrap leading-none ${labelClass} ${textColor} transition-colors`}
        >
          EASY-LOCS
          <sup className={`text-[7px] align-super ml-0.5 ${supColor}`}>®</sup>
        </span>
      )}
    </Link>
  );
};

export default AppLogo;
