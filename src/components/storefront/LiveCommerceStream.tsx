/**
 * LiveCommerceStream — Live selling sessions with chat, pinned products, viewer count, replay.
 * Props: shopId, mode ("seller" | "buyer"), catalogItems
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Video, Users, Pin, MessageCircle, Play, StopCircle, Eye, ShoppingBag, Radio } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  mode?: "seller" | "buyer";
  catalogItems?: any[];
}

export default function LiveCommerceStream({ shopId, mode = "buyer", catalogItems = [] }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [chatMsg, setChatMsg] = useState("");
  const [title, setTitle] = useState("");
  const [pinnedProductId, setPinnedProductId] = useState<string | null>(null);

  const { data: sessions = [] } = useQuery({
    queryKey: ["live-sessions", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_live_sessions")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!shopId,
  });

  const activeSession = sessions.find((s: any) => s.status === "live");

  // Chat messages for active session
  const { data: chatMessages = [] } = useQuery({
    queryKey: ["live-chat", activeSession?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_live_chat")
        .select("*")
        .eq("session_id", activeSession!.id)
        .order("created_at", { ascending: true })
        .limit(100);
      return data || [];
    },
    enabled: !!activeSession?.id,
    refetchInterval: activeSession ? 3000 : false,
  });

  // Realtime viewer simulation
  const [viewerCount, setViewerCount] = useState(0);
  useEffect(() => {
    if (activeSession) {
      setViewerCount(activeSession.viewer_count || 1);
      const interval = setInterval(() => {
        setViewerCount(c => Math.max(1, c + Math.floor(Math.random() * 3) - 1));
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [activeSession?.id]);

  const startSession = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Auth required");
      const { error } = await (supabase as any).from("storefront_live_sessions").insert({
        shop_id: shopId,
        host_id: user.id,
        title: title || "Live Shopping",
        status: "live",
        started_at: new Date().toISOString(),
        viewer_count: 1,
        pinned_product_ids: [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("You're live! 🔴");
      setTitle("");
      qc.invalidateQueries({ queryKey: ["live-sessions", shopId] });
    },
  });

  const endSession = useMutation({
    mutationFn: async () => {
      if (!activeSession) return;
      const { error } = await (supabase as any)
        .from("storefront_live_sessions")
        .update({ status: "ended", ended_at: new Date().toISOString(), viewer_count: viewerCount })
        .eq("id", activeSession.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Stream ended");
      qc.invalidateQueries({ queryKey: ["live-sessions", shopId] });
    },
  });

  const pinProduct = useMutation({
    mutationFn: async (productId: string) => {
      if (!activeSession) return;
      const current = activeSession.pinned_product_ids || [];
      const updated = current.includes(productId)
        ? current.filter((id: string) => id !== productId)
        : [...current, productId];
      await (supabase as any)
        .from("storefront_live_sessions")
        .update({ pinned_product_ids: updated })
        .eq("id", activeSession.id);
      setPinnedProductId(productId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["live-sessions", shopId] }),
  });

  const sendChat = useMutation({
    mutationFn: async () => {
      if (!user || !activeSession || !chatMsg.trim()) return;
      const { error } = await (supabase as any).from("storefront_live_chat").insert({
        session_id: activeSession.id,
        user_id: user.id,
        user_name: user.email?.split("@")[0] || "User",
        message: chatMsg.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setChatMsg("");
      qc.invalidateQueries({ queryKey: ["live-chat", activeSession?.id] });
    },
  });

  const pastSessions = sessions.filter((s: any) => s.status === "ended");

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Video className="h-4 w-4 text-red-500" /> Live Commerce
          </h3>
          {activeSession && (
            <Badge className="bg-red-500 text-white text-[10px] animate-pulse gap-1">
              <Radio className="h-2.5 w-2.5" /> LIVE
            </Badge>
          )}
        </div>

        {/* Active session */}
        {activeSession ? (
          <div className="space-y-3">
            <div className="bg-muted/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">{activeSession.title}</h4>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Eye className="h-3 w-3" /> {viewerCount}
                  </span>
                  {mode === "seller" && (
                    <Button size="sm" variant="destructive" className="text-[10px] h-7" onClick={() => endSession.mutate()}>
                      <StopCircle className="h-3 w-3 mr-1" /> End
                    </Button>
                  )}
                </div>
              </div>

              {/* Pinned products */}
              {activeSession.pinned_product_ids?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {activeSession.pinned_product_ids.map((pid: string) => {
                    const product = catalogItems.find(i => i.id === pid);
                    if (!product) return null;
                    return (
                      <div key={pid} className="flex items-center gap-2 bg-background rounded-lg p-2 border border-primary/20 shrink-0">
                        {product.photo_url && <img src={product.photo_url} alt="" className="w-8 h-8 rounded object-cover" />}
                        <div>
                          <p className="text-[10px] font-medium truncate max-w-[100px]">{product.title}</p>
                          <p className="text-[10px] font-bold text-primary">{product.price} {product.currency}</p>
                        </div>
                        <Pin className="h-3 w-3 text-primary shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Chat */}
              <div className="bg-background rounded-lg border border-border mt-2 max-h-40 overflow-y-auto p-2 space-y-1">
                {chatMessages.map((m: any) => (
                  <div key={m.id} className="text-[10px]">
                    <span className="font-medium text-primary">{m.user_name}: </span>
                    <span className="text-muted-foreground">{m.message}</span>
                  </div>
                ))}
                {chatMessages.length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-2">No messages yet</p>
                )}
              </div>

              {user && (
                <div className="flex gap-2 mt-2">
                  <Input
                    value={chatMsg}
                    onChange={e => setChatMsg(e.target.value)}
                    placeholder="Say something..."
                    className="text-xs h-8 flex-1"
                    onKeyDown={e => e.key === "Enter" && sendChat.mutate()}
                  />
                  <Button size="sm" className="h-8 text-xs" onClick={() => sendChat.mutate()}>
                    <MessageCircle className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Pin product (seller) */}
              {mode === "seller" && catalogItems.length > 0 && (
                <div className="mt-2">
                  <p className="text-[10px] font-medium mb-1">Pin a product:</p>
                  <div className="flex gap-1 overflow-x-auto scrollbar-none">
                    {catalogItems.slice(0, 10).map((item: any) => (
                      <button
                        key={item.id}
                        onClick={() => pinProduct.mutate(item.id)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] border shrink-0 transition-colors ${
                          activeSession.pinned_product_ids?.includes(item.id) ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                        }`}
                      >
                        <ShoppingBag className="h-2.5 w-2.5" /> {item.title?.substring(0, 15)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : mode === "seller" ? (
          <div className="space-y-2">
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Stream title..."
              className="text-xs"
            />
            <Button className="w-full text-xs" onClick={() => startSession.mutate()} disabled={startSession.isPending}>
              <Play className="h-3.5 w-3.5 mr-1" /> Go Live
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">No live stream right now</p>
        )}

        {/* Past sessions (replays) */}
        {pastSessions.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-medium text-muted-foreground">Past Streams</p>
            {pastSessions.slice(0, 3).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs">
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(s.started_at).toLocaleDateString()} · <Users className="h-2.5 w-2.5 inline" /> {s.viewer_count || 0} viewers
                  </p>
                </div>
                <Badge variant="outline" className="text-[9px]">Replay</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
