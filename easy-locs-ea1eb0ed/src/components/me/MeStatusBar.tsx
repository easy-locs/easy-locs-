import { memo } from "react";
import { useI18n } from "@/lib/i18n";
import { CheckCircle2, XCircle, Clock, Eye, EyeOff, Wallet, MessageCircle } from "lucide-react";

interface Props {
  isVerified: boolean;
  publishStatus: string;
  walletActive: boolean;
  orbitActive: boolean;
}

const gold = "hsl(var(--accent))";
const navy = "hsl(225 22% 16%)";

function MeStatusBar({ isVerified, publishStatus, walletActive, orbitActive }: Props) {
  const { t } = useI18n();

  const isPublic = publishStatus === "public";
  const isDraft = publishStatus === "draft";

  const pills = [
    {
      icon: isVerified ? CheckCircle2 : Clock,
      label: isVerified ? t("me.status_verified") : t("me.status_pending"),
      active: isVerified,
    },
    {
      icon: isPublic ? Eye : EyeOff,
      label: isPublic ? t("me.status_published") : isDraft ? t("me.status_draft") : t("me.status_hidden"),
      active: isPublic,
    },
    {
      icon: Wallet,
      label: walletActive ? t("me.status_wallet_ok") : t("me.status_wallet_setup"),
      active: walletActive,
    },
    {
      icon: MessageCircle,
      label: orbitActive ? t("me.status_orbit_on") : t("me.status_orbit_off"),
      active: orbitActive,
    },
  ];

  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
      {pills.map((pill, i) => (
        <div
          key={i}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full shrink-0 text-[10px] font-bold uppercase tracking-wider"
          style={{
            background: pill.active ? "hsl(152 60% 42% / 0.08)" : `${navy}08`,
            color: pill.active ? "hsl(152 60% 42%)" : `${navy}60`,
            border: `1px solid ${pill.active ? "hsl(152 60% 42% / 0.15)" : `${navy}0F`}`,
          }}
        >
          <pill.icon className="w-3 h-3" />
          <span>{pill.label}</span>
        </div>
      ))}
    </div>
  );
}

export default memo(MeStatusBar);
