/**
 * OrbitGlobalSearch — Fast debounced global search bar for Orbit Home.
 */
import { useState, useCallback, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function OrbitGlobalSearchInner() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/explore?q=${encodeURIComponent(query.trim())}`);
      setQuery("");
      inputRef.current?.blur();
    }
  }, [query, navigate]);

  const clear = useCallback(() => {
    setQuery("");
    inputRef.current?.focus();
  }, []);

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div
        className="flex items-center gap-2 px-3.5 rounded-xl transition-all duration-200"
        style={{
          height: "var(--input-height-sm)",
          background: focused ? "hsl(var(--hud-surface-2))" : "hsl(var(--hud-surface))",
          border: `1px solid ${focused ? "hsl(var(--hud-cyan) / 0.2)" : "hsl(var(--hud-border) / 0.08)"}`,
        }}
      >
        <Search className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
        <input
          ref={inputRef}
          type="search"
          placeholder="Search people, shops, actions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 bg-transparent outline-none text-xs font-medium placeholder:font-normal"
          style={{ color: "hsl(var(--hud-text))", caretColor: "hsl(var(--hud-cyan))" }}
        />
        <AnimatePresence>
          {query && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              onClick={clear}
              className="p-0.5 rounded-full"
              style={{ background: "hsl(var(--hud-text-dim) / 0.15)" }}
            >
              <X className="w-3 h-3" style={{ color: "hsl(var(--hud-text-dim))" }} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}

export default memo(OrbitGlobalSearchInner);
