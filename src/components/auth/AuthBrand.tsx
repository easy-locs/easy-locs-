import { Link } from "react-router-dom";
import logoEasyloc from "@/assets/logo-easylocs.png";

const AuthBrand = () => (
  <div className="fixed top-4 left-4 sm:top-6 sm:left-6 z-50">
    <Link to="/" className="flex items-center gap-2">
      <img src={logoEasyloc} alt="EASY-LOCS" className="h-8 sm:h-10 w-auto object-contain" />
      <span className="hidden sm:inline text-xl font-bold tracking-tight text-primary-foreground whitespace-nowrap">
        EASY-LOCS<sup className="text-[9px] align-super ml-0.5 text-primary-foreground/70">®</sup>
      </span>
    </Link>
  </div>
);

export default AuthBrand;
