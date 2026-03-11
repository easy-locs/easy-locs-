import { Link } from "react-router-dom";

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

  const sizeMap: Record<string, string> = {
    sidebar: "text-xl",
    header: "text-xl",
    landing: "text-2xl",
    footer: "text-xl",
    auth: "text-3xl sm:text-4xl",
  };

  // Landing/footer variants are always on dark backgrounds
  const useLightText = isLanding || variant === "footer" || variant === "sidebar";

  return (
    <Link
      to={href}
      className={`flex items-center gap-2 shrink-0 select-none group ${className}`}
    >
      <div className="flex items-baseline gap-0.5">
        <span
          className={`${sizeMap[variant]} font-black tracking-tight ${
            useLightText ? "text-white" : "dark:text-white"
          }`}
          style={useLightText ? { color: "hsl(0 0% 100%)" } : { color: "hsl(var(--navy-deep, 220 60% 15%))" }}
        >
          Easy
        </span>
        <span
          className={`${sizeMap[variant]} font-black tracking-tight`}
          style={{
            background: "var(--gradient-gold, linear-gradient(135deg, hsl(45 90% 48%), hsl(35 90% 42%)))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          -Locs
        </span>
        <span
          className="text-[8px] font-bold align-super ml-0.5 text-accent"
        >
          ®
        </span>
      </div>
    </Link>
  );
};

export default AppLogo;
