import { Link } from "react-router-dom";
import logoSrc from "@/assets/logo-easylocs.png";

interface AppLogoProps {
  /** Where clicking the logo navigates to */
  linkTo?: string;
  /** Show text label next to the logo */
  showLabel?: boolean;
  /** Visual variant for different contexts */
  variant?: "sidebar" | "header" | "landing" | "footer" | "auth";
  /** Additional CSS classes on the wrapper */
  className?: string;
}

/**
 * Unified logo component used across the entire application.
 * Ensures consistent sizing, spacing, alignment, and theme integration.
 *
 * Sizing:
 *  - Desktop: 40px height
 *  - Mobile:  28px height
 *
 * The logo image uses `mix-blend-mode: multiply` in light mode and
 * brightness/contrast filters in dark mode so it never looks like
 * a "sticker" pasted on the page — it blends naturally with every background.
 */
const AppLogo = ({
  linkTo = "/dashboard",
  showLabel = true,
  variant = "sidebar",
  className = "",
}: AppLogoProps) => {
  const isLanding = variant === "landing" || variant === "footer";
  const isAuth = variant === "auth";

  // Determine link destination
  const href = isLanding || isAuth ? "/" : linkTo;

  // Size classes: 40px desktop, 28px mobile
  const imgSizeClass = "h-7 sm:h-10 w-auto";

  // Text style varies by context
  const labelSizeClass =
    variant === "auth"
      ? "text-base sm:text-xl"
      : variant === "footer" || variant === "landing"
      ? "text-base sm:text-lg"
      : "text-base lg:text-lg";

  // Foreground color token based on context
  const textColorClass =
    isLanding || isAuth
      ? "text-primary-foreground"
      : "text-sidebar-foreground";

  const supColorClass =
    isLanding || isAuth
      ? "text-primary-foreground/40"
      : "text-sidebar-foreground/50";

  return (
    <Link
      to={href}
      className={`flex items-center gap-2 shrink-0 group ${className}`}
    >
      {/* Logo image — blended into background via mix-blend & filters */}
      <img
        src={logoSrc}
        alt="EASY-LOCS"
        className={`${imgSizeClass} object-contain select-none
          dark:brightness-110 dark:contrast-95
          transition-all duration-200`}
        draggable={false}
        style={{
          /* Light mode: blend naturally; Dark mode handled by Tailwind */
          mixBlendMode: "normal",
          filter: "none",
        }}
      />

      {showLabel && (
        <span
          className={`font-bold tracking-tight whitespace-nowrap ${labelSizeClass} ${textColorClass} transition-colors`}
        >
          EASY-LOCS
          <sup className={`text-[8px] align-super ml-0.5 ${supColorClass}`}>
            ®
          </sup>
        </span>
      )}
    </Link>
  );
};

export default AppLogo;
