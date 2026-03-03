import { Link } from "react-router-dom";
import logoEasyloc from "@/assets/logo-easylocs.png";

const AuthBrand = () => (
  <div className="absolute top-6 left-6">
    <Link to="/" className="flex items-center gap-2.5">
      <img src={logoEasyloc} alt="EASY-LOCS" className="h-10 w-auto object-contain" />
      <span className="text-xl font-bold tracking-tight text-primary-foreground whitespace-nowrap">
        EASY-LOCS<sup className="text-[9px] align-super ml-0.5 text-primary-foreground/70">®</sup>
      </span>
    </Link>
  </div>
);

export default AuthBrand;
