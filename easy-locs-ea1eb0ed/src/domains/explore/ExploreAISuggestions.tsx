import { memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { platformBus } from "@/lib/shared/platform-bus";

interface ExploreAISuggestionsProps {
  suggestions: { text: string; route: string; vertical: string }[];
}

const VERTICAL_COLORS: Record<string, string> = {
  food: "bg-orange-500/10 border-orange-500/15 text-orange-400",
  grocery: "bg-green-500/10 border-green-500/15 text-green-400",
  property: "bg-teal-500/10 border-teal-500/15 text-teal-400",
  stay: "bg-violet-500/10 border-violet-500/15 text-violet-400",
  services: "bg-blue-500/10 border-blue-500/15 text-blue-400",
  mobility: "bg-yellow-500/10 border-yellow-500/15 text-yellow-400",
  utility: "bg-sky-500/10 border-sky-500/15 text-sky-400",
};

export const ExploreAISuggestions = memo(function ExploreAISuggestions({ suggestions }: ExploreAISuggestionsProps) {
  const navigate = useNavigate();

  const handleTap = useCallback((suggestion: { text: string; route: string; vertical: string }) => {
    platformBus.emit("explore:ai_suggestion_clicked", {
      text: suggestion.text,
      vertical: suggestion.vertical,
      route: suggestion.route,
      surface: "explore",
    }, "explore");
    if (suggestion.route.includes("?q=")) {
      platformBus.emit("explore:search_executed", {
        query: new URL(suggestion.route, "https://x").searchParams.get("q") ?? "",
        vertical: suggestion.vertical,
        source: "explore_ai_suggestion",
      }, "explore");
    } else {
      navigate(suggestion.route);
    }
  }, [navigate]);

  if (suggestions.length === 0) return null;

  return (
    <div className="px-4 py-3">
      <h3 className="text-sm font-bold text-foreground mb-2.5 flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-violet-400" /> Smart Suggestions
      </h3>
      <div className="space-y-2">
        {suggestions.map((suggestion, i) => {
          const colorClass = VERTICAL_COLORS[suggestion.vertical] ?? "bg-muted/15 border-border/10 text-muted-foreground";
          return (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => handleTap(suggestion)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border active:scale-[0.98] transition-all text-left ${colorClass}`}
            >
              <Sparkles className="h-4 w-4 shrink-0 opacity-60" />
              <p className="text-xs font-semibold flex-1 line-clamp-2 text-foreground">{suggestion.text}</p>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
});
