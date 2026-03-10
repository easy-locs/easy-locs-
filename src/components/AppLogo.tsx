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
  showLabel = false,
  variant = "sidebar",
  className = "",
}: AppLogoProps) => {
  const isLanding = variant === "landing" || variant === "footer";
  const isAuth = variant === "auth";
  const href = isLanding || isAuth ? "/" : linkTo;

  const sizeMap = {
    sidebar: "h-9 sm:h-10",
    header: "h-9 sm:h-10",
    landing: "h-8 sm:h-9",
    footer: "h-8 sm:h-10",
    auth: "h-14 sm:h-20",
  };

  return (
    <Link
      to={href}
      className={`flex items-center gap-2 shrink-0 select-none ${className}`}
    >
      <img
        src={logoSrc}
        alt="Easy-Locs — Gestion Locative"
        className={`${sizeMap[variant]} w-auto object-contain drop-shadow-lg`}
        draggable={false}
      />
    </Link>
  );
};

export default AppLogo;
