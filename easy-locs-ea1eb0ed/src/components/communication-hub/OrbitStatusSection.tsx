import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Plus, Camera, Type, Eye, X, Loader2, Image as ImageIcon, CircleDot, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { db } from "@/services/db";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { IdentityAvatar } from "@/components/orbit/IdentityAvatar";
import { motion, AnimatePresence } from "framer-motion";

interface Status {
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

interface StatusGroup {
  userId: string;
  userName: string;
  userAvatar: string | null;
  statuses: Status[];
  lastUpdated: string;
  isMine: boolean;
}

const BG_COLORS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)",
  "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
];

const SAMPLE_CHANNELS = [
  { id: "ch1", name: "Easy-Locs News", emoji: "📢", color: "hsl(220 40% 18%)", subscribers: "12.4K followers" },
  { id: "ch2", name: "Delivery Updates", emoji: "🚚", color: "hsl(200 80% 40%)", subscribers: "8.1K followers" },
  { id: "ch3", name: "Local Deals", emoji: "🏷️", color: "hsl(38 65% 46%)", subscribers: "5.7K followers" },
  { id: "ch4", name: "Driver Community", emoji: "🏎️", color: "hsl(150 60% 35%)", subscribers: "3.2K followers" },
  { id: "ch5", name: "Food & Recipes", emoji: "🍽️", color: "hsl(0 65% 50%)", subscribers: "15.8K followers" },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return "24h";
}

function StatusRing({ hasUnseen, size = 48, children }: { hasUnseen: boolean; size?: number; children: React.ReactNode }) {
  return (
    <div
      className="rounded-full flex items-center justify-center p-[2.5px]"
      style={{
        width: size + 6,
        height: size + 6,
        background: hasUnseen
          ? "linear-gradient(135deg, hsl(var(--primary)), hsl(200 80% 50%))"
          : "hsl(var(--muted-foreground) / 0.2)",
      }}
    >
      <div
        className="rounded-full overflow-hidden flex items-center justify-center"
        style={{
          width: size,
          height: size,
          background: "hsl(var(--background))",
          padding: 2,
        }}
      >
        {children}
      </div>
    </div>
  );
}

type ComposeMode = "text" | "photo" | "video";

export default function OrbitStatusSection() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [composeMode, setComposeMode] = useState<ComposeMode>("text");
  const [composeText, setComposeText] = useState("");
  const [selectedBg, setSelectedBg] = useState(0);
  const [posting, setPosting] = useState(false);
  const [viewingGroup, setViewingGroup] = useState<StatusGroup | null>(null);
  const [viewIndex, setViewIndex] = useState(0);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaIsVideo, setMediaIsVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const myName = user?.user_metadata?.full_name || user?.user_metadata?.display_name || user?.email?.split("@")[0] || "You";
  const myAvatar = user?.user_metadata?.avatar_url || null;

  const loadStatuses = useCallback(async () => {
    if (!user?.id) { setStatuses([]); setLoading(false); return; }
    setLoading(true);
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await db("orbit_statuses")
        .select("*")
        .gte("expires_at", new Date().toISOString())
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          setStatuses([]);
          setLoading(false);
          return;
        }
        throw error;
      }
      setStatuses((data || []) as unknown as Status[]);
    } catch {
      setStatuses([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadStatuses(); }, [loadStatuses]);

  const statusGroups = useMemo(() => {
    const groupMap = new Map<string, StatusGroup>();

    if (user?.id) {
      groupMap.set(user.id, {
        userId: user.id,
        userName: myName,
        userAvatar: myAvatar,
        statuses: [],
        lastUpdated: "",
        isMine: true,
      });
    }

    for (const s of statuses) {
      const existing = groupMap.get(s.user_id);
      if (existing) {
        existing.statuses.push(s);
        if (!existing.lastUpdated || s.created_at > existing.lastUpdated) {
          existing.lastUpdated = s.created_at;
        }
      } else {
        groupMap.set(s.user_id, {
          userId: s.user_id,
          userName: s.user_name,
          userAvatar: s.user_avatar,
          statuses: [s],
          lastUpdated: s.created_at,
          isMine: s.user_id === user?.id,
        });
      }
    }

    const groups = Array.from(groupMap.values());
    const mine = groups.find(g => g.isMine);
    const others = groups.filter(g => !g.isMine).sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated));
    return { mine, others };
  }, [statuses, user?.id, myName, myAvatar]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(isVideo ? "Video must be under 50 MB" : "Image must be under 10 MB");
      e.target.value = "";
      return;
    }
    setMediaFile(file);
    setMediaIsVideo(isVideo);
    setMediaPreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const clearMedia = () => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(null);
    setMediaPreview(null);
    setMediaIsVideo(false);
  };

  const handlePost = async () => {
    if (!user?.id) return;

    if (composeMode === "text" && !composeText.trim()) return;
    if ((composeMode === "photo" || composeMode === "video") && !mediaFile) return;

    setPosting(true);
    haptic("medium");

    try {
      let mediaUrl: string | null = null;
      let mediaType: "text" | "image" | "video" = "text";

      if ((composeMode === "photo" || composeMode === "video") && mediaFile) {
        const ext = mediaFile.name.split(".").pop() || "bin";
        const path = `statuses/${user.id}/${Date.now()}_${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await db.storage
          .from("chat-media")
          .upload(path, mediaFile, { contentType: mediaFile.type });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = db.storage.from("chat-media").getPublicUrl(path);
        mediaUrl = urlData?.publicUrl || null;
        mediaType = mediaIsVideo ? "video" : "image";
      }

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { error } = await db("orbit_statuses").insert({
        user_id: user.id,
        content: composeText.trim() || "",
        media_url: mediaUrl,
        media_type: mediaType,
        background_color: composeMode === "text" ? BG_COLORS[selectedBg] : "",
        expires_at: expiresAt,
        view_count: 0,
        user_name: myName,
        user_avatar: myAvatar,
      } as any);

      if (error) {
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          toast.info(t("orbit.status.table_missing") || "Status feature is being set up");
          setShowCompose(false);
          return;
        }
        throw error;
      }

      toast.success(t("orbit.status.posted") || "Status posted!");
      haptic("success");
      setShowCompose(false);
      setComposeText("");
      clearMedia();
      loadStatuses();
    } catch (err: any) {
      toast.error("Failed to post status");
    } finally {
      setPosting(false);
    }
  };

  const openViewer = (group: StatusGroup) => {
    if (group.statuses.length === 0) {
      if (group.isMine) {
        setShowCompose(true);
      }
      return;
    }
    setViewingGroup(group);
    setViewIndex(0);
    setProgress(0);
  };

  useEffect(() => {
    if (!viewingGroup) return;
    const current = viewingGroup.statuses[viewIndex];
    const isVideo = current?.media_type === "video";
    if (isVideo) return;

    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (viewIndex < viewingGroup.statuses.length - 1) {
            setViewIndex(i => i + 1);
            return 0;
          }
          setViewingGroup(null);
          return 100;
        }
        return prev + 2;
      });
    }, 100);
    progressRef.current = interval;
    return () => clearInterval(interval);
  }, [viewingGroup, viewIndex]);

  const handleVideoEnded = () => {
    if (!viewingGroup) return;
    if (viewIndex < viewingGroup.statuses.length - 1) {
      setViewIndex(i => i + 1);
      setProgress(0);
    } else {
      setViewingGroup(null);
    }
  };

  const currentStatus = viewingGroup?.statuses[viewIndex];

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "hsl(var(--background))" }}>
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4 pb-1 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold" style={{ color: "hsl(var(--foreground))" }}>
              {t("orbit.status.section_title") || "Status"}
            </h2>
            <div className="flex gap-1">
              <Button
                size="sm" variant="ghost"
                className="h-8 w-8 p-0 rounded-full"
                style={{ color: "hsl(var(--foreground))" }}
                onClick={() => { setComposeMode("photo"); setShowCompose(true); }}
              >
                <Camera className="h-[18px] w-[18px]" />
              </Button>
              <Button
                size="sm" variant="ghost"
                className="h-8 w-8 p-0 rounded-full"
                style={{ color: "hsl(var(--foreground))" }}
                onClick={() => { setComposeMode("text"); setShowCompose(true); }}
              >
                <Type className="h-[18px] w-[18px]" />
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex gap-3 px-4 pb-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="w-[120px] h-[170px] rounded-2xl shrink-0" />
            ))}
          </div>
        ) : (
          <div className="flex gap-2.5 px-4 pb-4 overflow-x-auto scrollbar-none" style={{ WebkitOverflowScrolling: "touch" }}>
            <button
              onClick={() => { setComposeMode("photo"); setShowCompose(true); }}
              className="shrink-0 relative overflow-hidden rounded-2xl"
              style={{ width: 120, height: 170 }}
            >
              <div className="absolute inset-0" style={{ background: "hsl(var(--card))" }}>
                {statusGroups.mine?.statuses[0]?.media_url ? (
                  <img src={statusGroups.mine.statuses[0].media_url} alt="" className="w-full h-full object-cover opacity-60" loading="lazy" />
                ) : statusGroups.mine?.statuses[0]?.background_color ? (
                  <div className="w-full h-full" style={{ background: statusGroups.mine.statuses[0].background_color, opacity: 0.6 }} />
                ) : (
                  <div className="w-full h-2/3 flex items-center justify-center">
                    <IdentityAvatar avatarUrl={myAvatar} name={myName} size="lg" />
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 pt-8 pb-2 px-2 text-center"
                style={{ background: "linear-gradient(transparent, hsl(var(--card)) 60%)" }}>
                <div
                  className="w-7 h-7 rounded-full mx-auto mb-1 flex items-center justify-center"
                  style={{ background: "hsl(var(--primary))", border: "2px solid hsl(var(--card))" }}
                >
                  <Plus className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                </div>
                <span className="text-[11px] font-medium leading-tight block" style={{ color: "hsl(var(--foreground))" }}>
                  {t("orbit.status.add") || "Add status"}
                </span>
              </div>
            </button>

            {statusGroups.others.map(group => {
              const thumb = group.statuses[0];
              return (
                <button
                  key={group.userId}
                  onClick={() => openViewer(group)}
                  className="shrink-0 relative overflow-hidden rounded-2xl"
                  style={{
                    width: 120, height: 170,
                    border: "2.5px solid hsl(var(--primary))",
                  }}
                >
                  {thumb?.media_url ? (
                    <img src={thumb.media_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  ) : thumb?.background_color ? (
                    <div className="absolute inset-0" style={{ background: thumb.background_color }}>
                      <p className="absolute inset-0 flex items-center justify-center text-white text-xs font-semibold p-3 text-center leading-snug">
                        {thumb.content?.slice(0, 60)}
                      </p>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: "hsl(var(--card))" }}>
                      <IdentityAvatar avatarUrl={group.userAvatar} name={group.userName} size="lg" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <StatusRing hasUnseen size={32}>
                      <IdentityAvatar avatarUrl={group.userAvatar} name={group.userName} size="xs" />
                    </StatusRing>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 px-2 pb-2 pt-6"
                    style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
                    <p className="text-[11px] font-semibold text-white truncate">{group.userName}</p>
                    <p className="text-[10px] text-white/60">{timeAgo(group.lastUpdated)}</p>
                  </div>
                </button>
              );
            })}

            {statusGroups.others.length === 0 && (
              <div className="shrink-0 rounded-2xl flex flex-col items-center justify-center px-4"
                style={{ width: 120, height: 170, background: "hsl(var(--card))" }}>
                <CircleDot className="h-6 w-6 mb-2" style={{ color: "hsl(var(--muted-foreground) / 0.2)" }} />
                <p className="text-[10px] text-center leading-tight" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }}>
                  {t("orbit.status.no_updates") || "No updates yet"}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="pb-6">
          <div className="flex items-center justify-between px-4 pb-3 pt-2">
            <h2 className="text-base font-semibold" style={{ color: "hsl(var(--foreground))" }}>
              {t("orbit.status.channels") || "Channels"}
            </h2>
            <button
              onClick={() => { haptic("light"); toast.info(t("orbit.status.explore_channels") || "Explore channels"); }}
              className="text-[13px] font-semibold"
              style={{ color: "hsl(var(--primary))" }}
            >
              {t("orbit.status.explore") || "Explore"}
            </button>
          </div>
          <div className="space-y-0.5">
            {SAMPLE_CHANNELS.map(ch => (
              <div key={ch.id} className="flex items-center gap-3 px-4 py-2.5">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                  style={{ background: ch.color, color: "#fff" }}
                >
                  {ch.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-[13px] font-semibold truncate" style={{ color: "hsl(var(--foreground))" }}>
                      {ch.name}
                    </p>
                    <span className="text-[10px] shrink-0" style={{ color: "hsl(var(--primary))" }}>&#10003;</span>
                  </div>
                  <p className="text-[11px] truncate" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
                    {ch.subscribers}
                  </p>
                </div>
                <button
                  onClick={() => { haptic("light"); toast.success(`${t("orbit.status.followed") || "Followed"} ${ch.name}`); }}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold shrink-0"
                  style={{ border: "1.5px solid hsl(var(--primary))", color: "hsl(var(--primary))", background: "transparent" }}
                >
                  {t("orbit.status.follow") || "Follow"}
                </button>
              </div>
            ))}
          </div>
          <div className="px-4 mt-3">
            <p className="text-[11px] font-medium mb-2" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }}>
              {t("orbit.status.find_channels") || "Find channels to follow"}
            </p>
          </div>
        </div>
      </div>

      {/* ═══ Compose Sheet ═══ */}
      <Sheet open={showCompose} onOpenChange={(open) => { if (!open) clearMedia(); setShowCompose(open); }}>
        <SheetContent side="bottom" className="h-[85dvh] p-0 rounded-t-3xl" style={{ background: "hsl(var(--background))" }}>
          <SheetHeader className="px-4 py-3" style={{ borderBottom: "1px solid hsl(var(--border) / 0.1)" }}>
            <SheetTitle className="text-base font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
              {composeMode === "text"
                ? (t("orbit.status.text_status") || "Text Status")
                : composeMode === "video"
                  ? (t("orbit.status.video_status") || "Video Story")
                  : (t("orbit.status.photo_status") || "Photo Story")}
            </SheetTitle>
          </SheetHeader>

          {/* ─── Mode tabs ─── */}
          <div className="flex gap-1 px-4 py-2">
            {(["text", "photo", "video"] as ComposeMode[]).map(m => (
              <button
                key={m}
                onClick={() => { setComposeMode(m); clearMedia(); }}
                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors"
                style={{
                  background: composeMode === m ? "hsl(var(--primary))" : "hsl(var(--card))",
                  color: composeMode === m ? "#fff" : "hsl(var(--muted-foreground))",
                }}
              >
                {m === "text" ? "Text" : m === "photo" ? "Photo" : "Video"}
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col p-4">
            {composeMode === "text" ? (
              <>
                <div
                  className="flex-1 rounded-2xl flex items-center justify-center p-8 mb-5 min-h-[200px]"
                  style={{ background: BG_COLORS[selectedBg] }}
                >
                  <textarea
                    value={composeText}
                    onChange={e => setComposeText(e.target.value)}
                    placeholder={t("orbit.status.type_status") || "Type a status..."}
                    className="bg-transparent text-white text-xl font-semibold text-center w-full resize-none outline-none placeholder:text-white/50"
                    rows={4}
                    maxLength={500}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
                  {BG_COLORS.map((bg, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedBg(i)}
                      className="w-8 h-8 rounded-full shrink-0 transition-transform"
                      style={{
                        background: bg,
                        transform: selectedBg === i ? "scale(1.2)" : "scale(1)",
                        boxShadow: selectedBg === i ? "0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--primary))" : "none",
                      }}
                    />
                  ))}
                </div>
              </>
            ) : (
              <>
                {mediaPreview ? (
                  <div className="relative flex-1 rounded-2xl overflow-hidden mb-5 min-h-[200px]">
                    {mediaIsVideo ? (
                      <video
                        src={mediaPreview}
                        className="w-full h-full object-cover"
                        controls
                        playsInline
                        muted
                        autoPlay
                      />
                    ) : (
                      <img src={mediaPreview} alt="" className="w-full h-full object-cover" />
                    )}
                    <button
                      onClick={clearMedia}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.5)" }}
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 p-3" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.6))" }}>
                      <Input
                        value={composeText}
                        onChange={e => setComposeText(e.target.value)}
                        placeholder={t("orbit.status.add_caption") || "Add a caption..."}
                        className="border-0 text-white placeholder:text-white/50"
                        style={{ background: "rgba(255,255,255,0.15)" }}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 rounded-2xl flex flex-col items-center justify-center gap-3 mb-5 min-h-[200px] transition-colors active:opacity-80"
                    style={{ background: "hsl(var(--card))", border: "2px dashed hsl(var(--muted-foreground) / 0.2)" }}
                  >
                    {composeMode === "video" ? (
                      <Video className="h-12 w-12" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }} />
                    ) : (
                      <ImageIcon className="h-12 w-12" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }} />
                    )}
                    <span className="text-sm font-medium" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>
                      {composeMode === "video"
                        ? (t("orbit.status.select_video") || "Select a video")
                        : (t("orbit.status.select_photo") || "Select a photo")}
                    </span>
                    <span className="text-[11px]" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }}>
                      {composeMode === "video" ? "MP4, MOV · max 30s" : "JPG, PNG, HEIC"}
                    </span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={composeMode === "video" ? "video/*" : "image/*"}
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </>
            )}

            <p className="text-[11px] text-center mb-3" style={{ color: "hsl(var(--muted-foreground) / 0.4)" }}>
              {t("orbit.status.expires_24h") || "Stories disappear after 24 hours"}
            </p>

            <Button
              onClick={handlePost}
              disabled={posting || (composeMode === "text" ? !composeText.trim() : !mediaFile)}
              className="w-full h-12 rounded-2xl text-sm font-semibold"
              style={{ background: "hsl(var(--primary))", color: "#fff" }}
            >
              {posting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("orbit.status.post") || "Post"
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ═══ Story Viewer (fullscreen) ═══ */}
      <AnimatePresence>
        {viewingGroup && currentStatus && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col"
            style={{ background: "#000" }}
            onClick={(e) => {
              const w = window.innerWidth;
              const x = (e as any).clientX || 0;
              if (x < w / 3) {
                if (viewIndex > 0) { setViewIndex(i => i - 1); setProgress(0); }
              } else if (x > (w * 2) / 3) {
                if (viewIndex < viewingGroup.statuses.length - 1) { setViewIndex(i => i + 1); setProgress(0); }
                else setViewingGroup(null);
              }
            }}
          >
            <div className="flex gap-1 px-3 pt-3 shrink-0">
              {viewingGroup.statuses.map((_, i) => (
                <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.2)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-100"
                    style={{
                      width: i < viewIndex ? "100%" : i === viewIndex ? `${progress}%` : "0%",
                      background: "#fff",
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 px-4 py-3 shrink-0">
              <IdentityAvatar avatarUrl={viewingGroup.userAvatar} name={viewingGroup.userName} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{viewingGroup.userName}</p>
                <p className="text-[10px] text-white/50">{timeAgo(currentStatus.created_at)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setViewingGroup(null); }}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center px-4">
              {currentStatus.media_url ? (
                currentStatus.media_type === "video" ? (
                  <video
                    ref={videoRef}
                    key={currentStatus.id}
                    src={currentStatus.media_url}
                    className="max-w-full max-h-full object-contain rounded-lg"
                    autoPlay
                    playsInline
                    onEnded={handleVideoEnded}
                    onTimeUpdate={() => {
                      const v = videoRef.current;
                      if (v && v.duration) setProgress((v.currentTime / v.duration) * 100);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <img src={currentStatus.media_url} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
                )
              ) : (
                <div
                  className="w-full rounded-2xl flex items-center justify-center p-8 min-h-[300px]"
                  style={{ background: currentStatus.background_color || BG_COLORS[0] }}
                >
                  <p className="text-white text-xl font-semibold text-center leading-relaxed">
                    {currentStatus.content}
                  </p>
                </div>
              )}
            </div>

            {currentStatus.media_url && currentStatus.content && (
              <div className="px-4 py-3 shrink-0">
                <p className="text-white text-sm text-center">{currentStatus.content}</p>
              </div>
            )}

            <div className="flex items-center justify-center gap-4 px-4 py-4 shrink-0">
              <div className="flex items-center gap-1.5 text-white/50 text-xs">
                <Eye className="h-3.5 w-3.5" />
                <span>{currentStatus.view_count}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
