import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, UserPlus, Mail, Shield, Clock, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";

const ROLES = [
  { value: "member", label: "Membre", desc: "Accès lecture/écriture aux biens et locataires" },
  { value: "viewer", label: "Observateur", desc: "Accès lecture seule" },
];

const Collaboration = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");

  const { data: org } = useQuery({
    queryKey: ["org", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("org_members").select("org_id").eq("user_id", user!.id).limit(1).single();
      if (!data) return null;
      const { data: o } = await supabase.from("orgs").select("*").eq("id", data.org_id).single();
      return o;
    },
    enabled: !!user,
  });

  const isOwner = org?.owner_user_id === user?.id;

  // Members
  const { data: members = [] } = useQuery({
    queryKey: ["org_members", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("org_members").select("id, user_id, role, created_at").eq("org_id", org!.id);
      if (!data) return [];
      // Fetch profiles for each member
      const profiles = await Promise.all(
        data.map(async (m) => {
          const { data: p } = await supabase.from("profiles").select("email, name").eq("id", m.user_id).single();
          return { ...m, email: p?.email || "", name: p?.name || "" };
        })
      );
      return profiles;
    },
    enabled: !!org,
  });

  // Invitations
  const { data: invitations = [] } = useQuery({
    queryKey: ["collab_invitations", org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("collaboration_invitations" as any)
        .select("*")
        .eq("org_id", org!.id)
        .order("created_at", { ascending: false });
      return (data || []) as unknown as Array<{
        id: string; email: string; role: string; status: string;
        created_at: string; expires_at: string;
      }>;
    },
    enabled: !!org,
  });

  // Send invitation
  const inviteMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("collaboration_invitations" as any).insert({
        org_id: org!.id,
        invited_by: user!.id,
        email,
        role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invitation envoyée !");
      qc.invalidateQueries({ queryKey: ["collab_invitations"] });
      setInviteOpen(false);
      setEmail("");
      setRole("member");
    },
    onError: (e: Error) => toast.error(e.message.includes("duplicate") ? "Cette personne a déjà été invitée" : e.message),
  });

  // Cancel invitation
  const cancelMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("collaboration_invitations" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invitation annulée");
      qc.invalidateQueries({ queryKey: ["collab_invitations"] });
    },
  });

  // Remove member
  const removeMut = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("org_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membre retiré");
      qc.invalidateQueries({ queryKey: ["org_members"] });
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Équipe & Collaboration</h1>
            <p className="text-muted-foreground text-sm">Invitez des co-gestionnaires pour gérer vos biens ensemble</p>
          </div>
          {isOwner && (
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button><UserPlus className="h-4 w-4 mr-2" />Inviter un collaborateur</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Inviter un collaborateur</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <Input type="email" placeholder="collaborateur@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Rôle</label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map(r => (
                          <SelectItem key={r.value} value={r.value}>
                            <div>
                              <span className="font-medium">{r.label}</span>
                              <span className="text-xs text-muted-foreground ml-2">— {r.desc}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={() => inviteMut.mutate()} disabled={!email || inviteMut.isPending}>
                    <Mail className="h-4 w-4 mr-2" />
                    {inviteMut.isPending ? "Envoi..." : "Envoyer l'invitation"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-accent" /><span className="text-xs text-muted-foreground uppercase">Membres actifs</span></div>
            <p className="text-2xl font-bold text-foreground">{members.length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground uppercase">Invitations en attente</span></div>
            <p className="text-2xl font-bold text-foreground">{invitations.filter(i => i.status === "pending").length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground uppercase">Votre rôle</span></div>
            <p className="text-2xl font-bold text-foreground">{isOwner ? "Propriétaire" : "Membre"}</p>
          </CardContent></Card>
        </div>

        {/* Members */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" />Membres de l'équipe</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-accent">{(m.name || m.email || "?")[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{m.name || m.email}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={m.role === "owner" ? "default" : "secondary"}>
                      {m.role === "owner" ? "Propriétaire" : m.role === "member" ? "Membre" : m.role}
                    </Badge>
                    {isOwner && m.user_id !== user?.id && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeMut.mutate(m.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending invitations */}
        {invitations.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Clock className="h-5 w-5" />Invitations</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invitations.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground text-sm">{inv.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Envoyée le {format(parseISO(inv.created_at), "dd/MM/yyyy")} · Expire le {format(parseISO(inv.expires_at), "dd/MM/yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={inv.status === "pending" ? "outline" : inv.status === "accepted" ? "default" : "secondary"}>
                        {inv.status === "pending" && <><Clock className="h-3 w-3 mr-1" />En attente</>}
                        {inv.status === "accepted" && <><CheckCircle2 className="h-3 w-3 mr-1" />Acceptée</>}
                        {inv.status === "expired" && <><XCircle className="h-3 w-3 mr-1" />Expirée</>}
                      </Badge>
                      {isOwner && inv.status === "pending" && (
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => cancelMut.mutate(inv.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Collaboration;
