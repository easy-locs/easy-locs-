import { useState, useEffect, useCallback, useRef, memo } from "react";
import { db } from "@/services/db";
import { useAuth } from "@/contexts/AuthContext";
import { IdentityAvatar } from "@/components/orbit/IdentityAvatar";
import { X, Eye, Video, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface RadarStatus {
  id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  media_type: "text" | "image" | "video";
  background_color: string;
  created_at: string;
  expires_at: string;
  view_count: number;
  user_name: string;
  user_avatar: string | null;
}

interface GroupedUser {
  userId: string;
  name: string;
  avatar: string | null;
  statuses: RadarStatus[];
  latest: string;
}

const BG_COLORS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  return `${hours}h`;
}

function RadarStoryRail() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupedUser[]>([]);
  const [viewGroup, setViewGroup] = useState<GroupedUser | null>(null);
  const [viewIdx, setViewIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!user?.id) { setGroups([]); return; }

    const load = () => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      db("orbit_statuses")
        .select("*")
        .gte("expires_at", new Date().toISOString())
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(50)
        .then(({ data }) => {
          if (!data?.length) { setGroups([]); return; }
          const map = new Map<string, GroupedUser>();
          for (const s of data as unknown as RadarStatus[]) {
            const g = map.get(s.user_id);
            if (g) {
              g.statuses.push(s);
              if (s.created_at > g.latest) g.latest = s.created_at;
            } else {
              map.set(s.user_id, {
                userId: s.user_id,
                name: s.user_name,
                avatar: s.user_avatar,
                statuses: [s],
                latest: s.created_at,
              });
            }
          }
          setGroups(Array.from(map.values()).sort((a, b) => b.latest.localeCompare(a.latest)));
        })
        .catch(() => setGroups([]));
    };

    load();
    const iv = setInterval(load, 60_000);
    return () => clearInterval(iv);
  }, [user?.id]);

  const current = viewGroup?.statuses[viewIdx];

  useEffect(() => {
    if (!viewGroup || !current) return;
    if (current.media_type === "video") return;
    setProgress(0);
    const iv = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          if (viewIdx < viewGroup.statuses.length - 1) {
            setViewIdx(i => i + 1);
            return 0;
          }
          setViewGroup(null);
          return 100;
        }
        return p + 2;
      });
    }, 100);
    return () => clearInterval(iv);
  }, [viewGroup, viewIdx, current?.media_type]);

  if (!groups.length) return null;

  return (
    <>
      <div className="mb-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Stories</p>
          <button
            onClick={() => navigate("/orbit")}
            className="flex items-center gap-0.5 text-[10px] font-semibold active:opacity-70"
            style={{ color: "hsl(var(--accent))" }}
          >
            See all <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1" data-no-swipe>
          {groups.map(g => {
            const thumb = g.statuses[0];
            return (
              <button
                key={g.userId}
                onClick={() => { setViewGroup(g); setViewIdx(0); setProgress(0); }}
                className="flex flex-col items-center gap-1 shrink-0 w-[56px]"
              >
                <div
                  className="w-[50px] h-[50px] rounded-full p-[2px] flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(200 80% 50%))" }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-background p-[1.5px]">
                    <IdentityAvatar avatarUrl={g.avatar} name={g.name} size="md" />
                  </div>
                </div>
                <span className="text-[10px] text-foreground truncate w-full text-center font-medium">
                  {g.name.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {viewGroup && current && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col"
            style={{ background: "#000" }}
            onClick={(e) => {
              const w = window.innerWidth;
              const x = (e as any).clientX || 0;
              if (x < w / 3 && viewIdx > 0) {
                setViewIdx(i => i - 1); setProgress(0);
              } else if (x > (w * 2) / 3) {
                if (viewIdx < viewGroup.statuses.length - 1) { setViewIdx(i => i + 1); setProgress(0); }
                else setViewGroup(null);
              }
            }}
          >
            <div className="flex gap-1 px-3 pt-3 shrink-0">
              {viewGroup.statuses.map((_, i) => (
                <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.2)" }}>
                  <div className="h-full rounded-full transition-all duration-100" style={{
                    width: i < viewIdx ? "100%" : i === viewIdx ? `${progress}%` : "0%",
                    background: "#fff",
                  }} />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 px-4 py-3 shrink-0">
              <IdentityAvatar avatarUrl={viewGroup.avatar} name={viewGroup.name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{viewGroup.name}</p>
                <p className="text-[10px] text-white/50">{timeAgo(current.created_at)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setViewGroup(null); }}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center px-4">
              {current.media_url ? (
                current.media_type === "video" ? (
                  <video
                    ref={videoRef}
                    key={current.id}
                    src={current.media_url}
                    className="max-w-full max-h-full object-contain rounded-lg"
                    autoPlay
                    playsInline
                    onEnded={() => {
                      if (viewIdx < viewGroup.statuses.length - 1) { setViewIdx(i => i + 1); setProgress(0); }
                      else setViewGroup(null);
                    }}
                    onTimeUpdate={() => {
                      const v = videoRef.current;
                      if (v?.duration) setProgress((v.currentTime / v.duration) * 100);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <img src={current.media_url} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
                )
              ) : (
                <div className="w-full rounded-2xl flex items-center justify-center p-8 min-h-[300px]"
                  style={{ background: current.background_color || BG_COLORS[0] }}>
                  <p className="text-white text-xl font-semibold text-center leading-relaxed">{current.content}</p>
                </div>
              )}
            </div>

            {current.media_url && current.content && (
              <div className="px-4 py-3 shrink-0">
                <p className="text-white text-sm text-center">{current.content}</p>
              </div>
            )}

            <div className="flex items-center justify-center gap-4 px-4 py-4 shrink-0">
              <div className="flex items-center gap-1.5 text-white/50 text-xs">
                <Eye className="h-3.5 w-3.5" />
                <span>{current.view_count}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default memo(RadarStoryRail);
