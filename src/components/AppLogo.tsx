import { Link } from "react-router-dom";
import logoSrc from "@/assets/logo-easylocs.png";

interface AppLogoProps {
  linkTo?: string;
  showLabel?: boolean;
  variant?: "sidebar" | "header" | "landing" | "footer" | "auth";
  className?: string;
}

const AppLogo = ({
  linkTo = "/dashboard",
  showLabel = true,
  variant = "sidebar",
  className = "",
}: AppLogoProps) => {
  const isLanding = variant === "landing" || variant === "footer";
  const isAuth = variant === "auth";
  const href = isLanding || isAuth ? "/" : linkTo;

  const imgSize = isLanding || isAuth ? "h-8 sm:h-10" : "h-8 sm:h-10";

  const textColor =
    variant === "footer"
      ? "text-muted-foreground"
      : isLanding || isAuth
        ? "text-primary-foreground"
        : "text-sidebar-foreground";

  const supColor =
    variant === "footer"
      ? "text-muted-foreground/50"
      : isLanding || isAuth
        ? "text-primary-foreground/40"
        : "text-sidebar-foreground/40";

  return (
    <Link
      to={href}
      className={`flex items-center gap-2 shrink-0 group select-none ${className}`}
    >
      <img
        src={logoSrc}
        alt="EASY-LOCS"
        className={`${imgSize} w-auto object-contain`}
        draggable={false}
        width={40}
        height={40}
      />
      {showLabel && (
        <span className={`font-extrabold tracking-tight whitespace-nowrap leading-none text-sm sm:text-base ${textColor}`}>
          EASY-LOCS
          <sup className={`text-[7px] align-super ml-0.5 font-bold ${supColor}`}>®</sup>
        </span>
      )}
    </Link>
  );
};

export default AppLogo;
