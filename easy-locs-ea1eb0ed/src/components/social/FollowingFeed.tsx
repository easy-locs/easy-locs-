import { useFollowingFeed } from "@/hooks/useSocialGraph";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Rss, ShoppingBag, Star, BookOpen, Megaphone } from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";

const TYPE_ICONS = {
  listing: ShoppingBag,
  review: Star,
  story: BookOpen,
  promotion: Megaphone,
};

const TYPE_COLORS = {
  listing: "text-blue-500",
  review: "text-yellow-500",
  story: "text-purple-500",
  promotion: "text-green-500",
};

const TYPE_LABEL_KEYS: Record<string, string> = {
  listing: "social.posted_listing",
  review: "social.posted_review",
  story: "social.shared_story",
  promotion: "social.new_promotion",
};

export default function FollowingFeed() {
  const { t } = useI18n();
  const { feed, loading, refresh } = useFollowingFeed(20);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="py-8 text-center">
        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  if (feed.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Rss className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">{t("social.no_activity")}</p>
          <p className="text-xs text-muted-foreground">
            {t("social.follow_people")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Rss className="h-4 w-4 text-primary" />
          Following Feed
        </h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={refresh}
          className="h-7 text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh
        </Button>
      </div>

      {feed.map((item, idx) => {
        const Icon = TYPE_ICONS[item.type] || ShoppingBag;
        const color = TYPE_COLORS[item.type] || "text-muted-foreground";

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => item.route && navigate(item.route)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {item.userAvatar ? (
                      <img
                        src={item.userAvatar}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">
                        {item.userName[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Icon className={`h-3 w-3 ${color}`} />
                      <p className="text-xs font-semibold truncate">
                        {item.userName}
                      </p>
                    </div>
                    <p className="text-[11px] text-foreground line-clamp-2">
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {item.description}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatRelativeTime(item.createdAt)}
                    </p>
                  </div>
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
