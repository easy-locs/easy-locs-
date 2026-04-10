import { BookOpen, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/lib/i18n";

interface Props { onBack: () => void; }

export default function YouStoriesPage({ onBack }: Props) {
  const { t } = useI18n();

  const audiences: { key: string; labelKey: string }[] = [
    { key: "contacts", labelKey: "orbit.you.contacts" },
    { key: "close_friends", labelKey: "orbit.you.close_friends" },
    { key: "everyone", labelKey: "orbit.you.everyone" },
  ];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
      <div className="flex items-center gap-3 pb-4 border-b border-border/15">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ChevronRight className="h-4 w-4 rotate-180" style={{ color: "hsl(var(--muted-foreground))" }} />
        </button>
        <BookOpen className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold truncate" style={{ color: "hsl(var(--foreground))" }}>{t("orbit.you.stories_title")}</h2>
      </div>
      <div className="space-y-1 mt-4">
        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>{t("orbit.you.default_audience")}</p>
        <div className="grid grid-cols-3 gap-2">
          {audiences.map(a => (
            <button key={a.key} className="py-2 px-2 rounded-lg text-xs font-medium bg-muted text-muted-foreground min-h-[44px]">
              {t(a.labelKey)}
            </button>
          ))}
        </div>
        <Separator className="my-3" />
        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>{t("orbit.you.expiry")}</p>
        <div className="grid grid-cols-3 gap-2">
          {["24h", "48h", "7d"].map(e => (
            <button key={e} className="py-2 px-2 rounded-lg text-xs font-medium bg-muted text-muted-foreground min-h-[44px]">{e}</button>
          ))}
        </div>
        <p className="text-[10px] mt-2" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>{t("orbit.you.stories_expire_hint")}</p>
      </div>
    </div>
  );
}
