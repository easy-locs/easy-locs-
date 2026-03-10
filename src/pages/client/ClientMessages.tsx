import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Inbox, MessageCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import ClientLayout from "@/components/client/ClientLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { format, formatDistanceToNow } from "date-fns";

interface ThreadItem {
  id: string;
  contactName: string;
  lastMessage: string;
  lastTime: string;
  unread: boolean;
}

const ClientMessages = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) { setLoading(false); return; }
    // For now, show empty state — threads are managed server-side via communication center
    setLoading(false);
  }, [user]);

  return (
    <ClientLayout>
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-6">{t("nav.messages") || "Messages"}</h1>
        </motion.div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />)}
          </div>
        ) : threads.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{t("client.messages_empty") || "No messages yet"}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("client.messages_empty_desc") || "Your conversations with providers will appear here."}</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {threads.map((thread, i) => (
              <motion.div
                key={thread.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-card rounded-xl p-4 shadow-card border border-border/50 flex items-center gap-3 cursor-pointer hover:border-accent/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <MessageCircle className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{thread.contactName}</p>
                  <p className="text-xs text-muted-foreground truncate">{thread.lastMessage}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(thread.lastTime), { addSuffix: true })}</p>
                  {thread.unread && <div className="w-2 h-2 rounded-full bg-accent ml-auto mt-1" />}
                </div>
                <ArrowRight className="h-4 w-4 text-transparent group-hover:text-accent transition-colors shrink-0" />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
};

export default ClientMessages;
