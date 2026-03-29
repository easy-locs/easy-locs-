/**
 * YouMediaPage — Orbit media settings sub-page.
 */
import { ImageIcon, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useOrbitSettingsStore } from "@/families/tabs/you-tab";

interface Props { onBack: () => void; }

export default function YouMediaPage({ onBack }: Props) {
  const orbitSettings = useOrbitSettingsStore();

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
      <div className="flex items-center gap-3 pb-4 border-b border-border/15">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
          <ChevronRight className="h-4 w-4 text-muted-foreground rotate-180" />
        </button>
        <ImageIcon className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Media</h2>
      </div>
      <div className="space-y-1 mt-4">
        <div className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-foreground">Auto-Download Media</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Download photos and videos automatically</p>
          </div>
          <Switch checked={orbitSettings.autoDownloadMedia} onCheckedChange={orbitSettings.setAutoDownloadMedia} />
        </div>
        <Separator className="my-3" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Quality</p>
        <div className="grid grid-cols-3 gap-2">
          {(["auto", "low", "high"] as const).map(q => (
            <button key={q} onClick={() => orbitSettings.setMediaQuality(q)}
              className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors capitalize ${orbitSettings.mediaQuality === q ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
