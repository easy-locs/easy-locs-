import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { User, Settings, Store, CreditCard, ShieldCheck, ArrowUpRight, ChevronRight, BarChart3, FileText } from "lucide-react";
import { AppBottomSheet } from "@/components/ui/system/AppBottomSheet";
import { useI18n, tSafe } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { haptic } from "@/lib/haptics";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoFull: () => void;
}

const ME_QUICK_LINKS = [
  { icon: User, labelKey: "me.profile", fallback: "Profile", route: "/me/edit", color: "hsl(210 70% 55%)" },
  { icon: Store, labelKey: "me.business", fallback: "Business", route: "/merchant/store-settings", color: "hsl(38 65% 56%)" },
  { icon: CreditCard, labelKey: "me.payments", fallback: "Payments", route: "/me/saved-cards", color: "hsl(160 60% 45%)" },
  { icon: Settings, labelKey: "me.settings", fallback: "Settings", route: "/settings", color: "hsl(270 60% 55%)" },
  { icon: BarChart3, labelKey: "me.analytics", fallback: "Analytics", route: "/merchant/analytics", color: "hsl(200 80% 50%)" },
  { icon: FileText, labelKey: "me.orders", fallback: "Orders", route: "/my-orders", color: "hsl(25 85% 55%)" },
];

function MeQuickSheet({ open, onOpenChange, onGoFull }: Props) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User";
  const avatarUrl = user?.user_metadata?.avatar_url;
  const email = user?.email || "";

  const handleAction = (route: string) => {
    haptic("medium");
    onOpenChange(false);
    setTimeout(() => navigate(route), 150);
  };

  return (
    <AppBottomSheet open={open} onOpenChange={onOpenChange} snapPoints={[0.45, 0.72]}>
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
              style={{
                background: avatarUrl ? undefined : "hsl(220 40% 18%)",
                border: "2px solid hsl(38 65% 56% / 0.3)",
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-5 h-5" style={{ color: "hsl(38 65% 56%)" }} />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate leading-tight">{displayName}</p>
              <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">{email}</p>
              <div className="flex items-center gap-1 mt-1">
                <ShieldCheck className="w-3 h-3" style={{ color: "hsl(160 60% 45%)" }} />
                <span className="text-[9px] font-bold" style={{ color: "hsl(160 60% 45%)" }}>
                  {tSafe(t, "me.verified", "Verified")}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onGoFull}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg active:scale-95 transition-transform"
            style={{ background: "hsl(var(--muted) / 0.15)" }}
          >
            <span className="text-[10px] font-bold text-muted-foreground">
              {tSafe(t, "me.open_full", "Full Profile")}
            </span>
            <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {ME_QUICK_LINKS.map((link) => (
            <button
              key={link.route}
              onClick={() => handleAction(link.route)}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl active:scale-95 transition-transform"
              style={{ background: "hsl(var(--muted) / 0.1)", border: "1px solid hsl(var(--border) / 0.06)" }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${link.color}15` }}
              >
                <link.icon className="w-4 h-4" style={{ color: link.color }} />
              </div>
              <span className="text-[10px] font-bold text-foreground/80">
                {tSafe(t, link.labelKey, link.fallback)}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={onGoFull}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl active:scale-[0.97] transition-transform"
          style={{
            background: "hsl(220 40% 18%)",
            border: "1px solid hsl(38 65% 56% / 0.2)",
          }}
        >
          <User className="w-4 h-4" style={{ color: "hsl(38 65% 56%)" }} />
          <span className="text-xs font-bold text-white">
            {tSafe(t, "me.command_center", "My Space")}
          </span>
        </button>
      </div>
    </AppBottomSheet>
  );
}

export default memo(MeQuickSheet);
