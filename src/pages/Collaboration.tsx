import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgRole } from "@/hooks/useOrgRole";
import * as collabRepo from "@/repositories/collaboration.repository";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, UserPlus, Mail, Shield, Clock, Trash2, CheckCircle2, XCircle, PenLine } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ROLE_CONFIG, INVITABLE_ROLES, type OrgRole } from "@/lib/permissions";

const Collaboration = () => {
  const { user } = useAuth();
  const { role: myRole, isAtLeast } = useOrgRole();
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("agent");

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

  const canManageTeam = isAtLeast("admin");

  const { data: members = [] } = useQuery({
    queryKey: ["org_members", org?.id],
    queryFn: async () => {
      const { data } = await supabase.from("org_members").select("id, user_id, role, created_at").eq("org_id", org!.id);
      if (!data) return [];
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
      toast.success("Invitation sent!");
      qc.invalidateQueries({ queryKey: ["collab_invitations"] });
      setInviteOpen(false);
      setEmail("");
      setRole("agent");
    },
    onError: (e: Error) => toast.error(e.message.includes("duplicate") ? "This person has already been invited" : e.message),
  });

  const cancelMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("collaboration_invitations" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invitation cancelled");
      qc.invalidateQueries({ queryKey: ["collab_invitations"] });
    },
  });

  const removeMut = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("org_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Member removed");
      qc.invalidateQueries({ queryKey: ["org_members"] });
    },
  });

  const updateRoleMut = useMutation({
    mutationFn: async ({ memberId, newRole }: { memberId: string; newRole: string }) => {
      const { error } = await supabase.from("org_members").update({ role: newRole } as any).eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["org_members"] });
    },
  });

  const getRoleDisplay = (role: string) => {
    const config = ROLE_CONFIG[role as OrgRole];
    if (!config) return { icon: "👤", label: role, labelEn: role, description: "", color: "text-muted-foreground" };
    return config;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Team & Collaboration</h1>
            <p className="text-muted-foreground text-sm">Manage your organization's team members and roles</p>
          </div>
          {canManageTeam && (
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button><UserPlus className="h-4 w-4 mr-2" />Invite team member</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Invite a team member</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <Input type="email" placeholder="colleague@company.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Role</label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INVITABLE_ROLES.map(r => {
                          const config = ROLE_CONFIG[r];
                          return (
                            <SelectItem key={r} value={r}>
                              <div className="flex items-center gap-2">
                                <span>{config.icon}</span>
                                <span className="font-medium">{config.labelEn}</span>
                                <span className="text-xs text-muted-foreground">— {config.description}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={() => inviteMut.mutate()} disabled={!email || inviteMut.isPending}>
                    <Mail className="h-4 w-4 mr-2" />
                    {inviteMut.isPending ? "Sending..." : "Send invitation"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-accent" /><span className="text-xs text-muted-foreground uppercase">Active members</span></div>
            <p className="text-2xl font-bold text-foreground">{members.length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground uppercase">Pending invitations</span></div>
            <p className="text-2xl font-bold text-foreground">{invitations.filter(i => i.status === "pending").length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground uppercase">Your role</span></div>
            <p className="text-2xl font-bold text-foreground">{getRoleDisplay(myRole).icon} {getRoleDisplay(myRole).labelEn}</p>
          </CardContent></Card>
        </div>

        {/* Members */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" />Team members</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members.map(m => {
                const display = getRoleDisplay(m.role);
                const isSelf = m.user_id === user?.id;
                const isOwnerMember = m.role === "owner";
                return (
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
                      {canManageTeam && !isSelf && !isOwnerMember ? (
                        <Select
                          value={m.role}
                          onValueChange={(newRole) => updateRoleMut.mutate({ memberId: m.id, newRole })}
                        >
                          <SelectTrigger className="w-[140px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INVITABLE_ROLES.map(r => (
                              <SelectItem key={r} value={r}>
                                <span className="flex items-center gap-1">
                                  <span>{ROLE_CONFIG[r].icon}</span>
                                  <span>{ROLE_CONFIG[r].labelEn}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={isOwnerMember ? "default" : "secondary"} className="text-xs">
                          {display.icon} {display.labelEn}
                        </Badge>
                      )}
                      {canManageTeam && !isSelf && !isOwnerMember && (
                        <Button size="sm" variant="ghost" className="text-destructive h-8 w-8 p-0" onClick={() => removeMut.mutate(m.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Pending invitations */}
        {invitations.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Clock className="h-5 w-5" />Invitations</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invitations.map(inv => {
                  const display = getRoleDisplay(inv.role);
                  return (
                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground text-sm">{inv.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Sent {format(parseISO(inv.created_at), "dd/MM/yyyy")} · Role: {display.icon} {display.labelEn}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={inv.status === "pending" ? "outline" : inv.status === "accepted" ? "default" : "secondary"}>
                          {inv.status === "pending" && <><Clock className="h-3 w-3 mr-1" />Pending</>}
                          {inv.status === "accepted" && <><CheckCircle2 className="h-3 w-3 mr-1" />Accepted</>}
                          {inv.status === "expired" && <><XCircle className="h-3 w-3 mr-1" />Expired</>}
                        </Badge>
                        {canManageTeam && inv.status === "pending" && (
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => cancelMut.mutate(inv.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Collaboration;
