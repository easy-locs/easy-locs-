/**
 * PrivateInviteManager — Module 4: Manage private shop invitations.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Copy, Check, Trash2, Loader2, Link2, Clock } from "lucide-react";
import { toast } from "sonner";

interface Props { shopId: string; shopSlug: string; }

export default function PrivateInviteManager({ shopId, shopSlug }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const { data: invites = [], isLoading } = useQuery({
    queryKey: ["shop-invites", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_access_invites")
        .select("*").eq("shop_id", shopId).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const handleInvite = async () => {
    if (!email.trim() || !user) return;
    setSending(true);
    try {
      const token = crypto.randomUUID();
      await (supabase as any).from("storefront_access_invites").insert({
        shop_id: shopId,
        email: email.trim().toLowerCase(),
        invite_token: token,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      qc.invalidateQueries({ queryKey: ["shop-invites", shopId] });
      setEmail("");
      toast.success("Invitation created");
    } finally { setSending(false); }
  };

  const copyInviteLink = async (token: string) => {
    const url = `${window.location.origin}/s/${shopSlug}?invite=${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(token);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDelete = async (id: string) => {
    await (supabase as any).from("storefront_access_invites").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["shop-invites", shopId] });
    toast.success("Invite removed");
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-primary" /> Private Access Invites
      </h4>

      {/* Add invite */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="email@example.com"
            type="email"
            className="text-xs"
          />
        </div>
        <Button size="sm" className="text-xs gap-1" onClick={handleInvite} disabled={sending || !email.trim()}>
          {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
          Invite
        </Button>
      </div>

      {/* Invite list */}
      {isLoading ? (
        <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>
      ) : invites.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No invitations yet</p>
      ) : (
        <div className="space-y-1.5">
          {invites.map((inv: any) => {
            const expired = new Date(inv.expires_at) < new Date();
            return (
              <div key={inv.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border">
                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{inv.email}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {inv.accepted ? (
                      <Badge className="text-[8px] bg-success/10 text-success">Accepted</Badge>
                    ) : expired ? (
                      <Badge variant="destructive" className="text-[8px]">Expired</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[8px]">
                        <Clock className="h-2 w-2 mr-0.5" /> Pending
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {!inv.accepted && !expired && (
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyInviteLink(inv.invite_token)}>
                      {copied === inv.invite_token ? <Check className="h-3 w-3 text-success" /> : <Link2 className="h-3 w-3" />}
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDelete(inv.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
