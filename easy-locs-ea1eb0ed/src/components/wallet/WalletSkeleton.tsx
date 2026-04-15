import { motion } from "framer-motion";
import { CSS } from "@/config/ui";

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-xl skeleton-premium ${className}`}
    />
  );
}

export default function WalletSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="rounded-3xl p-6 overflow-hidden border border-border/5" style={{ background: "linear-gradient(135deg, hsl(226 24% 11%), hsl(226 22% 15%))" }}>
        <Bone className="h-3 w-24 mb-3" />
        <Bone className="h-10 w-40 mb-2" />
        <Bone className="h-3 w-16" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="app-stat-chip rounded-2xl border border-border/5" style={{ background: "hsl(226 24% 10%)" }}>
            <Bone className="h-2.5 w-12 mb-2" />
            <Bone className="h-5 w-16" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Bone className="w-[3.25rem] h-[3.25rem] !rounded-2xl" />
            <Bone className="h-2 w-10" />
          </div>
        ))}
      </div>

      <div>
        <Bone className="h-2.5 w-28 mb-3" />
        <div className={`${CSS.appCard} border border-border/5`}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="app-list-row">
              <Bone className="w-10 h-10 !rounded-xl shrink-0" />
              <div className="flex-1">
                <Bone className="h-3 w-32 mb-2" />
                <Bone className="h-2 w-20" />
              </div>
              <Bone className="h-4 w-16 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
