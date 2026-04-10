/**
 * HubQuickAccess — Premium quick-access button for the Communication Hub.
 * Desktop: compact topbar button with label "Hub"
 * Mobile: floating action button with unread badge
 */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import HubIcon from "./HubIcon";
import { useConversationThreads } from "./useConversationThreads";

interface Props {
  variant: "topbar" | "floating";
}

export default function HubQuickAccess({ variant }: Props) {
  const { stats } = useConversationThreads();
  const unread = stats.unread;

  if (variant === "topbar") {
    return (
      <Link
        to="/orbit"
        className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
        title="Communication Hub"
      >
        <HubIcon className="h-[18px] w-[18px]" />
        <span className="hidden sm:inline text-xs font-semibold">Hub</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -end-0.5 bg-accent text-accent-foreground text-[10px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-1 shadow-sm">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Link>
    );
  }

  // Floating variant — mobile
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.3 }}
      className="fixed bottom-[5.5rem] end-4 z-30 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <Link
        to="/orbit"
        className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-accent text-accent-foreground shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-shadow"
        aria-label="Communication Hub"
      >
        <HubIcon className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -end-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1 shadow-sm ring-2 ring-card">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Link>
    </motion.div>
  );
}
