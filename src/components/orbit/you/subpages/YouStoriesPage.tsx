/**
 * YouStoriesPage — Orbit stories settings sub-page.
 */
import { BookOpen, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Props { onBack: () => void; }

export default function YouStoriesPage({ onBack }: Props) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
      <div className="flex items-center gap-3 pb-4 border-b border-border/15">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
          <ChevronRight className="h-4 w-4 text-muted-foreground rotate-180" />
        </button>
        <BookOpen className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Stories</h2>
      </div>
      <div className="space-y-1 mt-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Default Audience</p>
        <div className="grid grid-cols-3 gap-2">
          {["contacts", "close_friends", "everyone"].map(a => (
            <button key={a} className="py-2 px-2 rounded-lg text-xs font-medium bg-muted text-muted-foreground capitalize">
              {a.replace("_", " ")}
            </button>
          ))}
        </div>
        <Separator className="my-3" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Expiry</p>
        <div className="grid grid-cols-3 gap-2">
          {["24h", "48h", "7d"].map(e => (
            <button key={e} className="py-2 px-2 rounded-lg text-xs font-medium bg-muted text-muted-foreground">{e}</button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">Stories auto-expire after the selected period</p>
      </div>
    </div>
  );
}
