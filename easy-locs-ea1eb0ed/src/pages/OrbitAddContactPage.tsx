import SubPageShell from "@/components/layout/SubPageShell";
import { db } from "@/services/db";
import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { UserPlus, CheckCircle, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { upsertOrbitContact } from "@/lib/orbit/orbit-contacts-service";
import { useUiEngine } from "@/hooks/useUiEngine";
import ErrorBoundary from "@/components/ErrorBoundary";

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 50%)`;
}

export default function OrbitAddContactPage() {
  useUiEngine("orbitaddcontactpage");
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const targetUserId = params.get("userId");

  const [status, setStatus] = useState<"idle" | "adding" | "done" | "error" | "self">("idle");
  const [targetName, setTargetName] = useState<string | null>(null);
  const addAttemptedRef = React.useRef(false);

  const dataParam = params.get("data");
  React.useEffect(() => {
    if (dataParam) {
      try {
        const decoded = atob(decodeURIComponent(dataParam).replace(/-/g, "+").replace(/_/g, "/"));
        const bytes = Uint8Array.from(decoded, c => c.charCodeAt(0));
        const json = new TextDecoder().decode(bytes);
        const parsed = JSON.parse(json);
        if (parsed.name) setTargetName(parsed.name);
      } catch { /* ignore decode errors */ }
    }
  }, [dataParam]);

  useEffect(() => {
    if (!targetUserId) return;
    if (user?.id && targetUserId === user.id) {
      setStatus("self");
      return;
    }
    (async () => {
      try {
        const { db } = await import("@/services/db");
        const { data } = await db("orbit_profiles_v2")
          .select("display_name, avatar_url")
          .eq("id", targetUserId)
          .maybeSingle();
        if (data?.display_name && !targetName) {
          setTargetName(data.display_name);
        }
      } catch { /* profile lookup failed — not critical */ }
    })();
  }, [targetUserId, user?.id, targetName]);

  const doAdd = useCallback(async () => {
    if (!user?.id || !targetUserId) return;
    setStatus("adding");
    try {
      await upsertOrbitContact({
        ownerUserId: user.id,
        displayName: targetName || `User ${targetUserId.substring(0, 8)}`,
        email: null,
        phone: null,
        peerUserId: targetUserId,
        source: "direct_link",
      });
      setStatus("done");
      toast.success(t("orbit.contacts.added") || "Contact added!");
    } catch {
      setStatus("error");
      toast.error(t("orbit.contacts.add_error") || "Failed to add contact");
    }
  }, [user?.id, targetUserId, targetName, t]);

  useEffect(() => {
    if (!user?.id || !targetUserId || addAttemptedRef.current) return;
    if (user.id === targetUserId) return;
    addAttemptedRef.current = true;
    doAdd();
  }, [user?.id, targetUserId, doAdd]);

  if (!targetUserId) {
    return (
      <SubPageShell noContentPad className="flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">{t("orbit.contacts.invalid_link") || "Invalid contact link"}</p>
          <Button variant="outline" onClick={() => navigate("/orbit")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> {t("common.back") || "Back"}
          </Button>
        </div>
      </SubPageShell>
    );
  }

  if (!user) {
    return (
      <SubPageShell noContentPad className="flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 max-w-xs">
          <UserPlus className="w-14 h-14 text-primary mx-auto" />
          <h2 className="text-lg font-bold">{t("orbit.contacts.join_to_add") || "Sign in to add this contact"}</h2>
          <p className="text-sm text-muted-foreground">{t("orbit.contacts.join_desc") || "Create an Easy-Locs account to connect with this person."}</p>
          <Button onClick={() => navigate(`/auth?redirect=/orbit/add?userId=${targetUserId}`)} className="w-full">
            {t("auth.sign_in") || "Sign In"}
          </Button>
        </div>
      </SubPageShell>
    );
  }

  const displayName = targetName || `User ${targetUserId.substring(0, 8)}`;
  const initials = displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <SubPageShell noContentPad className="flex items-center justify-center bg-background p-6">
      <ErrorBoundary>
      <div className="w-full max-w-sm text-center space-y-6">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto ring-2 ring-primary/20"
          style={{ background: avatarColor(displayName) }}
        >
          <span className="text-2xl font-bold text-white select-none">{initials}</span>
        </div>

        <div>
          <h2 className="text-xl font-bold">{displayName}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            EL-{targetUserId.replace(/-/g, "").substring(0, 8).toUpperCase()}
          </p>
        </div>

        {status === "self" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("orbit.contacts.self_add") || "This is your own profile!"}</p>
            <Button variant="outline" onClick={() => navigate("/orbit")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> {t("orbit.contacts.go_orbit") || "Go to Orbit"}
            </Button>
          </div>
        )}

        {(status === "idle" || status === "adding") && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t("common.adding") || "Adding..."}</p>
          </div>
        )}

        {status === "done" && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-emerald-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">{t("orbit.contacts.added") || "Contact added!"}</span>
            </div>
            <Button className="w-full" onClick={() => navigate("/orbit")}>
              {t("orbit.contacts.go_orbit") || "Go to Orbit"}
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{t("orbit.contacts.add_error") || "Failed to add contact"}</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={doAdd}>
                {t("common.retry") || "Retry"}
              </Button>
              <Button className="flex-1" onClick={() => navigate("/orbit")}>
                {t("orbit.contacts.go_orbit") || "Go to Orbit"}
              </Button>
            </div>
          </div>
        )}
      </div>
      </ErrorBoundary>
    </SubPageShell>
  );
}
