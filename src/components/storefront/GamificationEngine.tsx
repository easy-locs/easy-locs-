/**
 * GamificationEngine — Challenges, badges, leaderboard, gamified rewards
 * Seller: create challenges & badges
 * Buyer: participate, track progress, earn badges, compete
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Target, Medal, Crown, Flame, Loader2, Plus, Star, Zap } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  mode: "seller" | "buyer";
}

const CHALLENGE_TYPES: Record<string, { label: string; icon: string }> = {
  purchase: { label: "Purchase", icon: "🛒" },
  review: { label: "Review", icon: "⭐" },
  referral: { label: "Referral", icon: "👥" },
  social: { label: "Social Share", icon: "📲" },
  streak: { label: "Daily Streak", icon: "🔥" },
  spend: { label: "Total Spend", icon: "💰" },
};

export default function GamificationEngine({ shopId, mode }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"challenges" | "badges" | "leaderboard">("challenges");

  // Load challenges
  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ["challenges", shopId],
    queryFn: async () => {
      const query = (supabase as any).from("storefront_challenges")
        .select("*").eq("shop_id", shopId).order("created_at", { ascending: false });
      if (mode === "buyer") query.eq("active", true);
      const { data } = await query;
      return data || [];
    },
  });

  // Load progress (buyer)
  const { data: progress = [] } = useQuery({
    queryKey: ["challenge-progress", shopId, user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_challenge_progress")
        .select("*").eq("user_id", user!.id);
      return data || [];
    },
    enabled: mode === "buyer" && !!user,
  });

  // Load badges
  const { data: badges = [] } = useQuery({
    queryKey: ["shop-badges", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_badges")
        .select("*").eq("shop_id", shopId).order("created_at");
      return data || [];
    },
  });

  // Load user badges
  const { data: userBadges = [] } = useQuery({
    queryKey: ["user-badges", shopId, user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_user_badges")
        .select("*, storefront_badges(name, description, icon_url, badge_type)")
        .eq("user_id", user!.id);
      return data || [];
    },
    enabled: mode === "buyer" && !!user,
  });

  // Load leaderboard
  const { data: leaderboard = [] } = useQuery({
    queryKey: ["leaderboard", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_leaderboard")
        .select("*").eq("shop_id", shopId).eq("period", "alltime")
        .order("points", { ascending: false }).limit(20);
      return data || [];
    },
  });

  // Create challenge (seller)
  const [challengeForm, setChallengeForm] = useState({
    title: "", description: "", type: "purchase", target: 5, rewardPoints: 100, rewardBadge: "",
  });
  const createChallenge = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("storefront_challenges").insert({
        shop_id: shopId, user_id: user!.id,
        title: challengeForm.title, description: challengeForm.description || null,
        challenge_type: challengeForm.type, target_value: challengeForm.target,
        reward_points: challengeForm.rewardPoints, reward_badge: challengeForm.rewardBadge || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challenges"] });
      setChallengeForm({ title: "", description: "", type: "purchase", target: 5, rewardPoints: 100, rewardBadge: "" });
      toast.success("Challenge created");
    },
  });

  // Create badge (seller)
  const [badgeForm, setBadgeForm] = useState({ name: "", description: "", type: "achievement" });
  const createBadge = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("storefront_badges").insert({
        shop_id: shopId, user_id: user!.id,
        name: badgeForm.name, description: badgeForm.description || null,
        badge_type: badgeForm.type,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop-badges"] });
      setBadgeForm({ name: "", description: "", type: "achievement" });
      toast.success("Badge created");
    },
  });

  // Join challenge (buyer)
  const joinChallenge = useMutation({
    mutationFn: async (challengeId: string) => {
      await (supabase as any).from("storefront_challenge_progress").insert({
        challenge_id: challengeId, user_id: user!.id,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["challenge-progress"] }); toast.success("Challenge joined!"); },
  });

  if (isLoading) return <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>;

  const progressMap = Object.fromEntries(progress.map((p: any) => [p.challenge_id, p]));
  const userBadgeIds = new Set(userBadges.map((ub: any) => ub.badge_id));

  const RANK_ICONS = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-500" /> Gamification
        </h3>
        <div className="flex gap-1">
          {["challenges", "badges", "leaderboard"].map(v => (
            <Button key={v} size="sm" variant={tab === v ? "default" : "ghost"} className="text-[10px] h-6 px-2"
              onClick={() => setTab(v as any)}>
              {v === "challenges" ? "Challenges" : v === "badges" ? "Badges" : "Ranking"}
            </Button>
          ))}
        </div>
      </div>

      {/* CHALLENGES */}
      {tab === "challenges" && (
        <div className="space-y-3">
          {mode === "seller" && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground">Create Challenge</h4>
                <Input placeholder="Challenge title" value={challengeForm.title}
                  onChange={e => setChallengeForm(p => ({ ...p, title: e.target.value }))} className="text-xs" />
                <Textarea placeholder="Description" value={challengeForm.description}
                  onChange={e => setChallengeForm(p => ({ ...p, description: e.target.value }))} rows={2} className="text-xs" />
                <div className="grid grid-cols-3 gap-2">
                  <Select value={challengeForm.type} onValueChange={v => setChallengeForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CHALLENGE_TYPES).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-xs">{v.icon} {v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="Target" value={challengeForm.target}
                    onChange={e => setChallengeForm(p => ({ ...p, target: Number(e.target.value) }))} className="text-xs h-8" />
                  <Input type="number" placeholder="Points" value={challengeForm.rewardPoints}
                    onChange={e => setChallengeForm(p => ({ ...p, rewardPoints: Number(e.target.value) }))} className="text-xs h-8" />
                </div>
                <Button size="sm" className="w-full" onClick={() => createChallenge.mutate()}
                  disabled={!challengeForm.title.trim() || createChallenge.isPending}>
                  <Target className="h-3 w-3 mr-1" /> Create Challenge
                </Button>
              </CardContent>
            </Card>
          )}

          {challenges.map((c: any) => {
            const prog = progressMap[c.id];
            const pct = prog ? Math.min(100, (prog.current_value / c.target_value) * 100) : 0;
            const typeInfo = CHALLENGE_TYPES[c.challenge_type] || { label: c.challenge_type, icon: "🎯" };
            return (
              <Card key={c.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span>{typeInfo.icon}</span>
                        <p className="text-xs font-semibold truncate">{c.title}</p>
                      </div>
                      {c.description && <p className="text-[10px] text-muted-foreground mt-0.5">{c.description}</p>}
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="secondary" className="text-[8px]">{typeInfo.label}</Badge>
                        <span className="text-[9px] text-muted-foreground">Target: {c.target_value}</span>
                        <span className="text-[9px] text-primary font-medium flex items-center gap-0.5">
                          <Zap className="h-2.5 w-2.5" /> {c.reward_points} pts
                        </span>
                      </div>

                      {/* Progress bar */}
                      {prog && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[9px] mb-0.5">
                            <span>{prog.current_value}/{c.target_value}</span>
                            {prog.completed && <Badge className="text-[7px] bg-success/20 text-success">Completed!</Badge>}
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )}
                    </div>

                    {mode === "buyer" && !prog && (
                      <Button size="sm" variant="outline" className="text-[10px] h-7 shrink-0"
                        onClick={() => joinChallenge.mutate(c.id)} disabled={joinChallenge.isPending}>
                        Join
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {challenges.length === 0 && (
            <Card><CardContent className="p-6 text-center text-xs text-muted-foreground">No challenges yet</CardContent></Card>
          )}
        </div>
      )}

      {/* BADGES */}
      {tab === "badges" && (
        <div className="space-y-3">
          {mode === "seller" && (
            <Card>
              <CardContent className="p-3 space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground">Create Badge</h4>
                <Input placeholder="Badge name" value={badgeForm.name}
                  onChange={e => setBadgeForm(p => ({ ...p, name: e.target.value }))} className="text-xs h-8" />
                <Input placeholder="Description" value={badgeForm.description}
                  onChange={e => setBadgeForm(p => ({ ...p, description: e.target.value }))} className="text-xs h-8" />
                <Button size="sm" className="w-full h-7 text-xs" onClick={() => createBadge.mutate()}
                  disabled={!badgeForm.name.trim() || createBadge.isPending}>
                  <Medal className="h-3 w-3 mr-1" /> Create Badge
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-3 gap-2">
            {badges.map((b: any) => {
              const earned = userBadgeIds.has(b.id);
              return (
                <Card key={b.id} className={earned ? "border-primary/30" : "opacity-60"}>
                  <CardContent className="p-2.5 text-center">
                    <div className="w-10 h-10 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-1.5">
                      {b.icon_url ? (
                        <img src={b.icon_url} alt="" className="w-6 h-6" />
                      ) : (
                        <Medal className={`h-5 w-5 ${earned ? "text-primary" : "text-muted-foreground"}`} />
                      )}
                    </div>
                    <p className="text-[10px] font-semibold truncate">{b.name}</p>
                    {earned && <Badge className="text-[7px] bg-success/20 text-success mt-1">Earned</Badge>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {badges.length === 0 && (
            <Card><CardContent className="p-6 text-center text-xs text-muted-foreground">No badges created yet</CardContent></Card>
          )}
        </div>
      )}

      {/* LEADERBOARD */}
      {tab === "leaderboard" && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Crown className="h-3 w-3 text-yellow-500" /> Top Players
            </h4>
            {leaderboard.length === 0 ? (
              <p className="text-[10px] text-muted-foreground text-center py-4">No rankings yet — start earning points!</p>
            ) : leaderboard.map((entry: any, i: number) => {
              const isMe = entry.user_id === user?.id;
              return (
                <div key={entry.id} className={`flex items-center gap-2 p-1.5 rounded ${isMe ? "bg-primary/5" : ""}`}>
                  <span className="w-6 text-center text-sm">{RANK_ICONS[i] || `#${i + 1}`}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] truncate ${isMe ? "font-bold text-primary" : ""}`}>
                      {isMe ? "You" : `Player ${entry.user_id?.slice(0, 6)}...`}
                    </p>
                  </div>
                  <span className="text-xs font-bold flex items-center gap-0.5">
                    <Star className="h-3 w-3 text-yellow-500" /> {entry.points}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
